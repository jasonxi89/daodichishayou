export default defineAppConfig({
  pages: [
    'pages/index/index',
    'pages/ingredient/ingredient',
    'pages/recipe/recipe',
  ],
  tabBar: {
    color: '#999999',
    selectedColor: '#f5a623',
    backgroundColor: '#ffffff',
    list: [
      {
        pagePath: 'pages/index/index',
        text: '随便吃',
        iconPath: 'assets/tab-home.png',
        selectedIconPath: 'assets/tab-home-active.png',
      },
      {
        pagePath: 'pages/ingredient/ingredient',
        text: '有啥做啥',
        iconPath: 'assets/tab-ingredient.png',
        selectedIconPath: 'assets/tab-ingredient-active.png',
      },
    ],
  },
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#fff',
    navigationBarTitleText: '到底吃啥哟',
    navigationBarTextStyle: 'black',
  },
})
