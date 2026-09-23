import { View, Text } from '@tarojs/components';

interface PagePlaceholderProps {
  title: string;
  description: string;
}

export function PagePlaceholder({ title, description }: PagePlaceholderProps) {
  return (
    <View className="page">
      <View className="card">
        <Text style={{ display: 'block', fontSize: '40px', fontWeight: '600', marginBottom: '16px' }}>{title}</Text>
        <Text style={{ display: 'block', color: '#8c8c8c', fontSize: '28px', lineHeight: '1.6' }}>{description}</Text>
      </View>
    </View>
  );
}
