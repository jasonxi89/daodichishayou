import * as taroMock from '@tarojs/taro'

const mockRequest = taroMock.request as jest.Mock

// API_BASE is a build-time constant
declare const API_BASE: string
;(globalThis as any).API_BASE = 'http://test-api:8900'

// Must require after setting API_BASE
let fetchTrending: typeof import('../../services/api').fetchTrending
let fetchCategories: typeof import('../../services/api').fetchCategories
let fetchHealth: typeof import('../../services/api').fetchHealth

beforeAll(() => {
  const api = require('../../services/api')
  fetchTrending = api.fetchTrending
  fetchCategories = api.fetchCategories
  fetchHealth = api.fetchHealth
})

beforeEach(() => {
  jest.clearAllMocks()
})

describe('API service – fetchTrending', () => {
  it('calls Taro.request with correct URL and default limit', async () => {
    mockRequest.mockResolvedValueOnce({
      statusCode: 200,
      data: { total: 1, items: [{ id: 1, food_name: '火锅' }] },
    })

    const result = await fetchTrending()

    expect(mockRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'http://test-api:8900/api/trending?limit=20',
        timeout: 8000,
      })
    )
    expect(result.total).toBe(1)
    expect(result.items[0].food_name).toBe('火锅')
  })

  it('passes custom limit parameter', async () => {
    mockRequest.mockResolvedValueOnce({
      statusCode: 200,
      data: { total: 0, items: [] },
    })

    await fetchTrending(50)

    expect(mockRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'http://test-api:8900/api/trending?limit=50',
      })
    )
  })

  it('appends category filter when provided', async () => {
    mockRequest.mockResolvedValueOnce({
      statusCode: 200,
      data: { total: 0, items: [] },
    })

    await fetchTrending(10, '小吃')

    expect(mockRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        url: expect.stringContaining('category=%E5%B0%8F%E5%90%83'),
      })
    )
  })

  it('throws on non-200 status code', async () => {
    mockRequest.mockResolvedValueOnce({ statusCode: 500, data: {} })

    await expect(fetchTrending()).rejects.toThrow('API error: 500')
  })

  it('propagates network errors', async () => {
    mockRequest.mockRejectedValueOnce(new Error('Network failure'))

    await expect(fetchTrending()).rejects.toThrow('Network failure')
  })
})

describe('API service – fetchCategories', () => {
  it('calls the correct endpoint', async () => {
    mockRequest.mockResolvedValueOnce({
      statusCode: 200,
      data: ['小吃', '正餐', '饮品'],
    })

    const result = await fetchCategories()

    expect(mockRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'http://test-api:8900/api/trending/categories',
      })
    )
    expect(result).toEqual(['小吃', '正餐', '饮品'])
  })

  it('returns empty array on 200 with empty data', async () => {
    mockRequest.mockResolvedValueOnce({ statusCode: 200, data: [] })

    const result = await fetchCategories()
    expect(result).toEqual([])
  })

  it('throws on error status', async () => {
    mockRequest.mockResolvedValueOnce({ statusCode: 404, data: {} })

    await expect(fetchCategories()).rejects.toThrow('API error: 404')
  })
})

describe('API service – fetchHealth', () => {
  it('calls health endpoint with 5s timeout', async () => {
    mockRequest.mockResolvedValueOnce({
      statusCode: 200,
      data: { status: 'ok', version: '0.1.0' },
    })

    const result = await fetchHealth()

    expect(mockRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'http://test-api:8900/api/health',
        timeout: 5000,
      })
    )
    expect(result.status).toBe('ok')
    expect(result.version).toBe('0.1.0')
  })
})
