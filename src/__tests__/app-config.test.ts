describe('app tab bar theme', () => {
  it('uses a clearly contrasting selected color', () => {
    ;(globalThis as any).defineAppConfig = (config: unknown) => config
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const config = require('../app.config').default
    expect(config.tabBar.color).toBe('#a3937a')
    expect(config.tabBar.selectedColor).toBe('#2f261a')
    expect(config.tabBar.list.map((item: { text: string }) => item.text)).toEqual(['抽', '做'])
  })
})
