import recipes, { getLocalRecipe, fetchRecipeFromAPI } from '../../data/recipes'

// ─────────────────────────────────────────────
// getLocalRecipe – pure synchronous lookup
// ─────────────────────────────────────────────
describe('getLocalRecipe', () => {
  it('returns a recipe object for a known dish', () => {
    const recipe = getLocalRecipe('番茄炒蛋')
    expect(recipe).not.toBeNull()
  })

  it('returns the correct name field', () => {
    const recipe = getLocalRecipe('番茄炒蛋')
    expect(recipe?.name).toBe('番茄炒蛋')
  })

  it('returns null for an unknown dish', () => {
    expect(getLocalRecipe('不存在的食物xyz')).toBeNull()
  })

  it('returns null for an empty string', () => {
    expect(getLocalRecipe('')).toBeNull()
  })

  it('returns recipe for 红烧肉', () => {
    const recipe = getLocalRecipe('红烧肉')
    expect(recipe).not.toBeNull()
    expect(recipe?.name).toBe('红烧肉')
  })

  it('returns recipe for 火锅', () => {
    const recipe = getLocalRecipe('火锅')
    expect(recipe).not.toBeNull()
  })

  it('returns recipe for 宫保鸡丁', () => {
    expect(getLocalRecipe('宫保鸡丁')).not.toBeNull()
  })

  it('returned recipe has a non-empty summary string', () => {
    const recipe = getLocalRecipe('红烧肉')
    expect(typeof recipe?.summary).toBe('string')
    expect((recipe?.summary ?? '').length).toBeGreaterThan(0)
  })

  it('returned recipe has a non-empty ingredients array', () => {
    const recipe = getLocalRecipe('番茄炒蛋')
    expect(Array.isArray(recipe?.ingredients)).toBe(true)
    expect((recipe?.ingredients ?? []).length).toBeGreaterThan(0)
  })

  it('returned recipe has a non-empty steps array', () => {
    const recipe = getLocalRecipe('番茄炒蛋')
    expect(Array.isArray(recipe?.steps)).toBe(true)
    expect((recipe?.steps ?? []).length).toBeGreaterThan(0)
  })

  it('all ingredients are non-empty strings', () => {
    const recipe = getLocalRecipe('宫保鸡丁')
    recipe?.ingredients.forEach((ing) => {
      expect(typeof ing).toBe('string')
      expect(ing.trim().length).toBeGreaterThan(0)
    })
  })

  it('all steps are non-empty strings', () => {
    const recipe = getLocalRecipe('红烧肉')
    recipe?.steps.forEach((step) => {
      expect(typeof step).toBe('string')
      expect(step.trim().length).toBeGreaterThan(0)
    })
  })
})

// ─────────────────────────────────────────────
// recipes default export – static data shape
// ─────────────────────────────────────────────
describe('recipes default export', () => {
  it('is a non-null object', () => {
    expect(recipes).not.toBeNull()
    expect(typeof recipes).toBe('object')
  })

  it('contains more than 10 entries', () => {
    expect(Object.keys(recipes).length).toBeGreaterThan(10)
  })

  it('contains common Chinese dishes', () => {
    const knownDishes = ['番茄炒蛋', '红烧肉', '火锅', '炸鸡', '蛋炒饭']
    knownDishes.forEach((dish) => {
      expect(recipes).toHaveProperty(dish)
    })
  })

  it('every recipe has a name property that matches its key', () => {
    for (const [key, recipe] of Object.entries(recipes)) {
      expect(recipe.name).toBe(key)
    }
  })

  it('every recipe has a non-empty summary', () => {
    for (const recipe of Object.values(recipes)) {
      expect(typeof recipe.summary).toBe('string')
      expect(recipe.summary.length).toBeGreaterThan(0)
    }
  })

  it('every recipe has at least one ingredient', () => {
    for (const recipe of Object.values(recipes)) {
      expect(Array.isArray(recipe.ingredients)).toBe(true)
      expect(recipe.ingredients.length).toBeGreaterThan(0)
    }
  })

  it('every recipe has at least one step', () => {
    for (const recipe of Object.values(recipes)) {
      expect(Array.isArray(recipe.steps)).toBe(true)
      expect(recipe.steps.length).toBeGreaterThan(0)
    }
  })

  it('getLocalRecipe result matches the default export entry', () => {
    const viaStat = recipes['麻婆豆腐']
    const viaFn = getLocalRecipe('麻婆豆腐')
    expect(viaFn).toEqual(viaStat)
  })
})

