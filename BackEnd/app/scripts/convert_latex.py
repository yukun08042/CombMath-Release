import json
import logging
import asyncio
import re
import sys
import ast
from pathlib import Path
from typing import List, Optional
from handyllm import OpenAIClient, RunConfig, load_from, ChatPrompt, VM
from handyllm.types import PathType

# ================= 配置路径 =================
# 自动获取项目根目录，确保在任何地方运行都不报错
CURRENT_FILE_PATH = Path(__file__).resolve()
# 假设脚本在 app/scripts/ 下，根目录是向上三级
PROJECT_ROOT = CURRENT_FILE_PATH.parent.parent.parent

if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

PROMPT_ROOT = PROJECT_ROOT / "app/prompts"
LATEX_ROOT = PROJECT_ROOT / "app/constants/latex"
OUTPUT_ROOT = PROJECT_ROOT / "app/constants/json_output"

# 设置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# 加载 Prompts
prompt_extract = load_from(PROMPT_ROOT / "extract_json.hprompt", cls=ChatPrompt)
prompt_mindmap = load_from(PROMPT_ROOT / "generate_standard_mindmap.hprompt", cls=ChatPrompt)


def extract_json_tag(text: str, tag: str = "jsonOutput") -> str:
    """提取 xml 标签内的内容"""
    pattern = f"<{tag}>(.*?)</{tag}>"
    match = re.search(pattern, text, re.DOTALL)
    if match:
        return match.group(1).strip()
    return text.strip()


class ConvertAgent:
    def __init__(self, client: OpenAIClient, debug_dir: PathType):
        self.client = client
        self.debug_dir = Path(debug_dir)
        self.debug_dir.mkdir(parents=True, exist_ok=True)

    async def extract_latex_info(self, latex_snippet: str, chapter_info: dict, task_id: str) -> dict:
        """
        Step 1: 提取信息
        """
        output_result_path = (self.debug_dir / f"{task_id}_step1_extract.hprompt").as_posix()
        
        # 修复点：chapter_id 必须转为 str，否则 replace() 会报错
        p_val = prompt_extract.eval(
            var_map=VM(
                latex_text=latex_snippet,
                chapter_id=str(chapter_info['id']),   # <--- 强制转 str
                chapter_name=str(chapter_info['name']) # <--- 强制转 str (防守性编程)
            ),
            run_config=RunConfig(output_path=output_result_path)
        )

        for attempt in range(3):
            try:
                result_prompt = await p_val.arun(client=self.client)
                raw_content = result_prompt.result_str
                
                # 1. 提取标签内容
                json_str = extract_json_tag(raw_content, "jsonOutput")
                
                # 2. 清理 Markdown 代码块标记
                json_str = re.sub(r'^```json\s*', '', json_str, flags=re.MULTILINE)
                json_str = re.sub(r'^```\s*', '', json_str, flags=re.MULTILINE)
                json_str = re.sub(r'\s*```$', '', json_str)
                
                # 3. 尝试解析
                try:
                    # 优先尝试标准 JSON 解析
                    data = json.loads(json_str)
                except json.JSONDecodeError:
                    # Fallback: 如果使用了单引号，尝试用 Python eval 解析
                    # 注意：ast.literal_eval 比 eval() 安全，只能解析字面量
                    logger.warning(f"[{task_id}] Standard JSON parse failed, trying ast.literal_eval...")
                    try:
                        data = ast.literal_eval(json_str)
                    except Exception as e_ast:
                        # 如果两次都失败，打印出有问题的字符串以便调试
                        logger.error(f"[{task_id}] JSON Parse Failed.\nContent snippet:\n{json_str[:200]}...\nError: {e_ast}")
                        raise e_ast  # 抛出异常触发重试

                return data

            except Exception as e:
                logger.error(f"[{task_id}] Step 1 Error (Attempt {attempt+1}): {e}")
                if attempt < 2:
                    await asyncio.sleep(2)
        
        raise RuntimeError(f"Failed Step 1 for {task_id}")
    
    async def generate_mindmap(self, problem_content: str, problem_solution: str, task_id: str) -> dict:
        """Step 2: 生成思维导图 """
        output_result_path = (self.debug_dir / f"{task_id}_step2_mindmap.hprompt").as_posix()

        p_val = prompt_mindmap.eval(
            var_map=VM(
                problem_content = problem_content,
                problem_solution = problem_solution,
            ),
            run_config=RunConfig(output_path=output_result_path)
        )

        for attempt in range(3):
            try:
                result_prompt = await p_val.arun(client=self.client)
                json_str = extract_json_tag(result_prompt.result_str, "jsonOutput")
                json_str = re.sub(r'^```json\s*', '', json_str)
                json_str = re.sub(r'\s*```$', '', json_str)
                return json.loads(json_str)
            except Exception as e:
                logger.error(f"[{task_id}] Step 2 Error: {e}")
                await asyncio.sleep(1)

        raise RuntimeError(f"Failed Step 2 for {task_id}")

    async def process_single_problem(self, latex_snippet: str, chapter_info: dict, idx: int, file_stem: str) -> Optional[dict]:
        task_id = f"{file_stem}_q{idx}"
        try:
            # 1. 提取信息
            base_data = await self.extract_latex_info(latex_snippet, chapter_info, task_id)
            # print(f"[{task_id}] Extracted Data: {base_data.keys()}")
            # exit()
            # 2. 生成导图
            final_data = await self.generate_mindmap(base_data['problem_content'], base_data['problem_solution'], task_id)
            # 3. 合并结果
            base_data['problem_mindmap'] = final_data.get('problem_mindmap', {})
            return base_data
        except Exception as e:
            logger.error(f"[{task_id}] Failed: {e}")
            return None


