import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import * as taroMock from '@tarojs/taro'

// ─── Mock recipe data functions ───────────────────────────────────────────────
jest.mock('../../data/recipes', () => ({
  __esModule: true,
  getLocalRecipe: jest.fn(),
  fetchRecipeFromAPI: jest.fn(),
  default: {},
}))

import { getLocalRecipe, fetchRecipeFromAPI } from '../../data/recipes'

const mockGetLocalRecipe = getLocalRecipe as jest.Mock
const mockFetchRecipeFromAPI = fetchRecipeFromAPI as jest.Mock
const mockUseRouter = taroMock.useRouter as jest.Mock

// ─────────────────────────────────────────────────────────────────────────────

function loadPage() {
  // Re-require after mocks are set so the module picks up fresh mock state
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { default: RecipePage } = require('../../pages/recipe/recipe')
  return RecipePage as React.ComponentType
}

describe('RecipePage – loading state', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseRouter.mockReturnValue({ params: { name: encodeURIComponent('番茄炒蛋') } })
  })

  it('renders the loading text initially when API is slow', async () => {
    mockGetLocalRecipe.mockReturnValue(null)
    // fetchRecipeFromAPI never resolves during this test
    mockFetchRecipeFromAPI.mockImplementation(() => new Promise(() => undefined))

    const RecipePage = loadPage()
    render(<RecipePage />)

    // Loading state should be visible immediately
    expect(screen.getByText('加载中...')).toBeInTheDocument()
  })

  it('does not show loading once local recipe is found synchronously', async () => {
    const mockRecipe = {
      name: '番茄炒蛋',
      summary: '家常第一菜，酸甜下饭',
      ingredients: ['番茄 2个', '鸡蛋 3个'],
      steps: ['切块', '炒制'],
    }
    mockGetLocalRecipe.mockReturnValue(mockRecipe)

    const RecipePage = loadPage()
    render(<RecipePage />)

    // After effect fires, loading disappears and recipe content appears
    await waitFor(() => {
      expect(screen.queryByText('加载中...')).not.toBeInTheDocument()
    })
  })
})

describe('RecipePage – recipe found (local)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseRouter.mockReturnValue({ params: { name: encodeURIComponent('番茄炒蛋') } })
  })

  it('displays the recipe name', async () => {
    mockGetLocalRecipe.mockReturnValue({
      name: '番茄炒蛋',
      summary: '家常第一菜',
      ingredients: ['番茄 2个', '鸡蛋 3个'],
      steps: ['切块', '炒制'],
    })

    const RecipePage = loadPage()
    render(<RecipePage />)

    await waitFor(() => {
      expect(screen.getByText('番茄炒蛋')).toBeInTheDocument()
    })
  })

  it('displays the recipe summary', async () => {
    mockGetLocalRecipe.mockReturnValue({
      name: '番茄炒蛋',
      summary: '家常第一菜，酸甜下饭，10分钟搞定',
      ingredients: ['番茄 2个'],
      steps: ['炒制'],
    })

    const RecipePage = loadPage()
    render(<RecipePage />)

    await waitFor(() => {
      expect(screen.getByText('家常第一菜，酸甜下饭，10分钟搞定')).toBeInTheDocument()
    })
  })

  it('displays all ingredients', async () => {
    mockGetLocalRecipe.mockReturnValue({
      name: '番茄炒蛋',
      summary: '经典家常菜',
      ingredients: ['番茄 2个', '鸡蛋 3个', '盐 适量'],
      steps: ['炒制'],
    })

    const RecipePage = loadPage()
    render(<RecipePage />)

    await waitFor(() => {
      expect(screen.getByText('番茄 2个')).toBeInTheDocument()
      expect(screen.getByText('鸡蛋 3个')).toBeInTheDocument()
      expect(screen.getByText('盐 适量')).toBeInTheDocument()
    })
  })

  it('displays all cooking steps', async () => {
    mockGetLocalRecipe.mockReturnValue({
      name: '番茄炒蛋',
      summary: '经典家常菜',
      ingredients: ['番茄'],
      steps: ['番茄切块，鸡蛋打散', '锅中倒油烧热', '翻炒均匀出锅'],
    })

    const RecipePage = loadPage()
    render(<RecipePage />)

    await waitFor(() => {
      expect(screen.getByText('番茄切块，鸡蛋打散')).toBeInTheDocument()
      expect(screen.getByText('锅中倒油烧热')).toBeInTheDocument()
      expect(screen.getByText('翻炒均匀出锅')).toBeInTheDocument()
    })
  })

  it('shows the 食材准备 section title', async () => {
    mockGetLocalRecipe.mockReturnValue({
      name: '番茄炒蛋',
      summary: '简单',
      ingredients: ['番茄'],
      steps: ['炒'],
    })

    const RecipePage = loadPage()
    render(<RecipePage />)

    await waitFor(() => {
      expect(screen.getByText('食材准备')).toBeInTheDocument()
    })
  })

  it('shows the 做法步骤 section title', async () => {
    mockGetLocalRecipe.mockReturnValue({
      name: '番茄炒蛋',
      summary: '简单',
      ingredients: ['番茄'],
      steps: ['炒'],
    })

    const RecipePage = loadPage()
    render(<RecipePage />)

    await waitFor(() => {
      expect(screen.getByText('做法步骤')).toBeInTheDocument()
    })
  })
})

