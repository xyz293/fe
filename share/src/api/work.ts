import type { AiWork, GenerateWorkRequest, PublishRecord, RejectWorkRequest, RequestAdapter, RequestOptions } from './types';

/**
 * AI 创作域接口（《AI 创作域 & 企业管理域·前端接口文档》§1）。
 *
 * 管理端通过 services/sharedApi 的 createWorkApi 直接使用；
 * 小程序端 weapp 构建链不编译 share 运行时代码，
 * 在 apps/mp/src/utils/sharedAdapter.ts 有字段对齐的薄封装。
 */
export function createWorkApi(adapter: RequestAdapter) {
  const request = <T>(url: string, options?: RequestOptions) => adapter.request<T>(url, options);

  return {
    /** POST /api/work/generate 发起生成（同步建作品+扣费+提交任务，返回 status=PENDING；前端轮询 getWork 至 SUCCESS/FAILED） */
    generateWork: (data: GenerateWorkRequest) => request<AiWork>('/work/generate', { method: 'POST', data }),
    /** GET /api/work/{id} 作品详情（轮询用，仅作品本人；建议 2~3 秒间隔，VIDEO 放宽至 5~10 秒） */
    getWork: (workId: number | string) => request<AiWork>(`/work/${workId}`),
    /** PUT /api/work/{id}/caption 修改文案（仅 DRAFT/APPROVED/REJECTED 可改；REJECTED 改稿成功自动回 PENDING_AUDIT 重提审） */
    updateWorkCaption: (workId: number | string, caption: string) =>
      request<void>(`/work/${workId}/caption`, { method: 'PUT', data: { caption } }),
    /** POST /api/work/{id}/regenerate 重新生成（原 prompt 全价扣费，status 重置 PENDING 继续轮询；仅 DRAFT/APPROVED/REJECTED 可用） */
    regenerateWork: (workId: number | string) =>
      request<void>(`/work/${workId}/regenerate`, { method: 'POST' }),
    /** POST /api/publish-record 提交发布记录（半自动发布流最后一步，任务域校验） */
    publishWorkRecord: (data: PublishRecord) => request<void>('/publish-record', { method: 'POST', data }),
    /** GET /api/admin/audit/works 待审作品列表（仅 PENDING_AUDIT，最多 100 条无分页；OWNER 也可审核本店作品，STAFF/VIEWER 2003） */
    auditList: () => request<AiWork[]>('/admin/audit/works'),
    /** POST /api/admin/audit/works/{id}/approve 审核通过（状态变更走条件更新，并发双审只会成功一次） */
    approveAuditWork: (id: number | string) =>
      request<void>(`/admin/audit/works/${id}/approve`, { method: 'POST' }),
    /** POST /api/admin/audit/works/{id}/reject 审核驳回（opinion 必填 ≤512，并给作者发站内信） */
    rejectAuditWork: (id: number | string, data: RejectWorkRequest) =>
      request<void>(`/admin/audit/works/${id}/reject`, { method: 'POST', data }),
  };
}

export type WorkApi = ReturnType<typeof createWorkApi>;
