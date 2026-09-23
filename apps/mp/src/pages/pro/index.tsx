import { Button, Input, Text, View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useState } from 'react';
import { request } from '../../utils/request';

export default function ProPage() {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    if (!prompt.trim()) return Taro.showToast({ title: '请先描述创作需求', icon: 'none' });
    setLoading(true);
    try {
      const result = await request<{ taskId?: string; workId?: string }>('/generate', { method: 'POST', data: { prompt, mode: 'pro' } });
      Taro.navigateTo({ url: result.taskId ? `/pages/generating/index?taskId=${result.taskId}` : `/pages/work-detail/index?id=${result.workId}` });
    } catch {
      Taro.showToast({ title: '生成接口暂未接入', icon: 'none' });
    } finally {
      setLoading(false);
    }
  };

  return <View className="page"><View className="card"><Text style={{ display: 'block', fontSize: '40px', fontWeight: '600', marginBottom: '24px' }}>专业模式</Text><Text style={{ display: 'block', color: '#8c8c8c', marginBottom: '24px' }}>上传素材并补充提示词，获得更精准的内容。</Text><Input className="card" placeholder="写下你的提示词" value={prompt} onInput={(event) => setPrompt(event.detail.value)} /><Button className="primary-button" loading={loading} onClick={generate}>开始生成</Button></View></View>;
}
