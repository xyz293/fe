export default {
  pages: [
    'pages/login/index',
    'pages/invite/index',
    'pages/index/index',
    'pages/chat/index',
    'pages/pro/index',
    'pages/generating/index',
    'pages/works/index',
    'pages/work-detail/index',
    'pages/task-detail/index',
    'pages/messages/index',
    'pages/mine/index',
    'pages/quota-flow/index',
    'pages/badges/index',
    'pages/ranking/index',
  ],
  subpackages: [
    {
      root: 'pages/manage',
      pages: ['employees/index', 'invite/index', 'quota/index', 'tasks/index', 'review/index', 'store-data/index', 'recharge/index'],
    },
  ],
  // 微信同声传译插件（语音 ASR 一期方案，纯前端出文字，后端零改动）
  // 注意：插件要求真实 AppID 且在小程序后台「添加插件」后才能鉴权。
  // 游客模式（touristappid）下会报 INVALID_LOGIN, access_token expired，故本地调试时注释；
  // utils/asr.ts 已做降级：插件未注入时 isAsrSupported()=false，语音按钮自动隐藏，不影响其他功能。
  // 上线前恢复此配置，并在 mp.weixin.qq.com「设置-第三方设置-插件管理」添加该插件。
  // plugins: {
  //   WechatSI: {
  //     version: '0.3.5',
  //     provider: 'wx069ba97219f66d99',
  //   },
  // },
  window: {
    navigationBarBackgroundColor: '#ffffff',
    navigationBarTextStyle: 'black',
    navigationBarTitleText: '小AI',
    backgroundTextStyle: 'light',
  },
  tabBar: {
    color: '#8c8c8c',
    selectedColor: '#1677ff',
    backgroundColor: '#ffffff',
    list: [
      { pagePath: 'pages/index/index', text: '首页' },
      { pagePath: 'pages/chat/index', text: '创作' },
      { pagePath: 'pages/works/index', text: '作品' },
      { pagePath: 'pages/messages/index', text: '消息' },
      { pagePath: 'pages/mine/index', text: '我的' },
    ],
  },
};
