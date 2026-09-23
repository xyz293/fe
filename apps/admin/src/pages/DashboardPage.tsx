import { Card, Col, DatePicker, Progress, Row, Space, Statistic, Tag, Typography } from 'antd';
import { CheckCircleOutlined, CloudOutlined, ShopOutlined, TeamOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { sharedApi } from '../services/sharedApi';
import type { TaskBoard } from '@xiaoa/share/types';

function today() { return dayjs().format('YYYY-MM-DD'); }

export function DashboardPage() {
  const [board, setBoard] = useState<TaskBoard | null>(null);
  const [date, setDate] = useState(today());
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const loadBoard = (d: string) => {
    setLoading(true);
    setError('');
    // 文档 §8.1：GET /api/task/board?date={date}
    sharedApi.getTaskBoard(d)
      .then(setBoard)
      .catch((requestError) => setError(requestError instanceof Error ? requestError.message : '看板加载失败'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadBoard(date); }, [date]);

  const tasks = board?.tasks || [];
  const totalExpected = tasks.reduce((sum, t) => sum + t.expected, 0);
  const totalFinished = tasks.reduce((sum, t) => sum + t.finished, 0);
  const rate = totalExpected ? Math.round((totalFinished / totalExpected) * 100) : 0;

  return (
    <Space direction="vertical" size={22} className="full-width">
      <div className="page-heading">
        <div className="page-heading-copy">
          <Typography.Title level={2}>全域数据看板</Typography.Title>
          <Typography.Text>查看任务完成情况和门店执行状态</Typography.Text>
        </div>
        <div className="page-actions">
          <DatePicker value={dayjs(date)} onChange={(_, dateStr) => setDate(Array.isArray(dateStr) ? dateStr[0] || today() : dateStr || today())} allowClear={false} />
          <Tag color={error ? 'red' : 'green'}>{error || '数据来自 /api/task/board'}</Tag>
        </div>
      </div>
      <Row gutter={[18, 18]}>
        <Col xs={24} sm={12} lg={6}><Card className="stat-card" loading={loading}><Statistic title="生效任务" value={tasks.filter((t) => t.status === 1).length} prefix={<ShopOutlined />} suffix="个" /></Card></Col>
        <Col xs={24} sm={12} lg={6}><Card className="stat-card" loading={loading}><Statistic title="任务总数" value={tasks.length} prefix={<CloudOutlined />} suffix="个" /></Card></Col>
        <Col xs={24} sm={12} lg={6}><Card className="stat-card" loading={loading}><Statistic title="已完成" value={totalFinished} prefix={<CheckCircleOutlined />} suffix="条" /></Card></Col>
        <Col xs={24} sm={12} lg={6}><Card className="stat-card" loading={loading}><Statistic title="完成率" value={rate} prefix={<TeamOutlined />} suffix="%" /></Card></Col>
      </Row>
      <Card title="当前任务完成率" loading={loading}>
        <Progress percent={rate} strokeColor="#c9a46c" />
        <Typography.Text type="secondary">应完成 {totalExpected}，已完成 {totalFinished}</Typography.Text>
      </Card>
      <Card title="任务列表" loading={loading}>
        <Space direction="vertical" style={{ width: '100%' }}>
          {tasks.map((task) => (
            <div className="rank-row" key={String(task.taskId)}>
              <span className="rank-name">{task.title}</span>
              <Tag color={task.status === 1 ? 'green' : 'default'}>{task.status === 1 ? '生效' : '停用'}</Tag>
              <Tag color={task.completionRate >= 0.8 ? 'green' : 'orange'}>完成率 {(task.completionRate * 100).toFixed(0)}%</Tag>
              <Typography.Text type="secondary">{task.finished}/{task.expected}</Typography.Text>
            </div>
          ))}
          {!tasks.length && !loading && <Typography.Text type="secondary">暂无任务</Typography.Text>}
        </Space>
      </Card>
    </Space>
  );
}
