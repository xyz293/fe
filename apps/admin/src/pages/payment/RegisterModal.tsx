import { Button, Form, Input, InputNumber, Modal, Select, Typography, message } from 'antd';
import { useEffect, useState } from 'react';
import type { PlatformTenant } from '@xiaoa/share/types';
import { quotaApi, sharedApi } from '../../services/sharedApi';

export interface RegisterModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface RegisterFormValues { tenantId: string; amount: number; proofUrl?: string; invoiceNo?: string; }

/** 登记收款：租户选择 + 对公金额 + 凭证 + 发票号；登记后进入 PENDING 待确认入池 */
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
      await quotaApi.registerPayment({ tenantId: values.tenantId, amount: values.amount, proofUrl: values.proofUrl, invoiceNo: values.invoiceNo });
      message.success('收款登记成功，待确认入池');
      onSuccess();
      onClose();
    } catch (requestError) {
      message.error(requestError instanceof Error ? requestError.message : '收款登记失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title="登记收款" open={open} onCancel={onClose} footer={null} destroyOnClose>
      <Typography.Paragraph type="secondary">对公到账后先登记，再由「确认入池」写入租户算力总池；登记金额不直接生效。</Typography.Paragraph>
      <Form form={form} layout="vertical" onFinish={submit}>
        <Form.Item name="tenantId" label="租户" rules={[{ required: true, message: '请选择租户' }]}>
          <Select showSearch optionFilterProp="label" loading={tenantLoading} placeholder="选择对公收款对应的租户" options={tenants.map((tenant) => ({ label: tenant.name, value: String(tenant.id) }))} />
        </Form.Item>
        <Form.Item name="amount" label="收款金额（元）" rules={[{ required: true, message: '请输入收款金额' }]}>
          <InputNumber className="full-input" min={0.01} precision={2} placeholder="例如：12000.00" prefix="¥" />
        </Form.Item>
        <Form.Item name="proofUrl" label="转账凭证" extra="对公回单图片链接或凭证编号">
          <Input placeholder="凭证 URL / 回单编号" />
        </Form.Item>
        <Form.Item name="invoiceNo" label="发票号">
          <Input placeholder="选填" />
        </Form.Item>
        <Button type="primary" htmlType="submit" block loading={loading}>提交登记</Button>
      </Form>
    </Modal>
  );
}
