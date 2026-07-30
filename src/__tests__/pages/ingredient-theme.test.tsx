import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import * as taroMock from '@tarojs/taro'
import IngredientPage from '../../pages/ingredient/ingredient'
import RecommendationLoading from '../../pages/ingredient/RecommendationLoading'

const mockRequest = taroMock.request as jest.Mock
const THINKING_EMOJI = String.fromCodePoint(0x1f914)

describe('Ingredient hybrid-theme layout', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders the paper texture and the approved CTA', () => {
    render(<IngredientPage />)

    expect(document.querySelector('.ingredient')).toHaveClass('paper-texture')
    expect(screen.getByText('开做！').closest('.recommend-btn')).toHaveClass('recommend-btn')
  })

  it('preserves the selected ingredient chip class contract', () => {
    render(<IngredientPage />)

    fireEvent.click(screen.getByText('番茄'))

    const tomatoChip = screen
      .getAllByText('番茄')
      .find(element => element.className === 'ingredient-chip-text')

    expect(tomatoChip).toHaveClass('ingredient-chip-text')
    expect(tomatoChip?.className).toBe('ingredient-chip-text')
    expect(tomatoChip?.parentElement?.className).toContain('selected')
  })

  it('renders chef-style loading copy without the decorative thinking emoji', () => {
    render(<RecommendationLoading message='大厨思考中...' />)

    expect(screen.getByText('大厨思考中...')).toBeInTheDocument()
    expect(document.body.textContent).not.toContain(THINKING_EMOJI)
  })

  it('renders all section titles and an aria-hidden dish emoji for results', async () => {
    mockRequest.mockResolvedValue({
      statusCode: 200,
      data: {
        dishes: [{
          name: '番茄炒蛋',
          summary: '家常快手菜',
          difficulty: '简单',
          cook_time: '约10分钟',
        }],
        input_ingredients: ['番茄'],
      },
    })
    render(<IngredientPage />)

    fireEvent.click(screen.getByText('番茄'))
    fireEvent.click(document.querySelector('.recommend-btn') as HTMLElement)

    await waitFor(() => {
      expect(screen.getByText('番茄炒蛋')).toBeInTheDocument()
    })

    for (const title of ['已选食材', '输入食材', '常用食材', '口味偏好', '为你推荐']) {
      expect(screen.getByText(title)).toBeInTheDocument()
    }
    expect(document.querySelector('.dish-emoji')).toHaveAttribute('aria-hidden', 'true')
  })
})
