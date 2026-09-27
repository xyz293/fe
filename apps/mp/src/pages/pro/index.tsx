import { Button, Input, Text, Textarea, View } from '@tarojs/components';
import Taro, { useLoad } from '@tarojs/taro';
import { useEffect, useMemo, useState } from 'react';
import type { AssetItem, GenerateWorkRequest } from '@xiaoa/share/types';
import { sharedApi } from '../../utils/sharedAdapter';
import { track } from '../../services/track';
import { QUOTA_INSUFFICIENT_CODE, QUOTA_INSUFFICIENT_TIP } from '../../utils/quotaConstants';
import { isAsrSupported, startAsr, stopAsr } from '../../utils/asr';

/** 「去配图」从对话模式带入的预填文案与关联会话 ID（与 pages/chat 的存储 key 一致） */
const CHAT_DESC_KEY = 'xiaoa_chat_link_desc';
const CHAT_SESSION_KEY = 'xiaoa_chat_session_id';

type LongId = number | string;
type AIGenerationType = 'IMAGE' | 'VIDEO';
interface CreationStyle { id: LongId; name: string; hot?: number | boolean; }
interface CreationConfig { styles: CreationStyle[]; platforms: Array<{ value: string; label: string }>; imagePrice: number; videoPrice: number; quota: { balance: number; total: number; used: number }; auditRequired: boolean; refAssetLimit?: number; }
/** 合规拦截错误码（AI 创作域文档 §1.4.1：命中 level=2 合规词直接拒绝，报 4001） */
const COMPLIANCE_REJECTED_CODE = 4001;
type AssetScope = 'BRAND' | 'STORE';
type PickedAsset = Pick<AssetItem, 'id'>;

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

/**
 * 按客户端 Tab 分组：GET /api/assets 不支持 scope 参数（文档 §3.3.2，
 * STAFF/OWNER 返回 PLATFORM ∪ BRAND ∪ STORE 合并列表），scope 在客户端按 item.scope 过滤。
 */
function splitByScope(list: AssetItem[]): { brand: AssetItem[]; store: AssetItem[] } {
  return {
    brand: list.filter((item) => item.scope !== 'STORE'),
    store: list.filter((item) => item.scope === 'STORE'),
  };
}

