import { Alert, Button, Card, Col, Row, Space, Statistic, Typography } from 'antd';
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { useEffect, useState } from 'react';
import type { QuotaAccount, QuotaTrendPoint } from '@xiaoa/share/types';
import { formatQuota } from '@xiaoa/share/constants';
import { quotaApi } from '../../services/sharedApi';
import { AllocateModal } from './AllocateModal';
import { FlowTable } from './FlowTable';

/** 趋势柱状图：复用平台看板的 trend 样式（无图表库依赖） */
function TrendBars({ points }: { points: QuotaTrendPoint[] }) {
  const values = points.length ? points : Array.from({ length: 7 }, () => ({ date: '-', value: 0 }));
  const max = Math.max(...values.map((point) => point.value), 1);
  return (
    <div className="platform-trend">
      <div className="trend-bars">
        {values.map((point) => <div className="trend-bar-wrap" key={point.date}><div className="trend-bar" style={{ height: `${Math.max((point.value / max) * 100, 4)}%` }} title={`${point.date}: ${formatQuota(point.value)}`} /></div>)}
      </div>
      <div className="trend-labels"><span>{values[0]?.date || '-'}</span><span>{values[values.length - 1]?.date || '-'}</span></div>
    </div>
  );
}

/** 算力总池：余额卡 + 近 7 天消耗趋势 + 流水（数据源 GET /api/admin/quota/pool 与 /api/admin/quota/account/{id}/flows） */
export function PoolPage() {
  const [account, setAccount] = useState<QuotaAccount | null>(null);
  const [trend, setTrend] = useState<QuotaTrendPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [allocateOpen, setAllocateOpen] = useState(false);
  // 分配成功 / 手动刷新时 +1：强制 refetch 余额、趋势和流水（不做本地减法模拟）
  const [refreshKey, setRefreshKey] = useState(0);

  const load = () => {
    setLoading(true);
    setError('');
    Promise.all([quotaApi.getPoolAccount(), quotaApi.getPoolTrend(7)])
      .then(([poolAccount, poolTrend]) => { setAccount(poolAccount); setTrend(poolTrend || []); })
      .catch((requestError) => setError(requestError instanceof Error ? requestError.message : '算力总池加载失败'))
      .finally(() => setLoading(false));
  };

  useEffect(load, [refreshKey]);

  return (
    <Space direction="vertical" size={22} className="full-width">
      <div className="page-heading">
        <div className="page-heading-copy">
          <Typography.Title level={2}>算力总池</Typography.Title>
          <Typography.Text>企业额度总池、门店分配与消耗流水（单位：额度）</Typography.Text>
        </div>
        <div className="page-actions">
          <Button icon={<ReloadOutlined />} onClick={() => setRefreshKey((key) => key + 1)} loading={loading}>刷新</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setAllocateOpen(true)}>分配额度到门店</Button>
        </div>
      </div>
      {error && <Alert type="warning" showIcon message={error} />}
      <Row gutter={[18, 18]}>
        <Col xs={24} sm={8}><Card className="stat-card" loading={loading}><Statistic title="当前总池余额" value={account?.balance ?? 0} formatter={(value) => formatQuota(Number(value))} suffix="额度" /></Card></Col>
        <Col xs={24} sm={8}><Card className="stat-card" loading={loading}><Statistic title="本周消耗" value={account?.weekConsumed ?? 0} formatter={(value) => formatQuota(Number(value))} suffix="额度" /></Card></Col>
        <Col xs={24} sm={8}><Card className="stat-card" loading={loading}><Statistic title="本周充值" value={account?.weekRecharged ?? 0} formatter={(value) => formatQuota(Number(value))} suffix="额度" /></Card></Col>
      </Row>
      <Card title="近 7 天消耗趋势" loading={loading}>
        <TrendBars points={trend} />
      </Card>
      <Card title="流水记录" loading={loading}>
        <FlowTable accountId={account?.accountId} refreshKey={refreshKey} />
      </Card>
      <AllocateModal
        open={allocateOpen}
        balance={account?.balance ?? 0}
        onClose={() => setAllocateOpen(false)}
        onSuccess={() => setRefreshKey((key) => key + 1)}
      />
    </Space>
  );
}
