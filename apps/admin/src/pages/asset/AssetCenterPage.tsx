import { Button, Card, Empty, Input, Modal, Space, Spin, Tabs, Tag, Typography, message } from 'antd';
import { CloudUploadOutlined, ReloadOutlined } from '@ant-design/icons';
import { useCallback, useEffect, useState } from 'react';
import type { AssetItem } from '@xiaoa/share/types';
import { ASSET_SCOPE, ASSET_STATUS, ASSET_STATUS_COLOR } from '@xiaoa/share/constants';
import { assetApi } from '../../services/sharedApi';
import { UploadModal } from './UploadModal';
import { ReviewTab } from './ReviewTab';

interface PageProps { title: string; description: string; }

const PAGE_SIZE = 24;
type TabKey = 'BRAND' | 'REVIEW' | 'PLATFORM';

function normalizeList(result: unknown): { list: AssetItem[]; total: number } {
  if (Array.isArray(result)) return { list: result, total: result.length };
  const page = result as { list?: AssetItem[]; total?: number } | null;
  return { list: page?.list ?? [], total: page?.total ?? page?.list?.length ?? 0 };
}

function formatTime(value?: string | null) { return value ? new Date(value).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-'; }

/** 素材缩略图：文档注意事项 §4.4 —— content 当前为 local:// 占位协议，不能当 http URL 加载，先按类型展示占位图标 */
function AssetThumb({ asset, size = 132 }: { asset: AssetItem; size?: number }) {
  const isVideo = asset.type === 'VIDEO';
  const isScript = asset.type === 'SCRIPT';
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: size, height: size, borderRadius: 8, background: '#f5f5f5', fontSize: size / 2 }}>
      {isVideo ? '🎬' : isScript ? '📝' : '🖼'}
    </div>
  );
}

/**
 * 素材中心（三 Tab + 分类筛选 + 卡片流），数据源 GET /api/admin/assets（文档 §3.4.2）。
 * 分类是素材上的自由字符串（≤50 字符），无分类 CRUD 接口，用文本框模糊过滤。
 */
