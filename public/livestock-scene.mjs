import * as T from 'three';
import {LIVESTOCK_TYPES} from './land-data.mjs';
export function createLivestockScene(stage){
 const root=new T.Group();root.userData.dynamic=true;stage.add(root);const groups=new Map(),labels=new Map(),geometries={sphere:new T.SphereGeometry(1,8,6),box:new T.BoxGeometry(1,1,1),cone:new T.ConeGeometry(1,1,6),circle:new T.CircleGeometry(1,12)};
 const dummy=new T.Object3D();let lastTick=-1;
 function part(type,color,x,y,z,sx,sy,sz,heading=0,rx=0){const key=type+color;if(!groups.has(key)){const material=type==='circle'?new T.MeshBasicMaterial({color,transparent:true,opacity:.15,depthWrite:false}):new T.MeshStandardMaterial({color,roughness:.9});const mesh=new T.InstancedMesh(geometries[type],material,512);mesh.count=0;mesh.frustumCulled=false;mesh.receiveShadow=type!=='circle';root.add(mesh);groups.set(key,mesh);}const m=groups.get(key);dummy.position.set(x,y,z);dummy.scale.set(sx,sy,sz);dummy.rotation.set(rx,heading,0,'YXZ');dummy.updateMatrix();m.setMatrixAt(m.count++,dummy.matrix);}
 function statusLabel(animal,value,x,y,z){let o=labels.get(animal.id);if(!o){const canvas=document.createElement('canvas');canvas.width=256;canvas.height=64;const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;const material=new T.SpriteMaterial({map:texture,depthTest:true}),sprite=new T.Sprite(material);sprite.scale.set(2.6,.65,1);root.add(sprite);o={canvas,texture,material,sprite,value:''};labels.set(animal.id,o);}if(o.value!==value){o.value=value;const g=o.canvas.getContext('2d');g.clearRect(0,0,256,64);g.fillStyle='#284b3ce0';g.beginPath();g.roundRect(0,5,256,54,12);g.fill();g.font='bold 27px sans-serif';g.textAlign='center';g.fillStyle='#fff0cf';g.fillText(value,128,43);o.texture.needsUpdate=true;}o.sprite.position.set(x,y,z);}
 return {update(parcels=[],now){const tick=Math.floor(now/100);if(tick===lastTick)return;lastTick=tick;for(const g of groups.values())g.count=0;const seen=new Set(),time=now/1000;
  for(const p of parcels){if(!p.coop_level)continue;(p.animals||[]).forEach((a,i)=>{const spec=LIVESTOCK_TYPES[a.kind];if(!spec)return;seen.add(a.id);let seed=0;for(const c of a.id)seed=(seed+c.charCodeAt(0))%127;const phase=time*.55+seed,x=p.x-4.5+(i%2)*1.5+Math.sin(phase)*.42,z=p.z+5.8+Math.floor(i/2)*1.6+Math.cos(phase*.7)*.35,heading=Math.sin(phase*.3)*1.1+Math.PI*.6;
   const add=(type,c,ox,oy,oz,sx,sy,sz,rx=0)=>part(type,c,x+ox*Math.cos(heading)+oz*Math.sin(heading),oy+.2,z-ox*Math.sin(heading)+oz*Math.cos(heading),sx,sy,sz,heading,rx);
   add('circle',0x18271c,0,.025,0,a.kind==='cow'?1.1:.6,1,a.kind==='cow'?1.1:.6,-Math.PI/2);
   if(a.kind==='chicken'){
    add('sphere',0xf4e7c8,0,.65,0,.42,.38,.54);add('sphere',0xf7efd5,0,1.05,.34,.25,.29,.25);add('cone',0xe7ac45,0,1.04,.62,.12,.27,.12,Math.PI/2);for(const side of [-1,1]){add('sphere',0x24241c,side*.16,1.12,.52,.045,.045,.045);add('sphere',0xd3b986,side*.35,.67,-.03,.12,.26,.36);add('box',0xbb8c38,side*.16,.26,0,.055,.38,.06);add('box',0xc19a48,side*.16,.09,.09,.13,.05,.25);}for(let k=0;k<3;k++)add('sphere',0xca5440,0,1.34,.2+k*.13,.1,.13,.1);add('cone',0xd2bd92,0,.83,-.46,.22,.4,.2,-Math.PI/2);
   }else{
    add('sphere',0xece8d8,0,.97,0,.62,.49,.96);add('sphere',0xeee9d9,0,1.32,.86,.36,.4,.42);add('sphere',0xd4a99f,0,1.14,1.17,.34,.19,.22);for(const side of [-1,1]){for(const dz of [-.58,.58]){add('box',0xd7d1bf,side*.4,.43,dz,.14,.7,.14);add('box',0x554c3d,side*.4,.1,dz,.17,.14,.2);}add('sphere',0x323b34,side*.58,1.03,-.1,.1,.29,.36);add('sphere',0x212b25,side*.23,1.46,1.18,.047,.052,.04);add('sphere',0xc4a99b,side*.39,1.5,.83,.2,.08,.13);add('cone',0xd5c398,side*.25,1.75,.81,.075,.28,.07);}add('box',0x8f8c74,0,.75,-.97,.06,.55,.06);
   }
   const ready=a.ready_at>0&&a.ready_at<=now;statusLabel(a,ready?(a.kind==='chicken'?'🥚 Có trứng':'🥛 Có sữa'):a.ready_at?'🌾 Đang no':'🌾 Chờ ăn',x,a.kind==='cow'?2.45:1.85,z);
   if(ready&&a.kind==='chicken')for(const n of [-1,1])part('sphere',0xf9edcf,x+n*.18,.34,z+.6,.14,.19,.14);
   if(ready&&a.kind==='cow'){part('box',0xa9bbb2,x+.8,.43,z+.5,.42,.45,.42);part('sphere',0xf5f0d9,x+.8,.67,z+.5,.18,.03,.18);}
  });}
  for(const g of groups.values())g.instanceMatrix.needsUpdate=true;
  for(const [id,o]of labels)if(!seen.has(id)){o.sprite.removeFromParent();o.texture.dispose();o.material.dispose();labels.delete(id);}
 },dispose(){root.removeFromParent();for(const o of labels.values()){o.texture.dispose();o.material.dispose();}for(const g of groups.values()){g.dispose();g.material.dispose();}for(const g of Object.values(geometries))g.dispose();}};
}
