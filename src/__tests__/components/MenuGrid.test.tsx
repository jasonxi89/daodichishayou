import { fireEvent, render, screen } from '@testing-library/react'
import MenuGrid from '../../components/MenuGrid'
import { MENU_PRIMARY } from '../../data/categoryMeta'

const EXTRA_CATEGORIES = ['街头小吃', '异国风味']

function renderGrid(overrides = {}) {
  const props = {
    categories: [...MENU_PRIMARY, ...EXTRA_CATEGORIES],
    active: '随便',
    loadingCategory: null,
    onSelect: jest.fn(),
    onCustomize: jest.fn(),
    ...overrides,
  }
  return { ...render(<MenuGrid {...props} />), props }
}

describe('MenuGrid', () => {
  it('renders the approved primary menu and customize entry', () => {
    renderGrid()

    expect(screen.getByText('菜单 · 择一挂')).toBeInTheDocument()
    expect(screen.getByText('MENU')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '自定义菜单' })).toHaveTextContent('＋ 自定义')
    MENU_PRIMARY.forEach(category => {
      expect(screen.getByRole('button', { name: new RegExp(category === '热门推荐' ? '热门' : category) })).toBeInTheDocument()
    })
    expect(screen.queryByText('街头小吃')).not.toBeInTheDocument()
  })

  it('selects a category', () => {
    const { props } = renderGrid()

    fireEvent.click(screen.getByRole('button', { name: /家常下饭/ }))

    expect(props.onSelect).toHaveBeenCalledWith('家常下饭')
  })

  it('uses the hot treatment without overriding active state', () => {
    renderGrid()
    expect(screen.getByRole('button', { name: /热门/ })).toHaveClass('menu-cell--hot')
  })

  it('marks the active category', () => {
    renderGrid({ active: '火锅烫涮' })

    expect(screen.getByRole('button', { name: /火锅烫涮/ })).toHaveClass('menu-cell--active')
  })

  it('expands remaining categories and flips the arrow class', () => {
    renderGrid()
    const more = screen.getByRole('button', { name: '展开更多分类' })

    fireEvent.click(more)

    expect(screen.getByText('街头小吃')).toBeInTheDocument()
    expect(screen.getByText('异国风味')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '收起更多分类' })).toHaveClass('menu-more--expanded')
  })

  it('caps expanded grid height with an inner scroll area', () => {
    const { container } = renderGrid()

    expect(container.querySelector('.menu-grid-scroll--expanded')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: '展开更多分类' }))

    expect(container.querySelector('.menu-grid-scroll--expanded')).not.toBeNull()

    fireEvent.click(screen.getByRole('button', { name: '收起更多分类' }))

    expect(container.querySelector('.menu-grid-scroll--expanded')).toBeNull()
  })

  it('marks the loading category and invokes customize', () => {
    const { props } = renderGrid({ loadingCategory: '奶茶续命' })

    expect(screen.getByRole('button', { name: /奶茶续命/ })).toHaveClass('menu-cell--loading')
    fireEvent.click(screen.getByRole('button', { name: '自定义菜单' }))
    expect(props.onCustomize).toHaveBeenCalledTimes(1)
  })

  it('renders backend notes instead of the repetitive fallback', () => {
    renderGrid({
      categories: [...MENU_PRIMARY, '季节限定'],
      notes: { 季节限定: '应季而食' },
    })

    fireEvent.click(screen.getByRole('button', { name: '展开更多分类' }))

    expect(screen.getByText('应季而食')).toBeInTheDocument()
    expect(screen.queryByText('私房甄选')).not.toBeInTheDocument()
  })

  it('still falls back when no note is supplied for a category', () => {
    renderGrid({ categories: [...MENU_PRIMARY, '季节限定'], notes: {} })

    fireEvent.click(screen.getByRole('button', { name: '展开更多分类' }))

    expect(screen.getByText('私房甄选')).toBeInTheDocument()
  })

  it('keeps the loading copy ahead of the note', () => {
    renderGrid({
      categories: [...MENU_PRIMARY],
      loadingCategory: '随便',
      notes: { 随便: '大厨随缘' },
    })

    expect(screen.getByRole('button', { name: /随便/ })).toHaveTextContent('正在备菜')
  })
})
