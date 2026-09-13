import {cp,mkdir,stat,rename,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.resolve(fileURLToPath(new URL('..',import.meta.url)));
await mkdir(path.join(root,'public/vision'),{recursive:true});
await mkdir(path.join(root,'public/models'),{recursive:true});
await cp(path.join(root,'node_modules/@mediapipe/tasks-vision/wasm'),path.join(root,'public/vision'),{recursive:true});
for(const[filename,url]of[
  ['hand_landmarker.task','https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task'],
  ['face_landmarker.task','https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task'],
]){
  const destination=path.join(root,'public/models',filename);
  try{if((await stat(destination)).size>1_000_000){console.log(`${filename}: already available`);continue;}}catch{}
  const response=await fetch(url,{signal:AbortSignal.timeout(120_000)});
  if(!response.ok)throw new Error(`Cannot download ${filename}: ${response.status}`);
  const bytes=new Uint8Array(await response.arrayBuffer());
  if(bytes.byteLength<1_000_000)throw new Error(`Incomplete model: ${filename}`);
  await writeFile(`${destination}.download`,bytes);await rename(`${destination}.download`,destination);
  console.log(`${filename}: ${(bytes.byteLength/1_000_000).toFixed(1)} MB ready`);
}
