import { Button, Input, Modal, Spin, Typography } from 'antd';
import { EditOutlined, PlusOutlined } from '@ant-design/icons';
import { useState } from 'react';
import type { AssetCategory } from '@xiaoa/share/types';

interface CategoryTreeProps {
  categories: AssetCategory[];
  activeKey: string;
  loading?: boolean;
  onSelect: (key: string) => void;
  onCreate: (name: string) => Promise<void>;
  onRename: (id: string, name: string) => Promise<void>;
}

/** 分类侧栏：全部 + 分类列表 + 新增；一期不做分类删除（防素材悬空），只支持新增和改名 */
export function CategoryTree({ categories, activeKey, loading, onSelect, onCreate, onRename }: CategoryTreeProps) {
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorName, setEditorName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const openCreate = () => { setEditingId(null); setEditorName(''); setEditorOpen(true); };
  const openRename = (category: AssetCategory) => { setEditingId(String(category.id)); setEditorName(category.name); setEditorOpen(true); };

  const submit = async () => {
    const name = editorName.trim();
    if (!name) return;
    setSaving(true);
    try {
      if (editingId) await onRename(editingId, name);
      else await onCreate(name);
      setEditorOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const itemStyle = (active: boolean) => ({
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '8px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 14,
    color: active ? '#1677ff' : 'rgba(0,0,0,0.75)',
    background: active ? '#e6f4ff' : 'transparent',
  });

  return (
    <div style={{ width: 190, flexShrink: 0 }}>
      <Typography.Text type="secondary" style={{ fontSize: 12, paddingLeft: 12 }}>分类</Typography.Text>
      <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <div style={itemStyle(activeKey === '')} onClick={() => onSelect('')}>全部</div>
        {loading && <div style={{ padding: 12 }}><Spin size="small" /></div>}
        {categories.map((category) => (
          <div key={String(category.id)} style={itemStyle(activeKey === String(category.id))} onClick={() => onSelect(String(category.id))}>
            <Typography.Text ellipsis style={{ flex: 1, color: 'inherit' }}>{category.name}</Typography.Text>
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={(event) => { event.stopPropagation(); openRename(category); }}
            />
          </div>
        ))}
        <Button type="dashed" icon={<PlusOutlined />} style={{ marginTop: 8 }} onClick={openCreate}>新增分类</Button>
      </div>
      <Modal
        title={editingId ? '分类改名' : '新增分类'}
        open={editorOpen}
        onCancel={() => setEditorOpen(false)}
        onOk={submit}
        confirmLoading={saving}
        okButtonProps={{ disabled: !editorName.trim() }}
        destroyOnClose
      >
        <Input
          placeholder="分类名称，如：商品图 / 场景图 / 模板"
          value={editorName}
          maxLength={20}
          showCount
          onChange={(event) => setEditorName(event.target.value)}
          onPressEnter={submit}
        />
      </Modal>
    </div>
  );
}
