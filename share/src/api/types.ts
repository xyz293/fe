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

export interface Work {
  id: string;
  title: string;
  coverUrl?: string;
  contentUrl?: string;
  type: 'COPY' | 'IMAGE' | 'VIDEO';
  status: 0 | 1 | 2 | 3 | 4 | 5 | 'DRAFT' | 'PENDING_REVIEW' | 'READY' | 'REJECTED';
  summary?: string;
  rejectReason?: string;
  failureReason?: string;
}

export interface PublishRecord {
  workId: LongId;
  taskId?: LongId;
  platform: string;
  proofUrl?: string;
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
