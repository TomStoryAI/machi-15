// Dev helper: detect tile grid by finding white gutters via row/column density.
import sharp from 'sharp'

const path = process.argv[2] ?? 'C:/Users/tn129/Desktop/Screenshot 2026-09-02 111217.png'
const COLS = 220
const ROWS = Math.round(COLS * 0.62)

const img = sharp(path)
const meta = await img.metadata()
const data = await img.resize(COLS, ROWS, { fit: 'fill' }).raw().toBuffer()

const bgKey = (r, g, b) => ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4)
const hist = new Map()
for (let i = 0; i < data.length; i += 3) {
  const k = bgKey(data[i], data[i + 1], data[i + 2])
  hist.set(k, (hist.get(k) ?? 0) + 1)
}
const bg = [...hist.entries()].sort((a, b) => b[1] - a[1])[0][0]
const bgR = ((bg >> 8) & 0xf) * 17
const bgG = ((bg >> 4) & 0xf) * 17
const bgB = (bg & 0xf) * 17

const isFg = (i) => {
  const dr = data[i] - bgR
  const dg = data[i + 1] - bgG
  const db = data[i + 2] - bgB
  return dr * dr + dg * dg + db * db > 3500
}

// Row density: fraction of foreground per row.
const rowDensity = []
for (let y = 0; y < ROWS; y++) {
  let n = 0
  for (let x = 0; x < COLS; x++) if (isFg((y * COLS + x) * 3)) n++
  rowDensity.push(n / COLS)
}
// Column density.
const colDensity = []
for (let x = 0; x < COLS; x++) {
  let n = 0
  for (let y = 0; y < ROWS; y++) if (isFg((y * COLS + x) * 3)) n++
  colDensity.push(n / ROWS)
}

const px = (c, pct) => Math.round((c / (pct === 'x' ? COLS : ROWS)) * (pct === 'x' ? meta.width : meta.height))

console.log('ROW bands (map-y : density : px-y)')
let inGap = true
for (let y = 0; y < ROWS; y++) {
  const d = rowDensity[y]
  const isGap = d < 0.15
  if (isGap !== inGap || y === ROWS - 1) {
    if (!isGap) console.log(`  content starts y=${y} px=${px(y, 'y')} d=${d.toFixed(2)}`)
    else console.log(`  gap starts     y=${y} px=${px(y, 'y')} d=${d.toFixed(2)}`)
    inGap = isGap
  }
}
console.log('COLUMN bands (map-x : density : px-x)')
inGap = true
for (let x = 0; x < COLS; x++) {
  const d = colDensity[x]
  const isGap = d < 0.10
  if (isGap !== inGap || x === COLS - 1) {
    if (!isGap) console.log(`  content starts x=${x} px=${px(x, 'x')} d=${d.toFixed(2)}`)
    else console.log(`  gap starts     x=${x} px=${px(x, 'x')} d=${d.toFixed(2)}`)
    inGap = isGap
  }
}
console.log(`IMAGE ${meta.width}x${meta.height}`)
