import { Button, Modal, Table, Tag, Typography } from 'antd';
import type { PaymentOrder } from '@xiaoa/share';
import { PAYMENT_STATUS_MAP } from '@xiaoa/share/constants';

export interface OrderTableProps {
  orders: PaymentOrder[];
  total: number;
  pageNo: number;
  loading: boolean;
  /** 行操作进行中的订单 ID（确认入池 / 撤销按钮 loading） */
  actingId: string | number | null;
  onPageChange: (page: number) => void;
  onConfirm: (order: PaymentOrder) => void;
  onCancel: (order: PaymentOrder) => void;
}

function formatMoney(value: number) {
  return `¥${Number(value || 0).toLocaleString('zh-CN')}`;
}

/** 收款单列表（文档 §2.3.5 字段）：确认入池为二次确认 + 按钮 loading + 后端幂等（pay:{orderId}）双保险 */
export function OrderTable({ orders, total, pageNo, loading, actingId, onPageChange, onConfirm, onCancel }: OrderTableProps) {
  return (
    <Table
      rowKey={(record) => String(record.id)}
      dataSource={orders}
      loading={loading}
      locale={{ emptyText: '暂无收款单' }}
      pagination={{ current: pageNo, pageSize: 10, total, showSizeChanger: false, onChange: onPageChange }}
      columns={[
        { title: '订单号', dataIndex: 'orderNo', width: 200 },
        { title: '租户 ID', dataIndex: 'tenantId', width: 100 },
        { title: '金额', dataIndex: 'amount', width: 120, render: (value: number) => formatMoney(value) },
        { title: '渠道', dataIndex: 'channel', width: 100, render: (value: PaymentOrder['channel']) => value || '-' },
        { title: '凭证', dataIndex: 'voucherUrl', render: (value: PaymentOrder['voucherUrl']) => value ? <a href={value} target="_blank" rel="noreferrer">查看</a> : '-' },
        { title: '发票号', dataIndex: 'invoiceNo', render: (value: PaymentOrder['invoiceNo']) => value || '-' },
        {
          title: '状态',
          dataIndex: 'status',
          width: 100,
          render: (value: PaymentOrder['status']) => {
            const meta = PAYMENT_STATUS_MAP[value];
            return <Tag color={meta?.color === 'default' ? undefined : meta?.color}>{meta?.label || value}</Tag>;
          },
        },
        { title: '登记时间', dataIndex: 'createdAt', width: 160, render: (value: PaymentOrder['createdAt']) => value || '-' },
        { title: '复核时间', dataIndex: 'confirmedAt', width: 160, render: (value: PaymentOrder['confirmedAt']) => value || '-' },
        {
          title: '操作',
          width: 170,
          render: (_: unknown, order: PaymentOrder) => order.status === 'PENDING' ? (
            <span>
              <Button type="link" size="small" loading={actingId === order.id} onClick={() => onConfirm(order)}>确认入池</Button>
              <Button type="link" size="small" danger loading={actingId === order.id} onClick={() => onCancel(order)}>撤销</Button>
            </span>
          ) : <Typography.Text type="secondary">-</Typography>,
        },
      ]}
    />
  );
}

/** 确认入池二次确认弹窗（确认后同事务给该租户额度池充值，幂等键 pay:{orderId}） */
export function confirmSettle(order: PaymentOrder, run: () => Promise<void>) {
  Modal.confirm({
    title: '确认入池',
    content: `将把 ${formatMoney(order.amount)} 写入租户 #${order.tenantId} 的额度池，确认到账？`,
    okText: '确认入池',
    cancelText: '再想想',
    onOk: run,
  });
}

/** 撤销二次确认弹窗（仅 PENDING 可撤销；已 SETTLED 的单不可撤销，需要退额度走负向充值） */
export function confirmVoid(order: PaymentOrder, run: () => Promise<void>) {
  Modal.confirm({
    title: '撤销收款单',
    content: `撤销后收款单 ${order.orderNo} 不再入池、不产生任何额度变动，确认撤销？`,
    okText: '撤销',
    okButtonProps: { danger: true },
    cancelText: '再想想',
    onOk: run,
  });
}
