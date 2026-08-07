import {
  drawShareCard,
  type ShareCardDish,
  type ShareCardOptions,
} from '../../pages/ingredient/shareCard'

interface RecordedCall {
  fn: string
  args: unknown[]
  fillStyle: unknown
  strokeStyle: unknown
  font: string
  textAlign: string
  lineWidth: number
}

interface RecordedGradient {
  stops: Array<{ offset: number; color: string }>
  addColorStop: jest.Mock
}

function defaultMeasureWidth(text: string): number {
  return Array.from(text).reduce(
    (width, character) => width + (/[\u0000-\u007f]/.test(character) ? 10 : 19),
    0,
  )
}

function availableDishNameWidth(cookTime?: string): number {
  const cardX = 20
  const cardWidth = 500 - cardX * 2
  const dishNameX = cardX + 58
  const rowRight = cardX + cardWidth - 28
  return rowRight - dishNameX
    - (cookTime ? defaultMeasureWidth(cookTime) + 12 : 0)
}

function createRecordingCtx(
  measureWidth: (text: string) => number = defaultMeasureWidth,
) {
  const calls: RecordedCall[] = []
  const gradients: RecordedGradient[] = []
  const ctx: any = {
    fillStyle: '#000000',
    strokeStyle: '#000000',
    font: '10px sans-serif',
    textAlign: 'start',
    lineWidth: 1,
  }

  const record = (fn: string) => jest.fn((...args: unknown[]) => {
    calls.push({
      fn,
      args,
      fillStyle: ctx.fillStyle,
      strokeStyle: ctx.strokeStyle,
      font: ctx.font,
      textAlign: ctx.textAlign,
      lineWidth: ctx.lineWidth,
    })
  })

  for (const fn of [
    'fillRect',
    'fillText',
    'beginPath',
    'closePath',
    'moveTo',
    'lineTo',
    'arc',
    'arcTo',
    'stroke',
    'fill',
    'save',
    'restore',
    'translate',
    'rotate',
    'scale',
  ]) {
    ctx[fn] = record(fn)
  }

  ctx.createLinearGradient = jest.fn((...args: unknown[]) => {
    const gradient: RecordedGradient = {
      stops: [],
      addColorStop: jest.fn((offset: number, color: string) => {
        gradient.stops.push({ offset, color })
      }),
    }
    gradients.push(gradient)
    calls.push({
      fn: 'createLinearGradient',
      args,
      fillStyle: ctx.fillStyle,
      strokeStyle: ctx.strokeStyle,
      font: ctx.font,
      textAlign: ctx.textAlign,
      lineWidth: ctx.lineWidth,
    })
    return gradient
  })
  ctx.measureText = jest.fn((text: string) => ({
    width: measureWidth(text),
  }))

  return {
    ctx: ctx as CanvasRenderingContext2D,
    calls,
    gradients,
    measureText: ctx.measureText as jest.Mock,
  }
}

const dishes: ShareCardDish[] = [
  { name: '番茄鸡蛋拌面', summary: '酸甜开胃', cook_time: '15 分钟' },
  { name: '番茄蛋花汤', summary: '暖胃鲜香', cook_time: '10 分钟' },
  { name: '糖拌番茄', summary: '清爽解腻', cook_time: '3 分钟' },
]

function draw(
  overrides: Partial<ShareCardOptions> = {},
  measureWidth?: (text: string) => number,
) {
  const recording = createRecordingCtx(measureWidth)
  drawShareCard(recording.ctx, {
    dishes,
    ingredients: ['番茄', '鸡蛋', '面条'],
    dateLabel: '七月十九',
    width: 500,
    height: 400,
    ...overrides,
  })
  return recording
}

function textCall(calls: RecordedCall[], text: string) {
  return calls.find(call => call.fn === 'fillText' && call.args[0] === text)
}

