import { Button, Input, Text, View } from '@tarojs/components';
import Taro, { useLoad } from '@tarojs/taro';
import { useState } from 'react';
import type { LongId, PublishRecord, Work } from '@xiaoa/share/types';
import { sharedApi } from '../../utils/sharedAdapter';

export default function WorkDetailPage() {
  const [showPublish, setShowPublish] = useState(false);
  const [prepared, setPrepared] = useState(false);
  const [published, setPublished] = useState(false);
  const [workId, setWorkId] = useState<LongId>('');
  const [work, setWork] = useState<Work | null>(null);
  const [taskId, setTaskId] = useState<LongId | undefined>();
  const [platform, setPlatform] = useState('朋友圈');
  const [proofUrl, setProofUrl] = useState('');
  const [needProof, setNeedProof] = useState(false);
  const [error, setError] = useState('');

  useLoad((params) => {
    if (!params.id) return;
    setWorkId(params.id);
    sharedApi.getWorks(1, 20)
      .then((result) => setWork(result.list.find((item) => String(item.id) === String(params.id)) || null))
      .catch((requestError) => setError(requestError instanceof Error ? requestError.message : '作品加载失败'));
    if (params.taskId) {
      setTaskId(params.taskId);
      // 查询任务详情，判断 judgeType 是否需要凭证（文档 §5.1）
      sharedApi.getTask(params.taskId)
        .then((task) => { setNeedProof(task.judgeType === 2); if (task.platform) setPlatform(task.platform); })
        .catch(() => undefined);
    }
  });

  const copyAndSave = async () => {
    await Taro.setClipboardData({ data: work?.summary || '一枚戒指，藏着两个人对未来的想象。新款钻戒抵达门店，欢迎来挑选属于你们的那一束光。' });
    setPrepared(true);
    Taro.showToast({ title: '文案已复制，素材已存相册', icon: 'success' });
  };

  const uploadProof = async () => {
    try {
      const res = await Taro.chooseImage({ count: 1 });
      // 实际项目应上传到 CDN 并获取 URL，这里用本地路径占位
      const tempUrl = res.tempFilePaths[0];
      setProofUrl(tempUrl);
      Taro.showToast({ title: '凭证已上传', icon: 'success' });
    } catch {
      Taro.showToast({ title: '已跳过上传', icon: 'none' });
    }
  };

  const submitPublish = async () => {
    if (!workId) { Taro.showToast({ title: '缺少作品 ID', icon: 'none' }); return; }
    // 文档 §5.1：judgeType=2 时必须传 proofUrl
    if (needProof && !proofUrl) {
      Taro.showToast({ title: '请先上传发布截图凭证', icon: 'none' });
      return;
    }
    const payload: PublishRecord = { workId, ...(taskId ? { taskId } : {}), platform, ...(proofUrl ? { proofUrl } : {}) };
    try {
      await sharedApi.publishRecord(payload);
      setPublished(true);
      setShowPublish(false);
      Taro.showToast({ title: '发布记录已提交，任务已核销', icon: 'success' });
    } catch (requestError) {
      Taro.showToast({ title: requestError instanceof Error ? requestError.message : '提交失败', icon: 'none' });
    }
  };

  return (
    <View className="page">
      <View className="chat-header"><Text className="back-button" onClick={() => Taro.navigateBack()}>‹</Text><Text className="chat-title">作品详情</Text><Text className="chat-scene">{work?.status || '可发布'}</Text></View>
      <View className="detail-preview">{work?.coverUrl ? <Text>{work.coverUrl}</Text> : '💍'}</View>
      <View className="card">
        <View className="row-between">
          <Text className="page-title" style={{ fontSize: '36px' }}>{work?.title || '作品详情'}</Text>
          <Text className="status-tag status-ready" style={{ marginTop: 0 }}>{work?.status || '加载中'}</Text>
        </View>
        {error && <Text className="muted" style={{ display: 'block', marginTop: '12px' }}>{error}</Text>}
        <Text className="section-title" style={{ fontSize: '28px' }}>配套文案</Text>
        <Text className="detail-copy">{work?.summary || '暂无作品文案'}</Text>
        <Text className="section-title" style={{ fontSize: '28px' }}>发布状态</Text>
        <Text className="muted" style={{ display: 'block', fontSize: '23px' }}>{published ? '✓ 已发布，任务已核销' : prepared ? '已准备好素材，去微信粘贴发布' : '还没有开始发布'}</Text>
        {needProof && <Text className="muted" style={{ display: 'block', fontSize: '21px', marginTop: '8px', color: '#c9a46c' }}>⚠ 该任务需要截图凭证（judgeType=2）</Text>}
      </View>
      <Button className="primary-button" onClick={() => setShowPublish(true)}>发朋友圈</Button>
      <Button className="secondary-button" style={{ marginTop: '16px' }} onClick={copyAndSave}>复制文案</Button>
      {showPublish && (
        <>
          <View className="modal-mask" onClick={() => setShowPublish(false)} />
          <View className="publish-sheet">
            <View className="row-between">
              <Text className="page-title" style={{ fontSize: '34px' }}>发布到：{platform}</Text>
              <Text className="gold" style={{ fontSize: '28px' }} onClick={() => setShowPublish(false)}>×</Text>
            </View>
            <View className="step-line"><Text className="step-number">1</Text><Text>{prepared ? '文案已复制 · 素材已存相册 ✓' : '一键准备文案和素材'}</Text></View>
            <Button className={prepared ? 'secondary-button' : 'primary-button'} onClick={copyAndSave}>{prepared ? '已准备好' : '一键准备'}</Button>
            <View className="step-line"><Text className="step-number">2</Text><Text>打开{platform}，粘贴文案并发布</Text></View>
            <Button className="secondary-button" onClick={() => Taro.showToast({ title: `请打开${platform}发布`, icon: 'none' })}>去发布</Button>
            {needProof && (
              <>
                <View className="step-line"><Text className="step-number">3</Text><Text>上传发布截图凭证（judgeType=2 必填）</Text></View>
                <Button className="secondary-button" onClick={uploadProof}>{proofUrl ? '✓ 凭证已上传' : '上传截图凭证'}</Button>
                {proofUrl && <Text className="muted" style={{ display: 'block', fontSize: '20px', marginTop: '4px' }}>凭证：{proofUrl}</Text>}
                <View className="step-line"><Text className="step-number">4</Text><Text>提交发布记录完成任务</Text></View>
              </>
            )}
            {!needProof && <View className="step-line"><Text className="step-number">3</Text><Text>发完了？提交发布记录完成任务</Text></View>}
            <Button className="primary-button" onClick={submitPublish}>我已发布</Button>
          </View>
        </>
      )}
    </View>
  );
}
