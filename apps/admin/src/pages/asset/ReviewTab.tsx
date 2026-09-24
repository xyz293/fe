import { Button, Empty, Image, Input, Modal, Select, Space, Spin, Typography } from 'antd';
import { CheckOutlined, CloseOutlined } from '@ant-design/icons';
import { useState } from 'react';
import type { AssetCategory, AssetItem } from '@xiaoa/share/types';

interface ReviewTabProps {
  assets: AssetItem[];
  loading: boolean;
  categories: AssetCategory[];
  leavingIds: string[];
  onApprove: (asset: AssetItem, categoryId?: string) => Promise<void>;
  onReject: (asset: AssetItem, opinion?: string) => Promise<void>;
}

function formatTime(value?: string | null) { return value ? new Date(value).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-'; }

/** 推优待审 Tab：通过（可选改分类，scope 升 BRAND）/ 驳回（意见选填），卡片淡出 */
export function ReviewTab({ assets, loading, categories, leavingIds, onApprove, onReject }: ReviewTabProps) {
  const [approving, setApproving] = useState<AssetItem | null>(null);
  const [approveCategory, setApproveCategory] = useState<string | undefined>();
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [rejecting, setRejecting] = useState<AssetItem | null>(null);
  const [rejectOpinion, setRejectOpinion] = useState('');

  const submitApprove = async () => {
    setConfirmLoading(true);
    try {
      await onApprove(approving!, approveCategory);
      setApproving(null);
      setApproveCategory(undefined);
    } finally {
      setConfirmLoading(false);
    }
  };

  const submitReject = async () => {
    setConfirmLoading(true);
    try {
      await onReject(rejecting!, rejectOpinion.trim() || undefined);
      setRejecting(null);
      setRejectOpinion('');
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
              {item.coverUrl ? (
                <Image src={item.coverUrl} alt={item.title || '素材'} width={88} height={88} style={{ borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 88, height: 88, borderRadius: 8, background: '#f5f5f5', flexShrink: 0 }}>🖼</div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <Typography.Text strong>{item.title || '未命名素材'}</Typography.Text>
                <div style={{ marginTop: 4 }}>
                  <Typography.Text type="secondary">
                    推荐人：{item.recommendedBy || item.uploaderName || '匿名'} · {formatTime(item.recommendedAt || item.createdAt)}
                  </Typography.Text>
                </div>
                {item.category && <Typography.Text type="secondary" style={{ fontSize: 12 }}>分类：{item.category}</Typography.Text>}
              </div>
              <Space>
                <Button type="primary" icon={<CheckOutlined />} disabled={leaving} onClick={() => { setApproveCategory(undefined); setApproving(item); }}>通过</Button>
                <Button danger icon={<CloseOutlined />} disabled={leaving} onClick={() => { setRejectOpinion(''); setRejecting(item); }}>驳回</Button>
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
        okText="确认通过"
        destroyOnClose
      >
        <Typography.Paragraph type="secondary">
          通过后素材进入「品牌素材」Tab（scope 升 BRAND），全部门店可见。
        </Typography.Paragraph>
        <Select
          placeholder="保持原分类（可选改分类）"
          style={{ width: '100%' }}
          allowClear
          value={approveCategory}
          onChange={setApproveCategory}
          options={categories.map((item) => ({ value: String(item.id), label: item.name }))}
        />
      </Modal>

      <Modal
        title="驳回推优"
        open={Boolean(rejecting)}
        onCancel={() => setRejecting(null)}
        onOk={submitReject}
        confirmLoading={confirmLoading}
        okText="确认驳回"
        okButtonProps={{ danger: true }}
        destroyOnClose
      >
        <Typography.Paragraph type="secondary">意见选填，将展示给推荐人。</Typography.Paragraph>
        <Input.TextArea
          rows={3}
          maxLength={200}
          placeholder="驳回原因（选填）"
          value={rejectOpinion}
          onChange={(event) => setRejectOpinion(event.target.value)}
        />
      </Modal>
    </>
  );
}
