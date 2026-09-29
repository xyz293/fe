/**
 * 问卷卡（挂起点 1，QUESTIONNAIRE action → 对接文档 §3/§5.1）：
 * - 单选（maxSelect 固定 1）；每题选项自带 hint 后果说明；
 * - 「你帮我定」是 allowAiDecide 题目里的普通选项，点选即传该选项 label，无需特殊 UI；
 * - 未回答的题可不传（缺口下一轮问卷继续引导，最多 2 轮后 AI 代选）；
 * - 提交后立即置灰防重复（重复提交命中 1002「无挂起」，对接文档 §7.6）；
 *   历史恢复时 locked 只读回显。
 */
import { Text, View } from '@tarojs/components';
import { useState } from 'react';
import type { ChatAnswerItem, ChatQuestion } from '@xiaoa/share/types';

interface QuestionCardProps {
  questions: ChatQuestion[];
  /** 已提交 / 历史恢复：只读展示 */
  locked?: boolean;
  /** 历史恢复回显（value 为选项 label，按 label 匹配高亮） */
  initialAnswers?: ChatAnswerItem[];
  submitting?: boolean;
  onSubmit: (answers: ChatAnswerItem[]) => void;
}

export function QuestionCard({ questions, locked = false, initialAnswers, submitting = false, onSubmit }: QuestionCardProps) {
  const [selected, setSelected] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    (initialAnswers || []).forEach((answer) => {
      const question = questions.find((item) => item.slotKey === answer.slotKey);
      if (question) initial[question.id] = answer.value;
    });
    return initial;
  });

  /** 单选：再点已选项取消 */
  const toggle = (question: ChatQuestion, optionLabel: string) => {
    if (locked || submitting) return;
    setSelected((current) => {
      if (current[question.id] === optionLabel) {
        const next = { ...current };
        delete next[question.id];
        return next;
      }
      return { ...current, [question.id]: optionLabel };
    });
  };

  const answers = questions
    .filter((question) => selected[question.id])
    .map((question) => ({ slotKey: question.slotKey, value: selected[question.id] }));

  const submit = () => {
    if (locked || submitting || answers.length === 0) return;
    onSubmit(answers);
  };

  return (
    <View className="flow-card">
      {questions.map((question, questionIndex) => (
        <View className="flow-question" key={question.id}>
          <Text className="flow-question-title">{questionIndex + 1}. {question.question}</Text>
          <View className="flow-option-list">
            {question.options.map((option) => {
              const active = selected[question.id] === option.label;
              return (
                <View key={option.key} className={active ? 'flow-option active' : 'flow-option'} onClick={() => toggle(question, option.label)}>
                  <Text className="flow-option-label">{active ? '●' : '○'} {option.label}</Text>
                  {option.hint ? <Text className="flow-option-hint">{option.hint}</Text> : null}
                </View>
              );
            })}
          </View>
        </View>
      ))}
      {locked ? (
        <Text className="flow-card-note">已提交 · 见下方消息</Text>
      ) : (
        <View className={answers.length > 0 && !submitting ? 'flow-submit' : 'flow-submit disabled'} onClick={submit}>
          <Text>{submitting ? '提交中…' : answers.length > 0 ? `提交 ${answers.length}/${questions.length} 题，继续` : '选择后提交（未选的题可跳过）'}</Text>
        </View>
      )}
    </View>
  );
}
