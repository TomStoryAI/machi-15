// Dev helper: print an ASCII color map of a screenshot so layout can be
// reconstructed without viewing the image (spec 012 layout analysis).
import sharp from 'sharp'

const path = process.argv[2] ?? 'C:/Users/tn129/Desktop/Screenshot 2026-09-02 111217.png'
const COLS = 110
const ROWS = Math.round(COLS * 0.62)

const img = sharp(path)
const meta = await img.metadata()
const { data, info } = await img.resize(COLS, ROWS, { fit: 'fill' }).raw().toBuffer({ resolveWithObject: true })

// Build a histogram of quantized colors (4 bits per channel) to find dominant colors.
const hist = new Map()
for (let i = 0; i < data.length; i += 3) {
  const r = data[i] >> 4
  const g = data[i + 1] >> 4
  const b = data[i + 2] >> 4
  const key = (r << 8) | (g << 4) | b
  hist.set(key, (hist.get(key) ?? 0) + 1)
}
const dominant = [...hist.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([k]) => k)

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
const keyOf = (r, g, b) => {
  const r4 = r >> 4
  const g4 = g >> 4
  const b4 = b >> 4
  const key = (r4 << 8) | (g4 << 4) | b4
  const idx = dominant.indexOf(key)
  return idx === -1 ? '.' : CHARS[idx % CHARS.length]
}

console.log(`IMAGE ${meta.width}x${meta.height} -> map ${COLS}x${ROWS}`)
for (let y = 0; y < ROWS; y++) {
  let line = ''
  for (let x = 0; x < COLS; x++) {
    const i = (y * COLS + x) * 3
    line += keyOf(data[i], data[i + 1], data[i + 2])
  }
  console.log(line)
}
console.log('LEGEND:')
dominant.forEach((k, idx) => {
  const r = ((k >> 8) & 0xf) * 17
  const g = ((k >> 4) & 0xf) * 17
  const b = (k & 0xf) * 17
  console.log(` ${CHARS[idx]} = rgb(${r},${g},${b})`)
})
