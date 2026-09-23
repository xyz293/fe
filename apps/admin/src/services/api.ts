import axios from 'axios';
import { message } from 'antd';
import type { ApiResponse } from '@xiaoa/share';

export type { ApiResponse };

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api',
  timeout: 30_000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use((response) => {
  const result = response.data as ApiResponse<unknown>;
  if (result.code === 401) {
    localStorage.removeItem('token');
    window.location.href = '/login';
    return Promise.reject(new Error(result.msg || '登录已过期'));
  }
  if (result.code !== 0) {
    message.error(result.msg || '请求失败');
    return Promise.reject(new Error(result.msg || '请求失败'));
  }
  response.data = result.data;
  return response;
});
