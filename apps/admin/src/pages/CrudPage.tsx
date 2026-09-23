import { Button, Card, Col, DatePicker, Form, Input, InputNumber, Modal, Row, Select, Space, Table, Tabs, Tag, Typography, message } from 'antd';
import { BarChartOutlined, BellOutlined, EditOutlined, HistoryOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import type {
  AdminTaskReport,
  CreateTaskRequest,
  RankingItem,
  RankingPeriod,
  RankingQuery,
  RankingScope,
  Task,
  TaskBoardItem,
  TaskFrequency,
  TaskFormType,
  TaskJudgeType,
  TaskModifyLog,
  TaskStatus,
  TaskTargetScope,
  UpdateTaskRequest,
} from '@xiaoa/share/types';
import { sharedApi } from '../services/sharedApi';
import { TaskBoardTree } from '../components/TaskBoardTree';

interface CrudPageProps { title: string; description: string; columns: string[]; }
function today() { return new Date().toISOString().slice(0, 10); }
function Heading({ title, description, action }: { title: string; description: string; action?: ReactNode }) { return <div className="page-heading"><div className="page-heading-copy"><Typography.Title level={2}>{title}</Typography.Title><Typography.Text>{description}</Typography.Text></div><div className="page-actions">{action}</div></div>; }

/** antd DatePicker 值的最小结构（避免直接依赖 dayjs） */
interface DayjsLike { format: (template?: string) => string; }
const DATETIME_FORMAT = 'YYYY-MM-DD HH:mm:ss';
const DATE_FORMAT = 'YYYY-MM-DD';
function toDatetime(value?: DayjsLike | null) { return value ? value.format(DATETIME_FORMAT) : undefined; }
function toRate(rate: number) { return `${Math.round((rate || 0) * 100)}%`; }
function parseIds(value?: string) {
  return (value || '')
    .split(/[,，;；\s]+/)
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isFinite(item) && item > 0);
}

const frequencyLabels = ['-', '每日', '每周', '每月'];

function TaskStatusTag({ status }: { status: TaskStatus }) {
  return <Tag color={status === 1 ? 'green' : 'default'}>{status === 1 ? '生效' : '停用'}</Tag>;
}

interface CreateFormValues {
  title: string;
  formType: TaskFormType;
  contentPackageId?: string;
  platform?: string;
  frequency: TaskFrequency;
  targetScope: TaskTargetScope;
  targetIds?: string;
  judgeType: TaskJudgeType;
  startAt?: DayjsLike | null;
  endAt?: DayjsLike | null;
}

interface EditFormValues {
  title: string;
  contentPackageId?: string;
  platform?: string;
  startAt?: DayjsLike | null;
  endAt?: DayjsLike | null;
}

