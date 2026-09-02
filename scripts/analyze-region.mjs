// Dev helper: binary structure map of a cropped region of an image.
import sharp from 'sharp'

const [, , path, x0, y0, w0, h0, cols] = process.argv
const COLS = Number(cols) || 120
const ROWS = Math.round((COLS * Number(h0)) / Number(w0))

const img = sharp(path).extract({ left: Number(x0), top: Number(y0), width: Number(w0), height: Number(h0) })
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

console.log(`region ${x0},${y0} ${w0}x${h0} -> ${COLS}x${ROWS}; bg rgb(${bgR},${bgG},${bgB})`)
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
