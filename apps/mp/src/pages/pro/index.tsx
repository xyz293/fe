import { Button, Image, Input, Text, Textarea, View } from '@tarojs/components';
import Taro, { useLoad } from '@tarojs/taro';
import { useEffect, useMemo, useState } from 'react';
import { sharedApi } from '../../utils/sharedAdapter';
import { track } from '../../services/track';
import { QUOTA_INSUFFICIENT_CODE, QUOTA_INSUFFICIENT_TIP } from '../../utils/quotaConstants';

type LongId = number | string;
type AIGenerationType = 'IMAGE' | 'VIDEO';
interface CreationStyle { id: LongId; name: string; hot?: number | boolean; }
interface CreationConfig { styles: CreationStyle[]; platforms: Array<{ value: string; label: string }>; imagePrice: number; videoPrice: number; quota: { balance: number; total: number; used: number }; auditRequired: boolean; refAssetLimit?: number; }
interface GenerateWorkRequest { type: AIGenerationType; styleId: LongId; platform: string; userInput: string; productName?: string; refAssetIds: LongId[]; }
interface AssetItem { id: LongId; url?: string; coverUrl?: string; title?: string; }
type AssetScope = 'BRAND' | 'STORE';

const CONFIG_CACHE_KEY = 'xiaoa_creation_config';
const CONFIG_CACHE_TTL = 10 * 60 * 1000;
const fallbackConfig: CreationConfig = {
  styles: [{ id: 1, name: '轻奢', hot: 1 }, { id: 2, name: '婚庆', hot: 1 }, { id: 3, name: '国风' }, { id: 4, name: '日常' }],
  platforms: [{ value: 'DOUYIN', label: '抖音' }, { value: 'MEITUAN', label: '美团' }, { value: 'MOMENTS', label: '朋友圈' }],
  imagePrice: 5,
  videoPrice: 20,
  quota: { balance: 0, total: 0, used: 0 },
  auditRequired: false,
  refAssetLimit: 9,
};

interface CachedConfig { expiresAt: number; data: CreationConfig; }
function readCachedConfig() { const cached = Taro.getStorageSync(CONFIG_CACHE_KEY) as CachedConfig | undefined; return cached && cached.expiresAt > Date.now() ? cached.data : null; }
function saveCachedConfig(data: CreationConfig) { Taro.setStorageSync(CONFIG_CACHE_KEY, { expiresAt: Date.now() + CONFIG_CACHE_TTL, data }); }
function parseRefIds(value?: string) { return value ? value.split(',').map((item) => item.trim()).filter(Boolean) : []; }
// C 端图库分类（一期硬编码常用分类，后端分类接口就绪后改为拉取）
const ASSET_CATEGORIES = ['全部', '商品图', '场景图', '模板'];
function normalizeAssetList(result: unknown): AssetItem[] {
  if (Array.isArray(result)) return result as AssetItem[];
  const page = result as { list?: AssetItem[] } | null;
  return page?.list ?? [];
}

