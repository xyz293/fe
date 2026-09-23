import { Button, Text, View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useAppStore } from '../../store';

const entries = [
  { icon: '✍️', title: '写文案', copy: '朋友圈 / 小红书', url: '/pages/chat/index' },
  { icon: '💍', title: '做配图', copy: '婚戒氛围海报', url: '/pages/pro/index?type=image' },
  { icon: '🎬', title: '做视频', copy: '门店短视频', url: '/pages/pro/index?type=video' },
  { icon: '💬', title: '聊思路', copy: '让 AI 帮你想', url: '/pages/chat/index' },
];

const tasks = [
  { title: '发朋友圈', done: true },
  { title: '小红书种草', done: false },
  { title: '上传一张新品图', done: false },
];

export default function HomePage() {
  const user = useAppStore((state) => state.user);
  const go = (url: string) => Taro.navigateTo({ url });

  return (
    <View className="page">
      <View className="topbar">
        <View className="brand-row">
          <Text className="brand-mark">AI</Text>
          <View><Text className="page-title" style={{ fontSize: '32px' }}>{user?.storeName || '朝阳婚戒店'}</Text><Text className="page-subtitle">今天也为爱创作</Text></View>
        </View>
        <Text style={{ fontSize: '36px' }}>🔔</Text>
      </View>

      <View className="notice-bar"><Text style={{ marginRight: '12px' }}>✦</Text><Text>本店本月灵感额度还剩 86%，放心创作</Text></View>

      <View className="hero-card">
        <Text className="hero-eyebrow">JEWELRY · CONTENT STUDIO</Text>
        <Text className="hero-title">把每一份心意，写成值得分享的故事</Text>
        <Text className="hero-copy">婚戒、钻石与婚礼内容，一句话就能开始。小AI陪你把灵感变成今天就能发布的内容。</Text>
      </View>

      <View className="task-card card" onClick={() => go('/pages/chat/index?taskId=task-001')}>
        <View className="task-head"><Text className="task-title">今日任务</Text><Text className="task-count">1 / 3</Text></View>
        <View className="task-progress"><View className="task-progress-fill" style={{ width: '33%' }} /></View>
        {tasks.map((task) => <View className="task-line" key={task.title}><Text className={task.done ? 'task-dot' : 'task-dot todo'}>{task.done ? '✓' : '○'}</Text><Text>{task.title}</Text></View>)}
        <Button className="secondary-button" style={{ marginTop: '22px' }} onClick={() => go('/pages/chat/index?taskId=task-001')}>去完成</Button>
      </View>

      <Text className="section-title">今天想做什么？</Text>
      <View className="entry-grid">{entries.map((entry) => <View className="entry-item" key={entry.title} onClick={() => go(entry.url)}><Text className="entry-icon">{entry.icon}</Text><Text className="entry-title">{entry.title}</Text><Text className="entry-copy">{entry.copy}</Text></View>)}</View>

      <View className="voice-button" onClick={() => { Taro.showToast({ title: '已开始录音，再点一次结束', icon: 'none' }); }}><Text style={{ marginRight: '12px', fontSize: '32px' }}>🎤</Text><Text>按住说话，我来帮你写</Text></View>
      <View className="card" style={{ marginTop: '24px' }}><View className="row-between"><Text className="section-title" style={{ margin: 0 }}>本月创作额度</Text><Text className="gold" style={{ fontSize: '24px' }}>明细 ›</Text></View><Text className="balance">86 / 100</Text><View className="task-progress"><View className="task-progress-fill" style={{ width: '86%' }} /></View><Text className="muted" style={{ fontSize: '22px' }}>额度充足，继续完成你的婚戒故事吧</Text></View>
    </View>
  );
}
