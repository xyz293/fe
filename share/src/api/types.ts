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

export type AsyncTaskStatus = 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED';

export interface AsyncTask {
  taskId: string;
  status: AsyncTaskStatus;
  progress?: number;
  result?: { workId: string };
  errorMessage?: string;
}

export interface ChatResult {
  versions: string[];
}

export interface GenerateResult {
  taskId?: LongId;
  workId?: LongId;
}

export type AIGenerationType = 'IMAGE' | 'VIDEO';

export interface CreationStyleOption {
  id: LongId;
  name: string;
  code?: string;
  description?: string;
  /** 热门风格（创作页🔥角标） */
  hot?: number | boolean;
}

export interface CreationPlatformOption {
  value: string;
  label: string;
}

export interface CreationConfig {
  styles: CreationStyleOption[];
  platforms: CreationPlatformOption[];
  imagePrice: number;
  videoPrice: number;
  quota: Quota;
  auditRequired: boolean;
  refAssetLimit?: number;
}

export interface GenerateWorkRequest {
  type: AIGenerationType;
  styleId: LongId;
  platform: string;
  userInput: string;
  /** 产品名（创作页独立输入，可与描述拼接） */
  productName?: string;
  refAssetIds: LongId[];
}

export type WorkGenerationStatus = 0 | 1 | 2 | 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED';

export interface WorkStatusResponse {
  taskId?: LongId;
  workId?: LongId;
  status: WorkGenerationStatus;
  type?: AIGenerationType;
  contentUrl?: string;
  coverUrl?: string;
  errorCode?: string;
  errorMessage?: string;
  consumedQuota?: number;
  remainingQuota?: number;
  progress?: number;
}

export interface PromptTemplate {
  id: LongId;
  scene: AIGenerationType;
  version: number;
  content: string;
  status: 'ACTIVE' | 'INACTIVE' | 0 | 1;
  createdAt?: string;
  updatedAt?: string;
}

export interface PromptTemplateQuery {
  pageNo?: number;
  pageSize?: number;
  scene?: AIGenerationType;
  status?: 'ACTIVE' | 'INACTIVE' | 0 | 1;
}

export interface PromptTemplateRequest {
  scene: AIGenerationType;
  content: string;
}

export interface GenerationTaskMonitor {
  id: LongId;
  taskId?: LongId;
  workId?: LongId;
  type: AIGenerationType;
  storeName?: string;
  userName?: string;
  styleName?: string;
  platform?: string;
  userInput?: string;
  duration?: number;
  status: WorkGenerationStatus;
  errorCode?: string;
  errorMessage?: string;
  createdAt?: string;
}

export interface GenerationTaskQuery {
  pageNo?: number;
  pageSize?: number;
  type?: AIGenerationType;
  status?: WorkGenerationStatus;
  startDate?: string;
  endDate?: string;
}

/** 发布状态（对齐后端 publish_status，《创作与作品域-后端方案》） */
export type PublishStatus = 'NONE' | 'DRAFT' | 'PENDING_AUDIT' | 'APPROVED' | 'REJECTED' | 'PUBLISHED';

export interface Work {
  id: string;
  title: string;
  coverUrl?: string;
  contentUrl?: string;
  type: 'COPY' | 'IMAGE' | 'VIDEO';
  /** publish_status：数字或新旧字符串枚举，前端用 normalizePublishStatus 归一化后查 PUBLISH_STATUS */
  status: 0 | 1 | 2 | 3 | 4 | 5 | 'DRAFT' | 'PENDING_REVIEW' | 'READY' | 'REJECTED' | PublishStatus;
  summary?: string;
  /** 配套文案（发布复制/编辑用，等价于后端 caption） */
  caption?: string;
  /** 目标发布平台 */
  platform?: string;
  /** 最近一条 REJECT 的审核意见 */
  rejectOpinion?: string;
  rejectReason?: string;
  failureReason?: string;
}

// ---- 创作与作品域 · 内容审核 /api/admin/audit/works ----

export interface AuditWorkItem {
  id: LongId;
  title?: string;
  coverUrl?: string;
  contentUrl?: string;
  type?: 'COPY' | 'IMAGE' | 'VIDEO';
  /** 待审文案 */
  caption?: string;
  summary?: string;
  submitterName?: string;
  storeName?: string;
  submittedAt?: string;
  status?: PublishStatus | string;
}

export interface AuditWorkQuery {
  status?: string;
  pageNo?: number;
  pageSize?: number;
}

export interface RejectWorkRequest {
  /** 驳回意见（必填，字数上限 200） */
  opinion: string;
}

// ---- 创作与作品域 · 素材 /api/assets ----

export interface AssetItem {
  id: LongId;
  url?: string;
  coverUrl?: string;
  title?: string;
  /** 品牌图库 / 本店图库 */
  scope?: 'BRAND' | 'STORE' | string;
  createdAt?: string;
}

