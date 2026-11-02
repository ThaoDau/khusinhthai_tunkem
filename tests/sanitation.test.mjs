import {test} from 'node:test';import assert from 'node:assert/strict';import {DatabaseSync} from 'node:sqlite';import {readFileSync,readdirSync} from 'node:fs';import {api} from '../server/api.mjs';
function fixture(){const sql=new DatabaseSync(':memory:');for(const f of readdirSync(new URL('../drizzle/',import.meta.url)).filter(n=>n.endsWith('.sql')).sort())sql.exec(readFileSync(new URL('../drizzle/'+f,import.meta.url),'utf8'));
 const wrap=(q,a=[])=>({bind:(...v)=>wrap(q,v),first:()=>sql.prepare(q).get(...a)||null,all:()=>({results:sql.prepare(q).all(...a)}),run:()=>sql.prepare(q).run(...a)}),DB={prepare:wrap,batch:s=>{sql.exec('BEGIN IMMEDIATE');try{const r=s.map(x=>x.run());sql.exec('COMMIT');return r;}catch(e){sql.exec('ROLLBACK');throw e;}}};
 const call=async(path,body,u)=>{const r=await api(new Request('https://village.test/api/'+path,{method:body?'POST':'GET',headers:{cookie:u?.cookie||'','content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{})}),{DB});return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};};
 const register=async n=>{const r=await call('auth',{mode:'register',username:n,name:n,password:'Synthetic-livestock-test'});assert.equal(r.status,200);return {id:r.data.user.id,cookie:r.cookie};};
 const land=(u,action,data={})=>call('land',{action,parcel:'T01',...data},u),qty=(u,item)=>sql.prepare('SELECT quantity FROM inventory WHERE user_id=? AND item=?').get(u.id,item)?.quantity||0,coins=u=>sql.prepare('SELECT coins FROM users WHERE id=?').get(u.id).coins;
 const approved=async(u,id='T01')=>{await call('state',null,u);await call('move',{area:'government'},u);assert.equal((await land(u,'apply',{parcel:id,title:'Trang trại thử',purpose:'Trồng rau và chăn nuôi'})).status,200);sql.prepare('UPDATE land_parcels SET permit_at=0 WHERE id=?').run(id);await call('state',null,u);await land(u,'visit',{parcel:id});};
 const pen=async u=>{await approved(u);assert.equal((await land(u,'build',{kind:'coop'})).status,200);sql.prepare("UPDATE land_parcels SET coop_ready=1 WHERE id='T01'").run();await call('state',null,u);await land(u,'visit',{pen:true});};
 const animals=()=>sql.prepare("SELECT * FROM land_animals WHERE parcel_id='T01' ORDER BY id").all();return {sql,call,land,register,qty,coins,approved,pen,animals};
}

test('bathroom choices require location, elapsed use, both cleaning steps and prevent duplicate rewards',async()=>{
 const f=fixture(),a=await f.register('wc_a'),b=await f.register('wc_b');const wc=(u,action,data={})=>f.call('toilet',{action,...data},u);
 assert.equal((await wc(a,'use',{kind:'pee'})).status,400);await f.call('move',{area:'toilet'},a);
 assert.equal((await f.call('action',{task:'clean'},a)).status,400);
 assert.equal((await wc(a,'use',{kind:'invalid'})).status,400);
 const use=await Promise.all([wc(a,'use',{kind:'pee'}),wc(a,'use',{kind:'poop'})]);assert.equal(use.filter(r=>r.status===200).length,1);
 let v=f.sql.prepare('SELECT * FROM toilet_visits').get();assert.equal((await wc(a,'flush',{visit:v.id})).status,400);
 f.sql.prepare('UPDATE toilet_visits SET finished=1').run();assert.equal((await wc(b,'flush',{visit:v.id})).status,400);
 await wc(a,'flush',{visit:v.id});assert.equal(f.sql.prepare("SELECT count FROM progress WHERE task='clean'").get(),undefined);
 await Promise.all([wc(a,'wipe',{visit:v.id}),wc(a,'wipe',{visit:v.id})]);assert.equal(f.sql.prepare("SELECT count FROM progress WHERE task='clean'").get().count,1);assert.equal(f.coins(a),106);
 assert.equal((await wc(a,'use',{kind:'poop'})).status,429);assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM toilet_camera').get().n,1);
});
test('noon reports hide offender, require independent votes, jail the right player and charge bail once',async()=>{
 const f=fixture(),a=await f.register('dirty_a'),b=await f.register('witness_b'),c=await f.register('witness_c');await f.call('move',{area:'toilet'},a);await f.call('move',{area:'toilet'},b);
 await f.call('toilet',{action:'use',kind:'poop'},a);f.sql.prepare('UPDATE toilet_visits SET finished=1,created=1').run();
 let snap=(await f.call('state',null,b)).data;let incident=snap.incidents.find(i=>i.item==='sanitation');assert.ok(incident);assert.equal(incident.culprit,undefined);assert.equal(incident.quorum,2);
 await Promise.all([f.call('state',null,b),f.call('state',null,c)]);assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM incidents').get().n,1);
 await f.call('investigate',{incident:incident.id,suspect:a.id},b);assert.equal(f.sql.prepare('SELECT jailed_until FROM users WHERE id=?').get(a.id).jailed_until,0);
 await f.call('investigate',{incident:incident.id,suspect:a.id},c);assert.ok(f.sql.prepare('SELECT jailed_until FROM users WHERE id=?').get(a.id).jailed_until>Date.now());
 const bail=await Promise.all([f.call('toilet',{action:'bail',incident:incident.id},b),f.call('toilet',{action:'bail',incident:incident.id},c)]);assert.equal(bail.filter(r=>r.status===200).length,1);assert.equal(f.coins(b)+f.coins(c),180);assert.equal(f.sql.prepare('SELECT jailed_until FROM users WHERE id=?').get(a.id).jailed_until,0);
});

test('inspection waits for noon and cleaned visits never create reports',async()=>{
 const f=fixture(),a=await f.register('clock_a');await f.call('move',{area:'toilet'},a);await f.call('toilet',{action:'use',kind:'pee'},a);
 const {sanitationSnapshot}=await import('../server/sanitation.mjs');const db={prepare:q=>({bind:(...a)=>({run:()=>f.sql.prepare(q).run(...a)})}),batch:ss=>ss.map(s=>s.run())};
 const one=async(q,...a)=>f.sql.prepare(q).get(...a),all=async(q,...a)=>f.sql.prepare(q).all(...a),run=async(q,...a)=>f.sql.prepare(q).run(...a);
 const noon=Date.parse('2026-11-02T05:00:00Z');f.sql.prepare('UPDATE toilet_visits SET created=?,finished=?').run(noon-20000,noon-10000);
 await sanitationSnapshot({db,one,all,run,now:noon-1,me:null});assert.equal((await one('SELECT COUNT(*) n FROM incidents')).n,0);
 await sanitationSnapshot({db,one,all,run,now:noon,me:null});assert.equal((await one('SELECT COUNT(*) n FROM incidents')).n,1);
 f.sql.prepare('UPDATE toilet_visits SET flushed=1,wiped=1,incident=NULL').run();f.sql.prepare('DELETE FROM incidents').run();await sanitationSnapshot({db,one,all,run,now:noon+86400000,me:null});assert.equal((await one('SELECT COUNT(*) n FROM incidents')).n,0);
});
