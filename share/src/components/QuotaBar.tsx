import type { CSSProperties } from 'react';

export interface QuotaBarProps {
  balance: number;
  total: number;
  label?: string;
  warningThreshold?: number;
}

export function QuotaBar({ balance, total, label = '婚礼灵感额度', warningThreshold = 0.2 }: QuotaBarProps) {
  const percent = total > 0 ? Math.max(0, Math.min(100, (balance / total) * 100)) : 0;
  const isWarning = total > 0 && balance / total <= warningThreshold;
  const color = isWarning ? '#b33a4a' : '#c9a46c';
  const trackStyle: CSSProperties = { height: 8, overflow: 'hidden', borderRadius: 8, background: '#f3e9df' };
  const fillStyle: CSSProperties = { width: `${percent}%`, height: '100%', borderRadius: 8, background: 'linear-gradient(90deg, #c9a46c, #e7c99a)', transition: 'width 200ms ease' };

  return (
    <div style={{ width: '100%', color: '#3d2a2f' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 14 }}>
        <span>{label}</span>
        <strong style={{ color }}>{balance} / {total}</strong>
      </div>
      <div style={trackStyle}><div style={fillStyle} /></div>
      {isWarning && <div style={{ marginTop: 6, color, fontSize: 12 }}>灵感额度不足，请补充婚戒内容素材后再试</div>}
    </div>
  );
}
