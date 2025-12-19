from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status, Response
from fastapi.security import OAuth2PasswordRequestForm
import asyncio

# 1. 导入数据模型 (Pydantic)
from app.models import (
    RegisterRequest, 
    GetAllProblemsResponse, ProblemSummary,
    StartSolutionRequest, StartSolutionResponse,
    UpdateMindmapRequest, UpdateMindmapResponse,
    QueryAnalysisRequest, QueryAnalysisResponse,
    RefreshRequest, RefreshResponse
)
# 2. 导入数据库模型 (SQLModel)
from app.database import User

# 3. 导入 Managers (从 shared 中获取单例)
from app.core.shared import user_manager, problem_manager, solution_manager

# 4. 导入其他依赖
from app.core.auth import encode_token  
from app.routers.deps import userDeps, ACCESS_TOKEN_EXPIRE, sioDeps
from app.core.fastapi_socketio import SocketIOServer

from pathlib import Path
from app.core.config import settings
from handyllm import OpenAIClient
from app.core.agent.agent_realtime import AgentRealtime
from app.services.tasks import update_mindmap_pipeline, run_analysis_pipeline

api_router = APIRouter()
client = OpenAIClient(
    "async", 
    endpoints=[model.model_dump() for model in settings.endpoints]
)
global_agent = AgentRealtime(client, base_dir=Path("logs/debug_prompts"))


# ==========================================
# API 路由
# ==========================================

@api_router.get("/data")
async def get_data():
    return {"message": "This is data from the FastAPI backend"}

# --- 登录注册模块 (使用 UserManager) ---

@api_router.post("/token")
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    # 使用 user_manager 验证
    user, code = user_manager.authenticateUser(form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = encode_token(str(user.user_id))
    return {"access_token": token, "token_type": "bearer"}

@api_router.post("/api/register")
async def register(request: RegisterRequest):
    code = user_manager.addUser(request.username, request.password)
    return {"code": code}

@api_router.post("/api/login")
async def login(login_request: RegisterRequest, response: Response):
    username = login_request.username
    password = login_request.password
    user, code = user_manager.authenticateUser(username, password)
    if user:
        token = encode_token(str(user.user_id))
        response.set_cookie(key="mytoken", value=token, httponly=True, max_age=int(ACCESS_TOKEN_EXPIRE.total_seconds()), samesite="none", secure=True)
        return {"code": code}
    else:
        return {"code": code}

@api_router.post("/api/checkLogin")
async def check_login(user: User = userDeps):
    print("checklogin")
    return {"code": 0, "username": user.username}
    
@api_router.post("/api/logout")
async def logout(response: Response, user: User = userDeps):
    response.delete_cookie(key="mytoken", httponly=True, samesite="none", secure=True)
    return {"code": 0}

# --- 数学做题模块 (使用 ProblemManager & SolutionManager) ---

# [POST] /api/getAllProblems
@api_router.post("/api/getAllProblems", response_model=GetAllProblemsResponse)
async def get_all_problems(user: User = userDeps):
    # 使用 ProblemManager
    problems = problem_manager.get_all_problems()
    
    # 格式转换
    p_list = [
        ProblemSummary(
            problem_id=p.problem_id,
            chapter_id=p.chapter_id,
            chapter_name=p.chapter_name,
            difficulty=p.difficulty,
            problem_content=p.problem_content
        ) for p in problems
    ]
    return {"code": 0, "problems": p_list}

# [POST] /api/singleProblemDetail
from app.models import ProblemDetailRequest, ProblemDetailResponse

@api_router.post("/api/singleProblemDetail", response_model=ProblemDetailResponse)
async def get_problem_detail(request: ProblemDetailRequest, user: User = userDeps):
    problem = problem_manager.get_problem_by_id(request.problem_id)
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
        
    return {
        "code": 0,
        "problem_content": problem.problem_content,
        "problem_solution": problem.problem_solution,
        "problem_mindmap": problem.problem_mindmap
    }

# [POST] /api/startSolution
@api_router.post("/api/startSolution", response_model=StartSolutionResponse)
async def start_solution(request: StartSolutionRequest, user: User = userDeps):
    # 1. 校验题目
    problem = problem_manager.get_problem_by_id(request.problem_id)
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")

    # 2. 使用 SolutionManager 获取或创建记录
    solution, is_new = solution_manager.create_or_get_solution(user.user_id, request.problem_id)
    
    return {
        "code": 0,
        "mindmap_id": solution.solution_id,
        "problem_content": problem.problem_content,
        "current_solution": solution.current_solution,
        "current_mindmap": solution.new_mindmap
    }
    
# [POST] /api/updateMindmap
@api_router.post("/api/updateMindmap", response_model=UpdateMindmapResponse)
async def update_mind_map(
    request: UpdateMindmapRequest,
    background_tasks: BackgroundTasks,
    sio: SocketIOServer = sioDeps,
    user: User = userDeps
):
    # 1. 更新解答 (SolutionManager)
    solution = solution_manager.update_solution_text(
        request.mindmap_id, 
        request.current_solution
    )
    
    if not solution:
        raise HTTPException(status_code=404, detail="Solution record not found")
    
    # 2. 触发后台任务
    background_tasks.add_task(
        update_mindmap_pipeline,
        # 参数传递：
        solution_id=solution.solution_id,
        user_input_text=request.current_solution,
        sio=sio,
        agent=global_agent,
        solution_manager=solution_manager,
        problem_manager=problem_manager,
        user_manager=user_manager
    )
    
    return {"code": 0}

# [POST] /api/queryAnalysis
@api_router.post("/api/queryAnalysis", response_model=QueryAnalysisResponse)
async def query_analysis(
    request: QueryAnalysisRequest,
    background_tasks: BackgroundTasks,
    sio: SocketIOServer = sioDeps,
    user: User = userDeps
):
    
    # 触发后台任务
    background_tasks.add_task(
        run_analysis_pipeline,
        # 参数传递：
        solution_id=request.mindmap_id, # mindmap_id 即 solution_id
        sio=sio,
        agent=global_agent,
        solution_manager=solution_manager,
        problem_manager=problem_manager,
        user_manager=user_manager
    )
    
    return {"code": 0}

# [POST] /api/refresh
@api_router.post("/api/refresh", response_model=RefreshResponse)
async def refresh_solution(request: RefreshRequest, user: User = userDeps):
    """刷新当前解题进度"""
    # 1. 获取 Solution 记录
    solution = solution_manager.get_solution_by_id(request.mindmap_id)
    if not solution:
        raise HTTPException(status_code=404, detail="Solution record not found")
    
    # 2. 验证用户权限（确保是当前用户的记录）
    if solution.user_id != user.user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # 3. 获取关联的 Problem 信息
    problem = problem_manager.get_problem_by_id(solution.problem_id)
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    
    # 4. 返回当前进度
    return {
        "code": 0,
        "mindmap_id": solution.solution_id,
        "problem_id": solution.problem_id,
        "problem_content": problem.problem_content,
        "current_solution": solution.current_solution or "",
        "current_mindmap": solution.new_mindmap or {"nodes": [], "edges": []}
    }