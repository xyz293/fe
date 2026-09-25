import type { ReactNode } from 'react';
import { AccountBookOutlined, AuditOutlined, BgColorsOutlined, BellOutlined, CalendarOutlined, CheckSquareOutlined, CloudServerOutlined, DashboardOutlined, DollarOutlined, ExportOutlined, FileTextOutlined, PictureOutlined, SafetyOutlined, SettingOutlined, ShopOutlined, TeamOutlined, WalletOutlined } from '@ant-design/icons';
import { Navigate, Route, Routes } from 'react-router-dom';
import { CrudPage } from '../pages/CrudPage';
import { DashboardPage } from '../pages/DashboardPage';
import { PlatformDashboardPage } from '../pages/PlatformDashboardPage';
import { PlatformCustomersPage, PlatformPlansPage, PlatformTenantsPage } from '../pages/PlatformPages';
import { GenerationTasksPage, PromptTemplatesPage } from '../pages/AiPages';
import { TenantWorkspacePage } from '../pages/TenantWorkspacePage';
import { TaskBoardPage } from '../pages/TaskBoardPage';
import { TaskReportPage } from '../pages/TaskReportPage';
import { TaskModifyLogsPage } from '../pages/TaskModifyLogsPage';
import { TaskRemindPage } from '../pages/TaskRemindPage';
import { ContentPackagePage, StyleAdminPage } from '../pages/AdminContentPages';
import { AssetCenterPage } from '../pages/asset/AssetCenterPage';
import { CalendarPage } from '../pages/calendar/CalendarPage';
import { AuditQueuePage } from '../pages/audit/AuditQueuePage';
import { ComplianceAdminPage } from '../pages/AdminCompliancePage';
import { MemberAdminPage, StoreAdminPage } from '../pages/AdminOrgPages';
import { ExportAdminPage, OperationDashboardPage } from '../pages/AdminOpsPages';
import { PoolPage } from '../pages/quota/PoolPage';
import { PaymentPage } from '../pages/payment/PaymentPage';
import LoginPage from '../pages/LoginPage';

export interface AdminMenuItem { key: string; icon: ReactNode; label: string; }
export interface PageConfig { title: string; description: string; columns: string[]; }

export const adminMenus: AdminMenuItem[] = [
  { key: '/admin/dashboard', icon: <DashboardOutlined />, label: '全域看板' },
  { key: '/admin/operation', icon: <CloudServerOutlined />, label: '运营总览' },
  { key: '/admin/stores', icon: <ShopOutlined />, label: '门店管理' },
  { key: '/admin/members', icon: <TeamOutlined />, label: '会员管理' },
  { key: '/admin/tenant-workspace', icon: <TeamOutlined />, label: '租户 · 组织与成员' },
  { key: '/admin/asset', icon: <PictureOutlined />, label: '素材中心' },
  { key: '/admin/calendar', icon: <CalendarOutlined />, label: '营销日历' },
  { key: '/admin/audit', icon: <AuditOutlined />, label: '内容审核' },
  { key: '/admin/content-packages', icon: <FileTextOutlined />, label: '内容包管理' },
  { key: '/admin/styles', icon: <BgColorsOutlined />, label: '风格库' },
  { key: '/admin/tasks', icon: <CheckSquareOutlined />, label: '任务管理' },
  { key: '/admin/task-board', icon: <DashboardOutlined />, label: '任务看板' },
  { key: '/admin/task-report', icon: <CheckSquareOutlined />, label: '任务报表' },
  { key: '/admin/task-remind', icon: <BellOutlined />, label: '任务提醒' },
  { key: '/admin/task-modify-logs', icon: <CheckSquareOutlined />, label: '任务修改记录' },
  { key: '/admin/exports', icon: <ExportOutlined />, label: '导出任务' },
  { key: '/admin/quota', icon: <WalletOutlined />, label: '算力总池' },
  { key: '/admin/compliance', icon: <SafetyOutlined />, label: '合规中心' },
  { key: '/admin/prompt-templates', icon: <SettingOutlined />, label: 'AI · Prompt 模板' },
  { key: '/admin/generation-tasks', icon: <CloudServerOutlined />, label: 'AI · 生成监控' },
  { key: '/platform/dashboard', icon: <CloudServerOutlined />, label: '平台 · 运营看板' },
  { key: '/platform/tenants', icon: <TeamOutlined />, label: '平台 · 租户审核' },
  { key: '/platform/plans', icon: <SettingOutlined />, label: '平台 · 套餐管理' },
  { key: '/platform/payment', icon: <AccountBookOutlined />, label: '平台 · 收款入池' },
  { key: '/platform/customers', icon: <ShopOutlined />, label: '平台 · 客户管理' },
];

