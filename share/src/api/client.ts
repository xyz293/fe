import type {
  AsyncTask,
  ChatResult,
  CreateTaskRequest,
  GenerateResult,
  PageResult,
  PublishRecord,
  Quota,
  RemindTaskRequest,
  RequestAdapter,
  RequestOptions,
  StoreBoard,
  Task,
  TaskModifyLog,
  TaskSummary,
  TaskStatusRequest,
  UpdateTaskRequest,
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
    getMyTasks: () => request<Task[]>('/task/my'),
    getTask: (taskId: number | string) => request<Task>(`/task/${taskId}`),
    createTask: (data: CreateTaskRequest) => request<Task>('/task', { method: 'POST', data }),
    updateTask: (taskId: number | string, data: UpdateTaskRequest) => request<Task>(`/task/${taskId}`, { method: 'PUT', data }),
    updateTaskStatus: (taskId: number | string, data: TaskStatusRequest) => request<void>(`/task/${taskId}/status`, { method: 'PATCH', data }),
    getTaskModifyLogs: (taskId: number | string) => request<TaskModifyLog[]>(`/task/${taskId}/modify-logs`),
    getStoreBoard: (storeId: number | string, periodDate: string) => request<StoreBoard>(`/task/store-board?storeId=${encodeURIComponent(storeId)}&periodDate=${encodeURIComponent(periodDate)}`),
    remindTask: (data: RemindTaskRequest) => request<number>('/task/remind', { method: 'POST', data }),
    chat: (message: string, taskId?: number | string) => request<ChatResult>('/chat', { method: 'POST', data: { message, ...(taskId ? { taskId } : {}), industry: 'jewelry-marriage' } }),
    generate: (data: { prompt: string; mode: 'chat' | 'pro'; materialIds?: string[] }) => request<GenerateResult>('/generate', { method: 'POST', data: { ...data, industry: 'jewelry-marriage' } }),
    getAsyncTask: (taskId: string) => request<AsyncTask>(`/task/${taskId}`),
    getWorks: (pageNo = 1, pageSize = 20) => request<PageResult<Work>>('/works', { data: { pageNo, pageSize, industry: 'jewelry-marriage' } }),
    publishRecord: (data: PublishRecord) => request<void>('/publish-record', { method: 'POST', data }),
  };
}

export type ApiClient = ReturnType<typeof createApi>;
