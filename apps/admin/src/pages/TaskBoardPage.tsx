import { Button, DatePicker, Space, Typography } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useState } from 'react';
import { TaskBoardTree } from '../components/TaskBoardTree';

function today() { return dayjs().format('YYYY-MM-DD'); }

export function TaskBoardPage() {
  const [date, setDate] = useState(today());
  const [refreshKey, setRefreshKey] = useState(0);
  return (
    <Space direction="vertical" size={22} className="full-width">
      <div className="page-heading">
        <div className="page-heading-copy">
          <Typography.Title level={2}>任务执行看板</Typography.Title>
          <Typography.Text>树形下钻：总看板 → 门店汇总 → 员工明细，逐级展开查看</Typography.Text>
        </div>
        <div className="page-actions">
          <DatePicker value={dayjs(date)} onChange={(_, dateStr) => setDate((Array.isArray(dateStr) ? dateStr[0] : dateStr) || today())} allowClear={false} />
          <Button icon={<ReloadOutlined />} onClick={() => setRefreshKey((key) => key + 1)}>刷新</Button>
        </div>
      </div>
      <TaskBoardTree date={date} refreshKey={refreshKey} />
    </Space>
  );
}
