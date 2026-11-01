import {test} from 'node:test';
import assert from 'node:assert/strict';
import {cameraPreset,roomOrbitDistance} from '../public/camera.mjs';

test('indoor camera stays inside walls at every orbit angle and zoom level',()=>{
 for(const area of ['jail','temple','church'])for(const x of [-16.8,0,16.8])for(const z of [-24,0,22])for(const pitch of [.22,.55,1.05])for(let yaw=-Math.PI;yaw<Math.PI;yaw+=Math.PI/24){
  const d=roomOrbitDistance(area,{x,z},yaw,pitch,65),cx=x+Math.sin(yaw)*Math.cos(pitch)*d,cz=z+Math.cos(yaw)*Math.cos(pitch)*d;
  assert.ok(cx>=-17.25001&&cx<=17.25001,`${area}: camera outside side wall`);
  assert.ok(cz>=-24.25001&&cz<=24.25001,`${area}: camera outside end wall`);
  assert.ok(d>0&&d<=65);
 }
});

test('jail entry resets the village zoom and frames the cell from above',()=>{
 const outside=cameraPreset('village'),jail=cameraPreset('jail');
 assert.ok(jail.distance<outside.distance/2);assert.ok(jail.pitch>.55);
 assert.equal(roomOrbitDistance('jail',{x:0,z:-1},.1,jail.pitch,jail.distance),jail.distance);
 assert.equal(roomOrbitDistance('village',{x:90,z:90},.3,.8,65),65);
 assert.equal(roomOrbitDistance('werewolf',{x:8,z:8},.3,.55,65),65);
});
