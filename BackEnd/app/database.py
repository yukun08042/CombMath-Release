from sqlmodel import SQLModel, create_engine, Session, Field
from pathlib import Path
from sqlalchemy import Column, JSON, Text
from typing import Optional, Dict, Any
import pytz
from datetime import datetime

# 1. 获取当前文件的绝对路径 (BackEnd/app/database.py)
CURRENT_FILE = Path(__file__).resolve()

# 2. 获取项目根目录 (BackEnd/)
# .parent 是 app目录, .parent.parent 是 BackEnd目录
PROJECT_ROOT = CURRENT_FILE.parent.parent

# 3. 拼接数据库文件的绝对路径 (BackEnd/math_tutor.db)
SQLITE_FILE = PROJECT_ROOT / "math_tutor.db"
DATABASE_URL = f"sqlite:///{SQLITE_FILE}"

# 打印一下路径，方便调试确认
print(f"--> 连接数据库: {SQLITE_FILE}")

# 创建全局引擎
engine = create_engine(DATABASE_URL, echo=False, connect_args={"check_same_thread": False})

def construct_db_engine(db_url):
    return create_engine(db_url, connect_args={"check_same_thread": False})

def get_current_datetime():
    return datetime.now(pytz.timezone("Asia/Shanghai"))

# 2. 数据模型定义

# User 类
class User(SQLModel, table=True):
    user_id: Optional[int] = Field(default=None, primary_key=True) # 用户ID，自增主键
    username: str = Field(unique=True) # 用户名
    password: str # 密码
    created_at: datetime = Field(default_factory=get_current_datetime) # 用户创建时间

# Problem 类
class Problem(SQLModel, table=True):
    problem_id: Optional[int] = Field(default=None, primary_key=True)
    
    chapter_id: int = Field(index=True)
    chapter_name: str
    difficulty: int = Field(default=1, description="难度等级 1-5")
    
    problem_content: str = Field(sa_column=Column(Text)) 
    problem_solution: str = Field(sa_column=Column(Text)) 
    problem_mindmap: Dict[str, Any] = Field(default={}, sa_column=Column(JSON)) 
    
    created_at: datetime = Field(default_factory=get_current_datetime)

# UserSolution 类
class UserSolution(SQLModel, table=True):
    solution_id: Optional[int] = Field(default=None, primary_key=True)
    
    user_id: int = Field(foreign_key="user.user_id")
    problem_id: int = Field(foreign_key="problem.problem_id")
    
    current_solution: str = Field(default="", sa_column=Column(Text))
    new_mindmap: Dict[str, Any] = Field(default={}, sa_column=Column(JSON))
    suggestion_summary: Optional[str] = Field(default=None, sa_column=Column(Text))
    
    updated_at: datetime = Field(default_factory=get_current_datetime)

# 3. 辅助函数
def create_db_and_tables():
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session

# 4. 主程序入口
if __name__ == "__main__":
    # --- 正式环境建表 ---
    print(f"正在连接数据库: {DATABASE_URL}")
    print("正在创建生产环境表结构...")
    
    # 这里调用的是全局定义的 engine (对应 math_tutor.db)
    create_db_and_tables() 
    
    print(">>> 成功！已生成 math_tutor.db 文件。")