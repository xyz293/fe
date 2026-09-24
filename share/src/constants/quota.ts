import type { PaymentStatus, QuotaFlowBizType } from '../api/quota';

export interface EnumMeta {
  label: string;
  /** antd Tag 色值；小程序端可作为色调参考（default 表示无色/灰色） */
  color: string;
}

/** 额度流水类型映射（三端共用，防枚举散落） */
export const FLOW_TYPE_MAP: Record<QuotaFlowBizType, EnumMeta> = {
  CREDIT: { label: '充值', color: 'green' },
  ALLOCATE_OUT: { label: '分配出', color: 'orange' },
  ALLOCATE_IN: { label: '分配入', color: 'blue' },
  CONSUME: { label: '消耗', color: 'red' },
  REFUND: { label: '退款', color: 'green' },
  RECALL: { label: '回收', color: 'orange' },
};

/** 平台收款单状态映射 */
export const PAYMENT_STATUS_MAP: Record<PaymentStatus, EnumMeta> = {
  PENDING: { label: '待入池', color: 'gold' },
  SETTLED: { label: '已入池', color: 'green' },
  CANCELED: { label: '已撤销', color: 'default' },
};

/**
 * 额度金额格式化：千分位 + 可选符号。
 * 单位统一为"额度"，由调用方按需拼接，禁止出现"元"。
 */
export function formatQuota(value: number | null | undefined, options: { signed?: boolean } = {}) {
  const amount = Number(value || 0);
  const text = Math.abs(amount).toLocaleString('zh-CN', { maximumFractionDigits: 2 });
  if (!options.signed) return amount < 0 ? `-${text}` : text;
  const sign = amount > 0 ? '+' : amount < 0 ? '-' : '';
  return `${sign}${text}`;
}

/** 变动金额展示色调：正数绿、负数红 */
export function quotaAmountTone(value: number | null | undefined): 'green' | 'red' | 'default' {
  const amount = Number(value || 0);
  if (amount > 0) return 'green';
  if (amount < 0) return 'red';
  return 'default';
}

/** 后端"额度不足"业务错误码（readme §11：3001） */
export const QUOTA_INSUFFICIENT_CODE = 3001;

/** 额度不足提示文案（企业版固定"联系总部"；个人版上线后改"联系老板充值"） */
export const QUOTA_INSUFFICIENT_TIP = '额度不足，请联系总部充值';
