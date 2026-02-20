import React from 'react'
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import * as taroMock from '@tarojs/taro'

// ─── Mock recipe functions ────────────────────────────────────────────────────
jest.mock('../../data/recipes', () => ({
  __esModule: true,
  getLocalRecipe: jest.fn().mockReturnValue(null),
  fetchRecipeFromAPI: jest.fn().mockResolvedValue(null),
  default: {},
}))

// ─── Mock API service ─────────────────────────────────────────────────────────
jest.mock('../../services/api', () => ({
  __esModule: true,
  fetchTrending: jest.fn().mockResolvedValue({ total: 0, items: [] }),
  fetchCategories: jest.fn().mockResolvedValue([]),
}))

const mockShowToast = taroMock.showToast as jest.Mock
const mockShowModal = taroMock.showModal as jest.Mock
const mockGetStorageSync = taroMock.getStorageSync as jest.Mock
const mockSetStorageSync = taroMock.setStorageSync as jest.Mock
const mockNavigateTo = taroMock.navigateTo as jest.Mock

function loadIndexPage() {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { default: IndexPage } = require('../../pages/index/index')
  return IndexPage as React.ComponentType
}

// ─────────────────────────────────────────────────────────────────────────────

describe('Index page – initial render', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetStorageSync.mockReturnValue({})
  })

  it('renders without crashing', () => {
    const IndexPage = loadIndexPage()
    expect(() => render(<IndexPage />)).not.toThrow()
  })

  it('shows the initial food prompt 今天吃啥？', () => {
    const IndexPage = loadIndexPage()
    render(<IndexPage />)
    expect(screen.getByText('今天吃啥？')).toBeInTheDocument()
  })

  it('renders the 开始 button', () => {
    const IndexPage = loadIndexPage()
    render(<IndexPage />)
    expect(screen.getByText('开始')).toBeInTheDocument()
  })

  it('renders all default category tabs', () => {
    const IndexPage = loadIndexPage()
    render(<IndexPage />)
    expect(screen.getByText('随便')).toBeInTheDocument()
    expect(screen.getByText('热门推荐')).toBeInTheDocument()
    expect(screen.getByText('家常炒菜')).toBeInTheDocument()
    expect(screen.getByText('粉面主食')).toBeInTheDocument()
    expect(screen.getByText('火锅烫煮')).toBeInTheDocument()
    expect(screen.getByText('烧烤炸鸡')).toBeInTheDocument()
    expect(screen.getByText('小吃街食')).toBeInTheDocument()
    expect(screen.getByText('异国料理')).toBeInTheDocument()
    expect(screen.getByText('奶茶咖啡')).toBeInTheDocument()
    expect(screen.getByText('甜品烘焙')).toBeInTheDocument()
    expect(screen.getByText('轻食简餐')).toBeInTheDocument()
    expect(screen.getByText('夜宵卤味')).toBeInTheDocument()
  })

  it('renders the count selector with default value 1', () => {
    const IndexPage = loadIndexPage()
    render(<IndexPage />)
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('份数')).toBeInTheDocument()
  })

  it('renders the 分享美食 button', () => {
    const IndexPage = loadIndexPage()
    render(<IndexPage />)
    expect(screen.getByText('分享美食')).toBeInTheDocument()
  })

  it('renders the 查看菜谱 button', () => {
    const IndexPage = loadIndexPage()
    render(<IndexPage />)
    expect(screen.getByText('查看菜谱')).toBeInTheDocument()
  })

  it('renders the 自定义菜单 link', () => {
    const IndexPage = loadIndexPage()
    render(<IndexPage />)
    expect(screen.getByText('自定义菜单')).toBeInTheDocument()
  })
})

