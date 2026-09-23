export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface RequestOptions {
  method?: HttpMethod;
  data?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

export interface RequestAdapter {
  request: <T>(url: string, options?: RequestOptions) => Promise<T>;
}

export interface ApiResponse<T> {
  code: number;
  msg: string;
  data: T;
}

export interface PageResult<T> {
  list: T[];
  total: number;
  pageNo?: number;
  pageSize?: number;
}

export interface User {
  id: string;
  name: string;
  role: 'EMPLOYEE' | 'OWNER';
  storeId: string;
  storeName: string;
}

export interface Quota {
  balance: number;
  total: number;
  used: number;
}

export interface TaskSummary {
  pending: number;
  completed: number;
  overdue: number;
}

export type AsyncTaskStatus = 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED';

export interface AsyncTask {
  taskId: string;
  status: AsyncTaskStatus;
  progress?: number;
  result?: { workId: string };
  errorMessage?: string;
}

export interface ChatResult {
  versions: string[];
}

export interface GenerateResult {
  taskId?: string;
  workId?: string;
}

export interface Work {
  id: string;
  title: string;
  coverUrl?: string;
  type: 'COPY' | 'IMAGE' | 'VIDEO';
  status: 'DRAFT' | 'PENDING_REVIEW' | 'READY' | 'REJECTED';
  summary?: string;
}

export interface PublishRecord {
  workId: string;
  platform: 'MOMENTS' | 'REDNOTE' | 'DOUYIN' | 'VIDEO_CHANNEL';
  proofUrl?: string;
}
