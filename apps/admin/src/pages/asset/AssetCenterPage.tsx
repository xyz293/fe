import { Button, Card, Empty, Image, Modal, Select, Space, Spin, Tabs, Tag, Typography, message } from 'antd';
import { CloudUploadOutlined, ReloadOutlined } from '@ant-design/icons';
import { useCallback, useEffect, useState } from 'react';
import type { AssetCategory, AssetItem } from '@xiaoa/share/types';
import { ASSET_SCOPE, ASSET_STATUS, ASSET_STATUS_COLOR } from '@xiaoa/share/constants';
import { assetApi } from '../../services/sharedApi';
import { CategoryTree } from './CategoryTree';
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

function AssetThumb({ asset, size = 132 }: { asset: AssetItem; size?: number }) {
  return asset.coverUrl || asset.url ? (
    <Image src={(asset.coverUrl || asset.url) as string} alt={asset.title || '素材'} width={size} height={size} style={{ borderRadius: 8, objectFit: 'cover' }} />
  ) : (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: size, height: size, borderRadius: 8, background: '#f5f5f5' }}>🖼</div>
  );
}

/**
 * 素材中心（三 Tab + 分类侧栏 + 卡片流）。
 * 数据源 GET /api/admin/assets（后端按数据范围裁剪）；菜单对 HQ_ADMIN 可见（由角色体系控制菜单裁剪）。
 */