describe('RecipePage – recipe not found', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('shows 暂无菜谱 when both local and API return null', async () => {
    mockUseRouter.mockReturnValue({ params: { name: encodeURIComponent('不存在的菜') } })
    mockGetLocalRecipe.mockReturnValue(null)
    mockFetchRecipeFromAPI.mockResolvedValue(null)

    const RecipePage = loadPage()
    render(<RecipePage />)

    await waitFor(() => {
      expect(screen.getByText('暂无菜谱')).toBeInTheDocument()
    })
  })

  it('shows the dish name in the not-found message', async () => {
    mockUseRouter.mockReturnValue({ params: { name: encodeURIComponent('神秘食物') } })
    mockGetLocalRecipe.mockReturnValue(null)
    mockFetchRecipeFromAPI.mockResolvedValue(null)

    const RecipePage = loadPage()
    render(<RecipePage />)

    await waitFor(() => {
      expect(screen.getByText(/神秘食物/)).toBeInTheDocument()
    })
  })

  it('does not show 加载中... after API resolves to null', async () => {
    mockUseRouter.mockReturnValue({ params: { name: encodeURIComponent('不存在') } })
    mockGetLocalRecipe.mockReturnValue(null)
    mockFetchRecipeFromAPI.mockResolvedValue(null)

    const RecipePage = loadPage()
    render(<RecipePage />)

    await waitFor(() => {
      expect(screen.queryByText('加载中...')).not.toBeInTheDocument()
    })
  })
})

describe('RecipePage – no name param', () => {
  it('does not show 加载中... when name param is empty', async () => {
    mockUseRouter.mockReturnValue({ params: {} })
    mockGetLocalRecipe.mockReturnValue(null)
    mockFetchRecipeFromAPI.mockResolvedValue(null)

    const RecipePage = loadPage()
    render(<RecipePage />)

    await waitFor(() => {
      expect(screen.queryByText('加载中...')).not.toBeInTheDocument()
    })
  })
})

describe('RecipePage – fetches from API as fallback', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseRouter.mockReturnValue({ params: { name: encodeURIComponent('API菜') } })
  })

  it('tries fetchRecipeFromAPI when local recipe is not found', async () => {
    mockGetLocalRecipe.mockReturnValue(null)
    mockFetchRecipeFromAPI.mockResolvedValue(null)

    const RecipePage = loadPage()
    render(<RecipePage />)

    await waitFor(() => {
      expect(mockFetchRecipeFromAPI).toHaveBeenCalledWith('API菜')
    })
  })

  it('does NOT call fetchRecipeFromAPI when local recipe exists', async () => {
    mockGetLocalRecipe.mockReturnValue({
      name: 'API菜',
      summary: '本地有',
      ingredients: ['食材'],
      steps: ['步骤'],
    })

    const RecipePage = loadPage()
    render(<RecipePage />)

    await waitFor(() => {
      expect(screen.getByText('API菜')).toBeInTheDocument()
    })

    expect(mockFetchRecipeFromAPI).not.toHaveBeenCalled()
  })

  it('displays API recipe when local not found but API succeeds', async () => {
    mockGetLocalRecipe.mockReturnValue(null)
    mockFetchRecipeFromAPI.mockResolvedValue({
      name: 'API菜',
      summary: 'API找到的菜',
      ingredients: ['特殊食材A'],
      steps: ['API步骤一', 'API步骤二'],
    })

    const RecipePage = loadPage()
    render(<RecipePage />)

    await waitFor(() => {
      expect(screen.getByText('API菜')).toBeInTheDocument()
      expect(screen.getByText('API找到的菜')).toBeInTheDocument()
    })
  })
})
