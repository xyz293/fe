import { Button, Input, Picker, Text, View } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import { useState } from 'react';
import type { DataScope, TenantRole, UserAccount } from '@xiaoa/share/types';
import { quotaApi, sharedApi } from '../../../utils/sharedAdapter';
import { PagePlaceholder } from '../../../components/PagePlaceholder';

const roleOptions: TenantRole[] = ['OWNER', 'REGION_ADMIN', 'VIEWER', 'STAFF'];
const scopeOptions: DataScope[] = [1, 2, 3, 4];

/** 幂等键三板斧（员工额度文档 §1.3）：UUID 生成 + 提交前存本地 + 失败不清除，网络重试不会重复划拨 */
function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = (Math.random() * 16) | 0;
    const value = char === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}
function makeBizId(storageKey: string, prefix: string): string {
  const saved = String(Taro.getStorageSync(storageKey) || '');
  if (saved) return saved;
  const bizId = `${prefix}-${uuid()}`;
  Taro.setStorageSync(storageKey, bizId);
  return bizId;
}

/** 额度操作模式：划拨（门店→员工）/ 回收（员工→门店） */
type TransferMode = 'ALLOCATE' | 'RECALL';

const ROLE_LABELS: Record<string, string> = {
  OWNER: '店长',
  STAFF: '员工',
  REGION_ADMIN: '区域管理员',
  HQ_ADMIN: '总部管理员',
  VIEWER: '观察者',
};

