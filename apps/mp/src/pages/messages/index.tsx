import { Text, View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useState } from 'react';

/**
 * 消息中心：审核结果、生成完成两类消息，点击跳对应作品详情。
 * 后端消息接口就绪前先以本地结构占位，字段已按 workId 跳转设计好。
 */
type MessageKind = 'audit' | 'generate' | 'task';

interface MessageItem {
  id: string;
  icon: string;
  title: string;
  time: string;
  kind: MessageKind;
  workId?: string;
}

const KIND_LABEL: Record<MessageKind, string> = { audit: '审核', generate: '生成', task: '任务' };

const MESSAGES: MessageItem[] = [
  { id: 'm1', icon: '🎬', title: '你的视频「520 对戒短片」已生成完成，点击查看', time: '刚刚', kind: 'generate', workId: 'demo-work-1' },
  { id: 'm2', icon: '✓', title: '作品「春日新品对戒」已通过审核，可以发布了', time: '今天 10:32', kind: 'audit', workId: 'demo-work-2' },
  { id: 'm3', icon: '⚠', title: '作品「国庆黄金款式」被驳回：文案含"最低价"，请改稿后重提', time: '昨天 18:20', kind: 'audit', workId: 'demo-work-3' },
  { id: 'm4', icon: '📋', title: '今日朋友圈任务还未完成，快去发布打卡', time: '今天 09:30', kind: 'task' },
];

const FILTERS: Array<{ key: string; label: string }> = [
  { key: '全部', label: '全部' },
  { key: 'audit', label: '审核结果' },
  { key: 'generate', label: '生成完成' },
  { key: 'task', label: '任务' },
];

export default function MessagesPage() {
  const [filter, setFilter] = useState('全部');
  const list = filter === '全部' ? MESSAGES : MESSAGES.filter((item) => item.kind === filter);
  const openMessage = (item: MessageItem) => {
    if (item.workId) Taro.navigateTo({ url: `/pages/work-detail/index?id=${item.workId}` });
    else Taro.showToast({ title: `打开${KIND_LABEL[item.kind]}详情`, icon: 'none' });
  };
  return <View className="page"><View className="topbar"><View><Text className="page-title">消息</Text><Text className="page-subtitle">审核结果和生成完成，都不会错过</Text></View><Text style={{ fontSize: '36px' }}>•••</Text></View><View className="filter-row">{FILTERS.map((item) => <Text className={filter === item.key ? 'pill active' : 'pill'} key={item.key} onClick={() => setFilter(item.key)}>{item.label}</Text>)}</View><View className="card">{list.map((item) => <View className="message-row" key={item.id} onClick={() => openMessage(item)}><Text className="message-icon">{item.icon}</Text><View className="message-main"><Text className="message-title">{item.title}</Text><Text className="message-time">{item.time} · {KIND_LABEL[item.kind]}{item.workId ? ' · 点击查看作品' : ''}</Text></View><Text className="gold" style={{ fontSize: '32px' }}>›</Text></View>)}</View></View>;
}
