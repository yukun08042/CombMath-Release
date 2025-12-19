import os
import sys
import subprocess
from pathlib import Path

# --- 1. 路径配置 ---
# 脚本在 BackEnd 根目录下
BACKEND_ROOT = Path(__file__).resolve().parent

# 各个脚本的相对路径
CONVERT_SCRIPT = BACKEND_ROOT / "app" / "scripts" / "convert_latex.py"
DATABASE_SCRIPT = BACKEND_ROOT / "app" / "database.py"
IMPORT_SCRIPT = BACKEND_ROOT / "app" / "scripts" / "import_problem.py"

# JSON 检查目录
JSON_OUTPUT_DIR = BACKEND_ROOT / "app" / "constants" / "json_output"

def run_python_script(script_path):
    """
    运行指定的 Python 脚本，并设置正确的 PYTHONPATH
    """
    if not script_path.exists():
        print(f"❌ 错误: 找不到文件 {script_path}")
        return False

    print(f"🚀 正在执行: {script_path.relative_to(BACKEND_ROOT)}...")
    
    # 核心：设置 PYTHONPATH 为 BackEnd 目录，这样脚本里 'from app.xxx' 才能生效
    env = os.environ.copy()
    env["PYTHONPATH"] = str(BACKEND_ROOT)
    
    try:
        # 使用当前 Python 解释器运行子脚本
        subprocess.run([sys.executable, str(script_path)], env=env, check=True)
        print(f"✅ 执行成功\n")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ 执行失败: {script_path.name}")
        return False

def main():
    print("=== 后端环境初始化脚本 ===\n")

    # --- 步骤 1: LaTeX 转换 ---
    # 检查是否有 .json 文件
    json_files = list(JSON_OUTPUT_DIR.glob("*.json")) if JSON_OUTPUT_DIR.exists() else []
    
    if json_files:
        print(f"ℹ️  步骤 1: 检测到 {len(json_files)} 个 JSON 文件，跳过 LaTeX 转换。")
    else:
        print("ℹ️  步骤 1: 未找到 JSON 数据，开始从 LaTeX 转换...")
        if not run_python_script(CONVERT_SCRIPT):
            sys.exit(1)

    # --- 步骤 2: 数据库建表 ---
    print("ℹ️  步骤 2: 初始化数据库表结构...")
    if not run_python_script(DATABASE_SCRIPT):
        sys.exit(1)

    # --- 步骤 3: 导入数据 ---
    print("ℹ️  步骤 3: 开始向数据库导入题目数据...")
    if not run_python_script(IMPORT_SCRIPT):
        sys.exit(1)

    print("🎉 所有初始化流程已完成！")

if __name__ == "__main__":
    main()