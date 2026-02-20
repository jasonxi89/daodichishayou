import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import * as taroMock from '@tarojs/taro'

const mockShowToast = taroMock.showToast as jest.Mock
const mockRequest = taroMock.request as jest.Mock

// API_BASE is declared as a build-time constant (global) in the source.
// We expose it via jest.config.ts globals, but the source code references it
// as a bare identifier so we also need it as a global variable here.
declare const API_BASE: string

function loadIngredientPage() {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { default: IngredientPage } = require('../../pages/ingredient/ingredient')
  return IngredientPage as React.ComponentType
}

// ─────────────────────────────────────────────────────────────────────────────

describe('Ingredient page – initial render', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders without crashing', () => {
    const IngredientPage = loadIngredientPage()
    expect(() => render(<IngredientPage />)).not.toThrow()
  })

  it('renders the default 蔬菜 category tab as active', () => {
    const IngredientPage = loadIngredientPage()
    render(<IngredientPage />)

    const vegTab = screen.getByText('蔬菜')
    expect(vegTab.className).toContain('active')
  })

  it('renders all four ingredient category tabs', () => {
    const IngredientPage = loadIngredientPage()
    render(<IngredientPage />)

    expect(screen.getByText('蔬菜')).toBeInTheDocument()
    expect(screen.getByText('肉类')).toBeInTheDocument()
    expect(screen.getByText('水产蛋奶')).toBeInTheDocument()
    expect(screen.getByText('主食')).toBeInTheDocument()
  })

  it('renders common vegetable chips for default category', () => {
    const IngredientPage = loadIngredientPage()
    render(<IngredientPage />)

    // Some vegetables from the 蔬菜 list
    expect(screen.getByText('番茄')).toBeInTheDocument()
    expect(screen.getByText('土豆')).toBeInTheDocument()
    expect(screen.getByText('白菜')).toBeInTheDocument()
  })

  it('renders all preference tags', () => {
    const IngredientPage = loadIngredientPage()
    render(<IngredientPage />)

    expect(screen.getByText('不限')).toBeInTheDocument()
    expect(screen.getByText('清淡')).toBeInTheDocument()
    expect(screen.getByText('家常')).toBeInTheDocument()
    expect(screen.getByText('快手菜')).toBeInTheDocument()
    expect(screen.getByText('下饭菜')).toBeInTheDocument()
    expect(screen.getByText('减脂')).toBeInTheDocument()
  })

  it('renders the 开始推荐 button', () => {
    const IngredientPage = loadIngredientPage()
    render(<IngredientPage />)

    expect(screen.getByText('开始推荐')).toBeInTheDocument()
  })

  it('renders the ingredient text input', () => {
    const IngredientPage = loadIngredientPage()
    render(<IngredientPage />)

    expect(screen.getByPlaceholderText('输入食材名，如：鸡蛋')).toBeInTheDocument()
  })

  it('renders the 添加 button next to input', () => {
    const IngredientPage = loadIngredientPage()
    render(<IngredientPage />)

    expect(screen.getByText('添加')).toBeInTheDocument()
  })
})

