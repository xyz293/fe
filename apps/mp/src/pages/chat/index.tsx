import { Button, Input, ScrollView, Text, Textarea, View } from '@tarojs/components';
import Taro, { useDidShow, useLoad } from '@tarojs/taro';
import { useRef, useState } from 'react';
import type { ChatCopyVariant, ChatMessage, ChatSession } from '@xiaoa/share/types';
import { sharedApi } from '../../utils/sharedAdapter';
import { isAsrSupported, startAsr, stopAsr } from '../../utils/asr';

/** 会话与关联上下文的本地持久化（重进时恢复历史） */
const CHAT_SESSION_KEY = 'xiaoa_chat_session_id';
const CHAT_TASK_KEY = 'xiaoa_chat_task_id';
/** 「去配图」带给专业模式的预填文案 */
const CHAT_DESC_KEY = 'xiaoa_chat_link_desc';

/** 创作场景（POST /api/chat/sessions 的 scene 必填 ≤32 字符，文档 §2.5） */
const SCENES = ['朋友圈', '小红书', '视频号'];

/** 无会话时的欢迎语（引导选择创作场景） */
const WELCOME: ChatMessage = {
  role: 'AI',
  content: '选择一个创作场景开始吧～说人话就行，我会追问补齐要素，一次给你 3 版文案',
};

/** 首次出稿的引导语（提示词对员工全隐藏，文档 §2.1） */
const GENERATE_LEAD = '给你几版文案，点卡片可复制、微调或去配图 👇';

/** 出稿扣费失败（3001）时的固定提示（员工额度文档 §1.1） */
const QUOTA_TIP = '额度不足，请联系店长划拨';

/**
 * 解析历史 AI 消息 content（JSON 字符串，文档 §2.5）：
 * - 追问：{"action":"ASK","question":"..."}
 * - 出稿：{"action":"GENERATE","versions":["v1","v2","v3"]}
 * - 微调：{"action":"GENERATE","versions":["新版"],"revisedFrom":2}（基于第 2 版改写）
 * 解析失败（LLM 兜底追问为纯文本）时按原文渲染。
 */
