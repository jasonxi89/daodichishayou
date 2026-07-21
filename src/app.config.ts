export default defineAppConfig({
  lazyCodeLoading: 'requiredComponents',
  darkmode: false,
  pages: [
    'pages/index/index',
    'pages/ingredient/ingredient',
    'pages/recipe/recipe',
  ],
  tabBar: {
    color: '#a3937a',
    selectedColor: '#2f261a',
    backgroundColor: '#ffffff',
    list: [
      {
        pagePath: 'pages/index/index',
        text: '抽',
      },
      {
        pagePath: 'pages/ingredient/ingredient',
        text: '做',
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
