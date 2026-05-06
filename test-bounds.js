import * as THREE from 'three';
import fs from 'fs';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// We can read scene.bin and gltf manually, or just use a mock DOM to load it.
// Since we don't have a DOM, we can use a small script to compute the absolute world positions of the vertices in Object_25
const gltf = JSON.parse(fs.readFileSync('public/ps1/scene.gltf'));

const mesh = gltf.meshes[25];
const prim = mesh.primitives[0];
const posAccessor = gltf.accessors[prim.attributes.POSITION];
const posView = gltf.bufferViews[posAccessor.bufferView];
const buffer = fs.readFileSync('public/ps1/scene.bin');

const offset = posView.byteOffset + (posAccessor.byteOffset || 0);

// glass_and_fence_25 matrix
const mat = new THREE.Matrix4().fromArray([
  1, 0, 0, 0,
  0, 1, 0, 0,
  0, 0, 1, 0,
  0, 0.137487530708313, 1.1359621286392212, 1
]);

let minX = Infinity, maxX = -Infinity;
let minY = Infinity, maxY = -Infinity;
let minZ = Infinity, maxZ = -Infinity;

let vertices = [];

for (let i = 0; i < posAccessor.count; i++) {
  const x = buffer.readFloatLE(offset + i * 12);
  const y = buffer.readFloatLE(offset + i * 12 + 4);
  const z = buffer.readFloatLE(offset + i * 12 + 8);
  
  const v = new THREE.Vector3(x, y, z);
  v.applyMatrix4(mat);
  
  vertices.push(v);
  
  minX = Math.min(minX, v.x); maxX = Math.max(maxX, v.x);
  minY = Math.min(minY, v.y); maxY = Math.max(maxY, v.y);
  minZ = Math.min(minZ, v.z); maxZ = Math.max(maxZ, v.z);
}

console.log('Absolute Bounds of glass_and_fence_25:', { minX, maxX, minY, maxY, minZ, maxZ });

// Let's see if we can find the "screen" by looking at points with highest Z
const frontVertices = vertices.filter(v => v.z > maxZ - 0.05);
let sMinX = Infinity, sMaxX = -Infinity;
let sMinY = Infinity, sMaxY = -Infinity;
for (const v of frontVertices) {
  sMinX = Math.min(sMinX, v.x); sMaxX = Math.max(sMaxX, v.x);
  sMinY = Math.min(sMinY, v.y); sMaxY = Math.max(sMaxY, v.y);
}
console.log('Front face bounds:', { sMinX, sMaxX, sMinY, sMaxY, z: maxZ });
console.log('Center:', { x: (sMinX + sMaxX)/2, y: (sMinY + sMaxY)/2, z: maxZ });
console.log('Width:', sMaxX - sMinX, 'Height:', sMaxY - sMinY);
