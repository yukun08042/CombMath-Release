import asyncio
import logging
from datetime import datetime

from app.core.socketio_router import SocketIORouter
from app.core.shared import (
    user_manager
)


logger_sio = logging.getLogger("sio")
sio_router = SocketIORouter()


@sio_router.on("*")
async def any_event(event, sid, *args, **kwargs):
    logger_sio.info(f"any event!!! {event=} {sid=} {args=} {kwargs=}")

@sio_router.event
async def connect(sid: str, environ, auth):
    logger_sio.info(f"connect {sid} {auth}")
    # 从连接中获取cookie，或者检查auth中的cookie
    cookie = environ.get("HTTP_COOKIE", None) or \
        (auth.get("cookie", None) if auth else None)
    user = None
    print(f"cookie={cookie}")
    try:
        token = cookie.split("mytoken=")[1].split(";")[0] if cookie else None
        user = user_manager.setSid(token, sid) if token else None
    except Exception:
        pass
    if not user:
        # 断开连接
        logger_sio.error(f"authentication failed: sid={sid} auth={auth}")
        raise ConnectionRefusedError('Socket.IO authentication failed')
    print(f"setSid sid={sid} userId={user.user_id} username={user.username}")
    
    assert sio_router.sio is not None
    
@sio_router.event
async def disconnect(sid):
    logger_sio.info(f"disconnect {sid}")
    userId = user_manager.removeSid(sid)
    logger_sio.info(f"removeSid sid={sid} userId={userId}")
    
  