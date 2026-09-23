import { Button, Input, Picker, Text, View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useState } from 'react';
import { PagePlaceholder } from '../../../components/PagePlaceholder';
import type { DataScope, TenantRole } from '@xiaoa/share/types';
import { sharedApi } from '../../../utils/sharedAdapter';

const roleOptions: TenantRole[] = ['OWNER', 'REGION_ADMIN', 'VIEWER', 'STAFF'];
const scopeOptions: DataScope[] = [1, 2, 3, 4];

export default function EmployeesPage() {
  const [roleId, setRoleId] = useState(''); const [userId, setUserId] = useState(''); const [roleIndex, setRoleIndex] = useState(3); const [scopeIndex, setScopeIndex] = useState(3); const [error, setError] = useState(''); const [loading, setLoading] = useState(false);
  const run = async (action: () => Promise<unknown>, success: string) => { setLoading(true); setError(''); try { await action(); setError(`${success}，接口已生效`); } catch (requestError) { setError(requestError instanceof Error ? requestError.message : '操作失败'); } finally { setLoading(false); } };
  if (!String(Taro.getStorageSync('token') || '')) return <PagePlaceholder title="员工列表" description="请先登录管理员账号后再管理成员。" />;
  return <View className="page"><View className="topbar"><View><Text className="page-title">员工与角色</Text><Text className="page-subtitle">通过关系 ID 管理成员关系，通过用户 ID 禁用账号</Text></View></View><View className="card"><Text className="section-label">成员关系操作</Text><Text className="muted" style={{ display: 'block', marginBottom: '12px', fontSize: '21px' }}>当前接口文档未提供成员列表查询接口，请从后台列表取得 roleId/userId 后操作。</Text><Text className="section-label">roleId</Text><Input className="chat-input" value={roleId} placeholder="user_org_role 关系 ID" onInput={(event) => setRoleId(event.detail.value)} /><Button className="secondary-button" onClick={() => run(() => sharedApi.removeMember(roleId), '成员关系已移除')} disabled={!roleId || loading}>移出门店</Button><Text className="section-label">userId</Text><Input className="chat-input" value={userId} placeholder="用户 ID" onInput={(event) => setUserId(event.detail.value)} /><Button className="secondary-button" onClick={() => run(() => sharedApi.disableUser(userId), '用户账号已禁用')} disabled={!userId || loading}>禁用账号</Button></View><View className="card"><Text className="section-label">更新成员角色</Text><Picker mode="selector" range={roleOptions} value={roleIndex} onChange={(event) => setRoleIndex(Number(event.detail.value))}><View className="secondary-button">角色：{roleOptions[roleIndex]}</View></Picker><Picker mode="selector" range={scopeOptions.map((scope) => `数据范围 ${scope}`)} value={scopeIndex} onChange={(event) => setScopeIndex(Number(event.detail.value))}><View className="secondary-button">数据范围：{scopeOptions[scopeIndex]}</View></Picker><Button className="primary-button" onClick={() => run(() => sharedApi.grantUserRole(userId, { orgId: String(Taro.getStorageSync('orgId') || ''), role: roleOptions[roleIndex], dataScope: scopeOptions[scopeIndex] }), '用户角色已授予或更新')} disabled={!userId || loading}>授予 / 更新角色</Button>{error && <View className="notice-bar" style={{ marginTop: '18px' }}><Text>{error}</Text></View>}</View></View>;
}
