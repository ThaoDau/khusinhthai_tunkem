import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

export function batchStaticScene(root,cellSize=24){
 root.updateMatrixWorld(true);
 const groups=new Map(),originals=[],batches=[];
 const dynamic=o=>{for(let p=o;p&&p!==root;p=p.parent)if(p.userData.dynamic)return true;return false;};
 root.traverse(o=>{
  if(dynamic(o))return;
  if(!o.isMesh||o.isInstancedMesh||Array.isArray(o.material)||o.geometry.morphAttributes.position)return;
  const world=new T.Vector3().setFromMatrixPosition(o.matrixWorld);
  const attributes=Object.keys(o.geometry.attributes).sort().join(',');
  const key=[o.material.uuid,Math.floor(world.x/cellSize),Math.floor(world.z/cellSize),o.castShadow,o.receiveShadow,attributes].join(':');
  if(!groups.has(key))groups.set(key,[]);groups.get(key).push(o);
 });
 for(const list of groups.values()){
  if(list.length<2)continue;
  const pieces=list.map(o=>{const g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();g.applyMatrix4(o.matrixWorld);g.clearGroups();return g;});
  const merged=mergeGeometries(pieces,false);pieces.forEach(g=>g.dispose());if(!merged)continue;
  merged.computeBoundingSphere();const first=list[0],batch=new T.Mesh(merged,first.material);batch.castShadow=first.castShadow;batch.receiveShadow=first.receiveShadow;batch.matrixAutoUpdate=false;batch.name='Static village cluster';
  for(const o of list){originals.push({object:o,parent:o.parent});o.removeFromParent();}root.add(batch);batches.push(batch);
 }
 root.traverse(o=>{if(!dynamic(o)){o.updateMatrix();o.matrixAutoUpdate=false;}});
 return {originalCount:originals.length,batchCount:batches.length,dispose(){for(const b of batches){b.removeFromParent();b.geometry.dispose();}for(const {object,parent}of originals)parent.add(object);}};
}

export class AdaptiveQuality {
 constructor(mode='auto'){this.mode=mode;this.ratio=mode==='smooth'?.75:mode==='pretty'?1.5:1;this.shadow=mode!=='smooth';this.samples=0;this.total=0;this.cooldown=0;}
 sample(delta){
  if(this.mode!=='auto'||!Number.isFinite(delta)||delta<=0||delta>1)return false;
  this.total+=delta;this.samples++;this.cooldown+=delta;
  if(this.total<2)return false;
  const fps=this.samples/this.total;this.total=0;this.samples=0;
  if(this.cooldown<3)return false;
  let changed=false;
  if(fps<42&&this.ratio>.75){this.ratio=Math.max(.75,this.ratio-.125);changed=true;}
  else if(fps<32&&this.shadow){this.shadow=false;changed=true;}
  else if(fps>56&&this.cooldown>12&&this.ratio<1.25){this.ratio=Math.min(1.25,this.ratio+.125);changed=true;}
  if(changed)this.cooldown=0;return changed;
 }
}

export function remoteMotion(previous,p,now){
 const timestamp=p.position_at||p.action_at||0;
 if(previous&&timestamp<=previous.timestamp)return previous;
 const elapsed=previous?Math.max(.1,Math.min(2,(timestamp-previous.timestamp)/1000)):1;
 let vx=previous?(p.x-previous.x)/elapsed:0,vz=previous?(p.z-previous.z)/elapsed:0;
 const speed=Math.hypot(vx,vz);if(speed>8){vx=0;vz=0;}
 return {x:p.x||0,z:p.z??10,vx,vz,at:now,timestamp};
}
