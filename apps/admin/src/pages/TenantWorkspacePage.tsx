import { Alert, Button, Card, Col, DatePicker, Form, Input, InputNumber, Row, Select, Space, Tag, Tree, Typography, message } from 'antd';
import type { DataNode } from 'antd/es/tree';
import { PlusOutlined, ReloadOutlined, SaveOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useEffect, useMemo, useState } from 'react';
import type { CreateOrgRequest, DataScope, OrgNode, TenantDetail, TenantRole } from '@xiaoa/share/types';
import { sharedApi } from '../services/sharedApi';
import { StoreQuotaDrawer } from './quota/StoreQuotaDrawer';

interface PageProps { title: string; description: string; }
interface MemberActionValues { roleId: string; userId: string; orgId: string; role: TenantRole; dataScope: DataScope; }
const orgLabels: Record<OrgNode['type'], string> = { 1: '品牌', 2: '区域', 3: '门店' };
const roleOptions: TenantRole[] = ['HQ_ADMIN', 'REGION_ADMIN', 'OWNER', 'VIEWER', 'STAFF'];
const scopeOptions: Array<{ label: string; value: DataScope }> = [{ label: '全域', value: 1 }, { label: '本区域', value: 2 }, { label: '本店', value: 3 }, { label: '本人', value: 4 }];
const tenantStatusLabels: Record<TenantDetail['status'], { label: string; color: string }> = { 1: { label: '正常', color: 'green' }, 2: { label: '停用', color: 'orange' }, 3: { label: '已到期', color: 'red' } };

function treeData(nodes: OrgNode[], onQuota?: (node: OrgNode) => void): DataNode[] {
  return nodes.map((node) => ({
    key: String(node.id),
    title: (
      <Space size={8}>
        <Tag>{orgLabels[node.type]}</Tag>
        <span>{node.name}</span>
        <Typography.Text type="secondary">#{node.id}</Typography.Text>
        {node.type === 3 && onQuota && <Button type="link" size="small" onClick={(event) => { event.stopPropagation(); onQuota(node); }}>额度</Button>}
      </Space>
    ),
    children: node.children?.length ? treeData(node.children, onQuota) : undefined,
  }));
}

function flatten(nodes: OrgNode[]): OrgNode[] { return nodes.reduce<OrgNode[]>((all, node) => [...all, node, ...flatten(node.children || [])], []); }

