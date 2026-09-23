import { Button, Text, View } from '@tarojs/components';
import Taro, { useLoad } from '@tarojs/taro';
import { useEffect, useState } from 'react';
import type { AsyncTask } from '@xiaoa/share/types';
import { sharedApi } from '../../utils/sharedAdapter';

export default function GeneratingPage() {
  const [task, setTask] = useState<AsyncTask | null>(null);
  const [failed, setFailed] = useState(false);
  const [taskId, setTaskId] = useState('');
  const [error, setError] = useState('');
  useLoad((params) => { if (params.taskId) setTaskId(params.taskId); });
  useEffect(() => {
    if (!taskId) return undefined;
    let active = true;
    const load = () => { sharedApi.getAsyncTask(taskId).then((result) => { if (active) { setTask(result); setFailed(result.status === 'FAILED'); if (result.status === 'FAILED') setError(result.errorMessage || '生成失败'); } }).catch((requestError) => { if (active) setError(requestError instanceof Error ? requestError.message : '任务查询失败'); }); };
    load();
    const timer = setInterval(load, 3000);
    return () => { active = false; clearInterval(timer); };
  }, [taskId]);
  const progress = task?.progress || 0;
  const finish = () => Taro.redirectTo({ url: `/pages/work-detail/index?id=${task?.result?.workId || ''}` });
  return <View className="page"><View className="chat-header"><Text className="back-button" onClick={() => Taro.navigateBack()}>‹</Text><Text className="chat-title">生成任务</Text><Text className="chat-scene">后台运行</Text></View><View className="progress-card card">{failed || error ? <><Text style={{ display: 'block', fontSize: '70px' }}>↻</Text><Text className="page-title" style={{ marginTop: '18px', fontSize: '38px' }}>这次生成没有完成</Text><Text className="hero-copy" style={{ margin: '16px auto' }}>{error || '请调整素材后再次尝试。'}</Text><Button className="primary-button" style={{ marginTop: '30px' }} onClick={() => { setFailed(false); setError(''); }}>重新查询</Button></> : <><View className="progress-ring"><Text className="progress-number">{progress}%</Text></View><Text className="page-title" style={{ fontSize: '38px' }}>{task?.status === 'SUCCESS' ? '生成完成' : '生成中…'}</Text><Text className="hero-copy" style={{ margin: '16px auto' }}>正在把你的婚戒故事变成一段值得分享的短视频</Text><View className="progress-track"><View className="progress-fill" style={{ width: `${progress}%` }} /></View><Text className="muted" style={{ fontSize: '23px' }}>{task?.status === 'SUCCESS' ? '作品已生成，可以查看详情' : '任务状态来自后端接口'}</Text><View style={{ display: 'flex', gap: '16px', marginTop: '34px' }}><Button className="secondary-button" style={{ flex: 1 }} onClick={() => Taro.switchTab({ url: '/pages/index/index' })}>返回首页</Button><Button className="primary-button" style={{ flex: 1 }} disabled={task?.status !== 'SUCCESS'} onClick={finish}>查看作品</Button></View></>}</View></View>;
}
