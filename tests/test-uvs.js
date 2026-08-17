import * as THREE from 'three';
import fs from 'fs';

const gltf = JSON.parse(fs.readFileSync('public/ps1/scene.gltf'));
const mesh = gltf.meshes[25];
const prim = mesh.primitives[0];
const posAccessor = gltf.accessors[prim.attributes.POSITION];
const uvAccessor = gltf.accessors[prim.attributes.TEXCOORD_0];
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

const mat = new THREE.Matrix4().fromArray([
  1, 0, 0, 0,
  0, 1, 0, 0,
  0, 0, 1, 0,
  0, 0.137487530708313, 1.1359621286392212, 1
]);

let otherUvs = [];

for (let i = 0; i < numTriangles; i++) {
  const i0 = readIndex(indexAccessor, i * 3);
  const i1 = readIndex(indexAccessor, i * 3 + 1);
  const i2 = readIndex(indexAccessor, i * 3 + 2);
  
  const v0 = new THREE.Vector3(readFloat(posAccessor, i0, 0), readFloat(posAccessor, i0, 1), readFloat(posAccessor, i0, 2)).applyMatrix4(mat);
  const v1 = new THREE.Vector3(readFloat(posAccessor, i1, 0), readFloat(posAccessor, i1, 1), readFloat(posAccessor, i1, 2)).applyMatrix4(mat);
  const v2 = new THREE.Vector3(readFloat(posAccessor, i2, 0), readFloat(posAccessor, i2, 1), readFloat(posAccessor, i2, 2)).applyMatrix4(mat);
  
  const normal = new THREE.Vector3().crossVectors(
    new THREE.Vector3().subVectors(v1, v0),
    new THREE.Vector3().subVectors(v2, v0)
  ).normalize();
  
  // If NOT front facing
  if (normal.z <= 0.8) {
    otherUvs.push([readFloat(uvAccessor, i0, 0), readFloat(uvAccessor, i0, 1)]);
    otherUvs.push([readFloat(uvAccessor, i1, 0), readFloat(uvAccessor, i1, 1)]);
    otherUvs.push([readFloat(uvAccessor, i2, 0), readFloat(uvAccessor, i2, 1)]);
  }
}

let minU = Infinity, maxU = -Infinity;
let minV = Infinity, maxV = -Infinity;
for (const uv of otherUvs) {
  minU = Math.min(minU, uv[0]); maxU = Math.max(maxU, uv[0]);
  minV = Math.min(minV, uv[1]); maxV = Math.max(maxV, uv[1]);
}

console.log('Other UV bounds:', { minU, maxU, minV, maxV });
