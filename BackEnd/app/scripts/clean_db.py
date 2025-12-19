import sys
from pathlib import Path
from sqlmodel import Session, delete

# --- 1. 解决模块导入路径问题 ---
FILE_PATH = Path(__file__).resolve()
ROOT_DIR = FILE_PATH.parent.parent.parent  # 根据你的目录结构调整
sys.path.append(str(ROOT_DIR))

# 从你的应用中导入 engine 和 需要清空的模型类
# 如果有多个表，在这里继续添加导入，例如: from app.database import engine, Problem, User, Task
from app.database import engine, Problem, User, UserSolution

# --- 2. 在这里定义需要清空的模型列表 ---
# 只要是将要清空的 SQLModel 类，都放入这个列表中
TABLES_TO_CLEAR = [
    Problem,
    # User,  # 如果有其他表，取消注释并确保已导入
    UserSolution,
]

def clear_tables():
    """
    遍历列表并清空指定的数据库表。
    """
    print("🚀 开始清理数据库...")
    
    with Session(engine) as session:
        try:
            for model in TABLES_TO_CLEAR:
                # 获取类名用于日志打印
                table_name = model.__tablename__ if hasattr(model, "__tablename__") else model.__name__
                
                # 执行删除操作
                statement = delete(model)
                result = session.exec(statement)
                
                print(f"  - 已清空表: {table_name} (删除了 {result.rowcount} 条数据)")
            
            # 提交事务
            session.commit()
            print("✅ 所有指定表已清空完成。")
            
        except Exception as e:
            session.rollback()
            print(f"❌ 清理过程中出错，已回滚: {e}")

if __name__ == "__main__":
    clear_tables()