function parseAiContent(raw: string): ChatMessage {
  try {
    const parsed = JSON.parse(raw) as { action?: string; question?: string; versions?: string[]; revisedFrom?: number };
    if (parsed.action === 'ASK' && parsed.question) return { role: 'AI', content: parsed.question };
    if (parsed.action === 'GENERATE' && parsed.versions?.length) {
      const revisedFrom = typeof parsed.revisedFrom === 'number' ? parsed.revisedFrom : undefined;
      return {
        role: 'AI',
        content: revisedFrom ? `基于第 ${revisedFrom} 版微调：` : GENERATE_LEAD,
        copies: parsed.versions.map((content, index) => ({
          // 微调消息的单版卡片归属被改写的那个版本（revisedFrom）
          index: revisedFrom ?? index + 1,
          content,
          refined: Boolean(revisedFrom),
        })),
        revisedFrom,
      };
    }
  } catch {
    // 非 JSON 内容（兜底追问等），按原文渲染
  }
  return { role: 'AI', content: raw };
}

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>(() => [WELCOME]);
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

  const restoredRef = useRef('');

  useLoad((params) => {
    if (params.taskId) {
      Taro.setStorageSync(CHAT_TASK_KEY, params.taskId);
    }
  });

  /** 拉取会话全量历史并解析渲染；会话不存在/已关闭（1001）时清本地引导新建 */
  const loadSession = (sessionId: string) => {
    setThinking(true);
    sharedApi.getChatSession(sessionId)
      .then((detail) => {
        setSession(detail.session);
        const restored: ChatMessage[] = [];
        (detail.messages || []).forEach((item) => {
          if (item.role === 'USER') restored.push({ role: 'USER', content: item.content, createdAt: item.createdAt });
          else restored.push({ ...parseAiContent(item.content), createdAt: item.createdAt });
        });
        setMessages(restored.length ? restored : [WELCOME]);
      })
      .catch((requestError) => {
        const code = (requestError as Error & { code?: number })?.code;
        Taro.showToast({ title: requestError instanceof Error ? requestError.message : '历史加载失败', icon: 'none' });
        if (code === 1001 || code === 2003) {
          Taro.removeStorageSync(CHAT_SESSION_KEY);
          restoredRef.current = '';
          setSession(null);
          setMessages([WELCOME]);
        }
      })
      .finally(() => setThinking(false));
  };

  /** 消息页重进恢复：按本地会话 ID 拉全量历史（tabBar 页每次切回触发） */
  useDidShow(() => {
    const saved = String(Taro.getStorageSync(CHAT_SESSION_KEY) || '');
    if (!saved || restoredRef.current === saved) return;
    restoredRef.current = saved;
    loadSession(saved);
  });

  const appendMessage = (message: ChatMessage) => setMessages((current) => [...current, message]);

  /** 选择场景创建会话（每轮追问免费，首出 3 版文案扣 1 点，文档 §2.2） */
  const createSession = (scene: string) => {
    if (thinking) return;
    setThinking(true);
    sharedApi.createChatSession({ scene })
      .then((created) => {
        setSession(created);
        Taro.setStorageSync(CHAT_SESSION_KEY, String(created.id));
        restoredRef.current = String(created.id);
        setMessages([{ role: 'AI', content: `「${scene}」场景已就绪～用一句话告诉我：想推什么、给谁看？` }]);
      })
      .catch((requestError) => Taro.showToast({ title: requestError instanceof Error ? requestError.message : '会话创建失败', icon: 'none' }))
      .finally(() => setThinking(false));
  };

  /** 回到欢迎态（会话已关闭 / 主动新开），保留旧记录在「历史」里 */
  const resetToWelcome = () => {
    Taro.removeStorageSync(CHAT_SESSION_KEY);
    restoredRef.current = '';
    setSession(null);
    setMessages([WELCOME]);
  };

  /**
   * 发送一句话（POST /api/chat/sessions/{id}/messages，语音识别的文字同样走这里）：
   * ASK → 追加 AI 追问气泡；GENERATE → 已扣费出稿，追加出稿卡片气泡。
   * 3001 额度不足 / 4001 违规词时整轮不落库，保留输入框内容供直接重发（文档 §2.8）。
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
    setThinking(true);
    sharedApi.sendChatMessage(session.id, text)
      .then((reply) => {
        appendMessage({ role: 'USER', content: text });
        if (reply.action === 'GENERATE' && reply.versions?.length) {
          appendMessage({
            role: 'AI',
            content: reply.versions.length > 1 ? GENERATE_LEAD : '已按你的要求改写：',
            copies: reply.versions.map((content, index) => ({ index: index + 1, content })),
          });
        } else {
          // LLM 异常时后端兜底追问「能再具体一点吗?」，正常渲染追问气泡（文档 §2.8）
          appendMessage({ role: 'AI', content: reply.question || '能再具体一点吗？' });
        }
        setInput('');
      })
      .catch((requestError) => {
        const code = (requestError as Error & { code?: number })?.code;
        const message = requestError instanceof Error ? requestError.message : '发送失败，请重试';
        if (code === 3001 || message.includes('额度')) {
          Taro.showToast({ title: QUOTA_TIP, icon: 'none' });
        } else if (code === 1001) {
          // 会话已关闭 / 7 天未活跃自动关闭（文档 §2.3）：提示后引导新建会话
          Taro.showToast({ title: message || '会话已关闭，请新建会话', icon: 'none' });
          resetToWelcome();
        } else if (code === 4001) {
          // 命中 level2 违规词：本轮不落库，toast 具体违规提示，引导换说法重发
          Taro.showToast({ title: message, icon: 'none' });
        } else {
          Taro.showToast({ title: message, icon: 'none' });
        }
      })
      .finally(() => setThinking(false));
  };

  const copyText = (text: string, tip = '文案已复制') => {
    Taro.setClipboardData({ data: text }).then(() => Taro.showToast({ title: tip, icon: 'success' }));
  };

  /** 去配图：带会话跳专业模式（desc 预填 + chatSessionId 透传，生成后回填 caption，文档 §2.6）；关联任务时透传 taskId，发布核销用 */
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
          role: 'AI',
          content: `已按「${draft.slice(0, 20)}${draft.length > 20 ? '…' : ''}」改写第 ${target.index} 版：`,
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

      <View style={{ padding: '0 20px' }}>
        {messages.map((message, messageIndex) => (
          <View key={`${messageIndex}-${message.createdAt || ''}`}>
            <View className={message.role === 'AI' ? 'bubble bubble-ai' : 'bubble bubble-user'}>{message.content}</View>
            {message.copies?.length ? (
              <ScrollView className="version-scroll" scrollX enhanced showScrollbar={false}>
                {message.copies.map((copy) => (
                  <View className="version-card" key={`${messageIndex}-${copy.index}`}>
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
        {thinking && <View className="bubble bubble-ai">AI 正在思考…</View>}
      </View>

      {/* 底部输入栏：🎤按住说话 → 输入框 → 发送（失败不保留？保留内容，直接重发） */}
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
        <Input className="chat-input" value={input} placeholder={session ? '回复 AI，或补充新的想法' : '先在上方选择创作场景'} onInput={(event) => setInput(event.detail.value)} />
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

      {/* 微调：底部弹输入框"想怎么改？"，提交后该版卡片刷新并打「已修改」角标（扣 1 点/次） */}
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

      {/* 历史会话列表：本人最近 20 条，点击切换（ACTIVE）/ 置灰（CLOSED） */}
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