class LatexProcessor:
    def __init__(self):
        # 请确保在这里正确配置你的 Client
        from app.core.config import settings
        self.client = OpenAIClient(
            "async", 
            endpoints=[model.model_dump() for model in settings.endpoints]
        )
        self.agent = ConvertAgent(self.client, debug_dir=PROJECT_ROOT / "logs/debug_prompts")
        self.output_dir = OUTPUT_ROOT
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def _parse_filename(self, filename: str) -> dict:
        """
        从文件名解析章节信息。
        期望格式: "1-排列组合.tex" -> {'id': 1, 'name': '排列组合'}
        """
        stem = Path(filename).stem # 去掉 .tex
        parts = stem.split('-', 1) # 只分割第一个横杠
        
        c_id = None
        c_name = stem
        
        if len(parts) == 2 and parts[0].isdigit():
            c_id = int(parts[0])
            c_name = parts[1]
        
        return {'id': c_id, 'name': c_name}

    def _split_latex_questions(self, file_path: Path) -> List[str]:
        """
        切分 LaTeX。不再人为拼接 '题目：' 前缀。
        """
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        # 简单按 \question 切分
        # 注意：第一个元素通常是文件头(header)，如果不包含题目内容需要丢弃
        parts = re.split(r'\\question', content)
        
        questions = []
        for i, part in enumerate(parts):
            if not part.strip():
                continue
            
            # 简单的过滤：如果这一段没有 content 且在开头，可能是 header
            # 这里只要包含实质内容就放进去，LLM 会负责提取
            # 为了避免 header 混入第一题，通常第一题在 split 后是 parts[1]
            # parts[0] 是 \section{...} \begin{questions} 等
            
            # 如果 part 里包含 \section 但看起来不像题目（太短），或者是 split 后的第一部分
            if i == 0 and '\\begin{document}' in part: 
                # 检查 parts[0] 是否真的包含题目（有些格式直接开始写题）
                # 稳妥起见，如果 parts[0] 没有 \question（肯定没有，被split了）
                # 我们假设 parts[0] 是 preamble，跳过
                continue

            questions.append(part.strip())
            
        return questions

    async def process_file(self, filename: str):
        input_path = LATEX_ROOT / filename
        if not input_path.exists():
            logger.warning(f"File not found: {input_path}")
            return

        # 1. 解析文件名获取元数据
        chapter_info = self._parse_filename(filename)
        logger.info(f"Processing {filename} | ID: {chapter_info['id']} | Name: {chapter_info['name']}")

        # 2. 切分题目
        snippets = self._split_latex_questions(input_path)
        logger.info(f"Found {len(snippets)} snippets")

        # 3. 并发处理
        sem = asyncio.Semaphore(5)
        async def _run(snip, i):
            async with sem:
                return await self.agent.process_single_problem(snip, chapter_info, i, input_path.stem)

        tasks = [_run(s, i) for i, s in enumerate(snippets, 1)]
        results = await asyncio.gather(*tasks)
        results = [r for r in results if r is not None]

        # 4. 保存
        out_file = self.output_dir / f"{input_path.stem}.json"
        with open(out_file, 'w', encoding='utf-8') as f:
            json.dump(results, f, ensure_ascii=False, indent=2)
        logger.info(f"Saved to {out_file}")

    async def run_all(self):
        # 扫描目录下所有 .tex 文件
        files = [f.name for f in LATEX_ROOT.glob("*.tex")]
        for f in files:
            await self.process_file(f)

if __name__ == "__main__":
    p = LatexProcessor()
    asyncio.run(p.run_all())