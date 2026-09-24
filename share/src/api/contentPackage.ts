import type { ContentPackage, ContentPackageQuery, CreateContentPackageRequest, PageResult, RequestAdapter, RequestOptions } from './types';

/**
 * 资产配置域 · 内容包（营销日历）接口（《资产配置域-后端方案》）。
 * "下发"在 UI 上不存在（可见性即下发）：ACTIVE=待下发（蓝），EXPIRED=已下发（绿）。
 */
export function createContentPackageApi(adapter: RequestAdapter) {
  const request = <T>(url: string, options?: RequestOptions) => adapter.request<T>(url, options);

  return {
    /** GET /api/admin/content-packages 内容包列表（营销日历按 month=YYYY-MM 拉取） */
    listPackages: (params: ContentPackageQuery = {}) => request<PageResult<ContentPackage>>('/admin/content-packages', { data: params }),
    /** POST /api/admin/content-packages 新建节点内容包（营销日过去由前端禁选 + 后端校验双保险） */
    createPackage: (data: CreateContentPackageRequest) => request<ContentPackage>('/admin/content-packages', { method: 'POST', data }),
    /** DELETE /api/admin/content-packages/{id} 撤销（仅 ACTIVE；刚好被定时任务下发时后端返回"状态已变更"） */
    cancelPackage: (id: number | string) => request<void>(`/admin/content-packages/${id}`, { method: 'DELETE' }),
  };
}

export type ContentPackageApi = ReturnType<typeof createContentPackageApi>;
