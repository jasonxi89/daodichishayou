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
  fetchCategoryNotes: jest.fn().mockResolvedValue({}),
  generateFoodsByCategory: jest.fn().mockResolvedValue({ foods: [], category: '' }),
  bulkGenerateFoodsByCategory: jest.fn().mockResolvedValue({ results: {} }),
  fetchDigest: jest.fn().mockResolvedValue(null),
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

function expandMoreCategories() {
  const more = screen.queryByRole('button', { name: '展开更多分类' })
  if (more) fireEvent.click(more)
}

function openCustomMenu() {
  fireEvent.click(screen.getByRole('button', { name: '自定义菜单' }))
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

  it('shows the initial hero prompt 今晚食何', () => {
    const IndexPage = loadIndexPage()
    render(<IndexPage />)
    expect(screen.getByText('今晚食何')).toBeInTheDocument()
  })

  it('renders the 为我定夺 button', () => {
    const IndexPage = loadIndexPage()
    render(<IndexPage />)
    expect(screen.getByRole('button', { name: '为我定夺' })).toBeInTheDocument()
  })

  it('renders all default category tabs', () => {
    const IndexPage = loadIndexPage()
    render(<IndexPage />)
    expect(screen.getByText('随便')).toBeInTheDocument()
    expect(screen.getByText('热门')).toBeInTheDocument()
    expect(screen.getByText('家常下饭')).toBeInTheDocument()
    expect(screen.getByText('嗦粉吃面')).toBeInTheDocument()
    expect(screen.getByText('火锅烫涮')).toBeInTheDocument()
    expect(screen.getByText('烧烤撸串')).toBeInTheDocument()
    expandMoreCategories()
    expect(screen.getByText('街头小吃')).toBeInTheDocument()
    expect(screen.getByText('异国风味')).toBeInTheDocument()
    expect(screen.getByText('奶茶续命')).toBeInTheDocument()
    expect(screen.getByText('甜品诱惑')).toBeInTheDocument()
    expect(screen.getByText('轻食减脂')).toBeInTheDocument()
    expect(screen.getByText('深夜食堂')).toBeInTheDocument()
  })

  it('renders the count selector with default value 1', () => {
    const IndexPage = loadIndexPage()
    render(<IndexPage />)
    expect(screen.getByText('壹')).toBeInTheDocument()
    expect(screen.getByText('份数')).toBeInTheDocument()
  })

  it('does not render 分享美食 or 查看菜谱 buttons before selection', () => {
    const IndexPage = loadIndexPage()
    render(<IndexPage />)
    expect(screen.queryByText('分享美食')).not.toBeInTheDocument()
    expect(screen.queryByText('查看菜谱')).not.toBeInTheDocument()
  })

  it('renders the 自定义 menu entry', () => {
    const IndexPage = loadIndexPage()
    render(<IndexPage />)
    expect(screen.getByRole('button', { name: '自定义菜单' })).toBeInTheDocument()
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

    fireEvent.click(screen.getByRole('button', { name: '增加份数' }))

    expect(screen.getByText('贰')).toBeInTheDocument()
  })

  it('decrements count when - button is clicked after incrementing', () => {
    const IndexPage = loadIndexPage()
    render(<IndexPage />)

    fireEvent.click(screen.getByRole('button', { name: '增加份数' }))
    expect(screen.getByText('贰')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '减少份数' }))
    expect(screen.getByText('壹')).toBeInTheDocument()
  })

  it('does not decrement below 1', () => {
    const IndexPage = loadIndexPage()
    render(<IndexPage />)

    const minusBtn = screen.getByRole('button', { name: '减少份数' })
    fireEvent.click(minusBtn)
    fireEvent.click(minusBtn)

    expect(screen.getByText('壹')).toBeInTheDocument()
  })

  it('does not increment above 10', () => {
    const IndexPage = loadIndexPage()
    render(<IndexPage />)

    for (let i = 0; i < 15; i++) {
      fireEvent.click(screen.getByRole('button', { name: '增加份数' }))
    }

    expect(screen.getByText('拾')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '增加份数' })).toBeDisabled()
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

    const hotpotTab = screen.getByRole('button', { name: /火锅烫涮/ })
    fireEvent.click(hotpotTab)

    expect(hotpotTab).toHaveClass('menu-cell--active')
  })

  it('default active category is 随便', () => {
    const IndexPage = loadIndexPage()
    render(<IndexPage />)

    const defaultTab = screen.getByRole('button', { name: /随便/ })
    expect(defaultTab).toHaveClass('menu-cell--active')
  })

  it('clicking another category deselects current', () => {
    const IndexPage = loadIndexPage()
    render(<IndexPage />)

    const bbqTab = screen.getByRole('button', { name: /烧烤撸串/ })
    fireEvent.click(bbqTab)

    const randomTab = screen.getByRole('button', { name: /随便/ })
    expect(randomTab).not.toHaveClass('menu-cell--active')
    expect(bbqTab).toHaveClass('menu-cell--active')
  })
})

describe('Index page – 查看菜谱 button visibility', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetStorageSync.mockReturnValue({})
  })

  it('查看菜谱 button is hidden before food selection', () => {
    const IndexPage = loadIndexPage()
    render(<IndexPage />)
    expect(screen.queryByText('查看菜谱')).not.toBeInTheDocument()
  })
})

