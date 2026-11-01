import {test} from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';
import {batchStaticScene,AdaptiveQuality,remoteMotion} from '../public/rendering.mjs';
test('static batching preserves transformed bounds and leaves animated parts untouched',()=>{
 const root=new T.Group(),parent=new T.Group(),material=new T.MeshStandardMaterial();parent.position.set(2,0,3);parent.rotation.y=.4;root.add(parent);
 for(let i=0;i<8;i++){const o=new T.Mesh(new T.BoxGeometry(1,2,1),material);o.position.set(i,1,0);parent.add(o);}
 const actor=new T.Group();actor.userData.dynamic=true;const moving=new T.Mesh(new T.BoxGeometry(1,1,1),material);actor.add(moving);root.add(actor);
 const before=new T.Box3().setFromObject(root),batch=batchStaticScene(root,24),after=new T.Box3().setFromObject(root);
 assert.equal(batch.batchCount,1);assert.equal(batch.originalCount,8);assert.ok(before.min.distanceTo(after.min)<1e-5);assert.ok(before.max.distanceTo(after.max)<1e-5);assert.equal(moving.parent,actor);assert.equal(moving.matrixAutoUpdate,true);
 batch.dispose();assert.equal(parent.children.length,8);assert.equal(root.children.length,2);
});
test('adaptive quality responds to sustained slow frames without switching manual settings',()=>{
 const q=new AdaptiveQuality();for(let i=0;i<500;i++)q.sample(.05);assert.equal(q.ratio,.75);assert.equal(q.shadow,false);
 const manual=new AdaptiveQuality('pretty');for(let i=0;i<500;i++)manual.sample(.1);assert.equal(manual.ratio,1.5);assert.equal(manual.shadow,true);
 const stable=new AdaptiveQuality();for(let i=0;i<120;i++)stable.sample(1/60);assert.equal(stable.ratio,1);
});
test('remote motion rejects old snapshots and stops extrapolating teleport velocity',()=>{
 const p=remoteMotion(null,{x:0,z:0,position_at:1000},0),next=remoteMotion(p,{x:2,z:0,position_at:1500},500);
 assert.equal(next.vx,4);assert.equal(remoteMotion(next,{x:0,z:0,position_at:1000},600),next);
 assert.equal(remoteMotion(next,{x:99,z:0,position_at:2000},1000).vx,0);
});
