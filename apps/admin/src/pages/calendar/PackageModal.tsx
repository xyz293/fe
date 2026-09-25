import { DatePicker, Form, Input, Modal, Radio, Select, Space, message } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { useEffect, useState } from 'react';
import type { CreateContentPackageRequest, PackageTaskTemplate } from '@xiaoa/share/types';
import { packageApi } from '../../services/sharedApi';

interface PackageModalProps {
  open: boolean;
  onClose: () => void;
  /** 保存成功后由父页面 refetch（日历对应日期出现"待下发"标记） */
  onSuccess: () => void;
}

interface PackageFormValues {
  name: string;
  calendarDate: Dayjs;
  publishAt: Dayjs;
  copyDirection?: string;
  template: {
    title?: string;
    actionType: 1 | 2;
    platform: string;
    frequency: 1 | 2 | 3;
    judgeType: 1 | 2;
    endTime: Dayjs;
    targetScope: 1 | 2 | 3 | 4;
    targetIds?: string;
  };
}

const PLATFORM_OPTIONS = [
  { value: 'douyin', label: '抖音' },
  { value: 'MOMENTS', label: '朋友圈' },
  { value: 'RED', label: '小红书' },
  { value: 'CHANNELS', label: '视频号' },
];

const TARGET_SCOPE_LABELS: Record<number, string> = { 1: '全员', 2: '区域', 3: '门店', 4: '员工' };

const disabledPastDate = (current: Dayjs) => current.isBefore(dayjs().startOf('day'));

/**
 * 新建内容包（POST /api/admin/content-packages，文档 §3.5.1，仅 HQ_ADMIN）。
 * 强校验要点：营销日早于今天后端拒绝（1001）；taskTemplate.endTime 为 yyyy-MM-dd HH:mm:ss（空格分隔，文档 §1.3 例外）；
 * targetScope≠1 时 targetIds 必传且非空。下发由后端定时任务完成（status=1 → 2）。
 */
