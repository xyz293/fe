import { Button, Card, Empty, Image, Space, Spin, Tag, Typography, message } from 'antd';
import { AuditOutlined, CheckOutlined, CloseOutlined, ReloadOutlined } from '@ant-design/icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { AuditWorkItem } from '@xiaoa/share/types';
import { workApi } from '../../services/sharedApi';
import { RejectModal } from './RejectModal';

interface PageProps { title: string; description: string; }

function PageHeading({ title, description, action }: PageProps & { action?: React.ReactNode }) {
  return (
    <div className="page-heading">
      <div className="page-heading-copy">
        <Typography.Title level={2}>{title}</Typography.Title>
        <Typography.Text>{description}</Typography.Text>
      </div>
      <div className="page-actions">{action}</div>
    </div>
  );
}

function formatTime(value?: string | null) { return value ? new Date(value).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-'; }

/**
 * 内容审核队列（卡片流）。
 * 数据源 GET /api/admin/audit/works?status=PENDING_AUDIT（后端按数据范围裁剪：
 * 本店/本区域/全域由角色决定，前端不做本地裁剪）。
 */
export function AuditQueuePage({ title, description }: PageProps) {
  const [list, setList] = useState<AuditWorkItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<AuditWorkItem | null>(null);
  const [rejectLoading, setRejectLoading] = useState(false);
  const [leavingIds, setLeavingIds] = useState<string[]>([]);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => () => { timersRef.current.forEach(clearTimeout); }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await workApi.auditList({ status: 'PENDING_AUDIT', pageNo: 1, pageSize: 50 });
      setList(Array.isArray(result) ? result : (result.list ?? []));
    } catch (e) {
      if (e instanceof Error) message.error(e.message || '待审列表加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  /** 通过/驳回成功后卡片淡出再移除 */
  const fadeOut = (id: string) => {
    setLeavingIds((current) => [...current, id]);
    timersRef.current.push(setTimeout(() => {
      setList((current) => current.filter((item) => String(item.id) !== id));
      setLeavingIds((current) => current.filter((item) => item !== id));
    }, 400));
  };

  /** 并发处理：接口返回"状态已变更"→ 提示已被其他管理员处理并刷新列表 */
  const handleActionError = (error: unknown) => {
    const msg = error instanceof Error ? error.message : '操作失败';
    if (msg.includes('状态已变更') || msg.includes('已被')) {
      message.warning('该作品已被其他管理员处理');
      void load();
    } else {
      message.error(msg);
    }
  };

  const approve = async (item: AuditWorkItem) => {
    setProcessingId(String(item.id));
    try {
      await workApi.approveAuditWork(item.id);
      message.success('已通过，作品进入可发布状态');
      fadeOut(String(item.id));
    } catch (error) {
      handleActionError(error);
    } finally {
      setProcessingId(null);
    }
  };

  const reject = async (opinion: string) => {
    if (!rejecting) return;
    setRejectLoading(true);
    try {
      await workApi.rejectAuditWork(rejecting.id, { opinion });
      message.success('已驳回，作者可在小程序改稿重提');
      fadeOut(String(rejecting.id));
      setRejecting(null);
    } catch (error) {
      handleActionError(error);
    } finally {
      setRejectLoading(false);
    }
  };

  return (
    <Space direction="vertical" size={20} className="full-width">
      <PageHeading
        title={title}
        description={description}
        action={<Button icon={<ReloadOutlined />} onClick={() => void load()}>刷新</Button>}
      />
      <Card>
        <Space style={{ marginBottom: 16 }}>
          <Typography.Text strong>待审核作品（{list.length}）</Typography.Text>
          <Tag color="blue" icon={<AuditOutlined />}>数据范围：本店/本区域/全域（由角色决定）</Tag>
        </Space>
        {loading && list.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 48 }}><Spin /></div>
        ) : list.length === 0 ? (
          <Empty description="暂无待审核作品" style={{ padding: 32 }}>
            <Button onClick={() => void load()}>重新加载</Button>
          </Empty>
        ) : (
          <Space direction="vertical" size={12} className="full-width">
            {list.map((item) => {
              const leaving = leavingIds.includes(String(item.id));
              const caption = item.caption || item.summary || '';
              return (
                <div
                  key={String(item.id)}
                  style={{
                    display: 'flex', gap: 16, padding: 16, borderRadius: 12, border: '1px solid #f0f0f0',
                    opacity: leaving ? 0.15 : 1, transition: 'opacity 0.35s ease',
                  }}
                >
                  {item.coverUrl ? (
                    <Image src={item.coverUrl} alt={item.title || '作品封面'} width={96} height={96} style={{ borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 96, height: 96, borderRadius: 8, background: '#f5f5f5', flexShrink: 0 }}>🖼</div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Typography.Text strong style={{ fontSize: 15 }}>{item.title || '未命名作品'}</Typography.Text>
                    <div style={{ marginTop: 4 }}>
                      <Typography.Text type="secondary">
                        提交人：{item.submitterName || '匿名'}（{item.storeName || '-'}） · {formatTime(item.submittedAt)}
                      </Typography.Text>
                    </div>
                    {caption && (
                      <Typography.Paragraph type="secondary" ellipsis={{ rows: 2 }} style={{ marginTop: 6, marginBottom: 0 }}>
                        {caption}
                      </Typography.Paragraph>
                    )}
                  </div>
                  <Space>
                    <Button type="primary" icon={<CheckOutlined />} loading={processingId === String(item.id)} disabled={leaving} onClick={() => void approve(item)}>通过</Button>
                    <Button danger icon={<CloseOutlined />} disabled={leaving} onClick={() => setRejecting(item)}>驳回</Button>
                  </Space>
                </div>
              );
            })}
          </Space>
        )}
      </Card>
      <RejectModal
        open={Boolean(rejecting)}
        work={rejecting}
        confirmLoading={rejectLoading}
        onCancel={() => setRejecting(null)}
        onOk={(opinion) => void reject(opinion)}
      />
    </Space>
  );
}
