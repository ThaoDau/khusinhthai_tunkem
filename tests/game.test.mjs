import {test} from 'node:test';import assert from 'node:assert/strict';import {DatabaseSync} from 'node:sqlite';import {readFileSync} from 'node:fs';import {api} from '../server/api.mjs';
const sqlite=new DatabaseSync(':memory:');sqlite.exec(readFileSync(new URL('../drizzle/0000_village.sql',import.meta.url),'utf8'));
sqlite.exec(readFileSync(new URL('../drizzle/0001_auth_rate.sql',import.meta.url),'utf8'));
const wrap=(sql,a=[])=>({bind:(...args)=>wrap(sql,args),first:()=>sqlite.prepare(sql).get(...a)||null,all:()=>({results:sqlite.prepare(sql).all(...a)}),run:()=>sqlite.prepare(sql).run(...a)});
const env={DB:{prepare:wrap,batch:s=>{sqlite.exec('BEGIN');try{const r=s.map(x=>x.run());sqlite.exec('COMMIT');return r;}catch(e){sqlite.exec('ROLLBACK');throw e;}}}};
async function call(path,body,cookie=''){const res=await api(new Request('https://village.test/api/'+path,{method:body?'POST':'GET',headers:{cookie,'content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{})}),env);return {status:res.status,data:await res.json(),cookie:res.headers.get('set-cookie')?.split(';')[0]};}
test('multiplayer accounts, private channels, teams, tasks and court',async()=>{
 assert.equal((await call('action',{task:'bow'})).status,401);
 const accounts=[];for(let i=0;i<5;i++){const r=await call('auth',{mode:'register',username:'player_'+i,name:'Bạn '+i,password:'a-long-test-password'});assert.equal(r.status,200);assert.ok(!r.data.user.hash);accounts.push(r);}
 const [a,b,c,d,e]=accounts;
 assert.equal((await call('auth',{mode:'login',username:'player_0',password:'wrong-password'})).status,401);
 assert.equal((await call('auth',{mode:'login',username:'player_0',password:'a-long-test-password'})).status,200);
 await call('messages',{channel:'private',recipient:b.data.user.id,body:'chỉ hai người đọc'},a.cookie);
 assert.equal((await call('messages?channel=private&recipient='+a.data.user.id,null,b.cookie)).data.messages[0].body,'chỉ hai người đọc');
 assert.equal((await call('messages?channel=private&recipient='+a.data.user.id,null,c.cookie)).data.messages.length,0);
 await call('team',{action:'create',name:'Hội Sen Xanh'},a.cookie);const team=(await call('state',null,a.cookie)).data.user.team;
 await call('team',{action:'join',id:team},b.cookie);
 // Reset per-user message throttle to avoid waiting in a deterministic test.
 sqlite.prepare('UPDATE messages SET created=0').run();
 await call('messages',{channel:'team',body:'Bí mật hội sen'},a.cookie);
 assert.equal((await call('messages?channel=team',null,b.cookie)).data.messages[0].body,'Bí mật hội sen');
 assert.equal((await call('messages?channel=team',null,c.cookie)).status,400);
 for(let i=0;i<4;i++){sqlite.prepare('UPDATE users SET action_at=0 WHERE id=?').run(a.data.user.id);const r=await call('action',{task:'bow'},a.cookie);assert.equal(r.data.reward,i<3?30:0);}
 assert.equal((await call('state',null,a.cookie)).data.user.points,90);
 assert.equal((await call('action',{task:'bow'},a.cookie)).status,429);
 await call('move',{area:'garden'},a.cookie);assert.equal((await call('action',{task:'bow'},a.cookie)).status,400);
 await call('case',{defendant:b.data.user.id,reason:'Bất hòa trong nhập vai'},a.cookie);
 const snapshot=(await call('state',null,a.cookie)).data;assert.equal(snapshot.user.area,'court');const caseId=snapshot.cases[0].id;
 assert.equal((await call('case',{action:'vote',id:caseId},a.cookie)).status,400);
 for(const user of [c,d,e])await call('case',{action:'vote',id:caseId},user.cookie);
 assert.equal((await call('state',null,a.cookie)).data.cases[0].status,'resolved');
 await call('team',{action:'leave'},b.cookie);assert.equal((await call('messages?channel=team',null,b.cookie)).status,400);
 await call('logout',{},a.cookie);assert.equal((await call('state',null,a.cookie)).data.user,null);
 for(let i=0;i<11;i++)await call('auth',{mode:'login',username:'unknown',password:'wrong-password'});
 assert.equal((await call('auth',{mode:'login',username:'unknown',password:'wrong-password'})).status,429);
});
