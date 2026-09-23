import { Button, Input, ScrollView, Text, View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useState } from 'react';

const versions = [
  { tag: '轻奢风', content: '一枚戒指，藏着两个人对未来的想象。新款钻戒抵达门店，欢迎来挑选属于你们的那一束光。' },
  { tag: '婚庆风', content: '好事成双，爱也成双。为心爱的TA挑一枚闪耀对戒，让每一次牵手，都有幸福作证。' },
  { tag: '国风', content: '执子之手，以玉为盟。温润如玉的东方设计，把相守一生的承诺，戴在彼此身边。' },
];

export default function ChatPage() {
  const [input, setInput] = useState('');
  const [selected, setSelected] = useState(1);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const sendMessage = () => {
    if (!input.trim() || loading) return;
    setLoading(true);
    setTimeout(() => { setLoading(false); setSent(true); setInput(''); }, 900);
  };

  const refine = () => { setInput('再喜庆一点，更适合婚礼季'); Taro.showToast({ title: '已把微调方向填入输入框', icon: 'none' }); };
  const finish = () => { Taro.showToast({ title: '已存入我的作品', icon: 'success' }); };

  return (
    <View className="page">
      <View className="chat-header"><Text className="back-button" onClick={() => Taro.navigateBack()}>‹</Text><Text className="chat-title">新对话</Text><Text className="chat-scene">写文案 ▾</Text></View>
      <View className="card" style={{ padding: '22px' }}>
        <View className="chat-flow">
          <View className="bubble bubble-ai">想发什么场景的朋友圈？<Text className="muted" style={{ display: 'block', marginTop: '8px', fontSize: '22px' }}>可以告诉我商品、节日和想表达的感觉</Text></View>
          <View className="bubble bubble-user">新款黄金对戒到货了，想写得浪漫一点</View>
          {loading && <View className="bubble bubble-ai typing">AI 正在为你组织这份心意 ···</View>}
          {!loading && <View className="bubble bubble-ai">好的，给你 3 个版本，选择最像你们故事的表达👇</View>}
          {sent && <View className="bubble bubble-user">再喜庆一点，更适合婚礼季</View>}
          <ScrollView className="version-scroll" scrollX>{versions.map((version, index) => <View className={selected === index ? 'version-card selected' : 'version-card'} key={version.tag} onClick={() => setSelected(index)}><Text className="version-tag">版本 {index + 1} · {version.tag}</Text><Text className="version-content">{version.content}</Text><View className="version-actions"><Text className="mini-action">{selected === index ? '✓ 已选定' : '选择此版'}</Text><Text className="mini-action" onClick={refine}>微调</Text><Text className="mini-action" onClick={finish}>定稿</Text></View></View>)}</ScrollView>
        </View>
        <Text className="section-label">继续告诉我你的想法</Text>
        <View className="chat-input-row"><Text className="voice-button" style={{ padding: '17px', fontSize: '24px' }} onClick={() => Taro.showToast({ title: '松开后将自动识别语音', icon: 'none' })}>🎤</Text><Input className="chat-input" value={input} placeholder="例如：再喜庆一点" onInput={(event) => setInput(event.detail.value)} /><Text className="send-button" onClick={sendMessage}>发送</Text></View>
      </View>
      <View className="card"><Text className="section-label">灵感提示</Text><View className="pill-row"><Text className="pill" onClick={() => setInput('写一条520爱的礼物季文案')}>520爱的礼物季</Text><Text className="pill" onClick={() => setInput('突出钻石的火彩与寓意')}>突出钻石火彩</Text><Text className="pill" onClick={() => setInput('适合门店顾问口吻')}>顾问口吻</Text></View><Button className="secondary-button" style={{ marginTop: '24px' }} onClick={() => Taro.navigateTo({ url: '/pages/pro/index' })}>去配图，做成一套内容 ›</Button></View>
    </View>
  );
}
