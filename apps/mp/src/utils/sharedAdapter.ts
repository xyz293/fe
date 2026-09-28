import Taro from '@tarojs/taro';
// 额度域类型定义在 share/src/api/quota.ts，经 @xiaoa/share 主入口导出（@xiaoa/share/types 仅含 types.ts）
import type { MyQuota, StaffQuotaTransferRequest } from '@xiaoa/share';
import type { AdminMemberListQuery, AdminTaskReport, AiWork, AssetItem, AssetQuery, AuthJoinRequest, AuthJoinResult, AuthLoginRequest, AuthMe, AuthSession, AuthTakeoverRequest, Badge, BadgeQuery, ChatReply, ChatReviseRequest, ChatSession, ChatSessionDetail, CreateChatSessionRequest, CreateInviteRequest, CreateOrgRequest, CreateTaskRequest, GenerateWorkRequest, GrantUserRoleRequest, Invite, LongId, OrgNode, PageResult, PublishRecord, RankingItem, RankingQuery, RemindTaskRequest, RequestOptions, RejectWorkRequest, StoreBoard, StyleOption, Task, TaskBoard, TaskBoardRecord, TaskModifyLog, TaskStatusRequest, TaskStoreSummary, TenantDetail, TenantOpenRequest, TenantOpenResult, UpdateOrgNameRequest, UpdateTaskRequest, UpdateUserRoleRequest, UserAccount } from '@xiaoa/share/types';

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
 * 额度计费域接口（小程序端薄封装，仅包含 C 端与店长需要的接口，文档 §2.5 / 员工额度文档 §1.3）。
 * 类型从 @xiaoa/share/types 引入，字段与《额度计费域 & 资产配置域·前端接口文档》对齐；
 * 管理端完整封装见 share/src/api/quota.ts 的 createQuotaApi。
 */
export const quotaApi = {
  /** GET /api/quota/my 我的额度（三级账户：STAFF→员工账户/老数据回退门店，OWNER→门店，管理层→租户池；recentFlows 固定最近 10 条流水） */
  getMyQuota: () => request<MyQuota>('/quota/my'),
  /** POST /api/quota/staff/allocate 店长向员工划拨（仅 OWNER；成功 data:null；3001 门店池不足） */
  staffAllocate: (data: StaffQuotaTransferRequest) => request<void>('/quota/staff/allocate', { method: 'POST', data }),
  /** POST /api/quota/staff/recall 店长回收员工未用额度（仅 OWNER；成功 data:null；员工余额不足 3001） */
  staffRecall: (data: StaffQuotaTransferRequest) => request<void>('/quota/staff/recall', { method: 'POST', data }),
};

