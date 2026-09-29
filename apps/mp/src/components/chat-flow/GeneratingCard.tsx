/**
 * 生成中占位卡（挂起点 3，PENDING_MEDIA action → 对接文档 §5.3）：
 * - 拿 workId 轮询 GET /api/work/{id}（3.5s 间隔，上限 30 分钟）；
 *   SUCCESS → onDone(work) 上抛，页面原地替换为作品卡；FAILED → onError（额度已自动退回）；
 * - 期间用户可关闭页面/继续聊，互不影响；重进会话时按历史 PENDING_MEDIA 消息恢复轮询。
 */
import { Text, View } from '@tarojs/components';
import { useEffect, useRef } from 'react';
import type { AiWork } from '@xiaoa/share/types';
import { sharedApi } from '../../utils/sharedAdapter';

const POLL_INTERVAL = 3500;
const POLL_MAX_DURATION = 30 * 60 * 1000;

interface GeneratingCardProps {
  workId: string;
  onDone: (work: AiWork) => void;
  onError: (message: string) => void;
}

export function GeneratingCard({ workId, onDone, onError }: GeneratingCardProps) {
  const finishedRef = useRef(false);

  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const startedAt = Date.now();

    const stop = () => {
      stopped = true;
      if (timer) clearTimeout(timer);
    };

    const poll = async () => {
      if (stopped) return;
      if (Date.now() - startedAt > POLL_MAX_DURATION) {
        stop();
        onError('生成时间较长，请稍后在「作品」页查看结果');
        return;
      }
      try {
        const work = await sharedApi.getWork(workId);
        if (stopped) return;
        if (work.status === 'SUCCESS') {
          stop();
          if (!finishedRef.current) {
            finishedRef.current = true;
            onDone(work);
          }
          return;
        }
        if (work.status === 'FAILED') {
          stop();
          onError(work.failReason || '生成失败，额度已自动退回');
          return;
        }
        timer = setTimeout(() => void poll(), POLL_INTERVAL);
      } catch {
        // 网络抖动容忍，继续轮询
        if (!stopped) timer = setTimeout(() => void poll(), POLL_INTERVAL);
      }
    };

    void poll();
    return stop;
    // onDone/onError 依赖页面渲染闭包，workId 不变即不重建轮询
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workId]);

  return (
    <View className="flow-card gen-card">
      <View className="ai-breath"><Text>💬</Text><Text>🎨</Text><Text>🎬</Text></View>
      <Text className="gen-card-title">图/视频生成中…</Text>
      <Text className="gen-card-meta">完成后会自动出现在这里，可以先去忙别的～</Text>
      <Text className="gen-card-meta">已预扣额度 · 失败自动退回</Text>
    </View>
  );
}
