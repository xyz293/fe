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
  plugins: {
    WechatSI: {
      version: '0.3.5',
      provider: 'wx069ba97219f66d99',
    },
  },
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
