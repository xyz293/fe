import { Button, Card, DatePicker, Progress, Select, Space, Table, Tag, Typography, message } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import type { AdminTaskReport, Task } from '@xiaoa/share/types';
import { sharedApi } from '../services/sharedApi';

function today() { return dayjs().format('YYYY-MM-DD'); }

export function TaskReportPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskId, setTaskId] = useState<string | undefined>();
  const [storeId, setStoreId] = useState<string | undefined>();
  const [date, setDate] = useState(today());
  const [report, setReport] = useState<AdminTaskReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    sharedApi.getMyTasks().then(setTasks).catch(() => undefined);
  }, []);

  const loadReport = () => {
    if (!taskId) { message.warning('请先选择任务'); return; }
    setLoading(true);
    const params: { storeId?: string; periodDate?: string } = {};
    if (storeId) params.storeId = storeId;
    if (date) params.periodDate = date;
    sharedApi.getAdminTaskReport(taskId, params)
      .then(setReport)
      .catch((err) => message.error(err instanceof Error ? err.message : '报表加载失败'))
      .finally(() => setLoading(false));
  };

  return (
    <Space direction="vertical" size={22} className="full-width">
      <div className="page-heading">
        <div className="page-heading-copy">
          <Typography.Title level={2}>任务报表</Typography.Title>
          <Typography.Text>查询指定任务的完成率和记录明细</Typography.Text>
        </div>
        <div className="page-actions">
          <Button icon={<ReloadOutlined />} onClick={loadReport}>查询</Button>
        </div>
      </div>
      <Card>
        <Space wrap>
          <Select
            style={{ width: 260 }}
            placeholder="选择任务"
            value={taskId}
            onChange={setTaskId}
            options={tasks.map((t) => ({ label: t.title, value: String(t.id) }))}
          />
          <Select
            style={{ width: 180 }}
            placeholder="门店 ID（可选）"
            value={storeId}
            onChange={setStoreId}
            allowClear
            options={[]}
          />
          <DatePicker value={dayjs(date)} onChange={(_, dateStr) => setDate((Array.isArray(dateStr) ? dateStr[0] : dateStr) || today())} allowClear={false} />
        </Space>
      </Card>
      <Card loading={loading}>
        {report ? (
          <>
            <Space direction="vertical" style={{ width: '100%', marginBottom: 22 }}>
              <Typography.Text>周期：{report.periodDate}</Typography.Text>
              <Typography.Text>应完成：{report.expected}　已完成：{report.finished}　完成率：{(report.completionRate * 100).toFixed(1)}%</Typography.Text>
              <Progress percent={Math.round(report.completionRate * 100)} strokeColor="#c9a46c" />
            </Space>
            <Table
              rowKey={(r) => String(r.id)}
              dataSource={report.records}
              pagination={false}
              columns={[
                { title: '记录 ID', dataIndex: 'id', width: 80 },
                { title: '任务 ID', dataIndex: 'taskId', width: 80 },
                { title: '员工 ID', dataIndex: 'userId', width: 80 },
                { title: '门店 ID', dataIndex: 'storeId', width: 80 },
                { title: '周期', dataIndex: 'periodDate', width: 120 },
                { title: '状态', dataIndex: 'status', width: 80, render: (v: number) => <Tag color={v === 1 ? 'green' : 'orange'}>{v === 1 ? '已完成' : '未完成'}</Tag> },
                { title: '发布记录 ID', dataIndex: 'publishRecordId', width: 120, render: (v: string | null) => v || '-' },
                { title: '完成时间', dataIndex: 'finishedAt', width: 180, render: (v: string | null) => v || '-' },
              ]}
            />
          </>
        ) : (
          <Typography.Text type="secondary">请选择任务并点击查询</Typography.Text>
        )}
      </Card>
    </Space>
  );
}
