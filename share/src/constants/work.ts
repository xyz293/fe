/**
 * 创作与作品域 · 发布状态常量（《创作与作品域-后端方案》）。
 *
 * PUBLISH_STATUS 映射表决定小程序详情页状态条、按钮显隐、驳回意见展示，
 * 也供管理端审核/作品列表 Tag 共用；前端永不本地判定能不能发，全信后端状态。
 */

export type PublishStatusKey = 'NONE' | 'DRAFT' | 'PENDING_AUDIT' | 'APPROVED' | 'REJECTED' | 'PUBLISHED';

export interface PublishStatusMeta {
  /** 状态条 / Tag 文案 */
  label: string;
  /** 是否允许进入发布流（前端仅用于按钮显隐，后端双保险） */
  publishable: boolean;
  /** 驳回态：展示审核意见 + 改稿重提入口 */
  showOpinion?: boolean;
  /** 管理端 antd Tag 颜色 */
  tagColor?: string;
  /** 小程序状态条色调（映射到既有 status-* 样式类） */
  tone?: 'blue' | 'gold' | 'green' | 'red' | 'gray';
}

export const PUBLISH_STATUS: Record<PublishStatusKey, PublishStatusMeta> = {
  NONE: { label: '生成中', publishable: false, tagColor: 'default', tone: 'blue' },
  DRAFT: { label: '待发布', publishable: true, tagColor: 'gold', tone: 'gold' },
  PENDING_AUDIT: { label: '审核中', publishable: false, tagColor: 'blue', tone: 'blue' },
  APPROVED: { label: '可发布', publishable: true, tagColor: 'green', tone: 'green' },
  REJECTED: { label: '已驳回', publishable: false, showOpinion: true, tagColor: 'red', tone: 'red' },
  PUBLISHED: { label: '已发布', publishable: false, tagColor: 'cyan', tone: 'green' },
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

/** 供小程序等场景复用的纯函数：取状态元信息（无法识别时回 DRAFT） */
export function getPublishStatusMeta(value: unknown): PublishStatusMeta {
  return PUBLISH_STATUS[normalizePublishStatus(value)];
}
