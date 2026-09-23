import { Card, Col, Row, Space, Statistic, Table, Typography } from 'antd';
import { ArrowUpOutlined, CheckCircleOutlined, CloudOutlined, TeamOutlined } from '@ant-design/icons';
import { SharedWidgets } from '../components/SharedWidgets';

const trendData = [
  { key: '1', date: '09-19', works: 128, completion: '86%' },
  { key: '2', date: '09-20', works: 156, completion: '89%' },
  { key: '3', date: '09-21', works: 174, completion: '91%' },
  { key: '4', date: '09-22', works: 203, completion: '93%' },
];

export function DashboardPage() {
  return <Space direction="vertical" size={24} className="full-width"><div><Typography.Title level={2}>全域看板</Typography.Title><Typography.Text type="secondary">查看门店产出趋势、任务完成率和额度消耗情况。</Typography.Text></div><Row gutter={[16, 16]}><Col xs={24} sm={12} lg={6}><Card><Statistic title="活跃门店" value={86} prefix={<TeamOutlined />} suffix="家" /></Card></Col><Col xs={24} sm={12} lg={6}><Card><Statistic title="本周内容产出" value={861} prefix={<CloudOutlined />} suffix="条" /></Card></Col><Col xs={24} sm={12} lg={6}><Card><Statistic title="任务完成率" value={93.2} precision={1} prefix={<CheckCircleOutlined />} suffix="%" /></Card></Col><Col xs={24} sm={12} lg={6}><Card><Statistic title="环比增长" value={18.6} precision={1} prefix={<ArrowUpOutlined />} suffix="%" /></Card></Col></Row><Row gutter={[16, 16]}><Col xs={24} lg={16}><Card title="产出趋势"><Table pagination={false} dataSource={trendData} columns={[{ title: '日期', dataIndex: 'date' }, { title: '内容产出', dataIndex: 'works' }, { title: '任务完成率', dataIndex: 'completion' }]} /></Card></Col><Col xs={24} lg={8}><Card title="共享指标组件"><SharedWidgets /></Card></Col></Row></Space>;
}
