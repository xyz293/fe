import { useCallback, useEffect, useRef, useState } from 'react';
import type { AiWork, AsyncTask, RequestAdapter } from './types';

export interface PollTaskOptions {
  interval?: number;
  timeout?: number;
  onProgress?: (task: AsyncTask) => void;
}

export interface PollWorkOptions {
  interval?: number;
  timeout?: number;
  onProgress?: (work: AiWork) => void;
}

export type PollingState = 'idle' | 'pending' | 'success' | 'error' | 'timeout';

export interface UsePollingOptions<T> {
  enabled?: boolean;
  interval?: number;
  timeout?: number;
  isDone?: (value: T) => boolean;
}

export interface UsePollingResult<T> {
  state: PollingState;
  data: T | null;
  error: Error | null;
  start: () => void;
  stop: () => void;
}

export function usePolling<T>(fn: () => Promise<T>, { enabled = true, interval = 3000, timeout = 5 * 60 * 1000, isDone = () => false }: UsePollingOptions<T> = {}): UsePollingResult<T> {
  const fnRef = useRef(fn);
  const doneRef = useRef(isDone);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startedAtRef = useRef(0);
  const stoppedRef = useRef(false);
  const [state, setState] = useState<PollingState>(enabled ? 'pending' : 'idle');
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => { fnRef.current = fn; }, [fn]);
  useEffect(() => { doneRef.current = isDone; }, [isDone]);

  const stop = useCallback(() => {
    stoppedRef.current = true;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);

  const start = useCallback(() => {
    stoppedRef.current = false;
    startedAtRef.current = Date.now();
    setState('pending');
    setError(null);
    const tick = async () => {
      if (stoppedRef.current) return;
      if (Date.now() - startedAtRef.current >= timeout) {
        setState('timeout');
        stop();
        return;
      }
      try {
        const result = await fnRef.current();
        if (stoppedRef.current) return;
        setData(result);
        if (doneRef.current(result)) {
          setState('success');
          stop();
          return;
        }
        timerRef.current = setTimeout(tick, interval);
      } catch (requestError) {
        if (stoppedRef.current) return;
        setError(requestError instanceof Error ? requestError : new Error('轮询请求失败'));
        setState('error');
        stop();
      }
    };
    void tick();
  }, [interval, stop, timeout]);

  useEffect(() => {
    if (enabled) start();
    return stop;
  }, [enabled, start, stop]);

  return { state, data, error, start, stop };
}

/**
 * 轮询作品生成结果（AI 创作域文档 §1.4.2/§3.1/§3.2）：
 * GET /api/work/{id} 直到 status 为 SUCCESS/FAILED；图片数秒内完成，视频后端约 30 秒一轮轮询模型，
 * 默认 5 秒间隔 + 30 分钟超时（超 30 分钟后端判超时并自动退款）。
 */
export async function pollWorkStatus(adapter: RequestAdapter, workId: number | string, { interval = 5000, timeout = 30 * 60 * 1000, onProgress }: PollWorkOptions = {}) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeout) {
    const work = await adapter.request<AiWork>(`/work/${workId}`);
    onProgress?.(work);
    if (work.status === 'SUCCESS' || work.status === 'FAILED') return work;
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
  throw new Error('生成较慢，可稍后在作品列表查看');
}

export async function pollTask(adapter: RequestAdapter, taskId: string, { interval = 3000, timeout = 5 * 60 * 1000, onProgress }: PollTaskOptions = {}) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeout) {
    const task = await adapter.request<AsyncTask>(`/task/${taskId}`);
    onProgress?.(task);
    if (task.status === 'SUCCESS') return task;
    if (task.status === 'FAILED') throw new Error(task.errorMessage || '生成失败');
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
  throw new Error('生成较慢，可稍后在作品列表查看');
}
