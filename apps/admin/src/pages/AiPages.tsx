import { Alert, Button, Card, Col, Drawer, Form, Input, Modal, Row, Select, Space, Table, Tag, Typography, message } from 'antd';
import { CopyOutlined, EyeOutlined, PlusOutlined, ReloadOutlined, RollbackOutlined } from '@ant-design/icons';
import { useEffect, useMemo, useState } from 'react';
import type { AIGenerationType, MediaTask, MediaTaskStatus, PromptTemplate, PromptTemplateRequest } from '@xiaoa/share/types';
import { sharedApi } from '../services/sharedApi';

const sceneLabels: Record<AIGenerationType, string> = { IMAGE: '图文', VIDEO: '视频' };
const sceneOptions = [{ value: 'IMAGE', label: '图文' }, { value: 'VIDEO', label: '视频' }];

const taskStatusLabels: Record<MediaTaskStatus, string> = {
  PENDING: '排队中',
  PROCESSING: '生成中',
  SUBMITTED: '已提交模型',
  POLLING: '轮询模型中',
  SUCCESS: '成功',
  FAILED: '失败',
};
const taskStatusColors: Record<MediaTaskStatus, string> = {
  PENDING: 'default',
  PROCESSING: 'processing',
  SUBMITTED: 'processing',
  POLLING: 'processing',
  SUCCESS: 'success',
  FAILED: 'error',
};

/** 文档 §1.5.2 可用占位符 */
const promptVariables = '{{platform}} {{style}} {{productName}} {{userInput}}';