function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [boardDate, setBoardDate] = useState(today());
  const [boardRefreshKey, setBoardRefreshKey] = useState(0);
  const [ranking, setRanking] = useState<RankingItem[]>([]);
  const [rankingQuery, setRankingQuery] = useState<RankingQuery>({ scope: 'STORE', period: 'WEEK', limit: 20 });
  const [report, setReport] = useState<AdminTaskReport | null>(null);
  const [modifyLogs, setModifyLogs] = useState<TaskModifyLog[]>([]);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createFormType, setCreateFormType] = useState<TaskFormType>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [createForm] = Form.useForm<CreateFormValues>();
  const [editForm] = Form.useForm<EditFormValues>();

  const fail = (requestError: unknown, fallback: string) => setError(requestError instanceof Error ? requestError.message : fallback);

  const loadTasks = () => {
    sharedApi.getMyTasks().then(setTasks).catch((requestError) => fail(requestError, '任务加载失败'));
  };
  const loadRanking = (query: RankingQuery = rankingQuery) => {
    sharedApi.getTaskRanking(query).then(setRanking).catch((requestError) => fail(requestError, '排行榜加载失败'));
  };
  const load = () => {
    setLoading(true);
    setError('');
    Promise.all([loadTasks(), loadRanking()]).finally(() => setLoading(false));
  };
  const reloadAll = () => { load(); setBoardRefreshKey((key) => key + 1); };
  useEffect(load, []);

  const remind = async (taskId: Task['id']) => {
    try {
      const count = await sharedApi.remindTask({ taskId });
      message.success(`已给 ${count} 位未完成成员发送提醒`);
    } catch (requestError) {
      fail(requestError, '提醒发送失败');
    }
  };
  const openReport = (item: TaskBoardItem) => {
    sharedApi.getAdminTaskReport(item.taskId, { periodDate: boardDate }).then(setReport).catch((requestError) => fail(requestError, '报表加载失败'));
  };
  const openEdit = (task: Task) => {
    setEditingTask(task);
    editForm.setFieldsValue({ title: task.title, platform: task.platform || undefined, contentPackageId: task.contentPackageId ? String(task.contentPackageId) : undefined });
  };
  const submitEdit = async (values: EditFormValues) => {
    if (!editingTask) return;
    try {
      const data: UpdateTaskRequest = {
        title: values.title,
        platform: values.platform,
        ...(values.contentPackageId ? { contentPackageId: Number(values.contentPackageId) } : {}),
        ...(toDatetime(values.startAt) ? { startAt: toDatetime(values.startAt) } : {}),
        ...(toDatetime(values.endAt) ? { endAt: toDatetime(values.endAt) } : {}),
      };
      await sharedApi.updateTask(editingTask.id, data);
      message.success('任务已更新');
      setEditingTask(null);
      editForm.resetFields();
      reloadAll();
    } catch (requestError) {
      fail(requestError, '任务更新失败');
    }
  };
  const openLogs = (task: Task) => {
    sharedApi.getTaskModifyLogs(task.id).then(setModifyLogs).catch((requestError) => fail(requestError, '修改记录加载失败'));
  };
  const toggle = async (task: Task) => {
    try {
      await sharedApi.updateTaskStatus(task.id, { status: task.status === 1 ? 2 : 1 });
      loadTasks();
    } catch (requestError) {
      fail(requestError, '任务状态更新失败');
    }
  };
  const submitCreate = async (values: CreateFormValues) => {
    try {
      const data: CreateTaskRequest = {
        title: values.title,
        formType: values.formType,
        platform: values.platform,
        frequency: values.frequency,
        targetScope: values.targetScope,
        targetIds: values.targetScope === 1 ? [] : parseIds(values.targetIds),
        judgeType: values.judgeType,
        ...(values.formType === 2 && values.contentPackageId ? { contentPackageId: Number(values.contentPackageId) } : {}),
        ...(toDatetime(values.startAt) ? { startAt: toDatetime(values.startAt) } : {}),
        ...(toDatetime(values.endAt) ? { endAt: toDatetime(values.endAt) } : {}),
      };
      await sharedApi.createTask(data);
      message.success('任务已创建');
      setCreateOpen(false);
      createForm.resetFields();
      setCreateFormType(1);
      reloadAll();
    } catch (requestError) {
      fail(requestError, '任务创建失败');
    }
  };

  const taskColumns = [
    { title: '任务名称', dataIndex: 'title' },
    { title: '平台', dataIndex: 'platform', render: (value: Task['platform']) => value || '-' },
    { title: '周期', dataIndex: 'frequency', render: (value: TaskFrequency) => frequencyLabels[value] },
    { title: '状态', dataIndex: 'status', render: (value: TaskStatus) => <TaskStatusTag status={value} /> },
    {
      title: '操作',
      render: (_: unknown, task: Task) => (
        <Space size={4} wrap>
          <Button type="link" size="small" onClick={() => toggle(task)}>{task.status === 1 ? '停用' : '启用'}</Button>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEdit(task)}>编辑</Button>
          <Button type="link" size="small" icon={<BellOutlined />} onClick={() => remind(task.id)}>提醒</Button>
          <Button type="link" size="small" icon={<HistoryOutlined />} onClick={() => openLogs(task)}>修改记录</Button>
        </Space>
      ),
    },
  ];

  const rankingColumns = [
    { title: '排名', dataIndex: 'rank', width: 72 },
    { title: '成员', dataIndex: 'nickname' },
    { title: '门店', dataIndex: 'storeName' },
    { title: '应完成', dataIndex: 'expected' },
    { title: '已完成', dataIndex: 'finished' },
    { title: '完成率', dataIndex: 'completionRate', render: (value: number) => toRate(value) },
    { title: '最近完成', dataIndex: 'lastFinishedAt', render: (value: RankingItem['lastFinishedAt']) => value || '-' },
  ];

  return (
    <Space direction="vertical" size={22} className="full-width">
      <Heading
        title="任务管理"
        description="按接口创建/编辑任务、三级钻取执行看板、发送提醒并查看排行榜"
        action={
          <>
            <Button icon={<ReloadOutlined />} onClick={reloadAll} loading={loading}>刷新</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>新建任务</Button>
          </>
        }
      />
      {error && <Typography.Text type="danger">{error}</Typography.Text>}
      <Card>
        <Tabs
          items={[
            {
              key: 'tasks',
              label: '任务列表',
              children: <Table rowKey={(record) => String(record.id)} dataSource={tasks} columns={taskColumns} pagination={{ pageSize: 8 }} />,
            },
            {
              key: 'board',
              label: '执行看板',
              children: (
                <Space direction="vertical" size={16} className="full-width">
                  <Space wrap>
                    <Typography.Text>统计日期：</Typography.Text>
                    <DatePicker
                      defaultValue={undefined}
                      value={undefined}
                      onChange={(value) => { if (value) setBoardDate((value as unknown as DayjsLike).format(DATE_FORMAT)); }}
                      allowClear={false}
                    />
                    <Button size="small" onClick={() => setBoardRefreshKey((key) => key + 1)}>刷新看板</Button>
                  </Space>
                  <TaskBoardTree
                    date={boardDate}
                    refreshKey={boardRefreshKey}
                    renderTaskActions={(item) => (
                      <Space size={0} wrap>
                        <Button type="link" size="small" icon={<BarChartOutlined />} onClick={(event) => { event.stopPropagation(); openReport(item); }}>报表</Button>
                        <Button type="link" size="small" icon={<BellOutlined />} onClick={(event) => { event.stopPropagation(); remind(item.taskId); }}>提醒</Button>
                      </Space>
                    )}
                  />
                </Space>
              ),
            },
            {
              key: 'ranking',
              label: '排行榜',
              children: (
                <Space direction="vertical" size={16} className="full-width">
                  <Space wrap>
                    <Select
                      value={rankingQuery.scope}
                      style={{ width: 140 }}
                      onChange={(value: RankingScope) => setRankingQuery((query) => ({ ...query, scope: value }))}
                      options={[{ label: '本店榜', value: 'STORE' }, { label: '全国榜', value: 'NATIONAL' }]}
                    />
                    <Select
                      value={rankingQuery.period}
                      style={{ width: 120 }}
                      onChange={(value: RankingPeriod) => setRankingQuery((query) => ({ ...query, period: value }))}
                      options={[{ label: '周榜', value: 'WEEK' }, { label: '月榜', value: 'MONTH' }]}
                    />
                    <Button type="primary" size="small" onClick={() => loadRanking()}>查询</Button>
                  </Space>
                  <Table rowKey={(record) => String(record.userId)} dataSource={ranking} columns={rankingColumns} pagination={false} locale={{ emptyText: '暂无排行数据' }} />
                </Space>
              ),
            },
          ]}
        />
      </Card>

      <Modal title="新建任务" open={createOpen} onCancel={() => setCreateOpen(false)} footer={null} destroyOnClose>
        <Form form={createForm} layout="vertical" onFinish={submitCreate} initialValues={{ formType: 1, frequency: 1, targetScope: 1, targetIds: '', judgeType: 1 }}>
          <Form.Item name="title" label="任务标题" rules={[{ required: true, whitespace: true, message: '请输入任务标题' }]}><Input /></Form.Item>
          <Form.Item name="formType" label="任务形式" rules={[{ required: true }]}>
            <Select onChange={(value: TaskFormType) => setCreateFormType(value)} options={[{ label: '固定动作', value: 1 }, { label: '指定内容（需关联内容包）', value: 2 }]} />
          </Form.Item>
          {createFormType === 2 && (
            <Form.Item name="contentPackageId" label="内容包 ID" rules={[{ required: true, message: '指定内容任务必须关联内容包' }]}>
              <InputNumber className="full-input" min={1} placeholder="contentPackageId" />
            </Form.Item>
          )}
          <Form.Item name="platform" label="发布平台" extra="为空则不限平台；提交发布记录时平台必须与任务一致"><Input placeholder="例如：DOUYIN" /></Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="frequency" label="频率" rules={[{ required: true }]}>
                <Select options={[{ label: '每日', value: 1 }, { label: '每周', value: 2 }, { label: '每月', value: 3 }]} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="judgeType" label="完成判定" rules={[{ required: true }]}>
                <Select options={[{ label: '发布后直接完成', value: 1 }, { label: '需提交截图凭证', value: 2 }]} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="targetScope" label="下发范围" rules={[{ required: true }]}>
            <Select options={[{ label: '全域（全员）', value: 1 }, { label: '指定区域', value: 2 }, { label: '指定门店', value: 3 }, { label: '指定员工', value: 4 }]} />
          </Form.Item>
          <Form.Item name="targetIds" label="目标 ID 列表" extra="指定区域/门店/员工时必填，多个 ID 用逗号分隔，例如：3,4">
            <Input placeholder="例如：3,4" />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="startAt" label="开始时间"><DatePicker showTime style={{ width: '100%' }} /></Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="endAt" label="结束时间"><DatePicker showTime style={{ width: '100%' }} /></Form.Item>
            </Col>
          </Row>
          <Button type="primary" htmlType="submit" block>提交任务</Button>
        </Form>
      </Modal>

      <Modal title={`编辑任务 #${editingTask?.id ?? ''}`} open={Boolean(editingTask)} onCancel={() => { setEditingTask(null); editForm.resetFields(); }} footer={null} destroyOnClose>
        {editingTask && (
          <Form form={editForm} layout="vertical" onFinish={submitEdit} initialValues={{ title: editingTask.title, platform: editingTask.platform || undefined }}>
            <Form.Item name="title" label="任务标题" rules={[{ required: true, whitespace: true, message: '请输入任务标题' }]}><Input /></Form.Item>
            <Form.Item name="contentPackageId" label="内容包 ID"><InputNumber className="full-input" min={1} placeholder="不修改请留空" /></Form.Item>
            <Form.Item name="platform" label="发布平台"><Input placeholder="例如：DOUYIN" /></Form.Item>
            <Typography.Paragraph type="secondary">当前周期：{editingTask.startAt || '-'} ~ {editingTask.endAt || '-'}；如需修改请在下方重新选择时间。</Typography.Paragraph>
            <Row gutter={12}>
              <Col span={12}>
                <Form.Item name="startAt" label="开始时间"><DatePicker showTime style={{ width: '100%' }} /></Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="endAt" label="结束时间"><DatePicker showTime style={{ width: '100%' }} /></Form.Item>
              </Col>
            </Row>
            <Typography.Text type="secondary">当前接口仅支持修改标题、内容包、平台和时间；店长编辑上级任务会生成本店副本。</Typography.Text>
            <Button type="primary" htmlType="submit" block style={{ marginTop: 12 }}>保存修改</Button>
          </Form>
        )}
      </Modal>

      <Modal title={`修改记录 #${modifyLogs[0]?.taskId ?? ''}`} open={modifyLogs.length > 0} onCancel={() => setModifyLogs([])} footer={null}>
        <Table rowKey={(record) => String(record.id)} dataSource={modifyLogs} pagination={false} columns={[
          { title: '时间', dataIndex: 'createdAt', render: (value: TaskModifyLog['createdAt']) => value || '-' },
          { title: '操作人', dataIndex: 'modifiedBy', render: (value: TaskModifyLog['modifiedBy']) => `用户 #${value}` },
          { title: '变更内容', dataIndex: 'changeDetail', render: (value: string) => <Typography.Text style={{ fontSize: 12 }}>{value}</Typography.Text> },
        ]} locale={{ emptyText: '暂无修改记录' }} />
      </Modal>

      <Modal title={`任务报表 #${report?.taskId ?? ''}`} open={Boolean(report)} onCancel={() => setReport(null)} footer={null} width={720}>
        {report && (
          <Space direction="vertical" size={16} className="full-width">
            <Space size={24} wrap>
              <Typography.Text>周期日期：{report.periodDate}</Typography.Text>
              <Typography.Text>应完成：{report.expected}</Typography.Text>
              <Typography.Text>已完成：{report.finished}</Typography.Text>
              <Typography.Text>完成率：{toRate(report.completionRate)}</Typography.Text>
            </Space>
            <Table rowKey={(record) => String(record.id)} dataSource={report.records} pagination={false} columns={[
              { title: '记录 ID', dataIndex: 'id' },
              { title: '员工', dataIndex: 'userId', render: (value: Task['createdBy']) => `用户 #${value}` },
              { title: '门店', dataIndex: 'storeId' },
              { title: '状态', dataIndex: 'status', render: (value: 0 | 1) => <Tag color={value === 1 ? 'green' : 'orange'}>{value === 1 ? '已完成' : '未完成'}</Tag> },
              { title: '完成时间', dataIndex: 'finishedAt', render: (value: Task['updatedAt']) => value || '-' },
            ]} locale={{ emptyText: '暂无记录' }} />
          </Space>
        )}
      </Modal>
    </Space>
  );
}

