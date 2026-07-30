import { fireEvent, render, screen } from '@testing-library/react'
import RecipePopup from '../../components/RecipePopup'
import CustomMenuPopup from '../../components/CustomMenuPopup'

const recipe = {
  name: '番茄炒蛋',
  summary: '酸甜下饭',
  ingredients: ['番茄', '鸡蛋', '盐'],
  steps: ['炒鸡蛋', '炒番茄'],
}

function renderRecipePopup(overrides = {}) {
  const props = {
    foods: ['番茄炒蛋'],
    activeIndex: 0,
    recipes: { 番茄炒蛋: recipe },
    isLoading: false,
    onSwitchFood: jest.fn(),
    onViewDetail: jest.fn(),
    onClose: jest.fn(),
    ...overrides,
  }

  return { ...render(<RecipePopup {...props} />), props }
}

function renderCustomMenuPopup(overrides = {}) {
  const props = {
    customFoodList: {},
    onSave: jest.fn(),
    onClose: jest.fn(),
    onCategoryAdded: jest.fn(),
    onCategoryDeleted: jest.fn(),
    ...overrides,
  }

  return { ...render(<CustomMenuPopup {...props} />), props }
}

describe('RecipePopup theme contract', () => {
  it('renders the empty state without decorative emoji', () => {
    renderRecipePopup({
      foods: ['神秘菜'],
      recipes: { 神秘菜: null },
    })

    expect(document.body.textContent).not.toContain(String.fromCodePoint(0x1f937))
    expect(screen.getByText('暂无「神秘菜」的菜谱')).toBeInTheDocument()
    expect(screen.getByText('知道了')).toBeInTheDocument()
  })

  it('keeps the selected tab active for multiple foods', () => {
    renderRecipePopup({
      foods: ['番茄炒蛋', '酸菜鱼'],
      activeIndex: 1,
      recipes: { 番茄炒蛋: recipe, 酸菜鱼: null },
    })

    const activeTabText = screen.getByText('酸菜鱼')
    expect(activeTabText).toHaveClass('active')
    expect(activeTabText.closest('.recipe-tab')).toHaveClass('active')
  })

  it('renders the recipe title, ingredients and existing actions', () => {
    renderRecipePopup()

    expect(screen.getByText('番茄炒蛋')).toBeInTheDocument()
    expect(screen.getByText('食材')).toBeInTheDocument()
    expect(screen.getByText('查看详细做法')).toBeInTheDocument()
    expect(screen.getByText('关闭')).toBeInTheDocument()
  })
})

describe('CustomMenuPopup theme contract', () => {
  it('renders the title, empty state and add-category action', () => {
    renderCustomMenuPopup()

    expect(screen.getByText('我的菜单')).toBeInTheDocument()
    expect(screen.getByText('还没有自定义分类，点击下方添加')).toBeInTheDocument()
    expect(screen.getByText('+ 添加新分类')).toBeInTheDocument()
  })

  it('keeps the add-category interaction working', () => {
    renderCustomMenuPopup()

    fireEvent.click(screen.getByText('+ 添加新分类'))

    expect(screen.getByText('确定')).toBeInTheDocument()
    expect(screen.getByText('取消')).toBeInTheDocument()
  })
})
