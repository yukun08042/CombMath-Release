# app/services/tasks.py
import logging
from app.core.fastapi_socketio import SocketIOServer
from app.core.agent.agent_realtime import AgentRealtime
from app.core.manager.solution_manager import SolutionManager
from app.core.manager.problem_manager import ProblemManager
from app.core.manager.user_manager import UserManager

logger = logging.getLogger(__name__)

async def update_mindmap_pipeline(
    solution_id: int,
    user_input_text: str,
    sio: SocketIOServer,
    agent: AgentRealtime,
    solution_manager: SolutionManager,
    problem_manager: ProblemManager,
    user_manager: UserManager
):
    task_id = f"sol_{solution_id}"
    logger.info(f"[{task_id}] 开始更新思维导图...")

    try:
        # ==================================================
        # Step 1: 分别获取 Solution 和 Problem 数据
        # ==================================================
        
        # 1.1 获取 Solution 记录 (包含旧 mindmap)
        # 注意：这里返回的对象是 Detached 的，读取基础属性没问题
        solution = solution_manager.get_solution_by_id(solution_id)
        if not solution:
            logger.error(f"[{task_id}] Solution 不存在")
            return

        # 1.2 根据关联 ID 获取 Problem 详情
        problem = problem_manager.get_problem_by_id(solution.problem_id)
        if not problem:
            logger.error(f"[{task_id}] 关联的 Problem (ID: {solution.problem_id}) 不存在")
            return
        
        # 1.3 获取用户 SID
        sid = user_manager.getSid(solution.user_id)
        logging.info(f"[{task_id}] 获取用户 {solution.user_id} 的 SID: {sid}")

        # ==================================================
        # Step 2: 提取所需的上下文数据
        # ==================================================
        
        problem_content = getattr(problem, "problem_content", "")
        # problem_solution = getattr(problem, "problem_solution", "")
        existing_mindmap = solution.new_mindmap
        
        # 判断现有导图是否包含有效节点
        # 假设空导图结构是 {"nodes": [], "edges": []}
        has_existing_nodes = existing_mindmap and len(existing_mindmap.get("nodes", [])) > 0
        
        final_mindmap = {}

        # ==================================================
        # Step 3: 调用 Agent 
        # ==================================================
        
        if not has_existing_nodes:
            # --- Case A: 首次生成 ---
            logger.info(f"[{task_id}] 模式: 首次生成")
            result = await agent.generate_mindmap_scratch(problem_content, user_input_text, task_id)
            final_mindmap = result.get("problem_mindmap", result)
        else:
            # --- Case B: 增量更新 ---
            logger.info(f"[{task_id}] 模式: 增量更新")
            result = await agent.update_mindmap_incremental(
                problem_content=problem_content,
                existing_map=existing_mindmap,
                user_input=user_input_text,
                task_id=task_id
            )
            final_mindmap = result.get("problem_mindmap", result)

        # 简单的有效性检查
        if not final_mindmap:
            logger.warning(f"[{task_id}] AI 生成结果无效，跳过保存")
            return

        # ==================================================
        # Step 4: 更新数据库 & 推送
        # ==================================================
        
        # 保存回 Solution
        solution_manager.update_mindmap(solution_id, final_mindmap)
        logger.info(f"[{task_id}] 数据库更新成功")

        # 推送 SocketIO
        await sio.sendAnalysisMap(
            sid=sid,
            mindmap_data=final_mindmap,
            problem_id=solution.problem_id,
            mindmap_id=solution_id
        )
        logger.info(f"[{task_id}] SocketIO 推送完成，sid={sid}")

    except Exception as e:
        logger.error(f"[{task_id}] 思维导图更新异常: {e}", exc_info=True)

async def run_analysis_pipeline(
    solution_id: int,
    sio: SocketIOServer,
    agent: AgentRealtime,
    solution_manager: SolutionManager,
    problem_manager: ProblemManager,
    user_manager: UserManager
):
    task_id = f"sol_{solution_id}"
    logger.info(f"[{task_id}] 开始 AI 分析任务...")

    try:
        # ==================================================
        # Step 1: 分别获取 Solution 和 Problem 数据
        # ==================================================
        
        # 1.1 获取 Solution 记录 (包含旧 mindmap)
        # 注意：这里返回的对象是 Detached 的，读取基础属性没问题
        solution = solution_manager.get_solution_by_id(solution_id)
        if not solution:
            logger.error(f"[{task_id}] Solution 不存在")
            return

        # 1.2 根据关联 ID 获取 Problem 详情
        problem = problem_manager.get_problem_by_id(solution.problem_id)
        if not problem:
            logger.error(f"[{task_id}] 关联的 Problem (ID: {solution.problem_id}) 不存在")
            return
        
        # 1.3 获取用户 SID
        sid = user_manager.getSid(solution.user_id)
        logging.info(f"[{task_id}] 获取用户 {solution.user_id} 的 SID: {sid}")

        # ==================================================
        # Step 2: 提取所需的上下文数据
        # ==================================================
        
        problem_content = getattr(problem, "problem_content", "")
        # problem_solution = getattr(problem, "problem_solution", "")
        latest_mindmap = solution.new_mindmap
        latest_solution = solution.current_solution
        
        # ==================================================
        # Step 5: 生成解题建议 & 推送
        # ==================================================
        
        # 5.1 获取标准答案思维导图
        # problem 对象在 Step 1.2 已获取
        standard_mindmap = getattr(problem, "problem_mindmap", None)

        # 只有当存在标准导图，且刚才生成了有效的用户导图时，才进行差异分析
        if standard_mindmap and latest_mindmap:
            logger.info(f"[{task_id}] 开始生成解题建议 (Gap Analysis)...")
            
            # 5.2 调用 Agent 生成建议
            suggestion_result = await agent.generate_mindmap_suggestion(
                problem_content=problem_content,
                # problem_solution=problem_solution,
                user_solution=latest_solution,  # 用户的最新解答
                user_mindmap=latest_mindmap,     # 用户的最新用户导图
                standard_mindmap=standard_mindmap,
                task_id=task_id
            )
            
            if suggestion_result:
                # 5.3 保存建议总结到数据库
                # 提取 summary，如果为空则默认为空字符串
                summary_text = suggestion_result.get("suggestion_summary", "")
                solution_manager.update_suggestion(solution_id, summary_text)
                logger.info(f"[{task_id}] 建议 Summary 已保存到数据库")

                # 5.4 推送 SocketIO 给前端
                # 假设 sio 封装了 sendAnalysisSuggestion 方法
                # suggestion_result 结构包含: { "suggestion": {...}, "suggestion_summary": "..." }
                await sio.sendAnalysisSuggestion(
                    sid=sid,
                    suggestion_data=suggestion_result,
                    problem_id=solution.problem_id,
                    mindmap_id=solution_id
                )
                logger.info(f"[{task_id}] 建议数据已推送到前端 (sid={sid})")
            else:
                logger.warning(f"[{task_id}] AI 生成建议结果为空")
        else:
            if not standard_mindmap:
                logger.warning(f"[{task_id}] 缺少标准思维导图 (Problem ID: {solution.problem_id})，跳过建议生成")
            if not latest_mindmap:
                logger.warning(f"[{task_id}] 用户思维导图查询失败，无法进行差异分析")

    except Exception as e:
        logger.error(f"[{task_id}] 分析任务执行异常: {e}", exc_info=True)