/**
 * 额度计费域 · 常量（小程序端本地镜像）。
 *
 * 权威来源：share/src/constants/quota.ts（admin 端直接引用 share 包）。
 * 小程序 weapp 构建链不编译 @xiaoa/share 的运行时代码（仅类型导入可被剥离），
 * 故此处镜像一份，两边字段与文案必须保持一致；个人版上线时改 TIP 文案需同步两处。
 */
export type QuotaFlowBizType = 'CREDIT' | 'ALLOCATE_OUT' | 'ALLOCATE_IN' | 'CONSUME' | 'REFUND' | 'RECALL';

export interface EnumMeta {
  label: string;
  color: string;
}

/** 额度流水类型映射（与 share/src/constants/quota.ts 保持一致） */
export const FLOW_TYPE_MAP: Record<QuotaFlowBizType, EnumMeta> = {
  CREDIT: { label: '充值', color: 'green' },
  ALLOCATE_OUT: { label: '分配出', color: 'orange' },
  ALLOCATE_IN: { label: '分配入', color: 'blue' },
  CONSUME: { label: '消耗', color: 'red' },
  REFUND: { label: '退款', color: 'green' },
  RECALL: { label: '回收', color: 'orange' },
};

/** 额度金额格式化：千分位 + 可选符号；单位统一"额度"，不出现"元" */
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
