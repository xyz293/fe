/**
 * 作品卡（PENDING_MEDIA 完成后的展示形态，数据为真实作品 AiWork）：
 * - 图/视频预览：contentUrl 为 demo://local:// 占位协议（OSS 未接入）时按白名单降级为类型图标（utils/media）；
 * - 配套文案复制 + 查看作品详情（改稿/驳回/发布流走详情页）；
 * - 发布动作：一键准备（复制文案 + 素材存相册）→ 我已发布 ✓（POST /api/publish-record，关联任务自动核销）。
 */
import { Image, Text, Video, View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useRef, useState } from 'react';
import type { AiWork } from '@xiaoa/share/types';
import { previewableUrl, mediaFallbackIcon } from '../../utils/media';

interface WorkCardProps {
  work: AiWork;
  /** 已发布（提交成功后回显，防重复上报） */
  published?: boolean;
  publishing?: boolean;
  onCopyCaption: (text: string) => void;
  onPublish: () => void;
}

export function WorkCard({ work, published = false, publishing = false, onCopyCaption, onPublish }: WorkCardProps) {
  const [prepared, setPrepared] = useState(false);
  const preparingRef = useRef(false);

  const mediaUrl = previewableUrl(work.contentUrl);
  const caption = work.caption || '';
  const isVideo = work.type === 'VIDEO';

  /** 一键准备：复制文案 + 素材存相册（占位地址跳过，提示发布时手动上传） */
  const preparePublish = async () => {
    if (preparingRef.current) return;
    preparingRef.current = true;
    try {
      if (caption) await Taro.setClipboardData({ data: caption });
    } catch {
      /* 剪贴板失败不阻断 */
    }
    let saved = false;
    if (mediaUrl) {
      try {
        if (isVideo) await Taro.saveVideoToPhotosAlbum({ filePath: mediaUrl });
        else await Taro.saveImageToPhotosAlbum({ filePath: mediaUrl });
        saved = true;
      } catch {
        /* 授权拒绝等，不阻断 */
      }
    }
    preparingRef.current = false;
    setPrepared(true);
    Taro.showToast({
      title: saved ? (caption ? '文案已复制、素材已存相册' : '素材已存相册') : '文案已复制；素材请在发布时上传',
      icon: 'none',
    });
  };

  return (
    <View className="flow-card">
      {mediaUrl && isVideo ? (
        <Video className="flow-media" src={mediaUrl} controls objectFit="contain" />
      ) : mediaUrl ? (
        <Image
          className="flow-media"
          src={mediaUrl}
          mode="aspectFill"
          onClick={() => Taro.previewImage({ urls: [mediaUrl] })}
        />
      ) : (
        <View className="flow-media flow-media-empty"><Text>{mediaFallbackIcon(work.type)}</Text></View>
      )}

      {caption ? (
        <>
          <Text className="flow-caption" selectable>{caption}</Text>
          <View className="flow-caption-actions">
            <Text className="mini-action" onClick={() => onCopyCaption(caption)}>复制文案</Text>
            <Text className="mini-action" onClick={() => Taro.navigateTo({ url: `/pages/work-detail/index?id=${work.id}` })}>查看详情</Text>
          </View>
        </>
      ) : (
        <Text className="flow-card-note">配套文案生成中，可先到作品详情查看</Text>
      )}

      <View className="result-actions">
        <Text className="mini-action" onClick={preparePublish}>{prepared ? '已准备好 ✓' : '保存素材'}</Text>
        <View className={published ? 'result-publish disabled' : 'result-publish'} onClick={() => { if (!published && !publishing) onPublish(); }}>
          <Text>{published ? '已发布 ✓' : publishing ? '提交中…' : '我已发布 ✓'}</Text>
        </View>
      </View>
      {published && <Text className="flow-card-note">发布已上报 · 关联任务自动核销</Text>}
    </View>
  );
}
