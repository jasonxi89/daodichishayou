import { fireEvent, render, screen } from '@testing-library/react'
import CustomMenuPopup from '../../components/CustomMenuPopup'

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