export default function ProPage() {
  const [config, setConfig] = useState<CreationConfig>(() => readCachedConfig() || fallbackConfig);
  const [styleId, setStyleId] = useState<LongId>(config.styles[0]?.id || '');
  const [platform, setPlatform] = useState(config.platforms[0]?.value || 'MOMENTS');
  const [productName, setProductName] = useState('');
  const [userInput, setUserInput] = useState('');
  const [selectedAssets, setSelectedAssets] = useState<PickedAsset[]>([]);
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

  // 语音听写（专业模式描述输入框：按住说话 → 转文字填入 textarea，用户可改）
  const [recognizing, setRecognizing] = useState(false);
  const [voiceSupported] = useState(() => isAsrSupported());
  // 对话模式带来的关联文案与会话 ID（生成请求透传 chatSessionId，成功后用选定文案回填 caption，文档 §2.6）
  const [linkedDesc, setLinkedDesc] = useState('');
  const [linkedSessionId, setLinkedSessionId] = useState<string>('');

  useLoad((params) => {
    if (params.type === 'video') setType('VIDEO');
    // 从图库页带入的素材只传 id，这里用占位对象渲染序号角标
    const ids = parseRefIds(params.refAssetIds);
    if (ids.length) setSelectedAssets(ids.map((id) => ({ id })));
    // 对话模式「去配图」：desc 预填（优先用路由参数，兼容从本地存储取关联文案），同时携带关联会话 ID
    const linked = params.desc || (params.fromChat ? ((Taro.getStorageSync(CHAT_DESC_KEY) as string) || '') : '');
    if (linked) {
      setUserInput(linked);
      setLinkedDesc(linked);
    }
    if (params.fromChat) setLinkedSessionId(String(Taro.getStorageSync(CHAT_SESSION_KEY) || ''));
  });
  useEffect(() => { const cached = readCachedConfig(); if (cached) { setConfig(cached); return; } setLoadingConfig(true); sharedApi.getCreationConfig().then((result) => { setConfig(result); saveCachedConfig(result); setStyleId(result.styles[0]?.id || ''); setPlatform(result.platforms[0]?.value || ''); }).catch((requestError) => setError(requestError instanceof Error ? requestError.message : '创作配置加载失败')).finally(() => setLoadingConfig(false)); }, []);
  useEffect(() => { if (!styleId && config.styles[0]) setStyleId(config.styles[0].id); if (!platform && config.platforms[0]) setPlatform(config.platforms[0].value); }, [config, platform, styleId]);
  const selectedStyle = useMemo(() => config.styles.find((style) => String(style.id) === String(styleId)), [config.styles, styleId]);
  const price = type === 'VIDEO' ? config.videoPrice : config.imagePrice;
  const assetLimit = config.refAssetLimit ?? 9;
  const canSubmit = Boolean(styleId && platform && !loading && !loadingConfig);
  const pickerAssets = assetTab === 'BRAND' ? brandAssets : storeAssets;

  const removeAsset = (id: LongId) => setSelectedAssets((current) => current.filter((item) => String(item.id) !== String(id)));

  const loadAssets = (category: string) => {
    setLoadingAssets(true);
    sharedApi.getAssets({ category: category === '全部' ? undefined : category })
      .then((list) => {
        const { brand, store } = splitByScope(list);
        setBrandAssets(brand);
        setStoreAssets(store);
      })
      .catch(() => Taro.showToast({ title: '图库加载失败，可稍后重试', icon: 'none' }))
      .finally(() => setLoadingAssets(false));
  };

  const openPicker = () => { setAssetTab('BRAND'); loadAssets(assetCategory); setShowPicker(true); };

  // 切 Tab 仅切换本地分组视图，不重复请求（列表已一次拉回并按 scope 分组）
  const switchAssetTab = (scope: AssetScope) => setAssetTab(scope);

  const switchAssetCategory = (category: string) => { setAssetCategory(category); loadAssets(category); };

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
          const asset: AssetItem = { ...uploaded, name: uploaded.name || '相册上传' };
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

  /** 按住说话：onRecognize 实时上屏，松手后最终文本填入描述框（用户可改再生成） */
  const onVoiceTouchStart = () => {
    if (!voiceSupported || loading) return;
    setRecognizing(true);
    startAsr({
      onRecognize: (text) => setUserInput(text),
      onFinal: (text) => {
        setRecognizing(false);
        if (text) setUserInput(text);
        else Taro.showToast({ title: '没听清，再试一次', icon: 'none' });
      },
      onError: (message) => {
        setRecognizing(false);
        Taro.showToast({ title: message, icon: 'none' });
      },
    });
  };
  const onVoiceTouchEnd = () => {
    if (recognizing) stopAsr();
  };

  const generate = async () => {
    if (!canSubmit) return;
    setLoading(true);
    setError('');
    const payload: GenerateWorkRequest = {
      type,
      styleId,
      platform,
      userInput: userInput.trim() || undefined,
      productName: productName.trim() || undefined,
      // 引用素材（文档 §1.4.1：最多 20 个，须三层可见 APPROVED，否则整次生成报 1001）
      assetIds: selectedAssets.map((asset) => asset.id),
      // 对话模式「去配图」：关联会话 ID（带它则不再自动生成成套文案，避免覆盖对话产出，文档 §2.6）
      ...(linkedSessionId ? { chatSessionId: linkedSessionId } : {}),
    };
    const startedAt = Date.now();
    track('create_generate', { type, style: selectedStyle?.name, styleId, platform });
    try {
      // 生成同步建作品+扣费+提交任务，返回 status=PENDING 的作品（前端去 generating 页轮询）
      const result = await sharedApi.generate(payload);
      const id = result?.id;
      if (!id) throw new Error('生成任务创建失败，请稍后重试');
      track('generate_complete', { workId: id, type, success: true, duration: Date.now() - startedAt });
      // 对话模式「去配图」：把对话选定文案回填为作品配套文案（作品不再自动生成成套文案，文档 §2.6）；尽力而为不阻断跳转
      if (linkedDesc) {
        sharedApi.updateWorkCaption(id, linkedDesc).catch(() => {});
      }
      // 已进入生成流程，清除对话关联文案，避免下次进入误预填（会话保留，可回对话页继续微调）
      Taro.removeStorageSync(CHAT_DESC_KEY);
      Taro.navigateTo({ url: `/pages/generating/index?workId=${id}&type=${type}` });
    } catch (requestError) {
      track('generate_complete', { type, success: false, duration: Date.now() - startedAt });
      const code = (requestError as Error & { code?: number })?.code;
      const isQuotaInsufficient = code === QUOTA_INSUFFICIENT_CODE || (requestError instanceof Error && requestError.message.includes('额度不足'));
      if (isQuotaInsufficient) {
        track('quota_insufficient', { type });
        Taro.showToast({ title: QUOTA_INSUFFICIENT_TIP, icon: 'none' });
      } else if (code === COMPLIANCE_REJECTED_CODE) {
        // 4001：描述命中拒绝级合规词，扣费不发生，引导调整文案
        setError(requestError instanceof Error ? requestError.message : '描述包含违禁词，请调整后重试');
      } else setError(requestError instanceof Error ? requestError.message : '生成失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="page creation-page">
      <View className="chat-header"><Text className="back-button" onClick={() => Taro.navigateBack()}>‹</Text><Text className="chat-title">创作</Text><Text className="chat-scene">{config.auditRequired ? '提交审核' : '直接发布'}</Text></View>
      {/* 创作页顶部模式切换：对话模式在 tabBar 创作页，需 switchTab 返回 */}
      <View className="creation-type-row" style={{ padding: '0 20px' }}>
        <Text className="pill" onClick={() => Taro.switchTab({ url: '/pages/chat/index' })}>💬 对话模式</Text>
        <Text className="pill active">🎛 专业模式</Text>
      </View>
      {linkedDesc && <View className="notice-bar"><Text>已带入对话文案：{linkedDesc.slice(0, 30)}{linkedDesc.length > 30 ? '…' : ''}</Text></View>}
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
              {/* content 当前为 local:// 占位协议（文档 §4.4），不能当 http URL 加载，先渲染占位图 */}
              <View className="asset-thumb" />
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
        <Text className="section-title">✍️ 描述 <Text className="muted" style={{ fontSize: '22px' }}>（可选）</Text>
          {voiceSupported && (
            <Text
              className="voice-button"
              style={recognizing ? { display: 'inline-flex', marginLeft: '12px', padding: '8px 18px', fontSize: '22px', background: '#f7e3c8' } : { display: 'inline-flex', marginLeft: '12px', padding: '8px 18px', fontSize: '22px' }}
              onTouchStart={onVoiceTouchStart}
              onTouchEnd={onVoiceTouchEnd}
              onTouchCancel={onVoiceTouchEnd}
            >{recognizing ? '松开识别' : '🎤 按住说话'}</Text>
          )}
        </Text>
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
                    {/* content 当前为 local:// 占位协议（文档 §4.4），不能当 http URL 加载，先渲染占位图 */}
                    <View className="asset-pick-thumb" />
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
