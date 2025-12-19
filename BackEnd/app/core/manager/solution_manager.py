# app/core/solution_manager.py
from sqlmodel import Session, select
from sqlalchemy import Engine
from typing import Tuple, Optional

from app.database import UserSolution

class SolutionManager:
    def __init__(self, db_engine: Engine):
        self.db_engine = db_engine

    def get_solution_by_id(self, solution_id: int) -> Optional[UserSolution]:
        """根据 ID 获取做题记录"""
        with Session(self.db_engine) as session:
            return session.get(UserSolution, solution_id)

    def create_or_get_solution(self, user_id: int, problem_id: int) -> Tuple[UserSolution, bool]:
        """
        开始做题逻辑：
        如果用户做过这道题，返回旧记录；
        如果没做过，创建新记录。
        """
        with Session(self.db_engine) as session:
            # 1. 查是否存在
            statement = select(UserSolution).where(
                UserSolution.user_id == user_id,
                UserSolution.problem_id == problem_id
            )
            existing = session.exec(statement).first()
            
            if existing:
                return existing, False # False 代表是旧记录

            # 2. 不存在则创建
            new_solution = UserSolution(
                user_id=user_id,
                problem_id=problem_id,
                current_solution="",
                new_mindmap={"nodes": [], "edges": []}
            )
            session.add(new_solution)
            session.commit()
            session.refresh(new_solution)
            return new_solution, True # True 代表是新记录

    def update_solution_text(self, solution_id: int, text: str):
        """更新用户的文字解答"""
        with Session(self.db_engine) as session:
            solution = session.get(UserSolution, solution_id)
            if solution:
                solution.current_solution = text
                session.add(solution)
                session.commit()
                session.refresh(solution)
            return solution
        
    def update_mindmap(self, solution_id: int, mindmap: dict):
        """更新用户的思维导图"""
        with Session(self.db_engine) as session:
            solution = session.get(UserSolution, solution_id)
            if solution:
                solution.new_mindmap = mindmap
                session.add(solution)
                session.commit()
                session.refresh(solution)
            return solution
        
    def update_suggestion(self, solution_id: int, suggestion_summary: str):
        """更新用户的建议"""
        with Session(self.db_engine) as session:
            solution = session.get(UserSolution, solution_id)
            if solution:
                solution.suggestion_summary = suggestion_summary
                session.add(solution)
                session.commit()
                session.refresh(solution)
            return solution