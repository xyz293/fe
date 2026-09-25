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

/** 门店额度抽屉（GET /api/admin/quota/store/{storeId}，文档 §2.4.3）：余额卡 + 流水表（门店账户不存在会自动创建，余额 0） */
export function StoreQuotaDrawer({ store, onClose }: StoreQuotaDrawerProps) {
  const [account, setAccount] = useState<QuotaAccount | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!store) return;
    setLoading(true);
    setError('');
    setAccount(null);
    // 传入门店 ID，由后端解析为该门店的额度账户（不存在自动创建）
    quotaApi.getStoreQuotaAccount(store.id)
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
              <Statistic title="账户 ID" value={String(account.id)} />
              <Statistic title="账户级别" value={account.level === 'TENANT' ? '租户池' : '门店账户'} />
            </Space>
          ) : (
            !loading && !error && <Typography.Text type="secondary">该门店暂无额度账户</Typography.Text>
          )}
        </Card>
        <Card title="流水记录（含分配记录）" size="small">
          <FlowTable accountId={account?.id} />
        </Card>
      </Space>
    </Drawer>
  );
}