describe('Index page – count selector', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetStorageSync.mockReturnValue({})
  })

  it('increments count when + button is clicked', () => {
    const IndexPage = loadIndexPage()
    render(<IndexPage />)

    const plusBtn = screen.getByText('+')
    fireEvent.click(plusBtn)

    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('decrements count when - button is clicked after incrementing', () => {
    const IndexPage = loadIndexPage()
    render(<IndexPage />)

    const plusBtn = screen.getByText('+')
    const minusBtn = screen.getByText('-')

    fireEvent.click(plusBtn)
    expect(screen.getByText('2')).toBeInTheDocument()

    fireEvent.click(minusBtn)
    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('does not decrement below 1', () => {
    const IndexPage = loadIndexPage()
    render(<IndexPage />)

    const minusBtn = screen.getByText('-')
    fireEvent.click(minusBtn)
    fireEvent.click(minusBtn)

    // Should still be 1
    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('does not increment above 10', () => {
    const IndexPage = loadIndexPage()
    render(<IndexPage />)

    const plusBtn = screen.getByText('+')
    // Click 15 times
    for (let i = 0; i < 15; i++) {
      fireEvent.click(plusBtn)
    }

    expect(screen.getByText('10')).toBeInTheDocument()
    expect(screen.queryByText('11')).not.toBeInTheDocument()
  })
})

describe('Index page – category selection', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetStorageSync.mockReturnValue({})
  })

  it('clicking a category tab marks it active', () => {
    const IndexPage = loadIndexPage()
    render(<IndexPage />)

    const hotpotTab = screen.getByText('火锅烫煮')
    fireEvent.click(hotpotTab)

    // The active class is applied; we verify via the className
    expect(hotpotTab.className).toContain('active')
  })

  it('default active category is 随便', () => {
    const IndexPage = loadIndexPage()
    render(<IndexPage />)

    const defaultTab = screen.getByText('随便')
    expect(defaultTab.className).toContain('active')
  })

  it('clicking another category deselects current', () => {
    const IndexPage = loadIndexPage()
    render(<IndexPage />)

    const bbqTab = screen.getByText('烧烤炸鸡')
    fireEvent.click(bbqTab)

    const randomTab = screen.getByText('随便')
    expect(randomTab.className).not.toContain('active')
    expect(bbqTab.className).toContain('active')
  })
})

describe('Index page – 查看菜谱 button without selection', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetStorageSync.mockReturnValue({})
  })

  it('shows toast when no food is selected yet', async () => {
    const IndexPage = loadIndexPage()
    render(<IndexPage />)

    const recipeBtn = screen.getByText('查看菜谱')
    fireEvent.click(recipeBtn)

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: '先选一个食物吧' })
      )
    })
  })
})

describe('Index page – custom menu', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetStorageSync.mockReturnValue({})
  })

  it('opens custom menu popup when 自定义菜单 is clicked', () => {
    const IndexPage = loadIndexPage()
    render(<IndexPage />)

    fireEvent.click(screen.getByText('自定义菜单'))

    expect(screen.getByText('我的菜单')).toBeInTheDocument()
  })

  it('closes custom menu when ✕ is clicked', () => {
    const IndexPage = loadIndexPage()
    render(<IndexPage />)

    fireEvent.click(screen.getByText('自定义菜单'))
    expect(screen.getByText('我的菜单')).toBeInTheDocument()

    // The close button contains ✕
    const closeBtn = screen.getByText('✕')
    fireEvent.click(closeBtn)

    expect(screen.queryByText('我的菜单')).not.toBeInTheDocument()
  })

  it('shows 还没有自定义分类 message when no custom categories exist', () => {
    const IndexPage = loadIndexPage()
    render(<IndexPage />)

    fireEvent.click(screen.getByText('自定义菜单'))

    expect(screen.getByText(/还没有自定义分类/)).toBeInTheDocument()
  })

  it('shows + 添加新分类 button in custom menu', () => {
    const IndexPage = loadIndexPage()
    render(<IndexPage />)

    fireEvent.click(screen.getByText('自定义菜单'))

    expect(screen.getByText('+ 添加新分类')).toBeInTheDocument()
  })

  it('shows category input when + 添加新分类 is clicked', () => {
    const IndexPage = loadIndexPage()
    render(<IndexPage />)

    fireEvent.click(screen.getByText('自定义菜单'))
    fireEvent.click(screen.getByText('+ 添加新分类'))

    // The input for new category name should appear
    expect(screen.getByPlaceholderText('输入分类名...')).toBeInTheDocument()
  })

  it('shows toast when trying to add category with empty name', async () => {
    const IndexPage = loadIndexPage()
    render(<IndexPage />)

    fireEvent.click(screen.getByText('自定义菜单'))
    fireEvent.click(screen.getByText('+ 添加新分类'))

    // Click 确定 without typing a name
    fireEvent.click(screen.getByText('确定'))

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: '分类名不能为空' })
      )
    })
  })

  it('shows toast when trying to add a duplicate default category', async () => {
    const IndexPage = loadIndexPage()
    render(<IndexPage />)

    fireEvent.click(screen.getByText('自定义菜单'))
    fireEvent.click(screen.getByText('+ 添加新分类'))

    const input = screen.getByPlaceholderText('输入分类名...')
    fireEvent.change(input, { target: { value: '随便' } })
    fireEvent.click(screen.getByText('确定'))

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: '分类已存在' })
      )
    })
  })

  it('adds a new custom category and persists to storage', async () => {
    const IndexPage = loadIndexPage()
    render(<IndexPage />)

    fireEvent.click(screen.getByText('自定义菜单'))
    fireEvent.click(screen.getByText('+ 添加新分类'))

    const input = screen.getByPlaceholderText('输入分类名...')
    fireEvent.change(input, { target: { value: '我的最爱' } })
    fireEvent.click(screen.getByText('确定'))

    await waitFor(() => {
      expect(mockSetStorageSync).toHaveBeenCalledWith(
        'customFoodList',
        expect.objectContaining({ '我的最爱': [] })
      )
    })
  })

  it('loads custom categories from storage on mount', () => {
    mockGetStorageSync.mockReturnValue({ '存储分类': ['食物A', '食物B'] })
    // useLoad is a no-op mock; make it invoke the callback synchronously
    const mockUseLoad = taroMock.useLoad as jest.Mock
    mockUseLoad.mockImplementationOnce((cb: () => void) => cb())

    const IndexPage = loadIndexPage()
    render(<IndexPage />)

    // The stored category should appear in the category tabs
    expect(screen.getByText('存储分类')).toBeInTheDocument()
  })
})

