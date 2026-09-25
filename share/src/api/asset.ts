import type {
  AssetItem,
  AssetQuery,
  AssetReviewRequest,
  PageResult,
  RecommendAssetRequest,
  RequestAdapter,
  RequestOptions,
  UpdateAssetRequest,
} from './types';

/**
 * 资产配置域 · 素材接口（《额度计费域 & 资产配置域·前端接口文档》§3.4）。
 * 分类是素材上的自由字符串字段（≤50 字符），没有独立分类 CRUD 接口；
 * 管理端素材中心通过 services/sharedApi 使用；
 * 小程序端 weapp 构建链不编译 share 运行时代码，
 * 在 apps/mp/src/utils/sharedAdapter.ts 有字段对齐的薄封装。
 */
export function createAssetApi(adapter: RequestAdapter) {
  const request = <T>(url: string, options?: RequestOptions) => adapter.request<T>(url, options);

  return {
    /** GET /api/admin/assets 素材分页（scope/status/category 过滤；status=PENDING_REVIEW 即推优审核 Tab，文档 §3.4.2） */
    listAssets: (params: AssetQuery = {}) => request<PageResult<AssetItem>>('/admin/assets', { data: params }),
    /** POST /api/admin/assets 品牌素材上传（multipart，字段 file/name/category；上传即 scope=BRAND、status=APPROVED 全租户可见，文档 §3.4.1） */
    uploadAsset: (file: File, data: { name?: string; category?: string } = {}) => {
      const form = new FormData();
      form.append('file', file);
      if (data.name) form.append('name', data.name);
      if (data.category) form.append('category', data.category);
      return request<AssetItem>('/admin/assets', { method: 'POST', data: form, headers: { 'Content-Type': 'multipart/form-data' } });
    },
    /** PUT /api/admin/assets/{id} 编辑名称/分类（PLATFORM 不可改；BRAND 仅 HQ_ADMIN；STORE 仅本店 OWNER，文档 §3.4.3） */
    updateAsset: (id: number | string, data: UpdateAssetRequest) => request<void>(`/admin/assets/${id}`, { method: 'PUT', data }),
    /** DELETE /api/admin/assets/{id} 软删（status=DELETED；已生成作品里的 URL 快照不受影响，文档 §3.4.4） */
    deleteAsset: (id: number | string) => request<void>(`/admin/assets/${id}`, { method: 'DELETE' }),
    /** PUT /api/admin/assets/{id}/review 推优审核（仅 PENDING_REVIEW 可审；pass=true 时 scope: STORE→BRAND，文档 §3.4.5） */
    reviewAsset: (id: number | string, data: AssetReviewRequest) => request<void>(`/admin/assets/${id}/review`, { method: 'PUT', data }),
    /** POST /api/assets/recommend 推优本店素材（仅 SCOPE_STORE 可推优；已在推优流程中返回 1003） */
    recommendAsset: (data: RecommendAssetRequest) => request<void>('/assets/recommend', { method: 'POST', data }),
  };
}

export type AssetApi = ReturnType<typeof createAssetApi>;
