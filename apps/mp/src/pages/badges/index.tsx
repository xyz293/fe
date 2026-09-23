import { Text, View } from '@tarojs/components';
import { useDidShow } from '@tarojs/taro';
import { useState } from 'react';
import type { Badge } from '@xiaoa/share/types';
import { sharedApi } from '../../utils/sharedAdapter';

function badgeIcon(code: string) {
  if (code === 'STREAK_7_DAYS') return '🔥';
  if (code === 'WEEK_100_PERCENT') return '⭐';
  if (code === 'MONTH_TASK_STAR') return '🏆';
  if (code === 'STORE_TASK_STAR') return '👑';
  return '🎖';
}

export default function BadgesPage() {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useDidShow(() => {
    setLoading(true);
    setError('');
    sharedApi.getTaskBadges()
      .then(setBadges)
      .catch((err) => setError(err instanceof Error ? err.message : '勋章加载失败'))
      .finally(() => setLoading(false));
  });

  return (
    <View className="page">
      <View className="topbar">
        <View><Text className="page-title">任务勋章</Text><Text className="page-subtitle">坚持完成任务，解锁更多成就</Text></View>
      </View>
      {loading && <View className="card"><Text className="muted">正在加载…</Text></View>}
      {error && <View className="card"><Text className="muted">{error}</Text></View>}
      {!loading && !error && badges.length === 0 && <View className="card"><Text className="muted">暂无勋章数据</Text></View>}
      <View className="badge-grid">
        {badges.map((badge) => (
          <View className="card badge-card" key={badge.code} style={{ opacity: badge.achieved ? 1 : 0.5 }}>
            <Text style={{ display: 'block', fontSize: '56px', textAlign: 'center', marginBottom: '12px' }}>{badgeIcon(badge.code)}</Text>
            <Text style={{ display: 'block', fontSize: '28px', fontWeight: 700, textAlign: 'center' }}>{badge.name}</Text>
            <Text className="muted" style={{ display: 'block', fontSize: '21px', textAlign: 'center', marginTop: '8px' }}>{badge.description}</Text>
            <Text style={{ display: 'block', fontSize: '24px', textAlign: 'center', marginTop: '12px', color: badge.achieved ? '#9a7040' : '#a0a0a0' }}>
              {badge.achieved ? '✓ 已获得' : `${badge.value}/${badge.threshold}`}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
