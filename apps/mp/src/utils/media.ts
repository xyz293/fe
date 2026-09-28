/**
 * 可直接加载的媒体地址白名单（readme §6 前端注意事项）：
 * work.contentUrl / asset.content 当前为 demo:// 或 local:// 占位协议（OSS 未接入），
 * 直接塞进 <Image>/<Video> 会破图。此处只放行真实可加载的地址：
 * - http(s) 外链 / 小程序本地临时文件（http://tmp/、wxfile://）
 * - 微信云存储 cloud://（接入后可用）
 */
export function previewableUrl(url?: string | null): string {
  if (!url) return '';
  if (/^https?:\/\//i.test(url) || url.startsWith('cloud://') || url.startsWith('wxfile://')) return url;
  return '';
}

/** 素材/作品封面的占位字符（不可加载时展示类型图标而不是破图） */
export function mediaFallbackIcon(type?: string | null): string {
  if (type === 'VIDEO') return '🎬';
  if (type === 'SCRIPT') return '📝';
  return '🖼';
}
