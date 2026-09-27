import { Button, Card, Drawer, Form, Input, InputNumber, Modal, Popconfirm, Select, Space, Table, Tag, Typography, message } from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { useEffect, useState } from 'react';
import type { ContentPackage, ContentPackageQuery, CreateStyleRequest, PackageTaskTemplate, StyleOption, UpdateStyleRequest } from '@xiaoa/share/types';
import { PACKAGE_STATUS, PACKAGE_STATUS_COLOR, normalizePackageStatus } from '@xiaoa/share/constants';
import { sharedApi } from '../services/sharedApi';
import { PackageModal } from './calendar/PackageModal';

interface PageProps { title: string; description: string; }
function formatDate(value?: string | null) { return value ? new Date(value).toLocaleString('zh-CN') : '-'; }
function PageHeading({ title, description, action }: PageProps & { action?: React.ReactNode }) { return <div className="page-heading"><div className="page-heading-copy"><Typography.Title level={2}>{title}</Typography.Title><Typography.Text>{description}</Typography.Text></div><div className="page-actions">{action}</div></div>; }
function useError() { const [error, setError] = useState(''); return { error, catchError: (e: unknown, fallback: string) => setError(e instanceof Error ? e.message : fallback) }; }

/** 解析任务模板 JSON 字符串（文档 §3.5.2：需 JSON.parse 后渲染） */
function parseTemplate(pkg: ContentPackage): PackageTaskTemplate | null {
  try { return JSON.parse(pkg.taskTemplate) as PackageTaskTemplate; } catch { return null; }
}

/**
 * 内容包管理（GET/POST/DELETE /api/admin/content-packages，文档 §3.5）。
 * 状态：1 待下发 / 2 已下发（sourceTaskId 为空 → 下发异常标记）/ 3 已撤销；仅待下发可撤销。
 */
