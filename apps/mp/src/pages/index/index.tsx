import { Button, Text, View } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import { useState } from 'react';
import type { Task } from '@xiaoa/share/types';
import { useAppStore } from '../../store';
import { sharedApi } from '../../utils/sharedAdapter';

const entries = [
  { icon: '✍️', title: '写文案', copy: '朋友圈 / 小红书', url: '/pages/chat/index' },
  { icon: '💍', title: '做配图', copy: '婚戒氛围海报', url: '/pages/pro/index?type=image' },
  { icon: '🎬', title: '做视频', copy: '门店短视频', url: '/pages/pro/index?type=video' },
  { icon: '💬', title: '聊思路', copy: '让 AI 帮你想', url: '/pages/chat/index' },
];

function getTaskId(task: Task) {
  return String(task.id);
}

export default function HomePage() {
  const user = useAppStore((state) => state.user);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadTasks = () => {
    setLoading(true);
    setError('');
    sharedApi.getMyTasks()
      .then(setTasks)
      .catch((requestError) => setError(requestError instanceof Error ? requestError.message : '任务加载失败'))
      .finally(() => setLoading(false));
  };

  useDidShow(loadTasks);

  const go = (url: string) => Taro.navigateTo({ url });
  const completed = tasks.filter((task) => task.recordStatus === 1).length;
  const firstPending = tasks.find((task) => task.recordStatus !== 1);
  const progress = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;

  return (
    <View className="page">
      <View className="topbar"><View className="brand-row"><Text className="brand-mark">AI</Text><View><Text className="page-title" style={{ fontSize: '32px' }}>{user?.storeName || '我的门店'}</Text><Text className="page-subtitle">今天也为爱创作</Text></View></View><Text style={{ fontSize: '36px' }} onClick={() => Taro.switchTab({ url: '/pages/messages/index' })}>🔔</Text></View>
      <View className="hero-card"><Text className="hero-eyebrow">JEWELRY · CONTENT STUDIO</Text><Text className="hero-title">把每一份心意，写成值得分享的故事</Text><Text className="hero-copy">婚戒、钻石与婚礼内容，一句话就能开始。小AI陪你把灵感变成今天就能发布的内容。</Text></View>
      <View className="task-card card"><View className="task-head"><Text className="task-title">今日任务</Text><Text className="task-count">{completed} / {tasks.length}</Text></View><View className="task-progress"><View className="task-progress-fill" style={{ width: `${progress}%` }} /></View>{loading && <Text className="muted" style={{ fontSize: '24px' }}>正在同步任务…</Text>}{!loading && error && <View><Text className="muted" style={{ display: 'block', fontSize: '24px' }}>{error}</Text><Button className="secondary-button" style={{ marginTop: '18px' }} onClick={loadTasks}>重新加载</Button></View>}{!loading && !error && tasks.length === 0 && <Text className="muted" style={{ fontSize: '24px' }}>今日暂无任务，去创作吧</Text>}{!loading && !error && tasks.map((task) => <View className="task-line" key={getTaskId(task)} onClick={() => go(`/pages/chat/index?taskId=${getTaskId(task)}`)}><Text className={task.recordStatus === 1 ? 'task-dot' : 'task-dot todo'}>{task.recordStatus === 1 ? '✓' : '○'}</Text><Text>{task.title}</Text></View>)}{firstPending && <Button className="secondary-button" style={{ marginTop: '22px' }} onClick={() => go(`/pages/chat/index?taskId=${getTaskId(firstPending)}`)}>去完成</Button>}</View>
      <Text className="section-title">今天想做什么？</Text><View className="entry-grid">{entries.map((entry) => <View className="entry-item" key={entry.title} onClick={() => go(entry.url)}><Text className="entry-icon">{entry.icon}</Text><Text className="entry-title">{entry.title}</Text><Text className="entry-copy">{entry.copy}</Text></View>)}</View>
      <View className="voice-button" onClick={() => Taro.showToast({ title: '语音识别接口待接入', icon: 'none' })}><Text style={{ marginRight: '12px', fontSize: '32px' }}>🎤</Text><Text>按住说话，我来帮你写</Text></View>
      <View className="card" style={{ marginTop: '24px' }}><Text className="section-title" style={{ margin: 0 }}>任务完成情况</Text><Text className="balance">{completed} / {tasks.length}</Text><Text className="muted" style={{ fontSize: '22px' }}>{tasks.length ? '数据来自 /api/task/my' : '当前周期没有命中任务'}</Text></View>
    </View>
  );
}
