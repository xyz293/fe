import { Text, View } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import { useState } from 'react';
import type { RankingItem, RankingScope, RankingPeriod } from '@xiaoa/share/types';
import { sharedApi } from '../../utils/sharedAdapter';

const scopeLabels: { label: string; value: RankingScope }[] = [
  { label: '门店榜', value: 'STORE' },
  { label: '全国榜', value: 'NATIONAL' },
];
const periodLabels: { label: string; value: RankingPeriod }[] = [
  { label: '周榜', value: 'WEEK' },
  { label: '月榜', value: 'MONTH' },
];

function medalIcon(rank: number) {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return `${rank}`;
}

export default function RankingPage() {
  const [scope, setScope] = useState<RankingScope>('STORE');
  const [period, setPeriod] = useState<RankingPeriod>('WEEK');
  const [items, setItems] = useState<RankingItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    setError('');
    const storeId = Taro.getStorageSync('storeId');
    sharedApi.getTaskRanking({ scope, period, ...(storeId ? { storeId: String(storeId) } : {}), limit: 20 })
      .then(setItems)
      .catch((err) => setError(err instanceof Error ? err.message : '排行榜加载失败'))
      .finally(() => setLoading(false));
  };

  useDidShow(load);

  return (
    <View className="page">
      <View className="topbar">
        <View><Text className="page-title">排行榜</Text><Text className="page-subtitle">看看谁是任务达人</Text></View>
      </View>
      <View className="filter-row">
        {scopeLabels.map((item) => (
          <Text className={scope === item.value ? 'pill active' : 'pill'} key={item.value} onClick={() => { setScope(item.value); }}>{item.label}</Text>
        ))}
      </View>
      <View className="filter-row" style={{ marginTop: '12px' }}>
        {periodLabels.map((item) => (
          <Text className={period === item.value ? 'pill active' : 'pill'} key={item.value} onClick={() => { setPeriod(item.value); }}>{item.label}</Text>
        ))}
      </View>
      {loading && <View className="card"><Text className="muted">正在加载…</Text></View>}
      {error && <View className="card"><Text className="muted">{error}</Text></View>}
      {!loading && !error && items.length === 0 && <View className="card"><Text className="muted">暂无排行数据</Text></View>}
      <View className="ranking-list">
        {items.map((item) => (
          <View className="rank-row" key={String(item.userId)}>
            <Text className="rank-index" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '48px', borderRadius: '12px', fontSize: '24px', fontWeight: 700, color: '#8e683c', background: '#fff0d3' }}>{medalIcon(item.rank)}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ display: 'block', fontSize: '28px', fontWeight: 600 }}>{item.nickname}</Text>
              <Text className="muted" style={{ display: 'block', fontSize: '22px' }}>{item.storeName}</Text>
            </View>
            <View style={{ textAlign: 'right' }}>
              <Text className="gold" style={{ fontSize: '30px', fontWeight: 700 }}>{item.finished}</Text>
              <Text className="muted" style={{ display: 'block', fontSize: '20px' }}>完成 {item.finished}/{item.expected}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}
