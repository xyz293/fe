import Taro from '@tarojs/taro';

export type TrackEvent = 'enter_create' | 'create_generate' | 'generate_result' | 'work_publish' | 'task_finish' | 'quota_insufficient' | 'generate_complete' | 'select_version' | 'click_publish' | 'publish_confirmed';

const TRACK_BASE_URL = process.env.TARO_APP_TRACK_BASE_URL || 'http://localhost:8080/api';

export function track(event: TrackEvent, props: Record<string, unknown> = {}) {
  const token = Taro.getStorageSync('token') as string;
  Taro.request({
    url: `${TRACK_BASE_URL}/track`,
    method: 'POST',
    data: { event, props, timestamp: Date.now() },
    header: token ? { Authorization: `Bearer ${token}` } : {},
  }).catch(() => {
    // 埋点失败静默处理，不影响业务流程。
  });
}
