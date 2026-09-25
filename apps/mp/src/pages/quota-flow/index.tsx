import { Text, View } from '@tarojs/components';
import Taro, { usePullDownRefresh } from '@tarojs/taro';
import { useEffect, useState } from 'react';
import type { QuotaFlow } from '@xiaoa/share';
import { FLOW_TYPE_MAP, formatQuota, quotaAmountTone } from '../../utils/quotaConstants';
import { quotaApi } from '../../utils/sharedAdapter';

const TONE_COLOR: Record<string, string> = { green: '#2e9e6b', red: '#d5605a', default: '#8c8c8c' };

/**
 * 额度明细页（GET /api/quota/my，文档 §2.5）。
 * recentFlows 由后端固定返回最近 10 条流水（不分页参数），无独立流水分页接口；
 * 下拉刷新重新拉取，触底不再分页。
 */
export default function QuotaFlowPage() {
  const [flows, setFlows] = useState<QuotaFlow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    setError('');
    quotaApi.getMyQuota()
      .then((result) => setFlows(result.recentFlows || []))
      .catch((requestError) => setError(requestError instanceof Error ? requestError.message : '流水加载失败'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  // 下拉刷新：重新拉取最近 10 条
  usePullDownRefresh(() => {
    quotaApi.getMyQuota()
      .then((result) => { setFlows(result.recentFlows || []); setError(''); })
      .catch((requestError) => setError(requestError instanceof Error ? requestError.message : '流水加载失败'))
      .finally(() => Taro.stopPullDownRefresh());
  });

  return (
    <View className="page">
      <View className="topbar"><View><Text className="page-title">额度明细</Text><Text className="page-subtitle">最近 10 条变动记录 · 单位：额度</Text></View></View>
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
                <Text className="muted" style={{ display: 'block', marginTop: '7px', fontSize: '21px' }}>{flow.createdAt || '-'}{flow.bizId ? ` · ${flow.bizId}` : ''}</Text>
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
      {!loading && flows.length > 0 && <Text className="muted" style={{ display: 'block', textAlign: 'center', fontSize: '22px' }}>仅展示最近 10 条</Text>}
    </View>
  );
}
