/**
 * 资产配置域 · 常量（《资产配置域-后端方案》）。
 * 素材中心三 Tab、推优审核 Tag、营销日历标记共用，所有状态展示走这份枚举。
 */

export type AssetScopeKey = 'PLATFORM' | 'BRAND' | 'STORE';
export type AssetStatusKey = 'APPROVED' | 'PENDING_REVIEW' | 'REJECTED' | 'DELETED';
export type PackageStatusKey = 'ACTIVE' | 'DISPATCHED' | 'CANCELED';

/** 素材可见性文案（Tab 名与 Tag 共用） */
export const ASSET_SCOPE: Record<AssetScopeKey, string> = {
  PLATFORM: '行业资产包',
  BRAND: '品牌素材',
  STORE: '本店素材',
};

export const ASSET_STATUS: Record<AssetStatusKey, string> = {
  APPROVED: '可用',
  PENDING_REVIEW: '推优待审',
  REJECTED: '已驳回',
  DELETED: '已删除',
};

export const ASSET_STATUS_COLOR: Record<AssetStatusKey, string> = {
  APPROVED: 'green',
  PENDING_REVIEW: 'gold',
  REJECTED: 'red',
  DELETED: 'default',
};

/** 内容包状态文案（文档 §3.5.2）：1 ACTIVE 待下发（蓝）、2 DISPATCHED 已下发（绿）、3 CANCELED 已撤销（不展示标记） */
export const PACKAGE_STATUS: Record<PackageStatusKey, string> = {
  ACTIVE: '待下发',
  DISPATCHED: '已下发',
  CANCELED: '已撤销',
};

export const PACKAGE_STATUS_COLOR: Record<PackageStatusKey, string> = {
  ACTIVE: 'blue',
  DISPATCHED: 'green',
  CANCELED: 'default',
};

/** 上传预检：类型白名单与大小上限（图片 ≤10M，视频 ≤100M） */
export const ASSET_ACCEPT = '.jpg,.jpeg,.png,.mp4,.mov';
export const ASSET_IMAGE_MAX_SIZE = 10 * 1024 * 1024;
export const ASSET_VIDEO_MAX_SIZE = 100 * 1024 * 1024;
export const ASSET_IMAGE_TYPES = ['image/jpeg', 'image/png'];
export const ASSET_VIDEO_TYPES = ['video/mp4', 'video/quicktime'];

/** 上传预检：返回错误文案（null 表示通过） */
export function checkAssetFile(file: { name: string; size: number; type?: string }): string | null {
  const type = file.type || '';
  const isImage = ASSET_IMAGE_TYPES.includes(type) || /\.(jpe?g|png)$/i.test(file.name);
  const isVideo = ASSET_VIDEO_TYPES.includes(type) || /\.(mp4|mov)$/i.test(file.name);
  if (!isImage && !isVideo) return '仅支持 jpg / png / mp4 格式';
  if (isImage && file.size > ASSET_IMAGE_MAX_SIZE) return '图片不能超过 10M';
  if (isVideo && file.size > ASSET_VIDEO_MAX_SIZE) return '视频不能超过 100M';
  return null;
}

/** 内容包状态归一化：数字/字符串 → ACTIVE / DISPATCHED / CANCELED（文档 §3.5.2 状态机） */
export function normalizePackageStatus(value: unknown): PackageStatusKey {
  if (typeof value === 'number') {
    if (value === 1) return 'ACTIVE';
    if (value === 2) return 'DISPATCHED';
    if (value === 3) return 'CANCELED';
  }
  if (typeof value === 'string') {
    const upper = value.toUpperCase();
    if (upper === '1' || upper === 'ACTIVE') return 'ACTIVE';
    if (upper === '2' || upper === 'DISPATCHED' || upper === 'EXPIRED') return 'DISPATCHED';
    if (upper === '3' || upper === 'CANCELED') return 'CANCELED';
  }
  return 'ACTIVE';
}