describe('Index page – custom menu', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetStorageSync.mockReturnValue({})
  })

  it('opens custom menu popup when ✏️ 自定义 tag is clicked', () => {
    const IndexPage = loadIndexPage()
    render(<IndexPage />)

    openCustomMenu()

    expect(screen.getByText('我的菜单')).toBeInTheDocument()
  })

  it('closes custom menu when ✕ is clicked', () => {
    const IndexPage = loadIndexPage()
    render(<IndexPage />)

    openCustomMenu()
    expect(screen.getByText('我的菜单')).toBeInTheDocument()

    // The close button contains ✕
    const closeBtn = screen.getByText('✕')
    fireEvent.click(closeBtn)

    expect(screen.queryByText('我的菜单')).not.toBeInTheDocument()
  })

  it('shows 还没有自定义分类 message when no custom categories exist', () => {
    const IndexPage = loadIndexPage()
    render(<IndexPage />)

    openCustomMenu()

    expect(screen.getByText(/还没有自定义分类/)).toBeInTheDocument()
  })

  it('shows + 添加新分类 button in custom menu', () => {
    const IndexPage = loadIndexPage()
    render(<IndexPage />)

    openCustomMenu()

    expect(screen.getByText('+ 添加新分类')).toBeInTheDocument()
  })

  it('shows category input when + 添加新分类 is clicked', () => {
    const IndexPage = loadIndexPage()
    render(<IndexPage />)

    openCustomMenu()
    fireEvent.click(screen.getByText('+ 添加新分类'))

    // The input for new category name should appear
    expect(screen.getByPlaceholderText('输入分类名...')).toBeInTheDocument()
  })

  it('shows toast when trying to add category with empty name', async () => {
    const IndexPage = loadIndexPage()
    render(<IndexPage />)

    openCustomMenu()
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

    openCustomMenu()
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

    openCustomMenu()
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

  it('loads custom categories from storage on mount', async () => {
    mockGetStorageSync.mockReturnValue({ '存储分类': ['食物A', '食物B'] })
    // useLoad is a no-op mock; make it invoke the callback synchronously
    const mockUseLoad = taroMock.useLoad as jest.Mock
    mockUseLoad.mockImplementationOnce((cb: () => void) => cb())

    const IndexPage = loadIndexPage()
    await act(async () => {
      render(<IndexPage />)
    })

    expandMoreCategories()
    expect(screen.getByText('存储分类')).toBeInTheDocument()
  })
})

describe('Index page – draw ceremony entry', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetStorageSync.mockReturnValue({})
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('replaces the home content with the ceremony while drawing', () => {
    const IndexPage = loadIndexPage()
    const { container } = render(<IndexPage />)

    fireEvent.click(screen.getByRole('button', { name: '为我定夺' }))

    expect(container.querySelector('.ceremony')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '为我定夺' })).not.toBeInTheDocument()
  })

  it('returns to the idle home screen after the ceremony completes', async () => {
    const IndexPage = loadIndexPage()
    const { container } = render(<IndexPage />)

    fireEvent.click(screen.getByRole('button', { name: '为我定夺' }))

    await act(async () => {
      jest.advanceTimersByTime(2500)
    })

    await waitFor(() => {
      expect(container.querySelector('.ceremony')).not.toBeInTheDocument()
    })

    // Navigation must confirm before the draw CTA is offered again.
    act(() => { mockNavigateTo.mock.calls[0][0].success?.() })
    expect(screen.getByRole('button', { name: '为我定夺' })).toBeInTheDocument()
  })

  it('skips straight to the result page when the tube is tapped', () => {
    const IndexPage = loadIndexPage()
    const { container } = render(<IndexPage />)

    fireEvent.click(screen.getByRole('button', { name: '为我定夺' }))
    expect(container.querySelectorAll('.ceremony')).toHaveLength(1)

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: '跳过摇签，立即揭晓' }))
    })

    expect(mockNavigateTo).toHaveBeenCalledWith(expect.objectContaining({ url: '/pages/result/result' }))
    expect(container.querySelector('.ceremony')).not.toBeInTheDocument()
  })

  it('sends multi-serving results to the result page instead of the home page', async () => {
    const IndexPage = loadIndexPage()
    render(<IndexPage />)

    fireEvent.click(screen.getByRole('button', { name: '增加份数' }))
    fireEvent.click(screen.getByRole('button', { name: '增加份数' }))
    fireEvent.click(screen.getByRole('button', { name: '为我定夺' }))

    await act(async () => {
      jest.advanceTimersByTime(2500)
    })

    const handoff = mockSetStorageSync.mock.calls.find(([key]) => key === 'lastDrawResult')
    expect(handoff).toBeDefined()
    expect(handoff![1].foods).toHaveLength(3)
    expect(screen.queryAllByText('换')).toHaveLength(0)
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

  it('calls getStorageSync with customFoodList and aiCategoryCache keys on mount', () => {
    mockGetStorageSync.mockReturnValue({})
    const IndexPage = loadIndexPage()
    render(<IndexPage />)
    expect(mockGetStorageSync).toHaveBeenCalledWith('customFoodList')
    expect(mockGetStorageSync).toHaveBeenCalledWith('aiCategoryCache')
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
    await act(async () => {
      render(<IndexPage />)
    })

    openCustomMenu()

    const deleteBtn = screen.getByText('删除')
    fireEvent.click(deleteBtn)

    expect(mockShowModal).toHaveBeenCalledWith(
      expect.objectContaining({ title: '删除分类' })
    )
  })

  it('removes category from storage after confirming delete', async () => {
    const IndexPage = loadIndexPage()
    await act(async () => {
      render(<IndexPage />)
    })

    openCustomMenu()
    fireEvent.click(screen.getByText('删除'))

    await waitFor(() => {
      expect(mockSetStorageSync).toHaveBeenCalledWith(
        'customFoodList',
        expect.not.objectContaining({ '自定义1': expect.anything() })
      )
    })
  })
})
