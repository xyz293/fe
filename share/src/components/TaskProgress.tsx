import type { CSSProperties } from 'react';

export interface TaskProgressProps {
  percent: number;
  label?: string;
  color?: string;
}

export function TaskProgress({ percent, label = '婚恋内容完成率', color = '#c9a46c' }: TaskProgressProps) {
  const safePercent = Math.max(0, Math.min(100, percent));
  const trackStyle: CSSProperties = { height: 8, overflow: 'hidden', borderRadius: 8, background: '#f3e9df' };
  const fillStyle: CSSProperties = { width: `${safePercent}%`, height: '100%', borderRadius: 8, background: color, transition: 'width 200ms ease' };

  return (
    <div style={{ width: '100%', color: '#3d2a2f' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 14 }}>
        <span>{label}</span>
        <strong>{safePercent.toFixed(1)}%</strong>
      </div>
      <div style={trackStyle}><div style={fillStyle} /></div>
    </div>
  );
}
