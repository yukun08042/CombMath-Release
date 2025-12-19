import json
from pathlib import Path
from typing import List, Optional, Union
from handyllm import OpenAIClient, CacheManager
from handyllm.types import PathType
from app.models import MessageResponse, PrivacyAnalysisResponse
from app.core.manager.user_manager import UserManager
from app.core.config import settings
from app.core.fastapi_socketio import SocketIOServer
from app.core.agent.agent_realtime import AgentRealtime
from app.core.manager.msg_manager import MessageManager
from app.core.manager.suggestion_manager import SuggestionManager


class PrivacyAgent:
    def __init__(self, root_dir: PathType, chat_id: int):
        self.client = OpenAIClient(
            "async", endpoints=[model.model_dump() for model in settings.endpoints]
        )

        self.cm = CacheManager(
            base_dir=Path(root_dir) / str(chat_id) / "cache", only_dump=False
        )

        self.agent = AgentRealtime(
            client=self.client, base_dir=Path(root_dir) / str(chat_id) / "prompts"
        )
        self.base_dir = root_dir  # Add base_dir attribute
        self.processing_msg_ids: List[int] = []  # 正在处理的 msg_id 列表
        self.processing_response_msg_ids: List[int] = (
            []
        )  # 正在处理的 response msg_id 列表

    async def generate_response(
        self,
        user_input: str,
        user_msg_id: int,
        user_manager: UserManager,
        message_manager: MessageManager,
        sio: SocketIOServer,
    ) -> str:
        if user_msg_id in self.processing_response_msg_ids:
            raise RuntimeError(
                f"Response for Message ID {user_msg_id} is already being processed."
            )
        self.processing_response_msg_ids.append(user_msg_id)
        response = await self.cm.cache(
            self.agent.response,
            f"response_{user_msg_id}",
        )(user_input=user_input, user_msg_id=user_msg_id)
        self.processing_response_msg_ids.remove(user_msg_id)

        # 保存 agent 回复到数据库
        new_message_id = message_manager.newAgentMessage(user_msg_id, response)
        # 向前端发送消息
        chat_id = message_manager.getChatIdByMessage(user_msg_id)
        user_id = message_manager.getUserIdByMessage(user_msg_id)
        if chat_id is not None and user_id is not None:
            sid = user_manager.getSid(user_id)
            if sid:
                messages = message_manager.getMessagesByChat(chat_id)
                formatted_messages = [
                    {
                        "message_id": msg.message_id,
                        "message_type": msg.message_type,
                        "content": msg.content,
                        "timestamp": str(msg.timestamp),
                    }
                    for msg in messages
                ]
                await sio.sendAllMsg(sid, formatted_messages)

        return response

    async def analyze_privacy(
        self,
        input_text: str,
        msg_id: int,
        suggestion_manager: SuggestionManager,
        message_manager: MessageManager,
        user_manager: UserManager,
        sio: SocketIOServer,
    ) -> list:
        if msg_id in self.processing_msg_ids:
            raise RuntimeError(f"Message ID {msg_id} is already being processed.")
        self.processing_msg_ids.append(msg_id)
        analysis = await self.cm.cache(
            self.agent.analysis,
            f"analysis_{msg_id}",
        )(input_text=input_text, msg_id=msg_id)
        self.processing_msg_ids.remove(msg_id)

        # 保存隐私分析结果到数据库
        for suggestion in analysis:
            suggestion_manager.newSuggestion(
                message_id=msg_id,
                original_text=suggestion["original_text"],
                privacy_analysis=suggestion["privacy_analysis"],
                placeholder=suggestion["placeholder"],
            )

        # 直接替换消息内容中的original_text为placeholder
        modified_content = input_text
        for suggestion in analysis:
            modified_content = modified_content.replace(
                suggestion["original_text"], suggestion["placeholder"]
            )
        message_manager.changeMessageContent(msg_id, modified_content)

        # 返回分析结果
        user_id = message_manager.getUserIdByMessage(msg_id)
        chat_id = message_manager.getChatIdByMessage(msg_id)
        if user_id is not None and chat_id is not None:
            sid = user_manager.getSid(user_id)
            if sid:

                messages = message_manager.getMessagesByChat(chat_id)
                formatted_messages = [
                    {
                        "message_id": msg.message_id,
                        "message_type": msg.message_type,
                        "content": msg.content,
                        "timestamp": str(msg.timestamp),
                    }
                    for msg in messages
                ]
                await sio.sendAllMsg(sid, formatted_messages)

                all_privacy = suggestion_manager.getSuggestionsByChat(chat_id)
                formated_suggestions = [
                    {
                        "message_id": sug.message_id,
                        "original_text": sug.original_text,
                        "privacy_analysis": sug.privacy_analysis,
                        "placeholder": sug.placeholder,
                        "timestamp": str(sug.timestamp),
                        "accepted": sug.accepted,
                        "read": sug.read,
                    }
                    for sug in all_privacy
                ]
                await sio.sendAllPrivacy(sid, formated_suggestions)
                await self.generate_response(
                    modified_content, msg_id, user_manager, message_manager, sio
                )
        return analysis
