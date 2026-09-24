/**
 * 创作与作品域 · 发布状态常量（小程序端本地镜像）。
 *
 * 权威来源：share/src/constants/work.ts（admin 端直接引用 share 包）。
 * 小程序 weapp 构建链不编译 @xiaoa/share 的运行时代码（仅类型导入可被剥离），
 * 故此处镜像一份；PUBLISH_STATUS 映射表决定详情页状态条、按钮显隐、驳回意见展示，
 * 两边字段与文案必须保持一致。
 */

export type PublishStatusKey = 'NONE' | 'DRAFT' | 'PENDING_AUDIT' | 'APPROVED' | 'REJECTED' | 'PUBLISHED';

export interface PublishStatusMeta {
  /** 状态条文案 */
  label: string;
  /** 是否允许进入发布流（前端仅用于按钮显隐，后端双保险） */
  publishable: boolean;
  /** 驳回态：展示审核意见 + 改稿重提入口 */
  showOpinion?: boolean;
  /** 状态条色调（映射到既有 status-* 样式类） */
  tone?: 'blue' | 'gold' | 'green' | 'red' | 'gray';
}

export const PUBLISH_STATUS: Record<PublishStatusKey, PublishStatusMeta> = {
  NONE: { label: '生成中', publishable: false, tone: 'blue' },
  DRAFT: { label: '待发布', publishable: true, tone: 'gold' },
  PENDING_AUDIT: { label: '审核中', publishable: false, tone: 'blue' },
  APPROVED: { label: '可发布', publishable: true, tone: 'green' },
  REJECTED: { label: '已驳回', publishable: false, showOpinion: true, tone: 'red' },
  PUBLISHED: { label: '已发布', publishable: false, tone: 'green' },
};

/** 旧枚举别名（历史接口可能返回 PENDING_REVIEW / READY） */
const LEGACY_STATUS_MAP: Record<string, PublishStatusKey> = {
  PENDING_REVIEW: 'PENDING_AUDIT',
  READY: 'APPROVED',
};

const STATUS_ORDER: PublishStatusKey[] = ['NONE', 'DRAFT', 'PENDING_AUDIT', 'APPROVED', 'REJECTED', 'PUBLISHED'];

/**
 * 把后端返回的 publish_status（数字 0-5 或新旧字符串）归一化为 PUBLISH_STATUS key。
 * 数字按 NONE→PUBLISHED 顺序对齐后端枚举；无法识别时按 DRAFT 兜底（可编辑、可发布，不阻塞用户）。
 */
export function normalizePublishStatus(value: unknown): PublishStatusKey {
  if (typeof value === 'number' && Number.isInteger(value) && value >= 0 && value < STATUS_ORDER.length) {
    return STATUS_ORDER[value];
  }
  if (typeof value === 'string') {
    const upper = value.toUpperCase();
    if (upper in PUBLISH_STATUS) return upper as PublishStatusKey;
    if (upper in LEGACY_STATUS_MAP) return LEGACY_STATUS_MAP[upper];
  }
  return 'DRAFT';
}

/** 取状态元信息（无法识别时回 DRAFT） */
export function getPublishStatusMeta(value: unknown): PublishStatusMeta {
  return PUBLISH_STATUS[normalizePublishStatus(value)];
}

/** 状态色调 → 既有样式类（app.scss 的 status-ready/review/reject/draft） */
export function statusToneClass(tone: PublishStatusMeta['tone']): string {
  switch (tone) {
    case 'green':
      return 'status-ready';
    case 'red':
      return 'status-reject';
    case 'blue':
      return 'status-review';
    default:
      return 'status-draft';
  }
}

/** caption 可编辑状态：DRAFT / APPROVED / REJECTED（驳回态编辑即改稿重提） */
export function isCaptionEditable(statusKey: PublishStatusKey): boolean {
  return statusKey === 'DRAFT' || statusKey === 'APPROVED' || statusKey === 'REJECTED';
}
