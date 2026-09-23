import Taro from '@tarojs/taro';
import type { AsyncTask, AdminTaskReport, AuthJoinRequest, AuthJoinResult, AuthLoginRequest, AuthMe, AuthSession, AuthTakeoverRequest, Badge, BadgeQuery, ChatResult, CreateInviteRequest, CreateOrgRequest, CreateTaskRequest, CreationConfig, GenerateResult, GenerateWorkRequest, GrantUserRoleRequest, Invite, OrgNode, PageResult, PublishRecord, Quota, RankingItem, RankingQuery, RemindTaskRequest, RequestOptions, StoreBoard, Task, TaskBoard, TaskBoardRecord, TaskModifyLog, TaskStatusRequest, TaskStoreSummary, TaskSummary, TenantDetail, TenantOpenRequest, TenantOpenResult, UpdateOrgNameRequest, UpdateTaskRequest, UpdateUserRoleRequest, User, Work, WorkStatusResponse } from '@xiaoa/share/types';

const API_BASE_URL = process.env.TARO_APP_API_BASE_URL || 'http://localhost:8080/api';

async function request<T>(url: string, options: RequestOptions = {}) {
  const token = Taro.getStorageSync('token') as string;
  const response = await Taro.request<{ code: number; msg: string; data: T }>({
    url: `${API_BASE_URL}${url}`,
    method: options.method,
    data: options.data,
    signal: options.signal,
    header: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers },
  });
  const result = response.data;
  if (result.code === 2001 || result.code === 401) {
    await Taro.removeStorage({ key: 'token' });
    Taro.redirectTo({ url: '/pages/login/index' });
    throw new Error(result.msg || '登录已过期');
  }
  if (result.code === 2004) {
    Taro.redirectTo({ url: '/pages/invite/index' });
    throw new Error(result.msg || '账号未入店，请使用邀请码加入');
  }
  if (result.code !== 0) {
    const error = new Error(result.msg || '请求失败') as Error & { code: number };
    error.code = result.code;
    throw error;
  }
  return result.data;
}

export const taroRequestAdapter = { request };

export const sharedApi = {
  request,
  health: () => request<{ status: string }>('/health'),
  getUser: () => request<User>('/user'),
  openTenant: (data: TenantOpenRequest) => request<TenantOpenResult>('/tenants/open', { method: 'POST', data }),
  getTenant: (tenantId: number | string) => request<TenantDetail>(`/tenants/${tenantId}`),
  login: (data: AuthLoginRequest) => request<AuthSession>('/auth/login', { method: 'POST', data }),
  joinByInvite: (data: AuthJoinRequest) => request<AuthJoinResult>('/auth/join', { method: 'POST', data }),
  takeover: (data: AuthTakeoverRequest) => request<AuthSession>('/auth/takeover', { method: 'POST', data }),
  logout: () => request<void>('/auth/logout', { method: 'POST' }),
  getAuthMe: () => request<AuthMe>('/auth/me'),
  createInvite: (data: CreateInviteRequest) => request<Invite>('/invites', { method: 'POST', data }),
  validateInvite: (code: string) => request<Invite>(`/invites/${encodeURIComponent(code)}`),
  createOrg: (data: CreateOrgRequest) => request<OrgNode>('/orgs', { method: 'POST', data }),
  getOrgTree: () => request<OrgNode[]>('/orgs/tree'),
  updateOrgName: (orgId: number | string, data: UpdateOrgNameRequest) => request<void>(`/orgs/${orgId}/name`, { method: 'PATCH', data }),
  removeMember: (roleId: number | string) => request<void>(`/users/roles/${roleId}`, { method: 'DELETE' }),
  disableUser: (userId: number | string) => request<void>(`/users/${userId}/disable`, { method: 'PATCH' }),
  grantUserRole: (userId: number | string, data: GrantUserRoleRequest) => request<void>(`/users/${userId}/roles`, { method: 'PUT', data }),
  updateUserRole: (roleId: number | string, data: UpdateUserRoleRequest) => request<void>(`/users/roles/${roleId}`, { method: 'PATCH', data }),
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
  getTaskBoard: (date: string) => request<TaskBoard>(`/task/board?date=${encodeURIComponent(date)}`),
  getTaskStoreSummary: (taskId: number | string, date: string) => request<TaskStoreSummary[]>(`/task/board/stores?taskId=${encodeURIComponent(taskId)}&date=${encodeURIComponent(date)}`),
  getTaskBoardRecords: (taskId: number | string, storeId: number | string, date: string) => request<TaskBoardRecord[]>(`/task/board/records?taskId=${encodeURIComponent(taskId)}&storeId=${encodeURIComponent(storeId)}&date=${encodeURIComponent(date)}`),
  getAdminTaskReport: (taskId: number | string, params?: { storeId?: number | string; periodDate?: string }) => {
    const query = params ? `?${Object.entries(params).map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`).join('&')}` : '';
    return request<AdminTaskReport>(`/admin/task/${taskId}/report${query}`);
  },
  getTaskRanking: (params: RankingQuery = {}) => {
    const query = Object.entries(params).map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`).join('&');
    return request<RankingItem[]>(`/task/ranking${query ? `?${query}` : ''}`);
  },
  getTaskBadges: (params: BadgeQuery = {}) => {
    const query = Object.entries(params).map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`).join('&');
    return request<Badge[]>(`/task/badges${query ? `?${query}` : ''}`);
  },
  chat: (message: string, taskId?: number | string) => request<ChatResult>('/chat', { method: 'POST', data: { message, ...(taskId ? { taskId } : {}) } }),
  getCreationConfig: () => request<CreationConfig>('/creation/config'),
  generate: (data: GenerateWorkRequest) => request<GenerateResult>('/work/generate', { method: 'POST', data }),
  getWorkStatus: (workId: number | string) => request<WorkStatusResponse>(`/work/${workId}/status`),
  getAsyncTask: (taskId: string) => request<AsyncTask>(`/task/${taskId}`),
  getPromptTemplates: () => Promise.reject(new Error('当前端不支持该接口')),
  createPromptTemplate: () => Promise.reject(new Error('当前端不支持该接口')),
  rollbackPromptTemplate: () => Promise.reject(new Error('当前端不支持该接口')),
  getGenerationTasks: () => Promise.reject(new Error('当前端不支持该接口')),
  getWorks: (pageNo = 1, pageSize = 20) => request<PageResult<Work>>('/works', { data: { pageNo, pageSize } }),
  publishRecord: (data: PublishRecord) => request<void>('/publish-record', { method: 'POST', data }),
};
