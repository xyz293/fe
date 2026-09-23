import { Text, View } from '@tarojs/components';

interface SharedWidgetsProps {
  quotaBalance?: number;
  quotaTotal?: number;
  taskPercent?: number;
}

export function SharedWidgets({ quotaBalance = 68, quotaTotal = 100, taskPercent = 72 }: SharedWidgetsProps) {
  const quotaPercent = quotaTotal > 0 ? Math.max(0, Math.min(100, (quotaBalance / quotaTotal) * 100)) : 0;
  const quotaColor = quotaPercent <= 20 ? '#ff4d4f' : '#1677ff';
  const safeTaskPercent = Math.max(0, Math.min(100, taskPercent));

  return <View className="card"><Text style={{ display: 'block', marginBottom: '24px', fontSize: '32px', fontWeight: '600' }}>门店数据</Text><Text style={{ display: 'block', marginBottom: '8px', color: quotaColor }}>创作额度：{quotaBalance} / {quotaTotal}</Text><View style={{ height: '8px', overflow: 'hidden', borderRadius: '8px', background: '#f0f0f0' }}><View style={{ width: `${quotaPercent}%`, height: '100%', borderRadius: '8px', background: quotaColor }} /></View><Text style={{ display: 'block', marginTop: '28px', marginBottom: '8px' }}>任务完成率：{safeTaskPercent.toFixed(1)}%</Text><View style={{ height: '8px', overflow: 'hidden', borderRadius: '8px', background: '#f0f0f0' }}><View style={{ width: `${safeTaskPercent}%`, height: '100%', borderRadius: '8px', background: '#1677ff' }} /></View></View>;
}
