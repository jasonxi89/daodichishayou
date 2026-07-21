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
