# app/core/problem_manager.py
from sqlmodel import Session, select
from sqlalchemy import Engine
from app.database import Problem

class ProblemManager:
    def __init__(self, db_engine: Engine):
        self.db_engine = db_engine

    def get_all_problems(self):
        """获取所有题目列表"""
        with Session(self.db_engine) as session:
            statement = select(Problem)
            return session.exec(statement).all()

    def get_problem_by_id(self, problem_id: int):
        """根据ID获取题目详情"""
        with Session(self.db_engine) as session:
            return session.get(Problem, problem_id)