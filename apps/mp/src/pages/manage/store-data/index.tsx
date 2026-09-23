import { Button, Progress, Text, View } from '@tarojs/components';
import { useDidShow } from '@tarojs/taro';
import { useState } from 'react';
import { useAppStore } from '../../../store';
import { sharedApi } from '../../../utils/sharedAdapter';
import type { StoreBoard } from '@xiaoa/share/types';

function today() { return new Date().toISOString().slice(0, 10); }

export default function StoreDataPage() {
  const user = useAppStore((state) => state.user);
  const [board, setBoard] = useState<StoreBoard | null>(null);
  const [error, setError] = useState('');
  const loadBoard = () => { if (!user?.storeId) return; sharedApi.getStoreBoard(user.storeId, today()).then(setBoard).catch((requestError) => setError(requestError instanceof Error ? requestError.message : '门店数据加载失败')); };
  useDidShow(loadBoard);
  return <View className="page"><View className="topbar"><View><Text className="page-title">门店数据</Text><Text className="page-subtitle">查看当前周期任务完成情况</Text></View><Button size="mini" onClick={loadBoard}>刷新</Button></View>{error && <View className="card"><Text className="muted">{error}</Text></View>}{board ? <><View className="card"><Text className="section-label">完成率</Text><Text className="balance">{Math.round(board.completionRate * 100)}%</Text><Progress percent={Math.round(board.completionRate * 100)} activeColor="#c9a46c" /><Text className="muted">已完成 {board.finished} / 应完成 {board.expected}</Text></View><View className="card"><Text className="section-label">未完成记录</Text>{board.unfinished.length === 0 && <Text className="muted">当前周期已全部完成</Text>}{board.unfinished.map((record) => <View className="task-line" key={String(record.id)}><Text>任务 #{record.taskId}</Text><Text className="muted">员工 #{record.userId}</Text></View>)}</View></> : !error && <View className="card"><Text className="muted">正在加载门店看板…</Text></View>}</View>;
}
