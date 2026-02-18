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

const taroMock = {
  request,
  showToast,
  showModal,
  getStorageSync,
  setStorageSync,
  navigateTo,
  useLoad,
  useRouter,
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
  useLoad,
  useRouter,
  useShareAppMessage,
  useShareTimeline,
  useLaunch,
}

// Default export (matches `import Taro from '@tarojs/taro'` usage)
export default taroMock
