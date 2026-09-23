import { Button, Input, Text, View } from '@tarojs/components';
import Taro, { useLoad } from '@tarojs/taro';
import { useEffect, useMemo, useState } from 'react';
import { sharedApi } from '../../utils/sharedAdapter';
import { track } from '../../services/track';

type LongId = number | string;
type AIGenerationType = 'IMAGE' | 'VIDEO';
interface CreationConfig { styles: Array<{ id: LongId; name: string }>; platforms: Array<{ value: string; label: string }>; imagePrice: number; videoPrice: number; quota: { balance: number; total: number; used: number }; auditRequired: boolean; refAssetLimit?: number; }
interface GenerateWorkRequest { type: AIGenerationType; styleId: LongId; platform: string; userInput: string; refAssetIds: LongId[]; }

const CONFIG_CACHE_KEY = 'xiaoa_creation_config';
const CONFIG_CACHE_TTL = 10 * 60 * 1000;
const fallbackConfig: CreationConfig = {
  styles: [{ id: 1, name: '轻奢' }, { id: 2, name: '婚庆' }, { id: 3, name: '国风' }, { id: 4, name: '日常' }],
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

export default function ProPage() {
  const [config, setConfig] = useState<CreationConfig>(() => readCachedConfig() || fallbackConfig);
  const [styleId, setStyleId] = useState<LongId>(config.styles[0]?.id || '');
  const [platform, setPlatform] = useState(config.platforms[0]?.value || 'MOMENTS');
  const [userInput, setUserInput] = useState('');
  const [refAssetIds, setRefAssetIds] = useState<LongId[]>([]);
  const [type, setType] = useState<AIGenerationType>('IMAGE');
  const [loading, setLoading] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [error, setError] = useState('');
  const [quotaError, setQuotaError] = useState(false);

  useLoad((params) => { if (params.type === 'video') setType('VIDEO'); setRefAssetIds(parseRefIds(params.refAssetIds)); });
  useEffect(() => { const cached = readCachedConfig(); if (cached) { setConfig(cached); return; } setLoadingConfig(true); sharedApi.getCreationConfig().then((result) => { setConfig(result); saveCachedConfig(result); setStyleId(result.styles[0]?.id || ''); setPlatform(result.platforms[0]?.value || ''); }).catch((requestError) => setError(requestError instanceof Error ? requestError.message : '创作配置加载失败')).finally(() => setLoadingConfig(false)); }, []);
  useEffect(() => { if (!styleId && config.styles[0]) setStyleId(config.styles[0].id); if (!platform && config.platforms[0]) setPlatform(config.platforms[0].value); }, [config, platform, styleId]);
  const selectedStyle = useMemo(() => config.styles.find((style) => String(style.id) === String(styleId)), [config.styles, styleId]);
  const price = type === 'VIDEO' ? config.videoPrice : config.imagePrice;
  const canSubmit = Boolean(styleId && platform && !loading && !loadingConfig);
  const removeAsset = (id: LongId) => setRefAssetIds((current) => current.filter((item) => String(item) !== String(id)));
  const generate = async () => { if (!canSubmit) return; setLoading(true); setError(''); setQuotaError(false); const payload: GenerateWorkRequest = { type, styleId, platform, userInput: userInput.trim(), refAssetIds }; const startedAt = Date.now(); track('create_generate', { type, style: selectedStyle?.name, styleId, platform }); try { const result = await sharedApi.generate(payload); const id = result.workId ?? result.taskId; if (!id) throw new Error('生成任务创建失败，请稍后重试'); track('generate_complete', { workId: id, type, success: true, duration: Date.now() - startedAt }); Taro.navigateTo({ url: `/pages/generating/index?workId=${id}&type=${type}` }); } catch (requestError) { track('generate_complete', { type, success: false, duration: Date.now() - startedAt }); if (requestError instanceof Error && 'code' in requestError && requestError.code === 4001) { setQuotaError(true); track('quota_insufficient', { type }); } else setError(requestError instanceof Error ? requestError.message : '生成失败，请稍后重试'); } finally { setLoading(false); } };

  return <View className="page creation-page"><View className="chat-header"><Text className="back-button" onClick={() => Taro.navigateBack()}>‹</Text><Text className="chat-title">创作</Text><Text className="chat-scene">{config.auditRequired ? '提交审核' : '直接发布'}</Text></View><View className="card creation-card"><Text className="section-title" style={{ marginTop: 0 }}>🎨 选风格</Text><View className="creation-chips">{config.styles.map((style) => <Text className={String(style.id) === String(styleId) ? 'pill active' : 'pill'} key={String(style.id)} onClick={() => setStyleId(style.id)}>{style.name}</Text>)}</View><Text className="section-title">📱 发平台</Text><View className="creation-chips">{config.platforms.map((item) => <Text className={platform === item.value ? 'pill active' : 'pill'} key={item.value} onClick={() => setPlatform(item.value)}>{item.label}</Text>)}</View><Text className="section-title">✍️ 创作要求 <Text className="muted" style={{ fontSize: '22px' }}>（可选）</Text></Text><Input className="prompt-box" value={userInput} maxlength={300} placeholder="输入商品、节日和想表达的感觉..." onInput={(event) => setUserInput(event.detail.value)} /><Text className="section-title">🖼 引用素材 <Text className="muted" style={{ fontSize: '22px' }}>（可选）</Text></Text>{refAssetIds.length ? <View className="asset-ref-row">{refAssetIds.map((id) => <View className="asset-ref" key={String(id)}><View className="asset-ref-cover"><Text>素材</Text></View><Text className="asset-ref-close" onClick={() => removeAsset(id)}>×</Text></View>)}</View> : <Text className="muted" style={{ display: 'block', fontSize: '23px' }}>可以从图库选择素材带入创作</Text>}<View className="creation-cost"><Text>💰 图文 {config.imagePrice} 积分 / 视频 {config.videoPrice} 积分</Text><Text>本店余额：{config.quota.balance.toLocaleString()}</Text></View><View className="creation-type-row"><Text className={type === 'IMAGE' ? 'pill active' : 'pill'} onClick={() => setType('IMAGE')}>✦ 生成图文</Text><Text className={type === 'VIDEO' ? 'pill active' : 'pill'} onClick={() => setType('VIDEO')}>🎬 生成视频</Text></View></View>{error && <View className="notice-bar"><Text>{error}</Text></View>}<Text className="cost-note">本次预计消耗 {price} 积分 · 生成失败自动退回</Text><Button className="primary-button" loading={loading} disabled={!canSubmit} onClick={generate}>{loading ? '正在提交生成…' : config.auditRequired ? '提交审核并生成' : '开始生成'}</Button>{quotaError && <><View className="modal-mask" onClick={() => setQuotaError(false)} /><View className="quota-sheet"><Text className="page-title" style={{ fontSize: '34px' }}>本店额度不足</Text><Text className="hero-copy">请联系店长或总部为本店分配额度后再试。</Text><Button className="primary-button" onClick={() => setQuotaError(false)}>我知道了</Button></View></>}</View>;
}