export function TenantWorkspacePage({ title, description }: PageProps) {
  const [orgs, setOrgs] = useState<OrgNode[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState('');
  const [newOrgForm] = Form.useForm<CreateOrgRequest>();
  const [memberForm] = Form.useForm<MemberActionValues>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tenant, setTenant] = useState<TenantDetail | null>(null);
  const [quotaStore, setQuotaStore] = useState<OrgNode | null>(null);
  const [renewAt, setRenewAt] = useState<dayjs.Dayjs | null>(null);
  const tenantId = localStorage.getItem('tenantId');
  const isHqAdmin = localStorage.getItem('role') === 'HQ_ADMIN';
  const allOrgs = useMemo(() => flatten(orgs), [orgs]);
  const selectedOrg = allOrgs.find((org) => String(org.id) === selectedOrgId);

  const load = () => { setLoading(true); setError(''); sharedApi.getOrgTree().then((result) => { setOrgs(result); if (!selectedOrgId && result[0]) setSelectedOrgId(String(result[0].id)); }).catch((requestError) => setError(requestError instanceof Error ? requestError.message : '组织树加载失败')).finally(() => setLoading(false)); };
  useEffect(load, []);

  const loadTenant = () => { if (!tenantId) return; sharedApi.getTenant(tenantId).then(setTenant).catch(() => setTenant(null)); };
  useEffect(loadTenant, [tenantId]);
  // 文档 §7.3：PATCH /api/tenants/{tenantId}/renew，仅 HQ_ADMIN，可恢复已到期租户
  const renew = async () => {
    if (!tenantId || !tenant) return;
    if (!renewAt) { message.warning('请选择新的到期时间'); return; }
    try { setLoading(true); await sharedApi.renewTenant(tenantId, renewAt.format('YYYY-MM-DD HH:mm:ss')); message.success('租户已续费并恢复正常状态'); loadTenant(); } catch (requestError) { setError(requestError instanceof Error ? requestError.message : '租户续费失败'); } finally { setLoading(false); }
  };

  const createOrg = async (values: CreateOrgRequest) => { try { setLoading(true); const result = await sharedApi.createOrg({ ...values, parentId: values.parentId || 0 }); message.success(`已创建${orgLabels[result.type]}「${result.name}」`); newOrgForm.resetFields(); load(); } catch (requestError) { setError(requestError instanceof Error ? requestError.message : '组织创建失败'); } finally { setLoading(false); } };
  const rename = async () => { if (!selectedOrg) return; const name = window.prompt('请输入新的组织名称', selectedOrg.name)?.trim(); if (!name || name === selectedOrg.name) return; try { await sharedApi.updateOrgName(selectedOrg.id, { name }); message.success('组织名称已更新'); load(); } catch (requestError) { setError(requestError instanceof Error ? requestError.message : '组织名称更新失败'); } };
  const submitMemberAction = async (values: MemberActionValues) => { try { setLoading(true); if (values.roleId) { await sharedApi.updateUserRole(values.roleId, { orgId: values.orgId, role: values.role, dataScope: values.dataScope }); message.success('成员关系角色已更新'); } else if (values.userId) { await sharedApi.grantUserRole(values.userId, { orgId: values.orgId, role: values.role, dataScope: values.dataScope }); message.success('用户角色已授予或更新'); } else { throw new Error('请填写 userId 或 roleId'); } } catch (requestError) { setError(requestError instanceof Error ? requestError.message : '角色操作失败'); } finally { setLoading(false); } };
  const removeMember = async () => { const roleId = memberForm.getFieldValue('roleId') as string; if (!roleId) return message.warning('请先填写 roleId'); try { setLoading(true); await sharedApi.removeMember(roleId); message.success('成员关系已移出'); } catch (requestError) { setError(requestError instanceof Error ? requestError.message : '移出成员失败'); } finally { setLoading(false); } };
  const disableUser = async () => { const userId = memberForm.getFieldValue('userId') as string; if (!userId) return message.warning('请先填写 userId'); try { setLoading(true); await sharedApi.disableUser(userId); message.success('用户账号已禁用'); } catch (requestError) { setError(requestError instanceof Error ? requestError.message : '禁用用户失败'); } finally { setLoading(false); } };

  return <Space direction="vertical" size={20} className="full-width"><div className="page-heading"><div className="page-heading-copy"><Typography.Title level={2}>{title}</Typography.Title><Typography.Text>{description}</Typography.Text></div><div className="page-actions"><Button icon={<ReloadOutlined />} onClick={load} loading={loading}>刷新组织树</Button></div></div>{error && <Alert type="error" showIcon message={error} closable onClose={() => setError('')} />}{tenant && <Card title="租户信息与续费" style={{ marginBottom: 20 }}><Space size={18} wrap><Typography.Text>名称：{tenant.name}</Typography.Text><Typography.Text>类型：{tenant.type === 1 ? '企业版' : '个人版'}</Typography.Text><Tag color={tenantStatusLabels[tenant.status].color}>{tenantStatusLabels[tenant.status].label}</Tag><Typography.Text>到期时间：{tenant.expireAt || '-'}</Typography.Text>{isHqAdmin ? <Space><DatePicker showTime onChange={(value) => setRenewAt(value)} placeholder="选择新的到期时间" /><Button type="primary" onClick={renew} loading={loading}>续费并恢复</Button></Space> : <Typography.Text type="secondary">仅总部管理员（HQ_ADMIN）可续费</Typography.Text>}</Space><Typography.Paragraph type="secondary" style={{ marginBottom: 0, marginTop: 12 }}>对应接口：PATCH /api/tenants/:tenantId/renew；续费会同时把停用或到期的租户恢复为正常状态。</Typography.Paragraph></Card>}<StoreQuotaDrawer store={quotaStore} onClose={() => setQuotaStore(null)} /><Row gutter={20}><Col span={10}><Card title="当前租户组织树" extra={selectedOrg && <Button type="link" icon={<SaveOutlined />} onClick={rename}>重命名</Button>}><Tree treeData={treeData(orgs, setQuotaStore)} selectedKeys={selectedOrgId ? [selectedOrgId] : []} onSelect={(keys) => setSelectedOrgId(String(keys[0] || ''))} defaultExpandAll showLine /><Typography.Text type="secondary">组织树接口会返回当前租户全部节点，范围裁剪由后端当前实现决定。</Typography.Text></Card><Card title="创建组织节点"><Form form={newOrgForm} layout="vertical" onFinish={createOrg} initialValues={{ type: 3, parentId: selectedOrgId || undefined }}><Form.Item name="type" label="组织类型" rules={[{ required: true }]}><Select options={[1, 2, 3].map((value) => ({ value, label: orgLabels[value as OrgNode['type']] }))} /></Form.Item><Form.Item name="name" label="名称" rules={[{ required: true, whitespace: true, message: '请输入组织名称' }]}><Input placeholder="例如：城南门店" /></Form.Item><Form.Item name="parentId" label="上级组织 ID"><InputNumber className="full-input" min={0} placeholder="不填表示顶级节点" /></Form.Item><Button type="primary" htmlType="submit" icon={<PlusOutlined />} loading={loading}>创建组织</Button></Form></Card></Col><Col span={14}><Card title="成员和角色操作"><Alert type="info" showIcon message="当前后端尚未提供成员列表接口" description="请从已有成员关系数据取得 roleId/userId 后执行移除、禁用和授权；所有操作仍由后端管理员权限校验。" style={{ marginBottom: 18 }} /><Form form={memberForm} layout="vertical" onFinish={submitMemberAction} initialValues={{ orgId: selectedOrgId, role: 'STAFF', dataScope: 4 }}><Row gutter={12}><Col span={12}><Form.Item name="roleId" label="roleId（更新/移除关系）"><Input placeholder="user_org_role 关系 ID" /></Form.Item></Col><Col span={12}><Form.Item name="userId" label="userId（授权/禁用账号）"><Input placeholder="用户 ID" /></Form.Item></Col></Row><Row gutter={12}><Col span={12}><Form.Item name="orgId" label="组织 ID" rules={[{ required: true }]}><Input placeholder={selectedOrgId || '目标组织 ID'} /></Form.Item></Col><Col span={12}><Form.Item name="role" label="角色" rules={[{ required: true }]}><Select options={roleOptions.map((value) => ({ value, label: value }))} /></Form.Item></Col></Row><Form.Item name="dataScope" label="数据范围" rules={[{ required: true }]}><Select options={scopeOptions} /></Form.Item><Space wrap><Button type="primary" htmlType="submit" loading={loading}>授予 / 更新角色</Button><Button danger onClick={removeMember} loading={loading}>移出成员关系</Button><Button danger ghost onClick={disableUser} loading={loading}>禁用用户账号</Button></Space></Form></Card></Col></Row></Space>;
}
