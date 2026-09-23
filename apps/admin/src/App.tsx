import { Avatar, Badge, Breadcrumb, Dropdown, Layout, Menu, Space, Typography } from 'antd';
import { DollarOutlined, LogoutOutlined, TeamOutlined } from '@ant-design/icons';
import { useEffect, useState } from 'react';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import type { AuthMe } from '@xiaoa/share/types';
import { AuthGuard } from './AuthGuard';
import { useAuth } from './auth';
import { sharedApi } from './services/sharedApi';
import { AppRoutes, adminMenus } from './router';

const { Header, Sider, Content } = Layout;

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const [pendingTenantCount, setPendingTenantCount] = useState(0);
  const [pendingRechargeCount, setPendingRechargeCount] = useState(0);
  const [authMe, setAuthMe] = useState<AuthMe | null>(null);
  const { status } = useAuth();
  useEffect(() => {
    if (status !== 'authenticated') return;
    sharedApi.getAuthMe().then(setAuthMe).catch(() => setAuthMe(null));
    const loadTodo = () => { if (localStorage.getItem('role') === 'PLATFORM_OPS' || localStorage.getItem('role') === 'PLATFORM_FINANCE') sharedApi.getPlatformDashboard('month').then((dashboard) => { setPendingTenantCount(dashboard.pendingTenantCount); setPendingRechargeCount(dashboard.pendingRechargeCount); }).catch(() => undefined); };
    loadTodo();
    const timer = window.setInterval(loadTodo, 60_000);
    return () => window.clearInterval(timer);
  }, [status]);
  const currentMenu = adminMenus.find((item) => item.key === location.pathname);
  const allowedMenus = authMe?.role === 'PLATFORM_OPS' || authMe?.role === 'PLATFORM_FINANCE' ? adminMenus.filter((item) => item.key.startsWith('/platform/')) : adminMenus.filter((item) => !item.key.startsWith('/platform/'));
  const isPlatform = authMe?.role === 'PLATFORM_OPS' || authMe?.role === 'PLATFORM_FINANCE';
  const logout = async () => { try { await sharedApi.logout(); } catch { /* 退出接口允许 token 失效 */ } finally { localStorage.clear(); navigate('/login', { replace: true }); } };
  if (location.pathname === '/login') return <AppRoutes />;
  return <AuthGuard><Layout className="app-layout"><Sider collapsible theme="light" width={248}><div className="brand"><span className="brand-mark">AI</span><span>小AI · 营销平台</span></div><Menu mode="inline" selectedKeys={[location.pathname]} items={allowedMenus.map((item) => ({ ...item, label: <RouterLink to={item.key}>{item.label}</RouterLink> }))} /></Sider><Layout><Header className="app-header"><Space size={24}><Breadcrumb items={[{ title: '小AI运营后台' }, { title: currentMenu?.label || '工作台' }]} /><Typography.Text className="header-context">{isPlatform ? '平台运营工作台' : `${authMe?.role || '租户管理员'}工作台`}</Typography.Text></Space><Space size={22}><Space size={18}>{isPlatform && <><a href="/platform/tenants" aria-label="待审核租户"><Badge count={pendingTenantCount} size="small" showZero><TeamOutlined className="header-icon" /></Badge></a><a href="/platform/recharges" aria-label="待确认充值"><Badge count={pendingRechargeCount} size="small" showZero><DollarOutlined className="header-icon" /></Badge></a></>}</Space><Dropdown menu={{ items: [{ key: 'logout', icon: <LogoutOutlined />, label: '退出登录', onClick: logout }] }}><Space className="user-menu"><Avatar style={{ background: '#c9a46c' }}>{isPlatform ? '管' : '店'}</Avatar><span>{isPlatform ? '平台管理员' : authMe?.role || '租户管理员'}</span></Space></Dropdown></Space></Header><Content className="app-content"><AppRoutes /></Content></Layout></Layout></AuthGuard>;
}
