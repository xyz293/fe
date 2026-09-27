import { Button, Image, Text, Video, View } from '@tarojs/components';
import Taro, { useLoad } from '@tarojs/taro';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { AiWork } from '@xiaoa/share/types';
import { sharedApi } from '../../utils/sharedAdapter';
import { track } from '../../services/track';

type AIGenerationType = 'IMAGE' | 'VIDEO';
type PollState = 'idle' | 'pending' | 'done' | 'error';

/**
 * 轮询节奏（文档 §3.1/§3.2）：GET /api/work/{id} 轮询到 status=SUCCESS/FAILED；
 * IMAGE 建议数秒级、前端 3 秒；VIDEO 后端约 30 秒一轮轮询模型，前端放宽到 5 秒。
 * 超时上限 30 分钟（与后端一致：超时判失败并自动退款）。
 */
const POLL_INTERVAL: Record<AIGenerationType, number> = { IMAGE: 3000, VIDEO: 5000 };
const POLL_MAX_DURATION = 30 * 60 * 1000;

function useWorkPolling(workId: string, type: AIGenerationType) {
  const [state, setState] = useState<PollState>(workId ? 'pending' : 'idle');
  const [work, setWork] = useState<AiWork | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const active = useRef(true);
  useEffect(() => {
    active.current = true;
    if (!workId) { setState('idle'); return () => { active.current = false; }; }
    const startedAt = Date.now();
    setState('pending'); setWork(null); setError(null);
    let timer: ReturnType<typeof setTimeout> | undefined;
    const poll = async () => {
      if (!active.current) return;
      if (Date.now() - startedAt >= POLL_MAX_DURATION) { setState('error'); setError(new Error('生成较慢，可稍后在作品列表查看')); return; }
      try {
        const result = await sharedApi.getWork(workId);
        if (!active.current) return;
        setWork(result);
        // 终态：SUCCESS / FAILED（生成维度状态机，与发布维度 publishStatus 独立）
        if (result.status === 'SUCCESS' || result.status === 'FAILED') { setState('done'); return; }
        timer = setTimeout(poll, POLL_INTERVAL[type]);
      } catch (requestError) {
        if (!active.current) return;
        setError(requestError instanceof Error ? requestError : new Error('任务查询失败'));
        setState('error');
      }
    };
    void poll();
    return () => { active.current = false; if (timer) clearTimeout(timer); };
  }, [workId, type]);
  return { state, work, error };
}

export default function GeneratingPage() {
  const [workId, setWorkId] = useState(''); const [type, setType] = useState<AIGenerationType>('IMAGE');
  const startedAt = useMemo(() => Date.now(), []); const reportedRef = useRef(false);
  const [tick, setTick] = useState(0);
  useLoad((params) => { if (params.workId || params.taskId) setWorkId(params.workId || params.taskId); if (params.type === 'VIDEO') setType('VIDEO'); });
  const polling = useWorkPolling(workId, type);
  const work = polling.work;
  const done = work?.status === 'SUCCESS';
  const failed = work?.status === 'FAILED' || polling.state === 'error';
  // 文档未提供进度接口：生成中按已等待时间估算进度（图片秒级完成，视频约 30 秒一轮）
  useEffect(() => { if (workId && !done && !failed && polling.state === 'pending') { const t = setInterval(() => setTick((v) => v + 1), 2000); return () => clearInterval(t); } }, [workId, done, failed, polling.state]);
  void tick;
  const progress = done ? 100 : failed ? 0 : Math.min(95, Math.floor((Date.now() - startedAt) / 600));
  useEffect(() => { if (!reportedRef.current && workId && (done || failed)) { reportedRef.current = true; track('generate_result', { workId, success: done, duration: Date.now() - startedAt, failReason: work?.failReason }); } }, [done, failed, startedAt, work, workId]);
  // local:// 是后端本地占位协议（OSS 接入前，文档 §3.5），不能当 http URL 加载，渲染占位提示
  const mediaUrl = work?.contentUrl && !work.contentUrl.startsWith('local://') ? work.contentUrl : '';
  const goWork = () => Taro.redirectTo({ url: `/pages/work-detail/index?id=${workId}` });
  const retry = () => Taro.redirectTo({ url: `/pages/pro/index?type=${type === 'VIDEO' ? 'video' : 'image'}` });
  return <View className="page generating-page"><View className="chat-header"><Text className="back-button" onClick={() => Taro.navigateBack()}>‹</Text><Text className="chat-title">生成中</Text><Text className="chat-scene">后台运行</Text></View><View className="progress-card card">{failed ? <><Text className="generation-symbol">↻</Text><Text className="page-title generation-title">生成没有完成</Text><Text className="hero-copy generation-copy">{polling.state === 'error' ? polling.error?.message || '生成较慢，可稍后在作品列表查看' : work?.failReason || '生成失败，请稍后重试'}</Text><Text className="refund-note">消耗额度已自动退回</Text><Button className="primary-button" style={{ marginTop: '30px' }} onClick={retry}>重新生成</Button><Button className="secondary-button" style={{ marginTop: '16px' }} onClick={() => Taro.switchTab({ url: '/pages/works/index' })}>返回作品列表</Button></> : done ? <><Text className="generation-symbol success-symbol">✓</Text><Text className="page-title generation-title">生成完成</Text>{mediaUrl && (type === 'VIDEO' ? <Video className="generation-media" src={mediaUrl} controls /> : <Image className="generation-media" src={mediaUrl} mode="widthFix" />)}{work?.contentUrl && !mediaUrl && <Text className="muted" style={{ display: 'block', fontSize: '22px' }}>成品已就绪，图库接入 OSS 后即可预览</Text>}<Text className="hero-copy generation-copy">成品已经准备好，可以继续发布打卡或打开作品详情。</Text><Button className="primary-button" onClick={goWork}>查看作品</Button></> : <><View className="ai-breath"><Text>✦</Text><Text>AI 创作中…</Text><Text>✦</Text></View><Text className="page-title generation-title">正在把你的灵感变成成品</Text><Text className="hero-copy generation-copy">{type === 'VIDEO' ? '视频生成约需 1 分钟，离开页面也不会取消任务。' : '预计 1 分钟内完成，离开页面也不会取消任务。'}</Text><View className="progress-track"><View className="progress-fill" style={{ width: `${progress}%` }} /></View><Text className="muted" style={{ fontSize: '23px' }}>{progress ? `已完成 ${progress}%` : '正在准备素材和创作方案'}</Text><Button className="secondary-button" style={{ marginTop: '34px' }} onClick={() => Taro.switchTab({ url: '/pages/works/index' })}>返回作品列表</Button></>}</View>{polling.error && polling.state === 'error' && <View className="notice-bar"><Text>{polling.error.message}</Text></View>}<Text className="muted generation-id">作品 ID：{workId}</Text></View>;
}
