import axios from 'axios';
import { message } from 'antd';
import { createApi, createAssetApi, createContentPackageApi, createQuotaApi, createTracker, createWorkApi, type RequestAdapter, type RequestOptions } from '@xiaoa/share';

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api',
  timeout: 30_000,
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

client.interceptors.response.use((response) => {
  const result = response.data as { code: number; msg: string; data: unknown };
  if (result.code === 2001 || result.code === 401) {
    localStorage.removeItem('token');
    window.location.href = '/login';
    return Promise.reject(new Error(result.msg || '登录已过期'));
  }
  if (result.code === 2004) {
    message.warning(result.msg || '账号未入店');
    return Promise.reject(new Error(result.msg || '账号未入店'));
  }
  if (result.code !== 0) {
    message.error(result.msg || '请求失败');
    return Promise.reject(new Error(result.msg || '请求失败'));
  }
  response.data = result.data;
  return response;
});

const axiosAdapter: RequestAdapter = {
  async request<T>(url: string, options: RequestOptions = {}) {
    const response = await client.request<T>({
      url,
      method: options.method,
      data: options.data,
      signal: options.signal,
      headers: options.headers,
    });
    return response.data;
  },
};

export const sharedApi = createApi(axiosAdapter);
/** 额度计费域接口：算力总池 / 流水 / 分配 / 平台收款 */
export const quotaApi = createQuotaApi(axiosAdapter);
/** 创作与作品域接口：审核队列 / 文案改稿 / 重新生成（详见 share/src/api/work.ts） */
export const workApi = createWorkApi(axiosAdapter);
/** 资产配置域接口：素材中心三 Tab / 分类 / 上传 / 推优审核（详见 share/src/api/asset.ts） */
export const assetApi = createAssetApi(axiosAdapter);
/** 资产配置域接口：营销日历内容包（详见 share/src/api/contentPackage.ts） */
export const packageApi = createContentPackageApi(axiosAdapter);
export const track = createTracker(axiosAdapter);
