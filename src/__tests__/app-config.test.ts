describe('app tab bar theme', () => {
  it('renders two-line tabs: serif char icon above small caption', () => {
    ;(globalThis as any).defineAppConfig = (config: unknown) => config
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const config = require('../app.config').default
    expect(config.tabBar.color).toBe('#b9ac96')
    expect(config.tabBar.selectedColor).toBe('#a3803f')
    expect(config.tabBar.list.map((item: { text: string }) => item.text)).toEqual(['抽啥吃啥', '有啥做啥'])
    expect(config.tabBar.list.map((item: { iconPath: string }) => item.iconPath)).toEqual([
      'assets/tab-draw.png',
      'assets/tab-make.png',
    ])
    expect(config.tabBar.list.map((item: { selectedIconPath: string }) => item.selectedIconPath)).toEqual([
      'assets/tab-draw-active.png',
      'assets/tab-make-active.png',
    ])
  })
})
