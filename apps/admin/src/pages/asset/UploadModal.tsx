import { Button, Input, Modal, Space, Tag, Upload, Typography, message } from 'antd';
import { InboxOutlined } from '@ant-design/icons';
import { useEffect, useState } from 'react';
import type { UploadFile } from 'antd';
import { ASSET_ACCEPT, checkAssetFile } from '@xiaoa/share/constants';
import { assetApi } from '../../services/sharedApi';

interface UploadModalProps {
  open: boolean;
  onClose: () => void;
  /** 全部成功后 refetch（不本地插入） */
  onSuccess: () => void;
}

interface UploadTask {
  file: File;
  name: string;
  status: 'pending' | 'success' | 'failed';
}

/**
 * 品牌素材上传弹窗（POST /api/admin/assets，文档 §3.4.1，仅 HQ_ADMIN）。
 * multipart 字段：file / name / category；上传即 scope=BRAND、status=APPROVED 全租户可见。
 */
export function UploadModal({ open, onClose, onSuccess }: UploadModalProps) {
  const [files, setFiles] = useState<UploadTask[]>([]);
  const [rejected, setRejected] = useState<Array<{ name: string; reason: string }>>([]);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (open) { setFiles([]); setRejected([]); setName(''); setCategory(''); }
  }, [open]);

  const multiple = files.length > 1;

  /** beforeUpload 预检：类型白名单（jpg/jpeg/png ≤10M、mp4 ≤100M）+ 大小预检，超限直接拒绝并列表标红，不发起请求 */
  const beforeUpload = (file: UploadFile) => {
    const reason = checkAssetFile({ name: file.name, size: file.size || 0, type: file.type });
    if (reason) {
      setRejected((current) => (current.some((item) => item.name === file.name) ? current : [...current, { name: file.name, reason }]));
      return Upload.LIST_IGNORE;
    }
    setFiles((current) => (current.some((item) => item.name === file.name) ? current : [...current, { file: file as unknown as File, name: file.name, status: 'pending' }]));
    return false; // 手动上传
  };

  const uploadOne = async (task: UploadTask, useCustomName: boolean) => {
    try {
      await assetApi.uploadAsset(task.file, {
        // 名称：缺省取文件名（后端再缺省"未命名素材"）；单文件可用输入框自定义
        name: useCustomName && name.trim() ? name.trim() : undefined,
        category: category.trim() || undefined,
      });
      return true;
    } catch (error) {
      return error; // 让上层 toast
    }
  };

  const submit = async () => {
    const pending = files.filter((item) => item.status !== 'success');
    if (pending.length === 0) { message.warning('请先选择要上传的文件'); return; }
    setUploading(true);
    // 名称：单文件用输入框（默认按文件名填充，可改）；多文件按各自文件名（后端缺省取文件名）
    let failCount = 0;
    for (const task of pending) {
      const result = await uploadOne(task, !multiple);
      if (result === true) {
        setFiles((current) => current.map((item) => (item.name === task.name ? { ...item, status: 'success' } : item)));
      } else {
        failCount += 1;
        setFiles((current) => current.map((item) => (item.name === task.name ? { ...item, status: 'failed' } : item)));
        if (result instanceof Error) message.error(`${task.name}：${result.message}`);
      }
    }
    setUploading(false);
    if (failCount === 0) {
      message.success('素材上传完成，全租户可见');
      onSuccess();
      onClose();
    }
  };

  return (
    <Modal title="上传品牌素材" open={open} onCancel={onClose} footer={null} destroyOnClose>
      <Typography.Paragraph type="secondary">上传成功即 scope=BRAND、status=APPROVED，全租户可见；仅支持 jpg / jpeg / png（≤10M）与 mp4（≤100M）。</Typography.Paragraph>
      <Upload.Dragger accept={ASSET_ACCEPT} multiple beforeUpload={beforeUpload} showUploadList={false} disabled={uploading}>
        <p className="ant-upload-drag-icon"><InboxOutlined /></p>
        <p className="ant-upload-text">点击或拖拽文件到此处</p>
        <p className="ant-upload-hint">单个失败不阻塞其余，可重复上传补交</p>
      </Upload.Dragger>
      {rejected.length > 0 && (
        <Space direction="vertical" size={4} style={{ width: '100%', marginTop: 12 }}>
          {rejected.map((item) => <Typography.Text key={item.name} type="danger">{item.name}：{item.reason}</Typography.Text>)}
        </Space>
      )}
      {files.length > 0 && (
        <Space direction="vertical" size={4} style={{ width: '100%', marginTop: 12 }}>
          {files.map((item) => (
            <Space key={item.name} style={{ width: '100%', justifyContent: 'space-between' }}>
              <Typography.Text style={{ maxWidth: 260 }} ellipsis>{item.name}</Typography.Text>
              <Tag color={item.status === 'success' ? 'green' : item.status === 'failed' ? 'red' : 'default'}>
                {item.status === 'success' ? '成功' : item.status === 'failed' ? '失败' : '待上传'}
              </Tag>
            </Space>
          ))}
        </Space>
      )}
      <Space direction="vertical" size={12} style={{ width: '100%', marginTop: 16 }}>
        <Input addonBefore="名称" maxLength={128} value={name} onChange={(event) => setName(event.target.value)} placeholder={multiple ? '多文件按各自文件名' : '缺省取文件名'} disabled={multiple} />
        <Input addonBefore="分类" maxLength={50} value={category} onChange={(event) => setCategory(event.target.value)} placeholder="分类标签（≤50 字符，选填）" />
        <Button type="primary" block loading={uploading} onClick={() => void submit()}>开始上传</Button>
      </Space>
    </Modal>
  );
}
