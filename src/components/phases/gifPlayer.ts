import { parseGIF, decompressFrames } from 'gifuct-js'

// Manual GIF decoding + frame stepping, instead of relying on a hidden
// <img> to keep animating on its own. That approach — a real, laid-out
// but visually-hidden <img> element, which is the standard trick for
// feeding an animating GIF into a canvas — turned out to be unreliable in
// practice: whether a given browser keeps advancing an off-viewport (or
// otherwise de-prioritized) image's frames is an internal heuristic nothing
// in the DOM/CSS spec actually guarantees, and it was inconsistent between
// environments here. Decoding the frames ourselves and stepping through
// them on our own timer removes that dependency entirely — nothing needs
// to "notice" the image is visible, because there's no image, just pixel
// data we control directly.

export interface GifPlayer {
  width: number
  height: number
  /** Advances playback by `deltaMs`; call once per render frame. */
  update(deltaMs: number): void
  /** The current frame's pixels, ready to draw via ctx.drawImage(). */
  currentFrame(): HTMLCanvasElement
}

export async function loadGifPlayer(url: string): Promise<GifPlayer> {
  const buffer = await fetch(url).then((r) => r.arrayBuffer())
  const gif = parseGIF(buffer)
  const rawFrames = decompressFrames(gif, true)
  const width = gif.lsd.width
  const height = gif.lsd.height

  // Composite each frame to full canvas size up front (frames are often
  // just a small changed region, positioned via `dims`, layered according
  // to `disposalType` — see gifuct-js's README for what these mean) so
  // playback is just "hand over frame N," no per-frame compositing math.
  const compose = document.createElement('canvas')
  compose.width = width
  compose.height = height
  const cctx = compose.getContext('2d')
  if (!cctx) throw new Error('2d context unavailable')

  type Frame = { canvas: HTMLCanvasElement; delay: number }
  const frames: Frame[] = []
  let prevDisposal = 0
  let prevDims = { left: 0, top: 0, width: 0, height: 0 }
  let savedRegion: ImageData | null = null

  for (const raw of rawFrames) {
    if (prevDisposal === 2) {
      cctx.clearRect(prevDims.left, prevDims.top, prevDims.width, prevDims.height)
    } else if (prevDisposal === 3 && savedRegion) {
      cctx.putImageData(savedRegion, prevDims.left, prevDims.top)
    }

    if (raw.disposalType === 3) {
      savedRegion = cctx.getImageData(raw.dims.left, raw.dims.top, raw.dims.width, raw.dims.height)
    }

    const patch = new ImageData(new Uint8ClampedArray(raw.patch), raw.dims.width, raw.dims.height)
    cctx.putImageData(patch, raw.dims.left, raw.dims.top)

    const frameCanvas = document.createElement('canvas')
    frameCanvas.width = width
    frameCanvas.height = height
    frameCanvas.getContext('2d')?.drawImage(compose, 0, 0)
    // Real-world gifs occasionally specify a 0ms delay, which browsers
    // treat as "use a sane default" rather than literally instant.
    frames.push({ canvas: frameCanvas, delay: raw.delay > 0 ? raw.delay : 100 })

    prevDisposal = raw.disposalType
    prevDims = raw.dims
  }

  let index = 0
  let elapsed = 0

  return {
    width,
    height,
    update(deltaMs: number) {
      if (frames.length <= 1) return
      elapsed += deltaMs
      while (elapsed >= frames[index].delay) {
        elapsed -= frames[index].delay
        index = (index + 1) % frames.length
      }
    },
    currentFrame() {
      return frames[index].canvas
    },
  }
}
