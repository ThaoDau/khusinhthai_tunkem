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
test('pen construction gives one starter chicken and feed exactly once, including concurrent snapshots',async()=>{
 const f=fixture(),owner=await f.register('pen_owner'),guest=await f.register('pen_guest');await f.approved(owner);
 const rs=await Promise.all([f.land(owner,'build',{kind:'coop'}),f.land(owner,'build',{kind:'garden'})]);assert.equal(rs.filter(r=>r.status===200).length,1);assert.equal(f.coins(owner),70);assert.equal(f.qty(owner,'wood'),5);assert.equal(f.qty(owner,'stone'),2);assert.equal(f.animals().length,0);
 f.sql.prepare("UPDATE land_parcels SET coop_ready=1 WHERE id='T01'").run();await Promise.all([f.call('state',null,owner),f.call('state',null,guest),f.call('state',null,owner)]);
 assert.equal(f.animals().length,1);assert.equal(f.animals()[0].kind,'chicken');assert.equal(f.qty(owner,'feed'),3);
 assert.equal((await f.land(owner,'build',{kind:'coop'})).status,400);await f.call('state',null,owner);assert.equal(f.qty(owner,'feed'),3);
});
test('feeding and product collection are atomic and only the owner sells their collected produce',async()=>{
 const f=fixture(),owner=await f.register('eggs_owner'),guest=await f.register('eggs_guest');await f.pen(owner);await f.land(guest,'visit',{pen:true});const bird=f.animals()[0];
 assert.equal((await f.land(guest,'animal_feed',{animal:bird.id})).status,400);
 const fed=await Promise.all([f.land(owner,'animal_feed',{animal:bird.id}),f.land(owner,'animal_feed',{animal:bird.id})]);assert.equal(fed.filter(r=>r.status===200).length,1);assert.equal(f.qty(owner,'feed'),2);
 const row=f.animals()[0];assert.equal(row.ready_at-row.fed_at,60000);
 assert.equal((await f.land(owner,'animal_collect',{animal:bird.id})).status,400);
 f.sql.prepare('UPDATE land_animals SET ready_at=1 WHERE id=?').run(bird.id);assert.equal((await f.land(guest,'animal_collect',{animal:bird.id})).status,400);
 const collected=await Promise.all([f.land(owner,'animal_collect',{animal:bird.id}),f.land(owner,'animal_collect',{animal:bird.id})]);assert.equal(collected.filter(r=>r.status===200).length,1);assert.equal(f.qty(owner,'egg'),2);assert.equal(f.animals()[0].ready_at,0);
 assert.equal((await f.call('use',{item:'egg'},owner)).status,400);assert.equal(f.qty(owner,'egg'),2);
 assert.equal((await f.land(owner,'sell',{item:'egg',count:2})).status,400);await f.call('move',{area:'government'},owner);
 assert.equal((await f.land(owner,'sell',{item:'egg',count:2,price:9999})).status,200);assert.equal(f.coins(owner),76);assert.equal(f.qty(owner,'egg'),0);
 assert.equal((await f.land(owner,'sell',{item:'feed',count:1})).status,400);assert.equal((await f.land(owner,'sell',{item:'egg',count:-1})).status,400);
 assert.equal((await f.land(owner,'buy',{item:'feed',count:1,price:0})).status,200);assert.equal(f.qty(owner,'feed'),3);assert.equal(f.coins(owner),74);
});
test('animal capacity, helper feeding, cow milk and cross-property permissions are enforced',async()=>{
 const f=fixture(),owner=await f.register('cows_owner'),helper=await f.register('cows_helper'),other=await f.register('other_owner');await f.pen(owner);f.sql.prepare('UPDATE users SET coins=200 WHERE id=?').run(owner.id);
 assert.equal((await f.land(owner,'animal_buy',{kind:'cow',price:0})).status,200);assert.equal(f.coins(owner),155);
 const results=await Promise.all([f.land(owner,'animal_buy',{kind:'cow'}),f.land(owner,'animal_buy',{kind:'chicken'})]);assert.equal(results.filter(r=>r.status===200).length,1);assert.equal(f.animals().length,3);
 const balance=f.coins(owner);assert.equal((await f.land(owner,'animal_buy',{kind:'chicken'})).status,400);assert.equal(f.coins(owner),balance);
 await f.land(helper,'visit',{pen:true});assert.equal((await f.land(helper,'animal_buy',{kind:'chicken'})).status,400);
 await f.call('move',{area:'government'},helper);assert.equal((await f.land(helper,'buy',{item:'feed',count:2})).status,200);await f.land(helper,'visit',{pen:true});
 const cow=f.animals().find(a=>a.kind==='cow');assert.equal((await f.land(helper,'animal_feed',{animal:cow.id})).status,200);assert.equal(f.qty(helper,'feed'),0);assert.equal(f.qty(owner,'feed'),3);
 f.sql.prepare('UPDATE land_animals SET ready_at=1 WHERE id=?').run(cow.id);assert.equal((await f.land(owner,'animal_collect',{animal:cow.id})).status,200);assert.equal(f.qty(owner,'milk'),1);
 await f.approved(other,'D01');f.sql.prepare("UPDATE land_parcels SET coop_level=1 WHERE id='D01'").run();await f.land(other,'visit',{parcel:'D01',pen:true});assert.equal((await f.land(other,'animal_feed',{parcel:'D01',animal:cow.id})).status,400);
 f.sql.prepare('UPDATE users SET wf_locked=1 WHERE id=?').run(owner.id);assert.equal((await f.land(owner,'animal_feed',{animal:cow.id})).status,403);
});
