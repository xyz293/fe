import { Button, Modal, Table, Tag } from 'antd';
import type { PaymentOrder } from '@xiaoa/share/types';
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
  onVoid: (order: PaymentOrder) => void;
}

/** 收款单列表：状态筛选在外层；确认入池为二次确认 + 按钮 loading + 后端幂等双保险 */
export function OrderTable({ orders, total, pageNo, loading, actingId, onPageChange, onConfirm, onVoid }: OrderTableProps) {
  return (
    <Table
      rowKey={(record) => String(record.id)}
      dataSource={orders}
      loading={loading}
      locale={{ emptyText: '暂无收款单' }}
      pagination={{ current: pageNo, pageSize: 10, total, showSizeChanger: false, onChange: onPageChange }}
      columns={[
        { title: '订单号', dataIndex: 'orderNo', width: 180 },
        { title: '租户', dataIndex: 'tenantName' },
        { title: '金额', dataIndex: 'amount', width: 120, render: (value: number) => `¥${Number(value || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}` },
        { title: '凭证', dataIndex: 'proofUrl', render: (value: PaymentOrder['proofUrl']) => value ? <a href={value} target="_blank" rel="noreferrer">查看</a> : '-' },
        { title: '发票号', dataIndex: 'invoiceNo', render: (value: PaymentOrder['invoiceNo']) => value || '-' },
        { title: '状态', dataIndex: 'status', width: 90, render: (value: PaymentOrder['status']) => { const meta = PAYMENT_STATUS_MAP[value]; return <Tag color={meta?.color === 'default' ? undefined : meta?.color}>{meta?.label || value}</Tag>; } },
        { title: '登记时间', dataIndex: 'createdAt', width: 160, render: (value: PaymentOrder['createdAt']) => value || '-' },
        { title: '入池时间', dataIndex: 'settledAt', width: 160, render: (value: PaymentOrder['settledAt']) => value || '-' },
        {
          title: '操作',
          width: 170,
          render: (_: unknown, order: PaymentOrder) => order.status === 'PENDING' ? (
            <span>
              <Button type="link" size="small" loading={actingId === order.id} onClick={() => onConfirm(order)}>确认入池</Button>
              <Button type="link" size="small" danger loading={actingId === order.id} onClick={() => onVoid(order)}>撤销</Button>
            </span>
          ) : '-',
        },
      ]}
    />
  );
}

/** 确认入池二次确认弹窗（展示金额 + 租户名） */
export function confirmSettle(order: PaymentOrder, run: () => Promise<void>) {
  Modal.confirm({
    title: '确认入池',
    content: `将把 ¥${Number(order.amount).toLocaleString('zh-CN', { minimumFractionDigits: 2 })} 写入「${order.tenantName}」的算力总池，确认对公到账？`,
    okText: '确认入池',
    cancelText: '再想想',
    onOk: run,
  });
}

/** 撤销二次确认弹窗 */
export function confirmVoid(order: PaymentOrder, run: () => Promise<void>) {
  Modal.confirm({
    title: '撤销收款单',
    content: `撤销后收款单 ${order.orderNo} 不再入池，确认撤销？`,
    okText: '撤销',
    okButtonProps: { danger: true },
    cancelText: '再想想',
    onOk: run,
  });
}
