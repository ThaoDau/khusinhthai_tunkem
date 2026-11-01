import * as T from 'three';
const armGeometry=new T.CylinderGeometry(.105,.12,1,8),armMaterial=new T.MeshStandardMaterial({color:0xe7c294,roughness:.8});
const hatGeometry=new T.ConeGeometry(.98,.55,24),hatMaterial=new T.MeshStandardMaterial({color:0xc9ad72,roughness:1});
const cupGeometry=new T.CylinderGeometry(.18,.13,.28,12),cupMaterial=new T.MeshStandardMaterial({color:0xb8c5a1});
const bunGeometry=new T.SphereGeometry(.23,12,8),bunMaterial=new T.MeshStandardMaterial({color:0xf0dcad});
const up=new T.Vector3(0,1,0),direction=new T.Vector3(),shoulder=new T.Vector3();
export function poseCharacter(g,p,time,moving=false,forceBow=false){
 const d=g.userData;if(!d.life){const limbs=[new T.Mesh(armGeometry,armMaterial),new T.Mesh(armGeometry,armMaterial)];limbs.forEach(o=>{o.castShadow=true;d.body.add(o);});const hat=new T.Mesh(hatGeometry,hatMaterial);hat.position.set(0,2.72,0);d.body.add(hat);const cup=new T.Mesh(cupGeometry,cupMaterial),bun=new T.Mesh(bunGeometry,bunMaterial);d.body.add(cup,bun);d.life={limbs,hat,cup,bun};}
 const life=d.life,active=Date.now()-(p.action_at||0)<5000,action=active?p.action:'',sitting=Boolean(p.seat);
 d.body.rotation.set(0,0,0);d.body.position.y=0;d.body.scale.set(1,sitting?.74:1,1);
 g.position.y=sitting?.95:moving?Math.abs(Math.sin(time*12))*.07:0;
 if(d.shadow)d.shadow.position.y=.025-g.position.y;
 if(d.suspectRing)d.suspectRing.position.y=.11-g.position.y;
 d.armL.position.set(-.66,1,.35);d.armR.position.set(.66,1,.35);d.footL.position.set(-.36,sitting?-.4:.12,.48);d.footR.position.set(.36,sitting?-.4:.12,.48);
 if(moving){d.armL.position.z+=Math.sin(time*12)*.18;d.armR.position.z-=Math.sin(time*12)*.18;d.footL.position.y+=Math.max(0,Math.sin(time*12))*.2;d.footR.position.y+=Math.max(0,-Math.sin(time*12))*.2;}
 if(forceBow||active&&['bow','pray'].includes(action)){d.body.rotation.x=.9*Math.abs(Math.sin(time*2));d.body.position.y=-.2;d.armL.position.set(-.15,1.3,.7);d.armR.position.set(.15,1.3,.7);}
 if(action==='wave'){d.armR.position.set(.95+Math.sin(time*10)*.2,2.6,.2);d.body.rotation.z=Math.sin(time*3)*.04;}
 if(action==='cheer'){d.armL.position.set(-.85,2.6,.1);d.armR.position.set(.85,2.6,.1);if(!sitting)g.position.y=Math.max(0,Math.sin(time*8))*.5;}
 if(action==='dance'){d.body.rotation.z=Math.sin(time*5)*.22;d.armL.position.set(-.9,1.6+Math.sin(time*5)*.6,.3);d.armR.position.set(.9,1.6-Math.sin(time*5)*.6,.3);if(!sitting)g.position.y=Math.abs(Math.sin(time*5))*.25;}
 if(action==='greet'){d.armL.position.set(-.12,1.5,.75);d.armR.position.set(.12,1.5,.75);d.body.rotation.x=.14;}
 if(action==='water'){d.armR.position.set(.65,1.1,1.1);d.armL.position.set(-.2,1.2,.7);d.body.rotation.x=.2;}
 if(action==='harvest'||action==='steal'){d.body.rotation.x=.5+Math.sin(time*4)*.1;d.armL.position.set(-.4,.7,1.1);d.armR.position.set(.4,.7+Math.sin(time*5)*.2,1.1);}
 if(['drink','eat'].includes(action)){const y=1.65+Math.sin(time*2)*.15;d.armR.position.set(.22,y,.83);d.head.rotation.x=.08;}
 else d.head.rotation.x=0;
 life.hat.visible=Boolean(p.hat);life.cup.visible=action==='drink'||action==='water';life.cup.rotation.x=action==='water'?.8:0;life.bun.visible=action==='eat';life.cup.position.copy(d.armR.position);life.cup.position.y+=.06;life.cup.position.z+=.08;life.bun.position.copy(d.armR.position);life.bun.position.y+=.08;life.bun.position.z+=.08;
 for(let i=0;i<2;i++){const hand=i?d.armR:d.armL;shoulder.set(i?.55:-.55,1.4,0);direction.subVectors(hand.position,shoulder);const limb=life.limbs[i];limb.position.copy(shoulder).add(hand.position).multiplyScalar(.5);limb.scale.y=direction.length();limb.quaternion.setFromUnitVectors(up,direction.normalize());}
}
