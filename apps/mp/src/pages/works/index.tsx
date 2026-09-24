import { Text, View } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import { useState } from 'react';
import type { Work } from '@xiaoa/share/types';
import { sharedApi } from '../../utils/sharedAdapter';
import { PUBLISH_STATUS, normalizePublishStatus, statusToneClass } from '../../utils/workConstants';

function getWorkType(type: Work['type']) { return type === 'IMAGE' ? '图' : type === 'VIDEO' ? '视频' : '文案'; }

export default function WorksPage() {
  const [filter, setFilter] = useState('全部');
  const [works, setWorks] = useState<Work[]>([]);
  const [error, setError] = useState('');
  const filters = ['全部', '图', '视频', '文案'];
  useDidShow(() => { sharedApi.getWorks().then((result) => setWorks(result.list)).catch((requestError) => setError(requestError instanceof Error ? requestError.message : '作品加载失败')); });
  const list = filter === '全部' ? works : works.filter((work) => getWorkType(work.type) === filter);
  // 状态条统一走 PUBLISH_STATUS 映射（与详情页/管理端审核 Tag 共用一份语义）
  const statusMeta = (work: Work) => PUBLISH_STATUS[normalizePublishStatus(work.status)];
  return <View className="page"><View className="topbar"><View><Text className="page-title">我的作品</Text><Text className="page-subtitle">把每一次灵感，都留在这里</Text></View><Text className="gold" style={{ fontSize: '26px' }}>搜索⌕</Text></View><View className="filter-row">{filters.map((item) => <Text className={filter === item ? 'pill active' : 'pill'} key={item} onClick={() => setFilter(item)}>{item}</Text>)}</View>{error && <View className="card"><Text className="muted">{error}</Text></View>}{!error && list.length === 0 && <View className="card"><Text className="muted">暂无作品</Text></View>}<View className="work-grid">{list.map((work) => <View className="work-card" key={String(work.id)} onClick={() => Taro.navigateTo({ url: `/pages/work-detail/index?id=${work.id}` })}><View className="work-cover">{work.coverUrl ? <Text>{work.coverUrl}</Text> : '💍'}</View><View className="work-info"><Text className="work-title">{work.title}</Text><Text className="work-meta">{getWorkType(work.type)} · {work.summary || '暂无描述'}</Text><Text className={`status-tag ${statusToneClass(statusMeta(work).tone)}`}>{statusMeta(work).label}</Text></View></View>)}</View></View>;
}
