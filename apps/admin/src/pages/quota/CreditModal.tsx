import { Button, Form, Input, InputNumber, Modal, Typography, message } from 'antd';
import { useEffect, useState } from 'react';
import type { QuotaAccount } from '@xiaoa/share';
import { formatQuota } from '@xiaoa/share/constants';
import { quotaApi } from '../../services/sharedApi';

export interface CreditModalProps {
  open: boolean;
  /** 目标账户（租户池或门店账户均可，须属于本租户） */
  account: QuotaAccount | null;
  onClose: () => void;
  /** 充值成功后回调：父组件强制 refetch 余额 + 流水 */
  onSuccess: () => void;
}

interface CreditFormValues { amount: number; bizId?: string; remark?: string; }

function genBizId() {
  const cryptoRef = globalThis.crypto as Crypto | undefined;
  if (cryptoRef?.randomUUID) return `recharge:${cryptoRef.randomUUID()}`;
  return `recharge:${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * 账户充值弹窗（POST /api/admin/quota/credit，文档 §2.4.1，仅 HQ_ADMIN）。
 * 幂等：bizId 随弹窗打开生成、重试复用同一个 key，避免网络重试造成重复入账（文档注意事项 §4.1）。
 */
export function CreditModal({ open, account, onClose, onSuccess }: CreditModalProps) {
  const [form] = Form.useForm<CreditFormValues>();
  const [bizId, setBizId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setBizId(genBizId());
    form.resetFields();
  }, [open, form]);

  const submit = async (key: string, values: CreditFormValues) => {
    if (!account) return;
    setSubmitting(true);
    try {
      const updated = await quotaApi.creditQuota({ accountId: account.id, amount: values.amount, bizId: key, remark: values.remark });
      message.success(`充值成功，当前余额 ${formatQuota(updated?.balance ?? values.amount)} 额度`);
      onSuccess();
      onClose();
    } catch (requestError) {
      const reason = requestError instanceof Error ? requestError.message : '网络异常或超时';
      Modal.confirm({
        title: '充值请求未确认',
        content: `${reason}。是否使用同一凭据重试？重试不会重复入账。`,
        okText: '重试',
        cancelText: '取消',
        onOk: () => submit(key, values),
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title="账户充值" open={open} onCancel={onClose} footer={null} destroyOnClose>
      <Typography.Paragraph type="secondary">
        目标账户：{account ? `#${account.id}（${account.level === 'TENANT' ? '租户池' : '门店账户'}）` : '-'}，当前余额 {formatQuota(account?.balance ?? 0)} 额度。
      </Typography.Paragraph>
      <Form form={form} layout="vertical" onFinish={(values) => void submit(bizId || genBizId(), values)}>
        <Form.Item
          name="amount"
          label="充值额度"
          rules={[
            { required: true, message: '请输入充值额度' },
            { type: 'integer', min: 1, message: '充值额度须为 ≥1 的整数' },
          ]}
        >
          <InputNumber className="full-input" min={1} precision={0} placeholder="例如：1000" />
        </Form.Item>
        <Form.Item name="bizId" label="幂等键（选填）" extra={`默认自动生成 ${bizId}；重试复用同一 key，不会重复加钱`}>
          <Input maxLength={64} placeholder="如 recharge:订单号" />
        </Form.Item>
        <Form.Item name="remark" label="备注（选填）">
          <Input maxLength={100} placeholder="如 对公转账备注" />
        </Form.Item>
        <Typography.Paragraph type="secondary" style={{ fontSize: 12, marginBottom: 16 }}>
          幂等键 ≤64 字符；同一 bizId 重复提交返回首次结果，若被用于金额/账户不同的请求会报 1003。
        </Typography.Paragraph>
        <Button type="primary" htmlType="submit" block loading={submitting}>确认充值</Button>
      </Form>
    </Modal>
  );
}
