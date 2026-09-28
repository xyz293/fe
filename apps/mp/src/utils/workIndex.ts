import Taro from '@tarojs/taro';

/**
 * 本地作品索引（readme §4.13：后端仅提供 GET /api/work/{id} 详情，无作品列表接口）。
 * 生成成功时把 workId 记入本地索引，「我的作品」页按索引逐个拉详情组装列表；
 * 拉取 404/无权限的过期 ID 自动剔除。
 */
const WORK_INDEX_KEY = 'xiaoa_work_index';
const MAX_INDEX_SIZE = 50;

export function rememberWorkId(workId: number | string): void {
  const id = String(workId);
  if (!id) return;
  const previous = listWorkIds().filter((item) => item !== id);
  const next = [id, ...previous].slice(0, MAX_INDEX_SIZE);
  Taro.setStorageSync(WORK_INDEX_KEY, JSON.stringify(next));
}

export function listWorkIds(): string[] {
  try {
    const raw = Taro.getStorageSync(WORK_INDEX_KEY);
    const parsed = raw ? (JSON.parse(String(raw)) as unknown) : [];
    return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : [];
  } catch {
    return [];
  }
}

export function forgetWorkId(workId: string): void {
  const next = listWorkIds().filter((item) => item !== workId);
  Taro.setStorageSync(WORK_INDEX_KEY, JSON.stringify(next));
}

/** 分批拉取索引内作品详情（小程序 request 并发有限，每批 8 个），失败的 ID 自动遗忘 */
export async function fetchIndexedWorks<T>(fetchOne: (workId: string) => Promise<T>): Promise<T[]> {
  const ids = listWorkIds();
  const works: T[] = [];
  const missingIds: string[] = [];
  for (let start = 0; start < ids.length; start += 8) {
    const batch = ids.slice(start, start + 8);
    const results = await Promise.all(batch.map((id) => fetchOne(id).catch(() => null)));
    results.forEach((work, index) => (work ? works.push(work) : missingIds.push(batch[index])));
  }
  missingIds.forEach((id) => forgetWorkId(id));
  return works;
}
