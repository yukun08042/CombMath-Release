# app/core/shared.py

# 1. 直接导入 database.py 中已经创建好的全局 engine
from app.database import engine 

# 2. 导入 Managers
from app.core.manager.user_manager import UserManager
from app.core.manager.problem_manager import ProblemManager
from app.core.manager.solution_manager import SolutionManager

# 使用同一个 engine 实例
user_manager = UserManager(engine)
problem_manager = ProblemManager(engine)
solution_manager = SolutionManager(engine)