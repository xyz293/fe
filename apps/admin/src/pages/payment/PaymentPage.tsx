import { Alert, Button, Select, Space, Tag, Typography, message } from 'antd';
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { useCallback, useEffect, useState } from 'react';
import type { PaymentOrder, PaymentStatus } from '@xiaoa/share';
import { quotaApi } from '../../services/sharedApi';
import { OrderTable, confirmSettle, confirmVoid } from './OrderTable';
import { RegisterModal } from './RegisterModal';

/**
 * 平台 · 收款入池（文档 §2.3）：
 * 登记收款（/platform/payment/register）→ 确认入池（/platform/payment/{id}/confirm，幂等键 pay:{orderId}）。
 * 列表接口文档未收录，做尽力兼容：后端不可用时回退展示"本次会话登记的收款单"。
 */
export function PaymentPage() {
  const [orders, setOrders] = useState<PaymentOrder[]>([]);
  const [sessionOrders, setSessionOrders] = useState<PaymentOrder[]>([]);
  const [listAvailable, setListAvailable] = useState(true);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState<PaymentStatus | ''>('');
  const [pageNo, setPageNo] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [registerOpen, setRegisterOpen] = useState(false);
  const [actingId, setActingId] = useState<string | number | null>(null);

  const filterByStatus = useCallback((list: PaymentOrder[], statusFilter: PaymentStatus | '') => (statusFilter ? list.filter((order) => order.status === statusFilter) : list), []);

  const load = (page = pageNo, statusFilter = status) => {
    setLoading(true);
    setError('');
    quotaApi.getPlatformPayments({ status: statusFilter || undefined, pageNo: page, pageSize: 10 })
      .then((result) => {
        setListAvailable(true);
        setOrders(result.list || []);
        setTotal(result.total || 0);
      })
      .catch((requestError) => {
        // 后端未提供列表接口 → 回退到会话内登记的单据
        setListAvailable(false);
        setOrders(filterByStatus(sessionOrders, statusFilter));
        setTotal(filterByStatus(sessionOrders, statusFilter).length);
        setError(requestError instanceof Error ? `收款单列表接口不可用（${requestError.message}），当前展示本次会话登记的单据` : '收款单加载失败');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(1, status); setPageNo(1); }, [status]);

  const settle = async (order: PaymentOrder) => {
    setActingId(order.id);
    try {
      const updated = await quotaApi.confirmPayment(order.id);
      message.success(`收款单 ${order.orderNo} 已入租户额度池`);
      const next = updated || { ...order, status: 'SETTLED' as const };
      setSessionOrders((current) => current.map((item) => (String(item.id) === String(order.id) ? next : item)));
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
      await quotaApi.cancelPayment(order.id);
      message.success(`收款单 ${order.orderNo} 已撤销`);
      setSessionOrders((current) => current.map((item) => (String(item.id) === String(order.id) ? { ...item, status: 'CANCELED' as const } : item)));
      load();
    } catch (requestError) {
      message.error(requestError instanceof Error ? requestError.message : '撤销失败');
    } finally {
      setActingId(null);
    }
  };

  const onRegistered = (order: PaymentOrder) => {
    setSessionOrders((current) => [order, ...current]);
    if (!listAvailable) {
      setOrders(filterByStatus([order, ...sessionOrders], status));
      setTotal(sessionOrders.length + 1);
    }
  };

  const pendingCount = orders.filter((order) => order.status === 'PENDING').length;

  return (
    <Space direction="vertical" size={22} className="full-width">
      <div className="page-heading">
        <div className="page-heading-copy">
          <Typography.Title level={2}>平台 · 收款入池</Typography.Title>
          <Typography.Text>登记收款单并确认入租户额度池；仅待确认（PENDING）单可撤销，已确认单不可撤销</Typography.Text>
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
      {!error && pendingCount > 0 && <Tag color="gold">待入池 {pendingCount} 笔</Tag>}
      <OrderTable
        orders={orders}
        total={total}
        pageNo={pageNo}
        loading={loading}
        actingId={actingId}
        onPageChange={(page) => { setPageNo(page); load(page); }}
        onConfirm={(order) => confirmSettle(order, () => settle(order))}
        onCancel={(order) => confirmVoid(order, () => cancel(order))}
      />
      <RegisterModal open={registerOpen} onClose={() => setRegisterOpen(false)} onSuccess={onRegistered} />
    </Space>
  );
}
