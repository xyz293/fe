import { Button, Image, Text, Textarea, Video, View } from '@tarojs/components';
import Taro, { useLoad } from '@tarojs/taro';
import { useEffect, useRef, useState } from 'react';
import type { LongId, PublishRecord, Work } from '@xiaoa/share/types';
import { sharedApi } from '../../utils/sharedAdapter';
import { PUBLISH_STATUS, isCaptionEditable, normalizePublishStatus, statusToneClass } from '../../utils/workConstants';

const DEFAULT_CAPTION = '一枚戒指，藏着两个人对未来的想象。新款钻戒抵达门店，欢迎来挑选属于你们的那一束光。';
const POLL_INTERVAL = 3000;
const POLL_MAX_DURATION = 5 * 60 * 1000;

function isGenerationDone(status: { status: number | string }) {
  return status.status === 1 || status.status === 2 || status.status === 'SUCCESS' || status.status === 'FAILED';
}
function isGenerationFailed(status: { status: number | string }) {
  return status.status === 2 || status.status === 'FAILED';
}

export default function WorkDetailPage() {
  const [workId, setWorkId] = useState<LongId>('');
  const [work, setWork] = useState<Work | null>(null);
  const [taskId, setTaskId] = useState<LongId | undefined>();
  const [platform, setPlatform] = useState('朋友圈');
  const [needProof, setNeedProof] = useState(false);
  const [error, setError] = useState('');

  // 发布流（半自动：一键准备 → 我已发布 → 后端校验）
  const [showPublish, setShowPublish] = useState(false);
  const [prepared, setPrepared] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [publishedLocal, setPublishedLocal] = useState(false);
  const [proofUrl, setProofUrl] = useState('');
  const [uploadingProof, setUploadingProof] = useState(false);

  // caption 复制/编辑（DRAFT/APPROVED/REJECTED 可编辑，驳回态编辑即改稿重提）
  const [showCaptionEditor, setShowCaptionEditor] = useState(false);
  const [captionDraft, setCaptionDraft] = useState('');
  const [savingCaption, setSavingCaption] = useState(false);

  // 重新生成（全价扣费，二次确认）
  const [regenerating, setRegenerating] = useState(false);
  const [prices, setPrices] = useState<{ imagePrice?: number; videoPrice?: number }>({});

  const pollingActive = useRef(false);
  const pollTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const stopPolling = () => { pollingActive.current = false; if (pollTimer.current) clearTimeout(pollTimer.current); };

  const startPolling = (id: LongId) => {
    stopPolling();
    pollingActive.current = true;
    const startedAt = Date.now();
    const poll = async () => {
      if (!pollingActive.current) return;
      if (Date.now() - startedAt > POLL_MAX_DURATION) { pollingActive.current = false; return; }
      try {
        const status = await sharedApi.getWorkStatus(id);
        if (!pollingActive.current) return;
        if (!isGenerationDone(status)) { pollTimer.current = setTimeout(poll, POLL_INTERVAL); return; }
        pollingActive.current = false;
        if (isGenerationFailed(status)) Taro.showToast({ title: status.errorMessage || '生成失败，积分已退回', icon: 'none' });
        void loadWork(String(id));
      } catch {
        pollingActive.current = false;
      }
    };
    void poll();
  };

  const loadWork = (id: string) => {
    return sharedApi.getWorks(1, 50)
      .then((result) => {
        const found = result.list.find((item) => String(item.id) === id) || null;
        setWork(found);
        if (found && normalizePublishStatus(found.status) === 'NONE') startPolling(id);
      })
      .catch((requestError) => setError(requestError instanceof Error ? requestError.message : '作品加载失败'));
  };

  useLoad((params) => {
    if (!params.id) return;
    setWorkId(params.id);
    void loadWork(String(params.id));
    if (params.taskId) {
      setTaskId(params.taskId);
      // 查询任务详情，判断 judgeType 是否需要凭证（文档 §5.1）
      sharedApi.getTask(params.taskId)
        .then((task) => { setNeedProof(task.judgeType === 2); if (task.platform) setPlatform(task.platform); })
        .catch(() => undefined);
    }
    if (params.platform) setPlatform(params.platform);
  });

  useEffect(() => {
    sharedApi.getCreationConfig().then((config) => setPrices({ imagePrice: config.imagePrice, videoPrice: config.videoPrice })).catch(() => undefined);
    return stopPolling;
  }, []);

  // ===== 状态驱动渲染：PUBLISH_STATUS 映射表决定状态条 / 按钮显隐 / 驳回意见展示 =====
  const statusKey = normalizePublishStatus(work?.status);
  const statusMeta = PUBLISH_STATUS[statusKey];
  const captionEditable = isCaptionEditable(statusKey);
  const caption = work?.caption || work?.summary || '';
  const rejectOpinion = work?.rejectOpinion || work?.rejectReason || '';

  const copyCaption = async () => {
    await Taro.setClipboardData({ data: caption || DEFAULT_CAPTION });
    Taro.showToast({ title: '文案已复制', icon: 'success' });
  };

  const openCaptionEditor = () => { setCaptionDraft(caption || ''); setShowCaptionEditor(true); };

  const saveCaption = async () => {
    const next = captionDraft.trim();
    if (!next) { Taro.showToast({ title: '文案不能为空', icon: 'none' }); return; }
    setSavingCaption(true);
    try {
      await sharedApi.updateWorkCaption(workId, next);
      // 驳回态编辑 caption 即改稿重提：后端自动回 PENDING_AUDIT；提交后 refetch
      Taro.showToast({ title: statusKey === 'REJECTED' ? '已改稿重提，进入审核中' : '文案已更新', icon: 'none' });
      setShowCaptionEditor(false);
      await loadWork(String(workId));
    } catch (requestError) {
      // caption 编辑与审核并发：后端条件更新拒绝时提示并刷新最新状态
      Taro.showToast({ title: requestError instanceof Error ? requestError.message : '提交失败', icon: 'none' });
      await loadWork(String(workId));
    } finally {
      setSavingCaption(false);
    }
  };

  // 重新生成：全价扣费，二次确认（防误点）
  const onRegenerate = () => {
    const price = work?.type === 'VIDEO' ? prices.videoPrice : prices.imagePrice;
    Taro.showModal({
      title: '重新生成',
      content: price ? `将重新扣费 ${price} 额度，确定重新生成吗？` : '重新生成将重新扣费相应额度，确定吗？',
      confirmText: '重新生成',
      cancelText: '再想想',
    }).then((res) => {
      if (!res.confirm) return;
      setRegenerating(true);
      sharedApi.regenerateWork(workId)
        .then((result) => {
          const newId: LongId | undefined = result.workId ?? result.taskId;
          setWork((current) => (current ? { ...current, status: 'NONE' } : current));
          setPublishedLocal(false);
          Taro.showToast({ title: '已重新提交生成，完成后消息通知您', icon: 'none' });
          if (newId) startPolling(newId);
          else void loadWork(String(workId));
        })
        .catch((requestError) => Taro.showToast({ title: requestError instanceof Error ? requestError.message : '重新生成失败', icon: 'none' }))
        .finally(() => setRegenerating(false));
    });
  };

  // 一键准备：复制文案 + 内容图/视频存相册
  const preparePublish = async () => {
    try { await Taro.setClipboardData({ data: caption || DEFAULT_CAPTION }); } catch { /* 剪贴板失败不阻断 */ }
    if (work?.type === 'VIDEO' && work?.contentUrl) {
      try { await Taro.saveVideoToPhotosAlbum({ filePath: work.contentUrl }); Taro.showToast({ title: '文案已复制、视频已存相册', icon: 'success' }); }
      catch { Taro.showToast({ title: '文案已复制；视频保存失败，请在发布时上传', icon: 'none' }); }
    } else if (work?.contentUrl || work?.coverUrl) {
      try { await Taro.saveImageToPhotosAlbum({ filePath: (work?.contentUrl || work?.coverUrl) as string }); Taro.showToast({ title: '文案已复制、素材已存相册', icon: 'success' }); }
      catch { Taro.showToast({ title: '文案已复制；素材保存失败，请在设置中授权相册', icon: 'none' }); }
    } else {
      Taro.showToast({ title: '文案已复制', icon: 'success' });
    }
    setPrepared(true);
  };

  const uploadProof = async () => {
    try {
      const res = await Taro.chooseImage({ count: 1 });
      const tempPath = res.tempFilePaths[0];
      setUploadingProof(true);
      // judgeType=2：截图凭证先传 /api/assets 拿 URL，再随发布记录提交；失败阻断提交
      const uploaded = await sharedApi.uploadAsset(tempPath);
      setProofUrl(uploaded.url);
      Taro.showToast({ title: '凭证已上传', icon: 'success' });
    } catch (requestError) {
      Taro.showToast({ title: requestError instanceof Error ? requestError.message : '凭证上传失败，请重试', icon: 'none' });
    } finally {
      setUploadingProof(false);
    }
  };

  const submitPublish = async () => {
    if (!workId) { Taro.showToast({ title: '缺少作品 ID', icon: 'none' }); return; }
    // 文档 §5.1：judgeType=2 时必须传 proofUrl（凭证上传失败阻断提交）
    if (needProof && !proofUrl) {
      Taro.showToast({ title: '请先上传发布截图凭证', icon: 'none' });
      return;
    }
    const payload: PublishRecord = { workId, ...(taskId ? { taskId } : {}), platform, ...(proofUrl ? { proofUrl } : {}) };
    setSubmitting(true);
    try {
      // 前端永不本地判定能不能发：REJECTED 点击也交给后端第 8 条校验拒绝
      await sharedApi.publishRecord(payload);
      setShowPublish(false);
      setPublishedLocal(true);
      Taro.showToast({ title: '任务已完成 ✓', icon: 'success' });
      await loadWork(String(workId));
    } catch (requestError) {
      Taro.showToast({ title: requestError instanceof Error ? requestError.message : '提交失败', icon: 'none' });
    } finally {
      setSubmitting(false);
    }
  };

  const previewUrl = work?.contentUrl || work?.coverUrl;

  return (
    <View className="page">
      <View className="chat-header"><Text className="back-button" onClick={() => Taro.navigateBack()}>‹</Text><Text className="chat-title">作品详情</Text><Text className="chat-scene">{statusMeta.label}</Text></View>
      <View className="detail-preview">
        {previewUrl && work?.type === 'VIDEO' ? <Video className="detail-media" src={previewUrl} controls /> : previewUrl ? <Image className="detail-media" src={previewUrl} mode="widthFix" /> : '💍'}
      </View>
      <View className="card">
        <View className="row-between">
          <Text className="page-title" style={{ fontSize: '36px' }}>{work?.title || '作品详情'}</Text>
          <Text className={`status-tag ${statusToneClass(statusMeta.tone)}`} style={{ marginTop: 0 }}>{statusMeta.label}</Text>
        </View>
        {error && <Text className="muted" style={{ display: 'block', marginTop: '12px' }}>{error}</Text>}
        <Text className="section-title" style={{ fontSize: '28px' }}>配套文案</Text>
        <Text className="detail-copy">{caption || '暂无作品文案'}</Text>
        <View className="row-between" style={{ marginTop: '14px' }}>
          <Button className="secondary-button" onClick={copyCaption}>复制</Button>
          {captionEditable && <Button className="secondary-button" onClick={openCaptionEditor}>{statusKey === 'REJECTED' ? '改稿重提' : '编辑'}</Button>}
        </View>
        <Text className="section-title" style={{ fontSize: '28px' }}>发布状态</Text>
        <Text className="muted" style={{ display: 'block', fontSize: '23px' }}>
          {publishedLocal || statusKey === 'PUBLISHED' ? '✓ 已发布，任务已核销' : statusKey === 'NONE' ? '生成中，完成后消息通知您，可退出页面稍后回来刷新' : statusKey === 'PENDING_AUDIT' ? '审核中，审核结果将在消息页通知' : statusKey === 'REJECTED' ? '内容被驳回，请改稿后重新提交' : statusKey === 'APPROVED' ? '审核已通过，可以发布' : prepared ? '已准备好素材，去微信粘贴发布' : '还没有开始发布'}
        </Text>
        {/* 驳回态：状态条红色 + 展示最近一条 REJECT 的审核意见 */}
        {statusMeta.showOpinion && !!rejectOpinion && (
          <View className="opinion-box"><Text className="opinion-title">驳回意见</Text><Text className="opinion-text">{rejectOpinion}</Text></View>
        )}
        {needProof && <Text className="muted" style={{ display: 'block', fontSize: '21px', marginTop: '8px', color: '#c9a46c' }}>⚠ 该任务需要截图凭证（judgeType=2）</Text>}
      </View>
      <Button className="primary-button" disabled={!statusMeta.publishable || regenerating} onClick={() => { setPrepared(false); setShowPublish(true); }}>
        {statusMeta.publishable ? `发布到${platform}` : statusKey === 'PUBLISHED' ? '已发布' : statusMeta.label === '生成中' ? '生成中，暂不可发布' : `暂不可发布（${statusMeta.label}）`}
      </Button>
      {statusMeta.showOpinion && <Button className="primary-button" style={{ marginTop: '16px' }} onClick={openCaptionEditor}>改稿重提</Button>}
      <Button className="secondary-button" style={{ marginTop: '16px' }} loading={regenerating} onClick={onRegenerate}>重新生成（全价扣费）</Button>

      {showPublish && (
        <>
          <View className="modal-mask" onClick={() => setShowPublish(false)} />
          <View className="publish-sheet">
            <View className="row-between">
              <Text className="page-title" style={{ fontSize: '34px' }}>发布到：{platform}</Text>
              <Text className="gold" style={{ fontSize: '28px' }} onClick={() => setShowPublish(false)}>×</Text>
            </View>
            <View className="step-line"><Text className="step-number">1</Text><Text>{prepared ? '文案已复制 · 素材已存相册 ✓' : '一键准备文案和素材'}</Text></View>
            <Button className={prepared ? 'secondary-button' : 'primary-button'} onClick={preparePublish}>{prepared ? '已准备好' : '一键准备'}</Button>
            <View className="step-line"><Text className="step-number">2</Text><Text>打开{platform}，粘贴文案并发布</Text></View>
            <Button className="secondary-button" onClick={() => Taro.showToast({ title: `请打开${platform}发布`, icon: 'none' })}>去发布</Button>
            {needProof && (
              <>
                <View className="step-line"><Text className="step-number">3</Text><Text>上传发布截图凭证（judgeType=2 必填）</Text></View>
                <Button className="secondary-button" loading={uploadingProof} onClick={uploadProof}>{proofUrl ? '✓ 凭证已上传' : '上传截图凭证'}</Button>
                {proofUrl && <Text className="muted" style={{ display: 'block', fontSize: '20px', marginTop: '4px' }}>凭证：{proofUrl}</Text>}
                <View className="step-line"><Text className="step-number">4</Text><Text>发完了？提交发布记录完成任务</Text></View>
              </>
            )}
            {!needProof && <View className="step-line"><Text className="step-number">3</Text><Text>发完了？提交发布记录完成任务</Text></View>}
            <Button className="primary-button" loading={submitting} onClick={submitPublish}>我已发布</Button>
          </View>
        </>
      )}

      {showCaptionEditor && (
        <>
          <View className="modal-mask" onClick={() => setShowCaptionEditor(false)} />
          <View className="publish-sheet">
            <View className="row-between">
              <Text className="page-title" style={{ fontSize: '34px' }}>{statusKey === 'REJECTED' ? '改稿重提' : '编辑文案'}</Text>
              <Text className="gold" style={{ fontSize: '28px' }} onClick={() => setShowCaptionEditor(false)}>×</Text>
            </View>
            {statusKey === 'REJECTED' && !!rejectOpinion && <Text className="muted" style={{ display: 'block', fontSize: '22px', marginTop: '8px', color: '#a34c4c' }}>驳回意见：{rejectOpinion}</Text>}
            <Textarea className="caption-editor-textarea" value={captionDraft} maxlength={500} autoHeight onInput={(event) => setCaptionDraft(event.detail.value)} />
            <Text className="muted" style={{ display: 'block', fontSize: '21px', marginTop: '8px' }}>提交后{statusKey === 'REJECTED' || statusKey === 'APPROVED' ? '将重新进入审核' : '直接更新文案'}</Text>
            <Button className="primary-button" loading={savingCaption} onClick={saveCaption}>保存{statusKey === 'REJECTED' ? '并重新提审' : ''}</Button>
          </View>
        </>
      )}
    </View>
  );
}
