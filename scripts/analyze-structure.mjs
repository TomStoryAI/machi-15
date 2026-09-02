// Dev helper: binary structure map — distinguishes background from anything else.
import sharp from 'sharp'

const path = process.argv[2] ?? 'C:/Users/tn129/Desktop/Screenshot 2026-09-02 111217.png'
const COLS = 180
const ROWS = Math.round(COLS * 0.62)

const img = sharp(path)
const meta = await img.metadata()
const data = await img.resize(COLS, ROWS, { fit: 'fill' }).raw().toBuffer()

// Background: most common color. Mark pixels that differ from it notably.
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

console.log(`IMAGE ${meta.width}x${meta.height} -> ${COLS}x${ROWS}; bg rgb(${bgR},${bgG},${bgB})`)
for (let y = 0; y < ROWS; y++) {
  let line = ''
  for (let x = 0; x < COLS; x++) {
    const i = (y * COLS + x) * 3
    const dr = data[i] - bgR
    const dg = data[i + 1] - bgG
    const db = data[i + 2] - bgB
    const dist = dr * dr + dg * dg + db * db
    line += dist > 3500 ? '#' : ' '
  }
  console.log(line)
}