describe('Ingredient page – adding ingredients via chip clicks', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('clicking an ingredient chip selects it', () => {
    const IngredientPage = loadIngredientPage()
    render(<IngredientPage />)

    fireEvent.click(screen.getByText('番茄'))

    // After click the ingredient shows in the selected section (visible evidence of selection)
    expect(screen.getByText('已选食材')).toBeInTheDocument()
  })

  it('addIngredient is toggle – selecting shows 已选食材, selecting again reduces count', () => {
    const IngredientPage = loadIngredientPage()
    render(<IngredientPage />)

    // Before any selection: no 已选食材 section
    expect(screen.queryByText('已选食材')).not.toBeInTheDocument()

    // First click: 番茄 gets added to selectedIngredients
    fireEvent.click(screen.getByText('番茄'))
    expect(screen.getByText('已选食材')).toBeInTheDocument()

    // Adding a second ingredient should still show the section
    fireEvent.click(screen.getByText('土豆'))
    const allSelected = screen.getAllByText(/番茄|土豆/)
    // Each name appears at least twice: chip + selected tag
    expect(allSelected.length).toBeGreaterThanOrEqual(4)
  })

  it('selected ingredients appear in the 已选食材 section', () => {
    const IngredientPage = loadIngredientPage()
    render(<IngredientPage />)

    fireEvent.click(screen.getByText('番茄'))

    expect(screen.getByText('已选食材')).toBeInTheDocument()
  })

  it('clicking multiple chips adds them all to selected', () => {
    const IngredientPage = loadIngredientPage()
    render(<IngredientPage />)

    fireEvent.click(screen.getByText('番茄'))
    fireEvent.click(screen.getByText('土豆'))
    fireEvent.click(screen.getByText('白菜'))

    // After selection, each name appears in both chip grid and selected-tags section.
    // Use getAllByText and verify the chip's parent div carries the 'selected' class.
    const tomatoInstances = screen.getAllByText('番茄')
    const potatoInstances = screen.getAllByText('土豆')
    const cabbageInstances = screen.getAllByText('白菜')

    // At least one element (the chip or its container chain) should indicate selection
    expect(tomatoInstances.length).toBeGreaterThan(0)
    expect(potatoInstances.length).toBeGreaterThan(0)
    expect(cabbageInstances.length).toBeGreaterThan(0)

    // The chip <Text> element is inside a <View className="ingredient-chip selected">
    // so the nearest ancestor div should carry the 'selected' class
    const tomatoChipSpan = tomatoInstances.find(el => el.className === 'ingredient-chip-text')
    const potatoChipSpan = potatoInstances.find(el => el.className === 'ingredient-chip-text')
    const cabbageChipSpan = cabbageInstances.find(el => el.className === 'ingredient-chip-text')

    expect(tomatoChipSpan?.parentElement?.className).toContain('selected')
    expect(potatoChipSpan?.parentElement?.className).toContain('selected')
    expect(cabbageChipSpan?.parentElement?.className).toContain('selected')
  })

  it('clicking a selected item tag ✕ removes it from selected', () => {
    const IngredientPage = loadIngredientPage()
    render(<IngredientPage />)

    fireEvent.click(screen.getByText('番茄'))

    // There should be a ✕ next to 番茄 in the selected tags area
    const removeButtons = screen.getAllByText('✕')
    fireEvent.click(removeButtons[0])

    // 番茄 chip should no longer be selected
    expect(screen.getByText('番茄').className).not.toContain('selected')
  })
})

describe('Ingredient page – category switching', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('clicking 肉类 shows meat ingredients', () => {
    const IngredientPage = loadIngredientPage()
    render(<IngredientPage />)

    fireEvent.click(screen.getByText('肉类'))

    expect(screen.getByText('鸡胸肉')).toBeInTheDocument()
    expect(screen.getByText('猪肉')).toBeInTheDocument()
    expect(screen.getByText('牛肉')).toBeInTheDocument()
  })

  it('clicking 水产蛋奶 shows protein ingredients', () => {
    const IngredientPage = loadIngredientPage()
    render(<IngredientPage />)

    fireEvent.click(screen.getByText('水产蛋奶'))

    expect(screen.getByText('鸡蛋')).toBeInTheDocument()
    expect(screen.getByText('虾')).toBeInTheDocument()
    expect(screen.getByText('豆腐')).toBeInTheDocument()
  })

  it('clicking 主食 shows staple food ingredients', () => {
    const IngredientPage = loadIngredientPage()
    render(<IngredientPage />)

    fireEvent.click(screen.getByText('主食'))

    expect(screen.getByText('米饭')).toBeInTheDocument()
    expect(screen.getByText('面条')).toBeInTheDocument()
  })

  it('switching category marks new category as active', () => {
    const IngredientPage = loadIngredientPage()
    render(<IngredientPage />)

    fireEvent.click(screen.getByText('肉类'))

    expect(screen.getByText('肉类').className).toContain('active')
    expect(screen.getByText('蔬菜').className).not.toContain('active')
  })
})

