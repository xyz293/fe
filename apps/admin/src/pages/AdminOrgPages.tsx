import { Button, Card, Form, Input, InputNumber, Modal, Popconfirm, Space, Table, Tag, Typography, message } from 'antd';
import { EditOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { useEffect, useState } from 'react';
import type { AdminMemberListQuery, CreateStoreRequest, StoreAccountSummary, UpdateStoreParentRequest, UserAccount } from '@xiaoa/share/types';
import { sharedApi } from '../services/sharedApi';

interface PageProps { title: string; description: string; }
function formatDate(value?: string | null) { return value ? new Date(value).toLocaleString('zh-CN') : '-'; }
function PageHeading({ title, description, action }: PageProps & { action?: React.ReactNode }) { return <div className="page-heading"><div className="page-heading-copy"><Typography.Title level={2}>{title}</Typography.Title><Typography.Text>{description}</Typography.Text></div><div className="page-actions">{action}</div></div>; }

// ===== 门店管理 =====
function StoreCreateModal({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess: () => void }) {
  const [form] = Form.useForm<CreateStoreRequest>(); const [loading, setLoading] = useState(false);
  useEffect(() => { if (open) form.resetFields(); }, [open, form]);
  const submit = async () => { try { const values = await form.validateFields(); setLoading(true); await sharedApi.createStore(values); message.success('门店已创建'); onClose(); onSuccess(); } catch (e) { if (e instanceof Error) message.error(e.message); } finally { setLoading(false); } };
  return <Modal title="创建门店" open={open} onCancel={onClose} onOk={submit} confirmLoading={loading} destroyOnClose><Form form={form} layout="vertical"><Form.Item name="name" label="门店名称" rules={[{ required: true }]}><Input /></Form.Item><Form.Item name="parentId" label="上级门店 ID"><InputNumber className="full-input" /></Form.Item><Form.Item name="address" label="地址"><Input /></Form.Item><Form.Item name="contactPhone" label="联系电话"><Input /></Form.Item></Form></Modal>;
}
function StoreParentModal({ store, open, onClose, onSuccess }: { store: StoreAccountSummary | null; open: boolean; onClose: () => void; onSuccess: () => void }) {
  const [form] = Form.useForm<UpdateStoreParentRequest>(); const [loading, setLoading] = useState(false);
  useEffect(() => { if (open) form.resetFields(); }, [open, form]);
  const submit = async () => { try { const values = await form.validateFields(); setLoading(true); await sharedApi.updateStoreParent(store!.storeId, values); message.success('上级门店已更新'); onClose(); onSuccess(); } catch (e) { if (e instanceof Error) message.error(e.message); } finally { setLoading(false); } };
  return <Modal title="修改上级门店" open={open} onCancel={onClose} onOk={submit} confirmLoading={loading} destroyOnClose><Typography.Text>当前门店：{store?.storeName}</Typography.Text><Form form={form} layout="vertical" style={{ marginTop: 12 }}><Form.Item name="parentId" label="新上级门店 ID" rules={[{ required: true }]}><InputNumber className="full-input" /></Form.Item></Form></Modal>;
}
export function StoreAdminPage({ title, description }: PageProps) {
  const [stores, setStores] = useState<StoreAccountSummary[]>([]); const [loading, setLoading] = useState(false); const [createOpen, setCreateOpen] = useState(false); const [parentStore, setParentStore] = useState<StoreAccountSummary | null>(null); const [parentOpen, setParentOpen] = useState(false); const { error } = { error: '' };
  const load = () => { setLoading(true); sharedApi.getStoreSummaries().then(setStores).catch(() => message.error('门店列表加载失败')).finally(() => setLoading(false)); }; useEffect(load, []);
  return <Space direction="vertical" size={20} className="full-width"><PageHeading title={title} description={description} action={<Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>创建门店</Button>} />{error && <Typography.Text type="danger">{error}</Typography.Text>}<Card><div className="table-toolbar"><Typography.Text type="secondary">共 {stores.length} 家门店</Typography.Text><Button icon={<ReloadOutlined />} onClick={load}>刷新</Button></div><Table loading={loading} rowKey={(r) => String(r.storeId)} dataSource={stores} pagination={{ pageSize: 10 }} columns={[{ title: '门店名称', dataIndex: 'storeName' }, { title: '上级门店', dataIndex: 'parentName', render: (v) => v || '-' }, { title: '成员数', dataIndex: 'memberCount', render: (v) => v ?? 0 }, { title: '作品数', dataIndex: 'workCount', render: (v) => v ?? 0 }, { title: '状态', dataIndex: 'status', render: (v) => <Tag color={v === 1 ? 'green' : 'default'}>{v === 1 ? '正常' : '停用'}</Tag> }, { title: '创建时间', dataIndex: 'createdAt', render: formatDate }, { title: '操作', render: (_, s) => <Button type="link" icon={<EditOutlined />} onClick={() => { setParentStore(s); setParentOpen(true); }}>改上级</Button> }]} /></Card><StoreCreateModal open={createOpen} onClose={() => setCreateOpen(false)} onSuccess={load} /><StoreParentModal store={parentStore} open={parentOpen} onClose={() => setParentOpen(false)} onSuccess={load} /></Space>;
}

// ===== 会员管理 =====
export function MemberAdminPage({ title, description }: PageProps) {
  const [members, setMembers] = useState<UserAccount[]>([]); const [total, setTotal] = useState(0); const [loading, setLoading] = useState(false); const [query, setQuery] = useState<AdminMemberListQuery>({ pageNo: 1, pageSize: 20 });
  const load = () => { setLoading(true); sharedApi.getAdminMembers(query).then((result) => { setMembers(result.list); setTotal(result.total); }).catch(() => message.error('会员列表加载失败')).finally(() => setLoading(false)); }; useEffect(load, [query]);
  return <Space direction="vertical" size={20} className="full-width"><PageHeading title={title} description={description} action={<Button icon={<ReloadOutlined />} onClick={load}>刷新</Button>} /><Card><div className="table-toolbar"><Input.Search placeholder="按组织 ID 筛选" allowClear style={{ width: 220 }} onSearch={(v) => setQuery((old) => ({ ...old, orgId: v || undefined, pageNo: 1 }))} /><Typography.Text type="secondary">共 {total} 位会员</Typography.Text></div><Table loading={loading} rowKey={(r) => String(r.id)} dataSource={members} pagination={{ current: query.pageNo, pageSize: query.pageSize, total, onChange: (pageNo, pageSize) => setQuery((old) => ({ ...old, pageNo, pageSize })) }} columns={[{ title: 'ID', dataIndex: 'id' }, { title: '昵称', dataIndex: 'nickname', render: (v) => v || '-' }, { title: '手机号', dataIndex: 'phone', render: (v) => v || '-' }, { title: 'OpenID', dataIndex: 'openid', ellipsis: true, render: (v) => v || '-' }, { title: '状态', dataIndex: 'status', render: (v) => <Tag color={v === 1 ? 'green' : 'default'}>{v === 1 ? '正常' : '禁用'}</Tag> }, { title: '注册时间', dataIndex: 'createdAt', render: formatDate }]} /></Card></Space>;
}
