import { Avatar, Dropdown, Layout, Menu, Space, Typography } from 'antd';
import { LogoutOutlined } from '@ant-design/icons';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { AppRoutes, adminMenus } from './router';

const { Header, Sider, Content } = Layout;

export default function App() {
  const location = useLocation();
  return (
    <Layout className="app-layout">
      <Sider collapsible theme="light" width={248}>
        <div className="brand"><span className="brand-mark">AI</span><span>小AI · 营销平台</span></div>
        <Menu mode="inline" selectedKeys={[location.pathname]} items={adminMenus.map((item) => ({ ...item, label: <RouterLink to={item.key}>{item.label}</RouterLink> }))} />
      </Sider>
      <Layout>
        <Header className="app-header">
          <Typography.Text className="header-context">企业版管理端 / 平台运营工作台</Typography.Text>
          <Dropdown menu={{ items: [{ key: 'logout', icon: <LogoutOutlined />, label: '退出登录' }] }}>
            <Space className="user-menu"><Avatar style={{ background: '#c9a46c' }}>管</Avatar><span>总部管理员</span></Space>
          </Dropdown>
        </Header>
        <Content className="app-content"><AppRoutes /></Content>
      </Layout>
    </Layout>
  );
}
