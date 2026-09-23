import { Button, Input, Text, View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useState } from 'react';
import type { AuthSession } from '@xiaoa/share/types';
import { useAppStore } from '../../store';
import { sharedApi } from '../../utils/sharedAdapter';

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function saveSession(session: AuthSession, nickname?: string) {
  Taro.setStorageSync('token', session.token);
  Taro.setStorageSync('tenantId', String(session.tenantId));
  Taro.setStorageSync('orgId', String(session.orgId));
  Taro.setStorageSync('role', session.role);
  Taro.setStorageSync('dataScope', session.dataScope);
  Taro.setStorageSync('storeId', String(session.orgId));
  Taro.setStorageSync('storeName', session.orgName);
  Taro.setStorageSync('userId', String(session.userId));
  if (nickname) Taro.setStorageSync('nickname', nickname);
}

export default function LoginPage() {
  const [openid, setOpenid] = useState(String(Taro.getStorageSync('openid') || ''));
  const [phone, setPhone] = useState('');
  const [takeover, setTakeover] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const setUser = useAppStore((state) => state.setUser);

  const finishLogin = (session: AuthSession) => {
    const nickname = String(Taro.getStorageSync('nickname') || '');
    saveSession(session, nickname);
    setUser({ id: String(session.userId), name: nickname || `用户${session.userId}`, role: session.role, storeId: String(session.orgId), storeName: session.orgName, tenantId: String(session.tenantId), orgId: String(session.orgId), dataScope: session.dataScope });
    Taro.switchTab({ url: '/pages/index/index' });
  };

  const handleSubmit = async () => {
    setError('');
    if (!openid.trim()) {
      setError('请输入微信标识。当前后端暂时直接接收 openid，正式环境可替换为 wx.login 换取流程。');
      return;
    }
    if (takeover && !/^1\d{10}$/.test(phone)) {
      setError('请输入正确的 11 位手机号');
      return;
    }
    setLoading(true);
    try {
      const session = takeover ? await sharedApi.takeover({ phone, openid: openid.trim() }) : await sharedApi.login({ openid: openid.trim() });
      Taro.setStorageSync('openid', openid.trim());
      finishLogin(session);
    } catch (requestError) {
      setError(errorMessage(requestError, takeover ? '接管账号失败' : '登录失败'));
    } finally {
      setLoading(false);
    }
  };

  return <View className="page"><View className="card" style={{ marginTop: '80px' }}><Text style={{ display: 'block', fontSize: '52px', fontWeight: '600', marginBottom: '16px' }}>小AI</Text><Text style={{ display: 'block', color: '#8c8c8c', fontSize: '28px', lineHeight: '1.6', marginBottom: '38px' }}>门店营销内容，一句话就能生成</Text><Text className="section-label">微信标识 openid</Text><Input className="chat-input" value={openid} placeholder="请输入 openid（联调必填）" onInput={(event) => setOpenid(event.detail.value)} /><Text className="muted" style={{ display: 'block', marginTop: '12px', fontSize: '21px', lineHeight: '1.5' }}>后端当前直接接收 openid；接入微信登录换取后可移除该输入框。</Text>{takeover && <><Text className="section-label">绑定手机号</Text><Input className="chat-input" value={phone} type="number" maxlength={11} placeholder="请输入原账号手机号" onInput={(event) => setPhone(event.detail.value)} /></>}{error && <View className="notice-bar" style={{ marginTop: '20px' }}><Text>{error}</Text></View>}<Button className="primary-button" loading={loading} onClick={handleSubmit}>{loading ? '正在登录…' : takeover ? '验证手机号并接管' : '登录'}</Button><Button className="secondary-button" style={{ marginTop: '16px' }} onClick={() => setTakeover((value) => !value)}>{takeover ? '返回普通登录' : '手机号已绑定其他微信？去接管'}</Button><Button className="secondary-button" style={{ marginTop: '16px' }} onClick={() => Taro.navigateTo({ url: '/pages/invite/index' })}>我有邀请码，加入门店</Button></View></View>;
}
