import { Button, Text, View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useEffect, useState } from 'react';

export default function GeneratingPage() {
  const [progress, setProgress] = useState(60);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setProgress((current) => current >= 96 ? current : current + 8), 900);
    return () => clearInterval(timer);
  }, []);

  const finish = () => { setProgress(100); setTimeout(() => Taro.redirectTo({ url: '/pages/work-detail/index?id=video-520' }), 300); };

  return <View className="page"><View className="chat-header"><Text className="back-button" onClick={() => Taro.navigateBack()}>‹</Text><Text className="chat-title">生成任务</Text><Text className="chat-scene">后台运行</Text></View><View className="progress-card card">{failed ? <><Text style={{ display: 'block', fontSize: '70px' }}>↻</Text><Text className="page-title" style={{ marginTop: '18px', fontSize: '38px' }}>这次生成没有完成</Text><Text className="hero-copy" style={{ margin: '16px auto' }}>额度已自动退回，可以调整素材后再次尝试。</Text><Button className="primary-button" style={{ marginTop: '30px' }} onClick={() => setFailed(false)}>重新生成</Button></> : <><View className="progress-ring"><Text className="progress-number">{progress}%</Text></View><Text className="page-title" style={{ fontSize: '38px' }}>视频生成中…</Text><Text className="hero-copy" style={{ margin: '16px auto' }}>正在把你的婚戒故事变成一段值得分享的短视频</Text><View className="progress-track"><View className="progress-fill" style={{ width: `${progress}%` }} /></View><Text className="muted" style={{ fontSize: '23px' }}>预计还需 2 分钟 · 可以离开，完成后通知你</Text><View style={{ display: 'flex', gap: '16px', marginTop: '34px' }}><Button className="secondary-button" style={{ flex: 1 }} onClick={() => Taro.switchTab({ url: '/pages/index/index' })}>返回首页</Button><Button className="primary-button" style={{ flex: 1 }} onClick={finish}>查看任务</Button></View><Text className="gold" style={{ display: 'block', marginTop: '28px', fontSize: '22px' }} onClick={() => setFailed(true)}>模拟生成失败 ›</Text></>}</View></View>;
}
