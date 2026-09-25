import { Button, Empty, Input, Modal, Space, Spin, Typography } from 'antd';
import { CheckOutlined, CloseOutlined } from '@ant-design/icons';
import { useState } from 'react';
import type { AssetItem } from '@xiaoa/share/types';

interface ReviewTabProps {
  assets: AssetItem[];
  loading: boolean;
  leavingIds: string[];
  /** 通过（可选改分类升入品牌层）/ 驳回（驳回后后端给上传人发站内信 ASSET_RECOMMEND） */
  onApprove: (asset: AssetItem, category?: string) => Promise<void>;
  onReject: (asset: AssetItem) => Promise<void>;
}

function formatTime(value?: string | null) { return value ? new Date(value).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-'; }

/** 推优待审 Tab（文档 §3.4.5）：仅 PENDING_REVIEW 可审；通过 scope: STORE→BRAND，卡片淡出 */
export function ReviewTab({ assets, loading, leavingIds, onApprove, onReject }: ReviewTabProps) {
  const [approving, setApproving] = useState<AssetItem | null>(null);
  const [approveCategory, setApproveCategory] = useState('');
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [rejecting, setRejecting] = useState<AssetItem | null>(null);

  const submitApprove = async () => {
    setConfirmLoading(true);
    try {
      await onApprove(approving!, approveCategory.trim() || undefined);
      setApproving(null);
      setApproveCategory('');
    } finally {
      setConfirmLoading(false);
    }
  };

  const submitReject = async () => {
    setConfirmLoading(true);
    try {
      await onReject(rejecting!);
      setRejecting(null);
    } finally {
      setConfirmLoading(false);
    }
  };

  if (loading && assets.length === 0) return <div style={{ textAlign: 'center', padding: 48 }}><Spin /></div>;
  if (assets.length === 0) return <Empty description="暂无推优待审素材" style={{ padding: 32 }} />;

  return (
    <>
      <Space direction="vertical" size={12} className="full-width">
        {assets.map((item) => {
          const leaving = leavingIds.includes(String(item.id));
          return (
            <div
              key={String(item.id)}
              style={{
                display: 'flex', gap: 16, padding: 16, borderRadius: 12, border: '1px solid #f0f0f0',
                opacity: leaving ? 0.15 : 1, transition: 'opacity 0.35s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 88, height: 88, borderRadius: 8, background: '#f5f5f5', flexShrink: 0, fontSize: 32 }}>
                {item.type === 'VIDEO' ? '🎬' : item.type === 'SCRIPT' ? '📝' : '🖼'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <Typography.Text strong>{item.name || '未命名素材'}</Typography.Text>
                <div style={{ marginTop: 4 }}>
                  <Typography.Text type="secondary">
                    上传人 ID：{item.uploaderId ?? '-'} · {formatTime(item.createdAt)}
                  </Typography.Text>
                </div>
                {item.category && <Typography.Text type="secondary" style={{ fontSize: 12 }}>分类：{item.category}</Typography.Text>}
              </div>
              <Space>
                <Button type="primary" icon={<CheckOutlined />} disabled={leaving} onClick={() => { setApproveCategory(''); setApproving(item); }}>通过</Button>
                <Button danger icon={<CloseOutlined />} disabled={leaving} onClick={() => setRejecting(item)}>驳回</Button>
              </Space>
            </div>
          );
        })}
      </Space>

      <Modal
        title="通过推优"
        open={Boolean(approving)}
        onCancel={() => setApproving(null)}
        onOk={submitApprove}
        confirmLoading={confirmLoading}
        okText="通过"
      >
        {approving && (
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <Typography.Text>通过后素材 scope: STORE→BRAND、status→APPROVED，全租户可见。</Typography.Text>
            <Input addonBefore="分类" maxLength={50} value={approveCategory} onChange={(event) => setApproveCategory(event.target.value)} placeholder="可不传，保持原分类" />
          </Space>
        )}
      </Modal>

      <Modal
        title="驳回推优"
        open={Boolean(rejecting)}
        onCancel={() => setRejecting(null)}
        onOk={submitReject}
        confirmLoading={confirmLoading}
        okText="驳回"
        okButtonProps={{ danger: true }}
      >
        <Typography.Text>
          驳回后素材 status→REJECTED（终态：不可见、不可再推优，需重新上传），并给上传人发送站内信「素材推优被驳回」。
        </Typography.Text>
      </Modal>
    </>
  );
}
