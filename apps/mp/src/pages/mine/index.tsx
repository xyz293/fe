import { Text, View } from '@tarojs/components';
import { useAppStore } from '../../store';

export default function MinePage() {
  const user = useAppStore((state) => state.user);
  const quota = useAppStore((state) => state.quota);
  return <View className="page"><View className="card"><Text style={{ display: 'block', fontSize: '42px', fontWeight: '600' }}>{user?.name || '体验用户'}</Text><Text style={{ display: 'block', color: '#8c8c8c', marginTop: '12px' }}>{user?.storeName || '未加入门店'}</Text></View><View className="card"><Text style={{ display: 'block', fontSize: '32px', fontWeight: '600' }}>创作额度</Text><Text style={{ display: 'block', color: '#1677ff', fontSize: '48px', marginTop: '20px' }}>{quota?.balance ?? '--'}</Text><Text style={{ display: 'block', color: '#8c8c8c', marginTop: '8px' }}>余额以服务端数据为准</Text></View></View>;
}