export default function ProPage() {
  const [config, setConfig] = useState<CreationConfig>(() => readCachedConfig() || fallbackConfig);
  const [styleId, setStyleId] = useState<LongId>(config.styles[0]?.id || '');
  const [platform, setPlatform] = useState(config.platforms[0]?.value || 'MOMENTS');
  const [productName, setProductName] = useState('');
  const [userInput, setUserInput] = useState('');
  const [selectedAssets, setSelectedAssets] = useState<AssetItem[]>([]);
  const [type, setType] = useState<AIGenerationType>('IMAGE');
  const [loading, setLoading] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [error, setError] = useState('');

  // 素材选择器：品牌图库 / 本店图库 / 相册上传（即传即用）
  const [showPicker, setShowPicker] = useState(false);
  const [assetTab, setAssetTab] = useState<AssetScope>('BRAND');
  const [brandAssets, setBrandAssets] = useState<AssetItem[]>([]);
  const [storeAssets, setStoreAssets] = useState<AssetItem[]>([]);
  const [assetCategory, setAssetCategory] = useState('全部');
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [uploadingCount, setUploadingCount] = useState(0);

  useLoad((params) => {
    if (params.type === 'video') setType('VIDEO');
    // 从图库页带入的素材只传 id，这里用占位对象渲染序号角标
    const ids = parseRefIds(params.refAssetIds);
    if (ids.length) setSelectedAssets(ids.map((id) => ({ id })));
  });
  useEffect(() => { const cached = readCachedConfig(); if (cached) { setConfig(cached); return; } setLoadingConfig(true); sharedApi.getCreationConfig().then((result) => { setConfig(result); saveCachedConfig(result); setStyleId(result.styles[0]?.id || ''); setPlatform(result.platforms[0]?.value || ''); }).catch((requestError) => setError(requestError instanceof Error ? requestError.message : '创作配置加载失败')).finally(() => setLoadingConfig(false)); }, []);
  useEffect(() => { if (!styleId && config.styles[0]) setStyleId(config.styles[0].id); if (!platform && config.platforms[0]) setPlatform(config.platforms[0].value); }, [config, platform, styleId]);
  const selectedStyle = useMemo(() => config.styles.find((style) => String(style.id) === String(styleId)), [config.styles, styleId]);
  const price = type === 'VIDEO' ? config.videoPrice : config.imagePrice;
  const assetLimit = config.refAssetLimit ?? 9;
  const canSubmit = Boolean(styleId && platform && !loading && !loadingConfig);
  const pickerAssets = assetTab === 'BRAND' ? brandAssets : storeAssets;

  const removeAsset = (id: LongId) => setSelectedAssets((current) => current.filter((item) => String(item.id) !== String(id)));

  const loadAssets = (scope: AssetScope, category: string) => {
    setLoadingAssets(true);
    sharedApi.getAssets({ scope, category: category === '全部' ? undefined : category })
      .then((result) => {
        const list = normalizeAssetList(result);
        if (scope === 'BRAND') setBrandAssets(list); else setStoreAssets(list);
      })
      .catch(() => Taro.showToast({ title: '图库加载失败，可稍后重试', icon: 'none' }))
      .finally(() => setLoadingAssets(false));
  };

  const openPicker = () => { setAssetTab('BRAND'); loadAssets('BRAND', assetCategory); setShowPicker(true); };

  const switchAssetTab = (scope: AssetScope) => { setAssetTab(scope); loadAssets(scope, assetCategory); };

  const switchAssetCategory = (category: string) => { setAssetCategory(category); loadAssets(assetTab, category); };

  // 推优入库：本店图库长按素材 → ActionSheet「推荐入库」→ POST /api/assets/recommend
  const recommendToBrand = (asset: AssetItem) => {
    Taro.showActionSheet({ itemList: ['推荐入库'] })
      .then(() => sharedApi.recommendAsset(asset.id))
      .then(() => Taro.showToast({ title: '已提交，等待总部审核', icon: 'success' }))
      .catch((error) => {
        // 用户取消 ActionSheet 不提示；重复推优由后端拒绝时直接 toast 错误信息（如"已在推优流程中"）
        const isCancel = Boolean(error) && typeof error === 'object' && 'errMsg' in error && String((error as { errMsg?: string }).errMsg).includes('cancel');
        if (isCancel) return;
        Taro.showToast({ title: error instanceof Error ? error.message : '提交失败', icon: 'none' });
      });
  };

  const toggleAsset = (asset: AssetItem) => {
    const exists = selectedAssets.some((item) => String(item.id) === String(asset.id));
    if (exists) { removeAsset(asset.id); return; }
    if (selectedAssets.length >= assetLimit) { Taro.showToast({ title: `最多引用 ${assetLimit} 个素材`, icon: 'none' }); return; }
    setSelectedAssets((current) => [...current, asset]);
  };

  // 相册上传：选图 → 逐张 wx.uploadFile → 成功即入格（即传即用）→ 失败 toast 单张提示
  const uploadFromAlbum = async () => {
    const remaining = assetLimit - selectedAssets.length;
    if (remaining <= 0) { Taro.showToast({ title: `最多引用 ${assetLimit} 个素材`, icon: 'none' }); return; }
    try {
      const res = await Taro.chooseImage({ count: remaining });
      const paths = res.tempFilePaths || [];
      setUploadingCount(paths.length);
      for (let index = 0; index < paths.length; index += 1) {
        const filePath = paths[index];
        try {
          const uploaded = await sharedApi.uploadAsset(filePath);
          const asset: AssetItem = { id: uploaded.id, url: uploaded.url, title: '相册上传' };
          setStoreAssets((current) => [asset, ...current]);
          setSelectedAssets((current) => (current.length >= assetLimit ? current : [...current, asset]));
        } catch {
          Taro.showToast({ title: `第 ${index + 1} 张上传失败，可重试`, icon: 'none' });
        }
      }
    } catch {
      // 用户取消选图
    } finally {
      setUploadingCount(0);
    }
  };

  const generate = async () => {
    if (!canSubmit) return;
    setLoading(true);
    setError('');
    const payload: GenerateWorkRequest = {
      type,
      styleId,
      platform,
      userInput: userInput.trim(),
      productName: productName.trim() || undefined,
      refAssetIds: selectedAssets.map((asset) => asset.id),
    };
    const startedAt = Date.now();
    track('create_generate', { type, style: selectedStyle?.name, styleId, platform });
    try {
      const result = await sharedApi.generate(payload);
      const id = result.workId ?? result.taskId;
      if (!id) throw new Error('生成任务创建失败，请稍后重试');
      track('generate_complete', { workId: id, type, success: true, duration: Date.now() - startedAt });
      Taro.navigateTo({ url: `/pages/generating/index?workId=${id}&type=${type}` });
    } catch (requestError) {
      track('generate_complete', { type, success: false, duration: Date.now() - startedAt });
      const code = (requestError as Error & { code?: number })?.code;
      const isQuotaInsufficient = code === QUOTA_INSUFFICIENT_CODE || (requestError instanceof Error && requestError.message.includes('额度不足'));
      if (isQuotaInsufficient) {
        track('quota_insufficient', { type });
        Taro.showToast({ title: QUOTA_INSUFFICIENT_TIP, icon: 'none' });
      } else setError(requestError instanceof Error ? requestError.message : '生成失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="page creation-page">
      <View className="chat-header"><Text className="back-button" onClick={() => Taro.navigateBack()}>‹</Text><Text className="chat-title">创作</Text><Text className="chat-scene">{config.auditRequired ? '提交审核' : '直接发布'}</Text></View>
      <View className="card creation-card">
        <Text className="section-title" style={{ marginTop: 0 }}>类型</Text>
        <View className="creation-type-row"><Text className={type === 'IMAGE' ? 'pill active' : 'pill'} onClick={() => setType('IMAGE')}>图片</Text><Text className={type === 'VIDEO' ? 'pill active' : 'pill'} onClick={() => setType('VIDEO')}>视频</Text></View>
        <Text className="section-title">📱 发平台</Text>
        <View className="creation-chips">{config.platforms.map((item) => <Text className={platform === item.value ? 'pill active' : 'pill'} key={item.value} onClick={() => setPlatform(item.value)}>{item.label}</Text>)}</View>
        <Text className="section-title">🎨 选风格</Text>
        <View className="creation-chips">
          {config.styles.map((style) => (
            <Text className={String(style.id) === String(styleId) ? 'pill active' : 'pill'} key={String(style.id)} onClick={() => setStyleId(style.id)}>
              {style.name}{Boolean(style.hot) && <Text className="hot-badge">🔥热门</Text>}
            </Text>
          ))}
        </View>
        <Text className="section-title">🖼 素材 <Text className="muted" style={{ fontSize: '22px' }}>（可选，最多 {assetLimit} 个）</Text></Text>
        <View className="asset-grid">
          {selectedAssets.map((asset, index) => (
            <View className="asset-cell" key={String(asset.id)}>
              {asset.coverUrl || asset.url ? <Image className="asset-thumb" src={(asset.coverUrl || asset.url) as string} mode="aspectFill" /> : <View className="asset-thumb" />}
              <Text className="asset-order">{index + 1}</Text>
              <Text className="asset-cell-remove" onClick={() => removeAsset(asset.id)}>×</Text>
            </View>
          ))}
          {selectedAssets.length < assetLimit && (
            <View className="asset-add" onClick={openPicker}>
              <Text style={{ fontSize: '40px' }}>+</Text>
              <Text>从图库选择 / 相册上传</Text>
            </View>
          )}
        </View>
        <Text className="section-title">📦 产品名</Text>
        <Input className="prompt-box" value={productName} maxlength={60} placeholder="如：520 对戒、古法黄金手镯" onInput={(event) => setProductName(event.detail.value)} />
        <Text className="section-title">✍️ 描述 <Text className="muted" style={{ fontSize: '22px' }}>（可选）</Text></Text>
        <Textarea className="caption-editor-textarea" value={userInput} maxlength={300} placeholder="输入节日、场合和想表达的感觉..." onInput={(event) => setUserInput(event.detail.value)} />
        <View className="creation-cost"><Text>💰 图文 {config.imagePrice} 积分 / 视频 {config.videoPrice} 积分</Text><Text>本店余额：{config.quota.balance.toLocaleString()}</Text></View>
      </View>
      {error && <View className="notice-bar"><Text>{error}</Text></View>}
      <Text className="cost-note">本次预计消耗 {price} 积分 · 生成失败自动退回</Text>
      <Button className="primary-button" loading={loading} disabled={!canSubmit} onClick={generate}>{loading ? '生成中，完成后消息通知您' : config.auditRequired ? '提交审核并生成' : '开始生成'}</Button>

      {showPicker && (
        <>
          <View className="modal-mask" onClick={() => setShowPicker(false)} />
          <View className="publish-sheet">
            <View className="row-between">
              <Text className="page-title" style={{ fontSize: '34px' }}>选择素材</Text>
              <Text className="gold" style={{ fontSize: '28px' }} onClick={() => setShowPicker(false)}>×</Text>
            </View>
            <View className="picker-tabs">
              <Text className={assetTab === 'BRAND' ? 'picker-tab active' : 'picker-tab'} onClick={() => switchAssetTab('BRAND')}>品牌图库</Text>
              <Text className={assetTab === 'STORE' ? 'picker-tab active' : 'picker-tab'} onClick={() => switchAssetTab('STORE')}>本店图库</Text>
            </View>
            <View className="creation-chips" style={{ marginBottom: 14 }}>
              {ASSET_CATEGORIES.map((item) => <Text className={assetCategory === item ? 'pill active' : 'pill'} key={item} onClick={() => switchAssetCategory(item)}>{item}</Text>)}
            </View>
            <View className="asset-picker-grid">
              {pickerAssets.map((asset) => {
                const order = selectedAssets.findIndex((item) => String(item.id) === String(asset.id));
                return (
                  <View
                    className={order >= 0 ? 'asset-pick-cell selected' : 'asset-pick-cell'}
                    key={String(asset.id)}
                    onClick={() => toggleAsset(asset)}
                    onLongPress={assetTab === 'STORE' ? () => recommendToBrand(asset) : undefined}
                  >
                    {asset.coverUrl || asset.url ? <Image className="asset-pick-thumb" src={(asset.coverUrl || asset.url) as string} mode="aspectFill" /> : <View className="asset-pick-thumb" />}
                    {order >= 0 && <Text className="asset-pick-mark">{order + 1}</Text>}
                  </View>
                );
              })}
              {loadingAssets && <Text className="asset-picker-empty">图库加载中…</Text>}
              {!loadingAssets && pickerAssets.length === 0 && <Text className="asset-picker-empty">图库暂无素材，可从相册上传</Text>}
            </View>
            {assetTab === 'STORE' && <Text className="muted" style={{ display: 'block', fontSize: '20px', marginTop: 10 }}>提示：长按本店素材可「推荐入库」给总部</Text>}
            <Button className="secondary-button" style={{ marginTop: '20px' }} loading={uploadingCount > 0} disabled={selectedAssets.length >= assetLimit} onClick={uploadFromAlbum}>📷 从相册上传（即传即用）</Button>
            <Button className="primary-button" style={{ marginTop: '16px' }} onClick={() => setShowPicker(false)}>完成（已选 {selectedAssets.length}）</Button>
          </View>
        </>
      )}
    </View>
  );
}
