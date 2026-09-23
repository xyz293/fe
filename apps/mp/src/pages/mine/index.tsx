import { Button, Text, View } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import { useState } from 'react';
import type { Badge } from '@xiaoa/share/types';
import { useAppStore } from '../../store';
import { sharedApi } from '../../utils/sharedAdapter';

const menus = [{ title: '账号信息', copy: '手机号、微信绑定' }, { title: '联系客服', copy: '工作日 9:00-18:00' }, { title: '关于小AI', copy: '婚恋珠宝内容工作台' }];
export default function MinePage() {
  const user = useAppStore((state) => state.user);
  const [quota, setQuota] = useState<{ balance: number; total: number; used: number } | null>(null);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [error, setError] = useState('');
  useDidShow(() => { sharedApi.getQuota().then(setQuota).catch((requestError) => setError(requestError instanceof Error ? requestError.message : '额度加载失败')); sharedApi.getTaskBadges().then(setBadges).catch(() => setBadges([])); });
  const percent = quota && quota.total > 0 ? Math.round((quota.balance / quota.total) * 100) : 0;
  return <View className="page"><View className="profile-card"><Text className="avatar">{(user?.name || '用').slice(0, 1)}</Text><View><Text className="page-title" style={{ fontSize: '34px' }}>{user?.name || '当前用户'}</Text><Text className="page-subtitle">{user?.storeName || '当前门店'} · {user?.role || '员工'}</Text></View></View><View className="card"><View className="row-between"><Text className="section-title" style={{ margin: 0 }}>额度余额</Text><Text className="gold" style={{ fontSize: '24px' }}>接口数据</Text></View>{error ? <Text className="muted">{error}</Text> : <><Text className="balance">{quota ? quota.balance.toFixed(2) : '--'}</Text><Text className="muted" style={{ fontSize: '22px' }}>本月已使用 {quota ? quota.used.toFixed(2) : '--'} 灵感额度</Text><View className="task-progress"><View className="task-progress-fill" style={{ width: `${percent}%` }} /></View></>}</View>{badges.length > 0 && <View className="card"><Text className="section-title" style={{ margin: 0 }}>任务勋章</Text>{badges.map((badge) => <View className="menu-line" key={badge.code}><View><Text style={{ display: 'block' }}>{badge.achieved ? '🏅' : '🔒'} {badge.name}</Text><Text className="muted" style={{ display: 'block', marginTop: '7px', fontSize: '21px' }}>{badge.description}</Text></View><Text className="gold">{badge.achieved ? '已达成' : `${badge.value}/${badge.threshold}`}</Text></View>)}</View>}<View className="card">{menus.map((menu) => <View className="menu-line" key={menu.title} onClick={() => Taro.showToast({ title: menu.title, icon: 'none' })}><View><Text style={{ display: 'block' }}>{menu.title}</Text><Text className="muted" style={{ display: 'block', marginTop: '7px', fontSize: '21px' }}>{menu.copy}</Text></View><Text className="gold">›</Text></View>)}</View><Button className="secondary-button" onClick={async () => { await Taro.removeStorage({ key: 'token' }); Taro.redirectTo({ url: '/pages/login/index' }); }}>退出登录</Button></View>;
}
