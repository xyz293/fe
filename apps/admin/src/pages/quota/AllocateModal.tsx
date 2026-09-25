import { Button, Form, Input, InputNumber, Modal, Space, TreeSelect, Typography, message } from 'antd';
import { useEffect, useState } from 'react';
import type { OrgNode } from '@xiaoa/share/types';
import { formatQuota } from '@xiaoa/share/constants';
import { quotaApi, sharedApi } from '../../services/sharedApi';

export interface AllocateModalProps {
  open: boolean;
  /** 实时总池余额（体验层限制，后端仍会强校验） */
  balance: number;
  onClose: () => void;
  /** 分配成功后回调：父组件强制 refetch 余额 + 流水 */
  onSuccess: () => void;
}

interface AllocateFormValues { storeId: string; amount: number; remark?: string; }

function genIdemKey() {
  const cryptoRef = globalThis.crypto as Crypto | undefined;
  if (cryptoRef?.randomUUID) return cryptoRef.randomUUID();
  return `alloc-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/** 组织树 → TreeSelect 数据：只允许 type=3 门店节点选中 */
function toStoreTreeData(nodes: OrgNode[]): Array<{ value: string; title: string; selectable: boolean; children?: ReturnType<typeof toStoreTreeData> }> {
  return nodes.map((node) => ({
    value: String(node.id),
    title: node.type === 3 ? `${node.name}（#${node.id}）` : node.name,
    selectable: node.type === 3,
    children: node.children?.length ? toStoreTreeData(node.children) : undefined,
  }));
}

/**
 * 分配额度到门店弹窗（POST /api/admin/quota/allocate，文档 §2.4.2，仅 HQ_ADMIN）。
 * 幂等（文档注意事项 §4.1）：bizId 随弹窗打开生成、重试复用同一 key（后端实际落库为 {bizId}:out / {bizId}:in 两条，不会双扣）。
 */
export function AllocateModal({ open, balance, onClose, onSuccess }: AllocateModalProps) {
  const [form] = Form.useForm<AllocateFormValues>();
  const [bizId, setBizId] = useState('');
  const [storeTree, setStoreTree] = useState<Array<ReturnType<typeof toStoreTreeData>[number]>>([]);
  const [submitting, setSubmitting] = useState(false);

  // 每次打开弹窗生成新的幂等键（不随提交变化），并加载组织树门店
  useEffect(() => {
    if (!open) return;
    setBizId(genIdemKey());
    form.resetFields();
    sharedApi.getOrgTree().then((tree) => setStoreTree(toStoreTreeData(tree))).catch(() => setStoreTree([]));
  }, [open, form]);

  const submit = async (key: string, values: AllocateFormValues) => {
    setSubmitting(true);
    try {
      await quotaApi.allocateQuota({ storeId: values.storeId, amount: values.amount, bizId: key, remark: values.remark });
      message.success(`已向门店分配 ${formatQuota(values.amount)} 额度`);
      onSuccess();
      onClose();
    } catch (requestError) {
      const reason = requestError instanceof Error ? requestError.message : '网络异常或超时';
      Modal.confirm({
        title: '分配请求未确认',
        content: `${reason}。是否使用同一凭据重试？重试不会重复扣减。`,
        okText: '重试',
        cancelText: '取消',
        onOk: () => submit(key, values),
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleFinish = (values: AllocateFormValues) => {
    // 提交使用打开弹窗时生成的幂等键；重试路径也复用同一个 key
    void submit(bizId || genIdemKey(), values);
  };

  return (
    <Modal title="分配额度到门店" open={open} onCancel={onClose} footer={null} destroyOnClose>
      <Typography.Paragraph type="secondary">当前总池余额 {formatQuota(balance)} 额度；分配后实时刷新余额与流水。</Typography.Paragraph>
      <Form form={form} layout="vertical" onFinish={handleFinish}>
        <Form.Item name="storeId" label="目标门店" rules={[{ required: true, message: '请选择门店' }]}>
          <TreeSelect treeData={storeTree} placeholder="从组织树中选择门店" showSearch treeNodeFilterProp="title" loading={submitting} allowClear />
        </Form.Item>
        <Form.Item
          name="amount"
          label="分配额度"
          extra={`整数额度，不能超过总池余额 ${formatQuota(balance)}（后端仍会强校验）`}
          rules={[
            { required: true, message: '请输入分配额度' },
            { type: 'integer', min: 1, message: '请输入正整数额度' },
          ]}
        >
          <InputNumber className="full-input" min={1} max={balance > 0 ? Math.floor(balance) : 1} precision={0} placeholder="例如：500" />
        </Form.Item>
        <Form.Item name="remark" label="备注（选填）">
          <Input maxLength={100} placeholder="如 10 月门店营销预算" />
        </Form.Item>
        <Space direction="vertical" size={8} className="full-width">
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>提交即锁定，网络超时可凭同一幂等键重试，不会双扣。</Typography.Text>
          <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button onClick={onClose}>取消</Button>
            <Button type="primary" htmlType="submit" loading={submitting} disabled={submitting}>确认分配</Button>
          </Space>
        </Space>
      </Form>
    </Modal>
  );
}
