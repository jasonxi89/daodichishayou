import { fireEvent, render, screen } from '@testing-library/react'
import DrawCeremony, { type DrawCeremonyProps } from '../../components/DrawCeremony'

const EMOJI = String.fromCodePoint(0x1f373)

function baseProps(overrides: Partial<DrawCeremonyProps> = {}): DrawCeremonyProps {
  return {
    phase: 'shaking',
    mainResult: '番茄炒蛋',
    emoji: EMOJI,
    category: '随便',
    servings: 3,
    drawIndex: 128,
    onSkip: jest.fn(),
    ...overrides,
  }
}

function renderCeremony(overrides: Partial<DrawCeremonyProps> = {}) {
  const props = baseProps(overrides)
  const view = render(<DrawCeremony {...props} />)
  return { ...view, props }
}

describe('DrawCeremony', () => {
  it.each([
    ['idle', 'ceremony--idle'],
    ['shaking', 'ceremony--shaking'],
    ['rising', 'ceremony--rising'],
    ['done', 'ceremony--done'],
  ] as const)('maps phase %s onto %s', (phase, expected) => {
    const { container } = renderCeremony({ phase })
    expect(container.querySelector('.ceremony')).toHaveClass(expected)
  })

  it('lets the user skip by tapping the tube', () => {
    const { props } = renderCeremony()

    fireEvent.click(screen.getByRole('button', { name: '跳过摇签，立即揭晓' }))

    expect(props.onSkip).toHaveBeenCalledTimes(1)
  })

  it('shows the drawn dish and its emoji once the stick rises', () => {
    renderCeremony({ phase: 'rising' })

    expect(screen.getByText('番茄炒蛋')).toBeInTheDocument()
    expect(screen.getByText(EMOJI)).toBeInTheDocument()
  })

  it('marks the result emoji decorative so screen readers read only the dish', () => {
    const { container } = renderCeremony({ phase: 'rising' })

    const emojiNode = container.querySelector('.main-stick__emoji')
    expect(emojiNode).toHaveAttribute('aria-hidden')
    expect(container.querySelector('.main-stick__name')).not.toHaveAttribute('aria-hidden')
  })

  it('hides the dish while the tube is still shaking', () => {
    renderCeremony({ phase: 'shaking' })

    expect(screen.queryByText('番茄炒蛋')).not.toBeInTheDocument()
    expect(screen.queryByText(EMOJI)).not.toBeInTheDocument()
  })

  it('renders the ceremony caption with Chinese servings and draw index', () => {
    renderCeremony({ category: '火锅烫涮', servings: 3, drawIndex: 128 })

    expect(screen.getByText('火锅烫涮 · 叁份 · 第 128 抽')).toBeInTheDocument()
  })

  it('falls back to arabic numerals beyond the Chinese numeral range', () => {
    renderCeremony({ servings: 12 })

    expect(screen.getByText(/· 12份 ·/)).toBeInTheDocument()
  })

  it('keeps the bottom button disabled during the ceremony', () => {
    renderCeremony()

    expect(screen.getByRole('button', { name: '签落即定' })).toBeDisabled()
  })
})
