import { Alert, Button, Card, Col, Row, Space, Statistic, Tag, Typography } from 'antd';
import { PlusOutlined, ReloadOutlined, UploadOutlined } from '@ant-design/icons';
import { useEffect, useState } from 'react';
import type { QuotaAccount } from '@xiaoa/share';
import { formatQuota } from '@xiaoa/share/constants';
import { quotaApi } from '../../services/sharedApi';
import { AllocateModal } from './AllocateModal';
import { CreditModal } from './CreditModal';
import { FlowTable } from './FlowTable';

/**
 * 算力总池：租户池余额卡 + 充值/分配 + 流水。
 * 数据源 GET /api/quota/my（文档 §2.5：HQ_ADMIN/REGION_ADMIN/VIEWER 返回租户池账户 + 最近 10 条流水），
 * 充值走 POST /api/admin/quota/credit（文档 §2.4.1），下发走 POST /api/admin/quota/allocate（文档 §2.4.2）。
 */
export function PoolPage() {
  const [account, setAccount] = useState<QuotaAccount | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [allocateOpen, setAllocateOpen] = useState(false);
  const [creditOpen, setCreditOpen] = useState(false);
  // 充值/分配成功 / 手动刷新时 +1：强制 refetch 余额和流水（不做本地加减法模拟）
  const [refreshKey, setRefreshKey] = useState(0);

  const load = () => {
    setLoading(true);
    setError('');
    quotaApi.getMyQuota()
      .then((result) => setAccount(result.account))
      .catch((requestError) => setError(requestError instanceof Error ? requestError.message : '算力总池加载失败'))
      .finally(() => setLoading(false));
  };

  useEffect(load, [refreshKey]);

  return (
    <Space direction="vertical" size={22} className="full-width">
      <div className="page-heading">
        <div className="page-heading-copy">
          <Typography.Title level={2}>算力总池</Typography.Title>
          <Typography.Text>企业额度总池、账户充值、门店分配与消耗流水（单位：额度）</Typography.Text>
        </div>
        <div className="page-actions">
          <Button icon={<ReloadOutlined />} onClick={() => setRefreshKey((key) => key + 1)} loading={loading}>刷新</Button>
          <Button icon={<UploadOutlined />} onClick={() => setCreditOpen(true)}>账户充值</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setAllocateOpen(true)}>分配额度到门店</Button>
        </div>
      </div>
      {error && <Alert type="warning" showIcon message={error} />}
      <Row gutter={[18, 18]}>
        <Col xs={24} sm={8}><Card className="stat-card" loading={loading}><Statistic title="当前总池余额" value={account?.balance ?? 0} formatter={(value) => formatQuota(Number(value))} suffix="额度" /></Card></Col>
        <Col xs={24} sm={8}><Card className="stat-card" loading={loading}><Statistic title="账户级别" value={account ? (account.level === 'TENANT' ? '租户池' : '门店账户') : '-'} /></Card></Col>
        <Col xs={24} sm={8}><Card className="stat-card" loading={loading}><Statistic title="账户 ID" value={account ? String(account.id) : '-'} /></Card></Col>
      </Row>
      {account?.level === 'TENANT' && (
        <Card size="small"><Typography.Text type="secondary">提示：充值直接进入租户池（POST /api/admin/quota/credit）；下发时从租户池扣出、充入门店账户，一次产生分配出/分配入两条流水。</Typography.Text><Tag style={{ marginLeft: 8 }}> ownerId={String(account.ownerId)}</Tag></Card>
      )}
      <Card title="流水记录" loading={loading}>
        <FlowTable accountId={account?.id} refreshKey={refreshKey} />
      </Card>
      <AllocateModal
        open={allocateOpen}
        balance={account?.balance ?? 0}
        onClose={() => setAllocateOpen(false)}
        onSuccess={() => setRefreshKey((key) => key + 1)}
      />
      <CreditModal
        open={creditOpen}
        account={account}
        onClose={() => setCreditOpen(false)}
        onSuccess={() => setRefreshKey((key) => key + 1)}
      />
    </Space>
  );
}