function formatDate(value?: string | null) { return value ? new Date(value).toLocaleString('zh-CN') : '-'; }
function taskStatusTag(status: MediaTaskStatus) { return <Tag color={taskStatusColors[status]}>{taskStatusLabels[status] || status}</Tag>; }
function templateStatusTag(status: 0 | 1) { return <Tag color={status === 1 ? 'green' : 'default'}>{status === 1 ? '生效中' : '历史版本'}</Tag>; }
function PageHeading({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) { return <div className="page-heading"><div className="page-heading-copy"><Typography.Title level={2}>{title}</Typography.Title><Typography.Text>{description}</Typography.Text></div><div className="page-actions">{action}</div></div>; }

/**
 * Prompt 模板编辑抽屉。
 * 文档 §1.5.2：保存接口 PUT /api/admin/prompt-template，id=null 即新增版本（同一 scene 旧版本全部停用）；
 * 旧版本不支持编辑，只能回滚，因此这里始终以"新增版本"方式提交。
 */
function PromptEditor({ open, base, onClose, onSuccess }: { open: boolean; base: PromptTemplate | null; onClose: () => void; onSuccess: () => void }) {
  const [form] = Form.useForm<PromptTemplateRequest>(); const [preview, setPreview] = useState(''); const [loading, setLoading] = useState(false);
  useEffect(() => {
    const template = base?.template || '';
    form.setFieldsValue({ scene: base?.scene || 'IMAGE', template });
    setPreview(template);
  }, [form, base, open]);
  const submit = async (values: PromptTemplateRequest) => {
    try {
      setLoading(true);
      await sharedApi.createPromptTemplate({ ...values, id: null });
      message.success('已保存为新版本，同场景旧版本自动停用');
      onClose(); onSuccess();
    } catch (error) { if (error instanceof Error) message.error(error.message); } finally { setLoading(false); }
  };
  const renderPreview = (content: string) => content
    .replace(/\{\{style\}\}/g, '轻奢国风')
    .replace(/\{\{platform\}\}/g, '朋友圈')
    .replace(/\{\{productName\}\}/g, '520 限定对戒')
    .replace(/\{\{userInput\}\}/g, '突出限定感与仪式感');
  return <Drawer title={base ? `新建版本（基于 ${sceneLabels[base.scene]} v${base.version}）` : '新建 Prompt 模板'} width={760} open={open} onClose={onClose} destroyOnClose extra={<Button type="primary" loading={loading} onClick={() => form.submit()}>保存为新版本</Button>}><Alert type="info" showIcon message="保存会创建新版本并自动停用同场景旧版本；如需启用历史版本请使用列表中的回滚" description={`可用变量：${promptVariables}`} /><Form form={form} layout="vertical" onFinish={submit} style={{ marginTop: 20 }}><Form.Item name="scene" label="适用场景" rules={[{ required: true }]}><Select options={sceneOptions} /></Form.Item><Form.Item name="template" label="模板内容" rules={[{ required: true, message: '请输入模板内容' }]}><Input.TextArea rows={14} className="prompt-template-editor" onChange={(event) => { setPreview(event.target.value); }} placeholder="你是珠宝门店营销专家... 平台：{{platform}} 风格：{{style}} 产品：{{productName}} 补充：{{userInput}}" /></Form.Item></Form><Card size="small" title="变量替换预览"><Typography.Paragraph className="prompt-preview">{renderPreview(preview) || '输入模板后预览变量替换效果'}</Typography.Paragraph></Card></Drawer>;
}

/** Prompt 模板管理（GET/PUT /api/admin/prompt-template、PUT .../{id}/rollback，文档 §1.5.2，仅 HQ_ADMIN） */
export function PromptTemplatesPage() {
  const [templates, setTemplates] = useState<PromptTemplate[]>([]); const [loading, setLoading] = useState(false); const [scene, setScene] = useState<AIGenerationType | undefined>(); const [editorOpen, setEditorOpen] = useState(false); const [editing, setEditing] = useState<PromptTemplate | null>(null);
  const load = () => { setLoading(true); sharedApi.getPromptTemplates().then(setTemplates).catch((error) => message.error(error instanceof Error ? error.message : 'Prompt 模板加载失败')).finally(() => setLoading(false)); }; useEffect(load, []);
  const filtered = useMemo(() => (scene ? templates.filter((t) => t.scene === scene) : templates), [templates, scene]);
  const rollback = (template: PromptTemplate) => sharedApi.rollbackPromptTemplate(template.id).then(() => { message.success(`已回滚到 ${sceneLabels[template.scene]} v${template.version}`); load(); }).catch((error) => message.error(error instanceof Error ? error.message : '回滚失败'));
  return <Space direction="vertical" size={20} className="full-width"><PageHeading title="Prompt 模板管理" description="维护后端 AI prompt 模板；每个场景仅一条生效版本，保存新版本会自动停用旧版本。" action={<Space><Select allowClear placeholder="场景" style={{ width: 110 }} value={scene} onChange={setScene} options={sceneOptions} /><Button icon={<ReloadOutlined />} onClick={load}>刷新</Button><Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(null); setEditorOpen(true); }}>新建模板</Button></Space>} /><Card><Table loading={loading} rowKey={(record) => String(record.id)} dataSource={filtered} pagination={{ pageSize: 10 }} columns={[{ title: '场景', dataIndex: 'scene', width: 90, render: (value) => sceneLabels[value as AIGenerationType] || value }, { title: '版本', dataIndex: 'version', width: 80, render: (value) => `v${value}` }, { title: '模板内容', dataIndex: 'template', ellipsis: true, render: (value) => <Typography.Text ellipsis={{ tooltip: value }} style={{ maxWidth: 460, display: 'inline-block' }}>{value}</Typography.Text> }, { title: '状态', dataIndex: 'status', width: 110, render: (value: 0 | 1) => templateStatusTag(value) }, { title: '更新时间', dataIndex: 'updatedAt', width: 170, render: formatDate }, { title: '操作', width: 220, render: (_, template) => <Space><Button type="link" size="small" icon={<CopyOutlined />} onClick={() => { setEditing(template); setEditorOpen(true); }}>以此新建</Button><Button type="link" size="small" icon={<RollbackOutlined />} disabled={template.status === 1} onClick={() => Modal.confirm({ title: `回滚到 ${sceneLabels[template.scene]} v${template.version}？`, content: '回滚会重新启用该历史版本，当前生效版本将停用。', onOk: () => rollback(template) })}>回滚</Button></Space> }]} /></Card><PromptEditor open={editorOpen} base={editing} onClose={() => setEditorOpen(false)} onSuccess={load} /></Space>;
}

