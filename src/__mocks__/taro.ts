// Mock for @tarojs/taro - replaces Taro runtime APIs in Jest tests

const request = jest.fn().mockResolvedValue({ statusCode: 200, data: {} })
const showToast = jest.fn()
const showModal = jest.fn().mockImplementation(({ success }: { success?: (res: { confirm: boolean }) => void }) => {
  if (success) success({ confirm: true })
})
const getStorageSync = jest.fn().mockReturnValue({})
const setStorageSync = jest.fn()
const navigateTo = jest.fn()
const navigateBack = jest.fn()
const loadFontFace = jest.fn()

// Taro hooks - just register callbacks, don't call them synchronously
// (calling them immediately can cause infinite re-render loops)
const useLoad = jest.fn()
const useRouter = jest.fn().mockReturnValue({ params: {} })
const useShareAppMessage = jest.fn()
const useShareTimeline = jest.fn()
const useLaunch = jest.fn()

// Canvas / share image mocks
const createSelectorQuery = jest.fn().mockReturnValue({
  select: jest.fn().mockReturnValue({
    fields: jest.fn().mockReturnValue({
      exec: jest.fn((cb) => cb([null])),
    }),
  }),
})
const canvasToTempFilePath = jest.fn()
const getSystemInfoSync = jest.fn().mockReturnValue({ pixelRatio: 2, windowWidth: 375 })
const getMenuButtonBoundingClientRect = jest.fn().mockReturnValue({
  top: 8,
  bottom: 40,
  left: 278,
  right: 365,
  width: 87,
  height: 32,
})

// Tab bar related mocks
const getCurrentInstance = jest.fn().mockReturnValue({ page: null })
const useDidShow = jest.fn()
const switchTab = jest.fn()
const getCurrentPages = jest.fn().mockReturnValue([{ route: 'pages/index/index' }])
const eventCenter = {
  on: jest.fn(),
  off: jest.fn(),
  trigger: jest.fn(),
}

const taroMock = {
  request,
  showToast,
  showModal,
  getStorageSync,
  setStorageSync,
  navigateTo,
  navigateBack,
  loadFontFace,
  switchTab,
  createSelectorQuery,
  canvasToTempFilePath,
  getSystemInfoSync,
  getMenuButtonBoundingClientRect,
  getCurrentInstance,
  getCurrentPages,
  eventCenter,
  useLoad,
  useRouter,
  useDidShow,
  useShareAppMessage,
  useShareTimeline,
  useLaunch,
}

// Named exports
export {
  request,
  showToast,
  showModal,
  getStorageSync,
  setStorageSync,
  navigateTo,
  navigateBack,
  loadFontFace,
  switchTab,
  createSelectorQuery,
  canvasToTempFilePath,
  getSystemInfoSync,
  getMenuButtonBoundingClientRect,
  getCurrentInstance,
  getCurrentPages,
  eventCenter,
  useLoad,
  useRouter,
  useDidShow,
  useShareAppMessage,
  useShareTimeline,
  useLaunch,
}

// Default export (matches `import Taro from '@tarojs/taro'` usage)
export default taroMock
