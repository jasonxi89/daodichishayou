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

export interface RecommendedDish {
  name: string
  summary: string
  ingredients: string[]
  steps: string[]
  difficulty?: string
  cook_time?: string
  extra_ingredients?: string[] | null
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

export interface AnnotatedCategory {
  name: string
  note: string | null
}

export interface AnnotatedCategoriesResponse {
  categories: AnnotatedCategory[]
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

// 后端 v1.15.0 起提供分类小注；note 可能为 null，此处直接剔除交给前端兜底
export async function fetchCategoryNotes(): Promise<Record<string, string>> {
  const res = await request<AnnotatedCategoriesResponse>('/api/trending/categories/annotated')
  const notes: Record<string, string> = {}
  if (!res || !Array.isArray(res.categories)) {
    return notes
  }
  for (const item of res.categories) {
    if (item && typeof item.name === 'string' && typeof item.note === 'string' && item.note.trim()) {
      notes[item.name] = item.note.trim()
    }
  }
  return notes
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

interface DishStepsOptions {
  preferences?: string | null
  allowExtra?: boolean
}

interface ChunkEvent {
  data: ArrayBuffer
}

interface ChunkedRequestTask extends Promise<unknown> {
  abort?: () => void
  onChunkReceived?: (callback: (event: ChunkEvent) => void) => void
}

type StreamFrame =
  | { type: 'delta'; text: string }
  | { type: 'complete'; dish: RecommendedDish }
  | { type: 'error'; code: string }

function stepsPayload(
  dishName: string,
  ingredients: string[],
  options: DishStepsOptions,
) {
  return {
    dish_name: dishName,
    ingredients,
    preferences: options.preferences ?? null,
    allow_extra: options.allowExtra ?? false,
  }
}

export async function fetchDishSteps(
  dishName: string,
  ingredients: string[],
  options: DishStepsOptions = {},
): Promise<RecommendedDish> {
  const res = await Taro.request({
    url: `${API_BASE}/api/recommend/steps`,
    method: 'POST',
    header: { 'Content-Type': 'application/json' },
    data: stepsPayload(dishName, ingredients, options),
    timeout: 120000,
  })
  if (res.statusCode !== 200 || !res.data?.name) {
    throw new Error(`API error: ${res.statusCode}`)
  }
  return res.data as RecommendedDish
}

function extractCompletedSteps(buffer: string): string[] {
  const stepsKey = buffer.indexOf('"steps"')
  if (stepsKey < 0) return []
  const arrayStart = buffer.indexOf('[', stepsKey)
  if (arrayStart < 0) return []

  const values: string[] = []
  let inString = false
  let escaped = false
  let stringStart = -1
  for (let index = arrayStart + 1; index < buffer.length; index += 1) {
    const character = buffer[index]
    if (inString) {
      if (escaped) {
        escaped = false
      } else if (character === '\\') {
        escaped = true
      } else if (character === '"') {
        const raw = buffer.slice(stringStart, index + 1)
        try {
          values.push(JSON.parse(raw))
        } catch {
          return values
        }
        inString = false
      }
      continue
    }
    if (character === '"') {
      inString = true
      stringStart = index
    } else if (character === ']') {
      break
    }
  }
  return values
}

export function fetchDishStepsStreaming(
  dishName: string,
  ingredients: string[],
  onProgress: (steps: string[]) => void,
  firstChunkTimeout = 3000,
  idleChunkTimeout = 3000,
  options: DishStepsOptions = {},
): Promise<RecommendedDish> {
  if (typeof TextDecoder === 'undefined') {
    return fetchDishSteps(dishName, ingredients, options)
  }

  return new Promise((resolve, reject) => {
    let settled = false
    let wireBuffer = ''
    let modelBuffer = ''
    let receivedChunk = false
    let idleTimer: ReturnType<typeof setTimeout> | null = null
    const decoder = new TextDecoder()
    const task = Taro.request({
      url: `${API_BASE}/api/recommend/steps?stream=1`,
      method: 'POST',
      header: { 'Content-Type': 'application/json' },
      data: stepsPayload(dishName, ingredients, options),
      timeout: 30000,
      enableChunked: true,
    }) as unknown as ChunkedRequestTask

    const clearTimers = () => {
      clearTimeout(firstChunkTimer)
      if (idleTimer) clearTimeout(idleTimer)
    }

    const finish = (dish: RecommendedDish) => {
      if (settled) return
      settled = true
      clearTimers()
      resolve(dish)
    }

    const fallback = () => {
      if (settled) return
      settled = true
      clearTimers()
      task.abort?.()
      fetchDishSteps(dishName, ingredients, options).then(resolve, reject)
    }

    const processFrame = (frame: StreamFrame) => {
      if (frame.type === 'error') {
        fallback()
      } else if (frame.type === 'complete') {
        finish(frame.dish)
      } else {
        modelBuffer += frame.text
        const steps = extractCompletedSteps(modelBuffer)
        if (steps.length > 0) onProgress(steps)
      }
    }

    const processWireBuffer = () => {
      let newlineIndex = wireBuffer.indexOf('\n')
      while (newlineIndex >= 0 && !settled) {
        const line = wireBuffer.slice(0, newlineIndex).trim()
        wireBuffer = wireBuffer.slice(newlineIndex + 1)
        if (line) {
          try {
            processFrame(JSON.parse(line) as StreamFrame)
          } catch {
            fallback()
          }
        }
        newlineIndex = wireBuffer.indexOf('\n')
      }
    }

    const resetIdleTimer = () => {
      if (idleTimer) clearTimeout(idleTimer)
      idleTimer = setTimeout(fallback, idleChunkTimeout)
    }

    const firstChunkTimer = setTimeout(() => {
      if (!receivedChunk) fallback()
    }, firstChunkTimeout)

    void Promise.resolve(task)
      .then(() => {
        if (settled) return
        wireBuffer += decoder.decode()
        processWireBuffer()
        if (!settled) fallback()
      })
      .catch(() => fallback())

    if (typeof task.onChunkReceived !== 'function') {
      fallback()
      return
    }

    task.onChunkReceived((event: ChunkEvent) => {
      if (settled) return
      receivedChunk = true
      clearTimeout(firstChunkTimer)
      resetIdleTimer()
      wireBuffer += decoder.decode(new Uint8Array(event.data), { stream: true })
      processWireBuffer()
    })
  })
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
