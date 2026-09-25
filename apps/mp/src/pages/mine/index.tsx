import { Button, Picker, Text, View } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import { useState } from 'react';
import type { Badge, TenantDetail } from '@xiaoa/share/types';
import type { MyQuota } from '@xiaoa/share';
import { useAppStore } from '../../store';
import { quotaApi, sharedApi } from '../../utils/sharedAdapter';

const menus = [{ title: '账号信息', copy: '手机号、微信绑定' }, { title: '联系客服', copy: '工作日 9:00-18:00' }, { title: '关于小AI', copy: '婚恋珠宝内容工作台' }];
export default function MinePage() {
  const user = useAppStore((state) => state.user);
  const [quota, setQuota] = useState<MyQuota | null>(null);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [tenant, setTenant] = useState<TenantDetail | null>(null);
  const [error, setError] = useState('');
  const isHqAdmin = String(Taro.getStorageSync('role') || '') === 'HQ_ADMIN';
  // 文档 §7.3：HQ_ADMIN 可查看租户详情并续费（PATCH /api/tenants/{tenantId}/renew）
  const loadTenant = () => {
    const tenantId = String(Taro.getStorageSync('tenantId') || '');
    if (!isHqAdmin || !tenantId) return;
    sharedApi.getTenant(tenantId).then(setTenant).catch(() => setTenant(null));
  };
  useDidShow(() => { quotaApi.getMyQuota().then(setQuota).catch((requestError) => setError(requestError instanceof Error ? requestError.message : '额度加载失败')); sharedApi.getTaskBadges().then(setBadges).catch(() => setBadges([])); loadTenant(); });
  const renewTenant = async (date: string) => {
    const tenantId = String(Taro.getStorageSync('tenantId') || '');
    if (!tenantId) return;
    try {
      Taro.showLoading({ title: '续费中…' });
      await sharedApi.renewTenant(tenantId, `${date} 23:59:59`);
      Taro.hideLoading();
      Taro.showToast({ title: '租户已续费', icon: 'success' });
      loadTenant();
    } catch (requestError) {
      Taro.hideLoading();
      Taro.showToast({ title: requestError instanceof Error ? requestError.message : '续费失败', icon: 'none' });
    }
  };
  const accountLevel = quota ? (quota.account.level === 'TENANT' ? '租户额度池' : '本店账户') : '';
  return <View className="page"><View className="profile-card"><Text className="avatar">{(user?.name || '用').slice(0, 1)}</Text><View><Text className="page-title" style={{ fontSize: '34px' }}>{user?.name || '当前用户'}</Text><Text className="page-subtitle">{user?.storeName || '当前门店'} · {user?.role || '员工'}</Text></View></View>{tenant && <View className="card"><View className="row-between"><Text className="section-title" style={{ margin: 0 }}>租户信息</Text><Text className="gold" style={{ fontSize: '24px' }}>{tenant.status === 1 ? '正常' : tenant.status === 2 ? '停用' : '已到期'}</Text></View><Text className="muted" style={{ display: 'block', fontSize: '22px', marginTop: '8px' }}>{tenant.name} · {tenant.type === 1 ? '企业版' : '个人版'}</Text><Text className="muted" style={{ display: 'block', fontSize: '22px' }}>到期时间：{tenant.expireAt || '-'}</Text><Picker mode="date" value={tenant.expireAt ? tenant.expireAt.slice(0, 10) : ''} onChange={(event) => renewTenant(String(event.detail.value))}><View className="secondary-button" style={{ marginTop: '14px' }}>续费至所选日期</View></Picker></View>}<View className="card"><View className="row-between"><Text className="section-title" style={{ margin: 0 }}>额度余额</Text><Text className="gold" style={{ fontSize: '24px' }} onClick={() => Taro.navigateTo({ url: '/pages/quota-flow/index' })}>明细 ›</Text></View>{error ? <Text className="muted">{error}</Text> : <><Text className="balance">{quota ? quota.account.balance.toLocaleString() : '--'}</Text><Text className="muted" style={{ fontSize: '22px' }}>{accountLevel || '加载中'} · 单位：额度</Text></>}</View>{badges.length > 0 && <View className="card"><Text className="section-title" style={{ margin: 0 }}>任务勋章</Text>{badges.map((badge) => <View className="menu-line" key={badge.code}><View><Text style={{ display: 'block' }}>{badge.achieved ? '🏅' : '🔒'} {badge.name}</Text><Text className="muted" style={{ display: 'block', marginTop: '7px', fontSize: '21px' }}>{badge.description}</Text></View><Text className="gold">{badge.achieved ? '已达成' : `${badge.value}/${badge.threshold}`}</Text></View>)}</View>}<View className="card">{menus.map((menu) => <View className="menu-line" key={menu.title} onClick={() => Taro.showToast({ title: menu.title, icon: 'none' })}><View><Text style={{ display: 'block' }}>{menu.title}</Text><Text className="muted" style={{ display: 'block', marginTop: '7px', fontSize: '21px' }}>{menu.copy}</Text></View><Text className="gold">›</Text></View>)}</View><Button className="secondary-button" onClick={async () => { await Taro.removeStorage({ key: 'token' }); Taro.redirectTo({ url: '/pages/login/index' }); }}>退出登录</Button></View>;
}
