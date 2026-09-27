/**
 * 语音 ASR 封装（微信同声传译官方插件，一期最省方案）。
 *
 * 用途（文档"语音 ASR"）：
 * 1. 对话模式按住说话：语音 → 文字 → 作为一条用户消息发送（POST /api/chat/sessions/{id}/messages，后端零改动，转换在前端完成）；
 * 2. 专业模式描述输入框听写：语音 → 文字填入 textarea（用户可改）。
 *
 * 行为约定：
 * - onRecognize 实时上屏（边说边显示）；onStop 是松手后的最终文本；
 * - 插件仅在微信小程序环境可用；H5 或插件未注入时 isAsrSupported() 为 false，调用方隐藏语音按钮；
 * - 用户拒绝麦克风权限时 onError 提示，由调用方降级为纯键盘输入。
 */
import Taro from '@tarojs/taro';

/** 微信同声传译插件回调结构（官方文档字段） */
interface RecordManager {
  start: (options?: { duration?: number; lang?: string }) => void;
  stop: () => void;
  /** 实时识别回调（边说边返回部分文本） */
  onRecognize: (callback: (res: { result?: string }) => void) => void;
  /** 正常结束回调（松手后的最终文本） */
  onStop: (callback: (res: { result?: string }) => void) => void;
  onError: (callback: (res: { msg?: string }) => void) => void;
}

export interface AsrHandlers {
  /** 实时识别（边说边上屏） */
  onRecognize?: (text: string) => void;
  /** 松手后的最终识别文本（空文本视为"没听清"） */
  onFinal?: (text: string) => void;
  /** 识别出错（权限拒绝 / 插件异常等），message 已转成用户可读文案 */
  onError?: (message: string) => void;
}

/** undefined=未初始化，null=当前环境不可用 */
let manager: RecordManager | null | undefined;
let activeHandlers: AsrHandlers | null = null;

function translateError(msg?: string): string {
  const text = msg || '';
  if (/auth|authoriz|denied|permission/i.test(text)) return '未授权麦克风，可在设置中开启后重试';
  if (/busy|start/i.test(text)) return '录音未就绪，请稍后再试';
  return '没听清，再试一次';
}

function getManager(): RecordManager | null {
  if (manager !== undefined) return manager;
  try {
    // H5 / 非微信环境没有全局 requirePlugin，走 globalThis 探测避免 ReferenceError
    const pluginLoader = (globalThis as { requirePlugin?: (name: string) => unknown }).requirePlugin;
    if (process.env.TARO_ENV !== 'weapp' || typeof pluginLoader !== 'function') {
      manager = null;
      return manager;
    }
    const plugin = pluginLoader('WechatSI') as { getRecordRecognitionManager?: () => RecordManager } | undefined;
    manager = plugin?.getRecordRecognitionManager?.() ?? null;
    if (manager) {
      // 回调全局只绑定一次，转发到当次会话的 handlers
      manager.onRecognize((res) => {
        if (res.result && activeHandlers?.onRecognize) activeHandlers.onRecognize(res.result);
      });
      manager.onStop((res) => {
        const handlers = activeHandlers;
        activeHandlers = null;
        const text = (res.result || '').trim();
        if (handlers?.onFinal) handlers.onFinal(text);
      });
      manager.onError((res) => {
        const handlers = activeHandlers;
        activeHandlers = null;
        if (handlers?.onError) handlers.onError(translateError(res.msg));
      });
    }
  } catch {
    manager = null;
  }
  return manager;
}

/** 当前环境是否支持语音识别（不支持时调用方隐藏语音按钮，只留键盘） */
export function isAsrSupported(): boolean {
  return getManager() !== null;
}

/** 按住说话：开始录音（最长 60 秒），首次调用会触发麦克风授权弹窗 */
export function startAsr(handlers: AsrHandlers): void {
  const recordManager = getManager();
  if (!recordManager) {
    handlers.onError?.('当前环境不支持语音输入');
    return;
  }
  activeHandlers = handlers;
  try {
    recordManager.start({ duration: 60000, lang: 'zh_CN' });
  } catch {
    activeHandlers = null;
    handlers.onError?.('录音启动失败，请重试');
  }
}

/** 松手：停止录音，结果经 onFinal 返回（识别中途松手取已识别部分） */
export function stopAsr(): void {
  if (!manager) return;
  try {
    manager.stop();
  } catch {
    activeHandlers = null;
  }
}
