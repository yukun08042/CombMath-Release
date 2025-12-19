from typing import Callable, Optional, overload

from app.core.fastapi_socketio import SocketIOServer


class SocketIORouter:
    
    def __init__(self) -> None:
        self.on_handlers = {}
        self.sio: Optional[SocketIOServer] = None
    
    @overload
    def on(self, event: str, handler: Callable, *args, **kwargs) -> Callable:
        ...
    
    @overload
    def on(self, event: str, *args, **kwargs) -> Callable:
        ...

    def on(self, event, handler=None, *args, **kwargs):
        def decorator(handler: Callable):
            self.on_handlers[event] = (handler, args, kwargs)
            return handler
        if handler is None:
            return decorator
        else:
            # not invoked as a decorator, but as a function
            decorator(handler)
    
    @overload
    def event(self, handler: Callable) -> Callable:
        ...
    
    # copied from socketio.BaseServer.event
    def event(self, *args, **kwargs):
        if len(args) == 1 and len(kwargs) == 0 and callable(args[0]):
            # the decorator was invoked without arguments
            # args[0] is the decorated function
            return self.on(args[0].__name__)(args[0])
        else:
            # the decorator was invoked with arguments
            def set_handler(handler):
                return self.on(handler.__name__, *args, **kwargs)(handler)
            return set_handler

    def register(self, sio: SocketIOServer):
        self.sio = sio
        for key, value in self.on_handlers.items():
            handler, args, kwargs = value
            sio.on(key, handler=handler, *args, **kwargs)
