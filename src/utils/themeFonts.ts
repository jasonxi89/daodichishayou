import Taro from '@tarojs/taro'
import notoSerifSC from '../assets/fonts/notoSerifSC'
import zcoolKuaiLe from '../assets/fonts/zcoolKuaiLe'

const FACES = [
  { family: 'NotoSerifSC', source: notoSerifSC },
  { family: 'ZCOOLKuaiLe', source: zcoolKuaiLe },
]

function loadFace(family: string, source: string): Promise<void> {
  if (!source) return Promise.resolve()

  return new Promise(resolve => {
    try {
      Taro.loadFontFace({
        global: true,
        family,
        source: `url("${source}")`,
        success: () => resolve(),
        fail: () => resolve(),
      })
    } catch {
      resolve()
    }
  })
}

export async function loadThemeFonts(): Promise<void> {
  await Promise.all(FACES.map(face => loadFace(face.family, face.source)))
}
