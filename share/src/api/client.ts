import type {
  AdminMemberListQuery,
  AdminTaskReport,
  AiWork,
  AuthJoinRequest,
  AuthJoinResult,
  AuthLoginRequest,
  AuthMe,
  AuthSession,
  AuthTakeoverRequest,
  AuditConfig,
  Badge,
  BadgeQuery,
  ChatReply,
  ChatReviseRequest,
  ChatSession,
  ChatSessionDetail,
  ComplianceWord,
  ContentPackage,
  ContentPackageQuery,
  CreateChatSessionRequest,
  CreateContentPackageRequest,
  CreateExportRequest,
  CreateInviteRequest,
  CreateOrgRequest,
  CreateStoreRequest,
  CreateStyleRequest,
  CreateTaskRequest,
  DashboardOverview,
  DashboardTrendPoint,
  ExportTask,
  GenerateWorkRequest,
  MediaTask,
  PageResult,
  PromptTemplate,
  PromptTemplateRequest,
  PublishRecord,
  StoreAccountSummary,
  StyleOption,
  UpdateAuditConfigRequest,
  UpsertComplianceWordRequest,
  UpdateStoreParentRequest,
  UpdateStyleRequest,
  UserAccount,
  RankingItem,
  RankingQuery,
  RemindTaskRequest,
  TaskBoard,
  TaskBoardRecord,
  TaskStoreSummary,
  PlatformCustomer,
  PlatformCustomerListQuery,
  PlatformCustomerRequest,
  PlatformDashboard,
  PlatformPeriod,
  PlatformPlan,
  PlatformPlanRequest,
  PlatformTenant,
  PlatformTenantApproveRequest,
  PlatformTenantListQuery,
  PlatformTenantRejectRequest,
  RequestAdapter,
  RequestOptions,
  StoreBoard,
  TenantDetail,
  TenantOpenRequest,
  TenantOpenResult,
  UpdateOrgNameRequest,
  UpdateUserRoleRequest,
  GrantUserRoleRequest,
  Invite,
  OrgNode,
  Task,
  TaskModifyLog,
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
    openTenant: (data: TenantOpenRequest) => request<TenantOpenResult>('/tenants/open', { method: 'POST', data }),
    getTenant: (tenantId: number | string) => request<TenantDetail>(`/tenants/${tenantId}`),
    // 文档 §7.3：PATCH /api/tenants/{tenantId}/renew，请求体为 JSON 字符串（如 "2027-09-23 23:59:59"），仅 HQ_ADMIN
    renewTenant: (tenantId: number | string, expireAt: string) => request<void>(`/tenants/${tenantId}/renew`, { method: 'PATCH', data: JSON.stringify(expireAt), headers: { 'Content-Type': 'application/json' } }),
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
    /** POST /api/chat/sessions/{id}/messages 发一句话（核心对话接口；错误：1001 会话关闭/7 天未活跃/参数 / 2003 他人会话 / 3001 额度不足 / 4001 违规词；3001/4001 本轮不落库可直接重发） */
    sendChatMessage: (sessionId: number | string, text: string) => request<ChatReply>(`/chat/sessions/${sessionId}/messages`, { method: 'POST', data: { text } }),
    /** POST /api/chat/sessions/{id}/revise 微调指定版本（扣 1 点；响应 versions 仅一版新文案；错误：1001 无可微调/超范围 / 1000 LLM 失败稍后重试） */
    reviseChat: (sessionId: number | string, data: ChatReviseRequest) => request<ChatReply>(`/chat/sessions/${sessionId}/revise`, { method: 'POST', data }),
    /** POST /api/work/generate 发起生成（AI 创作域文档 §1.4.1，返回 status=PENDING 的作品；错误：1001/1002/4001/1000/3001） */
    generate: (data: GenerateWorkRequest) => request<AiWork>('/work/generate', { method: 'POST', data }),
    /** GET /api/work/{id} 作品详情（轮询用，仅作品本人，AI 创作域文档 §1.4.2；文档无作品列表接口，前端用本地索引 + 本接口组装列表） */
    getWork: (workId: number | string) => request<AiWork>(`/work/${workId}`),
    /** PUT /api/work/{id}/caption 修改配套文案（仅 DRAFT/APPROVED/REJECTED 可改，REJECTED 改稿自动重提审，readme §4.13） */
    updateWorkCaption: (workId: number | string, caption: string) => request<void>(`/work/${workId}/caption`, { method: 'PUT', data: { caption } }),
    /** POST /api/work/{id}/regenerate 重新生成（按旧任务价格全额重新扣费，作品回到生成中，readme §4.13） */
    regenerateWork: (workId: number | string) => request<void>(`/work/${workId}/regenerate`, { method: 'POST' }),
    /** GET /api/admin/prompt-template 提示词模板全部版本（AI 创作域文档 §1.5.2，按 scene,version 倒序；当前生效取 status=1） */
    getPromptTemplates: () => request<PromptTemplate[]>('/admin/prompt-template'),
    /** PUT /api/admin/prompt-template 保存模板（仅 HQ_ADMIN；id=null 新增版本，同 scene 旧版本全部停用） */
    createPromptTemplate: (data: PromptTemplateRequest) => request<void>('/admin/prompt-template', { method: 'PUT', data }),
    /** PUT /api/admin/prompt-template/{id}/rollback 回滚到指定历史版本（仅 HQ_ADMIN；不存在报 1002） */
    rollbackPromptTemplate: (templateId: number | string) => request<void>(`/admin/prompt-template/${templateId}/rollback`, { method: 'PUT' }),
    /** GET /api/admin/media-task/list 生成任务列表（AI 创作域文档 §1.5.1，运维视角，按时间倒序；limit 默认 50，超出 1~200 自动截断） */
    getMediaTasks: (limit = 50) => request<MediaTask[]>(`/admin/media-task/list?limit=${limit}`),
    publishRecord: (data: PublishRecord) => request<void>('/publish-record', { method: 'POST', data }),

    // ===== 平台端（readme §4.18 仅收录 auth/login、payment register/confirm/cancel 四个接口；
    // 以下 dashboard/tenant/plan/customer 接口为前端先行页面，后端 89 个接口中暂无，页面均已做失败降级，接入后移除本标注） =====
    /** GET /platform/dashboard（readme §4.18 未收录，后端暂无） */
    getPlatformDashboard: (period: PlatformPeriod = 'month') => request<PlatformDashboard>(`/platform/dashboard?period=${encodeURIComponent(period)}`),
    getPlatformTenants: (params: PlatformTenantListQuery = {}) => request<PageResult<PlatformTenant>>('/platform/tenant/list', { data: params }),
    approvePlatformTenant: (data: PlatformTenantApproveRequest) => request<PlatformTenant>('/platform/tenant/approve', { method: 'POST', data }),
    rejectPlatformTenant: (data: PlatformTenantRejectRequest) => request<PlatformTenant>('/platform/tenant/reject', { method: 'POST', data }),
    getPlatformPlans: (params: { pageNo?: number; pageSize?: number; status?: string } = {}) => request<PageResult<PlatformPlan>>('/platform/plan/list', { data: params }),
    createPlatformPlan: (data: PlatformPlanRequest) => request<PlatformPlan>('/platform/plan', { method: 'POST', data }),
    updatePlatformPlan: (planId: number | string, data: PlatformPlanRequest) => request<PlatformPlan>(`/platform/plan/${planId}`, { method: 'PUT', data }),
    updatePlatformPlanStatus: (planId: number | string, status: 'ACTIVE' | 'INACTIVE' | 0 | 1) => request<PlatformPlan>(`/platform/plan/${planId}/status`, { method: 'PATCH', data: { status } }),
    getPlatformCustomers: (params: PlatformCustomerListQuery = {}) => request<PageResult<PlatformCustomer>>('/platform/customer/list', { data: params }),
    createPlatformCustomer: (data: PlatformCustomerRequest) => request<PlatformCustomer>('/platform/customer', { method: 'POST', data }),
    updatePlatformCustomer: (customerId: number | string, data: PlatformCustomerRequest) => request<PlatformCustomer>(`/platform/customer/${customerId}`, { method: 'PUT', data }),
    deletePlatformCustomer: (customerId: number | string) => request<void>(`/platform/customer/${customerId}`, { method: 'DELETE' }),

    // ===== 管理端运营模块（文档：Admin Dashboard/Assets/Compliance/ContentPackages/Exports/Members/Stores/Styles） =====
    // 1. 数据看板
    getAdminDashboardOverview: () => request<DashboardOverview>('/admin/dashboard/overview'),
    getAdminDashboardTrend: () => request<DashboardTrendPoint[]>('/admin/dashboard/trend'),
    // 2. 素材管理（文档 §3.4：分页列表/推优审核由 assetApi 提供，见 share/src/api/asset.ts）
    // 3. 合规管理
    getComplianceWords: () => request<ComplianceWord[]>('/admin/compliance/words'),
    upsertComplianceWord: (data: UpsertComplianceWordRequest) => request<void>('/admin/compliance/words', { method: 'PUT', data }),
    disableComplianceWord: (id: number | string) => request<void>(`/admin/compliance/words/${id}`, { method: 'DELETE' }),
    getAuditConfig: (orgId: number | string) => request<AuditConfig>(`/admin/compliance/audit-config/${orgId}`),
    updateAuditConfig: (orgId: number | string, data: UpdateAuditConfigRequest) => request<void>(`/admin/compliance/audit-config/${orgId}`, { method: 'PUT', data }),
    // 4. 内容包管理（文档 §3.5：任务模板在创建时强校验，下发由后端定时任务完成）
    getContentPackages: (params: ContentPackageQuery = {}) => request<PageResult<ContentPackage>>('/admin/content-packages', { data: params }),
    createContentPackage: (data: CreateContentPackageRequest) => request<ContentPackage>('/admin/content-packages', { method: 'POST', data }),
    disableContentPackage: (id: number | string) => request<void>(`/admin/content-packages/${id}`, { method: 'DELETE' }),
    // 5. 导出任务（文档 §2.6：同租户进行中最多 3 个；创建后建议轮询列表，status=1 展示下载入口）
    createExportTask: (data: CreateExportRequest) => request<ExportTask>('/admin/exports', { method: 'POST', data }),
    getExportTasks: () => request<ExportTask[]>('/admin/exports'),
    getExportTask: (id: number | string) => request<ExportTask>(`/admin/exports/${id}`),
    // 6. 会员管理（PageResult<UserAccount>，Query: orgId?/pageNo/pageSize）
    getAdminMembers: (params: AdminMemberListQuery = {}) => {
      const query = Object.entries(params).filter(([, value]) => value !== undefined && value !== '').map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`).join('&');
      return request<PageResult<UserAccount>>(`/admin/members/${query ? `?${query}` : ''}`);
    },
    // 7. 门店管理（文档 §2.7：创建返回新门店的 StoreAccountSummary；调整归属 PATCH，data:null）
    getStoreSummaries: () => request<StoreAccountSummary[]>('/admin/stores'),
    createStore: (data: CreateStoreRequest) => request<StoreAccountSummary>('/admin/stores', { method: 'POST', data }),
    updateStoreParent: (storeId: number | string, data: UpdateStoreParentRequest) => request<void>(`/admin/stores/${storeId}/parent`, { method: 'PATCH', data }),
    // 8. 风格管理（文档 §2.8：DELETE 为物理删除，创作页立即不可选；历史作品保留 styleName 快照）
    getStyleOptions: () => request<StyleOption[]>('/admin/styles'),
    createStyle: (data: CreateStyleRequest) => request<void>('/admin/styles', { method: 'POST', data }),
    updateStyle: (id: number | string, data: UpdateStyleRequest) => request<void>(`/admin/styles/${id}`, { method: 'PUT', data }),
    deleteStyle: (id: number | string) => request<void>(`/admin/styles/${id}`, { method: 'DELETE' }),
  };
}

export type ApiClient = ReturnType<typeof createApi>;
