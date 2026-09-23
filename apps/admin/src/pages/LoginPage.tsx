import { Button, Card, Checkbox, Form, Input, Space, Tag, Typography, message } from 'antd';
import { ArrowRightOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { AuthLoginRequest } from '@xiaoa/share/types';
import { sharedApi } from '../services/sharedApi';

interface LoginFormValues extends AuthLoginRequest {
  remember: boolean;
}

function saveSession(session: Awaited<ReturnType<typeof sharedApi.login>>) {
  localStorage.setItem('token', session.token);
  localStorage.setItem('openid', localStorage.getItem('openid') || '');
  localStorage.setItem('userId', String(session.userId));
  localStorage.setItem('tenantId', String(session.tenantId));
  localStorage.setItem('orgId', String(session.orgId));
  localStorage.setItem('role', session.role);
  localStorage.setItem('dataScope', String(session.dataScope));
  localStorage.setItem('tenantName', session.tenantName);
  localStorage.setItem('orgName', session.orgName);
}

export default function LoginPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form] = Form.useForm<LoginFormValues>();

  const submit = async (values: LoginFormValues) => {
    setError('');
    setLoading(true);
    try {
      const openid = values.openid.trim();
      const session = await sharedApi.login({ openid });
      localStorage.setItem('openid', openid);
      if (!values.remember) localStorage.removeItem('openid');
      saveSession(session);
      message.success('登录成功');
      const isPlatform = session.role === 'PLATFORM_OPS' || session.role === 'PLATFORM_FINANCE';
      navigate(isPlatform ? '/platform/dashboard' : '/admin/dashboard', { replace: true });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '登录失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return <div className="login-page"><div className="login-decoration login-decoration-left" /><div className="login-decoration login-decoration-right" /><Card className="login-card" bordered={false}><div className="login-brand"><span className="brand-mark">AI</span><div><Typography.Title level={3}>小AI · 营销平台</Typography.Title><Typography.Text>运营后台</Typography.Text></div></div><div className="login-heading"><Tag icon={<SafetyCertificateOutlined />} color="gold">安全登录</Tag><Typography.Title level={1}>欢迎回来</Typography.Title><Typography.Paragraph>登录后管理租户、组织、成员和 AI 内容生产。</Typography.Paragraph></div>{error && <div className="login-error">{error}</div>}<Form form={form} layout="vertical" onFinish={submit} initialValues={{ openid: localStorage.getItem('openid') || '', remember: Boolean(localStorage.getItem('openid')) }} requiredMark={false}><Form.Item name="openid" label="微信标识 openid" rules={[{ required: true, whitespace: true, message: '请输入 openid' }]} extra="当前后端认证接口直接接收 openid；接入企业 SSO 或微信登录后可替换此输入方式"><Input size="large" placeholder="请输入管理员 openid" autoComplete="username" /></Form.Item><Form.Item name="remember" valuePropName="checked"><Checkbox>记住本次 openid</Checkbox></Form.Item><Button type="primary" htmlType="submit" size="large" block loading={loading} icon={<ArrowRightOutlined />}>进入工作台</Button></Form><Space direction="vertical" size={4} className="login-tip"><Typography.Text type="secondary">平台运营账号进入平台后台</Typography.Text><Typography.Text type="secondary">HQ_ADMIN / REGION_ADMIN / OWNER 进入租户后台</Typography.Text></Space></Card></div>;
}
