import Taro from '@tarojs/taro';
import type { ApiResponse, RequestOptions } from '@xiaoa/share/types';
import { taroRequestAdapter } from './sharedAdapter';

export type { ApiResponse };

export async function request<T>(
  url: string,
  options: Omit<Taro.request.Option, 'url'> = {},
): Promise<T> {
  const sharedOptions: RequestOptions = {
    method: options.method as RequestOptions['method'],
    data: options.data,
    headers: options.header as Record<string, string> | undefined,
  };

  try {
    return await taroRequestAdapter.request<T>(url, sharedOptions);
  } catch (error) {
    const message = error instanceof Error ? error.message : '请求失败';
    Taro.showToast({ title: message, icon: 'none' });
    throw error;
  }
}
