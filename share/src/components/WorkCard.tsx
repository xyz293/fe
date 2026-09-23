import type { Work } from '../api/types';

export interface WorkCardProps {
  work: Work;
  onClick?: (work: Work) => void;
}

const typeLabels: Record<Work['type'], string> = { COPY: '婚戒文案', IMAGE: '珠宝海报', VIDEO: '婚礼短视频' };
const statusLabels: Record<Work['status'], string> = { DRAFT: '灵感草稿', PENDING_REVIEW: '待品牌审核', READY: '可发布', REJECTED: '需重新打磨' };
const statusColors: Record<Work['status'], string> = { DRAFT: '#8d7479', PENDING_REVIEW: '#c9a46c', READY: '#7a9b76', REJECTED: '#b33a4a' };

export function WorkCard({ work, onClick }: WorkCardProps) {
  return (
    <button type="button" onClick={() => onClick?.(work)} style={{ display: 'block', width: '100%', padding: 16, border: '1px solid #eadbd0', borderRadius: 16, background: 'linear-gradient(145deg, #fffdfb, #fff8f2)', color: '#3d2a2f', textAlign: 'left', cursor: onClick ? 'pointer' : 'default', boxShadow: '0 8px 24px rgba(100, 65, 45, 0.06)' }}>
      {work.coverUrl && <img src={work.coverUrl} alt="婚恋珠宝作品封面" style={{ display: 'block', width: '100%', height: 160, objectFit: 'cover', borderRadius: 12, marginBottom: 12 }} />}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}><strong>{work.title}</strong><span style={{ color: '#a78362', fontSize: 12 }}>{typeLabels[work.type]}</span></div>
      <div style={{ color: '#8d7479', fontSize: 13, marginBottom: 8 }}>{work.summary || '记录一段关于承诺、相遇与爱的珠宝故事'}</div>
      <span style={{ color: statusColors[work.status], fontSize: 12 }}>{statusLabels[work.status]}</span>
    </button>
  );
}
