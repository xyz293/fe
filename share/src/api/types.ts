export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
export type LongId = number | string;

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
  workId: LongId;
  taskId?: LongId;
  platform: string;
  proofUrl?: string;
}

export type TaskFormType = 1 | 2;
export type TaskFrequency = 1 | 2 | 3;
export type TaskTargetScope = 1 | 2 | 3 | 4;
export type TaskJudgeType = 1 | 2;
export type TaskStatus = 1 | 2;

export interface Task {
  id: LongId;
  tenantId?: LongId;
  title: string;
  formType: TaskFormType;
  contentPackageId?: LongId | null;
  platform?: string | null;
  frequency: TaskFrequency;
  targetScope: TaskTargetScope;
  targetIds: number[] | string;
  judgeType: TaskJudgeType;
  sourceTaskId?: LongId | null;
  createdBy?: LongId;
  createdLevel?: 1 | 2 | 3;
  status: TaskStatus;
  startAt?: string | null;
  endAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  periodDate?: string;
  recordStatus?: 0 | 1;
  publishRecordId?: LongId | null;
}

export interface CreateTaskRequest {
  title: string;
  formType: TaskFormType;
  contentPackageId?: LongId;
  platform?: string;
  frequency: TaskFrequency;
  targetScope: TaskTargetScope;
  targetIds: number[];
  judgeType: TaskJudgeType;
  startAt?: string;
  endAt?: string;
}

export interface UpdateTaskRequest {
  title: string;
  contentPackageId?: LongId;
  platform?: string;
  startAt?: string;
  endAt?: string;
}

export interface TaskStatusRequest {
  status: TaskStatus;
}

export interface TaskModifyLog {
  id: LongId;
  tenantId?: LongId;
  taskId: LongId;
  modifiedBy?: LongId;
  changeDetail: string;
  createdAt?: string;
}

export interface StoreTaskRecord {
  id: LongId;
  tenantId?: LongId;
  taskId: LongId;
  userId: LongId;
  storeId: LongId;
  periodDate: string;
  status: 0 | 1;
  publishRecordId?: LongId | null;
  finishedAt?: string | null;
}

export interface StoreBoard {
  storeId: LongId;
  periodDate: string;
  expected: number;
  finished: number;
  completionRate: number;
  unfinished: StoreTaskRecord[];
}

export interface RemindTaskRequest {
  taskId: LongId;
  periodDate?: string;
}
