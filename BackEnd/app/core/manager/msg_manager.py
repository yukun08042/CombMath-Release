from pathlib import Path
from sqlalchemy import Engine
from sqlmodel import Session, select
import json

from app.core.constants import ROOT
from app.database import Chat, Message, Suggestion

class MessageManager:
    def __init__(self, db_engine: Engine):
        self.db_engine = db_engine

    def newMessage(self, chat_id: int, user_id: int, message_type: str, content: str):
        '''创建一条新的消息记录，返回 message_id'''
        with Session(self.db_engine) as session:
            new_message = Message(
                chat_id=chat_id,
                user_id=user_id,
                message_type=message_type,
                content=content
            )
            session.add(new_message)
            session.commit()
            return new_message.message_id
        
    def changeMessageContent(self, message_id: int, new_content: str):
        '''修改指定 message_id 的消息内容'''
        with Session(self.db_engine) as session:
            message = session.get(Message, message_id)
            if message:
                message.content = new_content
                session.add(message)
                session.commit()
                return True
            return False
        
    def getMessagesByChat(self, chat_id: int):
        '''获取指定 chat_id 下的所有消息，按时间排序'''
        with Session(self.db_engine) as session:
            statement = select(Message).where(Message.chat_id == chat_id).order_by(Message.message_id)
            results = session.exec(statement).all()
            return results
        
    def newAgentMessage(self, user_msg_id: int, content: str):
        '''为指定的用户消息创建一条新的 agent 消息，返回 message_id'''
        with Session(self.db_engine) as session:
            user_message = session.get(Message, user_msg_id)
            if not user_message:
                return None
            new_message = Message(
                chat_id=user_message.chat_id,
                user_id=user_message.user_id,
                message_type='agent',
                content=content
            )
            session.add(new_message)
            session.commit()
            return new_message.message_id
        
    def getChatIdByMessage(self, message_id: int):
        '''通过 message_id 获取对应的 chat_id'''
        with Session(self.db_engine) as session:
            message = session.get(Message, message_id)
            if message:
                return message.chat_id
            return None
        
    def getUserIdByMessage(self, message_id: int):
        '''通过 message_id 获取对应的 user_id'''
        with Session(self.db_engine) as session:
            message = session.get(Message, message_id)
            if message:
                return message.user_id
            return None