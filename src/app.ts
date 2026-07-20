import { PropsWithChildren } from 'react'
import { useLaunch } from '@tarojs/taro'
import { loadThemeFonts } from './utils/themeFonts'

import './app.scss'

function App({ children }: PropsWithChildren<any>) {
  useLaunch(() => {
    void loadThemeFonts()
  })

  return children
}

export default App
