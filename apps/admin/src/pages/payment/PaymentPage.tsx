import { Alert, Button, Select, Space, Typography, message } from 'antd';
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { useEffect, useState } from 'react';
import type { PaymentOrder, PaymentStatus } from '@xiaoa/share';
import { quotaApi } from '../../services/sharedApi';
import { OrderTable, confirmSettle, confirmVoid } from './OrderTable';
import { RegisterModal } from './RegisterModal';

/** 平台 · 收款入池：登记收款 → 确认入池（幂等键 pay:{orderId}，重复点击安全，前端仍做按钮 loading） */
export function PaymentPage() {
  const [orders, setOrders] = useState<PaymentOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState<PaymentStatus | ''>('');
  const [pageNo, setPageNo] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [registerOpen, setRegisterOpen] = useState(false);
  const [actingId, setActingId] = useState<string | number | null>(null);

  const load = (page = pageNo, statusFilter = status) => {
    setLoading(true);
    setError('');
    quotaApi.getPlatformPayments({ status: statusFilter || undefined, pageNo: page, pageSize: 10 })
      .then((result) => { setOrders(result.list || []); setTotal(result.total || 0); })
      .catch((requestError) => setError(requestError instanceof Error ? requestError.message : '收款单加载失败'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(1, status); setPageNo(1); }, [status]);

  const settle = async (order: PaymentOrder) => {
    setActingId(order.id);
    try {
      await quotaApi.confirmPayment(order.id);
      message.success(`收款单 ${order.orderNo} 已入池`);
      load();
    } catch (requestError) {
      message.error(requestError instanceof Error ? requestError.message : '确认入池失败');
    } finally {
      setActingId(null);
    }
  };

  const cancel = async (order: PaymentOrder) => {
    setActingId(order.id);
    try {
      await quotaApi.voidPayment(order.id);
      message.success(`收款单 ${order.orderNo} 已撤销`);
      load();
    } catch (requestError) {
      message.error(requestError instanceof Error ? requestError.message : '撤销失败');
    } finally {
      setActingId(null);
    }
  };

  return (
    <Space direction="vertical" size={22} className="full-width">
      <div className="page-heading">
        <div className="page-heading-copy">
          <Typography.Title level={2}>平台 · 收款入池</Typography.Title>
          <Typography.Text>登记对公收款并确认写入租户算力总池，支持撤销误登记</Typography.Text>
        </div>
        <div className="page-actions">
          <Select
            value={status}
            style={{ width: 130 }}
            onChange={(value: PaymentStatus | '') => setStatus(value)}
            options={[{ label: '全部状态', value: '' }, ...Object.entries({ PENDING: '待入池', SETTLED: '已入池', CANCELED: '已撤销' }).map(([value, label]) => ({ label, value }))]}
          />
          <Button icon={<ReloadOutlined />} onClick={() => load()}>刷新</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setRegisterOpen(true)}>登记收款</Button>
        </div>
      </div>
      {error && <Alert type="warning" showIcon message={error} />}
      <OrderTable
        orders={orders}
        total={total}
        pageNo={pageNo}
        loading={loading}
        actingId={actingId}
        onPageChange={(page) => { setPageNo(page); load(page); }}
        onConfirm={(order) => confirmSettle(order, () => settle(order))}
        onVoid={(order) => confirmVoid(order, () => cancel(order))}
      />
      <RegisterModal open={registerOpen} onClose={() => setRegisterOpen(false)} onSuccess={() => load(1, status)} />
    </Space>
  );
}
