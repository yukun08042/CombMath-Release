from typing import List
import socketio
from fastapi import FastAPI

# ref: https://github.com/Artucuno/fastapi-socketio/tree/master
class SocketIOServer(socketio.AsyncServer):
    """
    Integrates SocketIO with FastAPI app.
    Adds `sio` property to FastAPI object (app).
    """

    def __init__(
            self,
            app: FastAPI,
            mount_location: str = "/ws",
            socketio_path: str = "socket.io",
            async_mode: str = "asgi",
            **kwargs
    ) -> None:
        # disable socketio CORS handling and let fastapi CORS handle it
        super().__init__(cors_allowed_origins=[], async_mode=async_mode, **kwargs)
        self._app = socketio.ASGIApp(
            socketio_server=self, socketio_path=socketio_path
        )
        app.mount(mount_location, self._app)
        app.add_route(f"/{socketio_path}/", route=self._app, methods=["GET", "POST"]) # type: ignore
        app.add_websocket_route(f"/{socketio_path}/", self._app) # type: ignore
        app.sio = self # type: ignore
        app.state.sio = self

    def is_asyncio_based(self):
        return True
    
    async def sendAnalysisMap(self, sid, mindmap_data, problem_id=None, mindmap_id=None):
        '''发送思维导图数据给指定客户端'''
        await self.emit(
            event='sendAnalysisMap',
            data={
                "problem_id": problem_id,
                "mindmap_id": mindmap_id,
                "new_mindmap": mindmap_data
            },
            to=sid
        )
        
    async def sendAnalysisSuggestion(self, sid, suggestion_data, problem_id=None, mindmap_id=None):
        '''发送思考建议给指定客户端'''
        # suggestion_data 应该包含 suggestion 和 suggestion_summary
        await self.emit(
            event='sendAnalysisSuggestion',
            data={
                "problem_id": problem_id,
                "mindmap_id": mindmap_id,
                "suggestion": suggestion_data.get("suggestion", {}),
                "suggestion_summary": suggestion_data.get("suggestion_summary", "")
            },
            to=sid
        )
    
    # async def sendAllMsg(self, sid, all_msg):
    #     '''发送所有消息给指定客户端'''
    #     await self.emit(
    #         event='all_messages',
    #         data=all_msg,
    #         to=sid
    #     )
    
    # async def sendAllPrivacy(self, sid, all_privacy):
    #     '''发送所有隐私分析给指定客户端'''
    #     await self.emit(
    #         event='all_privacy',
    #         data=all_privacy,
    #         to=sid
    #     )