export function ContentPackagePage({ title, description }: PageProps) {
  const [packages, setPackages] = useState<ContentPackage[]>([]);
  const [status, setStatus] = useState<ContentPackageQuery['status'] | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<ContentPackage | null>(null);
  const { error, catchError } = useError();

  const load = (statusFilter = status) => {
    setLoading(true);
    sharedApi.getContentPackages({ status: statusFilter || undefined, pageNo: 1, pageSize: 100 })
      .then((result) => setPackages(result.list ?? []))
      .catch((e) => catchError(e, '内容包列表加载失败'))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [status]);

  const cancelPackage = (pkg: ContentPackage) => {
    Modal.confirm({
      title: '撤销内容包',
      content: `仅"待下发"可撤销；确认撤销 ${pkg.name}？`,
      okText: '撤销',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: async () => {
        try {
          await sharedApi.disableContentPackage(pkg.id);
          message.success('已撤销');
          load();
        } catch (e) {
          const msg = e instanceof Error ? e.message : '撤销失败';
          if (msg.includes('状态不可') || msg.includes('已下发')) { message.warning('该内容包已下发'); load(); } else { message.error(msg); }
        }
      },
    });
  };

  const statusRender = (pkg: ContentPackage) => {
    const key = normalizePackageStatus(pkg.status);
    const abnormal = key === 'DISPATCHED' && !pkg.sourceTaskId;
    return <Tag color={abnormal ? 'red' : PACKAGE_STATUS_COLOR[key]}>{abnormal ? '下发异常' : PACKAGE_STATUS[key]}</Tag>;
  };

  return (
    <Space direction="vertical" size={20} className="full-width">
      <PageHeading
        title={title}
        description={description}
        action={<Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>创建内容包</Button>}
      />
      <Space wrap>
        <Select
          allowClear
          style={{ width: 140 }}
          placeholder="全部状态"
          value={status}
          onChange={(value) => setStatus(value)}
          options={[{ value: 1, label: '待下发' }, { value: 2, label: '已下发' }, { value: 3, label: '已撤销' }]}
        />
        <Button icon={<PlusOutlined />} onClick={() => load()}>刷新</Button>
        {error && <Typography.Text type="danger">{error}</Typography.Text>}
      </Space>
      <Card>
        <Table
          loading={loading}
          rowKey={(r) => String(r.id)}
          dataSource={packages}
          pagination={{ pageSize: 10 }}
          onRow={(record) => ({ onClick: () => setDetail(record), style: { cursor: 'pointer' } })}
          columns={[
            { title: '名称', dataIndex: 'name' },
            { title: '营销日', dataIndex: 'calendarDate', width: 110 },
            { title: '下发时刻', dataIndex: 'publishAt', width: 170, render: formatDate },
            { title: '任务模板', render: (_, pkg) => { const t = parseTemplate(pkg); return t ? `${t.title || pkg.name} · ${t.platform}` : '-'; }, ellipsis: true },
            { title: '推广方向', dataIndex: 'copyDirection', render: (v) => v || '-', ellipsis: true },
            { title: '状态', width: 100, render: (_, pkg) => statusRender(pkg) },
            { title: '创建时间', dataIndex: 'createdAt', render: formatDate },
            { title: '操作', width: 90, render: (_, pkg) => normalizePackageStatus(pkg.status) === 'ACTIVE'
              ? <Popconfirm title="撤销后不再自动下发任务，确认？" onConfirm={(event) => { event?.stopPropagation(); cancelPackage(pkg); }} onCancel={(event) => event?.stopPropagation()}>
                  <Button type="link" danger icon={<DeleteOutlined />} onClick={(event) => event.stopPropagation()}>撤销</Button>
                </Popconfirm>
              : '-' },
          ]}
        />
      </Card>
      <Drawer
        title={detail ? `内容包 · ${detail.name}` : ''}
        width={420}
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
      >
        {detail && (
          <Space direction="vertical" size={12} className="full-width">
            {statusRender(detail)}
            <Typography.Text>营销日：{detail.calendarDate}</Typography.Text>
            <Typography.Text>下发时刻：{formatDate(detail.publishAt)}</Typography.Text>
            {detail.copyDirection && <Typography.Paragraph>推广方向：{detail.copyDirection}</Typography.Paragraph>}
            {(() => { const t = parseTemplate(detail); return t ? (
              <Space direction="vertical" size={4}>
                <Typography.Text strong>任务模板</Typography.Text>
                <Typography.Text>标题：{t.title || detail.name}</Typography.Text>
                <Typography.Text>动作：{t.actionType === 1 ? '固定动作' : '指定内容'} · 平台：{t.platform}</Typography.Text>
                <Typography.Text>频率：{t.frequency === 1 ? '每日' : t.frequency === 2 ? '每周' : '每月'} · 判定：{t.judgeType === 2 ? '需截图凭证' : '直接完成'}</Typography.Text>
                <Typography.Text>截止：{t.endTime}</Typography.Text>
                <Typography.Text>对象：{t.targetScope === 1 || !t.targetScope ? '全员' : `${({ 2: '区域', 3: '门店', 4: '员工' } as Record<number, string>)[t.targetScope]}（${(t.targetIds || []).join(', ')}）`}</Typography.Text>
              </Space>
            ) : <Typography.Text type="secondary">任务模板解析失败：{detail.taskTemplate}</Typography.Text>; })()}
            {detail.sourceTaskId && <Typography.Text>已生成任务 ID：{String(detail.sourceTaskId)}（在任务列表查看）</Typography.Text>}
            {detail.lastError && <Typography.Text type="danger">下发失败：{detail.lastError}</Typography.Text>}
            {normalizePackageStatus(detail.status) === 'DISPATCHED' && !detail.sourceTaskId && <Typography.Text type="danger">下发异常：状态已变更但未生成任务，需人工补建</Typography.Text>}
          </Space>
        )}
      </Drawer>
      <PackageModal open={open} onClose={() => setOpen(false)} onSuccess={() => load()} />
    </Space>
  );
}

