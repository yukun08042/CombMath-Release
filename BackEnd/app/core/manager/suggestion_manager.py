from pathlib import Path
from sqlalchemy import Engine
from sqlmodel import Session, select
import json

from app.core.constants import ROOT
from app.database import Chat, Message, Suggestion

class SuggestionManager:
    def __init__(self, db_engine: Engine):
        self.db_engine = db_engine

    def newSuggestion(self, message_id: int, original_text: str, privacy_analysis: str, placeholder: str):
        '''创建一条新的建议记录，返回 suggestion_id'''
        with Session(self.db_engine) as session:
            new_suggestion = Suggestion(
                message_id=message_id,
                original_text=original_text,
                privacy_analysis=privacy_analysis,
                placeholder=placeholder
            )
            session.add(new_suggestion)
            session.commit()
            return new_suggestion.suggestion_id
        
    def acceptSuggestion(self, suggestion_id: int):
        '''接受建议，标记 accepted 为 True'''
        with Session(self.db_engine) as session:
            suggestion = session.get(Suggestion, suggestion_id)
            if suggestion:
                suggestion.accepted = True
                session.add(suggestion)
                session.commit()
                return True
            return False
        
    def readSuggestion(self, suggestion_id: int):
        '''标记建议为已阅览，read 为 True'''
        with Session(self.db_engine) as session:
            suggestion = session.get(Suggestion, suggestion_id)
            if suggestion:
                suggestion.read = True
                session.add(suggestion)
                session.commit()
                return True
            return False
        
    def getSuggestionsByMessage(self, message_id: int):
        '''获取指定 message_id 下的所有建议'''
        with Session(self.db_engine) as session:
            statement = select(Suggestion).where(Suggestion.message_id == message_id)
            results = session.exec(statement).all()
            return results
        
    def getSuggestionsByChat(self, chat_id: int):
        '''获取指定 chat_id 下的所有建议'''
        # 先通过 message 表获取该 chat_id 下的所有 message_id
        with Session(self.db_engine) as session:
            message_stmt = select(Message.message_id).where(Message.chat_id == chat_id)
            msg_ids = session.exec(message_stmt).all() or []
            if not msg_ids:
                return []
            # 再通过 suggestion 表获取这些 message_id 下的所有建议
            suggestions = []
            for msg_id in msg_ids:
                suggestion_stmt = select(Suggestion).where(Suggestion.message_id == msg_id)
                results = session.exec(suggestion_stmt).all()
                suggestions.extend(results)
            return suggestions
                 