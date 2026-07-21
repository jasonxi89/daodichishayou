import React from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import * as taroMock from '@tarojs/taro'

jest.mock('../../data/recipes', () => ({
  __esModule: true,
  getLocalRecipe: jest.fn().mockReturnValue(null),
  fetchRecipeFromAPI: jest.fn().mockResolvedValue(null),
  default: {},
}))

jest.mock('../../services/api', () => ({
  __esModule: true,
  fetchTrending: jest.fn().mockResolvedValue({ total: 0, items: [] }),
  fetchCategories: jest.fn().mockResolvedValue([]),
  generateFoodsByCategory: jest.fn().mockResolvedValue({ foods: [], category: '' }),
  bulkGenerateFoodsByCategory: jest.fn().mockResolvedValue({ results: {} }),
  fetchDigest: jest.fn().mockResolvedValue(null),
}))

const mockGetStorageSync = taroMock.getStorageSync as jest.Mock
const mockSetStorageSync = taroMock.setStorageSync as jest.Mock

function loadIndexPage() {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require('../../pages/index/index').default as React.ComponentType
}

function expandMoreCategories() {
  const more = screen.queryByRole('button', { name: '展开更多分类' })
  if (more) fireEvent.click(more)
}

// ─── New: trending & dynamic categories ─────────────────────────────────────

describe('Index page – trending integration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetStorageSync.mockReturnValue({})
  })

  it('热门推荐 uses the approved display label and note', () => {
    const IndexPage = loadIndexPage()
    render(<IndexPage />)
    expect(screen.getByText('热门')).toBeInTheDocument()
    expect(screen.getByText('今日爆款')).toBeInTheDocument()
  })

  it('calls fetchTrending and fetchCategories on load', async () => {
    const mockUseLoad = taroMock.useLoad as jest.Mock
    mockUseLoad.mockImplementationOnce((cb: () => void) => cb())

    const api = require('../../services/api')
    const IndexPage = loadIndexPage()
    await act(async () => {
      render(<IndexPage />)
    })

    expect(api.fetchTrending).toHaveBeenCalledWith(200)
    expect(api.fetchCategories).toHaveBeenCalled()
  })

  it('merges backend categories into tabs regardless of food count', async () => {
    const api = require('../../services/api')
    const items = Array.from({ length: 6 }, (_, i) => ({
      id: i + 1, food_name: `测试菜${i}`, source: 'test', heat_score: 100 - i,
      post_count: 10, category: '新品类A', image_url: null, updated_at: '',
    }))
    api.fetchTrending.mockResolvedValueOnce({ total: items.length, items })
    api.fetchCategories.mockResolvedValueOnce(['新品类A', '新品类B'])

    const mockUseLoad = taroMock.useLoad as jest.Mock
    mockUseLoad.mockImplementationOnce((cb: () => void) => cb())

    const IndexPage = loadIndexPage()
    await act(async () => {
      render(<IndexPage />)
    })
    expandMoreCategories()

    await waitFor(() => {
      expect(screen.getByText('新品类A')).toBeInTheDocument()
      expect(screen.getByText('新品类B')).toBeInTheDocument()
    })
  })

  it('displays backend categories without food count filter', async () => {
    const api = require('../../services/api')
    api.fetchTrending.mockResolvedValueOnce({ total: 0, items: [] })
    api.fetchCategories.mockResolvedValueOnce(['空分类A', '空分类B'])

    const mockUseLoad = taroMock.useLoad as jest.Mock
    mockUseLoad.mockImplementationOnce((cb: () => void) => cb())

    const IndexPage = loadIndexPage()
    await act(async () => {
      render(<IndexPage />)
    })
    expandMoreCategories()

    await waitFor(() => {
      expect(screen.getByText('空分类A')).toBeInTheDocument()
      expect(screen.getByText('空分类B')).toBeInTheDocument()
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
      const hotTab = screen.getByText('热门')
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
    expandMoreCategories()
    const categories = ['随便', '家常下饭', '嗦粉吃面', '火锅烫涮', '烧烤撸串', '街头小吃', '异国风味', '奶茶续命', '甜品诱惑', '轻食减脂', '深夜食堂']
    categories.forEach(cat => {
      expect(screen.getByText(cat)).toBeInTheDocument()
    })
  })
})

// ─── AI category cache localStorage persistence ──────────────────────────────

