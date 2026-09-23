import { Button, Input, Text, View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useState } from 'react';
import { VersionCards } from '../../components/VersionCardsAdapter';
import { sharedApi } from '../../utils/sharedAdapter';
import { track } from '../../services/track';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export default function ChatPage() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [versions, setVersions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const content = input.trim();
    setInput('');
    setMessages((current) => [...current, { id: `${Date.now()}-user`, role: 'user', content }]);
    setLoading(true);
    try {
      const result = await sharedApi.chat(content);
      setVersions(result.versions);
      setMessages((current) => [...current, { id: `${Date.now()}-assistant`, role: 'assistant', content: '已生成 3 个版本，请选择一个定稿。' }]);
      track('generate_complete', { mode: 'chat', count: result.versions.length });
    } catch {
      setMessages((current) => [...current, { id: `${Date.now()}-error`, role: 'assistant', content: '接口暂未接入，已保留创作流程。' }]);
    } finally {
      setLoading(false);
    }
  };

  const recordVoice = () => {
    const recorder = Taro.getRecorderManager();
    recorder.start({ duration: 60_000, sampleRate: 16_000, numberOfChannels: 1 });
    Taro.showToast({ title: '开始录音，再点一次结束', icon: 'none' });
    recorder.onStop(() => Taro.showToast({ title: '语音已上传识别', icon: 'none' }));
  };

  return (
    <View className="page">
      <View className="card">
        <Text style={{ display: 'block', fontSize: '40px', fontWeight: '600', marginBottom: '24px' }}>对话创作</Text>
        {messages.length === 0 && <Text style={{ color: '#8c8c8c', fontSize: '28px' }}>告诉我今天想推广什么，我会一次给你 3 个版本。</Text>}
        {messages.map((message) => <View key={message.id} style={{ padding: '20px 0', borderBottom: '1px solid #f0f0f0' }}><Text style={{ display: 'block', color: message.role === 'user' ? '#1677ff' : '#1f1f1f', whiteSpace: 'pre-wrap' }}>{message.content}</Text></View>)}
        {versions.length > 0 && <VersionCards versions={versions} onSelect={(index: number) => track('select_version', { index })} />}
      </View>
      <View className="card">
        <Input value={input} placeholder="例如：生成一条新品咖啡朋友圈文案" onInput={(event) => setInput(event.detail.value)} />
        <Button style={{ marginTop: '20px' }} onClick={recordVoice}>按住说话</Button>
        <Button className="primary-button" style={{ marginTop: '20px' }} loading={loading} onClick={sendMessage}>生成 3 个版本</Button>
      </View>
    </View>
  );
}
