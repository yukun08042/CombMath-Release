import json
import logging
import asyncio
import re
from handyllm import OpenAIClient, RunConfig, load_from, ChatPrompt, VM
from handyllm.types import PathType
from pathlib import Path

from app.core.agent.utils import extract_xml_tag
from .constants import PROMPT_ROOT_REALTIME

# 加载 Prompt
prompt_gen_mindmap = load_from(PROMPT_ROOT_REALTIME / "generate_mindmap.hprompt", cls=ChatPrompt)
prompt_update_mindmap = load_from(PROMPT_ROOT_REALTIME / "update_mindmap.hprompt", cls=ChatPrompt)
prompt_generate_suggestion = load_from(PROMPT_ROOT_REALTIME / "generate_suggestion.hprompt", cls=ChatPrompt)

class AgentRealtime:
    def __init__(self, client: OpenAIClient, base_dir: PathType):
        self.client = client
        self.base_dir = Path(base_dir)
        self.base_dir.mkdir(parents=True, exist_ok=True)

    # =========================================================
    # 方法 1: 从零生成
    # 对应 prompt: gen_mindmap.hprompt
    # (%problem_content%, %input_solution%)
    # =========================================================
    async def generate_mindmap_scratch(self, problem_content: str, user_input: str, task_id: str) -> dict:
        """从零构建思维导图"""
        output_path = (Path(self.base_dir) / f"{task_id}_gen.hprompt").as_posix()

        p_val = prompt_gen_mindmap.eval(
            var_map=VM(
                problem_content = problem_content,
                student_solution = user_input
            ),
            run_config=RunConfig(output_path=output_path)
        )
        return await self._execute_and_parse(p_val, task_id)

    # =========================================================
    # 方法 2: 增量更新
    # 对应 prompt: update_mindmap.hprompt
    # (%problem_content%, %existing_mindmap_json%, %user_new_input%)
    # =========================================================
    async def update_mindmap_incremental(self, problem_content: str, existing_map: dict, user_input: str, task_id: str) -> dict:
        """基于现有导图更新"""
        output_path = (Path(self.base_dir) / f"{task_id}_update.hprompt").as_posix()
        
        # 将现有导图转为字符串
        existing_map_str = json.dumps(existing_map, ensure_ascii=False)
        
        p_val = prompt_update_mindmap.eval(
            var_map=VM(
                problem_content=problem_content,    # 对应 %problem_content%
                existing_mindmap_json=existing_map_str,                     # 对应 %existing_mindmap_json%
                user_new_input=user_input                                   # 对应 %user_new_input%
            ),
            run_config=RunConfig(output_path=output_path)
        )
        return await self._execute_and_parse(p_val, task_id)


    # =========================================================
    # 方法 3: 生成解题建议 (Gap Analysis)
    # 对应 prompt: generate_suggestion.hprompt
    # (%problem_content%, %user_solution%, %user_mindmap%, %standard_mindmap%)
    # =========================================================
    async def generate_mindmap_suggestion(
        self, 
        problem_content: str,
        user_solution: str, 
        user_mindmap: dict, 
        standard_mindmap: dict, 
        task_id: str
    ) -> dict:
        """
        对比用户导图与标准导图，生成增量建议与总结
        """
        output_path = (Path(self.base_dir) / f"{task_id}_suggestion.hprompt").as_posix()
        
        # 将传入的 JSON 对象序列化为字符串，供 Prompt 填充
        user_map_str = json.dumps(user_mindmap, ensure_ascii=False)
        std_map_str = json.dumps(standard_mindmap, ensure_ascii=False)
        
        # 构造 Prompt 变量映射
        p_val = prompt_generate_suggestion.eval(
            var_map=VM(
                problem_content=problem_content,  # 对应 %problem_content%
                user_solution=user_solution,                              # 对应 %user_solution%
                user_mindmap=user_map_str,                                # 对应 %user_mindmap%
                standard_mindmap=std_map_str                              # 对应 %standard_mindmap%
            ),
            run_config=RunConfig(output_path=output_path)
        )
        
        # 执行 LLM 请求并解析 JSON 结果
        return await self._execute_and_parse(p_val, task_id)
    
    
    # =========================================================
    # 辅助方法: 统一执行与解析
    # =========================================================
    async def _execute_and_parse(self, p_val, task_id):
        for attempt in range(3):
            try:
                result_prompt = await p_val.arun(client=self.client)
                raw = result_prompt.result_str
                
                # 尝试提取 xml 标签
                # 注意：extract_xml_tag 是你自己定义的工具函数，确保能处理 <jsonOutput>...</jsonOutput>
                json_content = extract_xml_tag(raw, "jsonOutput")
                if not json_content: 
                    # 容错：有些模型可能直接吐 JSON 没带标签
                    json_content = raw

                # 清理 Markdown 代码块
                json_content = re.sub(r'^```json\s*', '', json_content, flags=re.MULTILINE)
                json_content = re.sub(r'\s*```$', '', json_content, flags=re.MULTILINE)
                
                return json.loads(json_content)
            except Exception as e:
                logging.error(f"[{task_id}] Mindmap Generation Error (Attempt {attempt+1}): {e}")
                if attempt < 2: await asyncio.sleep(1)
        
        raise RuntimeError(f"Failed AI Mindmap Task: {task_id}")
    
    # async def analysis(self, input_text: str, msg_id: int) -> list:
    #     '''返回str格式的Analysis'''
    #     output_result_path = (Path(self.base_dir) / f"output_analysis_{msg_id}.hprompt").as_posix()
    #     output_evaled_path = (Path(self.base_dir) / f"evaled_analysis_{msg_id}.hprompt").as_posix()
    #     print(f"Generating Analysis, output will be saved to {output_result_path} and {output_evaled_path}")

    #     p_val = prompt_analysis.eval(
    #         var_map=VM(
    #             input_text=input_text
    #         ),
    #         run_config=RunConfig(
    #             output_path=output_result_path,
    #             output_evaled_prompt_path=output_evaled_path
    #         )
    #     )
    #     for attempt in range(3):
    #         try:
    #             result_prompt = await p_val.arun(client=self.client)
    #             analysis_result = extract_xml_tag(result_prompt.result_str, "privacyAnalysis")
    #             print(f"[Extracted Analysis]\n {analysis_result}")
    #             eval(analysis_result)  # 确保 analysis 是一个可执行的 Python 表达式
    #             break
    #         except Exception as e:
    #             logging.error(f"Attempt {attempt + 1} failed: {e}")
    #             if attempt < 2:
    #                 await asyncio.sleep(2)
    #             else:
    #                 raise RuntimeError("Failed to generate Analysis after 3 attempts")
    #     return eval(analysis_result)
    
    # async def response(self, user_input: str, user_msg_id: int) -> str:
    #     '''返回str格式的Response'''
    #     output_result_path = (Path(self.base_dir) / f"output_response_{user_msg_id}.hprompt").as_posix()
    #     output_evaled_path = (Path(self.base_dir) / f"evaled_response_{user_msg_id}.hprompt").as_posix()
    #     print(f"Generating Response, output will be saved to {output_result_path} and {output_evaled_path}")

    #     p_val = prompt_response.eval(
    #         var_map=VM(
    #             user_input=user_input
    #         ),
    #         run_config=RunConfig(
    #             output_path=output_result_path,
    #             output_evaled_prompt_path=output_evaled_path
    #         )
    #     )
    #     for attempt in range(3):
    #         try:
    #             result_ = await p_val.arun(client=self.client)
    #             print(f"[Extracted Response]\n {result_.result_str}")
    #             break
    #         except Exception as e:
    #             logging.error(f"Attempt {attempt + 1} failed: {e}")
    #             if attempt < 2:
    #                 await asyncio.sleep(2)
    #             else:
    #                 raise RuntimeError("Failed to generate Response after 3 attempts")
    #     return result_.result_str