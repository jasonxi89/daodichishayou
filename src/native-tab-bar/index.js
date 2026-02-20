Component({
  data: {
    active: 0,
    homeIcon: '/assets/tab-home.png',
    selectedHomeIcon: '/assets/tab-home-active.png',
    ingredientIcon: '/assets/tab-ingredient.png',
    selectedIngredientIcon: '/assets/tab-ingredient-active.png',
  },
  pageLifetimes: {
    show() {
      const pages = getCurrentPages()
      const current = pages[pages.length - 1]
      const path = current.route
      if (path === 'pages/ingredient/ingredient') {
        this.setData({ active: 1 })
      } else {
        this.setData({ active: 0 })
      }
    },
  },
  methods: {
    switchToHome() {
      if (this.data.active === 0) return
      this.setData({ active: 0 })
      wx.switchTab({ url: '/pages/index/index' })
    },
    switchToIngredient() {
      if (this.data.active === 1) return
      this.setData({ active: 1 })
      wx.switchTab({ url: '/pages/ingredient/ingredient' })
    },
  },
})
