import { Text, View } from '@tarojs/components';
import Taro from '@tarojs/taro';

const works = ['春日新品推广', '周末到店优惠', '会员日活动预热'];

export default function WorksPage() {
  return <View className="page"><Text style={{ display: 'block', fontSize: '42px', fontWeight: '600', marginBottom: '24px' }}>我的作品</Text>{works.map((title, index) => <View className="card" key={title} onClick={() => Taro.navigateTo({ url: `/pages/work-detail/index?id=${index + 1}` })}><Text style={{ display: 'block', fontSize: '32px', fontWeight: '600' }}>{title}</Text><Text style={{ display: 'block', color: '#8c8c8c', marginTop: '12px' }}>文案 · 已生成</Text></View>)}</View>;
}