export function AssetCenterPage({ title, description }: PageProps) {
  const [tab, setTab] = useState<TabKey>('BRAND');
  const [category, setCategory] = useState('');

  const [brandList, setBrandList] = useState<AssetItem[]>([]);
  const [brandPage, setBrandPage] = useState(1);
  const [brandTotal, setBrandTotal] = useState(0);
  const [brandLoading, setBrandLoading] = useState(false);

  const [platformList, setPlatformList] = useState<AssetItem[]>([]);
  const [platformLoading, setPlatformLoading] = useState(false);
  const [reviewList, setReviewList] = useState<AssetItem[]>([]);
  const [reviewLoading, setReviewLoading] = useState(false);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [leavingIds, setLeavingIds] = useState<string[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<AssetItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('');

  const loadBrand = useCallback(async (page = 1, append = false, categoryFilter = category) => {
    setBrandLoading(true);
    try {
      const result = await assetApi.listAssets({ scope: 'BRAND', category: categoryFilter || undefined, pageNo: page, pageSize: PAGE_SIZE });
      const { list, total } = normalizeList(result);
      setBrandList((current) => (append ? [...current, ...list] : list));
      setBrandTotal(total);
      setBrandPage(page);
    } catch (error) {
      if (error instanceof Error) message.error(error.message || '品牌素材加载失败');
    } finally {
      setBrandLoading(false);
    }
  }, [category]);

  const loadPlatform = useCallback(async (categoryFilter = category) => {
    setPlatformLoading(true);
    try {
      const result = await assetApi.listAssets({ scope: 'PLATFORM', category: categoryFilter || undefined, pageSize: 50 });
      setPlatformList(normalizeList(result).list);
    } catch (error) {
      if (error instanceof Error) message.error(error.message || '行业资产包加载失败');
    } finally {
      setPlatformLoading(false);
    }
  }, [category]);

  const loadReview = useCallback(async () => {
    setReviewLoading(true);
    try {
      // status=PENDING_REVIEW 即推优审核 Tab（文档 §3.4.2）
      const result = await assetApi.listAssets({ status: 'PENDING_REVIEW', pageSize: 50 });
      setReviewList(normalizeList(result).list);
    } catch (error) {
      if (error instanceof Error) message.error(error.message || '推优待审加载失败');
    } finally {
      setReviewLoading(false);
    }
  }, []);

  useEffect(() => { void loadBrand(1, false); }, [loadBrand]);
  useEffect(() => {
    if (tab === 'PLATFORM' && platformList.length === 0) void loadPlatform();
    if (tab === 'REVIEW' && reviewList.length === 0) void loadReview();
  }, [tab, platformList.length, reviewList.length, loadPlatform, loadReview]);

  const fadeOut = (id: string) => setLeavingIds((current) => [...current, id]);
  const isLeaving = (id: string | number) => leavingIds.includes(String(id));

  /** 并发处理：接口返回"状态已变更"→ 提示已被其他管理员处理并刷新 */
  const handleActionError = (error: unknown, fallback: string) => {
    const msg = error instanceof Error ? error.message : fallback;
    if (msg.includes('状态已变更') || msg.includes('已被')) {
      message.warning('该素材已被其他管理员处理');
      void loadBrand(1, false);
      void loadReview();
    } else {
      message.error(msg);
    }
  };

  /** 推优审核（文档 §3.4.5）：通过可顺带改分类升入品牌层；驳回后后端给上传人发站内信 */
  const handleApprove = async (asset: AssetItem, category?: string) => {
    setProcessingId(String(asset.id));
    try {
      await assetApi.reviewAsset(asset.id, { pass: true, category: category || undefined });
      message.success('已通过，素材升入品牌层（BRAND + APPROVED）');
      fadeOut(String(asset.id));
      void loadBrand(1, false);
    } catch (error) {
      handleActionError(error, '审核失败');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (asset: AssetItem) => {
    setProcessingId(String(asset.id));
    try {
      await assetApi.reviewAsset(asset.id, { pass: false });
      message.success('已驳回推优（素材为 REJECTED 终态，需重新上传后再推优）');
      fadeOut(String(asset.id));
    } catch (error) {
      handleActionError(error, '审核失败');
    } finally {
      setProcessingId(null);
    }
  };

  const confirmDelete = (asset: AssetItem) => {
    Modal.confirm({
      title: '删除素材',
      content: '删除为软删（status=DELETED），门店不可见，历史作品不受影响。',
      okText: '删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: async () => {
        try {
          await assetApi.deleteAsset(asset.id);
          message.success('已删除');
          fadeOut(String(asset.id));
        } catch (error) {
          handleActionError(error, '删除失败');
        }
      },
    });
  };

  /** 编辑名称/分类（文档 §3.4.3）：至少传一个，只更新传了的 */
  const submitEdit = async () => {
    if (!editTarget) return;
    setProcessingId(String(editTarget.id));
    try {
      const data: { name?: string; category?: string } = {};
      if (editName.trim() && editName.trim() !== editTarget.name) data.name = editName.trim();
      if (editCategory.trim() !== (editTarget.category || '')) data.category = editCategory.trim() || editCategory.trim();
      if (Object.keys(data).length === 0) { message.info('名称/分类均未变更'); setEditTarget(null); return; }
      await assetApi.updateAsset(editTarget.id, data);
      message.success('素材已更新');
      setEditTarget(null);
      void loadBrand(brandPage, false);
    } catch (error) {
      handleActionError(error, '素材更新失败');
    } finally {
      setProcessingId(null);
    }
  };

  const cardGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 16 } as const;

  const statusText = (asset: AssetItem) => ASSET_STATUS[(asset.status as keyof typeof ASSET_STATUS)] || asset.status;
  const statusColor = (asset: AssetItem) => ASSET_STATUS_COLOR[(asset.status as keyof typeof ASSET_STATUS_COLOR)] || 'default';

  const renderAssetCard = (asset: AssetItem, readonly: boolean) => (
    <div key={String(asset.id)} style={{ opacity: isLeaving(asset.id) ? 0.15 : 1, transition: 'opacity 0.35s ease' }}>
      <AssetThumb asset={asset} />
      <Typography.Text ellipsis style={{ display: 'block', marginTop: 8, fontSize: 13 }}>{asset.name || '未命名素材'}</Typography.Text>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
        {asset.category && <Tag style={{ marginInlineEnd: 0 }}>{asset.category}</Tag>}
        {readonly && <Tag color="blue">{ASSET_SCOPE.PLATFORM}</Tag>}
        <Tag color={statusColor(asset)} style={{ marginInlineEnd: 0 }}>{statusText(asset)}</Tag>
      </div>
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>{formatTime(asset.createdAt)}</Typography.Text>
      {!readonly && (
        <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
          <Button size="small" loading={processingId === String(asset.id)} onClick={() => { setEditName(asset.name || ''); setEditCategory(asset.category || ''); setEditTarget(asset); }}>编辑</Button>
          <Button size="small" danger disabled={isLeaving(asset.id)} onClick={() => confirmDelete(asset)}>删除</Button>
        </div>
      )}
    </div>
  );

  const brandTab = (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <Button type="primary" icon={<CloudUploadOutlined />} onClick={() => setUploadOpen(true)}>上传素材</Button>
      </div>
      {brandLoading && brandList.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 48 }}><Spin /></div>
      ) : brandList.length === 0 ? (
        <Empty description="暂无品牌素材" style={{ padding: 32 }} />
      ) : (
        <>
          <div style={cardGridStyle}>{brandList.map((asset) => renderAssetCard(asset, false))}</div>
          <div style={{ textAlign: 'center', marginTop: 20 }}>
            {brandList.length < brandTotal && (
              <Button loading={brandLoading} onClick={() => void loadBrand(brandPage + 1, true)}>加载更多（{brandList.length}/{brandTotal}）</Button>
            )}
          </div>
        </>
      )}
    </div>
  );

  const reviewTab = (
    <ReviewTab assets={reviewList} loading={reviewLoading} leavingIds={leavingIds} onApprove={handleApprove} onReject={handleReject} />
  );

  // 行业资产包：只读，不渲染操作按钮（PLATFORM 素材任何人不可改，文档 §3.4.3）
  const platformTab = (
    <div>
      {platformLoading && platformList.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 48 }}><Spin /></div>
      ) : platformList.length === 0 ? (
        <Empty description="暂无行业资产包素材" style={{ padding: 32 }} />
      ) : (
        <div style={cardGridStyle}>{platformList.map((asset) => renderAssetCard(asset, true))}</div>
      )}
    </div>
  );

  return (
    <Space direction="vertical" size={20} className="full-width">
      <div className="page-heading">
        <div className="page-heading-copy">
          <Typography.Title level={2}>{title}</Typography.Title>
          <Typography.Text>{description}</Typography.Text>
        </div>
        <div className="page-actions">
          <Input.Search
            allowClear
            placeholder="按分类过滤"
            style={{ width: 180 }}
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            onSearch={(value) => { void loadBrand(1, false, value); void loadPlatform(value); }}
          />
          <Button icon={<ReloadOutlined />} onClick={() => { void loadBrand(1, false); void loadReview(); void loadPlatform(); }}>刷新</Button>
        </div>
      </div>
      <Card>
        <Tabs
          activeKey={tab}
          onChange={(key) => setTab(key as TabKey)}
          items={[
            { key: 'BRAND', label: ASSET_SCOPE.BRAND, children: brandTab },
            { key: 'REVIEW', label: `推优待审（${reviewList.length}）`, children: reviewTab },
            { key: 'PLATFORM', label: ASSET_SCOPE.PLATFORM, children: platformTab },
          ]}
        />
      </Card>

      <UploadModal open={uploadOpen} onClose={() => setUploadOpen(false)} onSuccess={() => { void loadBrand(1, false); void loadReview(); }} />

      <Modal
        title="编辑素材"
        open={Boolean(editTarget)}
        onCancel={() => setEditTarget(null)}
        onOk={submitEdit}
        confirmLoading={processingId === String(editTarget?.id)}
        destroyOnClose
      >
        {editTarget && (
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <Space align="center">
              <AssetThumb asset={editTarget} size={72} />
              <Typography.Text>#{String(editTarget.id)}</Typography.Text>
            </Space>
            <Typography.Text type="secondary">
              当前状态：{statusText(editTarget)} · 当前分类：{editTarget.category || '-'} · scope：{ASSET_SCOPE[(editTarget.scope as keyof typeof ASSET_SCOPE)] || editTarget.scope}
            </Typography.Text>
            <Input addonBefore="名称" maxLength={128} value={editName} onChange={(event) => setEditName(event.target.value)} placeholder="素材名（≤128 字符）" />
            <Input addonBefore="分类" maxLength={50} value={editCategory} onChange={(event) => setEditCategory(event.target.value)} placeholder="分类标签（≤50 字符，可清空）" />
          </Space>
        )}
      </Modal>
    </Space>
  );
}
