import { CanvasTexture } from 'three'

function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

/** Textura estilo "tile de tabla periódica" para un átomo del Hero: número, símbolo y nombre. */
export function createTileTexture(symbol: string, name: string, number: number, color: string): CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return new CanvasTexture(canvas)
  }

  ctx.fillStyle = 'rgba(17, 21, 28, 0.94)'
  roundRectPath(ctx, 8, 8, 240, 240, 28)
  ctx.fill()

  ctx.lineWidth = 7
  ctx.strokeStyle = color
  roundRectPath(ctx, 8, 8, 240, 240, 28)
  ctx.stroke()

  ctx.fillStyle = '#8a96a8'
  ctx.font = '500 26px "JetBrains Mono", monospace'
  ctx.fillText(String(number).padStart(2, '0'), 24, 50)

  ctx.textAlign = 'center'
  ctx.fillStyle = '#ffffff'
  ctx.font = '700 112px "Space Grotesk", sans-serif'
  ctx.fillText(symbol, 128, 155)

  ctx.fillStyle = color
  ctx.font = '500 24px "Space Grotesk", sans-serif'
  ctx.fillText(name, 128, 218)

  const texture = new CanvasTexture(canvas)
  texture.anisotropy = 4
  return texture
}
