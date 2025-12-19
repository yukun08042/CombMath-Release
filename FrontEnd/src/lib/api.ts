import axios from 'axios';
import { API_BASE_URL } from '@/lib/constants';

const TIMEOUT = 2000;

// 获取数据
export const getData = async (): Promise<{ message: string }> => {
    const response = await axios.get(`${API_BASE_URL}/data`);
    return response.data;
};

export function register(username: string, password: string) {
    return axios.post(`${API_BASE_URL}/api/register`, {
        username: username,
        password: password,
    }, {
        timeout: TIMEOUT
    });
}

export function login(username: string, password: string) {
    return axios.post(
        `${API_BASE_URL}/api/login`,
        {
            username: username,
            password: password,
        },
        { withCredentials: true, timeout: TIMEOUT }
    );
}

export function logout() {
    return axios.post(
        `${API_BASE_URL}/api/logout`,
        {},
        { withCredentials: true, timeout: TIMEOUT }
    );
}

export function checkLogin() {
    return axios.post(
        `${API_BASE_URL}/api/checkLogin`,
        {},
        { withCredentials: true, timeout: TIMEOUT }
    );
}

export function newChat() {
    return axios.post(
        `${API_BASE_URL}/api/new_chat`,
        {},
        { withCredentials: true, timeout: TIMEOUT }
    );
}

export function newMsg(chat_id: number, content: string) {
    return axios.post(
        `${API_BASE_URL}/api/new_message`,
        {
            chat_id: chat_id,
            content: content,
        },
        { withCredentials: true, timeout: TIMEOUT }
    );
}

export function refresh(chat_id: number) {
    return axios.post(
        `${API_BASE_URL}/api/refresh`,
        {
            chat_id: chat_id
        },
        { withCredentials: true, timeout: TIMEOUT }
    );
}

export function refreshMindmap(mindmap_id: number) {
    return axios.post(
        `${API_BASE_URL}/api/refresh`,
        {
            mindmap_id: mindmap_id
        },
        { withCredentials: true, timeout: TIMEOUT }
    );
}

export function getAllProblems() {
    return axios.post(`${API_BASE_URL}/api/getAllProblems`,
        {},
        {
            withCredentials: true,
            timeout: TIMEOUT
        }
    );
}

export function singleProblemDetail(problem_id: number) {
    return axios.post(`${API_BASE_URL}/api/singleProblemDetail`,
        {
            problem_id: problem_id
        },
        {
            withCredentials: true,
            timeout: TIMEOUT
        }
    );
}

export function startSolution(problem_id: number) {
    return axios.post(`${API_BASE_URL}/api/startSolution`,
        {
            problem_id: problem_id
        },
        {
            withCredentials: true,
            timeout: TIMEOUT
        }
    );
}

export function queryAnalysis(problem_id: number, mindmap_id: number) {
    return axios.post(`${API_BASE_URL}/api/queryAnalysis`,
        {
            problem_id: problem_id,
            mindmap_id: mindmap_id,
            // current_solution: current_solution
        },
        {
            withCredentials: true,
            timeout: TIMEOUT
        }
    );
}

export function updateMindmap(problem_id: number, mindmap_id: number, current_solution: string) {
    return axios.post(`${API_BASE_URL}/api/updateMindmap`,
        {
            problem_id: problem_id,
            mindmap_id: mindmap_id,
            current_solution: current_solution
        },
        {
            withCredentials: true,
            timeout: TIMEOUT
        }
    );
}