import { Alert, Button, Card, Form, Input, InputNumber, Modal, Popconfirm, Select, Space, Switch, Table, Tabs, Tag, Typography, message } from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { useEffect, useState } from 'react';
import type { AuditConfig, ComplianceWord, UpdateAuditConfigRequest, UpsertComplianceWordRequest } from '@xiaoa/share/types';
import { sharedApi } from '../services/sharedApi';

interface PageProps { title: string; description: string; }
function formatDate(value?: string | null) { return value ? new Date(value).toLocaleString('zh-CN') : '-'; }
function PageHeading({ title, description, action }: PageProps & { action?: React.ReactNode }) { return <div className="page-heading"><div className="page-heading-copy"><Typography.Title level={2}>{title}</Typography.Title><Typography.Text>{description}</Typography.Text></div><div className="page-actions">{action}</div></div>; }

const levelLabels: Record<ComplianceWord['level'], string> = { 1: '替换', 2: '拒绝' };
const levelOptions = [
  { value: 1, label: '替换（静默替换后继续生成）' },
  { value: 2, label: '拒绝（直接拦截生成）' },
];

// ===== 合规词库（文档 §2.5.1：仅 HQ_ADMIN；列表只返回启用中的词，生成时匹配大小写不敏感） =====
function WordDrawer({ open, word, onClose, onSuccess }: { open: boolean; word: ComplianceWord | null; onClose: () => void; onSuccess: () => void }) {
  const [form] = Form.useForm<UpsertComplianceWordRequest>(); const [loading, setLoading] = useState(false);
  useEffect(() => { if (open) form.setFieldsValue(word ? { id: word.id, word: word.word, level: word.level, replacement: word.replacement ?? undefined } : { level: 1 }); }, [open, word, form]);
  const submit = async () => { try { const values = await form.validateFields(); setLoading(true); await sharedApi.upsertComplianceWord(values); message.success(word ? '合规词已更新' : '合规词已新增'); onClose(); onSuccess(); } catch (e) { if (e instanceof Error) message.error(e.message); } finally { setLoading(false); } };
  return <Modal title={word ? '编辑合规词' : '新增合规词'} open={open} onCancel={onClose} onOk={submit} confirmLoading={loading} destroyOnClose><Form form={form} layout="vertical"><Form.Item name="word" label="敏感词" rules={[{ required: true }]}><Input /></Form.Item><Form.Item name="level" label="处置级别" rules={[{ required: true }]}><Select options={levelOptions} /></Form.Item><Form.Item noStyle shouldUpdate={(prev, next) => prev.level !== next.level}>{({ getFieldValue }) => getFieldValue('level') === 1 && (<Form.Item name="replacement" label="替换为（缺省按替换为空串处理）"><Input placeholder="如：臻品（替换“最便宜”）" /></Form.Item>)}</Form.Item></Form></Modal>;
}
function ComplianceWordPanel() {
  const [words, setWords] = useState<ComplianceWord[]>([]); const [loading, setLoading] = useState(false); const [open, setOpen] = useState(false); const [editing, setEditing] = useState<ComplianceWord | null>(null);
  const load = () => { setLoading(true); sharedApi.getComplianceWords().then(setWords).catch(() => message.error('合规词加载失败')).finally(() => setLoading(false)); }; useEffect(load, []);
  return <Card><div className="table-toolbar"><Typography.Text type="secondary">共 {words.length} 条启用中的合规词（level=1 替换 / level=2 拒绝并报 4001）</Typography.Text><Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(null); setOpen(true); }}>新增</Button></div><Table loading={loading} rowKey={(r) => String(r.id)} dataSource={words} pagination={{ pageSize: 10 }} columns={[{ title: '敏感词', dataIndex: 'word' }, { title: '处置级别', dataIndex: 'level', width: 120, render: (v: ComplianceWord['level']) => <Tag color={v === 2 ? 'red' : 'gold'}>{levelLabels[v] ?? v}</Tag> }, { title: '替换为', dataIndex: 'replacement', render: (v) => v || (v === '' ? '（空串）' : '-') }, { title: '更新时间', dataIndex: 'updatedAt', render: formatDate }, { title: '操作', render: (_, w) => <Space><Button type="link" icon={<EditOutlined />} onClick={() => { setEditing(w); setOpen(true); }}>编辑</Button><Popconfirm title="停用后该词不再拦截生成，确认？" onConfirm={() => sharedApi.disableComplianceWord(w.id).then(load).catch((e) => message.error(e instanceof Error ? e.message : '停用失败'))}><Button type="link" danger icon={<DeleteOutlined />}>停用</Button></Popconfirm></Space> }]} /><WordDrawer open={open} word={editing} onClose={() => setOpen(false)} onSuccess={load} /></Card>;
}

// ===== 作品审核开关（文档 §2.5.2：orgId=0 为品牌级默认，门店未配置时自动回退品牌级） =====
function AuditConfigPanel() {
  const [orgId, setOrgId] = useState<string>(''); const [config, setConfig] = useState<AuditConfig | null>(null); const [loading, setLoading] = useState(false); const [saving, setSaving] = useState(false); const [form] = Form.useForm<UpdateAuditConfigRequest>();
  const query = async () => { if (!orgId) { message.warning('请输入组织 ID（0 表示品牌级默认）'); return; } setLoading(true); try { const cfg = await sharedApi.getAuditConfig(orgId); setConfig(cfg); form.setFieldsValue({ enabled: cfg.enabled }); } catch (e) { if (e instanceof Error) message.error(e.message); } finally { setLoading(false); } };
  const save = async () => { if (!orgId) return; try { const values = await form.validateFields(); setSaving(true); await sharedApi.updateAuditConfig(orgId, values); message.success('审核开关已更新（只影响之后的作品）'); } catch (e) { if (e instanceof Error) message.error(e.message); } finally { setSaving(false); } };
  return <Card><Alert type="info" showIcon style={{ marginBottom: 16 }} message="开启后，之后生成成功的作品进入审核队列；关闭则直接落草稿。开关只影响之后的作品，不改存量；门店未单独配置时自动回退品牌级（orgId=0）。" /><Space style={{ marginBottom: 16 }}><InputNumber placeholder="组织 ID（0=品牌级默认）" value={orgId ? Number(orgId) : undefined} onChange={(v) => setOrgId(v ? String(v) : '')} style={{ width: 220 }} min={0} /><Button type="primary" loading={loading} onClick={query}>查询配置</Button></Space>{config && <Form form={form} layout="vertical" style={{ maxWidth: 480 }}><Typography.Text type="secondary">组织 ID：{String(config.orgId)}</Typography.Text><Form.Item name="enabled" label="作品审核开关" valuePropName="checked" style={{ marginTop: 12 }}><Switch checkedChildren="开（生成后待审）" unCheckedChildren="关（直接草稿）" /></Form.Item><Button type="primary" loading={saving} onClick={save}>保存配置</Button></Form>}{!config && <Typography.Text type="secondary">输入组织 ID 后查询其审核开关。</Typography.Text>}</Card>;
}

export function ComplianceAdminPage({ title, description }: PageProps) {
  return <Space direction="vertical" size={20} className="full-width"><PageHeading title={title} description={description} action={<Button icon={<ReloadOutlined />} onClick={() => window.location.reload()}>刷新</Button>} /><Tabs items={[{ key: 'words', label: '合规词库', children: <ComplianceWordPanel /> }, { key: 'audit', label: '审核开关', children: <AuditConfigPanel /> }]} /></Space>;
}
