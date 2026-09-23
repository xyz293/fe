import { Card, Col, Progress, Row, Space, Statistic, Tag, Typography } from 'antd';
import { CheckCircleOutlined, CloudOutlined, ShopOutlined, TeamOutlined } from '@ant-design/icons';
import { useEffect, useState } from 'react';
import { sharedApi } from '../services/sharedApi';
import type { StoreBoard, Task } from '@xiaoa/share/types';

function today() { return new Date().toISOString().slice(0, 10); }

export function DashboardPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [board, setBoard] = useState<StoreBoard | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    sharedApi.getMyTasks().then(setTasks).catch((requestError) => setError(requestError instanceof Error ? requestError.message : '任务加载失败'));
    const storeId = localStorage.getItem('storeId');
    if (storeId) sharedApi.getStoreBoard(storeId, today()).then(setBoard).catch((requestError) => setError(requestError instanceof Error ? requestError.message : '门店看板加载失败'));
  }, []);
  const finished = tasks.filter((task) => task.recordStatus === 1).length;
  const rate = board ? Math.round(board.completionRate * 100) : tasks.length ? Math.round((finished / tasks.length) * 100) : 0;
  return <Space direction="vertical" size={22} className="full-width"><div className="page-heading"><div className="page-heading-copy"><Typography.Title level={2}>全域数据看板</Typography.Title><Typography.Text>查看任务完成情况和门店执行状态</Typography.Text></div><div className="page-actions"><Tag color={error ? 'red' : 'green'}>{error || '数据已更新'}</Tag></div></div><Row gutter={[18, 18]}><Col xs={24} sm={12} lg={6}><Card className="stat-card"><Statistic title="生效任务" value={tasks.filter((task) => task.status === 1).length} prefix={<ShopOutlined />} suffix="个" /></Card></Col><Col xs={24} sm={12} lg={6}><Card className="stat-card"><Statistic title="任务总数" value={tasks.length} prefix={<CloudOutlined />} suffix="个" /></Card></Col><Col xs={24} sm={12} lg={6}><Card className="stat-card"><Statistic title="已完成" value={board?.finished ?? finished} prefix={<CheckCircleOutlined />} suffix="条" /></Card></Col><Col xs={24} sm={12} lg={6}><Card className="stat-card"><Statistic title="完成率" value={rate} prefix={<TeamOutlined />} suffix="%" /></Card></Col></Row><Card title="当前门店任务完成率"><Progress percent={rate} strokeColor="#c9a46c" /><Typography.Text type="secondary">{board ? `应完成 ${board.expected}，已完成 ${board.finished}` : '数据来自 /api/task/my 或 /api/task/store-board'}</Typography.Text></Card><Card title="任务列表"><Space direction="vertical" style={{ width: '100%' }}>{tasks.map((task) => <div className="rank-row" key={String(task.id)}><span className="rank-name">{task.title}</span><Tag color={task.recordStatus === 1 ? 'green' : 'orange'}>{task.recordStatus === 1 ? '已完成' : '待完成'}</Tag><Typography.Text type="secondary">{task.platform || '未指定平台'}</Typography.Text></div>)}{!tasks.length && <Typography.Text type="secondary">暂无任务</Typography.Text>}</Space></Card></Space>;
}
