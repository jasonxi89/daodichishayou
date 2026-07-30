import { toZhNumber } from '../../utils/zhNumber'

export interface ShareCardDish {
  name: string
  summary?: string
  cook_time?: string
}

export interface ShareCardOptions {
  dishes: ShareCardDish[]
  ingredients: string[]
  dateLabel: string
  width: number
  height: number
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + width, y, x + width, y + height, radius)
  ctx.arcTo(x + width, y + height, x, y + height, radius)
  ctx.arcTo(x, y + height, x, y, radius)
  ctx.arcTo(x, y, x + width, y, radius)
  ctx.closePath()
}

export function drawShareCard(
  ctx: CanvasRenderingContext2D,
  options: ShareCardOptions,
): void {
  const { dishes, ingredients, dateLabel, width, height } = options
  const cardX = 20
  const cardY = 20
  const cardWidth = width - cardX * 2
  const cardHeight = height - cardY * 2

  ctx.fillStyle = '#faf4e8'
  ctx.fillRect(0, 0, width, height)

  roundedRect(ctx, cardX, cardY, cardWidth, cardHeight, 12)
  ctx.fillStyle = '#fffdf8'
  ctx.fill()
  ctx.strokeStyle = '#b8934e'
  ctx.lineWidth = 1
  ctx.stroke()

  const goldLine = ctx.createLinearGradient(
    cardX,
    cardY,
    cardX + cardWidth,
    cardY,
  )
  goldLine.addColorStop(0, '#b8934e')
  goldLine.addColorStop(0.5, '#e3c88e')
  goldLine.addColorStop(1, '#b8934e')
  ctx.fillStyle = goldLine
  ctx.fillRect(cardX, cardY, cardWidth, 5)

  ctx.textAlign = 'center'
  ctx.fillStyle = '#b8934e'
  ctx.font = 'bold 15px serif'
  ctx.fillText('─ 御 厨 手 谕 ─', width / 2, cardY + 34)

  const ingredientLine = ingredients.slice(0, 5).join(' / ')
    + (ingredients.length > 5 ? ' ...' : '')
  ctx.fillStyle = '#a3803f'
  ctx.font = '13px sans-serif'
  ctx.fillText(`${ingredientLine} · ${dateLabel}`, width / 2, cardY + 58)

  ctx.strokeStyle = '#efe5cf'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(cardX + 24, cardY + 72)
  ctx.lineTo(cardX + cardWidth - 24, cardY + 72)
  ctx.stroke()

  const visibleDishes = dishes.slice(0, 4)
  const rowTop = cardY + 78
  const rowHeight = 45
  visibleDishes.forEach((dish, index) => {
    const baseline = rowTop + index * rowHeight + 28

    ctx.textAlign = 'left'
    ctx.fillStyle = '#b8934e'
    ctx.font = 'bold 15px serif'
    ctx.fillText(toZhNumber(index + 1), cardX + 28, baseline)

    ctx.fillStyle = '#2f261a'
    ctx.font = 'bold 19px serif'
    ctx.fillText(dish.name, cardX + 58, baseline)

    if (dish.cook_time) {
      ctx.textAlign = 'right'
      ctx.fillStyle = '#a3937a'
      ctx.font = '12px sans-serif'
      ctx.fillText(dish.cook_time, cardX + cardWidth - 28, baseline)
    }

    if (index < visibleDishes.length - 1) {
      ctx.strokeStyle = '#efe5cf'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(cardX + 28, rowTop + (index + 1) * rowHeight)
      ctx.lineTo(cardX + cardWidth - 28, rowTop + (index + 1) * rowHeight)
      ctx.stroke()
    }
  })

  ctx.save()
  ctx.translate(cardX + cardWidth - 66, cardY + cardHeight - 64)
  ctx.rotate(-12 * Math.PI / 180)

  ctx.strokeStyle = 'rgba(197,48,48,.8)'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.arc(0, 0, 42, 0, Math.PI * 2)
  ctx.stroke()

  ctx.strokeStyle = 'rgba(197,48,48,.7)'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.arc(0, 0, 35, 0, Math.PI * 2)
  ctx.stroke()

  ctx.textAlign = 'center'
  ctx.fillStyle = 'rgba(197,48,48,.8)'
  ctx.font = 'bold 17px serif'
  ctx.fillText('大厨', 0, -5)
  ctx.fillText('认证', 0, 17)
  ctx.restore()

  ctx.textAlign = 'center'
  ctx.fillStyle = '#b9ac96'
  ctx.font = '11px sans-serif'
  ctx.fillText('到底吃啥哟 · 御厨智荐', width / 2, cardY + cardHeight - 10)
}
