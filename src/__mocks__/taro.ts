// Mock for @tarojs/taro - replaces Taro runtime APIs in Jest tests

const request = jest.fn().mockResolvedValue({ statusCode: 200, data: {} })
const showToast = jest.fn()
const showModal = jest.fn().mockImplementation(({ success }: { success?: (res: { confirm: boolean }) => void }) => {
  if (success) success({ confirm: true })
})
const getStorageSync = jest.fn().mockReturnValue({})
const setStorageSync = jest.fn()
const navigateTo = jest.fn()

// Taro hooks - just register callbacks, don't call them synchronously
// (calling them immediately can cause infinite re-render loops)
const useLoad = jest.fn()
const useRouter = jest.fn().mockReturnValue({ params: {} })
const useShareAppMessage = jest.fn()
const useShareTimeline = jest.fn()
const useLaunch = jest.fn()

// Tab bar related mocks
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
  switchTab,
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
  switchTab,
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
