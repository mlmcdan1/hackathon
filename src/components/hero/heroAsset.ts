import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

const heroModelLoader = new GLTFLoader()

type ProgressCallback = (progress: number) => void
const progressCallbacks = new Set<ProgressCallback>()

export function onHeroLoadProgress(cb: ProgressCallback) {
  progressCallbacks.add(cb)
  return () => progressCallbacks.delete(cb)
}

export const heroAssetPromise = heroModelLoader.loadAsync('/ps1/scene.gltf', (event) => {
  if (event.total > 0) {
    const p = event.loaded / event.total
    progressCallbacks.forEach(cb => cb(p))
  }
})
