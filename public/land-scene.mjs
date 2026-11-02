import * as T from 'three';
import {LAND_LOTS,LAND_CROPS,landBed} from './land-data.mjs';
import {createLivestockScene} from './livestock-scene.mjs';
import {batchStaticScene} from './rendering.mjs';
export function createLandScene(stage){
 const root=new T.Group();root.userData.dynamic=true;stage.add(root);const base=new T.Group();root.add(base);const livestockScene=createLivestockScene(root);
 const geos=new Map(),mats=new Map();let batch=null,structureKey='',lastPlants='',labels=[],roofGroups=[],dataRef=null,plantTick=-1;
 const geo=(type,a)=>{const k=type+a.join();if(!geos.has(k))geos.set(k,new T[type](...a));return geos.get(k);};
 const mat=c=>{if(!mats.has(c))mats.set(c,new T.MeshStandardMaterial({color:c,roughness:.9}));return mats.get(c);};
 function mesh(g,m,x,y,z,parent=base){const o=new T.Mesh(g,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
 const box=(x,y,z,w,h,d,c,parent=base)=>mesh(geo('BoxGeometry',[w,h,d]),mat(c),x,y,z,parent);
 const sphere=(x,y,z,r,c)=>mesh(geo('SphereGeometry',[r,8,6]),mat(c),x,y,z);
 function label(value,x,y,z,width=8){const c=document.createElement('canvas');c.width=512;c.height=96;const g=c.getContext('2d');g.fillStyle='#304c3d';g.fillRect(0,0,512,96);g.strokeStyle='#d5c39a';g.lineWidth=5;g.strokeRect(3,3,506,90);g.font='bold 24px sans-serif';g.textAlign='center';g.fillStyle='#f5e6c7';g.fillText(value.slice(0,32),256,57);const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;const m=new T.SpriteMaterial({map:t,depthTest:true}),s=new T.Sprite(m);s.position.set(x,y,z);s.scale.set(width,width*96/512,1);base.add(s);labels.push({t,m});}
 function fence(x,z,w,d){for(const side of [-1,1]){box(x+side*w/2,.65,z,.12,.12,d,0xbca078);box(x+side*w/2,1.2,z,.12,.12,d,0xbca078);for(let a=-d/2;a<=d/2;a+=3)box(x+side*w/2,.8,z+a,.16,1.6,.16,0x9a8056);box(x,.65,z-d/2,w,.12,.12,0xbca078);box(x,1.2,z-d/2,w,.12,.12,0xbca078);for(const a of [-w/2,w/2])box(x+a,.8,z-d/2,.16,1.6,.16,0x9a8056);}for(const side of [-1,1]){box(x+side*6.5,.8,z+d/2,7,.13,.14,0xbca078);box(x+side*6.5,1.3,z+d/2,7,.13,.14,0xbca078);}}
 const cropRoot=new T.Group();cropRoot.userData.dynamic=true;root.add(cropRoot);const plantGeo=geo('SphereGeometry',[1,8,6]),leafMat=mat(0x699957),fruitMat=mat(0xffffff),leaves=new T.InstancedMesh(plantGeo,leafMat,324),fruits=new T.InstancedMesh(plantGeo,fruitMat,324);leaves.count=fruits.count=0;leaves.receiveShadow=fruits.receiveShadow=true;cropRoot.add(leaves,fruits);const dummy=new T.Object3D(),color=new T.Color();
 let collisions=[];
 function rebuild(parcels){batch?.dispose();for(const {t,m}of labels){t.dispose();m.dispose();}labels=[];roofGroups=[];base.clear();collisions=[];
  for(const lot of LAND_LOTS){const p=parcels.find(p=>p.id===lot.id),owned=p?.status==='approved',pending=p?.status==='pending';
   box(lot.x,.08,lot.z,22,.12,22,owned?0x9dac74:pending?0xb7ad82:0x9eaf7c);fence(lot.x,lot.z,21,21);
   box(lot.x,.17,lot.z+7,4,.08,7,0xc8b68d);box(lot.x-6,1.2,lot.z+10,.18,2.4,.18,0x7b694b);
   label(lot.id+' · '+(p?.owner_name||'ĐẤT CHƯA CẤP'),lot.x-6,3.2,lot.z+10);
   if(owned&&(p.house_level||p.house_ready)){
    const x=lot.x-4,z=lot.z-3;box(x,.08,z,8,.16,9,0xb4a284);
    if(p.house_level){
     for(const side of [-1,1]){box(x+side*3.5,2.1,z,.25,4.1,8,0xc7b287);collisions.push({x:x+side*3.5,z,w:.68,d:4.5});box(x+side*2.4,2.1,z+4,2.2,4.1,.25,0xc7b287);collisions.push({x:x+side*2.4,z:z+4,w:1.6,d:.68});}box(x,2.1,z-4,7,4.1,.25,0xc7b287);collisions.push({x,z:z-4,w:4,d:.68});box(x,3.8,z+4,2.7,.65,.3,0x987b50);box(x-1.8,.55,z-1.5,2.2,1.1,3,0x8d734f);box(x-1.8,1.15,z-1.5,2.1,.16,2.9,0xd4d1ae);box(x-1.8,1.3,z-2.3,1.9,.2,.7,0xeee0b6);collisions.push({x:x-1.8,z:z-1.5,w:1.5,d:2});for(const side of [-1,1]){box(x+side*2.3,2.7,z+4.05,1.2,1.5,.12,0x729c9a);box(x+side*2.3,2.7,z+4.13,1.35,.1,.1,0xe5cda4);}
     const roofGroup=new T.Group();roofGroup.userData.dynamic=true;base.add(roofGroup);roofGroups.push({root:roofGroup,x,z});for(const side of [-1,1]){const roof=box(x+side*2,4.8,z,4.7,.25,10,0xa9704a,roofGroup);roof.rotation.z=-side*.4;}box(x,5.6,z,.25,.25,10,0x794a32,roofGroup);box(x,.5,z+5.2,5,.45,2.1,0xbfac88);label(p.title,x,4,z+5.1);
     sphere(x-3,1,z+5.5,.7,0x75925b);sphere(x+3,1,z+5.5,.7,0x859f60);
    }else{collisions.push({x,z,w:4.2,d:4.7});for(const a of [-3.2,3.2])for(const b of [-3.7,3.7])box(x+a,2,z+b,.23,4,.23,0x9c7e4d);box(x,3.6,z+4,8,.3,.15,0x9c7e4d);label('ĐANG DỰNG NHÀ',x,5,z);}
   }
   if(owned&&!p.garden_level&&!p.garden_ready)label('🌱 TẠO VƯỜN · NHẤN E',lot.x+5,1.7,lot.z,5.8);
   if(owned&&!p.coop_level&&!p.coop_ready)label('🐔 XÂY CHUỒNG · NHẤN E',lot.x-4.7,1.6,lot.z+6.2,5.8);
   if(owned&&(p.coop_level||p.coop_ready)){
    const x=lot.x-4.7,z=lot.z+6.2;box(x,.18,z,7,.16,5.6,0xb9a878);
    for(const y of [.8,1.3]){for(const side of [-1,1])box(x,y,z+side*2.8,7,.12,.12,0xb09569);box(x-3.5,y,z,.12,.12,5.6,0xb09569);for(const side of [-1,1])box(x+3.5,y,z+side*1.95,.12,.12,1.7,0xb09569);}
    for(const dx of [-3.5,3.5])for(const dz of [-2.8,2.8])box(x+dx,.8,z+dz,.18,1.6,.18,0x8d7552);
    if(p.coop_level){box(lot.x-7,1,lot.z+4.7,2.2,1.6,2.1,0xb18b56);box(lot.x-7,1.95,lot.z+4.7,2.8,.25,2.7,0xa96d49);box(lot.x-7,.8,lot.z+5.78,.65,1,.1,0x3e422d);collisions.push({x:lot.x-7,z:lot.z+4.7,w:1.45,d:1.4});box(lot.x-1.5,.48,lot.z+6.3,.65,.45,1.7,0x8c7350);box(lot.x-1.5,.72,lot.z+6.3,.48,.08,1.5,0xccb570);}
    else label('ĐANG DỰNG CHUỒNG',x,2,z,5.5);
   }
   if(owned&&(p.garden_level||p.garden_ready))for(let i=0;i<3;i++){const b=landBed(lot,i);box(b.x,.3,b.z,3.7,.5,3.7,0x856344);for(const side of [-1,1]){box(b.x+side*1.9,.4,b.z,.12,.4,3.8,0xbca278);box(b.x,.4,b.z+side*1.9,3.8,.4,.12,0xbca278);}}
   if(owned&&(p.garden_level===2||p.greenhouse_ready)){const x=lot.x+5;for(const a of [-2.4,2.4]){box(x+a,2.1,lot.z,.12,4.2,18,0x9eb4a7);for(const z of [-8,-4,0,4,8])box(x+a,2.1,lot.z+z,.12,4.2,.12,0x9eb4a7);}for(const z of [-8,-4,0,4,8]){const frame=mesh(geo('TorusGeometry',[2.4,.06,4,16,Math.PI]),mat(0x91a99d),x,4.1,lot.z+z);frame.rotation.z=0;}if(p.garden_level===2){const glass=new T.MeshStandardMaterial({color:0xb9d5cb,transparent:true,opacity:.2,depthWrite:false,roughness:.45,side:T.DoubleSide});labels.push({t:{dispose(){}},m:glass});const cover=mesh(geo('BoxGeometry',[4.9,.1,18]),glass,x,4.4,lot.z);cover.castShadow=false;}}
  }
  batch=batchStaticScene(base,26);
 }
 return {get collisions(){return collisions;},update(parcels=[],now,position){
  livestockScene.update(parcels,now);
  if(position)for(const r of roofGroups)r.root.visible=Math.abs(position.x-r.x)>4||Math.abs(position.z-r.z)>5;
  const tick=Math.floor(now/1000);if(dataRef===parcels&&plantTick===tick)return false;dataRef=parcels;plantTick=tick;
  const key=parcels.map(p=>[p.id,p.owner_id,p.owner_name,p.status,p.title,p.house_level,!!p.house_ready,p.garden_level,!!p.garden_ready,!!p.greenhouse_ready,p.coop_level,!!p.coop_ready].join(':')).join('|');
  let changed=false;if(key!==structureKey){structureKey=key;rebuild(parcels);changed=true;}
  const plantKey=parcels.map(p=>p.beds?.map(b=>b.crop+':'+b.ready_at).join()).join('|')+Math.floor(now/1000);if(lastPlants===plantKey)return changed;lastPlants=plantKey;let n=0;
  for(const p of parcels)for(const b of p.beds||[]){const seed=LAND_CROPS[b.crop];if(!seed||!p.garden_level)continue;const spot=landBed(p,b.bed),growth=Math.max(.15,Math.min(1,1-(b.ready_at-now)/(seed.ms*(p.garden_level===2?.75:1))));for(let i=0;i<9;i++){
   dummy.position.set(spot.x+(i%3-1),.55+growth*.2,spot.z+(Math.floor(i/3)-1));dummy.scale.set(.45*growth,.32*growth,.45*growth);dummy.updateMatrix();leaves.setMatrixAt(n,dummy.matrix);dummy.position.y+=growth*.12;dummy.scale.set(.27*growth,.25*growth,.27*growth);dummy.updateMatrix();fruits.setMatrixAt(n,dummy.matrix);color.set(seed.color);fruits.setColorAt(n,color);n++;
  }}leaves.count=fruits.count=n;leaves.computeBoundingSphere();fruits.computeBoundingSphere();leaves.instanceMatrix.needsUpdate=fruits.instanceMatrix.needsUpdate=true;if(fruits.instanceColor)fruits.instanceColor.needsUpdate=true;return changed;
 },dispose(){livestockScene.dispose();batch?.dispose();root.removeFromParent();for(const {t,m}of labels){t.dispose();m.dispose();}for(const g of geos.values())g.dispose();for(const m of mats.values())m.dispose();}};
}