export function PackageModal({ open, onClose, onSuccess }: PackageModalProps) {
  const [form] = Form.useForm<PackageFormValues>();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      form.resetFields();
      form.setFieldsValue({
        publishAt: dayjs().hour(9).minute(0).second(0),
        template: { actionType: 2, frequency: 1, judgeType: 2, targetScope: 1 },
      });
    }
  }, [open, form]);

  const submit = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      const template = values.template;
      const targetIds = (template.targetIds || '')
        .split(/[，,]/)
        .map((item) => item.trim())
        .filter(Boolean)
        .map((item) => Number(item));
      const payload: CreateContentPackageRequest = {
        name: values.name.trim(),
        calendarDate: values.calendarDate.format('YYYY-MM-DD'),
        publishAt: values.publishAt.format('YYYY-MM-DDTHH:mm:ss'),
        copyDirection: values.copyDirection?.trim() || undefined,
        taskTemplate: {
          title: template.title?.trim() || undefined,
          actionType: template.actionType,
          platform: template.platform,
          frequency: template.frequency,
          judgeType: template.judgeType,
          endTime: template.endTime.format('YYYY-MM-DD HH:mm:ss'),
          targetScope: template.targetScope,
          targetIds: template.targetScope === 1 ? undefined : targetIds,
        },
      };
      await packageApi.createPackage(payload);
      message.success('内容包已创建，到达下发时刻后自动生成任务');
      onSuccess();
      onClose();
    } catch (error) {
      // 模板缺字段已由表单内联提示；这里兜底接口错误（如 1001 营销日早于今天）
      const fieldsError = error as Error & { errorFields?: unknown };
      if (error instanceof Error && !fieldsError.errorFields) message.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const targetScope = Form.useWatch(['template', 'targetScope'], form);

  return (
    <Modal
      title="新建内容包"
      open={open}
      onCancel={onClose}
      onOk={submit}
      confirmLoading={saving}
      okText="保存"
      width={560}
      destroyOnClose
    >
      <Form form={form} layout="vertical">
        <Form.Item name="name" label="内容包名称" rules={[{ required: true, message: '请填写名称' }]}>
          <Input maxLength={128} placeholder="国庆开门红" />
        </Form.Item>
        <Form.Item name="calendarDate" label="营销日" rules={[{ required: true, message: '请选择营销日' }]} extra="禁选今天以前，早于今天后端直接拒绝（1001）">
          <DatePicker style={{ width: '100%' }} disabledDate={disabledPastDate} />
        </Form.Item>
        <Form.Item name="publishAt" label="下发时刻" rules={[{ required: true, message: '请选择下发时刻' }]} extra="到期后由后端定时任务创建任务（每批最多 50 个，保证不重发）">
          <DatePicker showTime style={{ width: '100%' }} format="YYYY-MM-DD HH:mm:ss" disabledDate={disabledPastDate} />
        </Form.Item>
        <Form.Item name="copyDirection" label="推广方向（选填）" extra="会随任务带给门店，≤2000 字符">
          <Input.TextArea rows={2} maxLength={2000} placeholder="如：突出国庆促销与到店礼" />
        </Form.Item>

        <Form.Item label="任务模板" style={{ marginBottom: 0 }}>
          <Space direction="vertical" size={12} style={{ width: '100%' }} className="package-template-fields">
            <Form.Item name={['template', 'title']} label="任务标题（选填）" extra="缺省用内容包名称">
              <Input maxLength={128} placeholder="发布国庆探店视频" />
            </Form.Item>
            <Space size={12} wrap>
              <Form.Item name={['template', 'actionType']} label="动作类型" rules={[{ required: true }]} style={{ minWidth: 160 }}>
                <Radio.Group options={[{ value: 1, label: '固定动作' }, { value: 2, label: '指定内容' }]} />
              </Form.Item>
              <Form.Item name={['template', 'platform']} label="平台" rules={[{ required: true, message: '必填' }]} style={{ minWidth: 140 }}>
                <Select options={PLATFORM_OPTIONS} placeholder="选择平台" />
              </Form.Item>
            </Space>
            <Space size={12} wrap>
              <Form.Item name={['template', 'frequency']} label="频率" rules={[{ required: true }]} style={{ minWidth: 120 }}>
                <Select options={[{ value: 1, label: '每日' }, { value: 2, label: '每周' }, { value: 3, label: '每月' }]} />
              </Form.Item>
              <Form.Item name={['template', 'judgeType']} label="完成判定" rules={[{ required: true }]} style={{ minWidth: 140 }}>
                <Select options={[{ value: 1, label: '直接完成' }, { value: 2, label: '需截图凭证' }]} />
              </Form.Item>
            </Space>
            <Form.Item
              name={['template', 'endTime']}
              label="任务截止"
              rules={[{ required: true, message: '请选择任务截止时间' }]}
              extra="格式 yyyy-MM-dd HH:mm:ss（空格分隔，与 ISO 其余时间不同）"
            >
              <DatePicker showTime style={{ width: '100%' }} format="YYYY-MM-DD HH:mm:ss" />
            </Form.Item>
            <Space size={12} wrap>
              <Form.Item name={['template', 'targetScope']} label="执行对象" extra="≠全员时必须填目标 ID" style={{ minWidth: 140 }}>
                <Select options={Object.entries(TARGET_SCOPE_LABELS).map(([value, label]) => ({ value: Number(value), label }))} />
              </Form.Item>
              {targetScope !== 1 && (
                <Form.Item
                  name={['template', 'targetIds']}
                  label="目标 ID"
                  rules={[{ required: true, message: 'targetScope≠1 时必填' }]}
                  extra={`${TARGET_SCOPE_LABELS[targetScope] || ''} ID，多个用逗号分隔，如 12,15`}
                >
                  <Input placeholder="12,15" />
                </Form.Item>
              )}
            </Space>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
}
