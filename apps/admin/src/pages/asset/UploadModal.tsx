import { Button, Input, Modal, Progress, Select, Space, Tag, Upload, Typography, message } from 'antd';
import { InboxOutlined, ReloadOutlined } from '@ant-design/icons';
import { useEffect, useState } from 'react';
import type { UploadFile } from 'antd';
import type { AssetCategory } from '@xiaoa/share/types';
import { ASSET_ACCEPT, checkAssetFile } from '@xiaoa/share/constants';
import { assetApi } from '../../services/sharedApi';

interface UploadModalProps {
  open: boolean;
  categories: AssetCategory[];
  onClose: () => void;
  /** 全部成功后 refetch（不本地插入） */
  onSuccess: () => void;
}

interface UploadTask {
  file: File;
  name: string;
  status: 'pending' | 'success' | 'failed';
}

/** 上传弹窗：预检 + 逐文件 multipart 上传；单个失败不阻塞其余，失败可重传 */
export function UploadModal({ open, categories, onClose, onSuccess }: UploadModalProps) {
  const [files, setFiles] = useState<UploadTask[]>([]);
  const [rejected, setRejected] = useState<Array<{ name: string; reason: string }>>([]);
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState<string | undefined>();
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (open) { setFiles([]); setRejected([]); setTitle(''); setCategoryId(undefined); }
  }, [open]);

  const multiple = files.length > 1;

  /** beforeUpload 预检：类型白名单 + 大小预检，超限直接拒绝并列表标红，不发起请求 */
  const beforeUpload = (file: UploadFile) => {
    const reason = checkAssetFile({ name: file.name, size: file.size || 0, type: file.type });
    if (reason) {
      setRejected((current) => (current.some((item) => item.name === file.name) ? current : [...current, { name: file.name, reason }]));
      return Upload.LIST_IGNORE;
    }
    setFiles((current) => (current.some((item) => item.name === file.name) ? current : [...current, { file: file as unknown as File, name: file.name, status: 'pending' }]));
    return false; // 手动上传
  };

  const uploadOne = async (task: UploadTask, useCustomTitle: boolean) => {
    try {
      await assetApi.uploadAsset(task.file, {
        title: useCustomTitle && title.trim() ? title.trim() : task.name.replace(/\.[^.]+$/, ''),
        categoryId,
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
    // 名称：单文件用输入框（默认按文件名填充，可改）；多文件按各自文件名
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
      message.success('素材上传完成');
      onSuccess();
      onClose();
    }
  };

  const retryFailed = async () => {
    const failedTasks = files.filter((item) => item.status === 'failed');
    if (failedTasks.length === 0) return;
    setUploading(true);
    let failCount = 0;
    for (const task of failedTasks) {
      const result = await uploadOne(task, !multiple);
      if (result === true) {
        setFiles((current) => current.map((item) => (item.name === task.name ? { ...item, status: 'success' } : item)));
      } else {
        failCount += 1;
        if (result instanceof Error) message.error(`${task.name}：${result.message}`);
      }
    }
    setUploading(false);
    if (failCount === 0) {
      message.success('全部重传成功');
      onSuccess();
      onClose();
    }
  };

  const successCount = files.filter((item) => item.status === 'success').length;
  const failedCount = files.filter((item) => item.status === 'failed').length;
  const percent = files.length === 0 ? 0 : Math.round(((successCount + failedCount) / files.length) * 100);

  return (
    <Modal
      title="上传素材"
      open={open}
      onCancel={() => { /* 上传中途关弹窗：已成功的不撤回（后端已落库），关闭即放弃剩余 */ onClose(); }}
      footer={null}
      width={560}
      destroyOnClose
    >
      <Space direction="vertical" size={12} className="full-width">
        <Upload.Dragger multiple accept={ASSET_ACCEPT} showUploadList={false} beforeUpload={beforeUpload} disabled={uploading}>
          <p className="ant-upload-drag-icon"><InboxOutlined /></p>
          <p className="ant-upload-text">拖拽或点击上传</p>
          <p className="ant-upload-hint">图片 ≤10M（jpg/png），视频 ≤100M（mp4），支持多选</p>
        </Upload.Dragger>

        {rejected.length > 0 && (
          <div style={{ padding: '8px 12px', borderRadius: 8, background: '#fff2f0' }}>
            {rejected.map((item) => (
              <Typography.Text key={item.name} type="danger" style={{ display: 'block', fontSize: 12 }}>
                ✕ {item.name}：{item.reason}
              </Typography.Text>
            ))}
          </div>
        )}

        {files.length > 0 && (
          <div style={{ maxHeight: 180, overflowY: 'auto' }}>
            {files.map((item) => (
              <div key={item.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0' }}>
                <Typography.Text ellipsis style={{ flex: 1, marginRight: 8 }}>{item.name}</Typography.Text>
                {item.status === 'success' && <Tag color="green">成功</Tag>}
                {item.status === 'failed' && <Tag color="red">失败</Tag>}
                {item.status === 'pending' && <Tag>待上传</Tag>}
              </div>
            ))}
          </div>
        )}

        {uploading && <Progress percent={percent} size="small" />}

        <Select
          placeholder="选择分类（可选）"
          style={{ width: '100%' }}
          allowClear
          value={categoryId}
          onChange={setCategoryId}
          options={categories.map((item) => ({ value: String(item.id), label: item.name }))}
        />
        <Input
          placeholder={multiple ? '多文件将按文件名命名' : '素材名称（默认按文件名，可修改）'}
          value={multiple ? undefined : title}
          disabled={multiple || uploading}
          maxLength={40}
          onChange={(event) => setTitle(event.target.value)}
        />

        <Space style={{ justifyContent: 'flex-end', width: '100%' }}>
          {failedCount > 0 && !uploading && (
            <Button icon={<ReloadOutlined />} onClick={retryFailed}>重传失败（{failedCount}）</Button>
          )}
          <Button onClick={onClose} disabled={uploading}>取消</Button>
          <Button type="primary" loading={uploading} onClick={submit} disabled={files.length === 0}>
            确认上传{files.length ? `（${files.filter((item) => item.status !== 'success').length}）` : ''}
          </Button>
        </Space>
      </Space>
    </Modal>
  );
}
