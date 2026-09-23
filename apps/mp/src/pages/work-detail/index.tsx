import { Button, Text, View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { track } from '../../services/track';

export default function WorkDetailPage() {
  const copyAndSave = async () => {
    await Taro.setClipboardData({ data: '今天到店，享受一杯专属好心情。' });
    track('click_publish', { workId: 'demo-work' });
    Taro.showToast({ title: '已复制文案并存图，去朋友圈粘贴发布', icon: 'none' });
  };
  return <View className="page"><View className="card"><Text style={{ display: 'block', fontSize: '42px', fontWeight: '600', marginBottom: '20px' }}>春日新品推广</Text><Text style={{ display: 'block', lineHeight: '1.8' }}>春风已至，新品正好。到店解锁春日限定风味，和喜欢的人分享今天的好心情。</Text></View><Button className="primary-button" onClick={copyAndSave}>发朋友圈</Button><Button style={{ marginTop: '20px' }} onClick={() => { track('publish_confirmed', { workId: 'demo-work' }); Taro.showToast({ title: '已提交发布记录', icon: 'success' }); }}>我已发布</Button></View>;
}