describe('drawShareCard', () => {
  it('draws the approved paper, gold title, subtitle, and watermark', () => {
    const { calls, gradients } = draw()

    expect(calls).toContainEqual(expect.objectContaining({
      fn: 'fillRect',
      args: [0, 0, 500, 400],
      fillStyle: '#faf4e8',
    }))
    expect(calls.some(call => (
      call.fn === 'fill'
      && call.fillStyle === '#fffdf8'
    ))).toBe(true)
    expect(calls.filter(call => call.fn === 'arcTo')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ args: expect.arrayContaining([12]) }),
      ]),
    )

    expect(textCall(calls, '─ 御 厨 手 谕 ─')).toEqual(expect.objectContaining({
      fillStyle: '#b8934e',
      font: expect.stringContaining('serif'),
    }))
    expect(textCall(calls, '番茄 / 鸡蛋 / 面条 · 七月十九')).toEqual(
      expect.objectContaining({ fillStyle: '#a3803f' }),
    )
    expect(textCall(calls, '到底吃啥哟 · 御厨智荐')).toEqual(expect.objectContaining({
      fillStyle: '#b9ac96',
    }))

    expect(gradients).toHaveLength(1)
    expect(gradients[0].stops).toEqual([
      { offset: 0, color: '#b8934e' },
      { offset: 0.5, color: '#e3c88e' },
      { offset: 1, color: '#b8934e' },
    ])
    expect(calls.some(call => (
      call.fn === 'stroke'
      && call.strokeStyle === '#b8934e'
    ))).toBe(true)
  })

  it('draws Chinese menu numerals, dish names, and right-aligned cook times', () => {
    const { calls } = draw()

    for (const numeral of ['壹', '贰', '叁']) {
      expect(textCall(calls, numeral)).toEqual(expect.objectContaining({
        fillStyle: '#b8934e',
        font: expect.stringContaining('serif'),
      }))
    }
    for (const dish of dishes) {
      expect(textCall(calls, dish.name)).toEqual(expect.objectContaining({
        fillStyle: '#2f261a',
        font: expect.stringMatching(/bold 19px serif/),
      }))
      expect(textCall(calls, dish.cook_time as string)).toEqual(expect.objectContaining({
        fillStyle: '#a3937a',
        textAlign: 'right',
      }))
    }
  })

  it('truncates a long dish name with a measured ellipsis before the cook time', () => {
    const name = '宫廷秘制金汤花胶鲍鱼海参佛跳墙豪华大拼盘'
    const cookTime = '15 分钟'
    const { calls, measureText } = draw({
      dishes: [{ name, cook_time: cookTime }],
    })
    const dishNameCall = calls.find(call => (
      call.fn === 'fillText'
      && call.fillStyle === '#2f261a'
      && call.font === 'bold 19px serif'
    ))
    const renderedName = dishNameCall?.args[0] as string
    const maxWidth = availableDishNameWidth(cookTime)

    expect(renderedName).not.toBe(name)
    expect(renderedName).toMatch(/…$/)
    expect(defaultMeasureWidth(renderedName)).toBeLessThanOrEqual(maxWidth)
    expect(measureText).toHaveBeenCalledWith(name)
  })

  it('leaves a short dish name unchanged', () => {
    const name = '番茄炒蛋'
    const { calls } = draw({ dishes: [{ name, cook_time: '10 分钟' }] })

    expect(textCall(calls, name)).toBeDefined()
    expect(calls.some(call => (
      call.fn === 'fillText'
      && typeof call.args[0] === 'string'
      && call.args[0] !== name
      && call.args[0].toString().endsWith('…')
    ))).toBe(false)
  })

  it('keeps a dish name whose measured width exactly matches the available width', () => {
    const name = '恰好装下的菜名'
    const exactAvailableWidth = availableDishNameWidth()
    const measureWidth = (text: string) => (
      text === name ? exactAvailableWidth : defaultMeasureWidth(text)
    )
    const { calls } = draw({ dishes: [{ name }] }, measureWidth)

    expect(textCall(calls, name)).toBeDefined()
  })

  it('draws at most four menu rows', () => {
    const fiveDishes = [
      ...dishes,
      { name: '番茄焖饭', cook_time: '30 分钟' },
      { name: '第五道菜', cook_time: '40 分钟' },
    ]
    const { calls } = draw({ dishes: fiveDishes })

    expect(textCall(calls, '肆')).toBeDefined()
    expect(textCall(calls, '番茄焖饭')).toBeDefined()
    expect(textCall(calls, '伍')).toBeUndefined()
    expect(textCall(calls, '第五道菜')).toBeUndefined()
  })

  it('draws a paired double-ring stamp rotated exactly negative twelve degrees', () => {
    const { calls } = draw()
    const stampArcs = calls.filter(call => (
      call.fn === 'arc'
      && call.args[0] === 0
      && call.args[1] === 0
    ))
    const rotateCall = calls.find(call => call.fn === 'rotate')

    expect(stampArcs).toHaveLength(2)
    expect(stampArcs[0].args[2]).not.toBe(stampArcs[1].args[2])
    expect(stampArcs.map(call => call.strokeStyle)).toEqual([
      'rgba(197,48,48,.8)',
      'rgba(197,48,48,.7)',
    ])
    expect(rotateCall).toBeDefined()
    expect(rotateCall?.args[0] as number).toBeCloseTo(-12 * Math.PI / 180)
    expect(calls.filter(call => call.fn === 'save')).toHaveLength(1)
    expect(calls.filter(call => call.fn === 'restore')).toHaveLength(1)
    expect(textCall(calls, '大厨')?.font).toContain('serif')
    expect(textCall(calls, '认证')?.font).toContain('serif')
  })

  it('truncates the ingredient list after five items while retaining the date', () => {
    const { calls } = draw({
      ingredients: ['番茄', '鸡蛋', '面条', '土豆', '青椒', '洋葱'],
    })

    expect(textCall(
      calls,
      '番茄 / 鸡蛋 / 面条 / 土豆 / 青椒 ... · 七月十九',
    )).toBeDefined()
  })

  it('handles empty dishes and missing optional copy without drawing it', () => {
    expect(() => draw({ dishes: [] })).not.toThrow()

    const { calls } = draw({
      dishes: [
        { name: '清炒时蔬' },
        { name: '家常豆腐', summary: '只提供摘要' },
      ],
    })

    expect(textCall(calls, '清炒时蔬')).toBeDefined()
    expect(textCall(calls, '家常豆腐')).toBeDefined()
    expect(textCall(calls, '只提供摘要')).toBeUndefined()
    expect(calls.some(call => (
      call.fn === 'fillText'
      && (call.args[0] === undefined || call.args[0] === null)
    ))).toBe(false)
  })
})
