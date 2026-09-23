import Taro from '@tarojs/taro';
import type { AsyncTask, ChatResult, GenerateResult, Quota, RequestOptions, TaskSummary, User, Work, PageResult, PublishRecord } from '@xiaoa/share/types';

const API_BASE_URL = process.env.TARO_APP_API_BASE_URL || 'http://localhost:8080/api';

async function request<T>(url: string, options: RequestOptions = {}) {
  const token = Taro.getStorageSync('token') as string;
  const response = await Taro.request<{ code: number; msg: string; data: T }>({
    url: `${API_BASE_URL}${url}`,
    method: options.method,
    data: options.data,
    signal: options.signal,
    header: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const result = response.data;
  if (result.code === 401) {
    await Taro.removeStorage({ key: 'token' });
    Taro.redirectTo({ url: '/pages/login/index' });
    throw new Error(result.msg || '登录已过期');
  }
  if (result.code !== 0) throw new Error(result.msg || '请求失败');
  return result.data;
}

export const taroRequestAdapter = { request };

export const sharedApi = {
  request,
  health: () => request<{ status: string }>('/health'),
  getUser: () => request<User>('/user'),
  getQuota: () => request<Quota>('/quota'),
  getTaskSummary: () => request<TaskSummary>('/task-summary'),
  chat: (message: string) => request<ChatResult>('/chat', { method: 'POST', data: { message } }),
  generate: (data: { prompt: string; mode: 'chat' | 'pro'; materialIds?: string[] }) => request<GenerateResult>('/generate', { method: 'POST', data }),
  getTask: (taskId: string) => request<AsyncTask>(`/task/${taskId}`),
  getWorks: (pageNo = 1, pageSize = 20) => request<PageResult<Work>>('/works', { data: { pageNo, pageSize } }),
  publishRecord: (data: PublishRecord) => request<void>('/publish-record', { method: 'POST', data }),
};
