import { Button, Card, Select, Space, Table, Tag, Typography, message } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { useEffect, useState } from 'react';
import type { Task, TaskModifyLog } from '@xiaoa/share/types';
import { sharedApi } from '../services/sharedApi';

export function TaskModifyLogsPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskId, setTaskId] = useState<string | undefined>();
  const [logs, setLogs] = useState<TaskModifyLog[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    sharedApi.getMyTasks().then(setTasks).catch(() => undefined);
  }, []);

  const loadLogs = () => {
    if (!taskId) { message.warning('请先选择任务'); return; }
    setLoading(true);
    sharedApi.getTaskModifyLogs(taskId)
      .then(setLogs)
      .catch((err) => message.error(err instanceof Error ? err.message : '修改记录加载失败'))
      .finally(() => setLoading(false));
  };

  return (
    <Space direction="vertical" size={22} className="full-width">
      <div className="page-heading">
        <div className="page-heading-copy">
          <Typography.Title level={2}>任务修改记录</Typography.Title>
          <Typography.Text>查询任务编辑历史（仅 HQ_ADMIN / REGION_ADMIN）</Typography.Text>
        </div>
        <div className="page-actions">
          <Button icon={<ReloadOutlined />} onClick={loadLogs}>查询</Button>
        </div>
      </div>
      <Card>
        <Select
          style={{ width: 300 }}
          placeholder="选择任务"
          value={taskId}
          onChange={setTaskId}
          options={tasks.map((t) => ({ label: t.title, value: String(t.id) }))}
        />
      </Card>
      <Card loading={loading}>
        <Table
          rowKey={(r) => String(r.id)}
          dataSource={logs}
          pagination={false}
          columns={[
            { title: '记录 ID', dataIndex: 'id', width: 80 },
            { title: '任务 ID', dataIndex: 'taskId', width: 80 },
            { title: '修改人', dataIndex: 'modifiedBy', width: 100 },
            { title: '修改时间', dataIndex: 'createdAt', width: 180 },
            { title: '变更详情', dataIndex: 'changeDetail', render: (v: string) => <Typography.Text code>{v}</Typography.Text> },
          ]}
        />
      </Card>
    </Space>
  );
}
