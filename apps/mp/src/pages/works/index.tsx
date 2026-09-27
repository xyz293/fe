import { Text, View } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import { useState } from 'react';
import type { Work } from '@xiaoa/share/types';
import { sharedApi } from '../../utils/sharedAdapter';
import { PUBLISH_STATUS, normalizePublishStatus, statusToneClass } from '../../utils/workConstants';

function getWorkType(type: Work['type']) { return type === 'VIDEO' ? '视频' : '图文'; }

/** 作品模型已统一为文档 §1.6 的 AiWork 结构：status（生成）与 publishStatus（发布）双维度独立 */
function cardStatusMeta(work: Work) {
  if (work.status === 'PENDING') return PUBLISH_STATUS.NONE;
  if (work.status === 'FAILED') return { label: '生成失败', publishable: false, tone: 'red' as const };
  return PUBLISH_STATUS[normalizePublishStatus(work.publishStatus)];
}

/** local:// 是后端本地占位协议（OSS 接入前，文档 §3.5），不能当图片加载，渲染占位符 */
function cardCover(work: Work) {
  return work.contentUrl && !work.contentUrl.startsWith('local://') ? work.contentUrl : '';
}

export default function WorksPage() {
  const [filter, setFilter] = useState('全部');
  const [works, setWorks] = useState<Work[]>([]);
  const [error, setError] = useState('');
  const filters = ['全部', '图文', '视频'];
  useDidShow(() => { sharedApi.getWorks().then((result) => setWorks(result.list)).catch((requestError) => setError(requestError instanceof Error ? requestError.message : '作品加载失败')); });
  const list = filter === '全部' ? works : works.filter((work) => getWorkType(work.type) === filter);
  return <View className="page"><View className="topbar"><View><Text className="page-title">我的作品</Text><Text className="page-subtitle">把每一次灵感，都留在这里</Text></View><Text className="gold" style={{ fontSize: '26px' }}>搜索⌕</Text></View><View className="filter-row">{filters.map((item) => <Text className={filter === item ? 'pill active' : 'pill'} key={item} onClick={() => setFilter(item)}>{item}</Text>)}</View>{error && <View className="card"><Text className="muted">{error}</Text></View>}{!error && list.length === 0 && <View className="card"><Text className="muted">暂无作品</Text></View>}<View className="work-grid">{list.map((work) => <View className="work-card" key={String(work.id)} onClick={() => Taro.navigateTo({ url: `/pages/work-detail/index?id=${work.id}` })}><View className="work-cover">{cardCover(work) ? <Text>{cardCover(work)}</Text> : work.status === 'PENDING' ? '⏳' : '💍'}</View><View className="work-info"><Text className="work-title">{work.styleName || getWorkType(work.type)}</Text><Text className="work-meta">{getWorkType(work.type)} · {work.status === 'FAILED' ? work.failReason || '生成失败，额度已退回' : work.caption || work.userInput || '暂无描述'}</Text><Text className={`status-tag ${statusToneClass(cardStatusMeta(work).tone)}`}>{cardStatusMeta(work).label}</Text></View></View>)}</View></View>;
}
