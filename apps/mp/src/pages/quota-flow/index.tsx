import { Text, View } from '@tarojs/components';
import Taro, { usePullDownRefresh, useReachBottom } from '@tarojs/taro';
import { useEffect, useState } from 'react';
import type { QuotaFlow } from '@xiaoa/share';
import { FLOW_TYPE_MAP, formatQuota, quotaAmountTone } from '../../utils/quotaConstants';
import { quotaApi } from '../../utils/sharedAdapter';

const PAGE_SIZE = 10;
const TONE_COLOR: Record<string, string> = { green: '#2e9e6b', red: '#d5605a', default: '#8c8c8c' };

/** 首屏第一页数据（余额卡在"我的"页，明细页只展示流水分页） */
function useQuotaFlows() {
  const [flows, setFlows] = useState<QuotaFlow[]>([]);
  const [pageNo, setPageNo] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = (page: number, replace: boolean) => {
    setLoading(true);
    setError('');
    quotaApi.getMyQuotaFlows({ pageNo: page, pageSize: PAGE_SIZE })
      .then((result) => {
        const list = result.list || [];
        const total = result.total ?? 0;
        setFlows((current) => (replace ? list : [...current, ...list]));
        setPageNo(page);
        setHasMore(list.length >= PAGE_SIZE && total > page * PAGE_SIZE);
      })
      .catch((requestError) => setError(requestError instanceof Error ? requestError.message : '流水加载失败'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(1, true); }, []);

  // 下拉刷新：重置回第一页
  usePullDownRefresh(() => {
    quotaApi.getMyQuotaFlows({ pageNo: 1, pageSize: PAGE_SIZE })
      .then((result) => {
        const list = result.list || [];
        const total = result.total ?? 0;
        setFlows(list);
        setPageNo(1);
        setHasMore(list.length >= PAGE_SIZE && total > list.length);
        setError('');
      })
      .catch((requestError) => setError(requestError instanceof Error ? requestError.message : '流水加载失败'))
      .finally(() => Taro.stopPullDownRefresh());
  });

  // 触底加载下一页；并发变动场景不做实时推送，翻页即 refetch 服务端
  useReachBottom(() => {
    if (loading || !hasMore) return;
    load(pageNo + 1, false);
  });

  return { flows, loading, hasMore, error };
}

export default function QuotaFlowPage() {
  const { flows, loading, hasMore, error } = useQuotaFlows();
  return (
    <View className="page">
      <View className="topbar"><View><Text className="page-title">额度明细</Text><Text className="page-subtitle">每一笔变动都有据可查 · 单位：额度</Text></View></View>
      {error && <View className="notice-bar"><Text>{error}</Text></View>}
      {!error && flows.length === 0 && !loading && <View className="card"><Text className="muted">暂无流水记录</Text></View>}
      <View className="card">
        {flows.map((flow) => {
          const meta = FLOW_TYPE_MAP[flow.bizType];
          const tone = quotaAmountTone(flow.amount);
          return (
            <View className="menu-line" key={String(flow.id)}>
              <View style={{ flex: 1 }}>
                <Text style={{ display: 'block' }}>{meta?.label || flow.bizType}</Text>
                <Text className="muted" style={{ display: 'block', marginTop: '7px', fontSize: '21px' }}>{flow.createdAt || '-'}{flow.refNo ? ` · ${flow.refNo}` : ''}</Text>
              </View>
              <View style={{ textAlign: 'right' }}>
                <Text style={{ display: 'block', fontSize: '28px', fontWeight: '600', color: TONE_COLOR[tone] }}>{formatQuota(flow.amount, { signed: true })}</Text>
                {flow.balanceAfter !== undefined && flow.balanceAfter !== null && <Text className="muted" style={{ display: 'block', fontSize: '20px' }}>余额 {formatQuota(flow.balanceAfter)}</Text>}
              </View>
            </View>
          );
        })}
      </View>
      {loading && <Text className="muted" style={{ display: 'block', textAlign: 'center', fontSize: '22px' }}>正在加载…</Text>}
      {!loading && !hasMore && flows.length > 0 && <Text className="muted" style={{ display: 'block', textAlign: 'center', fontSize: '22px' }}>没有更多了</Text>}
    </View>
  );
}
