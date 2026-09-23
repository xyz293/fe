import { Button, Input, Picker, Text, View } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import { useState } from 'react';
import type { CreateTaskRequest, Task, TaskBoard, TaskBoardItem } from '@xiaoa/share/types';
import { sharedApi } from '../../../utils/sharedAdapter';

const frequencyOptions = ['每日', '每周', '每月'];
const frequencyValue = [1, 2, 3] as const;

function today() { return new Date().toISOString().slice(0, 10); }

export default function ManageTasksPage() {
  const [board, setBoard] = useState<TaskBoard | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState('');
  const [frequencyIndex, setFrequencyIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadBoard = () => {
    // 文档 §10.3：GET /api/task/board?date={date}
    sharedApi.getTaskBoard(today()).then(setBoard).catch((requestError) => setError(requestError instanceof Error ? requestError.message : '看板加载失败'));
    sharedApi.getMyTasks().then(setTasks).catch(() => undefined);
  };
  useDidShow(loadBoard);

  const createTask = async () => {
    if (!title.trim()) return;
    setLoading(true);
    const data: CreateTaskRequest = { title: title.trim(), formType: 1, frequency: frequencyValue[frequencyIndex], targetScope: 3, targetIds: [], judgeType: 1 };
    try { await sharedApi.createTask(data); setTitle(''); await loadBoard(); } catch (requestError) { setError(requestError instanceof Error ? requestError.message : '任务创建失败'); } finally { setLoading(false); }
  };

  const toggleTask = async (task: Task) => {
    try { await sharedApi.updateTaskStatus(task.id, { status: task.status === 1 ? 2 : 1 }); await loadBoard(); }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : '任务状态更新失败'); }
  };

  const remindTask = async (item: TaskBoardItem) => {
    try { const count = await sharedApi.remindTask({ taskId: item.taskId, periodDate: item.periodDate }); Taro.showToast({ title: `已提醒 ${count} 人`, icon: 'success' }); }
    catch (requestError) { Taro.showToast({ title: requestError instanceof Error ? requestError.message : '提醒失败', icon: 'none' }); }
  };

  return (
    <View className="page">
      <View className="topbar"><View><Text className="page-title">任务管理</Text><Text className="page-subtitle">创建任务并查看员工执行进度</Text></View></View>
      <View className="card">
        <Text className="section-label">新建任务</Text>
        <Input className="chat-input" value={title} placeholder="例如：每日发布一条朋友圈" onInput={(event) => setTitle(event.detail.value)} />
        <Picker mode="selector" range={frequencyOptions} value={frequencyIndex} onChange={(event) => setFrequencyIndex(Number(event.detail.value))}><View className="secondary-button">周期：{frequencyOptions[frequencyIndex]}</View></Picker>
        <Button className="primary-button" loading={loading} onClick={createTask}>创建任务</Button>
      </View>
      {error && <View className="card"><Text className="muted">{error}</Text></View>}
      {board && board.tasks.length > 0 && (
        <View className="card">
          <Text className="section-label">任务看板（{board.date}）</Text>
          {board.tasks.map((item) => (
            <View className="task-line" key={String(item.taskId)}>
              <View style={{ flex: 1 }}>
                <Text>{item.title}</Text>
                <Text className="muted" style={{ display: 'block', fontSize: '22px' }}>
                  应完成 {item.expected} · 已完成 {item.finished} · 完成率 {Math.round(item.completionRate * 100)}%
                </Text>
              </View>
              <Button size="mini" onClick={() => remindTask(item)}>提醒</Button>
            </View>
          ))}
        </View>
      )}
      <View className="card">
        <Text className="section-label">任务列表</Text>
        {tasks.length === 0 && <Text className="muted">暂无可管理任务</Text>}
        {tasks.map((task) => (
          <View className="task-line" key={String(task.id)}>
            <View style={{ flex: 1 }}>
              <Text>{task.title}</Text>
              <Text className="muted" style={{ display: 'block', fontSize: '22px' }}>
                {frequencyOptions[task.frequency - 1]} · {task.status === 1 ? '生效' : '停用'}
              </Text>
            </View>
            <Button size="mini" onClick={() => toggleTask(task)}>{task.status === 1 ? '停用' : '启用'}</Button>
          </View>
        ))}
      </View>
    </View>
  );
}
