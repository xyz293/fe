import { Button, Text, View } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import { useState } from 'react';
import type { MyQuota, QuotaFlow } from '@xiaoa/share';
import { quotaApi } from '../../../utils/sharedAdapter';
import { PagePlaceholder } from '../../../components/PagePlaceholder';

/** 流水业务类型中文标签（QuotaFlowBizType，员工额度文档 §1.1：三级账户双流水） */
const BIZ_LABELS: Record<string, string> = {
  CREDIT: '充值',
  ALLOCATE_OUT: '划出（下发/划拨）',
  ALLOCATE_IN: '划入（下发/划拨）',
  CONSUME: '生成消耗',
  REFUND: '失败退回',
  RECALL: '回收员工额度',
};

/** 店长额度页：门店账户概览（余额 + 最近流水），员工划拨操作在「员工与角色」页 */
export default function QuotaPage() {
  const [quota, setQuota] = useState<MyQuota | null>(null);
  const [error, setError] = useState('');
  const isLoggedIn = Boolean(String(Taro.getStorageSync('token') || ''));

  useDidShow(() => {
    if (!isLoggedIn) return;
    quotaApi.getMyQuota()
      .then(setQuota)
      .catch((requestError) => setError(requestError instanceof Error ? requestError.message : '额度加载失败'));
  });

  if (!isLoggedIn) return <PagePlaceholder title="额度划拨" description="请先登录店长账号后查看门店额度。" />;

  const flows: QuotaFlow[] = quota?.recentFlows || [];
  return (
    <View className="page">
      <View className="topbar">
        <View>
          <Text className="page-title">门店额度</Text>
          <Text className="page-subtitle">店长账户概览：余额与最近流水（员工划拨在「员工与角色」页）</Text>
        </View>
      </View>

      <View className="card">
        <View className="row-between">
          <Text className="section-title" style={{ margin: 0 }}>门店账户</Text>
          <Text className="gold" style={{ fontSize: '24px' }} onClick={() => Taro.navigateTo({ url: '/pages/quota-flow/index' })}>全部明细 ›</Text>
        </View>
        {error ? <Text className="muted">{error}</Text> : (
          <>
            <Text className="balance">{quota ? quota.account.balance.toLocaleString() : '--'}</Text>
            <Text className="muted" style={{ fontSize: '22px' }}>{quota ? (quota.account.level === 'STORE' ? '本店账户' : '当前账户') : '加载中'} · 单位：额度</Text>
          </>
        )}
      </View>

      <View className="card">
        <Text className="section-title" style={{ marginTop: 0 }}>最近流水</Text>
        {flows.length === 0 && <Text className="muted">暂无流水记录</Text>}
        {flows.map((flow) => (
          <View className="menu-line" key={String(flow.id)}>
            <View>
              <Text style={{ display: 'block' }}>{BIZ_LABELS[flow.bizType] || flow.bizType}{flow.remark ? ` · ${flow.remark}` : ''}</Text>
              <Text className="muted" style={{ display: 'block', marginTop: '7px', fontSize: '21px' }}>{flow.createdAt ? flow.createdAt.replace('T', ' ').slice(0, 16) : ''}</Text>
            </View>
            <Text className={flow.amount >= 0 ? 'gold' : 'muted'} style={{ color: flow.amount < 0 ? '#b0574a' : undefined }}>
              {flow.amount >= 0 ? '+' : ''}{flow.amount}
            </Text>
          </View>
        ))}
      </View>

      <Button className="primary-button" onClick={() => Taro.navigateTo({ url: '/pages/manage/employees/index' })}>去员工页划拨 / 回收额度</Button>
    </View>
  );
}
