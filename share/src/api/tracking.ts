import type { RequestAdapter } from './types';

export type TrackEvent = 'enter_create' | 'create_generate' | 'generate_result' | 'work_publish' | 'task_finish' | 'quota_insufficient' | 'generate_complete' | 'select_version' | 'click_publish' | 'publish_confirmed';

export function createTracker(adapter: RequestAdapter, endpoint = '/track') {
  return (event: TrackEvent, props: Record<string, unknown> = {}) => {
    void adapter.request(endpoint, {
      method: 'POST',
      data: { event, props: { industry: 'jewelry-marriage', ...props }, timestamp: Date.now() },
    }).catch(() => {
      // 婚恋珠宝埋点失败静默处理，不影响门店创作流程。
    });
  };
}
