import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
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

describe('DigestCard – 有数据时渲染', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetStorageSync.mockReturnValue({})
  })

  it('renders 今日风向 title and summary when API returns a digest', async () => {
    mockFetchDigest.mockResolvedValueOnce(sampleDigest)

    render(<DigestCard />)

    await waitFor(() => {
      expect(screen.getByText('今日风向')).toBeInTheDocument()
    })
    expect(screen.getByText(sampleDigest.summary)).toBeInTheDocument()
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
      expect(screen.getByText('今日风向')).toBeInTheDocument()
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

    fireEvent.click(screen.getByText('今日风向'))
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
    })
    expect(container).toBeEmptyDOMElement()
    expect(screen.queryByText('今日风向')).not.toBeInTheDocument()
  })

  it('renders nothing and does not crash when API request fails', async () => {
    mockFetchDigest.mockRejectedValueOnce(new Error('Network error'))

    const { container } = render(<DigestCard />)

    await waitFor(() => {
      expect(mockFetchDigest).toHaveBeenCalled()
    })
    expect(container).toBeEmptyDOMElement()
  })

  it('does not cache anything when the fetch fails', async () => {
    mockFetchDigest.mockRejectedValueOnce(new Error('Network error'))

    render(<DigestCard />)

    await waitFor(() => {
      expect(mockFetchDigest).toHaveBeenCalled()
    })
    expect(mockSetStorageSync).not.toHaveBeenCalled()
  })

  it('handles non-object storage values gracefully', async () => {
    mockGetStorageSync.mockReturnValue('not-an-object')
    mockFetchDigest.mockResolvedValueOnce(null)

    expect(() => render(<DigestCard />)).not.toThrow()
  })
})
