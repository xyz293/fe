import { Button, Input, ScrollView, Text, Textarea, View } from '@tarojs/components';
import Taro, { useDidShow, useLoad } from '@tarojs/taro';
import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  AiWork,
  ChatAnswerItem,
  ChatCopyVariant,
  ChatOptionCard,
  ChatQuestion,
  ChatReply,
  ChatSession,
} from '@xiaoa/share/types';
import { sharedApi } from '../../utils/sharedAdapter';
import { isAsrSupported, startAsr, stopAsr } from '../../utils/asr';
import { connectChatSocket } from '../../utils/chatSocket';
import type { ChatSocketHandle } from '../../utils/chatSocket';
import { GeneratingCard } from '../../components/chat-flow/GeneratingCard';
import { OptionCard } from '../../components/chat-flow/OptionCard';
import { QuestionCard } from '../../components/chat-flow/QuestionCard';
import { WorkCard } from '../../components/chat-flow/WorkCard';

/** 会话与关联上下文的本地持久化（重进时恢复历史） */
const CHAT_SESSION_KEY = 'xiaoa_chat_session_id';
const CHAT_TASK_KEY = 'xiaoa_chat_task_id';
/** 「去配图」带给专业模式的预填文案 */
const CHAT_DESC_KEY = 'xiaoa_chat_link_desc';

/** 创作场景（POST /api/chat/sessions 的 scene 必填 ≤32 字符，readme §2.5） */
const SCENES = ['朋友圈', '小红书', '视频号'];

/** 无会话时的欢迎语（引导选择创作场景） */
const WELCOME: FlowMessage = {
  id: 'welcome',
  role: 'AI',
  content: '选择一个创作场景开始吧～说人话就行，我会追问补齐要素，一次给你成套内容',
};

/** 首次出稿的默认引导语（reply.question 缺失时兜底；提示词对员工全隐藏） */
const GENERATE_LEAD = '给你几版文案，点卡片可复制、微调或去配图 👇';

/** 出稿扣费失败（3001）时的固定提示（员工额度文档 §1.1） */
const QUOTA_TIP = '额度不足，请联系店长划拨';

/** 选项卡超时兜底刷新延迟：前端 30s 到期后，后端约 60s 兜底出稿，65s 拉会话取结果（对接文档 §5.2） */
const OPTION_FALLBACK_REFRESH_DELAY = 65000;

let messageSeq = 0;
const nextMessageId = () => `m${Date.now().toString(36)}-${(messageSeq += 1)}`;
const aiText = (content: string): FlowMessage => ({ id: nextMessageId(), role: 'AI', content });

// ===================== 消息模型（消息流 + 结构化卡片） =====================

/** 结构化卡片（按 ChatReply.action 解析；card 与出稿 copies 字段按消息二选一渲染） */
type FlowCard =
  | { kind: 'QUESTIONNAIRE'; questions: ChatQuestion[]; locked: boolean; initialAnswers?: ChatAnswerItem[] }
  | { kind: 'OPTION'; option: ChatOptionCard; locked: boolean; expired: boolean; chosen?: 'A' | 'B' | 'C' | 'D'; initialSeconds?: number }
  | { kind: 'GENERATING'; workId: string }
  | { kind: 'WORK'; work: AiWork; published: boolean };

/** 对话页统一消息：USER 原话 / AI 文本气泡（content）+ 出稿版本卡（copies）+ 挂起/作品卡（card） */
interface FlowMessage {
  id: string;
  role: 'USER' | 'AI';
  content?: string;
  copies?: ChatCopyVariant[];
  revisedFrom?: number;
  createdAt?: string;
  card?: FlowCard;
}

/** 选项卡历史时效：剩余秒数（对接文档 §7.5，恢复时超 30s 置灰等兜底结果） */
function optionRemainingSeconds(createdAt: string | undefined, deadlineSeconds: number): number {
  if (!createdAt) return 0;
  const createdTime = new Date(createdAt).getTime();
  if (!Number.isFinite(createdTime)) return 0;
  const elapsed = Math.max(0, (Date.now() - createdTime) / 1000);
  return Math.round((deadlineSeconds > 0 ? deadlineSeconds : 30) - elapsed);
}

/**
 * 解析历史 AI 消息 content（JSON 字符串）为消息流，按 action 重建挂起 UI（对接文档 §7.5）：
 * - ASK / GENERATE（含三段式 question 与 versions、revisedFrom）；
 * - QUESTIONNAIRE / OPTION_CARD / PENDING_MEDIA：挂起结构原样进卡片（默认锁定，是否仍可交互由 loadSession 二次判定）；
 * - 解析失败（LLM 兜底追问为纯文本）按原文渲染。
 */
