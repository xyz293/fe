import { Text, View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useState } from 'react';

const messages = [
  { icon: '🎬', title: '视频已生成完成，点击查看', time: '刚刚', type: '生成' },
  { icon: '📋', title: '今日朋友圈任务还未完成', time: '今天 09:30', type: '任务' },
  { icon: '✓', title: '作品「春日新品对戒」已通过审核', time: '昨天 18:20', type: '审核' },
  { icon: '⚠', title: '灵感额度不足，请联系店长充值', time: '05-18 15:12', type: '系统' },
];

export default function MessagesPage() {
  const [filter, setFilter] = useState('全部');
  const filters = ['全部', '生成', '任务', '审核'];
  const list = filter === '全部' ? messages : messages.filter((item) => item.type === filter);
  return <View className="page"><View className="topbar"><View><Text className="page-title">消息</Text><Text className="page-subtitle">重要提醒，都不会错过</Text></View><Text style={{ fontSize: '36px' }}>•••</Text></View><View className="filter-row">{filters.map((item) => <Text className={filter === item ? 'pill active' : 'pill'} key={item} onClick={() => setFilter(item)}>{item}</Text>)}</View><View className="card">{list.map((item) => <View className="message-row" key={item.title} onClick={() => Taro.showToast({ title: `打开${item.type}详情`, icon: 'none' })}><Text className="message-icon">{item.icon}</Text><View className="message-main"><Text className="message-title">{item.title}</Text><Text className="message-time">{item.time} · {item.type}</Text></View><Text className="gold" style={{ fontSize: '32px' }}>›</Text></View>)}</View></View>;
}
