import { Alert, Card, Col, Progress, Row, Select, Space, Statistic, Tag, Typography } from 'antd';
import { ArrowDownOutlined, ArrowUpOutlined, BankOutlined, CheckCircleOutlined, ClockCircleOutlined, ShopOutlined, TeamOutlined, WalletOutlined } from '@ant-design/icons';
import { useEffect, useState } from 'react';
import type { PlatformDashboard, PlatformPeriod } from '@xiaoa/share/types';
import { sharedApi } from '../services/sharedApi';

const fallbackDashboard: PlatformDashboard = {
  tenantCount: 0,
  tenantNewThisMonth: 0,
  storeCount: 0,
  activeStoreCount: 0,
  monthlyRecharge: 0,
  rechargeMonthOverMonth: 0,
  monthlyConsumption: 0,
  consumptionMonthOverMonth: 0,
  consumptionTrend: [],
  tenantTop: [],
  creationTypeRatio: [],
  pendingTenantCount: 0,
  pendingRechargeCount: 0,
  expiringPlanCount: 0,
};

function Trend({ value }: { value: number }) {
  const positive = value >= 0;
  return <Typography.Text type={positive ? 'success' : 'danger'}><span className="trend-value">{positive ? <ArrowUpOutlined /> : <ArrowDownOutlined />} {Math.abs(value)}%</span> 环比</Typography.Text>;
}

function TrendBars({ points }: { points: PlatformDashboard['consumptionTrend'] }) {
  const values = points.length ? points : Array.from({ length: 12 }, (_, index) => ({ date: `${index + 1}`, value: 0 }));
  const max = Math.max(...values.map((point) => point.value), 1);
  return <div className="platform-trend"><div className="trend-bars">{values.slice(-30).map((point) => <div className="trend-bar-wrap" key={point.date}><div className="trend-bar" style={{ height: `${Math.max((point.value / max) * 100, 4)}%` }} title={`${point.date}: ${point.value.toLocaleString()}`} /></div>)}</div><div className="trend-labels"><span>{values[0]?.date || '-'}</span><span>{values[values.length - 1]?.date || '-'}</span></div></div>;
}

export function PlatformDashboardPage() {
  const [period, setPeriod] = useState<PlatformPeriod>('month');
  const [dashboard, setDashboard] = useState<PlatformDashboard>(fallbackDashboard);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    sharedApi.getPlatformDashboard(period).then(setDashboard).catch((requestError) => setError(requestError instanceof Error ? requestError.message : '运营数据加载失败')).finally(() => setLoading(false));
  }, [period]);

  const cards = [
    { title: '租户数', value: dashboard.tenantCount, suffix: '家', prefix: <TeamOutlined />, extra: `↑${dashboard.tenantNewThisMonth} 本月新增`, color: '#b8874f' },
    { title: '门店总数', value: dashboard.storeCount, suffix: '家', prefix: <ShopOutlined />, extra: `活跃 ${dashboard.activeStoreCount}`, color: '#8eaaa0' },
    { title: '本月充值', value: dashboard.monthlyRecharge, prefix: <WalletOutlined />, precision: 0, prefixText: '¥', extra: <Trend value={dashboard.rechargeMonthOverMonth} />, color: '#d58b83' },
    { title: '本月消耗', value: dashboard.monthlyConsumption, suffix: '积分', prefix: <BankOutlined />, extra: <Trend value={dashboard.consumptionMonthOverMonth} />, color: '#8067a1' },
  ];

  return <Space direction="vertical" size={20} className="full-width platform-page">
    <div className="page-heading"><div className="page-heading-copy"><Typography.Title level={2}>平台运营总览</Typography.Title><Typography.Text>聚合租户、门店、充值和积分消耗，掌握平台经营状态</Typography.Text></div><Select value={period} onChange={setPeriod} options={[{ label: '本月', value: 'month' }, { label: '本周', value: 'week' }, { label: '本年', value: 'year' }]} style={{ width: 110 }} /></div>
    {error && <Alert type="warning" showIcon message={error} />}
    <Row gutter={[16, 16]}>{cards.map((card) => <Col xs={24} sm={12} xl={6} key={card.title}><Card className="stat-card platform-stat-card" loading={loading}><Statistic title={card.title} value={card.value} precision={card.precision} prefix={<span style={{ color: card.color }}>{card.prefix}</span>} suffix={card.suffix} formatter={(value) => `${card.prefixText || ''}${Number(value).toLocaleString()}`} /><div className="stat-extra">{card.extra}</div></Card></Col>)}</Row>
    <Row gutter={[16, 16]}>
      <Col xs={24} xl={14}><Card title="近 30 天积分消耗趋势" extra={<Tag color="gold">quota_flow</Tag>}><TrendBars points={dashboard.consumptionTrend} /></Card></Col>
      <Col xs={24} xl={10}><Card title="租户消耗 TOP10"><Space direction="vertical" size={14} className="full-width">{dashboard.tenantTop.length ? dashboard.tenantTop.slice(0, 10).map((tenant, index) => <div className="platform-ranking" key={String(tenant.tenantId)}><span className="rank-index">{index + 1}</span><span className="rank-name">{tenant.tenantName}</span><Progress percent={Math.round((tenant.value / Math.max(dashboard.tenantTop[0]?.value || 1, 1)) * 100)} showInfo={false} /><span className="rank-value">{tenant.value.toLocaleString()}</span></div>) : <Typography.Text type="secondary">暂无租户消耗数据</Typography.Text>}</Space></Card></Col>
    </Row>
    <Row gutter={[16, 16]}>
      <Col xs={24} xl={12}><Card title="创作类型占比"><div className="ratio-layout"><div className="ratio-donut" /><div className="legend-list">{dashboard.creationTypeRatio.length ? dashboard.creationTypeRatio.map((item) => <div className="legend-item" key={item.type}><span><i className="legend-dot" />{item.type}</span><strong>{item.percent}%</strong></div>) : <Typography.Text type="secondary">暂无创作类型数据</Typography.Text>}</div></div></Card></Col>
      <Col xs={24} xl={12}><Card title="待办提醒"><Space direction="vertical" size={14} className="full-width platform-todos"><div><ClockCircleOutlined /> <Typography.Link href="/platform/tenants">{dashboard.pendingTenantCount} 个租户待审核</Typography.Link></div><div><WalletOutlined /> <Typography.Link href="/platform/recharges">{dashboard.pendingRechargeCount} 笔充值待确认</Typography.Link></div><div><CheckCircleOutlined /> <Typography.Link href="/platform/plans">{dashboard.expiringPlanCount} 个套餐即将到期</Typography.Link></div></Space></Card></Col>
    </Row>
  </Space>;
}