function parseAiContent(raw: string, createdAt?: string): FlowMessage[] {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const action = parsed.action as string | undefined;
    const question = parsed.question as string | undefined;
    const versions = parsed.versions as string[] | undefined;
    const revisedFrom = parsed.revisedFrom as number | undefined;
    if (action === 'ASK' && question) return [aiText(question)];
    if (action === 'GENERATE' && versions?.length) {
      return [{
        id: nextMessageId(),
        role: 'AI',
        content: question || (revisedFrom ? `已按你的要求微调第 ${revisedFrom} 版：` : GENERATE_LEAD),
        copies: versions.map((content, index) => ({
          // 微调消息的单版卡片归属被改写的那个版本（revisedFrom）
          index: revisedFrom ?? index + 1,
          content,
          refined: Boolean(revisedFrom),
        })),
        revisedFrom,
      }];
    }
    if (action === 'QUESTIONNAIRE' && Array.isArray(parsed.questionnaire)) {
      return [{
        id: nextMessageId(),
        role: 'AI',
        content: question || '',
        card: { kind: 'QUESTIONNAIRE', questions: parsed.questionnaire as ChatQuestion[], locked: true },
      }];
    }
    if (action === 'OPTION_CARD' && parsed.optionCard) {
      const option = parsed.optionCard as ChatOptionCard;
      const remaining = optionRemainingSeconds(createdAt, option.deadlineSeconds);
      const stillPending = remaining > 3;
      return [{
        id: nextMessageId(),
        role: 'AI',
        content: question || '',
        card: {
          kind: 'OPTION',
          option,
          locked: !stillPending,
          expired: !stillPending,
          initialSeconds: stillPending ? remaining : undefined,
        },
      }];
    }
    if (action === 'PENDING_MEDIA' && parsed.workId) {
      return [{
        id: nextMessageId(),
        role: 'AI',
        content: question || '图/视频生成中…',
        card: { kind: 'GENERATING', workId: String(parsed.workId) },
      }];
    }
  } catch {
    // 非 JSON 内容（兜底追问等），按原文渲染
  }
  return [aiText(raw)];
}

