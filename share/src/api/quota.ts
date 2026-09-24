import type { LongId, PageResult, RequestAdapter, RequestOptions } from './types';

// ===== 额度计费域 · 类型定义（与《额度计费域-后端方案》字段对齐） =====

/** 流水业务类型 */
export type QuotaFlowBizType = 'CREDIT' | 'ALLOCATE_OUT' | 'ALLOCATE_IN' | 'CONSUME' | 'REFUND' | 'RECALL';

/** 收款单状态 */
export type PaymentStatus = 'PENDING' | 'SETTLED' | 'CANCELED';

/** 额度账户（总池 / 门店 / 个人），单位统一为"额度" */
export interface QuotaAccount {
  accountId: LongId;
  name?: string;
  /** 1=品牌总池 2=门店 3=个人 */
  level?: 1 | 2 | 3;
  balance: number;
  total?: number;
  used?: number;
  weekConsumed?: number;
  weekRecharged?: number;
}

/** 额度流水：amount 正数入账、负数出账 */
export interface QuotaFlow {
  id: LongId;
  accountId: LongId;
  bizType: QuotaFlowBizType;
  amount: number;
  balanceAfter?: number;
  /** 关联单号（充值单 / 分配单 / 作品任务等） */
  refNo?: string | null;
  remark?: string | null;
  createdAt?: string;
}

export interface QuotaFlowQuery {
  bizType?: QuotaFlowBizType | '';
  startTime?: string;
  endTime?: string;
  pageNo?: number;
  pageSize?: number;
}

/** POST /api/admin/quota/allocate 分配请求，idemKey 用于后端幂等兜底 */
export interface QuotaAllocateRequest {
  storeId: LongId;
  amount: number;
  idemKey: string;
}

export interface QuotaTrendPoint {
  date: string;
  value: number;
}

/** 平台收款单 */
export interface PaymentOrder {
  id: LongId;
  orderNo: string;
  tenantId: LongId;
  tenantName: string;
  /** 对公收款金额（元） */
  amount: number;
  proofUrl?: string | null;
  invoiceNo?: string | null;
  status: PaymentStatus;
  submitterName?: string | null;
  createdAt?: string;
  settledAt?: string | null;
}

export interface PaymentListQuery {
  status?: PaymentStatus | '';
  pageNo?: number;
  pageSize?: number;
}

export interface PaymentRegisterRequest {
  tenantId: LongId;
  amount: number;
  proofUrl?: string;
  invoiceNo?: string;
}

/** GET /api/quota/my 小程序端：余额 + 近 10 条流水 */
export interface MyQuota {
  balance: number;
  total?: number;
  used?: number;
  recentFlows?: QuotaFlow[];
}

function buildQuery<T extends object>(params: T = {} as T) {
  const pairs = Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '');
  return pairs.length ? `?${pairs.map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`).join('&')}` : '';
}

/**
 * 额度计费域接口封装：admin 和 miniapp 各自传入请求适配器做薄封装。
 * 路径均不含 /api 前缀（由各端 baseURL 拼接）。
 */
export function createQuotaApi(adapter: RequestAdapter) {
  const request = <T>(url: string, options?: RequestOptions) => adapter.request<T>(url, options);

  return {
    // —— 管理端（HQ_ADMIN） ——
    /** 总池账户详情（余额 + 本周消耗/充值汇总） */
    getPoolAccount: () => request<QuotaAccount>('/admin/quota/pool'),
    /** 按账户 ID 查询账户详情（门店抽屉复用；总池 accountId 由 getPoolAccount 返回） */
    getQuotaAccount: (accountId: LongId) => request<QuotaAccount>(`/admin/quota/store/${accountId}`),
    /** 近 N 天消耗趋势 */
    getPoolTrend: (days = 7) => request<QuotaTrendPoint[]>(`/admin/quota/pool/trend${buildQuery({ days })}`),
    /** 账户流水分页 */
    getQuotaFlows: (accountId: LongId, params: QuotaFlowQuery = {}) => request<PageResult<QuotaFlow>>(`/admin/quota/account/${accountId}/flows${buildQuery(params)}`),
    /** 分配额度到门店（idemKey 幂等，超时可同 key 重试） */
    allocateQuota: (data: QuotaAllocateRequest) => request<void>('/admin/quota/allocate', { method: 'POST', data }),

    // —— 超级后台（platform） ——
    getPlatformPayments: (params: PaymentListQuery = {}) => request<PageResult<PaymentOrder>>('/platform/payment/list', { data: params }),
    registerPayment: (data: PaymentRegisterRequest) => request<PaymentOrder>('/platform/payment', { method: 'POST', data }),
    /** 确认入池（后端幂等键 pay:{orderId}，前端重复点击安全） */
    confirmPayment: (paymentId: LongId) => request<void>(`/platform/payment/${paymentId}/confirm`, { method: 'POST' }),
    voidPayment: (paymentId: LongId) => request<void>(`/platform/payment/${paymentId}/void`, { method: 'POST' }),

    // —— 小程序端 ——
    getMyQuota: () => request<MyQuota>('/quota/my'),
    getMyQuotaFlows: (params: QuotaFlowQuery = {}) => request<PageResult<QuotaFlow>>(`/quota/my/flows${buildQuery(params)}`),
  };
}

export type QuotaApiClient = ReturnType<typeof createQuotaApi>;
