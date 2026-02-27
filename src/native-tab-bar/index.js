var pendingTabIndex = null

Component({
  data: {
    active: 0,
    homeIcon: '/assets/tab-home.png',
    selectedHomeIcon: '/assets/tab-home-active.png',
    ingredientIcon: '/assets/tab-ingredient.png',
    selectedIngredientIcon: '/assets/tab-ingredient-active.png',
  },
  lifetimes: {
    attached() {
      if (pendingTabIndex !== null) {
        this.setData({ active: pendingTabIndex })
        pendingTabIndex = null
      } else {
        this._detectActive()
      }
    },
  },
  pageLifetimes: {
    show() {
      var self = this
      setTimeout(function () {
        self._detectActive()
      }, 50)
    },
  },
  methods: {
    _detectActive() {
      var pages = getCurrentPages()
      var current = pages[pages.length - 1]
      var path = (current && current.route) || ''
      var idx = path.indexOf('ingredient') !== -1 ? 1 : 0
      if (this.data.active !== idx) {
        this.setData({ active: idx })
      }
    },
    switchToHome() {
      if (this.data.active === 0) return
      this.setData({ active: 0 })
      pendingTabIndex = 0
      wx.switchTab({ url: '/pages/index/index' })
    },
    switchToIngredient() {
      if (this.data.active === 1) return
      this.setData({ active: 1 })
      pendingTabIndex = 1
      wx.switchTab({ url: '/pages/ingredient/ingredient' })
    },
  },
})
