import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from './constants';
import { AnalysisMapResponse, AnalysisSuggestionResponse, MessageResponse, PrivacyAnalysisResponse } from './definitions';

// NOTE: 浏览器刷新时，后端需要等一段时间才知道socket断开，所以此时后端会有多个sid对应同一个userid
const socket: Socket = io(API_BASE_URL, {
    autoConnect: false,  // MUST disable auto connect, otherwise it will connect immediately
    withCredentials: true,
    // ref: https://stackoverflow.com/a/41953165
    // transports: ['websocket'],
    // upgrade: false,
});

type ConnectCallback = () => void;
// 定义回调函数的类型，确保第一个参数是object，第二个参数是number
type allMsgCallback = (data: MessageResponse[]) => void;
type allPrivacyAnalysisCallback = (data: PrivacyAnalysisResponse[]) => void;
type analysisMapCallback = (data: AnalysisMapResponse) => void;
type analysisSuggestionCallback = (data: AnalysisSuggestionResponse) => void;

class SocketManager {
    public get connected() {
        return socket.connected;
    }

    public connect() {
        console.log('socket connecting...')
        // 如果token是httpOnly的cookie（客户端无法访问，浏览器管理），这里就不包括token了
        socket.auth = { cookie: document.cookie };
        socket.connect();
        console.log('connected done. status: ', socket.connected)
    }

    public disconnect() {
        console.log('socket disconnecting...')
        socket.disconnect();
    }

    public onConnect(callback: ConnectCallback) {
        socket.on("connect", callback);
    }

    public offConnect(callback: ConnectCallback) {
        socket.off("connect", callback);
    }

    public onDisconnect(callback: ConnectCallback) {
        socket.on("disconnect", callback);
    }

    public offDisconnect(callback: ConnectCallback) {
        socket.off("disconnect", callback);
    }

    public onAllMessages(callback: allMsgCallback) {
        socket.on("all_messages", callback);
    }

    public offAllMessages(callback: allMsgCallback) {
        socket.off("all_messages", callback);
    }

    public onAllPrivacyAnalyses(callback: allPrivacyAnalysisCallback) {
        socket.on("all_privacy", callback);
    }

    public offAllPrivacyAnalyses(callback: allPrivacyAnalysisCallback) {
        socket.off("all_privacy", callback);
    }

    public onAnalysisMap(callback: analysisMapCallback) {
        socket.on("sendAnalysisMap", callback);
    }

    public offAnalysisMap(callback: analysisMapCallback) {
        socket.off("sendAnalysisMap", callback);
    }

    public onAnalysisSuggestion(callback: analysisSuggestionCallback) {
        socket.on("sendAnalysisSuggestion", callback);
    }

    public offAnalysisSuggestion(callback: analysisSuggestionCallback) {
        socket.off("sendAnalysisSuggestion", callback);
    }
}

export const socketManager = new SocketManager();