// ===== 风格库（文档 §2.8：仅 HQ_ADMIN 可维护；内置风格 tenantId 为空，租户不可改） =====
function StyleDrawer({ open, style, onClose, onSuccess }: { open: boolean; style: StyleOption | null; onClose: () => void; onSuccess: () => void }) {
  const [form] = Form.useForm<CreateStyleRequest & UpdateStyleRequest>(); const [loading, setLoading] = useState(false);
  useEffect(() => { if (open) form.setFieldsValue(style ? { name: style.name, description: style.description ?? undefined, exampleUrl: style.exampleUrl ?? undefined, sortNo: style.sortNo, packageId: style.packageId } : { sortNo: 0 }); }, [open, style, form]);
  const submit = async () => { try { const values = await form.validateFields(); setLoading(true); if (style) await sharedApi.updateStyle(style.id, values); else await sharedApi.createStyle(values); message.success(style ? '风格已更新' : '风格已创建'); onClose(); onSuccess(); } catch (e) { if (e instanceof Error) message.error(e.message); } finally { setLoading(false); } };
  return <Drawer title={style ? '编辑风格' : '新建风格'} width={460} open={open} onClose={onClose} extra={<Button type="primary" loading={loading} onClick={submit}>保存</Button>} destroyOnClose><Form form={form} layout="vertical"><Form.Item name="name" label="风格名称" rules={[{ required: true }]}><Input /></Form.Item><Form.Item name="description" label="适用场景描述"><Input.TextArea rows={3} /></Form.Item><Form.Item name="exampleUrl" label="示例图 URL（选填，OSS 接入后生效）"><Input /></Form.Item><Form.Item name="sortNo" label="排序（小靠前，小程序创作页按此排序）"><InputNumber className="full-input" /></Form.Item><Form.Item name="packageId" label="行业包 ID（选填，平台风格场景）"><InputNumber className="full-input" /></Form.Item></Form></Drawer>;
}
export function StyleAdminPage({ title, description }: PageProps) {
  const [styles, setStyles] = useState<StyleOption[]>([]); const [loading, setLoading] = useState(false); const [open, setOpen] = useState(false); const [editing, setEditing] = useState<StyleOption | null>(null); const { error, catchError } = useError();
  const load = () => { setLoading(true); sharedApi.getStyleOptions().then(setStyles).catch((e) => catchError(e, '风格列表加载失败')).finally(() => setLoading(false)); }; useEffect(load, []);
  const remove = (style: StyleOption) => { sharedApi.deleteStyle(style.id).then(() => { message.success('已删除（物理删除，历史作品保留风格名快照）'); load(); }).catch((e) => message.error(e instanceof Error ? e.message : '删除失败')); };
  return <Space direction="vertical" size={20} className="full-width"><PageHeading title={title} description={description} action={<Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(null); setOpen(true); }}>新建风格</Button>} /><Typography.Text type="secondary">列表为「本租户自建 + 平台内置」，小程序创作页风格选择即此数据源；删除为物理删除，创作页立即不可选。</Typography.Text>{error && <Typography.Text type="danger">{error}</Typography.Text>}<Card><Table loading={loading} rowKey={(r) => String(r.id)} dataSource={styles} pagination={{ pageSize: 10 }} columns={[{ title: '风格名', dataIndex: 'name' }, { title: '适用场景', dataIndex: 'description', ellipsis: true, render: (v) => v || '-' }, { title: '示例图', dataIndex: 'exampleUrl', ellipsis: true, render: (v) => v || '-' }, { title: '排序', dataIndex: 'sortNo', render: (v) => v ?? 0 }, { title: '状态', dataIndex: 'status', render: (v) => <Tag color={v === 1 ? 'green' : 'default'}>{v === 1 ? '启用' : '停用'}</Tag> }, { title: '来源', render: (_, s) => (s.tenantId ? <Tag>本租户</Tag> : <Tag color="purple">平台内置</Tag>) }, { title: '操作', render: (_, s) => s.tenantId ? <Space><Button type="link" icon={<EditOutlined />} onClick={() => { setEditing(s); setOpen(true); }}>编辑</Button><Popconfirm title="确认删除该风格？创作页立即不可选。" onConfirm={() => remove(s)}><Button type="link" danger>删除</Button></Popconfirm></Space> : <Typography.Text type="secondary">平台维护</Typography.Text> }]} /></Card><StyleDrawer open={open} style={editing} onClose={() => setOpen(false)} onSuccess={load} /></Space>;
}
