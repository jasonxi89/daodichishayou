import Taro from '@tarojs/taro'
import { loadThemeFonts } from '../../utils/themeFonts'

describe('loadThemeFonts', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('loads both global theme font faces', async () => {
    const loadFontFace = jest
      .spyOn(Taro, 'loadFontFace')
      .mockImplementation(({ success }) => {
        success?.({ status: 'loaded' } as never)
        return Promise.resolve({ status: 'loaded' }) as never
      })

    await loadThemeFonts()

    expect(loadFontFace).toHaveBeenCalledTimes(2)
    expect(loadFontFace).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        family: 'NotoSerifSC',
        global: true,
        source: expect.stringContaining('url("'),
      }),
    )
    expect(loadFontFace).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ family: 'ZCOOLKuaiLe', global: true }),
    )
  })

  it('resolves when a font face fails to load', async () => {
    jest.spyOn(Taro, 'loadFontFace').mockImplementation(({ fail }) => {
      fail?.({ errMsg: 'loadFontFace:fail' } as never)
      return Promise.resolve({ status: 'failed' }) as never
    })

    await expect(loadThemeFonts()).resolves.toBeUndefined()
  })
})
