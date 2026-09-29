/**
 * 选项卡（挂起点 2，OPTION_CARD action → 对接文档 §3/§5.2）：
 * - A/B/C 增益操作 + D「直接生成」必有；deadlineSeconds（30s）前端倒计时；
 * - 倒计时归零：禁用选项、不调接口——后端兜底任务约 60s 后按「直接生成」自动出稿写入会话，
 *   页面通过 onExpire 安排一次会话刷新拉取结果（用户点选时已被兜底放行则报 1003 → 刷新会话）；
 * - 提交后立即置灰防重复；历史恢复 locked 只读，超过时效置灰等兜底结果。
 */
import { Text, View } from '@tarojs/components';
import { useEffect, useRef, useState } from 'react';
import type { ChatOptionCard } from '@xiaoa/share/types';

interface OptionCardProps {
  options: ChatOptionCard['options'];
  deadlineSeconds: number;
  /** 初始剩余秒数（历史恢复按 createdAt 折算后传入；不传用 deadlineSeconds） */
  initialSeconds?: number;
  /** 已提交 / 已过期 / 历史：只读展示 */
  locked?: boolean;
  /** 倒计时自然到期（等待后端兜底，不发请求） */
  expired?: boolean;
  /** 已提交的选项（回显） */
  chosenKey?: string;
  submitting?: boolean;
  onChoose: (key: 'A' | 'B' | 'C' | 'D') => void;
  /** 倒计时归零回调（页面标记过期并安排兜底结果刷新；组件不发请求） */
  onExpire?: () => void;
}

export function OptionCard({ options, deadlineSeconds, initialSeconds, locked = false, expired = false, chosenKey, submitting = false, onChoose, onExpire }: OptionCardProps) {
  const [secondsLeft, setSecondsLeft] = useState(() => Math.max(0, initialSeconds ?? (deadlineSeconds > 0 ? deadlineSeconds : 30)));
  const chosenRef = useRef(false);
  const expiredRef = useRef(false);
  const disabled = Boolean(locked || expired || chosenKey || chosenRef.current || expiredRef.current);

  // 倒计时：每秒 -1，归零只触发 onExpire（禁用不发请求，等后端兜底出稿，对接文档 §5.2）
  useEffect(() => {
    if (locked || expired) return;
    if (secondsLeft <= 0) {
      if (!expiredRef.current && onExpire) {
        expiredRef.current = true;
        onExpire();
      }
      return;
    }
    const timer = setTimeout(() => setSecondsLeft((current) => current - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft, locked, expired, onExpire]);

  const choose = (key: 'A' | 'B' | 'C' | 'D') => {
    if (disabled || submitting) return;
    chosenRef.current = true;
    onChoose(key);
  };

  return (
    <View className="flow-card">
      {!disabled && (
        <Text className="flow-card-tip">不限也可选 D 直接生成 · {secondsLeft}s 后自动开始</Text>
      )}
      <View className="flow-option-list">
        {options.map((option) => {
          const active = chosenKey === option.key;
          return (
            <View key={option.key} className={active ? 'flow-option active' : 'flow-option'} onClick={() => choose(option.key)}>
              <Text className="flow-option-label"><Text className="flow-option-key">{option.key}</Text> {option.label}</Text>
              {option.hint ? <Text className="flow-option-hint">{option.hint}</Text> : null}
            </View>
          );
        })}
      </View>
      {expired && <Text className="flow-card-note">已超时 · AI 正在按「直接生成」继续，结果稍后自动更新</Text>}
      {!expired && chosenKey && <Text className="flow-card-note">已选 {chosenKey} · AI 正在继续</Text>}
      {!expired && !chosenKey && locked && <Text className="flow-card-note">已处理 · 见下方消息</Text>}
    </View>
  );
}
