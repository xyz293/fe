import type {
  AssetCategory,
  AssetItem,
  AssetQuery,
  AssetReviewRequest,
  CreateAssetCategoryRequest,
  PageResult,
  RenameAssetCategoryRequest,
  RequestAdapter,
  RequestOptions,
  UpdateAssetRequest,
} from './types';

/**
 * 资产配置域接口（《资产配置域-后端方案》）。
 * 管理端素材中心（三 Tab + 分类侧栏）通过 services/sharedApi 使用；
 * 小程序端 weapp 构建链不编译 share 运行时代码，
 * 在 apps/mp/src/utils/sharedAdapter.ts 有字段对齐的薄封装。
 */
export function createAssetApi(adapter: RequestAdapter) {
  const request = <T>(url: string, options?: RequestOptions) => adapter.request<T>(url, options);

  return {
    /** GET /api/admin/assets 素材列表（scope=BRAND/PLATFORM、status=PENDING_REVIEW、category 过滤，后端按数据范围裁剪） */
    listAssets: (params: AssetQuery = {}) => request<PageResult<AssetItem>>('/admin/assets', { data: params }),
    /** POST /api/admin/assets 上传素材（multipart，逐文件调用，单个失败不阻塞其余） */
    uploadAsset: (file: File, data: { title?: string; categoryId?: number | string; category?: string } = {}) => {
      const form = new FormData();
      form.append('file', file);
      if (data.title) form.append('title', data.title);
      if (data.categoryId !== undefined && data.categoryId !== null && data.categoryId !== '') form.append('categoryId', String(data.categoryId));
      if (data.category) form.append('category', data.category);
      return request<AssetItem>('/admin/assets', { method: 'POST', data: form, headers: { 'Content-Type': 'multipart/form-data' } });
    },
    /** PUT /api/admin/assets/{id} 编辑素材（改分类/名称） */
    updateAsset: (id: number | string, data: UpdateAssetRequest) => request<void>(`/admin/assets/${id}`, { method: 'PUT', data }),
    /** DELETE /api/admin/assets/{id} 删除（门店不可见，历史作品不受影响） */
    deleteAsset: (id: number | string) => request<void>(`/admin/assets/${id}`, { method: 'DELETE' }),
    /** PUT /api/admin/assets/{id}/review 推优审核：通过可顺带改分类（scope 升 BRAND） */
    reviewAsset: (id: number | string, data: AssetReviewRequest) => request<void>(`/admin/assets/${id}/review`, { method: 'PUT', data }),
    /** GET /api/admin/asset-categories 分类列表（素材中心侧栏） */
    getCategories: () => request<AssetCategory[]>('/admin/asset-categories'),
    /** POST /api/admin/asset-categories 新增分类（一期不支持删除，防素材悬空） */
    createCategory: (data: CreateAssetCategoryRequest) => request<AssetCategory>('/admin/asset-categories', { method: 'POST', data }),
    /** PUT /api/admin/asset-categories/{id} 分类改名 */
    renameCategory: (id: number | string, data: RenameAssetCategoryRequest) => request<void>(`/admin/asset-categories/${id}`, { method: 'PUT', data }),
  };
}

export type AssetApi = ReturnType<typeof createAssetApi>;
