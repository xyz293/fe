import type {
  AsyncTask,
  ChatResult,
  GenerateResult,
  PageResult,
  PublishRecord,
  RequestAdapter,
  RequestOptions,
  Quota,
  TaskSummary,
  User,
  Work,
} from './types';

export function createApi(adapter: RequestAdapter) {
  const request = <T>(url: string, options?: RequestOptions) => adapter.request<T>(url, options);

  return {
    request,
    health: () => request<{ status: string }>('/health'),
    getUser: () => request<User>('/user'),
    getQuota: () => request<Quota>('/quota'),
    getTaskSummary: () => request<TaskSummary>('/task-summary'),
    chat: (message: string) => request<ChatResult>('/chat', { method: 'POST', data: { message, industry: 'jewelry-marriage' } }),
    generate: (data: { prompt: string; mode: 'chat' | 'pro'; materialIds?: string[] }) => request<GenerateResult>('/generate', { method: 'POST', data: { ...data, industry: 'jewelry-marriage' } }),
    getTask: (taskId: string) => request<AsyncTask>(`/task/${taskId}`),
    getWorks: (pageNo = 1, pageSize = 20) => request<PageResult<Work>>('/works', { data: { pageNo, pageSize, industry: 'jewelry-marriage' } }),
    publishRecord: (data: PublishRecord) => request<void>('/publish-record', { method: 'POST', data }),
  };
}

export type ApiClient = ReturnType<typeof createApi>;
