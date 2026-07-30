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

function createRecordingCtx() {
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

  return { ctx: ctx as CanvasRenderingContext2D, calls, gradients }
}

const dishes: ShareCardDish[] = [
  { name: '番茄鸡蛋拌面', summary: '酸甜开胃', cook_time: '15 分钟' },
  { name: '番茄蛋花汤', summary: '暖胃鲜香', cook_time: '10 分钟' },
  { name: '糖拌番茄', summary: '清爽解腻', cook_time: '3 分钟' },
]

function draw(
  overrides: Partial<ShareCardOptions> = {},
) {
  const recording = createRecordingCtx()
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
