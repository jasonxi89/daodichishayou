import Taro from '@tarojs/taro'

declare const API_BASE: string

// === Types matching backend schemas ===

export interface FoodTrendItem {
  id: number
  food_name: string
  source: string
  heat_score: number
  post_count: number
  category: string | null
  image_url: string | null
  updated_at: string
}

export interface TrendingResponse {
  total: number
  items: FoodTrendItem[]
}

// === Generic request helper ===

async function request<T>(path: string, options?: { timeout?: number }): Promise<T> {
  const timeout = options?.timeout ?? 8000
  const res = await Taro.request({
    url: `${API_BASE}${path}`,
    timeout,
  })
  if (res.statusCode !== 200) {
    throw new Error(`API error: ${res.statusCode}`)
  }
  return res.data as T
}

// === API functions ===

export async function fetchTrending(limit = 20, category?: string): Promise<TrendingResponse> {
  let path = `/api/trending?limit=${limit}`
  if (category) {
    path += `&category=${encodeURIComponent(category)}`
  }
  return request<TrendingResponse>(path)
}

export async function fetchCategories(): Promise<string[]> {
  return request<string[]>('/api/trending/categories')
}

export async function fetchHealth(): Promise<{ status: string; version: string }> {
  return request('/api/health', { timeout: 5000 })
}
