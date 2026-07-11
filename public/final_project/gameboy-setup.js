// gameboy-setup.js
// Drop-in module: loads the shared Game Boy model once, creates 3
// color variants, applies looping autoplay video / static image
// screens, and wires up click handling.
//
// Usage in your existing three.js code:
//
//   import { initGameBoys } from './gameboy-setup.js';
//   const gameBoys = await initGameBoys(scene);
//
// gameBoys is an array of { color, root, onClick } so you can hook
// raycasting/click logic up to your own event system.

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// ---------------------------------------------------------------
// CONFIG — edit this section freely. Positions can be changed any
// time without touching anything else below.
// ---------------------------------------------------------------
const GAMEBOY_CONFIG = [
  {
    color: 'green',
    bodyTexture: '/textures/body_green.jpg',
    screen: '/screens/green_event.mp4',  // .mp4/.webm -> video, .jpg/.png -> image
    position: { x: -3, y: 0, z: 0 },
    rotationY: 0,
  },
  {
    color: 'yellow',
    bodyTexture: '/textures/body_yellow.jpg',
    screen: '/screens/yellow_event.mp4',
    position: { x: 0, y: 0, z: 0 },
    rotationY: 0,
  },
  {
    color: 'red',
    bodyTexture: '/textures/body_red.jpg',
    screen: '/screens/red_event.mp4',
    position: { x: 3, y: 0, z: 0 },
    rotationY: 0,
  },
];

const MODEL_PATH = '/models/game_boy_challenge.glb';

// ---------------------------------------------------------------
// Internals
// ---------------------------------------------------------------
const textureLoader = new THREE.TextureLoader();
const gltfLoader = new GLTFLoader();

function isVideo(path) {
  return /\.(mp4|webm|mov)$/i.test(path);
}

function makeVideoTexture(path) {
  const video = document.createElement('video');
  video.src = path;
  video.loop = true;
  video.muted = true;       // required for autoplay in most browsers
  video.playsInline = true;
  video.autoplay = true;
  video.play().catch(() => {
    // Some browsers block autoplay until user interaction;
    // it will start on first click/tap anywhere on the page.
    document.addEventListener('click', () => video.play(), { once: true });
  });

  const texture = new THREE.VideoTexture(video);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function makeScreenTexture(path) {
  if (isVideo(path)) {
    return makeVideoTexture(path);
  }
  const tex = textureLoader.load(path);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function loadModel() {
  return new Promise((resolve, reject) => {
    gltfLoader.load(MODEL_PATH, (gltf) => resolve(gltf.scene), undefined, reject);
  });
}

// ---------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------
export async function initGameBoys(scene, { onGameBoyClick } = {}) {
  const baseScene = await loadModel();
  const results = [];

  for (const cfg of GAMEBOY_CONFIG) {
    const root = baseScene.clone(true);

    // Each clone needs its own material instance (and its own
    // cloned textures) so swapping one Game Boy's color/screen
    // never affects the others.
    root.traverse((node) => {
      if (node.isMesh && node.material && node.material.name === 'GameBoy_Mat') {
        const mat = node.material.clone();

        const bodyTex = textureLoader.load(cfg.bodyTexture);
        bodyTex.colorSpace = THREE.SRGBColorSpace;
        bodyTex.flipY = false; // glTF convention
        mat.map = bodyTex;

        mat.emissiveMap = makeScreenTexture(cfg.screen);
        mat.emissive = new THREE.Color(0xffffff);

        mat.needsUpdate = true;
        node.material = mat;
      }
    });

    root.position.set(cfg.position.x, cfg.position.y, cfg.position.z);
    root.rotation.y = cfg.rotationY ?? 0;
    root.userData.gbColor = cfg.color;

    scene.add(root);

    results.push({ color: cfg.color, root });
  }

  // Optional: simple raycasting click handling. If your site already
  // has its own raycaster, skip this and just use `results` to know
  // which root belongs to which color.
  if (onGameBoyClick) {
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const canvas = scene.userData.rendererDomElement; // optional convenience

    window.addEventListener('click', (event) => {
      const camera = scene.userData.camera; // expects you to stash these
      if (!camera) return;
      pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
      pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);

      const allMeshes = [];
      results.forEach((r) => r.root.traverse((n) => n.isMesh && allMeshes.push(n)));

      const hits = raycaster.intersectObjects(allMeshes, true);
      if (hits.length > 0) {
        let obj = hits[0].object;
        while (obj && !obj.userData.gbColor) obj = obj.parent;
        if (obj) onGameBoyClick(obj.userData.gbColor);
      }
    });
  }

  return results;
}
