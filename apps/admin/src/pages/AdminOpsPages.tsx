import { Button, Card, Col, Descriptions, Drawer, Form, Input, Modal, Progress, Row, Select, Space, Statistic, Table, Tag, Typography, message } from 'antd';
import { DownloadOutlined, EyeOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { useEffect, useState } from 'react';
import type { CreateExportRequest, DashboardOverview, DashboardTrendPoint, ExportTask, ExportType } from '@xiaoa/share/types';
import { sharedApi } from '../services/sharedApi';

interface PageProps { title: string; description: string; }
function formatDate(value?: string | null) { return value ? new Date(value).toLocaleString('zh-CN') : '-'; }
function PageHeading({ title, description, action }: PageProps & { action?: React.ReactNode }) { return <div className="page-heading"><div className="page-heading-copy"><Typography.Title level={2}>{title}</Typography.Title><Typography.Text>{description}</Typography.Text></div><div className="page-actions">{action}</div></div>; }

const exportTypeLabels: Record<ExportType, string> = { 1: '消耗明细', 2: '充值记录', 3: '任务', 4: '产出' };
const exportTypeOptions = (Object.keys(exportTypeLabels) as unknown as ExportType[]).map((value) => ({ value, label: exportTypeLabels[value] }));
const exportStatusLabels: Record<ExportTask['status'], string> = { 0: '处理中', 1: '已完成', 2: '失败' };
const exportStatusColors: Record<ExportTask['status'], string> = { 0: 'processing', 1: 'success', 2: 'error' };
function exportStatusTag(status: ExportTask['status']) { return <Tag color={exportStatusColors[status]}>{exportStatusLabels[status] ?? status}</Tag>; }

// ===== 运营总览看板（文档 §2.3：经营概览 + 近 7 天趋势；REGION_ADMIN 自动只统计本区域） =====
export function OperationDashboardPage({ title, description }: PageProps) {
  const [overview, setOverview] = useState<DashboardOverview | null>(null); const [trend, setTrend] = useState<DashboardTrendPoint[]>([]); const [loading, setLoading] = useState(false);
  const load = () => { setLoading(true); Promise.all([sharedApi.getAdminDashboardOverview(), sharedApi.getAdminDashboardTrend()]).then(([o, t]) => { setOverview(o); setTrend(t); }).catch(() => message.error('运营看板加载失败')).finally(() => setLoading(false)); }; useEffect(load, []);
  const maxWorks = Math.max(1, ...trend.map((p) => p.works));
  const maxPublishes = Math.max(1, ...trend.map((p) => p.publishes));
  const metrics = [
    { title: '活跃门店（近 7 天）', value: overview?.activeStores, suffix: '家' },
    { title: '本周新增作品', value: overview?.weeklyWorks, suffix: '件' },
    { title: '本周发布', value: overview?.weeklyPublishes, suffix: '次' },
    { title: '额度余额合计', value: overview?.totalQuota, suffix: '点' },
    { title: '本周消耗额度', value: overview?.usedQuota, suffix: '点' },
  ];
  return <Space direction="vertical" size={20} className="full-width"><PageHeading title={title} description={description} action={<Button icon={<ReloadOutlined />} loading={loading} onClick={load}>刷新</Button>} /><Row gutter={16}>{metrics.map((m) => <Col key={m.title} xs={12} sm={8} md={6} lg={4}><Card><Statistic title={m.title} value={m.value ?? 0} suffix={m.suffix} /></Card></Col>)}</Row><Card title="作品与发布趋势（近 7 天，无数据补 0）"><Typography.Text type="secondary">看板数据服务端有缓存，短时变动不会立即反映</Typography.Text>{trend.length === 0 ? <Typography.Text type="secondary">暂无趋势数据</Typography.Text> : trend.map((p) => (
    <div key={p.date} style={{ marginBottom: 10 }}>
      <Typography.Text style={{ width: 100, display: 'inline-block' }}>{p.date}</Typography.Text>
      <div style={{ display: 'inline-block', width: 'calc(100% - 110px)', verticalAlign: 'middle' }}>
        <Progress percent={Math.round((p.works / maxWorks) * 100)} format={() => `作品 ${p.works} 件`} size="small" />
        <Progress percent={Math.round((p.publishes / maxPublishes) * 100)} format={() => `发布 ${p.publishes} 次`} size="small" strokeColor="#7a9b76" />
      </div>
    </div>
  ))}</Card></Space>;
}

// ===== 导出任务（文档 §2.6：创建即异步执行，同租户进行中最多 3 个；轮询列表看进度） =====
function ExportCreateModal({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess: () => void }) {
  const [form] = Form.useForm<CreateExportRequest>(); const [loading, setLoading] = useState(false);
  useEffect(() => { if (open) form.resetFields(); }, [open, form]);
  const submit = async () => { try { const values = await form.validateFields(); setLoading(true); await sharedApi.createExportTask(values); message.success('导出任务已创建，稍后在列表查看进度'); onClose(); onSuccess(); } catch (e) { if (e instanceof Error) message.error(e.message); } finally { setLoading(false); } };
  return <Modal title="创建导出任务" open={open} onCancel={onClose} onOk={submit} confirmLoading={loading} destroyOnClose><Form form={form} layout="vertical"><Form.Item name="exportType" label="导出类型" rules={[{ required: true, message: '请选择导出类型' }]}><Select options={exportTypeOptions} placeholder="消耗明细 / 充值记录 / 任务 / 产出" /></Form.Item><Form.Item name="queryParams" label="查询条件（JSON 字符串，可选）" rules={[{ validator: (_, value) => { if (!value) return Promise.resolve(); try { JSON.parse(value); return Promise.resolve(); } catch { return Promise.reject(new Error('必须是合法 JSON，例如 {"from":"2026-09-01","to":"2026-09-30"}')); } } }]}><Input.TextArea rows={3} placeholder='{"from":"2026-09-01","to":"2026-09-30"}' /></Form.Item></Form></Modal>;
}
function ExportDetailDrawer({ task, open, onClose }: { task: ExportTask | null; open: boolean; onClose: () => void }) {
  // local:// 是后端本地占位协议（OSS 接入前），浏览器无法直接下载（文档 §3.5）
  const downloadable = Boolean(task?.fileUrl && !task.fileUrl.startsWith('local://'));
  return <Drawer title="导出任务详情" width={480} open={open} onClose={onClose}>{task && <Descriptions bordered column={1} size="small"><Descriptions.Item label="任务 ID">{String(task.id)}</Descriptions.Item><Descriptions.Item label="类型">{exportTypeLabels[task.exportType] ?? task.exportType}</Descriptions.Item><Descriptions.Item label="状态">{exportStatusTag(task.status)}</Descriptions.Item><Descriptions.Item label="查询条件">{task.queryParams || '-'}</Descriptions.Item><Descriptions.Item label="创建时间">{formatDate(task.createdAt)}</Descriptions.Item><Descriptions.Item label="完成时间">{formatDate(task.finishedAt)}</Descriptions.Item>{task.failReason && <Descriptions.Item label="失败原因">{task.failReason}</Descriptions.Item>}<Descriptions.Item label="下载链接">{downloadable ? <Button type="link" icon={<DownloadOutlined />} href={task.fileUrl || undefined} target="_blank">下载文件</Button> : '生成中或本地占位（OSS 接入后可下载）'}</Descriptions.Item></Descriptions>}</Drawer>;
}
export function ExportAdminPage({ title, description }: PageProps) {
  const [tasks, setTasks] = useState<ExportTask[]>([]); const [loading, setLoading] = useState(false); const [createOpen, setCreateOpen] = useState(false); const [detail, setDetail] = useState<ExportTask | null>(null); const [detailOpen, setDetailOpen] = useState(false);
  const load = () => { setLoading(true); sharedApi.getExportTasks().then(setTasks).catch(() => message.error('导出任务列表加载失败')).finally(() => setLoading(false)); }; useEffect(load, []);
  useEffect(() => {
    // 存在处理中的任务时，8 秒轮询一次进度（文档 §2.6.2 建议）
    if (!tasks.some((t) => t.status === 0)) return;
    const timer = setInterval(load, 8000);
    return () => clearInterval(timer);
  }, [tasks]);
  const viewDetail = (task: ExportTask) => { sharedApi.getExportTask(task.id).then((full) => { setDetail(full); setDetailOpen(true); }).catch(() => { setDetail(task); setDetailOpen(true); }); };
  return <Space direction="vertical" size={20} className="full-width"><PageHeading title={title} description={description} action={<Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>创建导出</Button>} /><Card><div className="table-toolbar"><Typography.Text type="secondary">共 {tasks.length} 个任务（进行中最多 3 个）</Typography.Text><Button icon={<ReloadOutlined />} onClick={load}>刷新</Button></div><Table loading={loading} rowKey={(r) => String(r.id)} dataSource={tasks} pagination={{ pageSize: 10 }} columns={[{ title: '任务 ID', dataIndex: 'id', render: (v) => String(v) }, { title: '类型', dataIndex: 'exportType', render: (v: ExportType) => exportTypeLabels[v] ?? v }, { title: '状态', dataIndex: 'status', render: (v: ExportTask['status']) => exportStatusTag(v) }, { title: '失败原因', dataIndex: 'failReason', ellipsis: true, render: (v) => v || '-' }, { title: '创建时间', dataIndex: 'createdAt', render: formatDate }, { title: '完成时间', dataIndex: 'finishedAt', render: formatDate }, { title: '操作', render: (_, t) => <Space><Button type="link" icon={<EyeOutlined />} onClick={() => viewDetail(t)}>详情</Button>{t.status === 1 && t.fileUrl && !t.fileUrl.startsWith('local://') && <Button type="link" icon={<DownloadOutlined />} href={t.fileUrl} target="_blank">下载</Button>}</Space> }]} /></Card><ExportCreateModal open={createOpen} onClose={() => setCreateOpen(false)} onSuccess={load} /><ExportDetailDrawer task={detail} open={detailOpen} onClose={() => setDetailOpen(false)} /></Space>;
}
