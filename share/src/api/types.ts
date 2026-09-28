export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
export type LongId = number | string;

export interface RequestOptions {
  method?: HttpMethod;
  data?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

export interface RequestAdapter {
  request: <T>(url: string, options?: RequestOptions) => Promise<T>;
}

export class ApiError extends Error {
  code: number;

  constructor(code: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
  }
}

export interface ApiResponse<T> {
  code: number;
  msg: string;
  data: T;
}

export interface PageResult<T> {
  list: T[];
  total: number;
  pageNo?: number;
  pageSize?: number;
}

export type TenantRole = 'HQ_ADMIN' | 'REGION_ADMIN' | 'OWNER' | 'VIEWER' | 'STAFF';
export type PlatformRole = 'PLATFORM_OPS' | 'PLATFORM_FINANCE';
export type UserRole = TenantRole | PlatformRole | 'EMPLOYEE';
export type DataScope = 1 | 2 | 3 | 4;

export interface User {
  id: string;
  name: string;
  role: UserRole;
  storeId: string;
  storeName: string;
  tenantId?: string;
  orgId?: string;
  dataScope?: DataScope;
}

export interface AuthLoginRequest {
  openid: string;
}

export interface AuthJoinRequest {
  code: string;
  phone: string;
  openid: string;
  nickname?: string;
}

export interface AuthTakeoverRequest {
  phone: string;
  openid: string;
}

export interface AuthSession {
  token: string;
  userId: LongId;
  tenantId: LongId;
  orgId: LongId;
  role: TenantRole | PlatformRole;
  dataScope: DataScope;
  tenantStatus: 1 | 2 | 3;
  tenantName: string;
  orgName: string;
}

export interface AuthJoinResult {
  login: AuthSession;
  storeId: LongId;
}

export interface AuthMe {
  userId: LongId;
  tenantId: LongId;
  orgId: LongId;
  role: TenantRole | PlatformRole;
  dataScope: DataScope;
}

export interface TenantOpenRequest {
  name: string;
  type: 1 | 2;
  industry: string;
  assetPackageId?: LongId;
  adminPhone: string;
  adminOpenid?: string;
  adminNickname?: string;
  expireAt?: string;
}

export interface TenantOpenResult {
  tenantId: LongId;
  orgId: LongId;
  userId: LongId;
}

export interface TenantDetail {
  id: LongId;
  name: string;
  type: 1 | 2;
  industry: string;
  assetPackageId?: LongId | null;
  status: 1 | 2 | 3;
  expireAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface Invite {
  id: LongId;
  storeId: LongId;
  code: string;
  role: TenantRole;
  expireAt: string;
  used?: 0 | 1;
}

export interface CreateInviteRequest {
  storeId: LongId;
  expireAt: string;
  role?: TenantRole;
}

export interface CreateOrgRequest {
  type: 1 | 2 | 3;
  name: string;
  parentId?: LongId;
}

export interface OrgNode {
  id: LongId;
  parentId: LongId;
  type: 1 | 2 | 3;
  name: string;
  children: OrgNode[];
}

export interface UpdateOrgNameRequest {
  name: string;
}

export interface GrantUserRoleRequest {
  orgId: LongId;
  role: TenantRole;
  dataScope: DataScope;
}

export interface UpdateUserRoleRequest {
  orgId: LongId;
  role: TenantRole;
  dataScope: DataScope;
}

/** 旧版额度接口（GET /api/quota）类型：全量文档 §4.17 未收录该接口，仅存量 store 状态引用；现用 /quota/my（MyQuota） */
export interface Quota {
  balance: number;
  total: number;
  used: number;
}

export interface TaskSummary {
  pending: number;
  completed: number;
  overdue: number;
}

// ---- 对话模式（引导式聊天创作 /api/chat/sessions，文档 §2）：AI 追问补齐要素，一次出 3 版文案，提示词全隐藏 ----

/** 对话消息角色（历史接口 role 为 USER / AI） */
export type ChatRole = 'USER' | 'AI';

/** 会话状态：ACTIVE 可继续对话 / CLOSED 已关闭（发消息报 1001，7 天不活跃自动关闭） */
export type ChatSessionStatus = 'ACTIVE' | 'CLOSED';

/** 对话会话（ChatSession，文档 §2.5）：要素收集状态机存在 context JSON 里 */
export interface ChatSession {
  id: LongId;
  tenantId: LongId;
  userId: LongId;
  /** 如「朋友圈 · 创作对话」 */
  title: string;
  /** 创作场景（≤32 字符）：朋友圈 / 小红书 / 视频号等 */
  scene: string;
  status: ChatSessionStatus;
  /** 要素收集状态 JSON 字符串（product/sellingPoint/audience/rounds），前端仅透传 */
  context?: string | null;
  /** 已发生的微调次数（每次微调扣 1 点） */
  reviseCount: number;
  createdAt?: string;
  updatedAt?: string;
}

/** 会话消息（GET /api/chat/sessions/{id} 返回；AI 消息 content 是 JSON 字符串，渲染前需解析） */
export interface ChatSessionMessage {
  id: LongId;
  role: ChatRole;
  /** USER=用户原话；AI 为 JSON 字符串：{"action":"ASK","question":"..."} / {"action":"GENERATE","versions":[...],"revisedFrom":2} */
  content: string;
  createdAt?: string;
}

/** GET /api/chat/sessions/{id} 全量历史（重进页面恢复） */
export interface ChatSessionDetail {
  session: ChatSession;
  messages: ChatSessionMessage[];
}

/** 对话回复动作：ASK=追问（不扣费）/ GENERATE=出稿（已扣费；扣费失败整轮不落库可直接重发） */
export type ChatReplyAction = 'ASK' | 'GENERATE';

/** POST /api/chat/sessions/{id}/messages 与 /revise 的响应（ChatReplyVO，文档 §2.5） */
export interface ChatReply {
  sessionId: LongId;
  action: ChatReplyAction;
  /** action=ASK 时有值：AI 追问文案 */
  question?: string | null;
  /** action=GENERATE 时有值：首次出稿 3 版，微调仅 1 版 */
  versions?: string[] | null;
  /** 最新要素收集状态 JSON 字符串 */
  context?: string | null;
  messageId?: LongId;
}

/** POST /api/chat/sessions 创建会话请求（scene 必填 ≤32 字符） */
export interface CreateChatSessionRequest {
  scene: string;
}

/** POST /api/chat/sessions/{id}/revise 微调请求（versionNo 对应最近一次出稿的第几版，1 起） */
export interface ChatReviseRequest {
  versionNo: number;
  instruction: string;
}

// —— 前端渲染模型（由上述契约解析而来，页面统一渲染实时消息与历史消息） ——

/** 单条出稿文案（首次 3 版可横滑；微调后单版刷新并打角标） */
export interface ChatCopyVariant {
  /** 版本序号（1 起），微调后不变 */
  index: number;
  /** 风格标签（正式契约 versions 为纯文本数组，无标签，展示「版本 N」） */
  tag?: string;
  content: string;
  /** 是否被微调过（前端展示「已修改」角标） */
  refined?: boolean;
}

/** 对话页渲染用消息（USER 原话 / AI 追问 / AI 出稿卡片，历史解析与实时追加共用） */
export interface ChatMessage {
  role: ChatRole;
  /** USER 原话、AI 追问文案或出稿引导语 */
  content: string;
  /** AI 出稿卡片（GENERATE 时有值；微调消息为单版卡片） */
  copies?: ChatCopyVariant[];
  /** 微调消息：基于第几版改写（来自历史 AI content 的 revisedFrom） */
  revisedFrom?: number;
  createdAt?: string;
}

export type AIGenerationType = 'IMAGE' | 'VIDEO';

/** POST /api/work/generate 请求体（AI 创作域文档 §1.4.1） */
export interface GenerateWorkRequest {
  /** IMAGE / VIDEO（大小写不敏感，其他值 1001） */
  type: AIGenerationType;
  /** 发布平台（≤32 字符），如 douyin */
  platform: string;
  /** 风格 ID，须可见（本租户或平台内置且启用），否则 1002 */
  styleId: LongId;
  /** 产品名（≤2000） */
  productName?: string;
  /** 用户补充说明（≤4000） */
  userInput?: string;
  /** 参考图 URL 列表（最多 10 条） */
  refImageUrls?: string[];
  /** 引用素材 ID（最多 20 个，须三层可见 APPROVED，否则整次生成报 1001） */
  assetIds?: LongId[];
  /** 关联对话会话 ID（对话模式「去配图」透传；带它则不再自动生成成套文案，选定文案由 PUT /work/{id}/caption 回填，文档 §2.6） */
  chatSessionId?: LongId | null;
}

/** 提示词模板（AI 创作域文档 §1.5.2/§1.6）：status=1 为当前生效版本（每个 scene 仅一条） */
export interface PromptTemplate {
  id: LongId;
  /** 仅支持 IMAGE / VIDEO（其他值 1001） */
  scene: AIGenerationType;
  /** 新增版本时 = 该 scene 历史最大版本 + 1，旧版本全部停用 */
  version: number;
  /** 模板内容，可用占位符：{{platform}} {{style}} {{productName}} {{userInput}} */
  template: string;
  /** 1 启用（生效）/ 0 停用（历史版本） */
  status: 0 | 1;
  createdAt?: string;
  updatedAt?: string;
}

/** PUT /api/admin/prompt-template 保存请求（仅 HQ_ADMIN；id=null 即新增版本） */
export interface PromptTemplateRequest {
  id?: LongId | null;
  scene: AIGenerationType;
  template: string;
}

/** 生成任务状态（AI 创作域文档 §1.6）：视频额外经过 SUBMITTED ⇄ POLLING */
export type MediaTaskStatus = 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED' | 'SUBMITTED' | 'POLLING';

/** 生成任务（管理端运维视角，AI 创作域文档 §1.5.1/§1.6） */
export interface MediaTask {
  id: LongId;
  tenantId: LongId;
  userId: LongId;
  workId: LongId;
  storeId: LongId;
  /** IMAGE / VIDEO */
  type: AIGenerationType;
  scene?: AIGenerationType;
  status: MediaTaskStatus;
  /** 实际送模型的提示词 */
  prompt?: string | null;
  /** 模型侧任务 ID（视频） */
  providerTaskId?: string | null;
  /** 成品地址（当前 local:// 占位，OSS 接入前不可直接预览） */
  resultUrl?: string | null;
  /** 本任务扣费点数 */
  cost?: number;
  errorMessage?: string | null;
  /** 0 未退款 / 1 已自动退款 */
  refundStatus?: 0 | 1;
  startedAt?: string | null;
  finishedAt?: string | null;
}

/** 发布状态（对齐后端 publish_status，AI 创作域文档 §1.2 状态机） */
export type PublishStatus = 'NONE' | 'DRAFT' | 'PENDING_AUDIT' | 'APPROVED' | 'REJECTED' | 'PUBLISHED';

/** 作品生成维度状态（AI 创作域文档 §1.1，与 publishStatus 独立流转） */
export type AiWorkStatus = 'PENDING' | 'SUCCESS' | 'FAILED';

/** 作品（AI 创作域文档 §1.6）：生成是异步的，返回 status=PENDING 后前端轮询 GET /api/work/{id} */
export interface AiWork {
  id: LongId;
  tenantId: LongId;
  userId: LongId;
  /** IMAGE / VIDEO */
  type: AIGenerationType;
  /** 当前关联生成任务 ID */
  mediaTaskId?: LongId | null;
  platform?: string | null;
  styleId?: LongId | null;
  /** 风格名称快照（风格删除后仍在） */
  styleName?: string | null;
  userInput?: string | null;
  /** 参考图 URL，换行符分隔的字符串（渲染前需 split('\n')，文档 §3.4） */
  refImageUrls?: string | null;
  promptTemplateId?: LongId | null;
  promptTemplateVersion?: number | null;
  /** 成品地址（当前 local:// 占位协议，OSS 接入前不可直接预览，文档 §3.5） */
  contentUrl?: string | null;
  /** 生成文案（预留） */
  copywriting?: string | null;
  status: AiWorkStatus;
  /** 失败原因（status=FAILED 时有值；失败后额度已自动退回） */
  failReason?: string | null;
  publishStatus: PublishStatus;
  /** 配套文案（成功后异步补写，可能晚于 SUCCESS 到达；失败留空可手动改） */
  caption?: string | null;
  /** 引用素材 ID 快照，JSON 数组字符串（如 "[12,15]"），渲染前需 JSON.parse（文档 §3.4） */
  sourceAssetIds?: string | null;
  /** 关联对话会话 ID（对话模式「去配图」产出的作品；列表/详情均返回，可跳回对话溯源，文档 §2.6） */
  chatSessionId?: LongId | null;
  /** 最新一次审核意见（无审核记录为 null；驳回时前端展示它） */
  auditOpinion?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

/** 兼容别名：作品模型已统一为文档 §1.6 结构（/works 旧列表接口同样返回该结构） */
export type Work = AiWork;

// ---- 企业管理域 · 内容审核 /api/admin/audit/works（文档 §2.4，元素为 AiWork 结构，最多 100 条无分页） ----

/** POST /api/admin/audit/works/{id}/reject 请求体（文档 §2.4.2，opinion 必填 ≤512） */
export interface RejectWorkRequest {
  opinion: string;
}

// ---- 资产配置域 · 素材 /api/assets（《额度计费域 & 资产配置域·前端接口文档》§3.3.5 对齐） ----

export type AssetScope = 'PLATFORM' | 'BRAND' | 'STORE';
export type AssetStatus = 'APPROVED' | 'PENDING_REVIEW' | 'REJECTED' | 'DELETED';
export type AssetType = 'IMAGE' | 'VIDEO' | 'SCRIPT';

export interface AssetItem {
  id: LongId;
  tenantId?: LongId;
  /** 关联行业包（平台素材才有） */
  packageId?: LongId | null;
  /** 所属门店（STORE 层素材才有） */
  storeId?: LongId | null;
  scope: AssetScope | string;
  type: AssetType | string;
  name: string;
  /** 文件地址（当前 local:// 占位协议，不可直接当 http URL 加载）或话术内容 */
  content: string;
  /** 版本号，一期固定 v1 */
  version?: string;
  category?: string | null;
  status: AssetStatus | string;
  /** 上传人用户 ID（驳回通知发给 TA） */
  uploaderId?: LongId;
  /** 旧推优字段，仅历史兼容，新流程忽略 */
  recommendStatus?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface AssetQuery {
  scope?: AssetScope | string;
  status?: AssetStatus | string;
  category?: string;
  pageNo?: number;
  pageSize?: number;
}

/** PUT /api/admin/assets/{id}：name（≤128）/ category（≤50）至少传一个，只更新传了的 */
export interface UpdateAssetRequest {
  name?: string;
  category?: string;
}

/** 推优（小程序本店素材 → 总部审核） */
export interface RecommendAssetRequest {
  assetId: LongId;
}

/** 推优审核（文档 §3.4.5）：仅 PENDING_REVIEW 可审；pass=true 时 scope: STORE→BRAND、status→APPROVED */
export interface AssetReviewRequest {
  pass: boolean;
  /** 通过时可改分类升入品牌层；不传保持原分类 */
  category?: string;
}

export interface PublishRecord {
  workId: LongId;
  taskId?: LongId;
  platform: string;
  proofUrl?: string;
}

/** 改稿重提：修改 caption 后后端自动回 PENDING_AUDIT */
export interface UpdateWorkCaptionRequest {
  caption: string;
}

export type TaskFormType = 1 | 2;
export type TaskFrequency = 1 | 2 | 3;
export type TaskTargetScope = 1 | 2 | 3 | 4;
export type TaskJudgeType = 1 | 2;
export type TaskStatus = 1 | 2;

export interface Task {
  id: LongId;
  tenantId?: LongId;
  title: string;
  formType: TaskFormType;
  contentPackageId?: LongId | null;
  platform?: string | null;
  frequency: TaskFrequency;
  targetScope: TaskTargetScope;
  targetIds: number[] | string;
  judgeType: TaskJudgeType;
  sourceTaskId?: LongId | null;
  createdBy?: LongId;
  createdLevel?: 1 | 2 | 3;
  status: TaskStatus;
  startAt?: string | null;
  endAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  periodDate?: string;
  recordStatus?: 0 | 1;
  publishRecordId?: LongId | null;
}

export interface CreateTaskRequest {
  title: string;
  formType: TaskFormType;
  contentPackageId?: LongId;
  platform?: string;
  frequency: TaskFrequency;
  targetScope: TaskTargetScope;
  targetIds: number[];
  judgeType: TaskJudgeType;
  startAt?: string;
  endAt?: string;
}

export interface UpdateTaskRequest {
  title: string;
  contentPackageId?: LongId;
  platform?: string;
  startAt?: string;
  endAt?: string;
}

export interface TaskStatusRequest {
  status: TaskStatus;
}

export interface TaskModifyLog {
  id: LongId;
  tenantId?: LongId;
  taskId: LongId;
  modifiedBy?: LongId;
  changeDetail: string;
  createdAt?: string;
}

export interface StoreTaskRecord {
  id: LongId;
  tenantId?: LongId;
  taskId: LongId;
  userId: LongId;
  storeId: LongId;
  periodDate: string;
  status: 0 | 1;
  publishRecordId?: LongId | null;
  finishedAt?: string | null;
}

export interface StoreBoard {
  storeId: LongId;
  periodDate: string;
  expected: number;
  finished: number;
  completionRate: number;
  unfinished: StoreTaskRecord[];
}

export interface RemindTaskRequest {
  taskId: LongId;
  periodDate?: string;
}

// ===== 管理端任务统计（文档 §8） =====

export interface TaskBoardItem {
  taskId: LongId;
  title: string;
  status: TaskStatus;
  targetScope: TaskTargetScope;
  periodDate: string;
  expected: number;
  finished: number;
  completionRate: number;
}

export interface TaskBoard {
  date: string;
  tasks: TaskBoardItem[];
}

export interface TaskStoreSummary {
  storeId: LongId;
  storeName: string;
  expected: number;
  finished: number;
  completionRate: number;
}

export interface TaskBoardRecord {
  id: LongId;
  taskId: LongId;
  userId: LongId;
  nickname?: string;
  storeId: LongId;
  storeName?: string;
  periodDate: string;
  status: 0 | 1;
  publishRecordId?: LongId | null;
  proofUrl?: string;
  finishedAt?: string | null;
}

export interface AdminTaskReport {
  taskId: LongId;
  periodDate: string;
  expected: number;
  finished: number;
  completionRate: number;
  records: StoreTaskRecord[];
}

// ===== 排行榜与勋章（文档 §9） =====

export type RankingScope = 'NATIONAL' | 'STORE';
export type RankingPeriod = 'WEEK' | 'MONTH';

export interface RankingQuery {
  scope?: RankingScope;
  period?: RankingPeriod;
  storeId?: LongId;
  limit?: number;
}

export interface RankingItem {
  rank: number;
  userId: LongId;
  nickname: string;
  storeId: LongId;
  storeName: string;
  expected: number;
  finished: number;
  completionRate: number;
  lastFinishedAt?: string | null;
}

export interface BadgeQuery {
  userId?: LongId;
  date?: string;
}

export interface Badge {
  code: string;
  name: string;
  description: string;
  achieved: boolean;
  value: number;
  threshold: number;
}

export type PlatformPeriod = 'month' | 'week' | 'year';
export type PlatformTenantStatus = 'PENDING' | 'ACTIVE' | 'REJECTED' | 'DISABLED' | 0 | 1 | 2 | 3;
export type PlatformPlanStatus = 'ACTIVE' | 'INACTIVE' | 0 | 1;

export interface PlatformTrendPoint {
  date: string;
  value: number;
}

export interface PlatformTenantRanking {
  tenantId: LongId;
  tenantName: string;
  value: number;
}

export interface PlatformCreationTypeRatio {
  type: string;
  value: number;
  percent: number;
}

export interface PlatformDashboard {
  tenantCount: number;
  tenantNewThisMonth: number;
  storeCount: number;
  activeStoreCount: number;
  monthlyRecharge: number;
  rechargeMonthOverMonth: number;
  monthlyConsumption: number;
  consumptionMonthOverMonth: number;
  consumptionTrend: PlatformTrendPoint[];
  tenantTop: PlatformTenantRanking[];
  creationTypeRatio: PlatformCreationTypeRatio[];
  pendingTenantCount: number;
  pendingRechargeCount: number;
  expiringPlanCount: number;
}

export interface PlatformTenant {
  id: LongId;
  name: string;
  contactName: string;
  contactPhone: string;
  planName?: string;
  planId?: LongId;
  status: PlatformTenantStatus;
  expireAt?: string | null;
  storeCount?: number;
  storeLimit?: number;
  quotaTotal?: number;
  unifiedSocialCreditCode?: string;
  licenseUrl?: string;
  applyAt?: string;
  applyRemark?: string;
  rejectReason?: string;
  createdAt?: string;
}

export interface PlatformTenantListQuery {
  pageNo?: number;
  pageSize?: number;
  status?: PlatformTenantStatus;
  keyword?: string;
}

export interface PlatformTenantApproveRequest {
  tenantId: LongId;
  initialStoreLimit: number;
  initialQuota: number;
  adminPhone: string;
}

export interface PlatformTenantRejectRequest {
  tenantId: LongId;
  reason: string;
}

export interface PlatformPlan {
  id: LongId;
  name: string;
  storeLimit: number;
  quotaLimit: number;
  annualPrice: number;
  status: PlatformPlanStatus;
  usedCount?: number;
  imagePrice?: number;
  videoPrice?: number;
  featureVideo?: boolean;
  featureMaterialRecommend?: boolean;
  featureApi?: boolean;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PlatformPlanRequest {
  name: string;
  storeLimit: number;
  quotaLimit: number;
  annualPrice: number;
  imagePrice?: number;
  videoPrice?: number;
  featureVideo?: boolean;
  featureMaterialRecommend?: boolean;
  featureApi?: boolean;
  description?: string;
}

export interface PlatformCustomer {
  id: LongId;
  tenantId: LongId;
  tenantName: string;
  name: string;
  role: string;
  phone: string;
  lastLoginAt?: string | null;
  remark?: string;
  createdAt?: string;
}

export interface PlatformCustomerListQuery {
  pageNo?: number;
  pageSize?: number;
  keyword?: string;
  tenantId?: LongId;
}

export interface PlatformCustomerRequest {
  tenantId: LongId;
  name: string;
  role: string;
  phone: string;
  remark?: string;
}

// ===== 管理端运营模块（数据看板/素材/合规/内容包/导出/会员/门店/风格） =====
// 注：后端文档仅提供接口与 DTO 名称，字段按语义建模，均为宽松可选，展示层需兜底。

// ---- 1. 数据看板 /api/admin/dashboard ----

/** 经营概览（企业管理域文档 §2.3.1；REGION_ADMIN 自动只统计本区域；服务端有缓存，短时变动不立即反映） */
export interface DashboardOverview {
  /** 近 7 天有产出作品的门店数 */
  activeStores: number;
  /** 本周（周一起）新增作品数 */
  weeklyWorks: number;
  /** 本周发布数 */
  weeklyPublishes: number;
  /** 当前额度余额合计（本租户所有账户） */
  totalQuota: number;
  /** 本周消耗额度 */
  usedQuota: number;
}

/** 近 7 天趋势点（企业管理域文档 §2.3.2，固定返回含今天共 7 个点、无数据补 0） */
export interface DashboardTrendPoint {
  /** yyyy-MM-dd */
  date: string;
  works: number;
  publishes: number;
}

// ---- 2. 素材管理 /api/admin/assets（文档 §3.4，类型见 AssetItem / AssetReviewRequest） ----

// ---- 3. 合规管理 /api/admin/compliance ----

/** 合规词（企业管理域文档 §2.5.1）：列表只返回启用中的词 */
export interface ComplianceWord {
  id: LongId;
  word: string;
  /** 1 替换（提示词中静默替换为 replacement，生成继续）/ 2 拒绝（直接报 4001 拦截） */
  level: 1 | 2;
  /** level=1 时的替换文本；缺失按替换为空串处理 */
  replacement?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

/** PUT /api/admin/compliance/words 请求体（仅 HQ_ADMIN；id 空=新增，有值=更新，不存在报 1002） */
export interface UpsertComplianceWordRequest {
  id?: LongId | null;
  word: string;
  level: 1 | 2;
  replacement?: string;
}

/** 作品审核开关（企业管理域文档 §2.5.2）：orgId=0 为品牌级默认；门店未配置时自动回退品牌级 */
export interface AuditConfig {
  orgId: LongId;
  /** 开→之后生成成功的作品进审核队列；关→直接草稿。只影响之后的作品，不改存量 */
  enabled: boolean;
}

/** PUT /api/admin/compliance/audit-config/{orgId} 请求体（响应 data 为 { orgId, enabled }） */
export interface UpdateAuditConfigRequest {
  enabled: boolean;
}

// ---- 4. 资产配置域 · 内容包（营销日历定时下发任务，文档 §3.5）/api/admin/content-packages ----

/** 内容包状态：1 ACTIVE 待下发 / 2 DISPATCHED 已下发 / 3 CANCELED 已撤销（文档 §3.5.2） */
export type PackageStatus = 1 | 2 | 3;
/** 任务模板动作类型：1 固定动作 / 2 指定内容 */
export type PackageActionType = 1 | 2;
/** 任务模板频率：1 每日 / 2 每周 / 3 每月 */
export type PackageFrequency = 1 | 2 | 3;

/** 任务模板（文档 §3.5.1，创建时强校验；targetScope≠1 时 targetIds 必传且非空） */
export interface PackageTaskTemplate {
  /** 任务标题，缺省用内容包名称 */
  title?: string;
  actionType: PackageActionType;
  /** 平台（如 douyin，非空字符串） */
  platform: string;
  frequency: PackageFrequency;
  /** 1 直接完成 / 2 需截图凭证 */
  judgeType: TaskJudgeType;
  /** 任务截止 yyyy-MM-dd HH:mm:ss（注意空格分隔，文档 §1.3 例外） */
  endTime: string;
  /** 1 全员（缺省）/ 2 区域 / 3 门店 / 4 员工 */
  targetScope?: TaskTargetScope;
  targetIds?: number[];
}

export interface ContentPackage {
  id: LongId;
  tenantId?: LongId;
  name: string;
  /** 营销日 yyyy-MM-dd，早于今天创建直接拒绝（1001） */
  calendarDate: string;
  /** 下发时刻 ISO yyyy-MM-ddTHH:mm:ss */
  publishAt: string;
  /** 推广方向（≤2000），会随任务带给门店 */
  copyDirection?: string | null;
  /** 任务模板 JSON 字符串（前端需 JSON.parse 后渲染） */
  taskTemplate: string;
  status: PackageStatus;
  /** 下发生成的任务 ID（未下发为 null；status=2 且为空说明下发异常，需人工补建） */
  sourceTaskId?: LongId | null;
  /** 下发失败原因 */
  lastError?: string | null;
  createdBy?: LongId;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateContentPackageRequest {
  /** 内容包名称（≤128） */
  name: string;
  /** 营销日 yyyy-MM-dd */
  calendarDate: string;
  /** 下发时刻 yyyy-MM-ddTHH:mm:ss */
  publishAt: string;
  copyDirection?: string;
  taskTemplate: PackageTaskTemplate;
}

export interface ContentPackageQuery {
  status?: PackageStatus;
  pageNo?: number;
  pageSize?: number;
}

// ---- 5. 导出任务 /api/admin/exports ----

/** 导出类型（企业管理域文档 §2.6.1） */
export type ExportType = 1 | 2 | 3 | 4;

/** POST /api/admin/exports 创建导出（同租户进行中最多 3 个，超出报 1003；创建即异步执行） */
export interface CreateExportRequest {
  /** 1 消耗明细 / 2 充值记录 / 3 任务 / 4 产出 */
  exportType: ExportType;
  /** 查询条件 JSON 字符串（如 '{"from":"2026-09-01","to":"2026-09-30"}'），原样存储 */
  queryParams?: string;
}

/** 导出任务（企业管理域文档 §2.6.2；前端建议创建后轮询列表，status=1 时展示下载入口） */
export interface ExportTask {
  id: LongId;
  tenantId: LongId;
  createdBy: LongId;
  exportType: ExportType;
  queryParams?: string | null;
  /** 0 处理中 / 1 已完成 / 2 失败 */
  status: 0 | 1 | 2;
  /** 完成后的文件地址（当前 local://export/... 占位，接 OSS 后可直接下载，文档 §3.5） */
  fileUrl?: string | null;
  failReason?: string | null;
  createdAt?: string;
  finishedAt?: string | null;
}

// ---- 6. 会员管理 /api/admin/members（对应租户模块 UserAccount 模型） ----

export interface UserAccount {
  id: LongId;
  phone?: string;
  openid?: string;
  nickname?: string;
  /** 实时余额：STAFF→员工账户，OWNER→门店，管理层→租户池（员工额度文档 §1.3） */
  quotaBalance?: number;
  /** 成员关系 ID（STAFF 才有）：划拨/回收接口的 memberRoleId 直接取这里 */
  userOrgRoleId?: LongId | null;
  /** 角色编码（尽力兼容字段，如 STAFF/OWNER；后端未返回时前端按 userOrgRoleId 推断） */
  role?: string;
  status?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface AdminMemberListQuery {
  orgId?: number | string;
  pageNo?: number;
  pageSize?: number;
}

// ---- 7. 门店管理 /api/admin/stores ----

/** 门店节点（企业管理域文档 §2.7.1，Org 结构） */
export interface StoreOrg {
  id: LongId;
  tenantId: LongId;
  /** 父节点 ID；门店（type=3）不可作为父级 */
  parentId?: LongId | null;
  /** 1 品牌 / 2 区域 / 3 门店（文档 §3.10） */
  type: 1 | 2 | 3;
  name: string;
  createdAt?: string;
  updatedAt?: string;
}

/** GET /api/admin/stores 元素（企业管理域文档 §2.7.1；REGION_ADMIN 只看本区域门店） */
export interface StoreAccountSummary {
  store: StoreOrg;
  memberCount: number;
  /** 店长用户 ID（可能 null） */
  ownerUserId?: LongId | null;
}

/** POST /api/admin/stores 创建门店（文档 §2.7.2；parentId 缺省挂当前管理员组织；父节点须品牌/区域，成功自动初始化余额 0 的额度账户） */
export interface CreateStoreRequest {
  name: string;
  parentId?: LongId;
}

export interface UpdateStoreParentRequest {
  parentId: LongId;
}

// ---- 8. 风格管理 /api/admin/styles ----

/** 风格（企业管理域文档 §2.8）：列表=本租户自建 + 平台内置（tenantId 为空）且 status=1，按 sortNo,id 升序；创作页风格数据源即此 */
export interface StyleOption {
  id: LongId;
  /** 平台内置为 null */
  tenantId?: LongId | null;
  /** 关联行业包（平台风格场景），租户自建一般传 null */
  packageId?: LongId | null;
  name: string;
  description?: string | null;
  exampleUrl?: string | null;
  sortNo?: number;
  status?: 0 | 1;
  version?: number;
  createdAt?: string;
  updatedAt?: string;
}

/** POST /api/admin/styles 创建风格（仅 HQ_ADMIN） */
export interface CreateStyleRequest {
  name: string;
  description?: string;
  exampleUrl?: string;
  sortNo?: number;
  packageId?: LongId | null;
}

/** PUT /api/admin/styles/{id} 更新风格（仅 HQ_ADMIN；name 必填，不存在报 1002） */
export interface UpdateStyleRequest {
  name: string;
  description?: string;
  exampleUrl?: string;
  sortNo?: number;
}
