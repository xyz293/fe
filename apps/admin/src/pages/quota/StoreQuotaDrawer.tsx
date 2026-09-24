import { Alert, Card, Drawer, Space, Statistic, Typography } from 'antd';
import { useEffect, useState } from 'react';
import type { OrgNode, QuotaAccount } from '@xiaoa/share';
import { formatQuota } from '@xiaoa/share/constants';
import { quotaApi } from '../../services/sharedApi';
import { FlowTable } from './FlowTable';

export interface StoreQuotaDrawerProps {
  /** 组织树中的门店节点（type=3） */
  store: OrgNode | null;
  onClose: () => void;
}

/** 门店额度抽屉：余额卡 + 流水表（含分配记录，可用类型筛选查看） */
export function StoreQuotaDrawer({ store, onClose }: StoreQuotaDrawerProps) {
  const [account, setAccount] = useState<QuotaAccount | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!store) return;
    setLoading(true);
    setError('');
    setAccount(null);
    // 传入门店组织 ID，由后端解析为该门店的额度账户
    quotaApi.getQuotaAccount(store.id)
      .then(setAccount)
      .catch((requestError) => setError(requestError instanceof Error ? requestError.message : '门店账户加载失败'))
      .finally(() => setLoading(false));
  }, [store]);

  return (
    <Drawer title={`门店额度 · ${store?.name || ''}`} open={Boolean(store)} onClose={onClose} width={640} destroyOnClose>
      <Space direction="vertical" size={18} className="full-width">
        {error && <Alert type="warning" showIcon message={error} />}
        <Card loading={loading} size="small">
          {account ? (
            <Space size={36} wrap>
              <Statistic title="门店余额" value={account.balance} formatter={(value) => formatQuota(Number(value))} suffix="额度" />
              <Statistic title="累计总额" value={account.total ?? 0} formatter={(value) => formatQuota(Number(value))} suffix="额度" />
              <Statistic title="累计消耗" value={account.used ?? 0} formatter={(value) => formatQuota(Number(value))} suffix="额度" />
            </Space>
          ) : (
            !loading && !error && <Typography.Text type="secondary">该门店暂无额度账户</Typography.Text>
          )}
        </Card>
        <Card title="流水记录（含分配记录）" size="small">
          <FlowTable accountId={account?.accountId ?? store?.id} />
        </Card>
      </Space>
    </Drawer>
  );
}
