import {test} from 'node:test';import assert from 'node:assert/strict';import {DatabaseSync} from 'node:sqlite';import {readFileSync} from 'node:fs';import {api} from '../server/api.mjs';
import {createWolfRoom,startWolfGame,submitWolfAction,advanceWolfGame,projectWolfRoom,wolfChannel,leaveWolfRoom} from '../server/werewolf-engine.mjs';
function model(n=4){const s=createWolfRoom({id:'p0',name:'P0',color:'#ccc'},1000);for(let i=1;i<n;i++)s.players.push({id:'p'+i,name:'P'+i,color:'#ccc',alive:true,left:false});startWolfGame(s,'p0',1000,()=>0);return s;}
test('four roles stay secret, seer resolves only at dawn and guard cannot repeat a target',()=>{
 const s=model(),id=r=>Object.keys(s.roles).find(id=>s.roles[id]===r),wolf=id('wolf'),seer=id('seer'),guard=id('guard');
 assert.deepEqual(new Set(Object.values(s.roles)),new Set(['wolf','seer','guard','villager']));
 submitWolfAction(s,seer,'see',wolf,1001);submitWolfAction(s,guard,'protect',seer,1001);submitWolfAction(s,wolf,'bite',seer,1001);
 assert.equal(projectWolfRoom({id:'r',title:'R'},s,seer,1002).own.visions.length,0);
 const view=projectWolfRoom({id:'r',title:'R'},s,guard,1002);assert.ok(view.players.every(p=>p.publicRole===null));assert.equal(view.roles,undefined);assert.equal(view.night,undefined);assert.deepEqual(view.own.pack,[]);
 advanceWolfGame(s,31001);assert.equal(s.phase,'discussion');assert.ok(s.players.every(p=>p.alive));assert.equal(s.visions[seer][0].wolf,true);
 advanceWolfGame(s,s.deadline+1);advanceWolfGame(s,s.deadline+1);assert.equal(s.phase,'night');assert.throws(()=>submitWolfAction(s,guard,'protect',seer,s.deadline-1),/liên tiếp/);
 assert.throws(()=>submitWolfAction(s,seer,'bite',wolf,s.deadline-1),/năng lực/);
 assert.throws(()=>wolfChannel(s,seer,'pack'),/Sói/);assert.throws(()=>wolfChannel(s,seer,'table',true),/Ban đêm/);
});
test('split wolf targets kill nobody and daytime ties do not execute',()=>{
 const s=model(6),wolves=Object.keys(s.roles).filter(id=>s.roles[id]==='wolf'),town=Object.keys(s.roles).filter(id=>s.roles[id]!=='wolf');
 submitWolfAction(s,wolves[0],'bite',town[0],1002);submitWolfAction(s,wolves[1],'bite',town[1],1002);advanceWolfGame(s,s.deadline+1);assert.ok(s.players.every(p=>p.alive));advanceWolfGame(s,s.deadline+1);
 submitWolfAction(s,town[0],'vote',wolves[0],s.deadline-1);submitWolfAction(s,town[1],'vote',wolves[1],s.deadline-1);advanceWolfGame(s,s.deadline+1);assert.ok(s.players.every(p=>p.alive));
});
function fixture(){const sql=new DatabaseSync(':memory:');for(const name of ['0000_village','0001_auth_rate','0002_positions','0003_social_life','0004_village_mystery','0005_werewolf'])sql.exec(readFileSync(new URL('../drizzle/'+name+'.sql',import.meta.url),'utf8'));
 const wrap=(q,a=[])=>({bind:(...v)=>wrap(q,v),first:()=>sql.prepare(q).get(...a)||null,all:()=>({results:sql.prepare(q).all(...a)}),run:()=>sql.prepare(q).run(...a)}),DB={prepare:wrap,batch:s=>{sql.exec('BEGIN');try{const r=s.map(x=>x.run());sql.exec('COMMIT');return r;}catch(e){sql.exec('ROLLBACK');throw e;}}};
 const call=async(path,body,user)=>{const r=await api(new Request('https://village.test/api/'+path,{method:body?'POST':'GET',headers:{cookie:user?.cookie||'','content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{})}),{DB});return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};};
 const register=async n=>{const r=await call('auth',{mode:'register',username:n,name:n,password:'Synthetic-wolf-password'});assert.equal(r.status,200);return {id:r.data.user.id,cookie:r.cookie};};
 const wf=(user,action,more={})=>call('werewolf',{action,...more},user);
 const raw=id=>JSON.parse(sql.prepare('SELECT state FROM wf_rooms WHERE id=?').get(id).state);
 const edit=(id,fn)=>{const s=raw(id);fn(s);sql.prepare('UPDATE wf_rooms SET state=? WHERE id=?').run(JSON.stringify(s),id);};
 return {sql,call,wf,register,raw,edit};}
test('full room lifecycle, phase deadlines, private channels, victory and replay',async()=>{
 const f=fixture(),users=[];for(let i=0;i<5;i++)users.push(await f.register('wolf_test_'+i));const host=users[0],created=await f.wf(host,'create',{title:'Test table'}),room=created.data.room.id;
 assert.equal(created.status,200);await f.wf(users[1],'join',{room});assert.equal((await f.wf(host,'start',{room})).status,400);
 for(const u of users.slice(2,4))assert.equal((await f.wf(u,'join',{room})).status,200);
 assert.equal((await f.wf(host,'start',{room})).status,200);const secret=f.raw(room),byRole=role=>users.find(u=>secret.roles[u.id]===role),wolf=byRole('wolf'),seer=byRole('seer'),guard=byRole('guard');
 assert.equal((await f.wf(users[4],'state',{room})).status,400);
 const list=(await f.wf(users[4],'list')).data;assert.equal(list.rooms[0].roles,undefined);assert.equal(list.rooms[0].state,undefined);
 assert.equal((await f.wf(seer,'chat',{room,channel:'pack'})).status,400);
 assert.equal((await f.wf(wolf,'chat',{room,channel:'pack',text:'Secret plan'})).status,200);
 assert.equal((await f.wf(guard,'chat',{room,channel:'table',text:'I should be asleep'})).status,400);
 assert.equal((await f.call('messages',{channel:'global',body:'Bypass night chat'},wolf)).status,403);
 assert.equal((await f.call('move',{area:'village'},wolf)).status,403);
 await f.wf(wolf,'act',{room,kind:'bite',target:seer.id});await f.wf(seer,'act',{room,kind:'see',target:wolf.id});await f.wf(guard,'act',{room,kind:'protect',target:seer.id});
 const before=(await f.wf(seer,'state',{room})).data.room;assert.equal(before.own.visions.length,0);assert.ok(before.players.every(p=>p.publicRole===null));
 f.edit(room,s=>s.deadline=Date.now()-1);const day=(await f.wf(seer,'state',{room})).data.room;assert.equal(day.phase,'discussion');assert.equal(day.own.visions[0].wolf,true);assert.equal((await f.wf(guard,'state',{room})).data.room.own.visions.length,0);
 assert.equal((await f.wf(guard,'chat',{room,channel:'table',text:'Discussion open'})).status,200);
 f.edit(room,s=>s.deadline=Date.now()-1);assert.equal((await f.wf(host,'state',{room})).data.room.phase,'vote');
 for(const u of users.slice(0,4).filter(u=>u.id!==wolf.id))await f.wf(u,'act',{room,kind:'vote',target:wolf.id});
 f.edit(room,s=>s.deadline=Date.now()-1);const end=(await f.wf(host,'state',{room})).data.room;assert.equal(end.phase,'finished');assert.equal(end.winner,'village');assert.ok(end.players.every(p=>p.publicRole));
 assert.equal((await f.call('state',null,host)).data.user.wf_locked,0);
 assert.equal((await f.wf(host,'replay',{room})).data.room.phase,'lobby');assert.deepEqual(f.raw(room).roles,{});
 assert.equal((await f.wf(host,'leave',{room})).data.left,true);assert.equal((await f.call('state',null,host)).data.user.wf_room,null);
});
test('concurrent joins cannot put one account in two rooms',async()=>{const f=fixture(),a=await f.register('host_a'),b=await f.register('host_b'),c=await f.register('joiner');const ra=(await f.wf(a,'create')).data.room.id,rb=(await f.wf(b,'create')).data.room.id;
 const results=await Promise.all([f.wf(c,'join',{room:ra}),f.wf(c,'join',{room:rb})]);assert.equal(results.filter(r=>r.status===200).length,1);assert.equal([ra,rb].filter(id=>f.raw(id).players.some(p=>p.id===c.id&&!p.left)).length,1);
});

test('disconnected lobby seats release their account and transfer host',async()=>{
 const f=fixture(),host=await f.register('offline_host'),guest=await f.register('online_guest'),room=(await f.wf(host,'create')).data.room.id;
 await f.wf(guest,'join',{room});f.sql.prepare('UPDATE users SET seen=? WHERE id=?').run(Date.now()-100000,host.id);
 const state=(await f.wf(guest,'state',{room})).data.room;assert.equal(state.host,guest.id);assert.equal(state.players.find(p=>p.id===host.id).left,true);
 const returned=(await f.call('state',null,host)).data.user;assert.equal(returned.wf_room,null);assert.equal(returned.wf_locked,0);assert.equal(returned.area,'village');
 assert.equal((await f.wf(host,'create',{title:'Another table'})).status,200);
});

test('reconnecting preserves private role and eliminated players only write to ghost chat',async()=>{
 const f=fixture(),users=[];for(let i=0;i<6;i++)users.push(await f.register('reconnect_'+i));const room=(await f.wf(users[0],'create')).data.room.id;
 for(const u of users.slice(1))await f.wf(u,'join',{room});await f.wf(users[0],'start',{room});
 const first=(await f.wf(users[0],'state',{room})).data.room;const again=(await f.wf(users[0],'state',{room})).data.room;assert.equal(again.own.role,first.own.role);assert.equal(again.game,first.game);
 const roles=f.raw(room).roles,town=users.filter(u=>roles[u.id]!=='wolf'),victim=town[0],observer=town[1];
 f.edit(room,s=>{s.players.find(p=>p.id===victim.id).alive=false;});
 assert.equal((await f.wf(victim,'chat',{room,channel:'table',text:'Ghost bypass'})).status,400);
 assert.equal((await f.wf(victim,'chat',{room,channel:'ghost',text:'Ghost message'})).status,200);
 assert.equal((await f.wf(observer,'chat',{room,channel:'ghost'})).status,400);
 assert.equal((await f.wf(victim,'act',{room,kind:'vote',target:observer.id})).status,400);
 const own=(await f.wf(victim,'state',{room})).data;assert.equal(own.channel,'ghost');assert.equal(own.messages[0].body,'Ghost message');
 assert.equal((await f.wf(observer,'state',{room})).data.messages.some(m=>m.body==='Ghost message'),false);
 const s=model(6),departing=s.players.find(p=>s.roles[p.id]!=='wolf');leaveWolfRoom(s,departing.id);assert.equal(departing.alive,false);assert.equal(departing.left,true);
});
