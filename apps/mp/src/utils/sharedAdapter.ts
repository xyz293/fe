import Taro from '@tarojs/taro';
import type { MyQuota, QuotaFlow, QuotaFlowQuery } from '@xiaoa/share';
import type { AdminTaskReport, AssetItem, AssetQuery, AssetUploadResult, AsyncTask, AuthJoinRequest, AuthJoinResult, AuthLoginRequest, AuthMe, AuthSession, AuthTakeoverRequest, Badge, BadgeQuery, ChatResult, CreateInviteRequest, CreateOrgRequest, CreateTaskRequest, CreationConfig, GenerateResult, GenerateWorkRequest, GrantUserRoleRequest, Invite, LongId, OrgNode, PageResult, PublishRecord, Quota, RankingItem, RankingQuery, RemindTaskRequest, RequestOptions, StoreBoard, Task, TaskBoard, TaskBoardRecord, TaskModifyLog, TaskStatusRequest, TaskStoreSummary, TaskSummary, TenantDetail, TenantOpenRequest, TenantOpenResult, UpdateOrgNameRequest, UpdateTaskRequest, UpdateUserRoleRequest, User, Work, WorkStatusResponse } from '@xiaoa/share/types';

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

/**
 * 额度计费域接口（小程序端薄封装，仅包含 C 端需要的两个接口）。
 * 类型从 @xiaoa/share/types 引入，字段与《额度计费域-后端方案》对齐；
 * 管理端完整封装见 share/src/api/quota.ts 的 createQuotaApi。
 */
export const quotaApi = {
  /** GET /api/quota/my 我的额度（余额 + 近 10 条流水） */
  getMyQuota: () => request<MyQuota>('/quota/my'),
  /** GET /api/quota/my/flows 我的额度流水分页 */
  getMyQuotaFlows: (params: QuotaFlowQuery = {}) => {
    const pairs = Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '');
    const query = pairs.length ? `?${pairs.map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`).join('&')}` : '';
    return request<PageResult<QuotaFlow>>(`/quota/my/flows${query}`);
  },
};

export const sharedApi = {
  request,
  health: () => request<{ status: string }>('/health'),
  getUser: () => request<User>('/user'),
  openTenant: (data: TenantOpenRequest) => request<TenantOpenResult>('/tenants/open', { method: 'POST', data }),
  getTenant: (tenantId: number | string) => request<TenantDetail>(`/tenants/${tenantId}`),
  // 文档 §7.3：PATCH /api/tenants/{tenantId}/renew，请求体为 JSON 字符串（如 "2027-09-23 23:59:59"），仅 HQ_ADMIN
  renewTenant: (tenantId: number | string, expireAt: string) => request<void>(`/tenants/${tenantId}/renew`, { method: 'PATCH', data: JSON.stringify(expireAt) }),
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
  // ===== 创作与作品域（《创作与作品域-后端方案》，管理端完整封装见 share/src/api/work.ts） =====
  /** PUT /api/work/{id}/caption 修改配套文案（驳回改稿重提后后端自动回 PENDING_AUDIT） */
  updateWorkCaption: (workId: LongId, caption: string) => request<void>(`/work/${workId}/caption`, { method: 'PUT', data: { caption } }),
  /** POST /api/work/{id}/regenerate 重新生成（全价扣费，前端二次确认） */
  regenerateWork: (workId: LongId) => request<GenerateResult>(`/work/${workId}/regenerate`, { method: 'POST' }),
  /** GET /api/assets 素材库列表（scope=BRAND 品牌图库 / STORE 本店图库，后端三层可见性合并返回） */
  getAssets: (params: AssetQuery = {}) => {
    const pairs = Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '');
    const query = pairs.length ? `?${pairs.map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`).join('&')}` : '';
    return request<AssetItem[]>(`/assets${query}`);
  },
  /** POST /api/assets/recommend 本店素材推优入库（重复推优由后端拒绝，前端直接 toast 错误信息） */
  recommendAsset: (assetId: LongId) => request<void>('/assets/recommend', { method: 'POST', data: { assetId } }),
  /** POST /api/assets 从相册上传素材（即传即用） */
  uploadAsset: (filePath: string) => new Promise<AssetUploadResult>((resolve, reject) => {
    const token = Taro.getStorageSync('token') as string;
    Taro.uploadFile({
      url: `${API_BASE_URL}/assets`,
      filePath,
      name: 'file',
      header: token ? { Authorization: `Bearer ${token}` } : {},
      success: (res) => {
        try {
          const result = JSON.parse(res.data) as { code: number; msg?: string; data?: AssetUploadResult };
          if (result.code === 0 && result.data) resolve(result.data);
          else reject(new Error(result.msg || '素材上传失败'));
        } catch {
          reject(new Error('素材上传失败'));
        }
      },
      fail: () => reject(new Error('素材上传失败，请重试')),
    });
  }),
  getAsyncTask: (taskId: string) => request<AsyncTask>(`/task/${taskId}`),
  getPromptTemplates: () => Promise.reject(new Error('当前端不支持该接口')),
  createPromptTemplate: () => Promise.reject(new Error('当前端不支持该接口')),
  rollbackPromptTemplate: () => Promise.reject(new Error('当前端不支持该接口')),
  getGenerationTasks: () => Promise.reject(new Error('当前端不支持该接口')),
  getWorks: (pageNo = 1, pageSize = 20) => request<PageResult<Work>>('/works', { data: { pageNo, pageSize } }),
  publishRecord: (data: PublishRecord) => request<void>('/publish-record', { method: 'POST', data }),
};
