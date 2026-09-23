import { Card, Col, Progress, Row, Space, Statistic, Table, Tag, Typography } from 'antd';
import { ArrowUpOutlined, CheckCircleOutlined, CloudOutlined, ShopOutlined, TeamOutlined } from '@ant-design/icons';

const trendData = [
  { key: '1', date: '05-14', works: 128, completion: '86%', stores: 92 },
  { key: '2', date: '05-15', works: 156, completion: '89%', stores: 101 },
  { key: '3', date: '05-16', works: 174, completion: '91%', stores: 108 },
  { key: '4', date: '05-17', works: 203, completion: '93%', stores: 118 },
  { key: '5', date: '05-18', works: 248, completion: '95%', stores: 128 },
];
const bars = [42, 56, 63, 72, 68, 88, 100];
const rank = [{ name: '朝阳婚戒店', value: '126 条' }, { name: '望京钻石中心', value: '108 条' }, { name: '国贸旗舰店', value: '96 条' }, { name: '西单婚礼顾问店', value: '83 条' }];

export function DashboardPage() {
  return <Space direction="vertical" size={22} className="full-width">
    <div className="page-heading"><div className="page-heading-copy"><Typography.Title level={2}>全域数据看板</Typography.Title><Typography.Text>查看门店产出趋势、任务完成率和额度消耗情况</Typography.Text></div><div className="page-actions"><Tag color="gold">数据已更新</Tag><Typography.Text type="secondary">2026-05-18 18:30</Typography.Text></div></div>
    <Row gutter={[18, 18]}><Col xs={24} sm={12} lg={6}><Card className="stat-card"><Statistic title="活跃门店" value={128} prefix={<ShopOutlined />} suffix="家" /><Typography.Text type="secondary">较上周 <span style={{ color: '#5b9a71' }}>+12.6%</span></Typography.Text></Card></Col><Col xs={24} sm={12} lg={6}><Card className="stat-card"><Statistic title="本周成片" value={1204} prefix={<CloudOutlined />} suffix="条" /><Typography.Text type="secondary">较上周 <span style={{ color: '#5b9a71' }}>+18.2%</span></Typography.Text></Card></Col><Col xs={24} sm={12} lg={6}><Card className="stat-card"><Statistic title="已进入发布" value={856} prefix={<CheckCircleOutlined />} suffix="条" /><Typography.Text type="secondary">发布转化 <span style={{ color: '#9a7040' }}>71.1%</span></Typography.Text></Card></Col><Col xs={24} sm={12} lg={6}><Card className="stat-card"><Statistic title="活跃员工" value={642} prefix={<TeamOutlined />} suffix="人" /><Typography.Text type="secondary">环比增长 <span style={{ color: '#5b9a71' }}><ArrowUpOutlined /> 8.6%</span></Typography.Text></Card></Col></Row>
    <div className="dashboard-grid"><Card className="chart-card" title="七日生产趋势" extra={<Tag color="gold">内容产出</Tag>}><div className="chart-bars">{bars.map((height, index) => <div className="chart-bar" style={{ height: `${height}%` }} key={index} />)}</div><div className="chart-labels"><span>周一</span><span>周二</span><span>周三</span><span>周四</span><span>周五</span><span>周六</span><span>周日</span></div></Card><Card className="chart-card" title="成片结构占比"><div className="donut-wrap"><div className="donut" /><div className="legend-list"><div className="legend-item"><span><span className="legend-dot" />图片</span><strong>46%</strong></div><div className="legend-item"><span><span className="legend-dot video" />视频</span><strong>26%</strong></div><div className="legend-item"><span><span className="legend-dot copy" />文案</span><strong>28%</strong></div></div></div></Card></div>
    <div className="dashboard-grid-wide"><Card title="任务完成率排行" extra={<Typography.Text type="secondary">本周</Typography.Text>}>{rank.map((item, index) => <div className="rank-row" key={item.name}><span className="rank-index">{index + 1}</span><span className="rank-name">{item.name}</span><Progress percent={[96, 91, 87, 82][index]} showInfo={false} strokeColor="#c9a46c" style={{ width: 120 }} /><span className="rank-value">{item.value}</span></div>)}</Card><Card title="额度消耗 TOP10" extra={<Typography.Text type="secondary">本月</Typography.Text>}><Table size="small" pagination={false} dataSource={trendData.slice(0, 4)} columns={[{ title: '门店', dataIndex: 'date', render: (value) => `北京${value}示范店` }, { title: '已消耗', dataIndex: 'works', render: (value) => `${value * 10} 点` }, { title: '使用率', dataIndex: 'completion', render: (value) => <Tag color="gold">{value}</Tag> }]} /></Card></div>
  </Space>;
}
