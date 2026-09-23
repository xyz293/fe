import { Card, Progress, Space, Tag, Tree, Typography, message } from 'antd';
import type { DataNode, EventDataNode } from 'antd/es/tree';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import type { TaskBoard, TaskBoardItem, TaskBoardRecord, TaskStoreSummary } from '@xiaoa/share/types';
import { sharedApi } from '../services/sharedApi';

const scopeLabels = ['-', '全域', '区域', '门店', '员工'];

interface BoardTreeNode extends DataNode {
  children?: BoardTreeNode[];
}

type StoreCache = Record<string, TaskStoreSummary[]>;
type RecordCache = Record<string, TaskBoardRecord[]>;

export interface TaskBoardTreeProps {
  /** 统计周期日期（yyyy-MM-DD） */
  date: string;
  /** 变更时强制重新加载看板并重置树展开状态 */
  refreshKey?: number;
  /** 任务节点上附加的操作按钮（如报表、提醒） */
  renderTaskActions?: (task: TaskBoardItem) => ReactNode;
}

function rateProgress(value: number) {
  return <Progress percent={Math.round((value || 0) * 100)} size="small" strokeColor="#c9a46c" style={{ width: 120, marginBottom: 0 }} />;
}

function taskTitle(task: TaskBoardItem, actions?: ReactNode) {
  return (
    <Space size={8} wrap>
      <Typography.Text strong>{task.title}</Typography.Text>
      <Tag color={task.status === 1 ? 'green' : 'default'}>{task.status === 1 ? '生效' : '停用'}</Tag>
      <Tag>{scopeLabels[task.targetScope] || task.targetScope}</Tag>
      <Typography.Text type="secondary">周期 {task.periodDate} · 应完成 {task.expected} · 已完成 {task.finished}</Typography.Text>
      {rateProgress(task.completionRate)}
      {actions}
    </Space>
  );
}

function storeTitle(store: TaskStoreSummary) {
  return (
    <Space size={8} wrap>
      <Typography.Text strong>{store.storeName}</Typography.Text>
      <Typography.Text type="secondary">门店 #{store.storeId} · 应完成 {store.expected} · 已完成 {store.finished}</Typography.Text>
      {rateProgress(store.completionRate)}
    </Space>
  );
}

function recordTitle(record: TaskBoardRecord) {
  return (
    <Space size={8} wrap>
      <Typography.Text>{record.nickname || `用户${record.userId}`}</Typography.Text>
      <Tag color={record.status === 1 ? 'green' : 'orange'}>{record.status === 1 ? '已完成' : '未完成'}</Tag>
      {record.finishedAt && <Typography.Text type="secondary">完成于 {record.finishedAt}</Typography.Text>}
      {record.proofUrl && <a href={record.proofUrl} target="_blank" rel="noreferrer">查看凭证</a>}
    </Space>
  );
}

function placeholder(key: string, text: string): BoardTreeNode {
  return { key, isLeaf: true, title: <Typography.Text type="secondary">{text}</Typography.Text> };
}

/** 总看板 → 门店汇总 → 员工明细，按缓存装配成一棵树；未加载的下级 children 为空交给 loadData 懒加载 */
function buildTreeData(
  tasks: TaskBoardItem[],
  storeCache: StoreCache,
  recordCache: RecordCache,
  renderTaskActions?: (task: TaskBoardItem) => ReactNode,
): BoardTreeNode[] {
  return tasks.map((task) => {
    const taskKey = `task-${task.taskId}`;
    const stores = storeCache[taskKey];
    let children: BoardTreeNode[] | undefined;
    if (stores) {
      children = stores.length
        ? stores.map((store) => {
            const storeKey = `${taskKey}-store-${store.storeId}`;
            const records = recordCache[storeKey];
            return {
              key: storeKey,
              title: storeTitle(store),
              children: records
                ? records.length
                  ? records.map((record): BoardTreeNode => ({ key: `${storeKey}-record-${record.id}`, isLeaf: true, title: recordTitle(record) }))
                  : [placeholder(`${storeKey}-empty`, '该门店暂无员工执行记录')]
                : undefined,
            };
          })
        : [placeholder(`${taskKey}-empty`, '该任务暂无门店汇总数据')];
    }
    return { key: taskKey, title: taskTitle(task, renderTaskActions?.(task)), children };
  });
}

export function TaskBoardTree({ date, refreshKey = 0, renderTaskActions }: TaskBoardTreeProps) {
  const [board, setBoard] = useState<TaskBoard | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [storeCache, setStoreCache] = useState<StoreCache>({});
  const [recordCache, setRecordCache] = useState<RecordCache>({});

  // 日期或 refreshKey 变化时清空懒加载缓存并重新拉取总看板；Tree key 随之变化实现重挂载，重置内部展开/已加载状态
  useEffect(() => {
    setStoreCache({});
    setRecordCache({});
    setLoading(true);
    setError('');
    sharedApi.getTaskBoard(date)
      .then(setBoard)
      .catch((requestError) => setError(requestError instanceof Error ? requestError.message : '看板加载失败'))
      .finally(() => setLoading(false));
  }, [date, refreshKey]);

  const loadData = async (node: EventDataNode<DataNode>) => {
    const key = String(node.key);
    try {
      // 第二级：task-{taskId}-store-{storeId} → 员工明细
      const storeMatch = key.match(/^task-(.+)-store-(.+)$/);
      if (storeMatch) {
        const [, taskId, storeId] = storeMatch;
        const records = await sharedApi.getTaskBoardRecords(taskId, storeId, date);
        setRecordCache((prev) => ({ ...prev, [key]: records }));
        return;
      }
      // 第一级：task-{taskId} → 门店汇总
      if (key.startsWith('task-')) {
        const taskId = key.slice('task-'.length);
        const stores = await sharedApi.getTaskStoreSummary(taskId, date);
        setStoreCache((prev) => ({ ...prev, [key]: stores }));
        return;
      }
    } catch (requestError) {
      message.error(requestError instanceof Error ? requestError.message : '下级数据加载失败');
      throw requestError; // 保持节点未加载状态，收起后可重试
    }
  };

  return (
    <Card
      title="任务执行下钻树"
      extra={<Typography.Text type="secondary">任务 → 门店汇总 → 员工明细，点击箭头逐级展开</Typography.Text>}
      loading={loading}
    >
      {error && <Typography.Text type="danger">{error}</Typography.Text>}
      {board && board.tasks.length > 0 ? (
        <Tree
          key={`${date}#${refreshKey}`}
          treeData={buildTreeData(board.tasks, storeCache, recordCache, renderTaskActions)}
          loadData={loadData}
          showLine={{ showLeafIcon: false }}
          blockNode
          selectable={false}
        />
      ) : (
        !loading && !error && <Typography.Text type="secondary">当前日期暂无任务数据</Typography.Text>
      )}
    </Card>
  );
}