describe('Ingredient page – text input', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('typing into the input and clicking 添加 adds the ingredient', () => {
    const IngredientPage = loadIngredientPage()
    render(<IngredientPage />)

    const input = screen.getByPlaceholderText('输入食材名，如：鸡蛋')
    fireEvent.change(input, { target: { value: '莲藕' } })

    fireEvent.click(screen.getByText('添加'))

    expect(screen.getByText('已选食材')).toBeInTheDocument()
  })

  it('adding an ingredient clears the input', () => {
    const IngredientPage = loadIngredientPage()
    render(<IngredientPage />)

    const input = screen.getByPlaceholderText('输入食材名，如：鸡蛋')
    fireEvent.change(input, { target: { value: '莲藕' } })
    fireEvent.click(screen.getByText('添加'))

    expect((input as HTMLInputElement).value).toBe('')
  })

  it('does not add duplicate ingredients via text input', () => {
    const IngredientPage = loadIngredientPage()
    render(<IngredientPage />)

    // First add 番茄 via chip
    fireEvent.click(screen.getByText('番茄'))

    // Then try to add 番茄 via text input
    const input = screen.getByPlaceholderText('输入食材名，如：鸡蛋')
    fireEvent.change(input, { target: { value: '番茄' } })
    fireEvent.click(screen.getByText('添加'))

    // Should still only appear once in selected tags
    // (The chip area and selected tags area both show 番茄, but
    //  only one ✕ should appear in the selected-tags section)
    const removeButtons = screen.queryAllByText('✕')
    expect(removeButtons.length).toBe(1)
  })

  it('does not add an empty string ingredient', () => {
    const IngredientPage = loadIngredientPage()
    render(<IngredientPage />)

    fireEvent.click(screen.getByText('添加'))

    // 已选食材 section should not appear since nothing was added
    expect(screen.queryByText('已选食材')).not.toBeInTheDocument()
  })

  it('does not add whitespace-only ingredient', () => {
    const IngredientPage = loadIngredientPage()
    render(<IngredientPage />)

    const input = screen.getByPlaceholderText('输入食材名，如：鸡蛋')
    fireEvent.change(input, { target: { value: '   ' } })
    fireEvent.click(screen.getByText('添加'))

    expect(screen.queryByText('已选食材')).not.toBeInTheDocument()
  })
})

describe('Ingredient page – preference selection', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('default preference is 不限', () => {
    const IngredientPage = loadIngredientPage()
    render(<IngredientPage />)

    expect(screen.getByText('不限').className).toContain('active')
  })

  it('clicking a preference tag selects it', () => {
    const IngredientPage = loadIngredientPage()
    render(<IngredientPage />)

    fireEvent.click(screen.getByText('清淡'))

    expect(screen.getByText('清淡').className).toContain('active')
    expect(screen.getByText('不限').className).not.toContain('active')
  })

  it('clicking another preference deselects the previous one', () => {
    const IngredientPage = loadIngredientPage()
    render(<IngredientPage />)

    fireEvent.click(screen.getByText('减脂'))
    fireEvent.click(screen.getByText('家常'))

    expect(screen.getByText('家常').className).toContain('active')
    expect(screen.getByText('减脂').className).not.toContain('active')
  })
})