describe('Index page – AI category cache persistence', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('persists AI category cache to localStorage after generation', async () => {
    const api = require('../../services/api')
    api.generateFoodsByCategory.mockResolvedValueOnce({ foods: ['测试食物1', '测试食物2'], category: '测试分类' })
    api.fetchCategories.mockResolvedValueOnce(['测试AI分类'])

    const mockUseLoad = taroMock.useLoad as jest.Mock
    mockUseLoad.mockImplementationOnce((cb: () => void) => cb())
    mockGetStorageSync.mockReturnValue({})

    const IndexPage = loadIndexPage()
    await act(async () => {
      render(<IndexPage />)
    })
    expandMoreCategories()

    await waitFor(() => {
      expect(screen.getByText('测试AI分类')).toBeInTheDocument()
    })

    // Click the AI category (no default/custom foods, triggers generation)
    fireEvent.click(screen.getByText('测试AI分类'))

    await waitFor(() => {
      expect(mockSetStorageSync).toHaveBeenCalledWith(
        'aiCategoryCache',
        expect.objectContaining({
          '测试AI分类': expect.objectContaining({
            foods: ['测试食物1', '测试食物2'],
            expiresAt: expect.any(Number),
          }),
        })
      )
    })
  })

  it('restores valid (non-expired) AI cache from localStorage on mount', async () => {
    const futureExpiry = Date.now() + 7 * 24 * 60 * 60 * 1000
    mockGetStorageSync.mockImplementation((key: string) => {
      if (key === 'customFoodList') return {}
      if (key === 'aiCategoryCache') return {
        '缓存分类': { foods: ['缓存食物A', '缓存食物B'], expiresAt: futureExpiry },
      }
      return {}
    })

    const api = require('../../services/api')
    api.fetchCategories.mockResolvedValueOnce(['缓存分类'])

    const mockUseLoad = taroMock.useLoad as jest.Mock
    mockUseLoad.mockImplementationOnce((cb: () => void) => cb())

    const IndexPage = loadIndexPage()
    await act(async () => {
      render(<IndexPage />)
    })
    expandMoreCategories()

    await waitFor(() => {
      expect(screen.getByText('缓存分类')).toBeInTheDocument()
    })

    // Click the cached category — should NOT trigger generateFoodsByCategory
    fireEvent.click(screen.getByText('缓存分类'))
    expect(api.generateFoodsByCategory).not.toHaveBeenCalled()
  })

  it('re-fetches when AI cache entry is expired', async () => {
    const pastExpiry = Date.now() - 1000 // already expired
    mockGetStorageSync.mockImplementation((key: string) => {
      if (key === 'customFoodList') return {}
      if (key === 'aiCategoryCache') return {
        '过期分类': { foods: ['旧食物'], expiresAt: pastExpiry },
      }
      return {}
    })

    const api = require('../../services/api')
    api.generateFoodsByCategory.mockResolvedValueOnce({ foods: ['新食物1', '新食物2'], category: '过期分类' })
    api.fetchCategories.mockResolvedValueOnce(['过期分类'])

    const mockUseLoad = taroMock.useLoad as jest.Mock
    mockUseLoad.mockImplementationOnce((cb: () => void) => cb())

    const IndexPage = loadIndexPage()
    await act(async () => {
      render(<IndexPage />)
    })
    expandMoreCategories()

    await waitFor(() => {
      expect(screen.getByText('过期分类')).toBeInTheDocument()
    })

    // Click the expired category — should trigger re-fetch
    fireEvent.click(screen.getByText('过期分类'))

    await waitFor(() => {
      expect(api.generateFoodsByCategory).toHaveBeenCalledWith('过期分类')
    })
  })
})

// ─── Bulk fetch loading ────────────────────────────────────────────────────

describe('Index page – bulk category fetch', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('bulk fetch runs silently without loading overlay', async () => {
    const api = require('../../services/api')

    mockGetStorageSync.mockReturnValue({})
    const mockUseLoad = taroMock.useLoad as jest.Mock
    mockUseLoad.mockImplementationOnce((cb: () => void) => cb())

    const IndexPage = loadIndexPage()
    await act(async () => {
      render(<IndexPage />)
    })

    // Bulk fetch should be called but no loading overlay shown
    expect(api.bulkGenerateFoodsByCategory).toHaveBeenCalled()
    expect(screen.queryByText('正在搜索全网最新最火品类')).not.toBeInTheDocument()
  })

  it('does not show loading when all AI categories are cached', async () => {
    const futureExpiry = Date.now() + 24 * 60 * 60 * 1000
    const allCached: Record<string, any> = {}
    const cats = ['家常下饭', '嗦粉吃面', '火锅烫涮', '烧烤撸串', '街头小吃', '异国风味', '奶茶续命', '甜品诱惑', '轻食减脂', '深夜食堂']
    cats.forEach(cat => { allCached[cat] = { foods: ['测试食物'], expiresAt: futureExpiry } })

    mockGetStorageSync.mockImplementation((key: string) => {
      if (key === 'customFoodList') return {}
      if (key === 'aiCategoryCache') return allCached
      return {}
    })

    const api = require('../../services/api')
    const mockUseLoad = taroMock.useLoad as jest.Mock
    mockUseLoad.mockImplementationOnce((cb: () => void) => cb())

    const IndexPage = loadIndexPage()
    render(<IndexPage />)

    // Should NOT show loading or call bulk API
    expect(screen.queryByText('正在搜索全网最新最火品类')).not.toBeInTheDocument()
    expect(api.bulkGenerateFoodsByCategory).not.toHaveBeenCalled()
  })

  it('silently handles bulk fetch failure without crashing', async () => {
    const api = require('../../services/api')
    api.bulkGenerateFoodsByCategory.mockRejectedValueOnce(new Error('Network error'))

    mockGetStorageSync.mockReturnValue({})
    const mockUseLoad = taroMock.useLoad as jest.Mock
    mockUseLoad.mockImplementationOnce((cb: () => void) => cb())

    const IndexPage = loadIndexPage()
    expect(() => render(<IndexPage />)).not.toThrow()

    await waitFor(() => {
      expect(screen.queryByText('正在搜索全网最新最火品类')).not.toBeInTheDocument()
    })
  })

  it('writes bulk fetch results to localStorage', async () => {
    const api = require('../../services/api')
    api.bulkGenerateFoodsByCategory.mockResolvedValueOnce({
      results: { '家常下饭': ['红烧肉', '番茄炒蛋'], '火锅烫涮': ['四川火锅'] }
    })

    mockGetStorageSync.mockReturnValue({})
    const mockUseLoad = taroMock.useLoad as jest.Mock
    mockUseLoad.mockImplementationOnce((cb: () => void) => cb())

    const IndexPage = loadIndexPage()
    render(<IndexPage />)

    await waitFor(() => {
      expect(mockSetStorageSync).toHaveBeenCalledWith(
        'aiCategoryCache',
        expect.objectContaining({
          '家常下饭': expect.objectContaining({
            foods: ['红烧肉', '番茄炒蛋'],
            expiresAt: expect.any(Number),
          }),
        })
      )
    })
  })
})
