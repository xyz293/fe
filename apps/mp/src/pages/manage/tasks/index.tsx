import { Button, Input, Picker, Text, View } from '@tarojs/components';
import { useDidShow } from '@tarojs/taro';
import { useState } from 'react';
import type { CreateTaskRequest, Task } from '@xiaoa/share/types';
import { sharedApi } from '../../../utils/sharedAdapter';

const frequencyOptions = ['每日', '每周', '每月'];
const frequencyValue = [1, 2, 3] as const;

export default function ManageTasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState('');
  const [frequencyIndex, setFrequencyIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const loadTasks = () => { sharedApi.getMyTasks().then(setTasks).catch((requestError) => setError(requestError instanceof Error ? requestError.message : '任务加载失败')); };
  useDidShow(loadTasks);
  const createTask = async () => {
    if (!title.trim()) return;
    setLoading(true);
    const data: CreateTaskRequest = { title: title.trim(), formType: 1, frequency: frequencyValue[frequencyIndex], targetScope: 3, targetIds: [], judgeType: 1 };
    try { await sharedApi.createTask(data); setTitle(''); await loadTasks(); } catch (requestError) { setError(requestError instanceof Error ? requestError.message : '任务创建失败'); } finally { setLoading(false); }
  };
  const toggleTask = async (task: Task) => { try { await sharedApi.updateTaskStatus(task.id, { status: task.status === 1 ? 2 : 1 }); await loadTasks(); } catch (requestError) { setError(requestError instanceof Error ? requestError.message : '任务状态更新失败'); } };
  return <View className="page"><View className="topbar"><View><Text className="page-title">任务管理</Text><Text className="page-subtitle">创建任务并查看员工执行进度</Text></View></View><View className="card"><Text className="section-label">新建任务</Text><Input className="chat-input" value={title} placeholder="例如：每日发布一条朋友圈" onInput={(event) => setTitle(event.detail.value)} /><Picker mode="selector" range={frequencyOptions} value={frequencyIndex} onChange={(event) => setFrequencyIndex(Number(event.detail.value))}><View className="secondary-button">周期：{frequencyOptions[frequencyIndex]}</View></Picker><Button className="primary-button" loading={loading} onClick={createTask}>创建任务</Button></View>{error && <View className="card"><Text className="muted">{error}</Text></View>}<View className="card"><Text className="section-label">任务列表</Text>{tasks.length === 0 && <Text className="muted">暂无可管理任务</Text>}{tasks.map((task) => <View className="task-line" key={String(task.id)}><View style={{ flex: 1 }}><Text>{task.title}</Text><Text className="muted" style={{ display: 'block', fontSize: '22px' }}>{frequencyOptions[task.frequency - 1]} · {task.status === 1 ? '生效' : '停用'}</Text></View><Button size="mini" onClick={() => toggleTask(task)}>{task.status === 1 ? '停用' : '启用'}</Button></View>)}</View></View>;
}
