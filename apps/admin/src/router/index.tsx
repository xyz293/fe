import type { ReactNode } from 'react';
import { CalendarOutlined, CheckSquareOutlined, CloudServerOutlined, DashboardOutlined, PictureOutlined, SafetyOutlined, SettingOutlined, ShopOutlined } from '@ant-design/icons';
import { Navigate, Route, Routes } from 'react-router-dom';
import { CrudPage } from '../pages/CrudPage';
import { DashboardPage } from '../pages/DashboardPage';

export interface AdminMenuItem {
  key: string;
  icon: ReactNode;
  label: string;
}

export interface PageConfig {
  title: string;
  description: string;
  columns: string[];
}

export const adminMenus: AdminMenuItem[] = [
  { key: '/admin/dashboard', icon: <DashboardOutlined />, label: '全域看板' },
  { key: '/admin/stores', icon: <ShopOutlined />, label: '门店与账号' },
  { key: '/admin/materials', icon: <PictureOutlined />, label: '素材中心' },
  { key: '/admin/calendar', icon: <CalendarOutlined />, label: '话术库 / 营销日历' },
  { key: '/admin/tasks', icon: <CheckSquareOutlined />, label: '任务管理' },
  { key: '/admin/compliance', icon: <SafetyOutlined />, label: '合规中心' },
  { key: '/platform/tenants', icon: <CloudServerOutlined />, label: '平台 · 租户管理' },
  { key: '/platform/assets', icon: <SettingOutlined />, label: '平台 · 资产包运营' },
];

export const pageConfig: Record<string, PageConfig> = {
  '/admin/stores': { title: '门店与账号', description: '管理门店、员工账号和店长角色。', columns: ['门店名称', '负责人', '员工数', '状态', '操作'] },
  '/admin/materials': { title: '素材中心', description: '上传和管理门店营销素材，后续接入 OSS 直传。', columns: ['素材名称', '类型', '上传人', '更新时间', '操作'] },
  '/admin/calendar': { title: '话术库 / 营销日历', description: '维护内容包、话术和营销节点。', columns: ['内容包', '适用门店', '营销日期', '状态', '操作'] },
  '/admin/tasks': { title: '任务管理', description: '配置任务对象、周期和完成判定方式。', columns: ['任务名称', '执行对象', '周期', '完成率', '操作'] },
  '/admin/compliance': { title: '合规中心', description: '管理词库及品牌、门店级别的合规开关。', columns: ['词条', '风险级别', '适用范围', '更新时间', '操作'] },
  '/platform/tenants': { title: '租户管理', description: '超级后台管理租户开通状态和账号权限。', columns: ['租户名称', '套餐', '门店数', '状态', '操作'] },
  '/platform/assets': { title: '资产包运营', description: '管理提示词、模板、风格及版本号。', columns: ['资产名称', '类型', '版本', '状态', '操作'] },
};

export function getPageConfig(pathname: string) {
  return pageConfig[pathname];
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />
      <Route path="/admin/dashboard" element={<DashboardPage />} />
      {Object.entries(pageConfig).map(([path, config]) => <Route key={path} path={path} element={<CrudPage {...config} />} />)}
    </Routes>
  );
}
