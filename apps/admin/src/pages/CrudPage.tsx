import { Button, Card, Space, Table, Typography } from 'antd';
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';

interface CrudPageProps {
  title: string;
  description: string;
  columns: string[];
}

const sampleRows = Array.from({ length: 5 }, (_, index) => ({ key: index, name: `示例数据 ${index + 1}`, type: index % 2 ? '标准版' : '旗舰版', owner: '管理员', status: index === 3 ? '停用' : '正常' }));

export function CrudPage({ title, description, columns }: CrudPageProps) {
  return <Space direction="vertical" size={24} className="full-width"><div><Typography.Title level={2}>{title}</Typography.Title><Typography.Text type="secondary">{description}</Typography.Text></div><Card extra={<Space><Button icon={<ReloadOutlined />}>刷新</Button><Button type="primary" icon={<PlusOutlined />}>新建</Button></Space>}><Table dataSource={sampleRows} columns={columns.map((column, index) => ({ title: column, dataIndex: ['name', 'type', 'owner', 'status', 'action'][index] || 'name', render: index === columns.length - 1 ? () => <Button type="link">查看 / 编辑</Button> : undefined }))} /></Card></Space>;
}
