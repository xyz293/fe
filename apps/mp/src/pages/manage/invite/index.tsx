import { Button, Input, Text, View } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import { useState } from 'react';
import type { CreateInviteRequest, Invite, OrgNode } from '@xiaoa/share/types';
import { sharedApi } from '../../../utils/sharedAdapter';

function formatDate(date: Date) { const pad = (value: number) => String(value).padStart(2, '0'); return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`; }
function flattenStores(nodes: OrgNode[]): OrgNode[] { return nodes.flatMap((node) => [...(node.type === 3 ? [node] : []), ...flattenStores(node.children || [])]); }

export default function ManageInvitePage() {
  const [stores, setStores] = useState<OrgNode[]>([]); const [storeId, setStoreId] = useState(''); const [expireAt, setExpireAt] = useState(formatDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000))); const [invite, setInvite] = useState<Invite | null>(null); const [error, setError] = useState(''); const [loading, setLoading] = useState(false);
  const load = () => { sharedApi.getOrgTree().then((tree) => setStores(flattenStores(tree))).catch((requestError) => setError(requestError instanceof Error ? requestError.message : '门店加载失败')); };
  useDidShow(load);
  const create = async () => { if (!storeId) return setError('请选择门店'); setLoading(true); setError(''); const data: CreateInviteRequest = { storeId, expireAt, role: 'STAFF' }; try { setInvite(await sharedApi.createInvite(data)); } catch (requestError) { setError(requestError instanceof Error ? requestError.message : '邀请码创建失败'); } finally { setLoading(false); } };
  return <View className="page"><View className="topbar"><View><Text className="page-title">邀请码</Text><Text className="page-subtitle">为门店员工创建一次性入店邀请码</Text></View><Button size="mini" onClick={load}>刷新</Button></View><View className="card"><Text className="section-label">目标门店 ID</Text><Input className="chat-input" type="number" value={storeId} placeholder="请输入 type=3 的门店组织 ID" onInput={(event) => setStoreId(event.detail.value)} /><Text className="muted" style={{ display: 'block', marginTop: '10px', fontSize: '21px' }}>{stores.length ? `当前组织树发现 ${stores.length} 家门店：${stores.map((store) => `${store.name}(${store.id})`).join('、')}` : '正在读取当前租户组织树…'}</Text><Text className="section-label">过期时间</Text><Input className="chat-input" value={expireAt} placeholder="yyyy-MM-dd HH:mm:ss" onInput={(event) => setExpireAt(event.detail.value)} /><Button className="primary-button" loading={loading} onClick={create}>创建邀请码</Button></View>{error && <View className="card"><Text className="muted">{error}</Text></View>}{invite && <View className="card"><Text className="section-label">创建成功</Text><Text className="page-title" style={{ textAlign: 'center', letterSpacing: '5px' }}>{invite.code}</Text><Text className="muted" style={{ display: 'block', marginTop: '16px', textAlign: 'center' }}>员工使用后将自动核销 · 有效期至 {invite.expireAt}</Text></View>}</View>;
}
