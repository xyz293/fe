import { Form, Input, Modal, Typography } from 'antd';
import { useEffect } from 'react';
import type { AiWork } from '@xiaoa/share/types';

interface RejectModalProps {
  open: boolean;
  work: AiWork | null;
  confirmLoading: boolean;
  onCancel: () => void;
  onOk: (opinion: string) => void;
}

/** 驳回弹窗（文档 §2.4.2）：opinion 必填、字数上限 512，驳回后给作者发站内信 */
export function RejectModal({ open, work, confirmLoading, onCancel, onOk }: RejectModalProps) {
  const [form] = Form.useForm<{ opinion: string }>();

  useEffect(() => {
    if (open) form.resetFields();
  }, [open, form]);

  const submit = async () => {
    const values = await form.validateFields();
    onOk(values.opinion.trim());
  };

  return (
    <Modal
      title={`驳回「${work?.styleName || work?.platform || '作品'}」`}
      open={open}
      onCancel={onCancel}
      onOk={submit}
      confirmLoading={confirmLoading}
      okText="确认驳回"
      okButtonProps={{ danger: true }}
      destroyOnClose
    >
      {work?.userInput && <Typography.Paragraph type="secondary">创作说明：{work.userInput}</Typography.Paragraph>}
      <Form form={form} layout="vertical">
        <Form.Item
          name="opinion"
          label="驳回意见（作者可见，将用于改稿重提）"
          rules={[
            { required: true, message: '请填写驳回意见' },
            { max: 512, message: '驳回意见不能超过 512 字' },
          ]}
        >
          <Input.TextArea
            rows={4}
            maxLength={512}
            showCount
            placeholder="说明驳回原因，例如：文案含“最低价”等违禁词，请调整后重新提交"
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
