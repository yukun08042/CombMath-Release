from pathlib import Path
from sqlalchemy import Engine
from sqlmodel import Session, select
import json

from app.core.agent.constants import ROOT
from BackEnd.app.core.privacy_agent import PrivacyAgent
from app.database import Chat, Message, Suggestion


class ChatManager:
    def __init__(self, db_engine: Engine):
        self.db_engine = db_engine
        # 初始化agents字典
        self.privacy_agents: dict[int, PrivacyAgent] = {}

    def new_chat(self, user_id: int):
        '''创建一个新的聊天记录，返回 chat_id'''
        with Session(self.db_engine) as session:
            new_chat = Chat(user_id=user_id)
            session.add(new_chat)
            session.commit()
            
            if new_chat.chat_id is not None:
                # 为该 chat_id 创建  实例
                self.privacy_agents[new_chat.chat_id] = PrivacyAgent(
                    root_dir=ROOT,
                    chat_id=new_chat.chat_id
                )
            
            return new_chat.chat_id
        
