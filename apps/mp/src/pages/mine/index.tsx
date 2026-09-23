import { Button, Text, View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useAppStore } from '../../store';

const menus = [{ title: '账号信息', copy: '手机号、微信绑定' }, { title: '联系客服', copy: '工作日 9:00-18:00' }, { title: '关于小AI', copy: '婚恋珠宝内容工作台' }];
export default function MinePage() {
  const user = useAppStore((state) => state.user);
  return <View className="page"><View className="profile-card"><Text className="avatar">{(user?.name || '张').slice(0, 1)}</Text><View><Text className="page-title" style={{ fontSize: '34px' }}>{user?.name || '张三'}</Text><Text className="page-subtitle">{user?.storeName || '朝阳婚戒店'} · 店员</Text></View></View><View className="card"><View className="row-between"><Text className="section-title" style={{ margin: 0 }}>额度余额</Text><Text className="gold" style={{ fontSize: '24px' }}>明细 ›</Text></View><Text className="balance">86.00</Text><Text className="muted" style={{ fontSize: '22px' }}>本月已使用 14.00 灵感额度</Text><View className="task-progress"><View className="task-progress-fill" style={{ width: '86%' }} /></View></View><View className="card">{menus.map((menu) => <View className="menu-line" key={menu.title} onClick={() => Taro.showToast({ title: menu.title, icon: 'none' })}><View><Text style={{ display: 'block' }}>{menu.title}</Text><Text className="muted" style={{ display: 'block', marginTop: '7px', fontSize: '21px' }}>{menu.copy}</Text></View><Text className="gold">›</Text></View>)}</View><Button className="secondary-button" onClick={() => Taro.showToast({ title: '已退出当前演示账号', icon: 'none' })}>退出登录</Button></View>;
}
