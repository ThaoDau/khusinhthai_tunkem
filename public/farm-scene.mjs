import * as T from 'three';import {PLOTS} from './mystery-data.mjs';
export function createFarmScene(parent,inside=false){
 const root=new T.Group();root.userData.dynamic=true;parent.add(root);
 const geometry=new T.SphereGeometry(1,8,6),leafMaterial=new T.MeshStandardMaterial({color:0x628f42,roughness:1}),heartMaterial=new T.MeshStandardMaterial({color:0xa9c46e,roughness:1});
 const leaves=new T.InstancedMesh(geometry,leafMaterial,144),hearts=new T.InstancedMesh(geometry,heartMaterial,144);root.add(leaves,hearts);leaves.castShadow=false;hearts.castShadow=false;leaves.receiveShadow=hearts.receiveShadow=true;
 const dummy=new T.Object3D();let lastKey='';
 return {update(plots,now){const key=(plots||[]).map(p=>p.ready_at).join(',')+':'+Math.floor(now/1000);if(key===lastKey)return;lastKey=key;let index=0;for(const p of PLOTS){const row=plots?.find(r=>r.id===p.id),growth=row?.ready_at>now?Math.max(.2,1-(row.ready_at-now)/45000):1,x=inside?p.insideX:p.x,z=inside?p.insideZ:p.z,spacing=inside?1.45:.95;for(let k=0;k<9;k++){dummy.position.set(x+(k%3-1)*spacing,.45+growth*.22,z+(Math.floor(k/3)-1)*spacing);dummy.scale.set(.48*growth,.3*growth,.48*growth);dummy.updateMatrix();leaves.setMatrixAt(index,dummy.matrix);dummy.position.y+=.15*growth;dummy.scale.set(.28*growth,.24*growth,.28*growth);dummy.updateMatrix();hearts.setMatrixAt(index++,dummy.matrix);}}leaves.instanceMatrix.needsUpdate=hearts.instanceMatrix.needsUpdate=true;},dispose(){root.removeFromParent();geometry.dispose();leafMaterial.dispose();heartMaterial.dispose();}};
}
