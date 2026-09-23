import { useState } from 'react';
import { Avatar, Dropdown, Layout, Menu, Space, Typography } from 'antd';
import { LogoutOutlined } from '@ant-design/icons';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { AppRoutes, adminMenus, getPageConfig } from './router';
import { api } from './services/api';

const { Header, Sider, Content } = Layout;

export default function App() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const currentPage = getPageConfig(location.pathname);

  return (
    <Layout className="app-layout">
      <Sider collapsible collapsed={collapsed} onCollapse={setCollapsed} theme="light" width={248}>
        <div className="brand"><span className="brand-mark">AI</span>{!collapsed && <span>小AI · 营销平台</span>}</div>
        <Menu mode="inline" selectedKeys={[location.pathname]} items={adminMenus.map((item) => ({ ...item, label: <RouterLink to={item.key}>{item.label}</RouterLink> }))} />
      </Sider>
      <Layout>
        <Header className="app-header">
          <Typography.Text type="secondary">企业版管理端 / 超级后台</Typography.Text>
          <Dropdown menu={{ items: [{ key: 'logout', icon: <LogoutOutlined />, label: '退出登录' }] }}>
            <Space className="user-menu"><Avatar style={{ background: '#1677ff' }}>管</Avatar><span>管理员</span></Space>
          </Dropdown>
        </Header>
        <Content className="app-content">
          <AppRoutes />
          {currentPage && <div className="page-context"><Typography.Text type="secondary">接口基址：{api.defaults.baseURL}</Typography.Text></div>}
        </Content>
      </Layout>
    </Layout>
  );
}
