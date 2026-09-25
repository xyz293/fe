import { Button, Form, Input, InputNumber, Modal, Select, Typography, message } from 'antd';
import { useEffect, useState } from 'react';
import type { PaymentOrder, PlatformTenant } from '@xiaoa/share/types';
import { quotaApi, sharedApi } from '../../services/sharedApi';

export interface RegisterModalProps {
  open: boolean;
  onClose: () => void;
  /** 登记成功后回调（携带新建的收款单；后端无列表接口时父页面用它维护会话内单据） */
  onSuccess: (order: PaymentOrder) => void;
}

interface RegisterFormValues { tenantId: string; amount: number; channel: string; orderNo?: string; voucherUrl?: string; invoiceNo?: string; }

/** 收款渠道（文档 §2.3.2：前端自定义字符串，如 BANK / WECHAT） */
const CHANNEL_OPTIONS = [
  { value: 'BANK', label: '对公转账' },
  { value: 'WECHAT', label: '微信' },
  { value: 'ALIPAY', label: '支付宝' },
  { value: 'OTHER', label: '其他' },
];

/** 登记收款（POST /platform/payment/register，文档 §2.3.2，PLATFORM_FINANCE）：登记后进入 PENDING 待确认，确认才入池 */
export function RegisterModal({ open, onClose, onSuccess }: RegisterModalProps) {
  const [form] = Form.useForm<RegisterFormValues>();
  const [tenants, setTenants] = useState<PlatformTenant[]>([]);
  const [loading, setLoading] = useState(false);
  const [tenantLoading, setTenantLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    form.resetFields();
    setTenantLoading(true);
    sharedApi.getPlatformTenants({ pageNo: 1, pageSize: 100 })
      .then((result) => setTenants(result.list || []))
      .catch(() => setTenants([]))
      .finally(() => setTenantLoading(false));
  }, [open, form]);

  const submit = async (values: RegisterFormValues) => {
    setLoading(true);
    try {
      const order = await quotaApi.registerPayment({
        tenantId: values.tenantId,
        amount: values.amount,
        channel: values.channel,
        orderNo: values.orderNo?.trim() || undefined,
        voucherUrl: values.voucherUrl?.trim() || undefined,
        invoiceNo: values.invoiceNo?.trim() || undefined,
      });
      message.success(`收款单 ${order.orderNo} 登记成功，待确认入池`);
      onSuccess(order);
      onClose();
    } catch (requestError) {
      message.error(requestError instanceof Error ? requestError.message : '收款登记失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title="登记收款" open={open} onCancel={onClose} footer={null} destroyOnClose>
      <Typography.Paragraph type="secondary">对公到账后先登记，再由「确认入池」写入租户额度池；登记不直接生效。重复 orderNo 幂等返回已有单。</Typography.Paragraph>
      <Form form={form} layout="vertical" onFinish={submit}>
        <Form.Item name="tenantId" label="租户" rules={[{ required: true, message: '请选择租户' }]}>
          <Select showSearch optionFilterProp="label" loading={tenantLoading} placeholder="选择收款对应的租户" options={tenants.map((tenant) => ({ label: tenant.name, value: String(tenant.id) }))} />
        </Form.Item>
        <Form.Item name="channel" label="收款渠道" rules={[{ required: true, message: '请选择收款渠道' }]}>
          <Select options={CHANNEL_OPTIONS} placeholder="如对公转账 / 微信" />
        </Form.Item>
        <Form.Item name="amount" label="收款金额" rules={[{ required: true, message: '请输入收款金额' }, { type: 'integer', min: 1, message: '金额须为 ≥1 的整数' }]}>
          <InputNumber className="full-input" min={1} precision={0} placeholder="例如：12000" />
        </Form.Item>
        <Form.Item name="orderNo" label="外部单号（选填）" extra="不传自动生成 PAY-{uuid}；重复 orderNo 幂等返回已有单">
          <Input maxLength={64} placeholder="如银行流水号" />
        </Form.Item>
        <Form.Item name="voucherUrl" label="收款凭证（选填）">
          <Input placeholder="凭证地址" />
        </Form.Item>
        <Form.Item name="invoiceNo" label="发票号（选填）">
          <Input placeholder="选填" />
        </Form.Item>
        <Button type="primary" htmlType="submit" block loading={loading}>提交登记</Button>
      </Form>
    </Modal>
  );
}
