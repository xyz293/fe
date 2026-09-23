import { useState } from 'react';

export interface VersionCardsProps {
  versions: string[];
  selectedIndex?: number;
  onSelect?: (index: number, content: string) => void;
}

export function VersionCards({ versions, selectedIndex, onSelect }: VersionCardsProps) {
  const [internalIndex, setInternalIndex] = useState(0);
  const activeIndex = selectedIndex ?? internalIndex;

  const select = (index: number) => {
    setInternalIndex(index);
    onSelect?.(index, versions[index]);
  };

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {versions.map((version, index) => <button type="button" key={`${index}-${version.slice(0, 12)}`} onClick={() => select(index)} style={{ padding: 16, border: `1px solid ${index === activeIndex ? '#c9a46c' : '#eadbd0'}`, borderRadius: 16, background: index === activeIndex ? '#fff7ea' : '#fffdfb', color: '#3d2a2f', textAlign: 'left', lineHeight: 1.7, cursor: 'pointer', boxShadow: index === activeIndex ? '0 8px 20px rgba(201, 164, 108, 0.18)' : 'none' }}><div style={{ marginBottom: 8, color: '#b8874f', fontSize: 12, letterSpacing: 1 }}>婚恋灵感 · {index + 1}</div>{version}<div style={{ marginTop: 10, color: '#a78362', fontSize: 12 }}>{index === activeIndex ? '已选定这份爱的表达' : '选择这份婚戒故事'}</div></button>)}
    </div>
  );
}
