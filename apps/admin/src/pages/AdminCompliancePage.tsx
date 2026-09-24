import { Alert, Button, Card, Col, Form, Input, InputNumber, Modal, Popconfirm, Row, Space, Switch, Table, Tabs, Tag, Typography, message } from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { useEffect, useState } from 'react';
import type { AuditConfig, ComplianceWord, UpdateAuditConfigRequest, UpsertComplianceWordRequest } from '@xiaoa/share/types';
import { sharedApi } from '../services/sharedApi';

interface PageProps { title: string; description: string; }
function formatDate(value?: string | null) { return value ? new Date(value).toLocaleString('zh-CN') : '-'; }
function PageHeading({ title, description, action }: PageProps & { action?: React.ReactNode }) { return <div className="page-heading"><div className="page-heading-copy"><Typography.Title level={2}>{title}</Typography.Title><Typography.Text>{description}</Typography.Text></div><div className="page-actions">{action}</div></div>; }

// ===== 合规词库 =====
function WordDrawer({ open, word, onClose, onSuccess }: { open: boolean; word: ComplianceWord | null; onClose: () => void; onSuccess: () => void }) {
  const [form] = Form.useForm<UpsertComplianceWordRequest>(); const [loading, setLoading] = useState(false);
  useEffect(() => { if (open) form.setFieldsValue(word ? { id: word.id, word: word.word, level: word.level, category: word.category, replacement: word.replacement } : {}); }, [open, word, form]);
  const submit = async () => { try { const values = await form.validateFields(); setLoading(true); await sharedApi.upsertComplianceWord(values); message.success(word ? '合规词已更新' : '合规词已新增'); onClose(); onSuccess(); } catch (e) { if (e instanceof Error) message.error(e.message); } finally { setLoading(false); } };
  return <Modal title={word ? '编辑合规词' : '新增合规词'} open={open} onCancel={onClose} onOk={submit} confirmLoading={loading} destroyOnClose><Form form={form} layout="vertical"><Form.Item name="word" label="敏感词" rules={[{ required: true }]}><Input /></Form.Item><Form.Item name="level" label="风险级别"><Input placeholder="如 高 / 中 / 低" /></Form.Item><Form.Item name="category" label="分类"><Input placeholder="如 广告法 / 品牌词" /></Form.Item><Form.Item name="replacement" label="替换为"><Input placeholder="可留空表示仅拦截" /></Form.Item></Form></Modal>;
}
function ComplianceWordPanel() {
  const [words, setWords] = useState<ComplianceWord[]>([]); const [loading, setLoading] = useState(false); const [open, setOpen] = useState(false); const [editing, setEditing] = useState<ComplianceWord | null>(null);
  const load = () => { setLoading(true); sharedApi.getComplianceWords().then(setWords).catch(() => message.error('合规词加载失败')).finally(() => setLoading(false)); }; useEffect(load, []);
  return <Card><div className="table-toolbar"><Typography.Text type="secondary">共 {words.length} 条</Typography.Text><Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(null); setOpen(true); }}>新增</Button></div><Table loading={loading} rowKey={(r) => String(r.id)} dataSource={words} pagination={{ pageSize: 10 }} columns={[{ title: '敏感词', dataIndex: 'word' }, { title: '风险级别', dataIndex: 'level', render: (v) => <Tag color={v === '高' ? 'red' : v === '中' ? 'gold' : 'default'}>{v || '-'}</Tag> }, { title: '分类', dataIndex: 'category', render: (v) => v || '-' }, { title: '替换为', dataIndex: 'replacement', render: (v) => v || '-' }, { title: '状态', dataIndex: 'enabled', render: (v) => <Tag color={v === 1 || v === true ? 'green' : 'default'}>{v === 1 || v === true ? '启用' : '停用'}</Tag> }, { title: '更新时间', dataIndex: 'updatedAt', render: formatDate }, { title: '操作', render: (_, w) => <Space><Button type="link" icon={<EditOutlined />} onClick={() => { setEditing(w); setOpen(true); }}>编辑</Button><Popconfirm title="停用该合规词？" onConfirm={() => sharedApi.disableComplianceWord(w.id).then(load).catch(() => message.error('停用失败'))}><Button type="link" danger icon={<DeleteOutlined />}>停用</Button></Popconfirm></Space> }]} /><WordDrawer open={open} word={editing} onClose={() => setOpen(false)} onSuccess={load} /></Card>;
}

// ===== 审核配置（按组织） =====
function AuditConfigPanel() {
  const [orgId, setOrgId] = useState<string>(''); const [config, setConfig] = useState<AuditConfig | null>(null); const [loading, setLoading] = useState(false); const [saving, setSaving] = useState(false); const [form] = Form.useForm<UpdateAuditConfigRequest>();
  const query = async () => { if (!orgId) { message.warning('请输入组织 ID'); return; } setLoading(true); try { const cfg = await sharedApi.getAuditConfig(orgId); setConfig(cfg); form.setFieldsValue({ autoReview: cfg.autoReview, sensitiveFilter: cfg.sensitiveFilter, proofRequired: cfg.proofRequired }); } catch (e) { if (e instanceof Error) message.error(e.message); } finally { setLoading(false); } };
  const save = async () => { if (!orgId) return; try { const values = await form.validateFields(); setSaving(true); await sharedApi.updateAuditConfig(orgId, values); message.success('审核配置已更新'); } catch (e) { if (e instanceof Error) message.error(e.message); } finally { setSaving(false); } };
  return <Card><Alert type="info" showIcon style={{ marginBottom: 16 }} message="开启审核后，新作品需审核通过才可发布；已生成的作品不受影响，存量可发布作品照常发布。" /><Space style={{ marginBottom: 16 }}><InputNumber placeholder="组织 ID" value={orgId ? Number(orgId) : undefined} onChange={(v) => setOrgId(v ? String(v) : '')} style={{ width: 160 }} /><Button type="primary" loading={loading} onClick={query}>查询配置</Button></Space>{config && <Form form={form} layout="vertical" style={{ maxWidth: 480 }}><Typography.Text type="secondary">组织 ID：{config.orgId}（更新于 {formatDate(config.updatedAt)}）</Typography.Text><Row gutter={16} style={{ marginTop: 12 }}><Col span={24}><Form.Item name="autoReview" label="自动审核" valuePropName="checked"><Switch checkedChildren="开" unCheckedChildren="关" /></Form.Item></Col><Col span={24}><Form.Item name="sensitiveFilter" label="敏感词过滤" valuePropName="checked"><Switch checkedChildren="开" unCheckedChildren="关" /></Form.Item></Col><Col span={24}><Form.Item name="proofRequired" label="发布需凭证" valuePropName="checked"><Switch checkedChildren="开" unCheckedChildren="关" /></Form.Item></Col></Row><Button type="primary" loading={saving} onClick={save}>保存配置</Button></Form>}{!config && <Typography.Text type="secondary">输入组织 ID 后查询其审核配置。</Typography.Text>}</Card>;
}

export function ComplianceAdminPage({ title, description }: PageProps) {
  return <Space direction="vertical" size={20} className="full-width"><PageHeading title={title} description={description} action={<Button icon={<ReloadOutlined />} onClick={() => window.location.reload()}>刷新</Button>} /><Tabs items={[{ key: 'words', label: '合规词库', children: <ComplianceWordPanel /> }, { key: 'audit', label: '审核配置', children: <AuditConfigPanel /> }]} /></Space>;
}
