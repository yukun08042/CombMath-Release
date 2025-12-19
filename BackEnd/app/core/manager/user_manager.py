from typing import Awaitable, Callable, Optional, Union
from sqlalchemy import Engine
from sqlmodel import Session, select

from app.database import User
from app.core.auth import get_userid_from_token
from app.core.fastapi_socketio import SocketIOServer


class UserManager:
    def __init__(self, db_engine: Engine) -> None: 
        self.db_engine = db_engine
        # TODO: 加锁以防止并发修改
        self.sid2userId: dict[str, str] = {}
        
    def checkPassword(self, password):
        # 密码要求：字母、数字的组合，6 位以上 20 位以下
        if len(password) < 6 or len(password) > 20: return False
        if not password.isalnum(): return False
        return True
    
    def get_user_from_token(self, token: str):
        userId = get_userid_from_token(token)
        if userId:
            return self.getUser(userId)
    
    def setSid(self, mytoken: str, sid: str):
        user = self.get_user_from_token(mytoken)
        if user:
            user_id = str(user.user_id)
            self.sid2userId[sid] = user_id
            return user

    def removeSid(self, sid):
        # 删除 sid 对应的映射关系
        return self.sid2userId.pop(sid, None)           
        
    def addUser(self, username, password):
        # 注册新用户时调用
        with Session(self.db_engine) as session:
            statement = select(User).where(User.username == username)
            # existed_user = session.exec(statement).one()
            existed_user = session.exec(statement).one_or_none()
            # 如果 username 已经存在，返回 1
            if existed_user:
                return 1
            # 如果密码不符合要求（要求：字母、数字的组合，6 位以上 20 位以下），返回 2
            elif self.checkPassword(password) == False:
                return 2
            # 否则，在用户数据库中添加该用户，并返回 0
            else:
                new_user = User(username = username, password = password)
                session.add(new_user)
                session.commit()
                return 0
        
    def authenticateUser(self, username, password):
        # 用户登录时调用
        with Session(self.db_engine) as session:
            statement = select(User).where(User.username == username)
            existed_user = session.exec(statement).one_or_none()
            if existed_user:
                if existed_user.password == password:
                    return existed_user, 0
                else:
                    return None, 2
            else:
                return None, 1
        
    def findUser(self, sid):
        # 找到 sid 对应的用户 user
        if sid in self.sid2userId:
            with Session(self.db_engine) as session:
                statement = select(User).where(User.user_id == self.sid2userId[sid])
                existed_user = session.exec(statement).one_or_none()
                return existed_user
        # 如果不存在该sid连接，返回 None
        
    def getSid(self, userId: Union[str, int]) -> list[str]:
        ret = []
        userId = str(userId)
        # 找到 userId 对应的 sid
        for sid, uid in self.sid2userId.items():
            if uid == userId:
                ret.append(sid)
        # 如果不存在用户，返回空列表
        return ret

    def getUserByUsername(self, username) -> Optional[User]:
        # 找到 username == username 的用户 user
        with Session(self.db_engine) as session:
            statement = select(User).where(User.username == username)
            user = session.exec(statement).one_or_none()
            # 如果找到了，返回 user
            return user

    def getUser(self, userId) -> Optional[User]:
        # 找到 user_id == userId 的用户 user
        with Session(self.db_engine) as session:
            user = session.get(User, userId)
            return user