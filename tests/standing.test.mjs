import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {nearestWalkable} from '../public/movement.mjs';

const ui=readFileSync(new URL('../public/life-ui.mjs',import.meta.url),'utf8');
const gestureCode=ui.slice(0,ui.indexOf('function gestureMenu'));
function fixture(){
 const oldUser={id:'test',area:'village',seat:'square-ne',x:10,z:-7,facing:-Math.PI/2};
 const calls=[],errors=[];let renderedUser=oldUser,position={x:10,z:-7};
 const context={state:{user:oldUser,players:[]},area:{id:'village'},worldRevision:0,worldTransitionBusy:false,presenceRequest:null,requireUser:()=>true,toast:m=>errors.push(m),$:()=>({close(){}}),
  call:async path=>{calls.push(path);if(path==='presence')throw Error('Stale position rejected');return {ok:true,x:8.2,z:-7,facing:-Math.PI/2,user:{...oldUser,seat:'',x:8.2,action:''}};},
  game:{setState:s=>{renderedUser=s.user;},snap:p=>{position={x:p.x,z:p.z};},position:()=>position},
  refresh:async()=>{await Promise.resolve();if(renderedUser.seat)position={x:renderedUser.x,z:renderedUser.z};}
 };
 vm.createContext(context);vm.runInContext(gestureCode,context);
 return {context,calls,errors,position:()=>position};
}
test('standing commits pose before the next animation frame and bypasses stale presence',async()=>{
 const f=fixture();await f.context.gesture('stand');
 assert.deepEqual(f.calls,['gesture']);assert.equal(f.context.state.user.seat,'');assert.equal(f.position().x,8.2);assert.equal(f.position().z,-7);assert.deepEqual(f.errors,[]);assert.equal(f.context.worldTransitionBusy,false);
});
test('standing waits for an already in-flight position update before changing pose',async()=>{
 const f=fixture();let release;f.context.presenceRequest=new Promise(r=>release=r);
 const pending=f.context.gesture('stand');await Promise.resolve();assert.deepEqual(f.calls,[]);release();await pending;assert.equal(f.position().x,8.2);
});
test('a failed stand leaves the retry available',async()=>{
 const f=fixture();f.context.call=async()=>{throw Error('Offline');};await f.context.gesture('stand');assert.equal(f.context.worldTransitionBusy,false);assert.equal(f.context.state.user.seat,'square-ne');assert.deepEqual(f.errors,['Offline']);
});
test('old saved positions inside a bench recover to nearby open ground',()=>{
 const walkable=(x,z)=>!(Math.abs(x-10)<1&&Math.abs(z+7)<3);
 const p=nearestWalkable(10,-7,walkable);assert.ok(p);assert.ok(walkable(p.x,p.z));assert.ok(Math.hypot(p.x-10,p.z+7)<=1.25);
 assert.deepEqual(nearestWalkable(8.2,-7,walkable),{x:8.2,z:-7});assert.equal(nearestWalkable(10,-7,()=>false),null);
});