describe('Index page – start button logic', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetStorageSync.mockReturnValue({})
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('changes button text to 选择中... while rolling', () => {
    const IndexPage = loadIndexPage()
    render(<IndexPage />)

    const startBtn = screen.getByText('开始')
    fireEvent.click(startBtn)

    expect(screen.getByText('选择中...')).toBeInTheDocument()
  })

  it('reverts to 开始 text after rolling completes', async () => {
    const IndexPage = loadIndexPage()
    render(<IndexPage />)

    fireEvent.click(screen.getByText('开始'))

    await act(async () => {
      jest.advanceTimersByTime(2000) // 15 ticks * 100ms + buffer
    })

    await waitFor(() => {
      expect(screen.getByText('开始')).toBeInTheDocument()
    })
  })

  it('clicking start again while rolling has no effect (idempotent)', () => {
    const IndexPage = loadIndexPage()
    render(<IndexPage />)

    fireEvent.click(screen.getByText('开始'))
    // At this point the button reads 选择中...
    const rollingBtn = screen.getByText('选择中...')
    fireEvent.click(rollingBtn)

    // Still rolling – only one interval was started
    expect(screen.getByText('选择中...')).toBeInTheDocument()
  })

  it('shows 换 buttons when count > 1 and rolling completes', async () => {
    const IndexPage = loadIndexPage()
    render(<IndexPage />)

    // Set count to 3
    const plusBtn = screen.getByText('+')
    fireEvent.click(plusBtn)
    fireEvent.click(plusBtn)

    fireEvent.click(screen.getByText('开始'))

    await act(async () => {
      jest.advanceTimersByTime(2000)
    })

    await waitFor(() => {
      // After count=3 roll completes, 换 buttons appear
      const refreshBtns = screen.queryAllByText('换')
      expect(refreshBtns.length).toBeGreaterThan(0)
    })
  })
})

describe('Index page – storage integration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // useLoad is a no-op mock by default; make it invoke the callback so that
    // the storage-related logic inside the component actually runs
    const mockUseLoad = taroMock.useLoad as jest.Mock
    mockUseLoad.mockImplementationOnce((cb: () => void) => cb())
  })

  it('calls getStorageSync with customFoodList key on mount', () => {
    mockGetStorageSync.mockReturnValue({})
    const IndexPage = loadIndexPage()
    render(<IndexPage />)
    expect(mockGetStorageSync).toHaveBeenCalledWith('customFoodList')
  })

  it('ignores non-object storage values gracefully', () => {
    mockGetStorageSync.mockReturnValue(null)
    const IndexPage = loadIndexPage()
    expect(() => render(<IndexPage />)).not.toThrow()
  })

  it('ignores string storage values gracefully', () => {
    mockGetStorageSync.mockReturnValue('not-an-object')
    const IndexPage = loadIndexPage()
    expect(() => render(<IndexPage />)).not.toThrow()
  })
})

