import { Text, View } from '@tarojs/components';
import Taro, { useLoad } from '@tarojs/taro';
import { useState } from 'react';
import { pollTask } from '../../utils/task';

export default function GeneratingPage() {
  const [progress, setProgress] = useState(0);
  useLoad(async (params) => {
    if (!params.taskId) return;
    try {
      const result = await pollTask(params.taskId, 3000, 10 * 60 * 1000);
      setProgress(100);
      Taro.redirectTo({ url: `/pages/work-detail/index?id=${result.result?.workId || ''}` });
    } catch {
      Taro.showToast({ title: '生成失败，请稍后重试', icon: 'none' });
    }
  });
  return <View className="page"><View className="card" style={{ textAlign: 'center', marginTop: '160px' }}><Text style={{ display: 'block', fontSize: '42px', fontWeight: '600', marginBottom: '24px' }}>正在生成内容</Text><Text style={{ color: '#8c8c8c' }}>已完成 {progress}%，请不要关闭页面</Text></View></View>;
}
