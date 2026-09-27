import type { LongId, PageResult, PlatformRole, RequestAdapter, RequestOptions } from './types';

// ===== 额度计费域 · 类型定义（《额度计费域 & 资产配置域·前端接口文档》§2 对齐） =====

/** 流水业务类型（文档 §2.1 枚举，筛选流水时用） */
export type QuotaFlowBizType = 'CREDIT' | 'ALLOCATE_OUT' | 'ALLOCATE_IN' | 'CONSUME' | 'REFUND' | 'RECALL';

/** 收款单状态机：PENDING → SETTLED（确认）/ PENDING → CANCELED（撤销）（文档 §2.3.5） */
export type PaymentStatus = 'PENDING' | 'SETTLED' | 'CANCELED';

/** 额度账户级别：TENANT 租户池 / STORE 门店账户 / STAFF 员工账户（三级账户，员工额度文档 §1.1） */
export type QuotaAccountLevel = 'TENANT' | 'STORE' | 'STAFF';

/** 额度账户（QuotaAccount，文档 §2.4.1），余额为整数（积分/点数） */
export interface QuotaAccount {
  id: LongId;
  tenantId: LongId;
  level: QuotaAccountLevel;
  /** 池=租户 ID；门店=门店 ID；员工=成员关系 ID（user_org_role.id，一人多店各有账户） */
  ownerId: LongId;
  balance: number;
  /** 乐观锁版本（前端忽略） */
  version?: number;
  createdAt?: string;
  updatedAt?: string;
}

/** 额度流水（QuotaFlow，文档 §2.4.4）：amount 正=入账，负=出账；流水只增不改 */
export interface QuotaFlow {
  id: LongId;
  tenantId: LongId;
  accountId: LongId;
  bizType: QuotaFlowBizType;
  /** 业务标识（如 gen:{workId}、refund:{taskId}、pay:{orderId}） */
  bizId?: string;
  idempotentKey?: string;
  amount: number;
  balanceAfter?: number;
  remark?: string | null;
  createdAt?: string;
}

/** GET /api/admin/quota/account/{accountId}/flows 查询参数（文档 §2.4.4，from/to 为 ISO yyyy-MM-ddTHH:mm:ss） */
export interface QuotaFlowQuery {
  bizType?: QuotaFlowBizType | '';
  from?: string;
  to?: string;
  pageNo?: number;
  /** 默认 20，上限 200（超出自动截断） */
  pageSize?: number;
}

/** POST /api/admin/quota/credit 充值请求（文档 §2.4.1，bizId 幂等键 ≤64 字符） */
export interface QuotaCreditRequest {
  accountId: LongId;
  /** 充值额度（≥1） */
  amount: number;
  bizId?: string;
  remark?: string;
}

/** POST /api/admin/quota/allocate 池→门店下发（文档 §2.4.2，实际落库为 {bizId}:out / {bizId}:in 两条） */
export interface QuotaAllocateRequest {
  storeId: LongId;
  /** 下发额度（≥1） */
  amount: number;
  bizId?: string;
  remark?: string;
}

/**
 * POST /api/quota/staff/allocate 与 /api/quota/staff/recall 请求体
 * （店长划拨/回收员工额度，员工额度文档 §1.3；划拨一条事务双流水：门店 ALLOCATE_OUT / 员工 ALLOCATE_IN，回收为 RECALL 双流水）。
 * bizId 幂等键 ≤64 字符：相同 bizId 重复提交且金额一致时幂等返回成功；未传后端自动生成随机键（网络重试仍可能重复划拨），前端务必 UUID 生成。
 */
export interface StaffQuotaTransferRequest {
  /** 成员关系 ID（成员列表 GET /api/admin/members 的 userOrgRoleId 字段） */
  memberRoleId: LongId;
  /** 划拨/回收额度（≥1）；划拨不能超门店池余额，回收不能超员工当前余额 */
  amount: number;
  bizId?: string;
  remark?: string;
}

