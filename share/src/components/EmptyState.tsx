export interface EmptyStateProps {
  title?: string;
  description?: string;
}

export function EmptyState({ title = '还没有珠宝故事', description = '完成一次婚戒创作后，属于你们的爱情内容会展示在这里。' }: EmptyStateProps) {
  return <div style={{ padding: '52px 24px', border: '1px dashed #eadbd0', borderRadius: 16, background: '#fffdfb', color: '#8d7479', textAlign: 'center' }}><div style={{ marginBottom: 10, color: '#8d5f6b', fontSize: 18, fontWeight: 600 }}>♡ {title}</div><div style={{ fontSize: 13 }}>{description}</div></div>;
}