export function AssetCenterPage({ title, description }: PageProps) {
  const [tab, setTab] = useState<TabKey>('BRAND');
  const [categories, setCategories] = useState<AssetCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [categoryKey, setCategoryKey] = useState('');

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
  const [editCategoryId, setEditCategoryId] = useState<string | undefined>();

  const loadCategories = useCallback(async () => {
    setCategoriesLoading(true);
    try {
      setCategories(await assetApi.getCategories());
    } catch (error) {
      if (error instanceof Error) message.error(error.message || '分类加载失败');
    } finally {
      setCategoriesLoading(false);
    }
  }, []);

  const loadBrand = useCallback(async (page = 1, append = false, category = categoryKey) => {
    setBrandLoading(true);
    try {
      const result = await assetApi.listAssets({ scope: 'BRAND', category: category || undefined, pageNo: page, pageSize: PAGE_SIZE });
      const { list, total } = normalizeList(result);
      setBrandList((current) => (append ? [...current, ...list] : list));
      setBrandTotal(total);
      setBrandPage(page);
    } catch (error) {
      if (error instanceof Error) message.error(error.message || '品牌素材加载失败');
    } finally {
      setBrandLoading(false);
    }
  }, [categoryKey]);

  const loadPlatform = useCallback(async () => {
    setPlatformLoading(true);
    try {
      const result = await assetApi.listAssets({ scope: 'PLATFORM', pageSize: 50 });
      setPlatformList(normalizeList(result).list);
    } catch (error) {
      if (error instanceof Error) message.error(error.message || '行业资产包加载失败');
    } finally {
      setPlatformLoading(false);
    }
  }, []);

  const loadReview = useCallback(async () => {
    setReviewLoading(true);
    try {
      const result = await assetApi.listAssets({ status: 'PENDING_REVIEW', pageSize: 50 });
      setReviewList(normalizeList(result).list);
    } catch (error) {
      if (error instanceof Error) message.error(error.message || '推优待审加载失败');
    } finally {
      setReviewLoading(false);
    }
  }, []);

  useEffect(() => { void loadCategories(); }, [loadCategories]);
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

  const handleApprove = async (asset: AssetItem, categoryId?: string) => {
    setProcessingId(String(asset.id));
    try {
      await assetApi.reviewAsset(asset.id, { pass: true, categoryId });
      message.success('已通过，素材进入「品牌素材」');
      fadeOut(String(asset.id));
      void loadBrand(1, false);
    } catch (error) {
      handleActionError(error, '审核失败');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (asset: AssetItem, opinion?: string) => {
    setProcessingId(String(asset.id));
    try {
      await assetApi.reviewAsset(asset.id, { pass: false, opinion });
      message.success('已驳回推优');
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
      content: '删除后门店不可见，历史作品不受影响。',
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

  const submitEditCategory = async () => {
    if (!editTarget) return;
    setProcessingId(String(editTarget.id));
    try {
      await assetApi.updateAsset(editTarget.id, editCategoryId ? { categoryId: editCategoryId } : {});
      message.success('分类已更新');
      setEditTarget(null);
      void loadBrand(brandPage, false);
    } catch (error) {
      handleActionError(error, '分类更新失败');
    } finally {
      setProcessingId(null);
    }
  };

  const cardGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 16 } as const;

  const renderAssetCard = (asset: AssetItem, readonly: boolean) => (
    <div key={String(asset.id)} style={{ opacity: isLeaving(asset.id) ? 0.15 : 1, transition: 'opacity 0.35s ease' }}>
      <AssetThumb asset={asset} />
      <Typography.Text ellipsis style={{ display: 'block', marginTop: 8, fontSize: 13 }}>{asset.title || '未命名素材'}</Typography.Text>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
        {asset.category && <Tag style={{ marginInlineEnd: 0 }}>{asset.category}</Tag>}
        {readonly && <Tag color="blue">{ASSET_SCOPE.PLATFORM}</Tag>}
      </div>
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>{formatTime(asset.createdAt)}</Typography.Text>
      {!readonly && (
        <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
          <Button size="small" loading={processingId === String(asset.id)} onClick={() => { setEditCategoryId(asset.categoryId ? String(asset.categoryId) : undefined); setEditTarget(asset); }}>编辑分类</Button>
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
    <ReviewTab assets={reviewList} loading={reviewLoading} categories={categories} leavingIds={leavingIds} onApprove={handleApprove} onReject={handleReject} />
  );

  // 行业资产包：只读，不渲染操作按钮（不是 disabled，是隐藏）
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
          <Button icon={<ReloadOutlined />} onClick={() => { void loadCategories(); void loadBrand(1, false); void loadReview(); void loadPlatform(); }}>刷新</Button>
        </div>
      </div>
      <Card>
        <div style={{ display: 'flex', gap: 24 }}>
          <CategoryTree
            categories={categories}
            activeKey={categoryKey}
            loading={categoriesLoading}
            onSelect={(key) => setCategoryKey(key)}
            onCreate={async (name) => {
              try {
                await assetApi.createCategory({ name });
                message.success('分类已新增');
                await loadCategories();
              } catch (error) {
                if (error instanceof Error) message.error(error.message || '新增分类失败');
              }
            }}
            onRename={async (id, name) => {
              try {
                await assetApi.renameCategory(id, { name });
                message.success('分类已改名');
                await loadCategories();
                void loadBrand(1, false);
              } catch (error) {
                if (error instanceof Error) message.error(error.message || '分类改名失败');
              }
            }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <Tabs
              activeKey={tab}
              onChange={(key) => setTab(key as TabKey)}
              items={[
                { key: 'BRAND', label: ASSET_SCOPE.BRAND, children: brandTab },
                { key: 'REVIEW', label: `推优待审（${reviewList.length}）`, children: reviewTab },
                { key: 'PLATFORM', label: ASSET_SCOPE.PLATFORM, children: platformTab },
              ]}
            />
          </div>
        </div>
      </Card>

      <UploadModal open={uploadOpen} categories={categories} onClose={() => setUploadOpen(false)} onSuccess={() => { void loadBrand(1, false); void loadReview(); }} />

      <Modal
        title="编辑分类"
        open={Boolean(editTarget)}
        onCancel={() => setEditTarget(null)}
        onOk={submitEditCategory}
        confirmLoading={processingId === String(editTarget?.id)}
        destroyOnClose
      >
        {editTarget && (
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <Space align="center">
              <AssetThumb asset={editTarget} size={72} />
              <Typography.Text>{editTarget.title || '未命名素材'}</Typography.Text>
            </Space>
            <Typography.Text type="secondary">
              当前状态：{ASSET_STATUS[(editTarget.reviewStatus as keyof typeof ASSET_STATUS)] || editTarget.reviewStatus || '-'} · 当前分类：{editTarget.category || '-'}
            </Typography.Text>
            <Select
              placeholder="选择新分类"
              style={{ width: '100%' }}
              allowClear
              value={editCategoryId}
              onChange={setEditCategoryId}
              options={categories.map((item) => ({ value: String(item.id), label: item.name }))}
            />
          </Space>
        )}
      </Modal>
    </Space>
  );
}
