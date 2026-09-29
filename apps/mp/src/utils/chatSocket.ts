/**
 * 对话创作 WS 实时通道（对接文档 §4，推荐；聊天页用 WS，恢复会话用 REST GET）：
 * - ws://host/ws/chat?token={token}（WS 无法带 header，token 走 query；无效拒绝握手 401）；
 * - 连接即收 {"type":"connected"}；30s 心跳 ping/pong；
 * - 客户端帧：chat.send / chat.answer / chat.option；服务端帧：stage（节点进度）/ message（reply 与 REST ChatReplyVO 同构）/ done / error；
 * - 同一连接同一时刻仅一次进行中的编排（页面用 thinking 态做单飞闸，重复发送后端回 error 帧）；
 * - WS 不可用（连接失败/关闭/发送异常）时页面自动回退 REST，本模块不自动重连（页面 onShow 时重新 connect）。
 */
import Taro from '@tarojs/taro';
import type { ChatReply } from '@xiaoa/share/types';

const API_BASE_URL = process.env.TARO_APP_API_BASE_URL || 'http://localhost:8080/api';
const HEARTBEAT_INTERVAL = 30000;

export type ChatServerFrame =
  | { type: 'connected' }
  | { type: 'pong' }
  | { type: 'stage'; sessionId?: number; node?: string; label?: string }
  | { type: 'message'; sessionId?: number; reply: ChatReply }
  | { type: 'done'; sessionId?: number }
  | { type: 'error'; sessionId?: number; code?: number; message?: string };

export interface ChatSocketHandlers {
  onOpen?: () => void;
  onClose?: () => void;
  /** 节点进度（label 已中文；hold* 节点为等待用户操作） */
  onStage?: (label: string, node?: string) => void;
  onMessage?: (reply: ChatReply) => void;
  onDone?: () => void;
  /** 帧 error（code 语义同 REST 错误码：1002 无挂起 / 1003 选项已失效 / 3001 额度 / 4001 合规） */
  onError?: (code?: number, message?: string) => void;
}

export interface ChatSocketHandle {
  send: (frame: Record<string, unknown>) => boolean;
  close: () => void;
  isOpen: () => boolean;
}

/** http(s)://host/api → ws(s)://host（WS 端点挂在服务根路径，对接文档 §4.1） */
function resolveWsUrl(): string {
  const token = String(Taro.getStorageSync('token') || '');
  const base = API_BASE_URL.replace(/^http/i, 'ws').replace(/\/api\/?$/, '');
  return `${base}/ws/chat${token ? `?token=${encodeURIComponent(token)}` : ''}`;
}

export function connectChatSocket(handlers: ChatSocketHandlers): ChatSocketHandle {
  let closed = false;
  let open = false;
  let heartbeat: ReturnType<typeof setInterval> | null = null;
  let taskRef: Taro.SocketTask | null = null;

  const teardown = () => {
    if (closed) return;
    closed = true;
    open = false;
    if (heartbeat) clearInterval(heartbeat);
    handlers.onClose?.();
  };

  // Taro 3 的 connectSocket 返回 Promise<SocketTask>；连接失败静默（页面 isOpen() 恒为 false 自动走 REST）
  Taro.connectSocket({ url: resolveWsUrl() })
    .then((task) => {
      if (closed) {
        try { task.close({}); } catch { /* 已关闭忽略 */ }
        return;
      }
      taskRef = task;
      task.onOpen(() => {
        if (closed) return;
        open = true;
        heartbeat = setInterval(() => {
          try {
            task.send({ data: JSON.stringify({ type: 'ping' }) });
          } catch {
            /* 心跳失败等 onClose 兜底 */
          }
        }, HEARTBEAT_INTERVAL);
        handlers.onOpen?.();
      });
      task.onMessage((res) => {
        if (closed) return;
        let frame: ChatServerFrame;
        try {
          frame = JSON.parse(String(res.data)) as ChatServerFrame;
        } catch {
          return;
        }
        switch (frame.type) {
          case 'stage':
            if (frame.label) handlers.onStage?.(frame.label, frame.node);
            break;
          case 'message':
            if (frame.reply) handlers.onMessage?.(frame.reply);
            break;
          case 'done':
            handlers.onDone?.();
            break;
          case 'error':
            handlers.onError?.(frame.code, frame.message);
            break;
          default:
            // connected / pong 无需处理
            break;
        }
      });
      task.onClose(teardown);
      task.onError(teardown);
    })
    .catch(() => undefined);

  return {
    send: (frame) => {
      const task = taskRef;
      if (!open || closed || !task) return false;
      try {
        task.send({ data: JSON.stringify(frame) });
        return true;
      } catch {
        return false;
      }
    },
    close: () => {
      teardown();
      if (taskRef) {
        try { taskRef.close({}); } catch { /* 已关闭忽略 */ }
      }
    },
    isOpen: () => open && !closed,
  };
}
