# main.py
from contextlib import asynccontextmanager
from fastapi import FastAPI
from sqlmodel import SQLModel
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

import logging
# 全局日志设为 INFO (能看到你的业务日志)
logging.basicConfig(level=logging.INFO)
# 单独把 SQLAlchemy 的日志级别提高到 WARNING
logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)

# 确保导入路径正确
from app.routers import sio_routes, api
from app.core.fastapi_socketio import SocketIOServer
from app.database import engine

# --- 1. 定义生命周期管理 (Lifespan) ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    print(">>> [Lifespan] 系统启动：正在检查并创建数据库表...")
    # 建议加上 try-except 以防数据库连接失败导致启动崩溃
    try:
        SQLModel.metadata.create_all(engine)
        print(">>> [Lifespan] 数据库表检查完成")
    except Exception as e:
        print(f">>> [Lifespan] 数据库连接失败: {e}")
    
    yield
    print(">>> [Lifespan] 系统关闭")

# --- 2. 实例化 App ---
app = FastAPI(lifespan=lifespan)

# --- 3. 配置 SocketIO ---
sio = SocketIOServer(app) 
sio_routes.sio_router.register(sio)

# --- 4. 配置 API 路由 ---
app.include_router(api.api_router)

# --- 5. 配置 CORS ---
origins = [
    "http://localhost:5173",
    "http:",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"http://localhost(:\d*)?", # 修正了正则字符串的前缀 r
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 6. 启动入口 ---
if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)