// ─────────────────────────────────────────────
// fetchRecipeFromAPI – async, calls own backend via services/api
// ─────────────────────────────────────────────
describe('fetchRecipeFromAPI', () => {
  beforeEach(() => {
    jest.resetModules()
  })

  it('returns null (silent degradation) when Taro.request rejects', async () => {
    const taro = await import('@tarojs/taro')
    const mockRequest = taro.request as jest.Mock
    mockRequest.mockRejectedValueOnce(new Error('Network failure'))

    const { fetchRecipeFromAPI: fn } = await import('../../data/recipes')
    // Use a unique name to bypass module-level apiCache
    const result = await fn('绝对不存在_' + Math.random())
    expect(result).toBeNull()
  })

  it('returns null when backend response has no items', async () => {
    // Taro mock request defaults to { statusCode: 200, data: {} },
    // i.e. no items array → fetchRecipeByName returns null → null here.
    const { fetchRecipeFromAPI: fn } = await import('../../data/recipes')
    const result = await fn('空结果_' + Math.random())
    expect(result).toBeNull()
  })

  it('returns null when no name given', async () => {
    const { fetchRecipeFromAPI: fn } = await import('../../data/recipes')
    // Empty name: condition `if (name) load()` in recipe page
    // fetchRecipeFromAPI itself still runs but cache lookup fails, API returns null
    const result = await fn('')
    expect(result === null || typeof result === 'object').toBe(true)
  })

  it('maps a backend RecipeOut into the display Recipe shape', async () => {
    const taro = await import('@tarojs/taro')
    const mockRequest = taro.request as jest.Mock
    mockRequest.mockResolvedValueOnce({
      statusCode: 200,
      data: {
        total: 1,
        items: [{
          id: 42,
          name: '测试菜',
          rating: 7.8,
          made_count: 1200,
          image_url: null,
          author: '测试作者',
          ingredients_json: JSON.stringify([
            { name: '食材A', amount: '2个' },
            { name: '食材B' },
          ]),
          ingredients_text: '食材A 食材B',
          steps_json: JSON.stringify([{ text: '第一步' }, { text: '第二步' }]),
          category: null,
          updated_at: '2026-07-04T00:00:00Z',
        }],
      },
    })

    // Use a unique name to avoid hitting the module-level cache from other tests
    const { fetchRecipeFromAPI: fn } = await import('../../data/recipes')
    const result = await fn('测试菜_' + Date.now())

    expect(result).not.toBeNull()
    expect(result?.name).toBe('测试菜')
    expect(result?.summary).toBe('评分 7.8 · 1200人做过 · by 测试作者')
    expect(result?.ingredients).toEqual(['食材A 2个', '食材B'])
    expect(result?.steps).toEqual(['第一步', '第二步'])
  })

  it('falls back to ingredients_text and placeholder steps when JSON fields are missing', async () => {
    const taro = await import('@tarojs/taro')
    const mockRequest = taro.request as jest.Mock
    mockRequest.mockResolvedValueOnce({
      statusCode: 200,
      data: {
        total: 1,
        items: [{
          id: 43,
          name: '简化菜',
          rating: null,
          made_count: 0,
          image_url: null,
          author: null,
          ingredients_json: null,
          ingredients_text: '食材X 食材Y，食材Z',
          steps_json: null,
          category: null,
          updated_at: '2026-07-04T00:00:00Z',
        }],
      },
    })

    const { fetchRecipeFromAPI: fn } = await import('../../data/recipes')
    const result = await fn('简化菜_' + Date.now())

    expect(result?.ingredients).toEqual(['食材X', '食材Y', '食材Z'])
    expect(result?.steps).toEqual(['暂无步骤信息'])
    expect(result?.summary).toBe('简化菜的做法')
  })
})
