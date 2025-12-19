from typing import List, Optional, Union, Dict, Any
from pydantic import BaseModel, Field

class RegisterRequest(BaseModel):
    username: str
    password: str

# ==========================================
# 1. 基础组件 (MindMap 结构定义)
# ==========================================

class MindMapNode(BaseModel):
    node_id: str = Field(..., description="节点编号，如 N1")
    node_content: str = Field(..., description="节点内容，Markdown格式")
    node_type: Optional[str] = Field(None, description="节点类型")

class MindMapEdge(BaseModel):
    edge_id: str = Field(..., description="边编号，如 E1")
    source: str = Field(..., description="起点 node_id")
    target: str = Field(..., description="终点 node_id")
    edge_content: Optional[str] = Field(None, description="边上的文字内容")

class MindMapData(BaseModel):
    """思维导图的标准数据结构"""
    nodes: List[MindMapNode] = []
    edges: List[MindMapEdge] = []

# ==========================================
# 2. HTTP API 请求与响应模型
# ==========================================

# --- [POST] /api/getAllProblems ---

class ProblemSummary(BaseModel):
    problem_id: int
    chapter_id: int
    chapter_name: str
    difficulty: int = Field(..., ge=1, le=5, description="难度 1-5")
    problem_content: str

class GetAllProblemsResponse(BaseModel):
    code: int = Field(default=0)
    problems: List[ProblemSummary]

# --- [POST] /api/singleProblemDetail ---

class ProblemDetailRequest(BaseModel):
    problem_id: int

class ProblemDetailResponse(BaseModel):
    code: int = Field(default=0)
    problem_content: str
    problem_solution: str
    problem_mindmap: MindMapData

# --- [POST] /api/startSolution ---

class StartSolutionRequest(BaseModel):
    problem_id: int

class StartSolutionResponse(BaseModel):
    code: int = Field(default=0)
    mindmap_id: int = Field(..., description="对应数据库中的 user_solution_id，作为本次做题的唯一标识")
    problem_content: str
    current_solution: str = Field(default="")
    current_mindmap: MindMapData = Field(default_factory=MindMapData)

# --- [POST] /api/queryAnalysis ---

class UpdateMindmapRequest(BaseModel):
    problem_id: int
    mindmap_id: int = Field(..., description="全局唯一做题过程 ID")
    current_solution: str = Field(..., description="用户最新的解答内容")
    
class UpdateMindmapResponse(BaseModel):
    code: int = Field(default=0, description="0表示后端已收到请求，开始异步更新思维导图")
    # 后端直接根据最新版本的思维导图进行分析，无需返回新的导图数据

class QueryAnalysisRequest(BaseModel):
    problem_id: int
    mindmap_id: int = Field(..., description="全局唯一做题过程 ID")

class QueryAnalysisResponse(BaseModel):
    code: int = Field(default=0, description="0表示后端已收到请求，开始异步生成建议")

# --- [POST] /api/refresh ---

class RefreshRequest(BaseModel):
    mindmap_id: int = Field(..., description="当前解题的ID")

class RefreshResponse(BaseModel):
    code: int = Field(default=0)
    mindmap_id: int = Field(..., description="返回给前端全局唯一【用户做题过程】ID")
    problem_id: int = Field(..., description="题目ID")
    problem_content: str = Field(..., description="problem_id 对应的题目内容")
    current_solution: str = Field(default="", description="用户已经完成的markdown格式的解答")
    current_mindmap: MindMapData = Field(default_factory=MindMapData, description="当前思维导图")

# ==========================================
# 3. SocketIO 事件推送模型
# ==========================================

# 事件名: "sendAnalysisMap"
class SocketAnalysisMapResponse(BaseModel):
    problem_id: int
    mindmap_id: int
    new_mindmap: MindMapData

# 事件名: "sendAnalysisSuggestion"
class SocketAnalysisSuggestionResponse(BaseModel):
    problem_id: int
    mindmap_id: int
    suggestion: MindMapData = Field(..., description="仅包含不在 mindmap 里的推荐思考方向")
    suggestion_summary: str = Field(..., description="Markdown 格式的建议总结")