import { Text, View } from '@tarojs/components';

export interface VersionCardsAdapterProps {
  versions: string[];
  onSelect: (index: number, content: string) => void;
}

export function VersionCards({ versions, onSelect }: VersionCardsAdapterProps) {
  return <View>{versions.map((version, index) => <View key={`${index}-${version.slice(0, 12)}`} onClick={() => onSelect(index, version)} style={{ marginTop: '16px', padding: '24px', border: '2px solid #e6f4ff', borderRadius: '16px', background: '#f8fbff' }}><Text style={{ display: 'block', lineHeight: '1.7' }}>{version}</Text><Text style={{ display: 'block', marginTop: '12px', color: '#1677ff', fontSize: '24px' }}>选择这个版本</Text></View>)}</View>;
}