function TaskDetailModal({ task, open, onClose }: { task: MediaTask | null; open: boolean; onClose: () => void }) {
  return <Modal title={`生成任务 ${task ? `#${task.id}` : ''}`} open={open} onCancel={onClose} footer={<Button onClick={onClose}>关闭</Button>} width={640}>{task && (
    <div className="monitor-detail">
      <Row gutter={[12, 16]}>
        <Col span={12}><Typography.Text type="secondary">作品 ID</Typography.Text><div>{String(task.workId)}</div></Col>
        <Col span={12}><Typography.Text type="secondary">任务 ID</Typography.Text><div>{String(task.id)}</div></Col>
        <Col span={12}><Typography.Text type="secondary">类型 / 场景</Typography.Text><div>{sceneLabels[task.type]}{task.scene ? ` / ${sceneLabels[task.scene] || task.scene}` : ''}</div></Col>
        <Col span={12}><Typography.Text type="secondary">状态</Typography.Text><div>{taskStatusTag(task.status)}</div></Col>
        <Col span={12}><Typography.Text type="secondary">门店 ID</Typography.Text><div>{String(task.storeId)}</div></Col>
        <Col span={12}><Typography.Text type="secondary">发起用户 ID</Typography.Text><div>{String(task.userId)}</div></Col>
        <Col span={24}><Typography.Text type="secondary">实际送模型的提示词</Typography.Text><div className="snapshot-text">{task.prompt || '-'}</div></Col>
        <Col span={12}><Typography.Text type="secondary">模型任务 ID</Typography.Text><div>{task.providerTaskId || '-'}</div></Col>
        <Col span={12}><Typography.Text type="secondary">扣费点数</Typography.Text><div>{task.cost ?? '-'}{task.refundStatus === 1 ? '（失败已自动退款）' : ''}</div></Col>
        <Col span={24}><Typography.Text type="secondary">成品地址</Typography.Text><div className="snapshot-text">{task.resultUrl || '-'}</div></Col>
        <Col span={24}><Typography.Text type="secondary">失败原因</Typography.Text><div className="snapshot-text">{task.errorMessage || '无'}</div></Col>
        <Col span={12}><Typography.Text type="secondary">开始时间</Typography.Text><div>{formatDate(task.startedAt)}</div></Col>
        <Col span={12}><Typography.Text type="secondary">完成时间</Typography.Text><div>{formatDate(task.finishedAt)}</div></Col>
      </Row>
    </div>
  )}</Modal>;
}

/**
 * 生成任务监控（GET /api/admin/media-task/list?limit=，文档 §1.5.1，运维视角）。
 * 接口仅支持 limit（1~200，超出自动截断）+ 时间倒序，状态/类型筛选在前端完成。
 */
export function MediaTasksPage() {
  const [items, setItems] = useState<MediaTask[]>([]); const [loading, setLoading] = useState(false); const [selected, setSelected] = useState<MediaTask | null>(null); const [detailOpen, setDetailOpen] = useState(false); const [status, setStatus] = useState<MediaTaskStatus | undefined>(); const [type, setType] = useState<AIGenerationType | undefined>();
  const load = () => { setLoading(true); sharedApi.getMediaTasks(100).then(setItems).catch((error) => message.error(error instanceof Error ? error.message : '生成任务加载失败')).finally(() => setLoading(false)); }; useEffect(load, []);
  const filtered = useMemo(() => items.filter((item) => (!status || item.status === status) && (!type || item.type === type)), [items, status, type]);
  return <Space direction="vertical" size={20} className="full-width"><PageHeading title="生成任务监控" description="查看模型侧任务状态、实际提示词与失败退款情况，辅助排查生成问题（最新 100 条）。" action={<Space><Select allowClear placeholder="状态" style={{ width: 140 }} value={status} onChange={setStatus} options={(Object.keys(taskStatusLabels) as MediaTaskStatus[]).map((key) => ({ value: key, label: taskStatusLabels[key] }))} /><Select allowClear placeholder="类型" style={{ width: 110 }} value={type} onChange={setType} options={sceneOptions} /><Button icon={<ReloadOutlined />} onClick={load}>刷新</Button></Space>} /><Card><Table loading={loading} rowKey={(record) => String(record.id)} dataSource={filtered} pagination={{ pageSize: 15 }} rowClassName={(record) => (record.status === 'FAILED' ? 'monitor-failed-row' : '')} columns={[{ title: '任务 ID', dataIndex: 'id', width: 90 }, { title: '作品 ID', dataIndex: 'workId', width: 90, render: (value) => String(value) }, { title: '类型', dataIndex: 'type', width: 80, render: (value) => sceneLabels[value as AIGenerationType] || value }, { title: '状态', dataIndex: 'status', width: 120, render: (value: MediaTaskStatus) => taskStatusTag(value) }, { title: '扣费', dataIndex: 'cost', width: 90, render: (value, item) => (value ?? '-') + (item.refundStatus === 1 ? '（已退）' : '') }, { title: '提示词', dataIndex: 'prompt', ellipsis: true, render: (value) => value || '-' }, { title: '失败原因', dataIndex: 'errorMessage', ellipsis: true, render: (value) => value || '-' }, { title: '开始时间', dataIndex: 'startedAt', width: 170, render: formatDate }, { title: '完成时间', dataIndex: 'finishedAt', width: 170, render: formatDate }, { title: '操作', width: 90, render: (_, item) => <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => { setSelected(item); setDetailOpen(true); }}>详情</Button> }]} /></Card><TaskDetailModal task={selected} open={detailOpen} onClose={() => setDetailOpen(false)} /></Space>;
}
