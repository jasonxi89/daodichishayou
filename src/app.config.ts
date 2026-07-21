export default defineAppConfig({
  lazyCodeLoading: 'requiredComponents',
  darkmode: false,
  pages: [
    'pages/index/index',
    'pages/ingredient/ingredient',
    'pages/recipe/recipe',
  ],
  tabBar: {
    color: '#b9ac96',
    selectedColor: '#a3803f',
    backgroundColor: '#ffffff',
    list: [
      {
        pagePath: 'pages/index/index',
        text: '抽啥吃啥',
        iconPath: 'assets/tab-draw.png',
        selectedIconPath: 'assets/tab-draw-active.png',
      },
      {
        pagePath: 'pages/ingredient/ingredient',
        text: '有啥做啥',
        iconPath: 'assets/tab-make.png',
        selectedIconPath: 'assets/tab-make-active.png',
      },
    ],
  },
  window: {
    backgroundTextStyle: 'dark',
    navigationBarBackgroundColor: '#faf4e8',
    navigationBarTitleText: '到底吃啥哟',
    navigationBarTextStyle: 'black',
  },
})
