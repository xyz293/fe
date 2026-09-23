import { Button, Text, View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { PagePlaceholder } from '../../components/PagePlaceholder';

export default function InvitePage() {
  return (
    <View className="page">
      <View className="card">
        <Text style={{ display: 'block', fontSize: '40px', fontWeight: '600', marginBottom: '16px' }}>加入门店</Text>
        <Text style={{ display: 'block', color: '#8c8c8c', fontSize: '28px', lineHeight: '1.6', marginBottom: '32px' }}>确认后即可领取门店营销任务与创作额度。</Text>
        <Button className="primary-button" onClick={() => Taro.navigateBack()}>确认入店</Button>
      </View>
      <PagePlaceholder title="邀请码" description="支持扫码或通过邀请码加入指定门店。" />
    </View>
  );
}
