import * as T from 'three';
import {BENCHES,SHOPS} from './world-data.mjs';

// Outdoor-only art. Shared geometry and instanced planting keep the denser village light.
export function buildLandscape({stage,scene,locations,block}) {
 const root=new T.Group();root.name='Thao Dau gardens';stage.add(root);
 const geometries=new Map(),materials=new Map(),textures=[],animated=[],planting=new Map();
 let seed=20261101;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 const geo=(type,args)=>{const k=type+args.join();if(!geometries.has(k))geometries.set(k,new T[type](...args));return geometries.get(k);};
 const mat=(color,options={})=>{const k=color+JSON.stringify(options);if(!materials.has(k))materials.set(k,new T.MeshStandardMaterial({color,roughness:.85,...options}));return materials.get(k);};
 function mesh(g,m,x,y,z,parent=root){const o=new T.Mesh(g,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
 const box=(x,y,z,w,h,d,c,parent=root)=>mesh(geo('BoxGeometry',[w,h,d]),mat(c),x,y,z,parent);
 const ball=(x,y,z,r,c,parent=root)=>mesh(geo('SphereGeometry',[r,12,8]),mat(c),x,y,z,parent);
 const cyl=(x,y,z,top,bottom,h,c,parent=root)=>mesh(geo('CylinderGeometry',[top,bottom,h,20]),mat(c),x,y,z,parent);
 function instance(type,color,x,y,z,sx,sy,sz,rotation=0){const k=type+color;if(!planting.has(k))planting.set(k,{type,color,items:[]});planting.get(k).items.push({x,y,z,sx,sy,sz,rotation});}
 function texture(draw,repeat){const c=document.createElement('canvas');c.width=c.height=512;draw(c.getContext('2d'));const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(...repeat);textures.push(t);return t;}
 const grass=texture(g=>{g.fillStyle='#83966a';g.fillRect(0,0,512,512);for(let i=0;i<11000;i++){const x=random()*512,y=random()*512;g.fillStyle=['#b2bf7b55','#5b805b44','#75976b55','#b3b57d22'][i%4];g.fillRect(x,y,1+random()*4,1+random()*6);}},[32,32]);
 const stone=texture(g=>{g.fillStyle='#9b927c';g.fillRect(0,0,512,512);for(let row=0;row<8;row++)for(let col=-1;col<8;col++){const x=col*72+(row%2)*36,y=row*64;g.fillStyle=['#d4c9ad','#c5bca3','#ddd2b5','#cdbfa2'][(row+col+8)%4];g.beginPath();g.roundRect(x+2,y+2,68,60,5);g.fill();g.strokeStyle='#f7ebcb55';g.stroke();}},[18,18]);
 const tile=texture(g=>{g.fillStyle='#9d5135';g.fillRect(0,0,512,512);for(let r=0;r<12;r++)for(let c=0;c<12;c++){g.fillStyle=(r+c)%3?'#b86b43':'#c48151';g.fillRect(c*44+2,r*44+2,40,40);g.strokeStyle='#743b27';g.strokeRect(c*44+1,r*44+1,42,42);}},[3,3]);
 const groundMat=new T.MeshStandardMaterial({map:grass,roughness:1});materials.set('grass',groundMat);
 const paveMat=new T.MeshStandardMaterial({map:stone,color:0xf6edce,roughness:.95});materials.set('paving',paveMat);
 const roofMat=new T.MeshStandardMaterial({map:tile,roughness:.82,color:0xe5bb87,side:T.DoubleSide});materials.set('roof',roofMat);
 mesh(geo('BoxGeometry',[205,.02,205]),groundMat,0,-.085,0);
 function pave(x,z,w,d){const p=mesh(geo('BoxGeometry',[w,.07,d]),paveMat,x,.075,z);p.castShadow=false;for(const offset of [-1,1]){box(x+offset*(w/2+.15),.13,z,.22,.2,d,0xb2a48b);}}
 pave(0,10,13,140);for(const [x,z,w,d]of [[13.5,-19,64,8.5],[-17,-7,36,4],[0,24,92,8.5],[0,64,92,8.5]]){const p=mesh(geo('BoxGeometry',[w,.06,d]),paveMat,x,.12,z);p.castShadow=false;for(const side of [-1,1])box(x,.15,z+side*(d/2+.15),w,.2,.22,0xb3a68b);}
 // A circular village square replaces the empty intersection.
 cyl(0,.16,1,16,16,.13,0xb5a48a);cyl(0,.25,1,15.5,15.5,.05,0xd7c5a3);
 const square=mesh(geo('RingGeometry',[4.8,15.1,64]),paveMat,0,.29,1);square.rotation.x=-Math.PI/2;square.castShadow=false;
 for(const r of [5,14.8]){const ring=mesh(geo('TorusGeometry',[r,.11,6,72]),mat(0x998a65),0,.33,1);ring.rotation.x=-Math.PI/2;}
 for(let i=0;i<12;i++){const a=i*Math.PI/6,o=box(Math.sin(a)*12,.34,1+Math.cos(a)*12,.16,.025,3.3,0xac986a);o.rotation.y=a;}
 // Tiered lotus fountain, flowing strands and moving droplets.
 cyl(0,.74,1,3.65,4,.35,0xab9876);const rim=mesh(geo('TorusGeometry',[3.5,.24,8,48]),mat(0xddc8a2),0,.97,1);rim.rotation.x=Math.PI/2;
 cyl(0,.94,1,3.35,3.35,.04,0x5caaa3);cyl(0,1.6,1,.35,.65,1.3,0xbda87e);cyl(0,2.25,1,1.8,1.2,.3,0xd8c9a6);cyl(0,2.45,1,1.65,1.65,.04,0x70bab0);cyl(0,3,1,.18,.3,1,0xb6a17d);ball(0,3.6,1,.5,0xe8d3a1);
 for(let i=0;i<10;i++){const a=i*Math.PI/5,x=Math.sin(a)*1.65,z=1+Math.cos(a)*1.65;const stream=cyl(x,1.7,z,.027,.045,1.35,0x9ed5ca);stream.material=mat(0xaadfd1,{transparent:true,opacity:.65});const drop=ball(x,1,z,.06,0xc4e8db);drop.userData.dynamic=true;drop.castShadow=false;animated.push({object:drop,base:1,index:i});}
 const fountainLight=new T.PointLight(0xffd497,8,12,2);fountainLight.position.set(0,3,1);root.add(fountainLight);
 function flowers(x,z,r=1.7){cyl(x,.22,z,r,r,.3,0x9c8d6e);cyl(x,.4,z,r-.12,r-.12,.1,0x725b3d);for(let i=0;i<14;i++){const a=random()*6.28,rr=Math.sqrt(random())*(r-.2),fx=x+Math.cos(a)*rr,fz=z+Math.sin(a)*rr;instance('leaf',0x648554,fx,.55,fz,.35,.45,.3);instance('flower',[0xefbd9a,0xf0d289,0xe9a7a1,0xf4e2b2][i%4],fx,.83+random()*.18,fz,.16,.13,.16);}}
 function hedge(x,z,w,d){box(x,.25,z,w+.3,.35,d+.3,0xa6946d);for(let i=0;i<Math.ceil(w/1.2);i++)for(let j=0;j<Math.ceil(d/1.2);j++)instance('leaf',0x567b51,x-w/2+.6+i*1.2,.85,z-d/2+.6+j*1.2,.85,.7,.8);}
 function bench(x,z,angle=0){const g=new T.Group();g.position.set(x,0,z);g.rotation.y=angle;root.add(g);for(const ox of [-1.6,1.6]){box(ox,.6,0,.2,1.1,1,0x505b4b,g);box(ox,1.25,-.4,.14,1.8,.15,0x505b4b,g);}for(let i=0;i<4;i++)box(0,1,i*.26-.4,4.1,.15,.2,0xab7748,g);for(let i=0;i<3;i++)box(0,1.5+i*.26,-.5,4.1,.2,.13,0xa9774a,g);block(x,z,Math.abs(Math.cos(angle))*4+.9,Math.abs(Math.sin(angle))*4+.9);}
 for(const x of [-10,10])for(const z of [-7,9])bench(x,z,x<0?Math.PI/2:-Math.PI/2);
 for(const [x,z,r]of [[-11,-13,2],[11,-13,2],[-12,15,2],[12,15,2],[-20,-18,1.8],[21,-18,1.8],[-21,24,1.6],[21,24,1.6],[-19,63,2],[19,63,2]])flowers(x,z,r);
 // Bamboo pergola with climbing flowers, tucked between pond and village kitchen.
 const pavilion=new T.Group();pavilion.position.set(-19,0,-1);root.add(pavilion);box(0,.2,0,9,.4,8,0xb9a47c,pavilion);
 for(const x of [-3.7,3.7])for(const z of [-3,3]){cyl(x,2.7,z,.16,.21,5.3,0x876d42,pavilion);block(-19+x,-1+z,.4,.4);}
 for(const z of [-3,3])box(0,5.2,z,8.7,.3,.25,0x9f8050,pavilion);
 for(let i=0;i<9;i++){box(-4+i,5.5,0,.17,.25,8.6,0xa98a52,pavilion);for(let j=0;j<3;j++)instance('leaf',0x668b55,-23+i,5.65,-4+j*3,.8,.25,.8);}
 bench(-19,-2);flowers(-24,3,1.3);flowers(-14,3,1.3);
 // Courtyard edging and detailed porches make each destination feel inhabited.
 for(const l of locations){const {x,z}=l;if(['pond','garden'].includes(l.id))continue;
  const w=l.id==='temple'?22:l.id==='jail'?10:17,d=l.id==='temple'?17:l.id==='jail'?10:14,front=z+d/2;
  mesh(geo('BoxGeometry',[w+3,.1,5]),paveMat,x,.14,front+3);
  for(let i=0;i<3;i++)box(x,.2+i*.16,front+3-i*.5,5+i*.15,.25,.6,0xc9ba98);
  for(const side of [-1,1]){const ox=x+side*(w/2-1.5);flowers(ox,front+3.2,1);hedge(x+side*(w/2+2.8),z,2,d-1);box(x+side*(w/2+.08),3.8,z, .14,2.2,3.1,0x546d5d);box(x+side*(w/2+.17),3.8,z,.16,.12,3.3,0xdbbd87);box(x+side*(w/2+.17),3.8,z,.17,2.3,.12,0xdbbd87);}
  for(const side of [-1,1]){box(x+side*(w/2+1),7.65,z,.25,.3,d+3,0x6f4930);box(x,7.65,z+side*(d/2+1),w+3,.3,.25,0x6f4930);}
  box(x,11.7,z,w*.5,.2,.23,0xbfa05f);
  if(l.id==='kitchen'){for(let i=0;i<3;i++){cyl(x+11,.7,z-2+i*1.8,.6,.65,1.3,0xb48c5a);box(x-11,.8,z+3,2.1,1.6,2.1,0xa9824a);}textSign('BẾP NHÀ · RAU SẠCH',x,4.5,front+2.3,1.3);}
  if(l.id==='church'){for(const sx of [-5,5]){const window=mesh(geo('CircleGeometry',[.85,16]),mat(sx<0?0xc1a66e:0xa0b4a1),x+sx,4.5,front+.1);window.castShadow=false;box(x+sx,4.5,front+.15,.08,1.8,.08,0xf0dcc1);box(x+sx,4.5,front+.15,1.8,.08,.08,0xf0dcc1);}}
 }
 // Replace the old flat-colored roof surfaces with locally generated terracotta tiles.
 const originalRoofs=[];stage.traverse(o=>{if(o.isMesh&&!root.getObjectById(o.id)&&o.geometry?.attributes.position?.count===12)originalRoofs.push(o);});
 for(const o of originalRoofs){const uv=[];const p=o.geometry.attributes.position;for(let i=0;i<p.count;i++)uv.push(p.getX(i)/20+.5,p.getZ(i)/20+.5);o.geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));const old=o.material;o.material=roofMat;o.userData.landscapeOldMaterial=old;}
 function textSign(value,x,y,z,size=1){const c=document.createElement('canvas');c.width=768;c.height=128;const g=c.getContext('2d');g.fillStyle='#493b26';g.fillRect(0,0,768,128);g.strokeStyle='#d3b879';g.lineWidth=7;g.strokeRect(8,8,752,112);g.fillStyle='#f4dfa6';g.font='bold 38px sans-serif';g.textAlign='center';g.fillText(value,384,78);const t=new T.CanvasTexture(c);textures.push(t);t.colorSpace=T.SRGBColorSpace;const m=new T.MeshBasicMaterial({map:t,side:T.DoubleSide});materials.set(value,m);mesh(geo('PlaneGeometry',[size*6,size]),m,x,y,z);}
 // Fish pond: rock bank, lotus pads, reeds and a small wooden viewing deck.
 const pond=locations.find(l=>l.id==='pond');
 for(let i=0;i<30;i++){const a=i*Math.PI/15,x=pond.x+Math.cos(a)*11.6,z=pond.z+Math.sin(a)*11.6;const rock=ball(x,.3,z,.6+i%3*.12,[0xa9aa91,0xb9b49a,0x8c9680][i%3]);rock.scale.set(1.4,.6,1);}
 for(let i=0;i<7;i++){const a=i*.7,x=pond.x+Math.cos(a)*8.3,z=pond.z+Math.sin(a)*8.3;cyl(x,.19,z,.65,.65,.03,0x71926a);for(let j=0;j<5;j++)instance('flower',0xe7b0aa,x+Math.cos(j*1.256)*.16,.34,z+Math.sin(j*1.256)*.16,.2,.13,.2);}
 for(let i=0;i<20;i++){const a=i*.2+2.8,x=pond.x+Math.cos(a)*12.5,z=pond.z+Math.sin(a)*12.5;instance('leaf',0x7f9855,x,.7,z,.14,1.2,.14);}
 for(let i=0;i<9;i++)box(pond.x+10+i*.55,.45,pond.z+7, .48,.15,4.5,0xa8804e);
 bench(pond.x+14,pond.z+7,Math.PI/2);
 // Vegetable garden, low rustic fence, baskets and a working well nearby.
 const garden=locations.find(l=>l.id==='garden');
 function fence(x,z,len,angle=0){const g=new T.Group();g.position.set(x,0,z);g.rotation.y=angle;root.add(g);for(let i=0;i<=len/2;i++)box(-len/2+i*2,.75,0,.14,1.5,.14,0xc3a878,g);for(const y of [.6,1.2])box(0,y,0,len,.12,.12,0xbda071,g);}
 fence(garden.x-9,garden.z,19,Math.PI/2);fence(garden.x+9,garden.z,19,Math.PI/2);fence(garden.x,garden.z-9,18);fence(garden.x-6,garden.z+9,6);fence(garden.x+6,garden.z+9,6);
 for(const x of [garden.x-10,garden.x+10]){cyl(x,.5,garden.z+11,.7,.6,1,0xbc9760);instance('leaf',0x83a960,x,1.1,garden.z+11,.6,.35,.6);}
 const wellX=19,wellZ=33;cyl(wellX,.65,wellZ,1.5,1.5,1.3,0xbab294);cyl(wellX,1.33,wellZ,1.2,1.2,.04,0x466b66);for(const ox of [-1.6,1.6])box(wellX+ox,2,wellZ,.18,4,.18,0x906a3e);box(wellX,4,wellZ,3.7,.2,.3,0x906a3e);cyl(wellX,2.7,wellZ,.025,.025,2.2,0xd6bd82);block(wellX,wellZ,3,3);
 // Two village stalls add a social edge to the central square.
 function stall(x,z,color){for(const ox of [-2.4,2.4])for(const oz of [-1.6,1.6])box(x+ox,2,z+oz,.15,4,.15,0x8e6b44);box(x,1.15,z,5.5,2.1,2.8,0xb48350);box(x,2.26,z,5.8,.18,3.1,0xdbc19a);for(let i=0;i<6;i++){const awning=box(x-2.5+i,4,z,1,.12,4.6,i%2?0xf0dfb5:color);awning.rotation.x=-.12;box(x-2.5+i,3.65,z+2.2,1,.5,.1,i%2?0xf0dfb5:color);}for(let i=0;i<6;i++)instance('flower',i%2?0xd3aa5b:0x8dad5d,x-2+i*.8,2.55,z,.35,.3,.35);block(x,z,5.8,3.5);}
 stall(-17,33,0xb96f50);stall(15,-9,0x799179);
 for(const [x,z,color]of [[-17,30.6,0xb47746],[15,-11.4,0x658779]]){cyl(x,1.35,z,.5,.65,1.6,color);ball(x,2.5,z,.48,0xe8c79d);const hat=cyl(x,2.95,z,.7,.7,.08,0xccad70);cyl(x,3.05,z,.32,.4,.2,0xc8a66a);for(const side of [-1,1])ball(x+side*.48,2.1,z+.5,.15,0xe5bf8e);}
 textSign('GÓC TRÀ THẢO ĐẬU',-17,3.15,35.35,.7);textSign('QUẦY QUÀ NHỎ',15,3.15,-6.65,.7);
 // Lantern-lined lanes and garlands overhead, rather than empty stretches of grass.
 function post(x,z){box(x,2.7,z,.18,5.4,.18,0x66533b);box(x+.5,5.3,z,1.2,.15,.15,0x66533b);const lamp=mesh(geo('SphereGeometry',[.38,12,10]),mat(0xf2b971,{emissive:0xffa04b,emissiveIntensity:.7}),x+1,4.75,z);lamp.scale.y=1.3;cyl(x+1,5.1,z,.16,.16,.1,0x8b6337);}
 for(const z of [-22,-7,12,31,66])for(const x of [-8.2,8.2])post(x,z);
 for(const z of [-11,19,68]){for(const x of [-8,8])box(x,3.5,z,.16,7,.16,0x8c764e);const points=[];for(let i=0;i<=20;i++){const x=-8+i*.8;points.push(new T.Vector3(x,6.6-Math.sin(i/20*Math.PI)*1.2,z));}const curve=new T.CatmullRomCurve3(points);mesh(new T.TubeGeometry(curve,24,.025,4,false),mat(0x665b40),0,0,0);for(let i=0;i<7;i++){const x=-6+i*2,y=6.6-Math.sin((x+8)/16*Math.PI)*1.2;const lamp=mesh(geo('SphereGeometry',[.26,10,8]),mat(i%2?0xf5d9a0:0xdba36c,{emissive:0xeab05d,emissiveIntensity:.35}),x,y-.4,z);lamp.scale.y=1.35;}}
 // Gateway and continuous planting form a clear, lush village boundary.
 for(const x of [-7,7]){box(x,3.8,78,.7,7.6,.7,0x8f7851);flowers(x,78,1.5);}
 box(0,7.4,78,16,.6,1.5,0x785b3c);box(0,7.9,78,17,.4,2.4,0x9a784c);textSign('KHU SINH THÁI THẢO ĐẬU',0,6.4,78.8,1.5);
 fence(-34,77,48);fence(34,77,48);fence(-59,14,126,Math.PI/2);fence(60,14,126,Math.PI/2);
 for(let i=0;i<130;i++){const a=i*2.399,rr=65+(i%6)*5,x=Math.cos(a)*rr,z=10+Math.sin(a)*rr;instance('leaf',[0x557b59,0x6d8e5c,0x7b995e][i%3],x,2+(i%3),z,2.8,3.6,2.8);instance('trunk',0x826849,x,.9,z,.24,2,.24);}
 const safe=(x,z)=>Math.abs(x)>8&&locations.every(l=>Math.abs(x-l.x)>14||Math.abs(z-l.z)>15)&&Math.abs(z+19)>6&&Math.abs(z-24)>6&&Math.abs(z-46)>6&&Math.abs(z-64)>6&&Math.hypot(x,z-1)>17;
 for(let i=0;i<650;i++){const x=(random()-.5)*116,z=(random()-.5)*120+10;if(!safe(x,z))continue;instance('grass',i%2?0x78935d:0xa1ac6c,x,.15,z,.1+random()*.15,.2+random()*.3,.1,random()*Math.PI);if(i%5===0)instance('flower',i%2?0xeac08e:0xe4b0a6,x,.45,z,.1,.12,.1);}
 for(const [x,z,w,d]of [[-16,48,4,15],[17,49,3,13],[-51,-2,3,11],[52,-9,3,12],[-16,-39,3,13],[19,-40,3,13],[-16,19,3,8]])hedge(x,z,w,d);
 for(let i=0;i<10;i++){const a=i*Math.PI/5;const hill=ball(Math.cos(a)*137,-4,Math.sin(a)*137,20,0x8fa280);hill.scale.set(2,1.1,1.6);hill.castShadow=false;}
 for(const data of planting.values()){const g=data.type==='trunk'?geo('CylinderGeometry',[.7,1,1,7]):data.type==='grass'?geo('ConeGeometry',[1,1,3]):geo('SphereGeometry',[1,data.type==='flower'?6:8,6]);const o=new T.InstancedMesh(g,mat(data.color),data.items.length),dummy=new T.Object3D();data.items.forEach((p,i)=>{dummy.position.set(p.x,p.y,p.z);dummy.scale.set(p.sx,p.sy,p.sz);dummy.rotation.y=p.rotation;dummy.updateMatrix();o.setMatrixAt(i,dummy.matrix);});o.castShadow=data.type==='leaf';o.receiveShadow=true;o.instanceMatrix.needsUpdate=true;root.add(o);}
 stone.repeat.set(1,1);root.traverse(o=>{if(o.isMesh&&o.material===paveMat){const p=o.geometry.attributes.position,uv=[];for(let i=0;i<p.count;i++)uv.push(p.getX(i)/6,(o.geometry.type==='RingGeometry'?p.getY(i):p.getZ(i))/6);o.geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));}});
 scene.background.set(0xc9d6c6);scene.fog.color.set(0xc9d6c6);scene.fog.near=85;scene.fog.far=200;
 return {interactions:[...BENCHES.map(b=>({...b,kind:'sit',name:'Ngồi nghỉ trên ghế'})),...SHOPS.map(s=>({...s,kind:'shop',name:s.name}))],update(time){for(const p of animated)p.object.position.y=.95+(Math.sin(time*3+p.index)*.5+.5)*1.25;},dispose(){for(const o of originalRoofs)o.material=o.userData.landscapeOldMaterial;for(const t of textures)t.dispose();for(const g of geometries.values())g.dispose();for(const m of materials.values())m.dispose();root.traverse(o=>{if(o.geometry?.type==='TubeGeometry')o.geometry.dispose();});root.removeFromParent();}};
}