function StandardTablePage({ title, description, columns }: CrudPageProps) { return <Space direction="vertical" size={22} className="full-width"><Heading title={title} description={description} action={<Button type="primary" icon={<PlusOutlined />}>新建</Button>} /><Card><Table dataSource={[]} columns={columns.map((column) => ({ title: column, dataIndex: column }))} locale={{ emptyText: '该模块暂无 readme.md 中定义的接口' }} /></Card></Space>; }
function MaterialsPage({ title, description }: CrudPageProps) { return <StandardTablePage title={title} description={`${description} 当前 readme.md 未提供素材接口。`} columns={['素材名称', '类型', '来源', '操作']} />; }
function CalendarPage({ title, description }: CrudPageProps) { return <StandardTablePage title={title} description={`${description} 当前 readme.md 未提供内容包接口。`} columns={['内容包', '适用范围', '日期', '操作']} />; }
function QuotaPage({ title, description }: CrudPageProps) { return <StandardTablePage title={title} description={`${description} 当前任务域接口未提供额度接口。`} columns={['门店', '额度', '消耗', '余额']} />; }
function CompliancePage({ title, description }: CrudPageProps) { return <StandardTablePage title={title} description={`${description} 当前任务域接口未提供合规接口。`} columns={['词条', '风险级别', '适用范围', '更新时间']} />; }

export function CrudPage(props: CrudPageProps) { if (props.title === '任务管理') return <TasksPage />; if (props.title === '素材中心') return <MaterialsPage {...props} />; if (props.title === '营销日历') return <CalendarPage {...props} />; if (props.title === '算力总池') return <QuotaPage {...props} />; if (props.title === '合规中心') return <CompliancePage {...props} />; return <StandardTablePage {...props} />; }
