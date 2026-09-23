import type { AsyncTask, RequestAdapter } from './types';

export interface PollTaskOptions {
  interval?: number;
  timeout?: number;
  onProgress?: (task: AsyncTask) => void;
}

export async function pollTask(adapter: RequestAdapter, taskId: string, { interval = 3000, timeout = 10 * 60 * 1000, onProgress }: PollTaskOptions = {}) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeout) {
    const task = await adapter.request<AsyncTask>(`/task/${taskId}`);
    onProgress?.(task);
    if (task.status === 'SUCCESS') return task;
    if (task.status === 'FAILED') throw new Error(task.errorMessage || '生成失败');
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
  throw new Error('生成超时，请稍后在作品列表查看');
}