export default function ChatPage() {
  const [messages, setMessages] = useState<FlowMessage[]>(() => [WELCOME]);
  const [input, setInput] = useState('');
  const [session, setSession] = useState<ChatSession | null>(null);
  const [taskId] = useState(() => (Taro.getStorageSync(CHAT_TASK_KEY) as string) || '');
  const [thinking, setThinking] = useState(false);
  const [recognizing, setRecognizing] = useState(false);
  const [voiceSupported] = useState(() => isAsrSupported());

  /** 点击文案卡片放大预览（可一键全选复制） */
  const [previewCopy, setPreviewCopy] = useState<ChatCopyVariant | null>(null);
  /** 微调：目标版本 + 底部弹输入框（"想怎么改？"） */
  const [refineTarget, setRefineTarget] = useState<ChatCopyVariant | null>(null);
  const [refineDraft, setRefineDraft] = useState('');
  /** 历史会话列表弹层（GET /api/chat/sessions 本人最近 20 条） */
  const [historySheet, setHistorySheet] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  /** 正在提交挂起卡（问卷/选项）的消息 id，防重复提交（对接文档 §7.6：提交后立即置灰） */
  const [submittingCardId, setSubmittingCardId] = useState('');
  /** 正在提交发布记录的作品卡消息 id */
  const [publishingId, setPublishingId] = useState('');

  /** WS 实时通道（对接文档 §4：stage 进度 + 帧级实时；不可用时自动回退 REST） */
  const socketRef = useRef<ChatSocketHandle | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [wsStage, setWsStage] = useState('');

  const sessionRef = useRef<ChatSession | null>(null);
  const restoredRef = useRef('');
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const applySession = useCallback((next: ChatSession | null) => {
    sessionRef.current = next;
    setSession(next);
  }, []);

  useLoad((params) => {
    if (params.taskId) {
      Taro.setStorageSync(CHAT_TASK_KEY, params.taskId);
    }
  });

  /**
   * 分发器：REST ChatReply 与 WS message 帧共用（reply 结构完全同构，对接文档 §4.2）。
   * 先锁定上一张未提交的挂起卡（同时至多一张待交互卡），再按 action 追加消息。
   */
  const dispatchReply = useCallback((reply: ChatReply) => {
    // 其他会话的帧不进当前消息流
    if (reply.sessionId && sessionRef.current && String(reply.sessionId) !== String(sessionRef.current.id)) return;
    setWsStage('');
    setThinking(false);
    setMessages((current) => {
      const locked = current.map((message) => (
        message.card && (message.card.kind === 'QUESTIONNAIRE' || message.card.kind === 'OPTION') && !message.card.locked
          ? { ...message, card: { ...message.card, locked: true } }
          : message
      ));
      const appended: FlowMessage[] = [];
      switch (reply.action) {
        case 'GENERATE': {
          const revisedFrom = typeof reply.revisedFrom === 'number' ? reply.revisedFrom : undefined;
          if (reply.versions?.length) {
            appended.push({
              id: nextMessageId(),
              role: 'AI',
              // GENERATE 的 question 为三段式事实说明（含 \n，✅/🎨/⚠️ 三段，对接文档 §3/§7.3）
              content: reply.question || (revisedFrom ? `已按你的要求微调第 ${revisedFrom} 版：` : GENERATE_LEAD),
              copies: reply.versions.map((content, index) => ({
                index: revisedFrom ?? index + 1,
                content,
                refined: Boolean(revisedFrom),
              })),
              revisedFrom,
            });
          } else {
            appended.push(aiText(reply.question || '出稿为空，请稍后重试'));
          }
          break;
        }
        case 'QUESTIONNAIRE':
          if (reply.question) appended.push(aiText(reply.question));
          if (reply.questionnaire?.length) {
            appended.push({ id: nextMessageId(), role: 'AI', card: { kind: 'QUESTIONNAIRE', questions: reply.questionnaire, locked: false } });
          }
          break;
        case 'OPTION_CARD':
          if (reply.question) appended.push(aiText(reply.question));
          if (reply.optionCard?.options?.length) {
            appended.push({ id: nextMessageId(), role: 'AI', card: { kind: 'OPTION', option: reply.optionCard, locked: false, expired: false } });
          }
          break;
        case 'PENDING_MEDIA':
          appended.push(aiText(reply.question || '图/视频生成中，完成后会通知你，可以先去忙别的～'));
          if (reply.workId) {
            appended.push({ id: nextMessageId(), role: 'AI', card: { kind: 'GENERATING', workId: String(reply.workId) } });
          }
          break;
        default:
          // ASK：LLM 异常时后端兜底追问「能再具体一点吗?」，正常渲染追问气泡
          appended.push(aiText(reply.question || '能再具体一点吗？'));
      }
      return appended.length ? [...locked, ...appended] : locked;
    });
  }, []);

  /** 拉取会话全量历史并按 action 重建挂起 UI；会话不存在/已关闭（1001/2003）时清本地引导新建 */
  const loadSession = useCallback((sessionId: string) => {
    setThinking(true);
    sharedApi.getChatSession(sessionId)
      .then((detail) => {
        applySession(detail.session);
        const restored: FlowMessage[] = [];
        (detail.messages || []).forEach((item) => {
          if (item.role === 'USER') restored.push({ id: nextMessageId(), role: 'USER', content: item.content, createdAt: item.createdAt });
          else parseAiContent(item.content, item.createdAt).forEach((message) => restored.push({ ...message, createdAt: item.createdAt }));
        });
        // 挂起重建（对接文档 §7.5）：问卷无超时——最后一张问卷卡在 ACTIVE 会话里恢复为可交互；
        // 选项卡时效已在 parseAiContent 按 createdAt 折算（超 30s 置灰等兜底结果）
        if (detail.session.status === 'ACTIVE') {
          for (let i = restored.length - 1; i >= 0; i -= 1) {
            const card = restored[i].card;
            if (!card) continue;
            if (card.kind === 'QUESTIONNAIRE' && card.locked) {
              restored[i] = { ...restored[i], card: { ...card, locked: false } };
            }
            break;
          }
        }
        setMessages(restored.length ? restored : [WELCOME]);
      })
      .catch((requestError) => {
        const code = (requestError as Error & { code?: number })?.code;
        Taro.showToast({ title: requestError instanceof Error ? requestError.message : '历史加载失败', icon: 'none' });
        if (code === 1001 || code === 2003) {
          Taro.removeStorageSync(CHAT_SESSION_KEY);
          restoredRef.current = '';
          applySession(null);
          setMessages([WELCOME]);
        }
      })
      .finally(() => setThinking(false));
  }, [applySession]);

  /** 消息页重进恢复：按本地会话 ID 拉全量历史（tabBar 页每次切回触发）；顺带重连已断开的 WS */
  useDidShow(() => {
    const saved = String(Taro.getStorageSync(CHAT_SESSION_KEY) || '');
    if (saved && restoredRef.current !== saved) {
      restoredRef.current = saved;
      loadSession(saved);
    }
    if (socketRef.current && !socketRef.current.isOpen()) {
      socketRef.current.close();
      socketRef.current = connectChatSocket(makeSocketHandlers());
    }
  });

  // ===== WS 实时通道（对接文档 §4）：onMessage 与 REST 响应走同一 dispatchReply =====
  const makeSocketHandlers = useCallback(() => ({
    onOpen: () => setWsConnected(true),
    onClose: () => {
      setWsConnected(false);
      // 连接断开时结束挂起的 thinking（编排中断，下次操作走 REST）
      setThinking(false);
      setWsStage('');
    },
    onStage: (label: string) => setWsStage(label),
    onMessage: (reply: ChatReply) => dispatchReply(reply),
    onDone: () => {
      setThinking(false);
      setWsStage('');
    },
    onError: (code?: number, message?: string) => {
      setThinking(false);
      setWsStage('');
      const text = message || '操作失败，请重试';
      if (code === 1002 || code === 1003) {
        // 无挂起/选项已失效：刷新会话拉取服务端权威状态（对接文档 §6）
        Taro.showToast({ title: text, icon: 'none' });
        const sid = sessionRef.current?.id;
        if (sid) loadSession(String(sid));
      } else if (code === 3001) {
        Taro.showToast({ title: QUOTA_TIP, icon: 'none' });
      } else {
        Taro.showToast({ title: text, icon: 'none' });
      }
    },
  }), [dispatchReply, loadSession]);

  useEffect(() => {
    socketRef.current = connectChatSocket(makeSocketHandlers());
    return () => {
      socketRef.current?.close();
      socketRef.current = null;
      if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
    };
    // makeSocketHandlers 依赖稳定，仅需挂载时建立连接
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** WS 发送：连接可用才走 WS（置 thinking 等帧回），否则返回 false 由调用方回退 REST */
  const wsSend = useCallback((frame: Record<string, unknown>): boolean => {
    const socket = socketRef.current;
    if (!socket || !socket.isOpen()) return false;
    if (!socket.send(frame)) return false;
    setThinking(true);
    return true;
  }, []);

  const appendMessage = useCallback((message: FlowMessage) => setMessages((current) => [...current, message]), []);
  const removeMessage = (id: string) => setMessages((current) => current.filter((item) => item.id !== id));

  /** REST 发送失败统一处理：3001/4001 本轮不落库（撤回气泡+回填输入框可重发）；1001 会话关闭引导新建 */
  const handleSendError = (text: string, userMessageId: string) => (requestError: unknown) => {
    const code = (requestError as Error & { code?: number })?.code;
    const message = requestError instanceof Error ? requestError.message : '发送失败，请重试';
    setThinking(false);
    removeMessage(userMessageId);
    setInput(text);
    if (code === 3001 || message.includes('额度')) {
      Taro.showToast({ title: QUOTA_TIP, icon: 'none' });
    } else if (code === 1001) {
      Taro.showToast({ title: message || '会话已关闭，请新建会话', icon: 'none' });
      resetToWelcome();
    } else {
      Taro.showToast({ title: message, icon: 'none' });
    }
  };

  /**
   * 发送一句话（POST /api/chat/sessions/{id}/messages，语音识别的文字同样走这里）：
   * 返回按 action 分派渲染（ASK/GENERATE/QUESTIONNAIRE/OPTION_CARD/PENDING_MEDIA，对接文档 §3）。
   * WS 已连接时优先走 chat.send 帧（带节点进度），失败/未连接回退 REST。
   */
  const sendMessage = (rawText: string) => {
    const text = rawText.trim();
    if (!text || thinking) return;
    if (!session) { Taro.showToast({ title: '先选择一个创作场景', icon: 'none' }); return; }
    if (session.status === 'CLOSED') {
      Taro.showToast({ title: '会话已关闭，请新建会话', icon: 'none' });
      resetToWelcome();
      return;
    }
    const userMessage: FlowMessage = { id: nextMessageId(), role: 'USER', content: text };
    appendMessage(userMessage);
    if (wsSend({ type: 'chat.send', sessionId: session.id, text })) {
      setInput('');
      return;
    }
    setThinking(true);
    sharedApi.sendChatMessage(session.id, text)
      .then((reply) => {
        setInput('');
        dispatchReply(reply);
      })
      .catch(handleSendError(text, userMessage.id));
  };

  /** 问卷作答（POST /api/chat/sessions/{id}/answer，对接文档 §2.3）：
   *  提交即锁卡置灰（重复提交命中 1002）；1002 失败刷新会话，其余失败解锁可重试；WS 优先。 */
  const submitQuestionnaire = useCallback((messageId: string, answers: ChatAnswerItem[]) => {
    const current = sessionRef.current;
    if (!current) return;
    setSubmittingCardId(messageId);
    setMessages((messages2) => messages2.map((message) => (
      message.id === messageId && message.card?.kind === 'QUESTIONNAIRE'
        ? { ...message, card: { ...message.card, locked: true, initialAnswers: answers } }
        : message
    )));
    if (wsSend({ type: 'chat.answer', sessionId: current.id, answers })) {
      setSubmittingCardId('');
      return;
    }
    sharedApi.submitChatAnswer(current.id, { answers })
      .then((reply) => dispatchReply(reply))
      .catch((requestError) => {
        const code = (requestError as Error & { code?: number })?.code;
        const message = requestError instanceof Error ? requestError.message : '提交失败，请重试';
        if (code === 1002) {
          // 无挂起问卷（重复提交/会话过期）：提示并刷新会话（对接文档 §6）
          Taro.showToast({ title: message, icon: 'none' });
          loadSession(String(current.id));
        } else {
          // 解锁允许重试
          setMessages((messages2) => messages2.map((item) => (
            item.id === messageId && item.card?.kind === 'QUESTIONNAIRE'
              ? { ...item, card: { ...item.card, locked: false } }
              : item
          )));
          Taro.showToast({ title: message, icon: 'none' });
        }
      })
      .finally(() => setSubmittingCardId(''));
  }, [dispatchReply, loadSession, wsSend]);

  /** 选项卡选择（POST /api/chat/sessions/{id}/option，对接文档 §2.4）：
   *  点选立即锁卡回显；1003（已被兜底放行）→ 刷新会话拉已生成结果。 */
  const submitOption = useCallback((messageId: string, key: 'A' | 'B' | 'C' | 'D') => {
    const current = sessionRef.current;
    if (!current) return;
    setSubmittingCardId(messageId);
    setMessages((messages2) => messages2.map((message) => (
      message.id === messageId && message.card?.kind === 'OPTION'
        ? { ...message, card: { ...message.card, locked: true, chosen: key } }
        : message
    )));
    if (wsSend({ type: 'chat.option', sessionId: current.id, key })) {
      setSubmittingCardId('');
      return;
    }
    sharedApi.submitChatOption(current.id, key)
      .then((reply) => dispatchReply(reply))
      .catch((requestError) => {
        const code = (requestError as Error & { code?: number })?.code;
        const message = requestError instanceof Error ? requestError.message : '提交失败，请重试';
        if (code === 1003) {
          Taro.showToast({ title: message || '选项已失效，正在刷新结果', icon: 'none' });
          loadSession(String(current.id));
        } else {
          setMessages((messages2) => messages2.map((item) => (
            item.id === messageId && item.card?.kind === 'OPTION'
              ? { ...item, card: { ...item.card, locked: false, chosen: undefined } }
              : item
          )));
          Taro.showToast({ title: message, icon: 'none' });
        }
      })
      .finally(() => setSubmittingCardId(''));
  }, [dispatchReply, loadSession, wsSend]);

  /** 选项卡倒计时归零（对接文档 §5.2）：禁用不发请求，安排 65s 后刷新会话拉兜底出稿结果 */
  const handleOptionExpire = useCallback((messageId: string) => {
    setMessages((current) => current.map((message) => (
      message.id === messageId && message.card?.kind === 'OPTION'
        ? { ...message, card: { ...message.card, locked: true, expired: true } }
        : message
    )));
    if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
    fallbackTimerRef.current = setTimeout(() => {
      fallbackTimerRef.current = null;
      const sid = sessionRef.current?.id;
      if (sid) loadSession(String(sid));
    }, OPTION_FALLBACK_REFRESH_DELAY);
  }, [loadSession]);

  /** 媒体作品生成完成：GENERATING 占位卡原地替换为作品卡（对接文档 §5.3） */
  const handleWorkDone = useCallback((messageId: string, work: AiWork) => {
    setMessages((current) => current.map((message) => (
      message.id === messageId && message.card?.kind === 'GENERATING'
        ? { ...message, card: { kind: 'WORK', work, published: false } }
        : message
    )));
  }, []);

  /** 媒体作品生成失败（额度已自动退回）：占位卡替换为错误气泡 */
  const handleWorkError = useCallback((messageId: string, message: string) => {
    setMessages((current) => current.map((item) => (
      item.id === messageId && item.card?.kind === 'GENERATING'
        ? { ...item, card: undefined, content: `⚠️ ${message}` }
        : item
    )));
  }, []);

  /** 我已发布：提交发布记录（POST /api/publish-record），关联任务时自动核销 */
  const publishWork = useCallback((messageId: string, workId: string) => {
    if (!workId) { Taro.showToast({ title: '缺少作品 ID', icon: 'none' }); return; }
    setPublishingId(messageId);
    sharedApi.publishRecord({ workId, ...(taskId ? { taskId } : {}), platform: sessionRef.current?.scene || '朋友圈' })
      .then(() => {
        setMessages((current) => current.map((message) => (
          message.id === messageId && message.card?.kind === 'WORK'
            ? { ...message, card: { ...message.card, published: true } }
            : message
        )));
        Taro.showToast({ title: taskId ? '任务已完成 ✓' : '发布已记录 ✓', icon: 'success' });
      })
      .catch((requestError) => Taro.showToast({ title: requestError instanceof Error ? requestError.message : '发布记录提交失败', icon: 'none' }))
      .finally(() => setPublishingId(''));
  }, [taskId]);

  const copyText = (text: string, tip = '文案已复制') => {
    Taro.setClipboardData({ data: text }).then(() => Taro.showToast({ title: tip, icon: 'success' }));
  };

  /** 去配图：带会话跳专业模式（desc 预填 + chatSessionId 透传，生成后回填 caption，readme §2.6）；关联任务时透传 taskId，发布核销用 */
  const goProWithDesc = (variant: ChatCopyVariant) => {
    Taro.setStorageSync(CHAT_DESC_KEY, variant.content);
    if (session) Taro.setStorageSync(CHAT_SESSION_KEY, String(session.id));
    Taro.navigateTo({ url: `/pages/pro/index?fromChat=1${taskId ? `&taskId=${taskId}` : ''}` });
  };

  /** 按住说话：onRecognize 实时上屏，松手后最终文本填输入框（用户可改再发送） */
  const onVoiceTouchStart = () => {
    if (!voiceSupported || thinking) return;
    setRecognizing(true);
    startAsr({
      onRecognize: (text) => setInput(text),
      onFinal: (text) => {
        setRecognizing(false);
        if (text) setInput(text);
        else Taro.showToast({ title: '没听清，再试一次', icon: 'none' });
      },
      onError: (message) => {
        setRecognizing(false);
        Taro.showToast({ title: message, icon: 'none' });
      },
    });
  };
  const onVoiceTouchEnd = () => {
    if (recognizing) stopAsr();
  };

  /** 选择场景创建会话（每轮追问免费，首出 3 版文案扣 1 点，readme §2.2） */
  const createSession = (scene: string) => {
    if (thinking) return;
    setThinking(true);
    sharedApi.createChatSession({ scene })
      .then((created) => {
        applySession(created);
        Taro.setStorageSync(CHAT_SESSION_KEY, String(created.id));
        restoredRef.current = String(created.id);
        setMessages([aiText(`「${scene}」场景已就绪～用一句话告诉我：想推什么、给谁看？`)]);
      })
      .catch((requestError) => Taro.showToast({ title: requestError instanceof Error ? requestError.message : '会话创建失败', icon: 'none' }))
      .finally(() => setThinking(false));
  };

  /** 回到欢迎态（会话已关闭 / 主动新开），保留旧记录在「历史」里 */
  const resetToWelcome = () => {
    Taro.removeStorageSync(CHAT_SESSION_KEY);
    restoredRef.current = '';
    applySession(null);
    setMessages([WELCOME]);
  };

  /** 提交微调：POST /api/chat/sessions/{id}/revise（扣 1 点），该版卡片就地刷新并打「已修改」角标 */
  const submitRefine = () => {
    const draft = refineDraft.trim();
    const target = refineTarget;
    if (!draft || !target) { Taro.showToast({ title: '告诉我你想怎么改', icon: 'none' }); return; }
    if (!session) { setRefineTarget(null); return; }
    setRefineTarget(null);
    setRefineDraft('');
    setThinking(true);
    sharedApi.reviseChat(session.id, { versionNo: target.index, instruction: draft })
      .then((reply) => {
        const newContent = reply.versions?.[0];
        if (!newContent) throw new Error('微调结果为空，请稍后重试');
        setMessages((current) => {
          const next = [...current];
          for (let i = next.length - 1; i >= 0; i -= 1) {
            if (next[i].copies?.some((copy) => copy.index === target.index)) {
              next[i] = {
                ...next[i],
                copies: next[i].copies!.map((copy) => (copy.index === target.index ? { ...copy, content: newContent, refined: true } : copy)),
              };
              break;
            }
          }
          return next;
        });
        appendMessage({
          id: nextMessageId(),
          role: 'AI',
          content: reply.question || `已按「${draft.slice(0, 20)}${draft.length > 20 ? '…' : ''}」改写第 ${target.index} 版：`,
          copies: [{ index: target.index, content: newContent, refined: true }],
          revisedFrom: target.index,
        });
      })
      .catch((requestError) => {
        const code = (requestError as Error & { code?: number })?.code;
        const message = requestError instanceof Error ? requestError.message : '微调失败，请稍后重试';
        Taro.showToast({ title: code === 3001 ? QUOTA_TIP : message, icon: 'none' });
        // 指令退回弹窗，方便修改后重试
        setRefineTarget(target);
        setRefineDraft(draft);
      })
      .finally(() => setThinking(false));
  };

  /** 打开历史会话列表（本人最近 20 条，按活跃时间倒序） */
  const openHistory = () => {
    setHistorySheet(true);
    setSessionsLoading(true);
    sharedApi.getChatSessions()
      .then(setSessions)
      .catch(() => Taro.showToast({ title: '会话列表加载失败', icon: 'none' }))
      .finally(() => setSessionsLoading(false));
  };

  /** 切换到某个历史会话（CLOSED 会话只读展示，不可再发消息） */
  const switchSession = (item: ChatSession) => {
    if (item.status === 'CLOSED') { Taro.showToast({ title: '该会话已关闭，请新建会话', icon: 'none' }); return; }
    setHistorySheet(false);
    if (session && String(item.id) === String(session.id)) return;
    Taro.setStorageSync(CHAT_SESSION_KEY, String(item.id));
    loadSession(String(item.id));
  };

  return (
    <View className="page" style={{ paddingBottom: '140px' }}>
      <View className="chat-header">
        <Text className="back-button" onClick={() => Taro.navigateBack()}>‹</Text>
        <Text className="chat-title">AI 创作对话</Text>
        <Text className="chat-scene">{session ? session.title : taskId ? '关联任务 · 先选场景' : '先选场景'}</Text>
      </View>
      {/* 创作页顶部模式切换 + 会话工具条（历史 / 新对话） */}
      <View className="creation-type-row" style={{ padding: '0 20px', justifyContent: 'space-between' }}>
        <View style={{ display: 'flex', gap: '12px' }}>
          <Text className="pill active">💬 对话模式</Text>
          <Text className="pill" onClick={() => Taro.navigateTo({ url: '/pages/pro/index' })}>🎛 专业模式</Text>
        </View>
        <View style={{ display: 'flex', gap: '10px' }}>
          <Text className="pill" onClick={openHistory}>🕘 历史</Text>
          <Text className="pill" onClick={resetToWelcome}>＋ 新对话</Text>
        </View>
      </View>
      {taskId && <View className="notice-bar"><Text>正在为任务创作文案，出稿后可去任务详情提交发布记录</Text></View>}
      {/* WS 节点进度（对接文档 §4.2 stage 帧；label 已中文，hold* 节点为等待用户操作） */}
      {wsStage ? <View className="notice-bar ws-stage"><Text className="ws-stage-icon">⚙</Text><Text>{wsStage}</Text></View> : null}

      <View style={{ padding: '0 20px' }}>
        {messages.map((message) => (
          <View key={message.id}>
            {/* 文本气泡：GENERATE 三段式说明含 \n（✅/🎨/⚠️），用 Text 保留换行（对接文档 §7.3） */}
            {message.content ? (
              <View className={message.role === 'AI' ? 'bubble bubble-ai' : 'bubble bubble-user'}>
                <Text>{message.content}</Text>
              </View>
            ) : null}
            {message.card?.kind === 'QUESTIONNAIRE' && (
              <QuestionCard
                questions={message.card.questions}
                locked={message.card.locked}
                initialAnswers={message.card.initialAnswers}
                submitting={submittingCardId === message.id}
                onSubmit={(answers) => submitQuestionnaire(message.id, answers)}
              />
            )}
            {message.card?.kind === 'OPTION' && (
              <OptionCard
                options={message.card.option.options}
                deadlineSeconds={message.card.option.deadlineSeconds}
                initialSeconds={message.card.initialSeconds}
                locked={message.card.locked}
                expired={message.card.expired}
                chosenKey={message.card.chosen}
                submitting={submittingCardId === message.id}
                onChoose={(key) => submitOption(message.id, key)}
                onExpire={() => handleOptionExpire(message.id)}
              />
            )}
            {message.card?.kind === 'GENERATING' && (
              <GeneratingCard
                workId={message.card.workId}
                onDone={(work) => handleWorkDone(message.id, work)}
                onError={(reason) => handleWorkError(message.id, reason)}
              />
            )}
            {message.card?.kind === 'WORK' && (
              <WorkCard
                work={message.card.work}
                published={message.card.published}
                publishing={publishingId === message.id}
                onCopyCaption={copyText}
                onPublish={() => {
                  const card = message.card;
                  if (card?.kind === 'WORK') publishWork(message.id, String(card.work.id));
                }}
              />
            )}
            {message.copies?.length ? (
              <ScrollView className="version-scroll" scrollX enhanced showScrollbar={false}>
                {message.copies.map((copy) => (
                  <View className="version-card" key={`${message.id}-${copy.index}`}>
                    <Text className="version-tag">版本 {copy.index}{copy.refined ? ' · 已修改' : ''}</Text>
                    <Text className="version-content" onClick={() => setPreviewCopy(copy)}>{copy.content}</Text>
                    <View className="version-actions">
                      <Text className="mini-action" onClick={() => copyText(copy.content)}>复制</Text>
                      <Text className="mini-action" onClick={() => { setRefineTarget(copy); setRefineDraft(''); }}>微调</Text>
                      <Text className="mini-action" onClick={() => goProWithDesc(copy)}>去配图</Text>
                    </View>
                  </View>
                ))}
              </ScrollView>
            ) : null}
          </View>
        ))}
        {/* 无会话时展示场景选择 chips（scene 必填，创建会话后开始对话） */}
        {!session && !thinking && (
          <View className="pill-row" style={{ marginBottom: '12px' }}>
            {SCENES.map((scene) => <Text key={scene} className="pill" onClick={() => createSession(scene)}>{scene}</Text>)}
          </View>
        )}
        {thinking && !wsStage && <View className="bubble bubble-ai">AI 正在思考…</View>}
      </View>

      {/* 底部输入栏：🎤按住说话 → 输入框 → 发送（挂起问卷/选项卡期间仍可输入，后端意图路由处理，如「再改改」触发微调） */}
      <View style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 30, display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', paddingBottom: 'calc(16px + env(safe-area-inset-bottom))', background: '#fffdfb', borderTop: '1px solid #eadbd0' }}>
        {voiceSupported && (
          <Text
            className={recognizing ? 'voice-button recording' : 'voice-button'}
            style={recognizing ? { background: '#f7e3c8', color: '#8e683c' } : undefined}
            onTouchStart={onVoiceTouchStart}
            onTouchEnd={onVoiceTouchEnd}
            onTouchCancel={onVoiceTouchEnd}
          >{recognizing ? '松开识别' : '🎤 按住说话'}</Text>
        )}
        <Input
          className="chat-input"
          value={input}
          placeholder={session ? '回复 AI、答题，或直接说「再改改」（扣 1 额度）' : '先在上方选择创作场景'}
          onInput={(event) => setInput(event.detail.value)}
        />
        <Text className="send-button" onClick={() => sendMessage(input)}>发送</Text>
      </View>

      {/* 出稿卡片放大预览：点击卡片任意处全选复制 */}
      {previewCopy && (
        <>
          <View className="modal-mask" onClick={() => setPreviewCopy(null)} />
          <View className="publish-sheet">
            <View className="row-between">
              <Text className="page-title" style={{ fontSize: '34px' }}>版本 {previewCopy.index}{previewCopy.refined ? ' · 已修改' : ''}</Text>
              <Text className="gold" style={{ fontSize: '28px' }} onClick={() => setPreviewCopy(null)}>×</Text>
            </View>
            <Text selectable style={{ display: 'block', fontSize: '28px', lineHeight: 1.8, margin: '18px 0' }}>{previewCopy.content}</Text>
            <Button className="primary-button" onClick={() => copyText(previewCopy.content, '全文已复制')}>一键复制全文</Button>
          </View>
        </>
      )}

      {/* 微调：底部弹输入框"想怎么改？"，提交后该版卡片刷新并打「已修改」角标（扣 1 点/次；对话框自然语言改稿等效） */}
      {refineTarget && (
        <>
          <View className="modal-mask" onClick={() => setRefineTarget(null)} />
          <View className="publish-sheet">
            <View className="row-between">
              <Text className="page-title" style={{ fontSize: '34px' }}>微调版本 {refineTarget.index}</Text>
              <Text className="gold" style={{ fontSize: '28px' }} onClick={() => setRefineTarget(null)}>×</Text>
            </View>
            <Text className="muted" style={{ display: 'block', margin: '14px 0' }}>想怎么改？提交后只重写这一版（消耗 1 额度）</Text>
            <Textarea className="caption-editor-textarea" value={refineDraft} maxlength={200} autoHeight placeholder="例如：再口语化一点，结尾加一句行动召唤" onInput={(event) => setRefineDraft(event.detail.value)} />
            <Button className="primary-button" style={{ marginTop: '20px' }} onClick={submitRefine}>提交微调</Button>
          </View>
        </>
      )}

      {/* 历史会话列表：本人最近 20 条，点击切换（ACTIVE）/ 置灰（CLOSED）；恢复后按 action 重建挂起 UI */}
      {historySheet && (
        <>
          <View className="modal-mask" onClick={() => setHistorySheet(false)} />
          <View className="publish-sheet" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
            <View className="row-between">
              <Text className="page-title" style={{ fontSize: '34px' }}>历史会话</Text>
              <Text className="gold" style={{ fontSize: '28px' }} onClick={() => setHistorySheet(false)}>×</Text>
            </View>
            {sessionsLoading && <Text className="muted" style={{ display: 'block', margin: '18px 0' }}>加载中…</Text>}
            {!sessionsLoading && sessions.length === 0 && <Text className="muted" style={{ display: 'block', margin: '18px 0' }}>还没有会话记录，选个场景开始吧</Text>}
            <View style={{ marginTop: '12px' }}>
              {sessions.map((item) => (
                <View
                  key={String(item.id)}
                  className="menu-line"
                  onClick={() => switchSession(item)}
                  style={item.status === 'CLOSED' ? { opacity: 0.5 } : undefined}
                >
                  <View>
                    <Text style={{ display: 'block' }}>{item.title}{item.status === 'CLOSED' ? '（已关闭）' : ''}</Text>
                    <Text className="muted" style={{ display: 'block', marginTop: '7px', fontSize: '21px' }}>
                      {item.scene} · 微调 {item.reviseCount} 次 · {item.updatedAt ? item.updatedAt.slice(0, 16).replace('T', ' ') : ''}
                    </Text>
                  </View>
                  <Text className="gold">›</Text>
                </View>
              ))}
            </View>
          </View>
        </>
      )}
    </View>
  );
}
