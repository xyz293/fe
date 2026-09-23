import type { AsyncTask } from '@xiaoa/share/types';
import { taroRequestAdapter } from './sharedAdapter';

export type { AsyncTask };

export async function pollTask(taskId: string, interval = 3000, timeout = 10 * 60 * 1000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeout) {
    const task = await taroRequestAdapter.request<AsyncTask>(`/task/${taskId}`);
    if (task.status === 'SUCCESS') return task;
    if (task.status === 'FAILED') throw new Error(task.errorMessage || '生成失败');
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
  throw new Error('生成超时，请稍后在作品列表查看');
}
