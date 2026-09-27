import type { AiWork } from '../api/types';

export interface WorkCardProps {
  work: AiWork;
  onClick?: (work: AiWork) => void;
}

const typeLabels: Record<AiWork['type'], string> = { IMAGE: '珠宝海报', VIDEO: '婚礼短视频' };
const statusLabels: Record<AiWork['publishStatus'], string> = {
  NONE: '未发布',
  DRAFT: '草稿',
  PENDING_AUDIT: '待审核',
  APPROVED: '可发布',
  REJECTED: '已驳回',
  PUBLISHED: '已发布',
};
const statusColors: Record<AiWork['publishStatus'], string> = {
  NONE: '#8d7479',
  DRAFT: '#8d7479',
  PENDING_AUDIT: '#c9a46c',
  APPROVED: '#7a9b76',
  REJECTED: '#b33a4a',
  PUBLISHED: '#7a9b76',
};

export function WorkCard({ work, onClick }: WorkCardProps) {
  const failed = work.status === 'FAILED';
  const pending = work.status === 'PENDING';
  // local:// 是后端本地占位协议（OSS 接入前），浏览器无法预览，渲染占位框（文档 §3.5）
  const isLocal = Boolean(work.contentUrl?.startsWith('local://'));
  const summary = work.caption || work.userInput || '记录一段关于承诺、相遇与爱的珠宝故事';
  return (
    <button type="button" onClick={() => onClick?.(work)} style={{ display: 'block', width: '100%', padding: 16, border: '1px solid #eadbd0', borderRadius: 16, background: 'linear-gradient(145deg, #fffdfb, #fff8f2)', color: '#3d2a2f', textAlign: 'left', cursor: onClick ? 'pointer' : 'default', boxShadow: '0 8px 24px rgba(100, 65, 45, 0.06)' }}>
      {work.contentUrl && !isLocal && <img src={work.contentUrl} alt="婚恋珠宝作品" style={{ display: 'block', width: '100%', height: 160, objectFit: 'cover', borderRadius: 12, marginBottom: 12 }} />}
      {work.contentUrl && isLocal && <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: 160, borderRadius: 12, marginBottom: 12, background: 'linear-gradient(145deg, #f4e9df, #eadbd0)', color: '#a78362', fontSize: 13 }}>成品已生成（OSS 接入后可预览）</div>}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}><strong>{work.styleName || typeLabels[work.type]}</strong><span style={{ color: '#a78362', fontSize: 12 }}>{typeLabels[work.type]}</span></div>
      <div style={{ color: '#8d7479', fontSize: 13, marginBottom: 8 }}>{failed ? work.failReason || '生成失败，消耗额度已退回' : pending ? '生成中…' : summary}</div>
      <span style={{ color: failed ? '#b33a4a' : pending ? '#c9a46c' : statusColors[work.publishStatus], fontSize: 12 }}>{failed ? '生成失败' : pending ? '生成中' : statusLabels[work.publishStatus]}</span>
    </button>
  );
}
