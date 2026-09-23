import { Button, Input, Text, View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useState } from 'react';
import { useAppStore } from '../../store';

export default function LoginPage() {
  const [phone, setPhone] = useState('');
  const setUser = useAppStore((state) => state.setUser);

  const handleLogin = () => {
    if (!phone) {
      Taro.showToast({ title: '请输入手机号', icon: 'none' });
      return;
    }
    setUser({ id: 'demo-user', name: '体验用户', role: 'EMPLOYEE', storeId: 'demo-store', storeName: '体验门店' });
    Taro.setStorageSync('token', 'demo-token');
    Taro.switchTab({ url: '/pages/index/index' });
  };

  return (
    <View className="page">
      <View className="card" style={{ marginTop: '120px' }}>
        <Text style={{ display: 'block', fontSize: '52px', fontWeight: '600', marginBottom: '16px' }}>小AI</Text>
        <Text style={{ display: 'block', color: '#8c8c8c', fontSize: '28px', marginBottom: '48px' }}>门店营销内容，一句话就能生成</Text>
        <Input className="card" value={phone} type="number" maxlength={11} placeholder="请输入手机号" onInput={(event) => setPhone(event.detail.value)} />
        <Button className="primary-button" onClick={handleLogin}>登录 / 绑定手机号</Button>
      </View>
    </View>
  );
}
