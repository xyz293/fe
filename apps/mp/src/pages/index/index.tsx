import { Button, Text, View } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import { useAppStore } from '../../store';
import { sharedApi } from '../../utils/sharedAdapter';
import { track } from '../../services/track';
import { SharedWidgets } from '../../components/SharedWidgets';

export default function HomePage() {
  const user = useAppStore((state) => state.user);
  const quota = useAppStore((state) => state.quota);
  const setQuota = useAppStore((state) => state.setQuota);

  useDidShow(() => {
    sharedApi.getQuota()
      .then(setQuota)
      .catch(() => setQuota({ balance: 100, total: 100, used: 0 }));
  });

  const enterCreate = (mode: 'chat' | 'pro') => {
    track('enter_create', { mode });
    Taro.navigateTo({ url: `/pages/${mode}/index` });
  };

  return (
    <View className="page">
      <View className="card">
        <Text style={{ display: 'block', color: '#8c8c8c', fontSize: '26px' }}>{user?.storeName || '欢迎来到小AI'}</Text>
        <Text style={{ display: 'block', fontSize: '42px', fontWeight: '600', marginTop: '12px' }}>今天也来创作点好内容</Text>
        <Text style={{ display: 'block', color: '#1677ff', fontSize: '28px', marginTop: '24px' }}>可用额度：{quota?.balance ?? '--'}</Text>
      </View>
      <View className="card">
        <Text style={{ display: 'block', fontSize: '34px', fontWeight: '600', marginBottom: '24px' }}>快速创作</Text>
        <Button className="primary-button" onClick={() => enterCreate('chat')}>对话创作</Button>
        <Button style={{ marginTop: '20px', borderRadius: '12px' }} onClick={() => enterCreate('pro')}>专业模式</Button>
      </View>
      <SharedWidgets />
      <View className="card">
        <Text style={{ display: 'block', fontSize: '32px', fontWeight: '600', marginBottom: '16px' }}>今日任务</Text>
        <Text style={{ display: 'block', color: '#8c8c8c', fontSize: '28px' }}>暂无待办任务，开始创作吧</Text>
      </View>
    </View>
  );
}
