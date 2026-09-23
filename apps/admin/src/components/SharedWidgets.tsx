import { Card, Col, Row } from 'antd';
import { QuotaBar, TaskProgress } from '@xiaoa/share';

export function SharedWidgets() {
  return <Row gutter={[16, 16]}><Col xs={24} lg={12}><Card title="算力总池"><QuotaBar balance={6800} total={10000} /></Card></Col><Col xs={24} lg={12}><Card title="任务完成率"><TaskProgress percent={93.2} /></Card></Col></Row>;
}
