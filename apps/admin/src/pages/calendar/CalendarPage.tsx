import { Button, Calendar, Drawer, Empty, Modal, Space, Spin, Tag, Typography, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ContentPackage } from '@xiaoa/share/types';
import { PACKAGE_STATUS, PACKAGE_STATUS_COLOR, normalizePackageStatus } from '@xiaoa/share/constants';
import { packageApi } from '../../services/sharedApi';
import { PackageModal } from './PackageModal';

interface PageProps { title: string; description: string; }

function normalizeList(result: unknown): ContentPackage[] {
  if (Array.isArray(result)) return result;
  const page = result as { list?: ContentPackage[] } | null;
  return page?.list ?? [];
}

/**
 * 营销日历：月历标记 + 点日期侧抽屉。
 * "下发"在 UI 上不存在（可见性即下发）：ACTIVE=待下发（蓝），EXPIRED=已下发（绿），CANCELED 不展示。
 */
export function CalendarPage({ title, description }: PageProps) {
  const [month, setMonth] = useState<string>(dayjs().format('YYYY-MM'));
  const [packages, setPackages] = useState<ContentPackage[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const loadPackages = useCallback(async (targetMonth: string) => {
    setLoading(true);
    try {
      const result = await packageApi.listPackages({ month: targetMonth, pageNo: 1, pageSize: 100 });
      setPackages(normalizeList(result));
    } catch (error) {
      if (error instanceof Error) message.error(error.message || '内容包加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadPackages(month); }, [month, loadPackages]);

  /** marketingDate → 内容包（只展示未撤销的） */
  const byDate = useMemo(() => {
    const map = new Map<string, ContentPackage[]>();
    for (const item of packages) {
      if (!item.marketingDate) continue;
      if (normalizePackageStatus(item.status) === 'CANCELED') continue;
      const list = map.get(item.marketingDate) ?? [];
      list.push(item);
      map.set(item.marketingDate, list);
    }
    return map;
  }, [packages]);

  const dayPackages = selectedDate ? byDate.get(selectedDate) ?? [] : [];

  const cancelPackage = (pkg: ContentPackage) => {
    Modal.confirm({
      title: '撤销内容包',
      content: '撤销后不再自动下发任务。',
      okText: '撤销',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: async () => {
        try {
          await packageApi.cancelPackage(pkg.id);
          message.success('已撤销');
          await loadPackages(month);
        } catch (error) {
          // 撤销时刚好被定时任务下发：接口返回"状态已变更"→ 提示并刷新
          const msg = error instanceof Error ? error.message : '撤销失败';
          if (msg.includes('状态已变更') || msg.includes('已下发')) {
            message.warning('该内容包已下发');
            await loadPackages(month);
          } else {
            message.error(msg);
          }
        }
      },
    });
  };

  const cellRender = (current: Dayjs, info: { type: string }) => {
    if (info.type !== 'date') return null;
    const key = current.format('YYYY-MM-DD');
    const list = byDate.get(key);
    if (!list?.length) return null;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {list.map((item) => {
          const status = normalizePackageStatus(item.status);
          return (
            <Tag key={String(item.id)} color={PACKAGE_STATUS_COLOR[status]} style={{ margin: 0, fontSize: 11, lineHeight: '18px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {item.name}·{PACKAGE_STATUS[status]}
            </Tag>
          );
        })}
      </div>
    );
  };

  return (
    <Space direction="vertical" size={20} className="full-width">
      <div className="page-heading">
        <div className="page-heading-copy">
          <Typography.Title level={2}>{title}</Typography.Title>
          <Typography.Text>{description}</Typography.Text>
        </div>
        <div className="page-actions">
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>新建节点内容包</Button>
        </div>
      </div>
      <Spin spinning={loading}>
        <Calendar
          cellRender={cellRender}
          onPanelChange={(date: Dayjs) => setMonth(date.format('YYYY-MM'))}
          onSelect={(date: Dayjs) => setSelectedDate(date.format('YYYY-MM-DD'))}
        />
      </Spin>

      <Drawer
        title={`内容包 · ${selectedDate ?? ''}`}
        width={420}
        open={Boolean(selectedDate)}
        onClose={() => setSelectedDate(null)}
      >
        {dayPackages.length === 0 ? (
          <Empty description="该日暂无内容包" />
        ) : (
          <Space direction="vertical" size={16} className="full-width">
            {dayPackages.map((item) => {
              const status = normalizePackageStatus(item.status);
              return (
                <div key={String(item.id)} style={{ padding: 16, borderRadius: 12, border: '1px solid #f0f0f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography.Text strong>{item.name}</Typography.Text>
                    <Tag color={PACKAGE_STATUS_COLOR[status]}>{PACKAGE_STATUS[status]}</Tag>
                  </div>
                  <Typography.Text type="secondary" style={{ display: 'block', marginTop: 6, fontSize: 12 }}>
                    下发时刻：{item.publishTime || '09:00'}
                  </Typography.Text>
                  {item.description && (
                    <Typography.Paragraph type="secondary" ellipsis={{ rows: 2 }} style={{ marginTop: 6, marginBottom: 0 }}>
                      {item.description}
                    </Typography.Paragraph>
                  )}
                  {status === 'ACTIVE' ? (
                    <Button danger size="small" style={{ marginTop: 12 }} onClick={() => cancelPackage(item)}>撤销</Button>
                  ) : (
                    <Typography.Text type="secondary" style={{ display: 'block', marginTop: 12, fontSize: 12 }}>
                      已下发，请到任务管理停用
                    </Typography.Text>
                  )}
                </div>
              );
            })}
          </Space>
        )}
      </Drawer>

      <PackageModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={() => { void loadPackages(month); }}
      />
    </Space>
  );
}
