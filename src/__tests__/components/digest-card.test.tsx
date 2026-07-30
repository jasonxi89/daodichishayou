import { act, render, screen, fireEvent, waitFor } from '@testing-library/react'
import * as taroMock from '@tarojs/taro'

// ─── Mock API service ─────────────────────────────────────────────────────────
jest.mock('../../services/api', () => ({
  __esModule: true,
  fetchDigest: jest.fn(),
}))

import { fetchDigest } from '../../services/api'
import DigestCard from '../../components/DigestCard'

const mockFetchDigest = fetchDigest as jest.Mock
const mockGetStorageSync = taroMock.getStorageSync as jest.Mock
const mockSetStorageSync = taroMock.setStorageSync as jest.Mock

function getTodayKey(): string {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

const sampleDigest = {
  id: 1,
  digest_date: '2026-07-04T00:00:00Z',
  summary: '今天全网火锅热度飙升，天水麻辣烫持续走红，适合约朋友聚餐',
  top_foods: ['火锅', '麻辣烫', '小龙虾'],
  recommendation: '来一顿热气腾腾的火锅吧',
  updated_at: '2026-07-04T08:00:00Z',
}

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}

describe('DigestCard – 加载骨架', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetStorageSync.mockReturnValue({})
  })

  it('renders a quote-shaped skeleton while the digest request is pending', () => {
    mockFetchDigest.mockReturnValueOnce(new Promise(() => {}))

    const { container } = render(<DigestCard />)

    expect(container.querySelector('.digest-card--loading')).toBeInTheDocument()
    expect(container.querySelectorAll('.digest-skeleton__bar')).toHaveLength(2)
    expect(screen.queryByText('《今日风向》')).not.toBeInTheDocument()
  })

  it('replaces the skeleton with digest content after the request resolves', async () => {
    const request = deferred<typeof sampleDigest | null>()
    mockFetchDigest.mockReturnValueOnce(request.promise)

    const { container } = render(<DigestCard />)
    expect(container.querySelector('.digest-card--loading')).toBeInTheDocument()

    await act(async () => {
      request.resolve(sampleDigest)
      await request.promise
    })

    expect(container.querySelector('.digest-card--loading')).not.toBeInTheDocument()
    expect(screen.getByText('《今日风向》')).toBeInTheDocument()
    expect(screen.getByText(sampleDigest.summary)).toBeInTheDocument()
  })

  it('removes the skeleton and the entire card when the request rejects', async () => {
    const request = deferred<typeof sampleDigest | null>()
    mockFetchDigest.mockReturnValueOnce(request.promise)

    const { container } = render(<DigestCard />)
    expect(container.querySelector('.digest-card--loading')).toBeInTheDocument()

    await act(async () => {
      request.reject(new Error('Network error'))
      await request.promise.catch(() => undefined)
    })

    expect(container.querySelector('.digest-card--loading')).not.toBeInTheDocument()
    expect(container).toBeEmptyDOMElement()
  })

  it('removes the skeleton and the entire card when the request returns null', async () => {
    const request = deferred<typeof sampleDigest | null>()
    mockFetchDigest.mockReturnValueOnce(request.promise)

    const { container } = render(<DigestCard />)
    expect(container.querySelector('.digest-card--loading')).toBeInTheDocument()

    await act(async () => {
      request.resolve(null)
      await request.promise
    })

    expect(container.querySelector('.digest-card--loading')).not.toBeInTheDocument()
    expect(container).toBeEmptyDOMElement()
  })

  it('never shows the skeleton on the first render when today cache is available', () => {
    mockGetStorageSync.mockReturnValue({ date: getTodayKey(), digest: sampleDigest })

    const { container } = render(<DigestCard />)

    expect(container.querySelector('.digest-card--loading')).not.toBeInTheDocument()
    expect(screen.getByText('《今日风向》')).toBeInTheDocument()
    expect(mockFetchDigest).not.toHaveBeenCalled()
  })
})

describe('DigestCard – 有数据时渲染', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetStorageSync.mockReturnValue({})
  })

  it('renders 今日风向 title and summary when API returns a digest', async () => {
    mockFetchDigest.mockResolvedValueOnce(sampleDigest)

    render(<DigestCard />)

    await waitFor(() => {
      expect(screen.getByText('《今日风向》')).toBeInTheDocument()
    })
    expect(screen.getByText(sampleDigest.summary)).toBeInTheDocument()
    expect(screen.getByText('《今日风向》').closest('.digest-card')).toHaveClass('digest-card--quote')
  })

  it('caches the digest to storage keyed by today after a successful fetch', async () => {
    mockFetchDigest.mockResolvedValueOnce(sampleDigest)

    render(<DigestCard />)

    await waitFor(() => {
      expect(mockSetStorageSync).toHaveBeenCalledWith(
        'digestCache',
        expect.objectContaining({ date: getTodayKey(), digest: sampleDigest })
      )
    })
  })

  it('uses same-day cache without calling the API again', async () => {
    mockGetStorageSync.mockReturnValue({ date: getTodayKey(), digest: sampleDigest })

    render(<DigestCard />)

    await waitFor(() => {
      expect(screen.getByText('《今日风向》')).toBeInTheDocument()
    })
    expect(mockFetchDigest).not.toHaveBeenCalled()
  })

  it('ignores stale cache from a previous day and re-fetches', async () => {
    mockGetStorageSync.mockReturnValue({ date: '2020-01-01', digest: sampleDigest })
    mockFetchDigest.mockResolvedValueOnce(sampleDigest)

    render(<DigestCard />)

    await waitFor(() => {
      expect(mockFetchDigest).toHaveBeenCalled()
    })
  })

  it('toggles expanded class on the summary when card is clicked', async () => {
    mockFetchDigest.mockResolvedValueOnce(sampleDigest)

    render(<DigestCard />)

    const summary = await screen.findByText(sampleDigest.summary)
    expect(summary.className).not.toContain('expanded')

    fireEvent.click(screen.getByText('《今日风向》'))
    expect(summary.className).toContain('expanded')
  })
})

describe('DigestCard – 无数据/失败时整个不渲染', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetStorageSync.mockReturnValue({})
  })

  it('renders nothing when API returns null (当日无 digest)', async () => {
    mockFetchDigest.mockResolvedValueOnce(null)

    const { container } = render(<DigestCard />)

    await waitFor(() => {
      expect(mockFetchDigest).toHaveBeenCalled()
      expect(container).toBeEmptyDOMElement()
    })
    expect(screen.queryByText('《今日风向》')).not.toBeInTheDocument()
  })

  it('renders nothing and does not crash when API request fails', async () => {
    mockFetchDigest.mockRejectedValueOnce(new Error('Network error'))

    const { container } = render(<DigestCard />)

    await waitFor(() => {
      expect(mockFetchDigest).toHaveBeenCalled()
      expect(container).toBeEmptyDOMElement()
    })
  })

  it('does not cache anything when the fetch fails', async () => {
    mockFetchDigest.mockRejectedValueOnce(new Error('Network error'))

    const { container } = render(<DigestCard />)

    await waitFor(() => {
      expect(mockFetchDigest).toHaveBeenCalled()
      expect(container).toBeEmptyDOMElement()
    })
    expect(mockSetStorageSync).not.toHaveBeenCalled()
  })

  it('handles non-object storage values gracefully', () => {
    mockGetStorageSync.mockReturnValue('not-an-object')
    mockFetchDigest.mockReturnValueOnce(new Promise(() => {}))

    expect(() => render(<DigestCard />)).not.toThrow()
  })
})
