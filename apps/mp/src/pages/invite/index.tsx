import { Button, Input, Text, View } from '@tarojs/components';
import Taro, { useLoad } from '@tarojs/taro';
import { useState } from 'react';
import type { AuthJoinResult, AuthSession, Invite } from '@xiaoa/share/types';
import { useAppStore } from '../../store';
import { sharedApi } from '../../utils/sharedAdapter';

function saveSession(session: AuthSession, nickname: string, storeId: AuthJoinResult['storeId']) {
  Taro.setStorageSync('token', session.token);
  Taro.setStorageSync('openid', String(Taro.getStorageSync('openid') || ''));
  Taro.setStorageSync('tenantId', String(session.tenantId));
  Taro.setStorageSync('orgId', String(session.orgId));
  Taro.setStorageSync('storeId', String(storeId));
  Taro.setStorageSync('storeName', session.orgName);
  Taro.setStorageSync('role', session.role);
  Taro.setStorageSync('dataScope', session.dataScope);
  Taro.setStorageSync('userId', String(session.userId));
  Taro.setStorageSync('nickname', nickname);
}

export default function InvitePage() {
  const [code, setCode] = useState('');
  const [phone, setPhone] = useState('');
  const [openid, setOpenid] = useState(String(Taro.getStorageSync('openid') || ''));
  const [nickname, setNickname] = useState(String(Taro.getStorageSync('nickname') || ''));
  const [invite, setInvite] = useState<Invite | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const setUser = useAppStore((state) => state.setUser);

  useLoad((params) => { if (params.code) setCode(params.code); });
  const validate = async () => { if (!code.trim()) return setError('请输入邀请码'); setError(''); try { setInvite(await sharedApi.validateInvite(code.trim())); } catch (requestError) { setInvite(null); setError(requestError instanceof Error ? requestError.message : '邀请码校验失败'); } };
  const join = async () => {
    if (!/^1\d{10}$/.test(phone)) return setError('请输入正确的 11 位手机号');
    if (!openid.trim()) return setError('请输入微信标识 openid');
    setLoading(true); setError('');
    try {
      const result = await sharedApi.joinByInvite({ code: code.trim(), phone, openid: openid.trim(), nickname: nickname.trim() || undefined });
      saveSession(result.login, nickname.trim() || `用户${result.login.userId}`, result.storeId);
      Taro.setStorageSync('openid', openid.trim());
      setUser({ id: String(result.login.userId), name: nickname.trim() || `用户${result.login.userId}`, role: result.login.role, storeId: String(result.storeId), storeName: result.login.orgName, tenantId: String(result.login.tenantId), orgId: String(result.login.orgId), dataScope: result.login.dataScope });
      Taro.switchTab({ url: '/pages/index/index' });
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : '入店失败'); } finally { setLoading(false); }
  };
  return <View className="page"><View className="card"><Text className="page-title" style={{ fontSize: '40px' }}>加入门店</Text><Text className="hero-copy" style={{ marginBottom: '28px' }}>使用管理员发放的邀请码加入门店，入店后即可领取营销任务与创作额度。</Text><Text className="section-label">邀请码</Text><View className="chat-input-row"><Input className="chat-input" value={code} placeholder="请输入邀请码" onInput={(event) => setCode(event.detail.value.toUpperCase())} /><Button className="send-button" onClick={validate}>校验</Button></View>{invite && <View className="notice-bar" style={{ marginTop: '18px' }}><Text>邀请码有效 · 门店 ID：{invite.storeId} · 有效期至 {invite.expireAt}</Text></View>}<Text className="section-label">手机号</Text><Input className="chat-input" value={phone} type="number" maxlength={11} placeholder="请输入手机号" onInput={(event) => setPhone(event.detail.value)} /><Text className="section-label">微信标识 openid</Text><Input className="chat-input" value={openid} placeholder="请输入 openid（联调必填）" onInput={(event) => setOpenid(event.detail.value)} /><Text className="section-label">昵称（可选）</Text><Input className="chat-input" value={nickname} placeholder="请输入昵称" onInput={(event) => setNickname(event.detail.value)} />{error && <View className="notice-bar" style={{ marginTop: '20px' }}><Text>{error}</Text></View>}<Button className="primary-button" loading={loading} disabled={!invite} onClick={join}>确认入店并登录</Button><Button className="secondary-button" style={{ marginTop: '16px' }} onClick={() => Taro.navigateBack()}>返回</Button></View></View>;
}