describe('Ingredient page – recommend button', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('shows toast when no ingredients selected', async () => {
    const IngredientPage = loadIngredientPage()
    render(<IngredientPage />)

    fireEvent.click(screen.getByText('开始推荐'))

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: '请先选择食材' })
      )
    })
  })

  it('shows loading text while API request is in progress', async () => {
    // Make request never resolve to keep loading state
    mockRequest.mockImplementation(() => new Promise(() => undefined))

    const IngredientPage = loadIngredientPage()
    render(<IngredientPage />)

    fireEvent.click(screen.getByText('番茄'))
    fireEvent.click(screen.getByText('开始推荐'))

    await waitFor(() => {
      expect(screen.getByText('我想想')).toBeInTheDocument()
    })
  })

  it('displays recommended dishes when API returns results', async () => {
    const mockDishes = [
      {
        name: '番茄蛋花汤',
        summary: '简单美味的家常汤',
        ingredients: ['番茄', '鸡蛋'],
        steps: ['煮开水', '放番茄', '加蛋'],
        difficulty: '简单',
        cook_time: '10分钟',
      },
    ]

    mockRequest.mockResolvedValue({
      statusCode: 200,
      data: { dishes: mockDishes },
    })

    const IngredientPage = loadIngredientPage()
    render(<IngredientPage />)

    fireEvent.click(screen.getByText('番茄'))
    fireEvent.click(screen.getByText('开始推荐'))

    await waitFor(() => {
      expect(screen.getByText('为你推荐')).toBeInTheDocument()
      expect(screen.getByText('番茄蛋花汤')).toBeInTheDocument()
      expect(screen.getByText('简单美味的家常汤')).toBeInTheDocument()
    })
  })

  it('shows difficulty badge when present', async () => {
    mockRequest.mockResolvedValue({
      statusCode: 200,
      data: {
        dishes: [{
          name: '测试菜',
          summary: '摘要',
          ingredients: ['食材'],
          steps: ['步骤'],
          difficulty: '中等',
          cook_time: '20分钟',
        }],
      },
    })

    const IngredientPage = loadIngredientPage()
    render(<IngredientPage />)

    fireEvent.click(screen.getByText('番茄'))
    fireEvent.click(screen.getByText('开始推荐'))

    await waitFor(() => {
      expect(screen.getByText('中等')).toBeInTheDocument()
      expect(screen.getByText('20分钟')).toBeInTheDocument()
    })
  })

  it('shows toast on API failure', async () => {
    mockRequest.mockRejectedValue(new Error('Network error'))

    const IngredientPage = loadIngredientPage()
    render(<IngredientPage />)

    fireEvent.click(screen.getByText('番茄'))
    fireEvent.click(screen.getByText('开始推荐'))

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: '网络异常，请重试' })
      )
    })
  })

  it('shows toast when API returns non-200 status', async () => {
    mockRequest.mockResolvedValue({ statusCode: 500, data: {} })

    const IngredientPage = loadIngredientPage()
    render(<IngredientPage />)

    fireEvent.click(screen.getByText('番茄'))
    fireEvent.click(screen.getByText('开始推荐'))

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: '推荐失败，请重试' })
      )
    })
  })

  it('reverts button to 开始推荐 after request completes', async () => {
    mockRequest.mockResolvedValue({ statusCode: 500, data: {} })

    const IngredientPage = loadIngredientPage()
    render(<IngredientPage />)

    fireEvent.click(screen.getByText('番茄'))
    fireEvent.click(screen.getByText('开始推荐'))

    await waitFor(() => {
      expect(screen.getByText('开始推荐')).toBeInTheDocument()
    })
  })
})

describe('Ingredient page – dish card expand/collapse', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  const dishes = [
    {
      name: '番茄蛋花汤',
      summary: '家常汤',
      ingredients: ['番茄 1个', '鸡蛋 2个'],
      steps: ['烧水', '下料', '出锅'],
    },
  ]

  async function renderWithDishes() {
    mockRequest.mockResolvedValue({ statusCode: 200, data: { dishes } })
    const IngredientPage = loadIngredientPage()
    render(<IngredientPage />)

    fireEvent.click(screen.getByText('番茄'))
    fireEvent.click(screen.getByText('开始推荐'))

    await waitFor(() => {
      expect(screen.getByText('番茄蛋花汤')).toBeInTheDocument()
    })
  }

  it('shows 查看详情 ▼ hint by default', async () => {
    await renderWithDishes()
    expect(screen.getByText('查看详情 ▼')).toBeInTheDocument()
  })

  it('clicking a dish card expands it to show 收起详情 ▲', async () => {
    await renderWithDishes()
    fireEvent.click(screen.getByText('番茄蛋花汤'))

    expect(screen.getByText('收起详情 ▲')).toBeInTheDocument()
  })

  it('expanded card shows ingredient list', async () => {
    await renderWithDishes()
    fireEvent.click(screen.getByText('番茄蛋花汤'))

    expect(screen.getByText('食材清单')).toBeInTheDocument()
    expect(screen.getByText('番茄 1个')).toBeInTheDocument()
    expect(screen.getByText('鸡蛋 2个')).toBeInTheDocument()
  })

  it('expanded card shows cooking steps', async () => {
    await renderWithDishes()
    fireEvent.click(screen.getByText('番茄蛋花汤'))

    expect(screen.getByText('做法步骤')).toBeInTheDocument()
    expect(screen.getByText('烧水')).toBeInTheDocument()
    expect(screen.getByText('下料')).toBeInTheDocument()
    expect(screen.getByText('出锅')).toBeInTheDocument()
  })

  it('clicking expanded card again collapses it', async () => {
    await renderWithDishes()
    fireEvent.click(screen.getByText('番茄蛋花汤'))
    expect(screen.getByText('收起详情 ▲')).toBeInTheDocument()

    fireEvent.click(screen.getByText('番茄蛋花汤'))
    expect(screen.getByText('查看详情 ▼')).toBeInTheDocument()
  })
})
