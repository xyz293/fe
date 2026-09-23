import { Text, View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useState } from 'react';

const works = [
  { id: '1', title: '春日新品对戒', type: '图', emoji: '💍', status: '可发布', statusClass: 'status-ready', time: '今天 10:24' },
  { id: '2', title: '520爱的礼物季', type: '视频', emoji: '🎬', status: '审核中', statusClass: 'status-review', time: '昨天 18:06' },
  { id: '3', title: '给她的日常告白', type: '文案', emoji: '💌', status: '草稿', statusClass: 'status-draft', time: '昨天 14:30' },
  { id: '4', title: '钻石火彩种草', type: '图', emoji: '💎', status: '驳回', statusClass: 'status-reject', time: '05-18 09:12' },
];

export default function WorksPage() {
  const [filter, setFilter] = useState('全部');
  const filters = ['全部', '图', '视频', '文案'];
  const list = filter === '全部' ? works : works.filter((work) => work.type === filter);
  return <View className="page"><View className="topbar"><View><Text className="page-title">我的作品</Text><Text className="page-subtitle">把每一次灵感，都留在这里</Text></View><Text className="gold" style={{ fontSize: '26px' }}>搜索⌕</Text></View><View className="filter-row">{filters.map((item) => <Text className={filter === item ? 'pill active' : 'pill'} key={item} onClick={() => setFilter(item)}>{item}</Text>)}</View><View className="work-grid">{list.map((work) => <View className="work-card" key={work.id} onClick={() => Taro.navigateTo({ url: `/pages/work-detail/index?id=${work.id}` })}><View className="work-cover">{work.emoji}</View><View className="work-info"><Text className="work-title">{work.title}</Text><Text className="work-meta">{work.type} · {work.time}</Text><Text className={`status-tag ${work.statusClass}`}>{work.status}</Text></View></View>)}</View></View>;
}
