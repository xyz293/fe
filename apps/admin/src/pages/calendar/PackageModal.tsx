import { Collapse, DatePicker, Form, Input, Modal, Radio, Select, TimePicker, message } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { useEffect, useState } from 'react';
import type { CreateContentPackageRequest } from '@xiaoa/share/types';
import { packageApi } from '../../services/sharedApi';

interface PackageModalProps {
  open: boolean;
  onClose: () => void;
  /** 保存成功后由父页面 refetch（日历对应日期出现"待下发"标记） */
  onSuccess: () => void;
}

interface PackageFormValues {
  marketingDate: Dayjs;
  publishTime?: Dayjs;
  name: string;
  description?: string;
  taskTemplate?: {
    actionType?: 1 | 2;
    platform?: string;
    frequency?: 1 | 2 | 3;
    judgeType?: 1 | 2;
    endTime?: Dayjs;
  };
}

const PLATFORM_OPTIONS = [
  { value: 'MOMENTS', label: '朋友圈' },
  { value: 'RED', label: '小红书' },
  { value: 'CHANNELS', label: '视频号' },
];

const disabledPastDate = (current: Dayjs) => current.isBefore(dayjs().startOf('day'));

/** 新建节点内容包：模板字段动态显隐；营销日禁选今天以前（后端也校验，双保险） */
export function PackageModal({ open, onClose, onSuccess }: PackageModalProps) {
  const [form] = Form.useForm<PackageFormValues>();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) form.resetFields();
  }, [open, form]);

  const submit = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      const payload: CreateContentPackageRequest = {
        name: values.name.trim(),
        description: values.description?.trim() || undefined,
        marketingDate: values.marketingDate.format('YYYY-MM-DD'),
        publishTime: values.publishTime ? values.publishTime.format('HH:mm') : undefined,
        taskTemplate: values.taskTemplate
          ? {
              actionType: values.taskTemplate.actionType,
              platform: values.taskTemplate.actionType === 2 ? values.taskTemplate.platform : undefined,
              frequency: values.taskTemplate.frequency,
              judgeType: values.taskTemplate.judgeType,
              endTime: values.taskTemplate.endTime ? values.taskTemplate.endTime.format('YYYY-MM-DD') : undefined,
            }
          : undefined,
      };
      await packageApi.createPackage(payload);
      message.success('内容包已创建，对应日期将出现"待下发"标记');
      onSuccess();
      onClose();
    } catch (error) {
      // 模板缺字段已由表单内联提示；这里兜底接口错误
      const fieldsError = error as Error & { errorFields?: unknown };
      if (error instanceof Error && !fieldsError.errorFields) message.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title="新建节点内容包"
      open={open}
      onCancel={onClose}
      onOk={submit}
      confirmLoading={saving}
      okText="保存"
      width={520}
      destroyOnClose
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="marketingDate"
          label="营销节点日期"
          rules={[{ required: true, message: '请选择营销节点日期' }]}
          extra="禁选今天以前；过去日期由后端二次校验"
        >
          <DatePicker style={{ width: '100%' }} disabledDate={disabledPastDate} />
        </Form.Item>
        <Form.Item name="publishTime" label="下发时刻">
          <TimePicker style={{ width: '100%' }} format="HH:mm" placeholder="默认当天 09:00" />
        </Form.Item>
        <Form.Item name="name" label="节点名称" rules={[{ required: true, message: '请填写节点名称' }]}>
          <Input maxLength={30} placeholder="520爱的礼物季" />
        </Form.Item>
        <Form.Item name="description" label="文案方向">
          <Input.TextArea rows={3} maxLength={200} placeholder="如：围绕「为爱的人挑一份定情信物」输出种草文案" />
        </Form.Item>
        <Collapse
          ghost
          items={[
            {
              key: 'template',
              label: '任务模板（自动下发到门店）',
              children: (
                <>
                  <Form.Item name={['taskTemplate', 'actionType']} label="动作类型" initialValue={1}>
                    <Radio.Group>
                      <Radio value={1}>固定动作</Radio>
                      <Radio value={2}>指定内容</Radio>
                    </Radio.Group>
                  </Form.Item>
                  {/* 动态显隐：指定内容才需要选平台 */}
                  <Form.Item noStyle shouldUpdate={(prev, next) => prev?.taskTemplate?.actionType !== next?.taskTemplate?.actionType}>
                    {({ getFieldValue }) =>
                      getFieldValue(['taskTemplate', 'actionType']) === 2 ? (
                        <Form.Item name={['taskTemplate', 'platform']} label="发布平台" rules={[{ required: true, message: '指定内容需选择平台' }]}>
                          <Select options={PLATFORM_OPTIONS} placeholder="朋友圈 / 小红书 / 视频号" />
                        </Form.Item>
                      ) : null
                    }
                  </Form.Item>
                  <Form.Item name={['taskTemplate', 'frequency']} label="任务频率" initialValue={1}>
                    <Radio.Group>
                      <Radio value={1}>每日</Radio>
                      <Radio value={2}>每周</Radio>
                      <Radio value={3}>每月</Radio>
                    </Radio.Group>
                  </Form.Item>
                  <Form.Item name={['taskTemplate', 'judgeType']} label="完成判定" initialValue={1}>
                    <Radio.Group>
                      <Radio value={1}>直接完成</Radio>
                      <Radio value={2}>需截图凭证</Radio>
                    </Radio.Group>
                  </Form.Item>
                  <Form.Item name={['taskTemplate', 'endTime']} label="任务截止日期">
                    <DatePicker style={{ width: '100%' }} disabledDate={disabledPastDate} />
                  </Form.Item>
                </>
              ),
            },
          ]}
        />
      </Form>
    </Modal>
  );
}
