import { Button, Card, DatePicker, Select, Space, Typography, message } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import type { Task } from '@xiaoa/share/types';
import { sharedApi } from '../services/sharedApi';

function today() { return dayjs().format('YYYY-MM-DD'); }

export function TaskRemindPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskId, setTaskId] = useState<string | undefined>();
  const [periodDate, setPeriodDate] = useState(today());
  const [result, setResult] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { sharedApi.getMyTasks().then(setTasks).catch(() => undefined); }, []);

  const sendRemind = () => {
    if (!taskId) { message.warning('请先选择任务'); return; }
    setLoading(true);
    setResult(null);
    sharedApi.remindTask({ taskId, ...(periodDate ? { periodDate } : {}) })
      .then((count) => { setResult(count); message.success(`已发送提醒：${count} 人`); })
      .catch((err) => message.error(err instanceof Error ? err.message : '提醒发送失败'))
      .finally(() => setLoading(false));
  };

  return (
    <Space direction="vertical" size={22} className="full-width">
      <div className="page-heading">
        <div className="page-heading-copy">
          <Typography.Title level={2}>任务提醒</Typography.Title>
          <Typography.Text>对未完成任务的员工发送提醒（HQ_ADMIN / REGION_ADMIN / 目标门店 OWNER）</Typography.Text>
        </div>
        <div className="page-actions">
          <Button type="primary" icon={<ReloadOutlined />} loading={loading} onClick={sendRemind}>发送提醒</Button>
        </div>
      </div>
      <Card>
        <Space wrap>
          <Select
            style={{ width: 300 }}
            placeholder="选择任务"
            value={taskId}
            onChange={setTaskId}
            options={tasks.map((t) => ({ label: t.title, value: String(t.id) }))}
          />
          <DatePicker value={dayjs(periodDate)} onChange={(_, dateStr) => setPeriodDate((Array.isArray(dateStr) ? dateStr[0] : dateStr) || today())} allowClear />
        </Space>
      </Card>
      {result !== null && (
        <Card>
          <Typography.Title level={3}>实际发送人数：{result}</Typography.Title>
          <Typography.Text type="secondary">仅对当前周期未完成的用户发送提醒</Typography.Text>
        </Card>
      )}
    </Space>
  );
}
