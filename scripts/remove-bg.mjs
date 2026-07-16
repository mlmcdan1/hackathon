import { Jimp } from 'jimp'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ASSETS = path.join(__dirname, '../src/assets')

const TARGETS = [
  'SNESController.png',
  'GameboyAdvance.png',
  'Gamecube.png',
  'XboxController.png',
  'StreetFighterArcadeMachine.png',
]

const TOLERANCE = 42

function colorDist(r1, g1, b1, r2, g2, b2) {
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2)
}

// BFS flood-fill from all 4 corners — only removes connected bg pixels
function floodFill(data, width, height, seedR, seedG, seedB, tolerance) {
  const visited = new Uint8Array(width * height)
  const queue = []

  const seeds = [
    [0, 0], [width - 1, 0],
    [0, height - 1], [width - 1, height - 1],
  ]

  for (const [sx, sy] of seeds) {
    const idx = (sy * width + sx) * 4
    if (!visited[sy * width + sx]) {
      queue.push([sx, sy])
      visited[sy * width + sx] = 1
    }
  }

  while (queue.length > 0) {
    const [x, y] = queue.shift()
    const idx = (y * width + x) * 4
    const r = data[idx], g = data[idx + 1], b = data[idx + 2]

    if (colorDist(r, g, b, seedR, seedG, seedB) > tolerance) continue

    data[idx + 3] = 0 // transparent

    const neighbors = [[x-1,y],[x+1,y],[x,y-1],[x,y+1]]
    for (const [nx, ny] of neighbors) {
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue
      if (visited[ny * width + nx]) continue
      visited[ny * width + nx] = 1
      queue.push([nx, ny])
    }
  }
}

async function removeBg(filename) {
  const filepath = path.join(ASSETS, filename)
  const img = await Jimp.read(filepath)
  const { width, height, data } = img.bitmap

  // Sample corner to get background seed colour
  const c = img.getPixelColor(0, 0)
  const seedR = (c >> 24) & 0xff
  const seedG = (c >> 16) & 0xff
  const seedB = (c >> 8) & 0xff

  console.log(`${filename}: seed rgb(${seedR},${seedG},${seedB})`)

  floodFill(data, width, height, seedR, seedG, seedB, TOLERANCE)

  await img.write(filepath)
  console.log(`  ✓ saved`)
}

for (const f of TARGETS) {
  await removeBg(f)
}
console.log('\nDone.')
