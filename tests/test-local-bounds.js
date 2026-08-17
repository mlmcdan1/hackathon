import * as THREE from 'three';
import fs from 'fs';

const gltf = JSON.parse(fs.readFileSync('public/ps1/scene.gltf'));
const mesh = gltf.meshes[25];
const prim = mesh.primitives[0];
const posAccessor = gltf.accessors[prim.attributes.POSITION];
const indexAccessor = gltf.accessors[prim.indices];

const buffer = fs.readFileSync('public/ps1/scene.bin');

function readFloat(accessor, index, component) {
  const view = gltf.bufferViews[accessor.bufferView];
  const vOffset = view.byteOffset || 0;
  const aOffset = accessor.byteOffset || 0;
  const stride = view.byteStride || (accessor.type === 'VEC3' ? 12 : 8);
  const offset = vOffset + aOffset + index * stride + component * 4;
  return buffer.readFloatLE(offset);
}

function readIndex(accessor, index) {
  const view = gltf.bufferViews[accessor.bufferView];
  const vOffset = view.byteOffset || 0;
  const aOffset = accessor.byteOffset || 0;
  const offset = vOffset + aOffset + index * 2;
  return buffer.readUInt16LE(offset);
}

const numTriangles = indexAccessor.count / 3;

// Instead of applying matrix, we compute bounds in LOCAL space
let sMinX = Infinity, sMaxX = -Infinity;
let sMinY = Infinity, sMaxY = -Infinity;
let sMinZ = Infinity, sMaxZ = -Infinity;

for (let i = 0; i < numTriangles; i++) {
  const i0 = readIndex(indexAccessor, i * 3);
  const i1 = readIndex(indexAccessor, i * 3 + 1);
  const i2 = readIndex(indexAccessor, i * 3 + 2);
  
  const v0 = new THREE.Vector3(readFloat(posAccessor, i0, 0), readFloat(posAccessor, i0, 1), readFloat(posAccessor, i0, 2));
  const v1 = new THREE.Vector3(readFloat(posAccessor, i1, 0), readFloat(posAccessor, i1, 1), readFloat(posAccessor, i1, 2));
  const v2 = new THREE.Vector3(readFloat(posAccessor, i2, 0), readFloat(posAccessor, i2, 1), readFloat(posAccessor, i2, 2));
  
  const normal = new THREE.Vector3().crossVectors(
    new THREE.Vector3().subVectors(v1, v0),
    new THREE.Vector3().subVectors(v2, v0)
  ).normalize();
  
  // If local normal faces mostly +Z
  if (normal.z > 0.8) {
    for (const v of [v0, v1, v2]) {
      sMinX = Math.min(sMinX, v.x); sMaxX = Math.max(sMaxX, v.x);
      sMinY = Math.min(sMinY, v.y); sMaxY = Math.max(sMaxY, v.y);
      sMinZ = Math.min(sMinZ, v.z); sMaxZ = Math.max(sMaxZ, v.z);
    }
  }
}

console.log('Local bounds for front-facing triangles:', { sMinX, sMaxX, sMinY, sMaxY, sMinZ, sMaxZ });

const width = sMaxX - sMinX;
const height = sMaxY - sMinY;
const centerX = (sMinX + sMaxX) / 2;
const centerY = (sMinY + sMaxY) / 2;

console.log(`Local Center: X=${centerX}, Y=${centerY}, Z=${sMaxZ}`);
console.log(`Size: Width=${width}, Height=${height}`);