/** 平台收款单（PaymentOrder，文档 §2.3.5） */
export interface PaymentOrder {
  id: LongId;
  tenantId: LongId;
  orderNo: string;
  amount: number;
  /** 收款渠道（如 BANK / WECHAT） */
  channel?: string;
  status: PaymentStatus;
  voucherUrl?: string | null;
  invoiceNo?: string | null;
  /** 复核人（平台用户 ID） */
  confirmBy?: LongId | null;
  confirmedAt?: string | null;
  paidAt?: string | null;
  callbackPayload?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * GET /platform/payment/list（文档未收录的列表接口，做尽力兼容）：
 * 后端若未提供，平台收款页回退展示"本次会话登记的收款单"。
 */
export interface PaymentListQuery {
  status?: PaymentStatus | '';
  pageNo?: number;
  pageSize?: number;
}

/** POST /platform/payment/register 登记收款单（文档 §2.3.2，orderNo 重复时幂等返回已有单） */
export interface PaymentRegisterRequest {
  tenantId: LongId;
  /** 金额（≥1 的整数） */
  amount: number;
  /** 收款渠道（如 BANK / WECHAT，前端自定义字符串） */
  channel: string;
  /** 外部单号；不传自动生成 PAY-{uuid} */
  orderNo?: string;
  voucherUrl?: string;
  invoiceNo?: string;
}

/** POST /platform/payment/{id}/confirm 确认收款请求体（可选，文档 §2.3.3） */
export interface PaymentConfirmRequest {
  invoiceNo?: string;
}

/** POST /platform/auth/login 平台账号登录（文档 §2.3.1，credential 为密码明文提交，服务端 SHA-256 比对） */
export interface PlatformLoginRequest {
  loginName: string;
  credential: string;
}

export interface PlatformLoginResult {
  token: string;
  platformUserId: LongId;
  /** PLATFORM_OPS 平台运营 / PLATFORM_FINANCE 平台财务（复用 types.ts 的 PlatformRole） */
  role: PlatformRole;
}

/** GET /api/quota/my 我的额度（三级账户改造后，员工额度文档 §1.3）：STAFF→自己的员工账户（老数据无员工账户时回退门店账户），OWNER→门店账户，HQ_ADMIN/REGION_ADMIN/VIEWER→租户池；响应结构不变 */
export interface MyQuota {
  account: QuotaAccount;
  /** 固定返回最近 10 条流水（不分页参数） */
  recentFlows?: QuotaFlow[];
}

function buildQuery<T extends object>(params: T = {} as T) {
  const pairs = Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '');
  return pairs.length ? `?${pairs.map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`).join('&')}` : '';
}

/**
 * 额度计费域接口封装（admin 和 miniapp 各自传入请求适配器做薄封装）。
 * 路径均不含 /api 前缀（由各端 baseURL 拼接）；平台端接口以 /platform 开头。
 */
export function createQuotaApi(adapter: RequestAdapter) {
  const request = <T>(url: string, options?: RequestOptions) => adapter.request<T>(url, options);

  return {
    // —— 平台端 ——
    /** POST /platform/auth/login 平台账号登录（匿名；失败返回 2001） */
    platformLogin: (data: PlatformLoginRequest) => request<PlatformLoginResult>('/platform/auth/login', { method: 'POST', data }),
    /** GET /platform/payment/list 收款单分页（非文档接口，尽力兼容） */
    getPlatformPayments: (params: PaymentListQuery = {}) => request<PageResult<PaymentOrder>>('/platform/payment/list', { data: params }),
    /** POST /platform/payment/register 登记收款单（PLATFORM_FINANCE，新建单 status=PENDING） */
    registerPayment: (data: PaymentRegisterRequest) => request<PaymentOrder>('/platform/payment/register', { method: 'POST', data }),
    /** POST /platform/payment/{id}/confirm 确认收款并同事务给租户额度池充值（幂等键 pay:{orderId}；body 可选） */
    confirmPayment: (paymentId: LongId, data?: PaymentConfirmRequest) => request<PaymentOrder>(`/platform/payment/${paymentId}/confirm`, { method: 'POST', ...(data && Object.keys(data).length ? { data } : {}) }),
    /** POST /platform/payment/{id}/cancel 撤销收款单（仅 PENDING 可撤销，不产生任何额度变动） */
    cancelPayment: (paymentId: LongId) => request<PaymentOrder>(`/platform/payment/${paymentId}/cancel`, { method: 'POST' }),

    // —— 企业管理端（充值/下发仅 HQ_ADMIN；查询类含 REGION_ADMIN / VIEWER） ——
    /** POST /api/admin/quota/credit 账户充值（租户池或门店账户均可，须属于本租户；返回充值后账户） */
    creditQuota: (data: QuotaCreditRequest) => request<QuotaAccount>('/admin/quota/credit', { method: 'POST', data }),
    /** POST /api/admin/quota/allocate 池→门店下发（成功 data:null；租户池不足 3001；门店账户不存在自动创建） */
    allocateQuota: (data: QuotaAllocateRequest) => request<void>('/admin/quota/allocate', { method: 'POST', data }),
    /** GET /api/admin/quota/store/{storeId} 查门店账户余额（门店账户不存在会自动创建，余额 0） */
    getStoreQuotaAccount: (storeId: LongId) => request<QuotaAccount>(`/admin/quota/store/${storeId}`),
    /** GET /api/admin/quota/account/{accountId}/flows 账户流水分页 */
    getQuotaFlows: (accountId: LongId, params: QuotaFlowQuery = {}) => request<PageResult<QuotaFlow>>(`/admin/quota/account/${accountId}/flows${buildQuery(params)}`),

    // —— 员工三级账户（店长 OWNER 专用，员工额度文档 §1.3；AI 生成/对话出稿扣员工账户，余额不足报 3001「请联系店长划拨」） ——
    /** POST /api/quota/staff/allocate 店长向员工划拨（成功 data:null；错误：2003 非 OWNER / 1001 员工无效 / 3001 门店池不足 / 1003 幂等键冲突） */
    staffAllocate: (data: StaffQuotaTransferRequest) => request<void>('/quota/staff/allocate', { method: 'POST', data }),
    /** POST /api/quota/staff/recall 店长回收员工未用额度（成功 data:null；员工余额不足 3001） */
    staffRecall: (data: StaffQuotaTransferRequest) => request<void>('/quota/staff/recall', { method: 'POST', data }),

    // —— 门店端 / 个人（任意已登录企业账号；平台账号返回 2003） ——
    /** GET /api/quota/my 我的额度：OWNER/STAFF→本店账户，HQ_ADMIN/REGION_ADMIN/VIEWER→租户池；recentFlows 固定最近 10 条 */
    getMyQuota: () => request<MyQuota>('/quota/my'),
  };
}

export type QuotaApiClient = ReturnType<typeof createQuotaApi>;
