import json
import sys
from pathlib import Path
from sqlmodel import Session, select

# --- 关键点：解决模块导入路径问题 ---
# 将项目根目录添加到 sys.path 中，这样就能直接引用 'app.database'
# 假设脚本在 app/scripts/ 下，根目录就是向上两级
FILE_PATH = Path(__file__).resolve()
ROOT_DIR = FILE_PATH.parent.parent.parent  # app/scripts/ -> app/ -> root
sys.path.append(str(ROOT_DIR))

# 现在可以正常导入 app 中的模块了
from app.database import engine, Problem

# 定义需要导入的文件列表
TARGET_FILES = [
    "1-排列组合.json",
    "2-鸽巢原理.json",
    "3-母函数.json",
    "4-线性常系数.json",
    "6-容斥原理.json",
    "7-波利亚定理.json"
]

def import_data():
    # 动态获取 JSON 文件所在的目录
    # 路径逻辑: app/scripts/../constants/json_output
    json_dir = FILE_PATH.parent.parent / "constants" / "json_output"
    
    print(f"数据源目录: {json_dir}")

    with Session(engine) as session:
        total_added = 0
        total_skipped = 0

        for filename in TARGET_FILES:
            json_file_path = json_dir / filename
            print(f"\n正在处理文件: {filename} ...")

            if not json_file_path.exists():
                print(f"  -> [错误] 找不到文件: {json_file_path}")
                continue

            try:
                with open(json_file_path, "r", encoding="utf-8") as f:
                    problems_data = json.load(f)
            except json.JSONDecodeError as e:
                print(f"  -> [错误] JSON 解析失败: {e}")
                continue

            file_added_count = 0
            file_skipped_count = 0
            
            for item in problems_data:
                # 查重逻辑：通过 content 查重
                # 注意：如果 problem_content 很长，建议数据库字段建有索引，或者增加哈希字段查重
                existing = session.exec(
                    select(Problem).where(Problem.problem_content == item["problem_content"])
                ).first()

                if existing:
                    file_skipped_count += 1
                    continue

                # 实例化模型
                # 注意：确保 json 中的 key 与 Problem 模型的字段完全对应
                # 如果 json 中包含 problem_mindmap (dict/json)，确保 Problem 模型对应字段类型为 JSON 或 SAColumn(JSON)
                problem = Problem(**item)
                session.add(problem)
                file_added_count += 1
            
            # 每处理完一个文件提交一次，避免一次性提交数据量过大
            session.commit()
            print(f"  -> {filename} 导入完成。新增: {file_added_count}, 跳过: {file_skipped_count}")
            
            total_added += file_added_count
            total_skipped += file_skipped_count
        
        print(f"\n========================================")
        print(f"所有文件处理完毕！")
        print(f"总计新增: {total_added} 条")
        print(f"总计跳过: {total_skipped} 条")

if __name__ == "__main__":
    import_data()