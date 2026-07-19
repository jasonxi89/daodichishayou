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

export interface RecipeOut {
  id: number
  name: string
  rating: number | null
  made_count: number
  image_url: string | null
  author: string | null
  ingredients_json: string | null
  ingredients_text: string | null
  steps_json: string | null
  category: string | null
  updated_at: string
}

export interface RecipeSearchResponse {
  total: number
  items: RecipeOut[]
}

export interface QuickDish {
  name: string
  summary: string
  difficulty?: string
  cook_time?: string
}

export interface QuickRecommendRequest {
  ingredients: string[]
  count: number
  preferences: string | null
  allow_extra: boolean
  exclude_dishes?: string[]
}

export interface QuickRecommendResponse {
  dishes: QuickDish[]
  input_ingredients: string[]
}

export interface FoodDigest {
  id: number
  digest_date: string
  summary: string
  top_foods: string[]
  recommendation: string | null
  updated_at: string
}

// === Generic request helper ===

async function request<T>(path: string, options?: { timeout?: number }): Promise<T> {
  const timeout = (options && options.timeout) || 8000
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

export async function fetchDigest(): Promise<FoodDigest | null> {
  const res = await request<FoodDigest | null>('/api/trending/digest')
  // 后端无 digest 时返回 JSON null
  if (!res || !res.summary) {
    return null
  }
  return res
}

export async function fetchQuickRecommendations(
  payload: QuickRecommendRequest,
): Promise<QuickRecommendResponse> {
  const res = await Taro.request({
    url: `${API_BASE}/api/recommend/quick`,
    method: 'POST',
    header: { 'Content-Type': 'application/json' },
    data: payload,
    timeout: 30000,
  })
  if (res.statusCode !== 200 || !Array.isArray(res.data?.dishes)) {
    throw new Error(`API error: ${res.statusCode}`)
  }
  return res.data as QuickRecommendResponse
}

export async function fetchRecipeByName(name: string): Promise<RecipeOut | null> {
  const res = await request<RecipeSearchResponse>(
    `/api/recipes/search?name=${encodeURIComponent(name)}&limit=1`
  )
  if (!res || !Array.isArray(res.items) || res.items.length === 0) {
    return null
  }
  return res.items[0]
}

export async function generateFoodsByCategory(category: string, count = 30): Promise<{ foods: string[], category: string }> {
  const res = await Taro.request({
    url: `${API_BASE}/api/foods-by-category`,
    method: 'POST',
    header: { 'Content-Type': 'application/json' },
    data: { category, count },
    timeout: 30000,
  })
  if (res.statusCode !== 200) {
    throw new Error(`API error: ${res.statusCode}`)
  }
  return res.data as { foods: string[], category: string }
}

export async function bulkGenerateFoodsByCategory(
  categories: string[], count = 30
): Promise<{ results: Record<string, string[]> }> {
  const res = await Taro.request({
    url: `${API_BASE}/api/bulk-foods-by-category`,
    method: 'POST',
    header: { 'Content-Type': 'application/json' },
    data: { categories, count },
    timeout: 60000,
  })
  if (res.statusCode !== 200) {
    throw new Error(`API error: ${res.statusCode}`)
  }
  return res.data as { results: Record<string, string[]> }
}