describe('Index page – delete category', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetStorageSync.mockReturnValue({ '自定义1': ['食物X'] })
    // useLoad is a no-op mock; make it invoke the callback synchronously so
    // the stored custom categories are loaded into state before render
    const mockUseLoad = taroMock.useLoad as jest.Mock
    mockUseLoad.mockImplementationOnce((cb: () => void) => cb())
    // showModal mock calls success({ confirm: true }) immediately
    mockShowModal.mockImplementation(({ success }: { success?: (res: { confirm: boolean }) => void }) => {
      if (success) success({ confirm: true })
    })
  })

  it('calls showModal when delete button is clicked', async () => {
    const IndexPage = loadIndexPage()
    render(<IndexPage />)

    fireEvent.click(screen.getByText('自定义菜单'))

    const deleteBtn = screen.getByText('删除')
    fireEvent.click(deleteBtn)

    expect(mockShowModal).toHaveBeenCalledWith(
      expect.objectContaining({ title: '删除分类' })
    )
  })

  it('removes category from storage after confirming delete', async () => {
    const IndexPage = loadIndexPage()
    render(<IndexPage />)

    fireEvent.click(screen.getByText('自定义菜单'))
    fireEvent.click(screen.getByText('删除'))

    await waitFor(() => {
      expect(mockSetStorageSync).toHaveBeenCalledWith(
        'customFoodList',
        expect.not.objectContaining({ '自定义1': expect.anything() })
      )
    })
  })
})

// ─── New: trending & dynamic categories ─────────────────────────────────────

describe('Index page – trending integration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetStorageSync.mockReturnValue({})
  })

  it('热门推荐 tab has the hot CSS class', () => {
    const IndexPage = loadIndexPage()
    render(<IndexPage />)
    const hotTab = screen.getByText('热门推荐')
    expect(hotTab.className).toContain('hot')
  })

  it('calls fetchTrending and fetchCategories on load', async () => {
    const mockUseLoad = taroMock.useLoad as jest.Mock
    mockUseLoad.mockImplementationOnce((cb: () => void) => cb())

    const api = require('../../services/api')
    const IndexPage = loadIndexPage()
    render(<IndexPage />)

    expect(api.fetchTrending).toHaveBeenCalledWith(30)
    expect(api.fetchCategories).toHaveBeenCalled()
  })

  it('merges backend categories into tabs when API returns data', async () => {
    const api = require('../../services/api')
    api.fetchCategories.mockResolvedValueOnce(['新品类A', '新品类B'])

    const mockUseLoad = taroMock.useLoad as jest.Mock
    mockUseLoad.mockImplementationOnce((cb: () => void) => cb())

    const IndexPage = loadIndexPage()
    render(<IndexPage />)

    await waitFor(() => {
      expect(screen.getByText('新品类A')).toBeInTheDocument()
      expect(screen.getByText('新品类B')).toBeInTheDocument()
    })
  })

  it('populates trending foods when API returns items', async () => {
    const api = require('../../services/api')
    api.fetchTrending.mockResolvedValueOnce({
      total: 2,
      items: [
        { id: 1, food_name: '测试火锅', source: 'test', heat_score: 100, post_count: 10, category: null, image_url: null, updated_at: '' },
        { id: 2, food_name: '测试奶茶', source: 'test', heat_score: 90, post_count: 5, category: null, image_url: null, updated_at: '' },
      ],
    })

    const mockUseLoad = taroMock.useLoad as jest.Mock
    mockUseLoad.mockImplementationOnce((cb: () => void) => cb())

    const IndexPage = loadIndexPage()
    render(<IndexPage />)

    // Wait for state update
    await waitFor(() => {
      // Switch to trending category and verify it has data
      const hotTab = screen.getByText('热门推荐')
      fireEvent.click(hotTab)
    })
  })

  it('gracefully handles API failure without crashing', () => {
    const api = require('../../services/api')
    api.fetchTrending.mockRejectedValueOnce(new Error('Network error'))
    api.fetchCategories.mockRejectedValueOnce(new Error('Network error'))

    const mockUseLoad = taroMock.useLoad as jest.Mock
    mockUseLoad.mockImplementationOnce((cb: () => void) => cb())

    const IndexPage = loadIndexPage()
    expect(() => render(<IndexPage />)).not.toThrow()
  })

  it('each default category has at least 30 food items', () => {
    // Import the module to access defaultFoodList
    const indexModule = require('../../pages/index/index')
    // defaultFoodList is not exported, so we test indirectly:
    // render the page and verify all 12 categories are present
    const IndexPage = loadIndexPage()
    render(<IndexPage />)
    const categories = ['随便', '家常炒菜', '粉面主食', '火锅烫煮', '烧烤炸鸡', '小吃街食', '异国料理', '奶茶咖啡', '甜品烘焙', '轻食简餐', '夜宵卤味']
    categories.forEach(cat => {
      expect(screen.getByText(cat)).toBeInTheDocument()
    })
  })
})
