import { DatePicker, Select, Space, Table, Tag, Typography } from 'antd';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import { useEffect, useState } from 'react';
import type { QuotaFlow, QuotaFlowBizType, QuotaFlowQuery } from '@xiaoa/share';
import { FLOW_TYPE_MAP, formatQuota, quotaAmountTone } from '@xiaoa/share/constants';
import { quotaApi } from '../../services/sharedApi';

const PAGE_SIZE = 10;

export interface FlowTableProps {
  /** 额度账户 ID（总池或门店） */
  accountId?: string | number;
  /** 变更时强制重新拉取第一页（分配/充值成功后由父组件 bump） */
  refreshKey?: number;
}

/** 流水表格：总池页、门店详情抽屉等处复用；筛选走服务端，翻页即 refetch 当前页 */
export function FlowTable({ accountId, refreshKey = 0 }: FlowTableProps) {
  const [bizType, setBizType] = useState<QuotaFlowQuery['bizType']>('');
  const [range, setRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [pageNo, setPageNo] = useState(1);
  const [flows, setFlows] = useState<QuotaFlow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!accountId) return;
    const params: QuotaFlowQuery = {
      bizType,
      pageNo,
      pageSize: PAGE_SIZE,
      ...(range ? { startTime: range[0].format('YYYY-MM-DD 00:00:00'), endTime: range[1].format('YYYY-MM-DD 23:59:59') } : {}),
    };
    setLoading(true);
    setError('');
    quotaApi.getQuotaFlows(accountId, params)
      .then((result) => { setFlows(result.list || []); setTotal(result.total || 0); })
      .catch((requestError) => setError(requestError instanceof Error ? requestError.message : '流水加载失败'))
      .finally(() => setLoading(false));
  }, [accountId, refreshKey, bizType, range, pageNo]);

  const resetPage = () => setPageNo(1);

  return (
    <Space direction="vertical" size={14} className="full-width">
      <Space wrap>
        <Select
          value={bizType}
          style={{ width: 130 }}
          onChange={(value) => { setBizType(value); resetPage(); }}
          options={[{ label: '全部类型', value: '' }, ...Object.entries(FLOW_TYPE_MAP).map(([value, meta]) => ({ label: meta.label, value }))] as Array<{ label: string; value: QuotaFlowQuery['bizType'] }>}
        />
        <DatePicker.RangePicker value={range} onChange={(value) => { setRange(value as [Dayjs, Dayjs] | null); resetPage(); }} allowClear />
        <Typography.Text type="secondary">单位：额度</Typography.Text>
      </Space>
      {error && <Typography.Text type="danger">{error}</Typography.Text>}
      <Table
        rowKey={(record) => String(record.id)}
        dataSource={flows}
        loading={loading}
        size="small"
        locale={{ emptyText: accountId ? '暂无流水记录' : '请先选择账户' }}
        pagination={{ current: pageNo, pageSize: PAGE_SIZE, total, showSizeChanger: false, onChange: (page) => setPageNo(page) }}
        columns={[
          { title: '时间', dataIndex: 'createdAt', width: 170, render: (value: QuotaFlow['createdAt']) => value ? dayjs(value).format('YYYY-MM-DD HH:mm') : '-' },
          { title: '类型', dataIndex: 'bizType', width: 90, render: (value: QuotaFlow['bizType']) => { const meta = FLOW_TYPE_MAP[value]; return meta ? <Tag color={meta.color === 'default' ? undefined : meta.color}>{meta.label}</Tag> : value; } },
          { title: '关联单号', dataIndex: 'refNo', render: (value: QuotaFlow['refNo']) => value || '-' },
          { title: '变动', dataIndex: 'amount', width: 120, render: (value: number) => { const tone = quotaAmountTone(value); return <Typography.Text type={tone === 'green' ? 'success' : tone === 'red' ? 'danger' : undefined} strong>{formatQuota(value, { signed: true })}</Typography.Text>; } },
          { title: '变动后余额', dataIndex: 'balanceAfter', width: 110, render: (value: QuotaFlow['balanceAfter']) => value === undefined || value === null ? '-' : formatQuota(value) },
        ]}
      />
    </Space>
  );
}