export const sharedApi = {
  request,
  health: () => request<{ status: string }>('/health'),
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
  // ===== 对话模式（员工额度 & 对话模式文档 §2：引导式聊天创作，提示词全隐藏） =====
  /** POST /api/chat/sessions 创建会话（scene 必填 ≤32 字符：朋友圈/小红书/视频号等） */
  createChatSession: (data: CreateChatSessionRequest) => request<ChatSession>('/chat/sessions', { method: 'POST', data }),
  /** GET /api/chat/sessions 本人最近 20 条会话，按活跃时间倒序 */
  getChatSessions: () => request<ChatSession[]>('/chat/sessions'),
  /** GET /api/chat/sessions/{id} 全量历史（重进页面恢复；AI 消息 content 为 JSON 字符串，前端需解析） */
  getChatSession: (sessionId: number | string) => request<ChatSessionDetail>(`/chat/sessions/${sessionId}`),
  /** POST /api/chat/sessions/{id}/messages 发一句话（错误：1001 会话关闭/7 天未活跃 / 2003 他人会话 / 3001 额度不足 / 4001 违规词；3001/4001 本轮不落库可直接重发） */
  sendChatMessage: (sessionId: number | string, text: string) => request<ChatReply>(`/chat/sessions/${sessionId}/messages`, { method: 'POST', data: { text } }),
  /** POST /api/chat/sessions/{id}/revise 微调指定版本（扣 1 点；响应 versions 仅一版新文案；1001 无可微调/超范围，1000 LLM 失败稍后重试） */
  reviseChat: (sessionId: number | string, data: ChatReviseRequest) => request<ChatReply>(`/chat/sessions/${sessionId}/revise`, { method: 'POST', data }),
  // ===== AI 创作域（《AI 创作域 & 企业管理域·前端接口文档》§1，管理端完整封装见 share/src/api/work.ts） =====
  /** POST /api/work/generate 发起生成（同步建作品+扣费+提交任务；错误：1001 参数/4001 合规拦截/1000 额度不足/3001 风格不可用） */
  generate: (data: GenerateWorkRequest) => request<AiWork>('/work/generate', { method: 'POST', data }),
  /** GET /api/work/{id} 作品详情（轮询用，仅作品本人；readme 文档无作品列表接口，作品页用本地索引 + 本接口组装） */
  getWork: (workId: number | string) => request<AiWork>(`/work/${workId}`),
  /** PUT /api/work/{id}/caption 修改配套文案（仅 DRAFT/APPROVED/REJECTED 可改；REJECTED 改稿成功自动回 PENDING_AUDIT 重提审） */
  updateWorkCaption: (workId: LongId, caption: string) => request<void>(`/work/${workId}/caption`, { method: 'PUT', data: { caption } }),
  /** POST /api/work/{id}/regenerate 重新生成（原 prompt 全价扣费，status 重置 PENDING 继续轮询；前端二次确认） */
  regenerateWork: (workId: LongId) => request<void>(`/work/${workId}/regenerate`, { method: 'POST' }),
  /** GET /api/assets 素材库列表（文档 §3.3.2：仅 category 过滤，返回三层可见性合并的 Asset[]，最多 200 条不分页；scope 在客户端按 item.scope 分组） */
  getAssets: (params: AssetQuery = {}) => {
    const pairs = Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '');
    const query = pairs.length ? `?${pairs.map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`).join('&')}` : '';
    return request<AssetItem[]>(`/assets${query}`);
  },
  /** POST /api/assets/recommend 本店素材推优入库（文档 §3.3.3；重复推优由后端拒绝，前端直接 toast 错误信息） */
  recommendAsset: (assetId: LongId) => request<void>('/assets/recommend', { method: 'POST', data: { assetId } }),
  /** POST /api/assets 从相册上传素材（即传即用，文档 §3.3.1；multipart 字段 file/name/category） */
  uploadAsset: (filePath: string, options: { name?: string; category?: string } = {}) => new Promise<AssetItem>((resolve, reject) => {
    const token = Taro.getStorageSync('token') as string;
    Taro.uploadFile({
      url: `${API_BASE_URL}/assets`,
      filePath,
      name: 'file',
      formData: {
        ...(options.name ? { name: options.name } : {}),
        ...(options.category ? { category: options.category } : {}),
      },
      header: token ? { Authorization: `Bearer ${token}` } : {},
      success: (res) => {
        try {
          const result = JSON.parse(res.data) as { code: number; msg?: string; data?: AssetItem };
          if (result.code === 0 && result.data) resolve(result.data);
          else reject(new Error(result.msg || '素材上传失败'));
        } catch {
          reject(new Error('素材上传失败'));
        }
      },
      fail: () => reject(new Error('素材上传失败，请重试')),
    });
  }),
  /** GET /api/admin/styles 风格选项（readme §4.7：生成页风格选择器数据源；流程二生成前拉取，管理角色受限时页面走 fallback） */
  getStyleOptions: () => request<StyleOption[]>('/admin/styles'),
  /** GET /api/admin/members 成员列表（店长「员工与角色」页用；STAFF 记录带 quotaBalance/userOrgRoleId，员工额度文档 §1.3） */
  getAdminMembers: (params: AdminMemberListQuery = {}) => {
    const query = Object.entries(params).filter(([, value]) => value !== undefined && value !== '').map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`).join('&');
    return request<PageResult<UserAccount>>(`/admin/members${query ? `?${query}` : ''}`);
  },
  // 管理端专用接口（AI 创作域 §1.5 / 企业管理域 §2.4），小程序端不用，占位防误调
  getPromptTemplates: () => Promise.reject(new Error('当前端不支持该接口')),
  createPromptTemplate: () => Promise.reject(new Error('当前端不支持该接口')),
  rollbackPromptTemplate: () => Promise.reject(new Error('当前端不支持该接口')),
  getMediaTasks: () => Promise.reject(new Error('当前端不支持该接口')),
  auditList: () => Promise.reject(new Error('当前端不支持该接口')),
  approveAuditWork: () => Promise.reject(new Error('当前端不支持该接口')),
  rejectAuditWork: (_id: number | string, _data: RejectWorkRequest) => Promise.reject(new Error('当前端不支持该接口')),
  publishRecord: (data: PublishRecord) => request<void>('/publish-record', { method: 'POST', data }),
};
