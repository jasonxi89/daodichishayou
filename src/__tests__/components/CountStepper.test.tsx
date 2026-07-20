import { fireEvent, render, screen } from '@testing-library/react'
import CountStepper from '../../components/CountStepper'

describe('CountStepper', () => {
  it('renders the value as a Chinese financial numeral', () => {
    render(<CountStepper value={2} onChange={jest.fn()} />)
    expect(screen.getByText('贰')).toBeInTheDocument()
  })

  it('increments and decrements by one', () => {
    const onChange = jest.fn()
    render(<CountStepper value={2} onChange={onChange} />)

    fireEvent.click(screen.getByRole('button', { name: '减少份数' }))
    fireEvent.click(screen.getByRole('button', { name: '增加份数' }))

    expect(onChange).toHaveBeenNthCalledWith(1, 1)
    expect(onChange).toHaveBeenNthCalledWith(2, 3)
  })

  it('disables controls at their boundaries', () => {
    const onChange = jest.fn()
    const { rerender } = render(<CountStepper value={1} onChange={onChange} />)

    expect(screen.getByRole('button', { name: '减少份数' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: '减少份数' }))

    rerender(<CountStepper value={10} onChange={onChange} />)
    expect(screen.getByRole('button', { name: '增加份数' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: '增加份数' }))

    expect(onChange).not.toHaveBeenCalled()
  })

  it('provides the large touch-target class on both controls', () => {
    render(<CountStepper value={2} onChange={jest.fn()} />)
    expect(screen.getByRole('button', { name: '减少份数' })).toHaveClass('count-stepper__control')
    expect(screen.getByRole('button', { name: '增加份数' })).toHaveClass('count-stepper__control')
  })
})