export interface AssetQuery {
  scope?: 'BRAND' | 'STORE' | string;
  pageNo?: number;
  pageSize?: number;
}

export interface AssetUploadResult {
  id: LongId;
  url: string;
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
export type PlatformRechargeStatus = 'PENDING' | 'CONFIRMED' | 'VOIDED' | 0 | 1 | 2;

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

export interface PlatformRechargeOrder {
  id: LongId;
  orderNo: string;
  tenantId: LongId;
  tenantName: string;
  amount: number;
  proofUrl?: string;
  status: PlatformRechargeStatus;
  submitterName?: string;
  submittedAt?: string;
  confirmedAt?: string;
  voidReason?: string;
  currentBalance?: number;
  balanceAfter?: number;
}

export interface PlatformRechargeListQuery {
  pageNo?: number;
  pageSize?: number;
  status?: PlatformRechargeStatus;
  keyword?: string;
}

export interface PlatformRechargeConfirmRequest {
  rechargeId: LongId;
}

export interface PlatformRechargeVoidRequest {
  rechargeId: LongId;
  reason: string;
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

export interface DashboardOverview {
  tenantCount?: number;
  activeTenantCount?: number;
  storeCount?: number;
  memberCount?: number;
  workCount?: number;
  publishedWorkCount?: number;
  assetCount?: number;
  pendingAssetCount?: number;
  quotaUsed?: number;
  quotaTotal?: number;
}

export interface DashboardTrendPoint {
  date: string;
  workCount?: number;
  publishCount?: number;
  activeMemberCount?: number;
  quotaUsed?: number;
}

// ---- 2. 素材管理 /api/admin/assets ----

export interface AssetAdminItem {
  id: LongId;
  tenantId?: LongId;
  orgId?: LongId;
  orgName?: string;
  title?: string;
  type?: string;
  url?: string;
  coverUrl?: string;
  uploaderName?: string;
  reviewStatus?: string;
  reviewReason?: string;
  tags?: string[];
  createdAt?: string;
  reviewedAt?: string;
}

export interface ReviewAssetRequest {
  approved: boolean;
  reason?: string;
}

// ---- 3. 合规管理 /api/admin/compliance ----

export interface ComplianceWord {
  id: LongId;
  word: string;
  level?: string;
  category?: string;
  replacement?: string;
  enabled?: number | boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface UpsertComplianceWordRequest {
  id?: LongId;
  word: string;
  level?: string;
  category?: string;
  replacement?: string;
}

export interface AuditConfig {
  orgId: LongId;
  autoReview?: boolean;
  sensitiveFilter?: boolean;
  proofRequired?: boolean;
  updatedAt?: string;
}

export interface UpdateAuditConfigRequest {
  autoReview?: boolean;
  sensitiveFilter?: boolean;
  proofRequired?: boolean;
}

// ---- 4. 内容包管理 /api/admin/content-packages ----

export interface ContentPackage {
  id: LongId;
  name: string;
  description?: string;
  scene?: string;
  assetCount?: number;
  status?: number | string;
  startAt?: string;
  endAt?: string;
  createdAt?: string;
}

export interface CreateContentPackageRequest {
  name: string;
  description?: string;
  scene?: string;
  assetIds?: LongId[];
  startAt?: string;
  endAt?: string;
}

// ---- 5. 导出任务 /api/admin/exports ----

export interface CreateExportRequest {
  type: string;
  dateFrom?: string;
  dateTo?: string;
  orgId?: LongId;
}

export interface ExportTask {
  id: LongId;
  type?: string;
  status?: string;
  fileUrl?: string;
  rowCount?: number;
  createdAt?: string;
  finishedAt?: string;
}

// ---- 6. 会员管理 /api/admin/members（对应租户模块 UserAccount 模型） ----

export interface UserAccount {
  id: LongId;
  phone?: string;
  openid?: string;
  nickname?: string;
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

export interface StoreAccountSummary {
  storeId: LongId;
  storeName: string;
  parentId?: LongId;
  parentName?: string;
  memberCount?: number;
  workCount?: number;
  status?: number;
  createdAt?: string;
}

export interface CreateStoreRequest {
  name: string;
  parentId?: LongId;
  address?: string;
  contactPhone?: string;
}

export interface UpdateStoreParentRequest {
  parentId: LongId;
}

// ---- 8. 风格管理 /api/admin/styles ----

export interface StyleOption {
  id: LongId;
  name: string;
  description?: string;
  prompt?: string;
  enabled?: number | boolean;
  sortOrder?: number;
}

export interface CreateStyleRequest {
  name: string;
  description?: string;
  prompt?: string;
  sortOrder?: number;
}

export interface UpdateStyleRequest {
  name?: string;
  description?: string;
  prompt?: string;
  sortOrder?: number;
}
