import type {
  AuditWorkItem,
  AuditWorkQuery,
  GenerateResult,
  GenerateWorkRequest,
  PageResult,
  PublishRecord,
  RejectWorkRequest,
  RequestAdapter,
  RequestOptions,
} from './types';

/**
 * 创作与作品域接口（《创作与作品域-后端方案》）。
 *
 * 管理端通过 services/sharedApi 的 createWorkApi 直接使用；
 * 小程序端 weapp 构建链不编译 share 运行时代码，
 * 在 apps/mp/src/utils/sharedAdapter.ts 有字段对齐的薄封装。
 */
export function createWorkApi(adapter: RequestAdapter) {
  const request = <T>(url: string, options?: RequestOptions) => adapter.request<T>(url, options);

  return {
    /** POST /api/work/generate 提交生成任务 */
    generateWork: (data: GenerateWorkRequest) => request<GenerateResult>('/work/generate', { method: 'POST', data }),
    /** PUT /api/work/{id}/caption 修改配套文案（驳回改稿重提后后端自动回 PENDING_AUDIT） */
    updateWorkCaption: (workId: number | string, caption: string) =>
      request<void>(`/work/${workId}/caption`, { method: 'PUT', data: { caption } }),
    /** POST /api/work/{id}/regenerate 重新生成（全价扣费，前端二次确认） */
    regenerateWork: (workId: number | string) =>
      request<GenerateResult>(`/work/${workId}/regenerate`, { method: 'POST' }),
    /** POST /api/publish-record 提交发布记录（半自动发布流最后一步，后端做第 8 条校验） */
    publishWorkRecord: (data: PublishRecord) => request<void>('/publish-record', { method: 'POST', data }),
    /** GET /api/admin/audit/works 待审核作品列表（后端按数据范围裁剪） */
    auditList: (params: AuditWorkQuery = {}) => request<PageResult<AuditWorkItem>>('/admin/audit/works', { data: params }),
    /** POST /api/admin/audit/works/{id}/approve 审核通过；并发冲突时后端返回"状态已变更" */
    approveAuditWork: (id: number | string) =>
      request<void>(`/admin/audit/works/${id}/approve`, { method: 'POST' }),
    /** POST /api/admin/audit/works/{id}/reject 驳回（opinion 必填，字数上限 200） */
    rejectAuditWork: (id: number | string, data: RejectWorkRequest) =>
      request<void>(`/admin/audit/works/${id}/reject`, { method: 'POST', data }),
  };
}

export type WorkApi = ReturnType<typeof createWorkApi>;
