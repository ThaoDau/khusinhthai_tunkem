import * as T from 'three';
export function createWerewolfScene(stage){
 const root=new T.Group();stage.add(root);const geometries=new Map(),materials=new Map();
 const geo=(type,args)=>{const k=type+args.join(',');if(!geometries.has(k))geometries.set(k,new T[type](...args));return geometries.get(k);};
 const mat=color=>{if(!materials.has(color))materials.set(color,new T.MeshStandardMaterial({color,roughness:.9}));return materials.get(color);};
 function mesh(g,m,x,y,z,parent=root){const o=new T.Mesh(g,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
 const ground=mesh(geo('CylinderGeometry',[24,24,.4,48]),mat(0x52694d),0,-.3,0);ground.castShadow=false;
 mesh(geo('CylinderGeometry',[11.5,11.5,.1,48]),mat(0x9e8e69),0,-.02,0);
 const circle=mesh(geo('TorusGeometry',[10.5,.09,6,72]),mat(0xb7a474),0,.06,0);circle.rotation.x=Math.PI/2;
 for(let i=0;i<24;i++){const a=i*Math.PI/12,r=25+(i%3)*3,x=Math.sin(a)*r,z=Math.cos(a)*r;mesh(geo('CylinderGeometry',[.25,.45,4,8]),mat(0x65553a),x,1.7,z);const canopy=mesh(geo('SphereGeometry',[2.6,10,8]),mat(i%2?0x365640:0x476342),x,4.5,z);canopy.scale.set(1,1.3,1);}
 for(let i=0;i<12;i++){const a=i*Math.PI/6,rock=mesh(geo('SphereGeometry',[.6,8,6]),mat(0x777966),Math.sin(a)*2,.1,Math.cos(a)*2);rock.scale.y=.5;}
 for(let i=0;i<4;i++){const log=mesh(geo('CylinderGeometry',[.22,.3,3,8]),mat(0x493c2c),0,.15,0);log.rotation.z=Math.PI/2;log.rotation.y=i*Math.PI/4;}
 const fireRoot=new T.Group();fireRoot.userData.dynamic=true;root.add(fireRoot);const fireMaterial=new T.MeshBasicMaterial({color:0xffa536});
 const fire=[];for(let i=0;i<5;i++){const f=mesh(geo('SphereGeometry',[.55,10,8]),fireMaterial,Math.sin(i*1.2)*.45,.8,Math.cos(i*1.2)*.45,fireRoot);f.scale.set(.7,1.8,.7);f.castShadow=false;fire.push(f);}
 const light=new T.PointLight(0xffa04d,12,25,2);light.position.set(0,2,0);root.add(light);
 const seats=new T.InstancedMesh(geo('CylinderGeometry',[.9,1,1,12]),mat(0x7e6848),12);seats.userData.dynamic=true;seats.count=0;seats.receiveShadow=true;root.add(seats);const dummy=new T.Object3D();
 const points=new Float32Array(160*3);for(let i=0;i<160;i++){const a=i*2.399;points[i*3]=Math.cos(a)*(20+i%31);points[i*3+1]=16+i%24;points[i*3+2]=Math.sin(a)*(20+i%29);}
 const starsGeometry=new T.BufferGeometry();starsGeometry.setAttribute('position',new T.BufferAttribute(points,3));const starsMaterial=new T.PointsMaterial({color:0xe5e6cb,size:.13,transparent:true,opacity:.8}),stars=new T.Points(starsGeometry,starsMaterial);stars.userData.dynamic=true;root.add(stars);
 const moonMaterial=new T.MeshBasicMaterial({color:0xf5e4b3}),moon=mesh(geo('SphereGeometry',[1.7,18,12]),moonMaterial,14,18,-26);moon.userData.dynamic=true;moon.castShadow=false;
 let night=true;
 return {setRoom(room){const players=room?.players.filter(p=>!p.left)||[];seats.count=players.length;players.forEach((p,i)=>{dummy.position.set(p.x,.45,p.z);dummy.scale.setScalar(1);dummy.rotation.set(0,0,0);dummy.updateMatrix();seats.setMatrixAt(i,dummy.matrix);});seats.instanceMatrix.needsUpdate=true;night=room?.phase==='night';stars.visible=moon.visible=night;light.intensity=night?12:4;},update(time){for(let i=0;i<fire.length;i++)fire[i].scale.y=1.6+Math.sin(time*5+i)*.3;starsMaterial.opacity=.6+Math.sin(time*.7)*.13;},dispose(){root.removeFromParent();for(const g of geometries.values())g.dispose();for(const m of materials.values())m.dispose();fireMaterial.dispose();moonMaterial.dispose();starsGeometry.dispose();starsMaterial.dispose();}};
}
