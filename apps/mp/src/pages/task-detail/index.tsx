import { Button, Text, View } from '@tarojs/components';
import Taro, { useLoad } from '@tarojs/taro';
import { useState } from 'react';
import type { Task } from '@xiaoa/share/types';
import { sharedApi } from '../../utils/sharedAdapter';

const FREQUENCY_LABELS: Record<number, string> = { 1: '每日', 2: '每周', 3: '每月' };
const SCOPE_LABELS: Record<number, string> = { 1: '全员', 2: '区域', 3: '门店', 4: '员工' };
const FORM_TYPE_LABELS: Record<number, string> = { 1: '固定动作任务', 2: '指定内容任务' };

function line(label: string, value?: string | number | null) {
  return (
    <View className="task-line" key={label} style={{ alignItems: 'flex-start' }}>
      <Text className="muted" style={{ width: '150px', flexShrink: 0, fontSize: '24px' }}>{label}</Text>
      <Text style={{ flex: 1, fontSize: '25px' }}>{value === undefined || value === null || value === '' ? '-' : value}</Text>
    </View>
  );
}

/**
 * 任务详情（GET /api/task/{id}，readme §4.15，登录可查）。
 * 我的完成态（recordStatus/publishRecordId）以 GET /api/task/my 的周期记录为准。
 * 未完成时提供「对话创作 / 专业模式」两个入口，创作后经作品详情提交发布记录核销。
 */
export default function TaskDetailPage() {
  const [taskId, setTaskId] = useState('');
  const [task, setTask] = useState<Task | null>(null);
  const [recordStatus, setRecordStatus] = useState<0 | 1 | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useLoad((params) => {
    if (!params.id) { setError('缺少任务 ID'); setLoading(false); return; }
    setTaskId(params.id);
    sharedApi.getTask(params.id)
      .then(setTask)
      .catch((requestError) => setError(requestError instanceof Error ? requestError.message : '任务加载失败'))
      .finally(() => setLoading(false));
    sharedApi.getMyTasks()
      .then((list) => {
        const mine = list.find((item) => String(item.id) === String(params.id));
        if (mine) {
          setRecordStatus(mine.recordStatus);
          if (mine.periodDate) setTask((current) => (current ? { ...current, periodDate: current.periodDate || mine.periodDate } : current));
        }
      })
      .catch(() => undefined);
  });

  const goCreate = (mode: 'chat' | 'pro') => {
    if (!taskId) return;
    if (mode === 'chat') Taro.navigateTo({ url: `/pages/chat/index?taskId=${taskId}` });
    else Taro.navigateTo({ url: `/pages/pro/index?taskId=${taskId}` });
  };

  const finished = recordStatus === 1;

  return (
    <View className="page">
      <View className="chat-header"><Text className="back-button" onClick={() => Taro.navigateBack()}>‹</Text><Text className="chat-title">任务详情</Text><Text className="chat-scene">{task ? (task.status === 1 ? '进行中' : '已停用') : ''}</Text></View>

      {loading && <View className="card"><Text className="muted">正在加载任务…</Text></View>}
      {error && <View className="card"><Text className="muted">{error}</Text></View>}

      {!loading && !error && task && (
        <>
          <View className="card">
            <View className="row-between">
              <Text className="page-title" style={{ fontSize: '34px', flex: 1 }}>{task.title}</Text>
              <Text className={`status-tag ${task.status === 1 ? 'status-ready' : 'status-draft'}`} style={{ marginTop: 0, marginLeft: '12px' }}>{task.status === 1 ? '进行中' : '已停用'}</Text>
            </View>
            <View className="notice-bar" style={{ marginTop: '18px' }}>
              <Text>{finished ? '✓ 本周期已完成，发布记录已核销' : '○ 本周期还未完成，去创作发布即可核销'}</Text>
            </View>
          </View>

          <View className="card">
            <Text className="section-label">任务要求</Text>
            {line('任务类型', FORM_TYPE_LABELS[task.formType] || task.formType)}
            {line('发布平台', task.platform)}
            {line('完成周期', `${FREQUENCY_LABELS[task.frequency] || task.frequency}${task.periodDate ? ` · 本周期 ${task.periodDate}` : ''}`)}
            {line('执行对象', SCOPE_LABELS[task.targetScope] || task.targetScope)}
            {line('完成判定', task.judgeType === 2 ? '需截图凭证（发布时必须上传发布截图）' : '直接完成')}
            {line('开始时间', task.startAt)}
            {line('截止时间', task.endAt)}
            {task.formType === 2 && task.contentPackageId ? line('关联内容包', `#${task.contentPackageId}`) : null}
          </View>

          {task.status === 1 && !finished && (
            <View className="card">
              <Text className="section-label">去完成</Text>
              <Text className="muted" style={{ display: 'block', fontSize: '22px', marginBottom: '16px' }}>选一种创作方式，生成作品后回到作品详情提交发布记录</Text>
              <Button className="primary-button" onClick={() => goCreate('chat')}>💬 对话创作（AI 帮你写文案）</Button>
              <Button className="secondary-button" style={{ marginTop: '16px' }} onClick={() => goCreate('pro')}>🎛 专业模式（自主生成配图/视频）</Button>
            </View>
          )}
          {finished && (
            <Button className="secondary-button" onClick={() => Taro.switchTab({ url: '/pages/works/index' })}>查看我的作品</Button>
          )}
        </>
      )}
    </View>
  );
}
