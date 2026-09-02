// Shared QR helper around the vendored qrcode-generator (see public/vendor/README.md).
import qrcode from './vendor/qrcode.mjs'

export function qrSvg(text, cellSize = 4, margin = 2) {
  const qr = qrcode(0, 'M')
  qr.addData(text)
  qr.make()
  return qr.createSvgTag(cellSize, margin, text, text)
}
