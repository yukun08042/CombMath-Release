from datetime import datetime, timedelta
from fastapi import Body, Depends, HTTPException, Request, status, Cookie
from fastapi.security import OAuth2PasswordBearer
from typing import Optional

from app.core.shared import user_manager
from app.database import User
from app.core.fastapi_socketio import SocketIOServer


SECRET_KEY = "jiaoyanzhushou2024"  # 用于JWT编码和解码的密钥
ALGORITHM = "HS256"  # JWT的编码算法
ACCESS_TOKEN_EXPIRE = timedelta(days=1)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

MAX_FILE_SIZE = 1024 * 1024 * 1024 * 4  # = 4GB


async def get_user_from_cookie(mytoken: Optional[str] = Cookie(default=None)):
    if not mytoken:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not authenticated")
    user = user_manager.get_user_from_token(mytoken)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
        )
    return user

async def get_current_user(token: str = Depends(oauth2_scheme)):
    user = user_manager.get_user_from_token(token)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

userDeps = Depends(get_user_from_cookie)

async def get_sio(request: Request) -> SocketIOServer:
    sio = request.app.state.sio
    if sio is None:
        raise HTTPException(status_code=500, detail="Internal server error")
    return sio

sioDeps = Depends(get_sio)