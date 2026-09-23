import { Button, Input, Text, View } from '@tarojs/components';
import Taro, { useLoad } from '@tarojs/taro';
import { useState } from 'react';

const materials = [
  { name: '主石特写', emoji: '💎' }, { name: '对戒上手', emoji: '💍' }, { name: '店内橱窗', emoji: '🏬' }, { name: '情侣牵手', emoji: '🤝' },
  { name: '礼盒细节', emoji: '🎁' }, { name: '花束氛围', emoji: '💐' }, { name: '品牌 Logo', emoji: '✦' }, { name: '520模板', emoji: '💌' },
];
const styles = ['轻奢', '婚庆', '国风', '温柔纪实', '高级感'];

export default function ProPage() {
  const [selectedMaterials, setSelectedMaterials] = useState<number[]>([0, 1]);
  const [selectedStyle, setSelectedStyle] = useState('轻奢');
  const [prompt, setPrompt] = useState('为新款黄金对戒制作一张适合 520 的门店宣传海报');
  const [type, setType] = useState<'image' | 'video'>('image');
  useLoad((params) => { if (params.type === 'video') setType('video'); });

  const toggleMaterial = (index: number) => setSelectedMaterials((current) => current.includes(index) ? current.filter((item) => item !== index) : [...current, index]);
  const generate = () => { Taro.showToast({ title: type === 'video' ? '已进入视频生成' : '图片已生成', icon: 'success' }); setTimeout(() => Taro.navigateTo({ url: type === 'video' ? '/pages/generating/index' : '/pages/work-detail/index?id=poster-520' }), 500); };

  return (
    <View className="page">
      <View className="chat-header"><Text className="back-button" onClick={() => Taro.navigateBack()}>‹</Text><Text className="chat-title">专业模式</Text><Text className="chat-scene">一次一版</Text></View>
      <View className="card"><View className="row-between"><Text className="section-title" style={{ margin: 0 }}>选择素材</Text><Text className="gold" style={{ fontSize: '23px' }}>{selectedMaterials.length} / 9 已选</Text></View><View className="pill-row" style={{ margin: '22px 0' }}><Text className="pill active">本店图库</Text><Text className="pill">品牌图库</Text><Text className="pill">上传</Text></View><View className="material-grid">{materials.map((material, index) => <View className={selectedMaterials.includes(index) ? 'material-tile selected' : 'material-tile'} key={material.name} onClick={() => toggleMaterial(index)}><Text className="material-emoji">{material.emoji}</Text><Text className="material-name">{material.name}</Text></View>)}</View></View>
      <View className="card"><Text className="section-title" style={{ marginTop: 0 }}>选择风格</Text><View className="pill-row">{styles.map((style) => <Text className={selectedStyle === style ? 'pill active' : 'pill'} key={style} onClick={() => setSelectedStyle(style)}>{style}{style === '轻奢' ? ' 🔥' : ''}</Text>)}</View></View>
      <View className="card"><Text className="section-title" style={{ marginTop: 0 }}>写下你的提示词</Text><Input className="prompt-box" value={prompt} maxlength={300} onInput={(event) => setPrompt(event.detail.value)} /><View className="row-between" style={{ marginTop: '20px' }}><Text className="muted" style={{ fontSize: '22px' }}>🎤 支持语音听写</Text><Text className="gold" style={{ fontSize: '22px' }}>尺寸：竖版 9:16 ▾</Text></View><View className="pill-row" style={{ marginTop: '18px' }}><Text className={type === 'image' ? 'pill active' : 'pill'} onClick={() => setType('image')}>图片</Text><Text className={type === 'video' ? 'pill active' : 'pill'} onClick={() => setType('video')}>视频</Text><Text className="pill">时长：15s ▾</Text></View></View>
      <Text className="cost-note">本次生成将消耗 {type === 'video' ? 8 : 2} 点灵感额度 · 生成失败自动退回</Text><Button className="primary-button" onClick={generate}>生成（扣 {type === 'video' ? 8 : 2} 积分）</Button>
    </View>
  );
}