export default function EmployeesPage() {
  const [members, setMembers] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [listError, setListError] = useState('');
  /** 额度抽屉：选中成员 + 操作模式 + 表单 + 门店池余额（划拨上限） */
  const [target, setTarget] = useState<UserAccount | null>(null);
  const [transferMode, setTransferMode] = useState<TransferMode>('ALLOCATE');
  const [amount, setAmount] = useState('');
  const [remark, setRemark] = useState('');
  const [storeBalance, setStoreBalance] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  /** 手动授予角色（列表之外的兜底操作，保留原能力） */
  const [roleId, setRoleId] = useState('');
  const [userId, setUserId] = useState('');
  const [roleIndex, setRoleIndex] = useState(3);
  const [scopeIndex, setScopeIndex] = useState(3);
  const [error, setError] = useState('');
  const [opLoading, setOpLoading] = useState(false);

  const isLoggedIn = Boolean(String(Taro.getStorageSync('token') || ''));

  /** GET /api/admin/members：nickname + quotaBalance + userOrgRoleId（STAFF 才有，划拨直接取它） */
  const loadMembers = () => {
    setLoading(true);
    sharedApi.getAdminMembers({ pageNo: 1, pageSize: 50 })
      .then((result) => { setMembers(result.list || []); setListError(''); })
      .catch((requestError) => setListError(requestError instanceof Error ? requestError.message : '成员列表加载失败'))
      .finally(() => setLoading(false));
  };

  /** 店长视角 GET /api/quota/my 返回门店账户，作为划拨上限 */
  const loadStoreBalance = () => {
    quotaApi.getMyQuota()
      .then((summary) => setStoreBalance(summary.account?.balance ?? 0))
      .catch(() => setStoreBalance(null));
  };

  useDidShow(() => { if (isLoggedIn) { loadMembers(); loadStoreBalance(); } });

  const openQuotaSheet = (member: UserAccount) => {
    if (!member.userOrgRoleId) {
      Taro.showToast({ title: '该成员没有员工额度账户（非员工角色）', icon: 'none' });
      return;
    }
    setTarget(member);
    setTransferMode('ALLOCATE');
    setAmount('');
    setRemark('');
  };

  const submitTransfer = async () => {
    if (!target?.userOrgRoleId || submitting) return;
    const value = Math.floor(Number(amount));
    if (!value || value < 1) { Taro.showToast({ title: '请输入正确的额度（≥1）', icon: 'none' }); return; }
    const isAllocate = transferMode === 'ALLOCATE';
    const cap = isAllocate ? (storeBalance ?? 0) : (target.quotaBalance ?? 0);
    if (value > cap) {
      Taro.showToast({ title: isAllocate ? `超出门店池余额（${cap}）` : `超出该员工当前余额（${cap}）`, icon: 'none' });
      return;
    }
    const bizKey = `xiaoa_biz_${isAllocate ? 'alloc' : 'recall'}_${target.userOrgRoleId}`;
    setSubmitting(true);
    try {
      const data = {
        memberRoleId: target.userOrgRoleId,
        amount: value,
        bizId: makeBizId(bizKey, isAllocate ? 'alloc' : 'recall'),
        ...(remark.trim() ? { remark: remark.trim() } : {}),
      };
      if (isAllocate) await quotaApi.staffAllocate(data);
      else await quotaApi.staffRecall(data);
      // 成功后清除幂等键，下次操作生成新键；失败路径不清除，可原键重试
      Taro.removeStorageSync(bizKey);
      Taro.showToast({ title: isAllocate ? '划拨成功' : '回收成功', icon: 'success' });
      setAmount('');
      setRemark('');
      setTarget({ ...target, quotaBalance: (target.quotaBalance ?? 0) + (isAllocate ? value : -value) });
      setStoreBalance((current) => (current === null ? current : current + (isAllocate ? -value : value)));
      loadMembers();
    } catch (requestError) {
      // 3001 余额不足 / 1003 幂等键冲突 / 2003 非 OWNER / 1001 员工无效：直接展示后端语义化提示
      Taro.showToast({ title: requestError instanceof Error ? requestError.message : '操作失败', icon: 'none' });
    } finally {
      setSubmitting(false);
    }
  };

  const runMemberOp = async (action: () => Promise<unknown>, success: string) => {
    setOpLoading(true);
    setError('');
    try {
      await action();
      setError(`${success}，接口已生效`);
      loadMembers();
      if (target) setTarget(null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '操作失败');
    } finally {
      setOpLoading(false);
    }
  };

  if (!isLoggedIn) return <PagePlaceholder title="员工与角色" description="请先登录店长账号后再管理成员与额度。" />;

  return (
    <View className="page">
      <View className="topbar">
        <View>
          <Text className="page-title">员工与角色</Text>
          <Text className="page-subtitle">成员余额实时可查，点员工可划拨/回收额度</Text>
        </View>
      </View>

      <View className="card">
        <View className="row-between">
          <Text className="section-label" style={{ margin: 0 }}>成员列表</Text>
          <Text className="muted" style={{ fontSize: '21px' }}>门店池余额：{storeBalance === null ? '--' : storeBalance.toLocaleString()}</Text>
        </View>
        {loading && <Text className="muted" style={{ display: 'block', margin: '14px 0' }}>加载中…</Text>}
        {!loading && listError && <View className="notice-bar"><Text>{listError}</Text></View>}
        {!loading && !listError && members.length === 0 && <Text className="muted" style={{ display: 'block', margin: '14px 0' }}>暂无成员，可先通过邀请码入店</Text>}
        {members.map((member) => (
          <View key={String(member.id)} className="menu-line" onClick={() => openQuotaSheet(member)}>
            <View>
              <Text style={{ display: 'block' }}>{member.nickname || `用户 ${member.id}`}</Text>
              <Text className="muted" style={{ display: 'block', marginTop: '7px', fontSize: '21px' }}>
                {ROLE_LABELS[member.role || ''] || (member.userOrgRoleId ? '员工' : '成员')} · 关系 {member.userOrgRoleId ?? '-'}
              </Text>
            </View>
            <Text className="gold">{(member.quotaBalance ?? 0).toLocaleString()} 额度</Text>
          </View>
        ))}
      </View>

      <View className="card">
        <Text className="section-label">手动授予 / 更新角色</Text>
        <Text className="muted" style={{ display: 'block', marginBottom: '12px', fontSize: '21px' }}>列表之外的兜底操作：输入用户 ID 后授予角色。</Text>
        <Text className="section-label">userId</Text>
        <Input className="chat-input" value={userId} placeholder="用户 ID" onInput={(event) => setUserId(event.detail.value)} />
        <Picker mode="selector" range={roleOptions} value={roleIndex} onChange={(event) => setRoleIndex(Number(event.detail.value))}>
          <View className="secondary-button">角色：{roleOptions[roleIndex]}</View>
        </Picker>
        <Picker mode="selector" range={scopeOptions.map((scope) => `数据范围 ${scope}`)} value={scopeIndex} onChange={(event) => setScopeIndex(Number(event.detail.value))}>
          <View className="secondary-button">数据范围：{scopeOptions[scopeIndex]}</View>
        </Picker>
        <Button
          className="primary-button"
          onClick={() => runMemberOp(() => sharedApi.grantUserRole(userId, { orgId: String(Taro.getStorageSync('orgId') || ''), role: roleOptions[roleIndex], dataScope: scopeOptions[scopeIndex] }), '用户角色已授予或更新')}
          disabled={!userId || opLoading}
        >授予 / 更新角色</Button>
        {error && <View className="notice-bar" style={{ marginTop: '18px' }}><Text>{error}</Text></View>}
      </View>

      {/* 额度抽屉：余额 + 划拨/回收 + 成员操作（移出门店/禁用账号） */}
      {target && (
        <>
          <View className="modal-mask" onClick={() => setTarget(null)} />
          <View className="publish-sheet">
            <View className="row-between">
              <Text className="page-title" style={{ fontSize: '34px' }}>{target.nickname || `用户 ${target.id}`} · 额度管理</Text>
              <Text className="gold" style={{ fontSize: '28px' }} onClick={() => setTarget(null)}>×</Text>
            </View>
            <View className="row-between" style={{ margin: '16px 0' }}>
              <Text className="muted">当前余额</Text>
              <Text className="balance" style={{ fontSize: '34px' }}>{(target.quotaBalance ?? 0).toLocaleString()}</Text>
            </View>
            <View className="creation-type-row">
              <Text className={transferMode === 'ALLOCATE' ? 'pill active' : 'pill'} onClick={() => setTransferMode('ALLOCATE')}>划拨给员工</Text>
              <Text className={transferMode === 'RECALL' ? 'pill active' : 'pill'} onClick={() => setTransferMode('RECALL')}>回收未用额度</Text>
            </View>
            <Text className="muted" style={{ display: 'block', margin: '12px 0', fontSize: '21px' }}>
              {transferMode === 'ALLOCATE'
                ? `上限为门店池余额 ${storeBalance === null ? '--' : storeBalance.toLocaleString()}；一条事务双流水（门店划出 / 员工划入）`
                : `上限为该员工当前余额 ${(target.quotaBalance ?? 0).toLocaleString()}；回收后额度回到门店池`}
            </Text>
            <Input className="chat-input" type="number" value={amount} placeholder="划拨/回收额度（≥1）" onInput={(event) => setAmount(event.detail.value)} />
            <Input className="chat-input" value={remark} placeholder="备注（可选，如：9月文案额度）" onInput={(event) => setRemark(event.detail.value)} />
            <Button className="primary-button" style={{ marginTop: '16px' }} loading={submitting} onClick={submitTransfer}>
              {transferMode === 'ALLOCATE' ? '确认划拨' : '确认回收'}
            </Button>
            <View className="creation-type-row" style={{ marginTop: '18px' }}>
              <Text className="mini-action" onClick={() => target.userOrgRoleId && runMemberOp(() => sharedApi.removeMember(target.userOrgRoleId!), '成员关系已移除')}>移出门店</Text>
              <Text className="mini-action" onClick={() => runMemberOp(() => sharedApi.disableUser(target.id), '用户账号已禁用')}>禁用账号</Text>
            </View>
          </View>
        </>
      )}
    </View>
  );
}