export const pageConfig: Record<string, PageConfig> = {
  '/admin/operation': { title: '运营总览', description: '查询运营总览指标与作品产出趋势。', columns: [] },
  '/admin/stores': { title: '门店管理', description: '查询门店汇总、创建门店并调整上级组织。', columns: ['门店名称', '上级门店', '成员数', '作品数', '状态', '操作'] },
  '/admin/members': { title: '会员管理', description: '按组织分页查询会员账号。', columns: ['昵称', '手机号', 'OpenID', '状态', '注册时间'] },
  '/admin/tenant-workspace': { title: '组织与成员', description: '按租户组织树管理门店节点、成员关系和账号角色。', columns: [] },
  '/admin/asset': { title: '素材中心', description: '品牌素材、推优待审与行业资产包统一管理，支持分类、上传与推优审核。', columns: [] },
  '/admin/calendar': { title: '营销日历', description: '按营销节点管理内容包：日历标记、侧抽屉查看与撤销。', columns: [] },
  '/admin/audit': { title: '内容审核', description: '审核待发布的作品，通过或驳回并填写意见；数据范围由角色决定。', columns: [] },
  '/admin/content-packages': { title: '内容包管理', description: '按营销日创建定时下发任务，支持撤销与下发异常检查。', columns: ['名称', '营销日', '下发时刻', '任务模板', '状态', '操作'] },
  '/admin/styles': { title: '风格库', description: '维护轻奢、婚庆、国风等行业内容风格表达。', columns: ['风格名称', '适用场景', 'Prompt', '排序', '状态', '操作'] },
  '/admin/exports': { title: '导出任务', description: '创建数据导出任务并查看进度与下载链接。', columns: ['任务ID', '类型', '状态', '行数', '创建时间', '操作'] },
  '/admin/tasks': { title: '任务管理', description: '下发门店营销任务并查看三级执行看板。', columns: ['任务名称', '执行对象', '周期', '完成率', '操作'] },
  '/admin/task-board': { title: '任务看板', description: '三级下钻：总看板 → 门店汇总 → 员工明细。', columns: [] },
  '/admin/task-report': { title: '任务报表', description: '查询指定任务的完成率和记录明细。', columns: [] },
  '/admin/task-remind': { title: '任务提醒', description: '对未完成任务的员工发送提醒。', columns: [] },
  '/admin/task-modify-logs': { title: '任务修改记录', description: '查询任务编辑历史。', columns: [] },
  '/admin/compliance': { title: '合规中心', description: '维护品牌词库与品牌、门店级审核开关。', columns: ['词条', '风险级别', '适用范围', '更新时间', '操作'] },
  '/admin/prompt-templates': { title: 'Prompt 模板管理', description: '版本化维护后端 AI prompt 模板，前端只传原始意图。', columns: [] },
  '/admin/generation-tasks': { title: '生成任务监控', description: '查看 AI 生成状态、失败原因和原始输入快照。', columns: [] },
  '/platform/tenants': { title: '租户开通审核', description: '审核企业申请，开通租户并配置初始门店和积分额度。', columns: [] },
  '/platform/plans': { title: '套餐管理', description: '维护租户可选择的年度套餐模板，修改不影响已开通租户。', columns: [] },
  '/platform/customers': { title: '客户管理', description: '维护客户联系人、角色和运营跟进备注。', columns: [] },
};

export function getPageConfig(pathname: string) { return pageConfig[pathname]; }

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />
      <Route path="/admin/dashboard" element={<DashboardPage />} />
      <Route path="/admin/operation" element={<OperationDashboardPage {...pageConfig['/admin/operation']} />} />
      <Route path="/admin/stores" element={<StoreAdminPage {...pageConfig['/admin/stores']} />} />
      <Route path="/admin/members" element={<MemberAdminPage {...pageConfig['/admin/members']} />} />
      <Route path="/admin/asset" element={<AssetCenterPage {...pageConfig['/admin/asset']} />} />
      <Route path="/admin/calendar" element={<CalendarPage {...pageConfig['/admin/calendar']} />} />
      <Route path="/admin/materials" element={<Navigate to="/admin/asset" replace />} />
      <Route path="/admin/audit" element={<AuditQueuePage {...pageConfig['/admin/audit']} />} />
      <Route path="/admin/content-packages" element={<ContentPackagePage {...pageConfig['/admin/content-packages']} />} />
      <Route path="/admin/styles" element={<StyleAdminPage {...pageConfig['/admin/styles']} />} />
      <Route path="/admin/exports" element={<ExportAdminPage {...pageConfig['/admin/exports']} />} />
      <Route path="/admin/compliance" element={<ComplianceAdminPage {...pageConfig['/admin/compliance']} />} />
      <Route path="/admin/tenant-workspace" element={<TenantWorkspacePage {...pageConfig['/admin/tenant-workspace']} />} />
      <Route path="/admin/task-board" element={<TaskBoardPage />} />
      <Route path="/admin/task-report" element={<TaskReportPage />} />
      <Route path="/admin/task-remind" element={<TaskRemindPage />} />
      <Route path="/admin/task-modify-logs" element={<TaskModifyLogsPage />} />
      <Route path="/admin/quota" element={<PoolPage />} />
      <Route path="/admin/prompt-templates" element={<PromptTemplatesPage />} />
      <Route path="/admin/generation-tasks" element={<GenerationTasksPage />} />
      <Route path="/platform/dashboard" element={<PlatformDashboardPage />} />
      <Route path="/platform/tenants" element={<PlatformTenantsPage {...pageConfig['/platform/tenants']} />} />
      <Route path="/platform/plans" element={<PlatformPlansPage {...pageConfig['/platform/plans']} />} />
      <Route path="/platform/payment" element={<PaymentPage />} />
      <Route path="/platform/customers" element={<PlatformCustomersPage {...pageConfig['/platform/customers']} />} />
      {Object.entries(pageConfig).filter(([path]) => !path.startsWith('/platform/') && !['/admin/tenant-workspace', '/admin/task-board', '/admin/task-report', '/admin/task-remind', '/admin/task-modify-logs', '/admin/operation', '/admin/stores', '/admin/members', '/admin/asset', '/admin/calendar', '/admin/audit', '/admin/content-packages', '/admin/styles', '/admin/exports', '/admin/compliance', '/admin/quota'].includes(path)).map(([path, config]) => <Route key={path} path={path} element={<CrudPage {...config} />} />)}
    </Routes>
  );
}
