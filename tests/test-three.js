import fs from 'fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// GLTFLoader needs a DOM environment to work natively? Actually we can just parse the gltf JSON to find vertices for material 8
const gltf = JSON.parse(fs.readFileSync('public/ps1/scene.gltf'));
const mesh = gltf.meshes[25]; // Object_25
const prim = mesh.primitives[0];
const posAccessor = gltf.accessors[prim.attributes.POSITION];
const posView = gltf.bufferViews[posAccessor.bufferView];
const buffer = fs.readFileSync('public/ps1/scene.bin');

const offset = posView.byteOffset + (posAccessor.byteOffset || 0);
const numVertices = posAccessor.count;
let minX = Infinity, maxX = -Infinity;
let minY = Infinity, maxY = -Infinity;
let minZ = Infinity, maxZ = -Infinity;

for (let i = 0; i < numVertices; i++) {
  const x = buffer.readFloatLE(offset + i * 12);
  const y = buffer.readFloatLE(offset + i * 12 + 4);
  const z = buffer.readFloatLE(offset + i * 12 + 8);
  minX = Math.min(minX, x); maxX = Math.max(maxX, x);
  minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z);
}
console.log('Bounds:', { minX, maxX, minY, maxY, minZ, maxZ });

const uvAccessor = gltf.accessors[prim.attributes.TEXCOORD_0];
const uvView = gltf.bufferViews[uvAccessor.bufferView];
const uvOffset = uvView.byteOffset + (uvAccessor.byteOffset || 0);

// Let's sample a few vertices to find where the screen is.
