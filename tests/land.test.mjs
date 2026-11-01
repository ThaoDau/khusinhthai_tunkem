import {test} from 'node:test';import assert from 'node:assert/strict';import {DatabaseSync} from 'node:sqlite';import {readFileSync,readdirSync} from 'node:fs';import {api} from '../server/api.mjs';
function fixture(){const sql=new DatabaseSync(':memory:');for(const f of readdirSync(new URL('../drizzle/',import.meta.url)).filter(n=>n.endsWith('.sql')).sort())sql.exec(readFileSync(new URL('../drizzle/'+f,import.meta.url),'utf8'));
 const wrap=(q,a=[])=>({bind:(...v)=>wrap(q,v),first:()=>sql.prepare(q).get(...a)||null,all:()=>({results:sql.prepare(q).all(...a)}),run:()=>sql.prepare(q).run(...a)}),DB={prepare:wrap,batch:s=>{sql.exec('BEGIN IMMEDIATE');try{const r=s.map(x=>x.run());sql.exec('COMMIT');return r;}catch(e){sql.exec('ROLLBACK');throw e;}}};
 const call=async(path,body,u)=>{const r=await api(new Request('https://village.test/api/'+path,{method:body?'POST':'GET',headers:{cookie:u?.cookie||'','content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{})}),{DB});return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};};
 const register=async n=>{const r=await call('auth',{mode:'register',username:n,name:n,password:'Synthetic-land-test-2026'});assert.equal(r.status,200);return {id:r.data.user.id,cookie:r.cookie};};
 const land=(u,action,data={})=>call('land',{action,...data},u),qty=(u,item)=>sql.prepare('SELECT quantity FROM inventory WHERE user_id=? AND item=?').get(u.id,item)?.quantity||0;
 return {sql,call,land,register,qty};
}
async function approved(f,u,id='T01'){
 await f.call('state',null,u);await f.call('move',{area:'government'},u);assert.equal((await f.land(u,'apply',{parcel:id,title:'Nhà vườn kiểm thử',purpose:'Trồng rau và xây nhà sinh thái'})).status,200);
 f.sql.prepare('UPDATE land_parcels SET permit_at=? WHERE id=?').run(Date.now()-1,id);await f.call('state',null,u);
}
test('land requires government paperwork, preserves private purpose and grants starter materials once',async()=>{
 const f=fixture(),a=await f.register('land_owner'),b=await f.register('land_guest');
 assert.equal((await f.call('state',null,a)).data.land.parcels.length,12);
 assert.equal((await f.land(a,'apply',{parcel:'T01',title:'Test',purpose:'Private purpose for land'})).status,400);
 await f.call('move',{area:'government'},a);
 assert.equal((await f.land(a,'apply',{parcel:'T01',title:'Test',purpose:'short'})).status,400);
 const applied=await f.land(a,'apply',{parcel:'T01',title:'Test',purpose:'Private purpose for land'});assert.equal(applied.status,200);
 assert.equal((await f.land(a,'build',{parcel:'T01',kind:'house'})).status,400);
 let own=(await f.call('state',null,a)).data;assert.equal(own.user.coins,80);assert.equal(own.land.parcels.find(p=>p.id==='T01').status,'pending');
 assert.equal((await f.call('state',null,b)).data.land.parcels.find(p=>p.id==='T01').purpose,undefined);
 assert.equal(own.land.parcels.find(p=>p.id==='T01').purpose,'Private purpose for land');
 f.sql.prepare("UPDATE land_parcels SET permit_at=0 WHERE id='T01'").run();await Promise.all([f.call('state',null,a),f.call('state',null,b),f.call('state',null,a)]);
 assert.equal(f.qty(a,'wood'),6);assert.equal(f.qty(a,'stone'),3);assert.equal(f.qty(a,'seed'),8);
 assert.equal((await f.land(a,'apply',{parcel:'T02',title:'Second',purpose:'Second plot attempt'})).status,400);
 assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM land_beds').get().n,3);
});
test('competing land applications cannot double-claim a parcel or charge the losing account',async()=>{
 const f=fixture(),a=await f.register('land_race_a'),b=await f.register('land_race_b');await f.call('state',null,a);for(const u of [a,b])await f.call('move',{area:'government'},u);
 const requests=await Promise.all([a,b].map(u=>f.land(u,'apply',{parcel:'D01',title:'Race home',purpose:'Trồng rau sinh thái'})));assert.equal(requests.filter(r=>r.status===200).length,1);
 assert.deepEqual(f.sql.prepare('SELECT coins FROM users ORDER BY coins').all().map(p=>p.coins),[80,100]);
 const c=await f.register('one_owner_only');await f.call('move',{area:'government'},c);
 const twice=await Promise.all(['T01','T02'].map(parcel=>f.land(c,'apply',{parcel,title:'Same owner',purpose:'Trồng rau sinh thái'})));assert.equal(twice.filter(r=>r.status===200).length,1);assert.equal(f.sql.prepare('SELECT coins FROM users WHERE id=?').get(c.id).coins,80);
});
test('construction charges fixed costs once, finishes offline and enforces owner and distance',async()=>{
 const f=fixture(),a=await f.register('builder_a'),b=await f.register('builder_b');await approved(f,a);
 assert.equal((await f.land(a,'build',{parcel:'T01',kind:'house'})).status,400);await f.land(a,'visit',{parcel:'T01'});await f.land(b,'visit',{parcel:'T01'});
 assert.equal((await f.land(b,'build',{parcel:'T01',kind:'house'})).status,400);
 const starts=await Promise.all([f.land(a,'build',{parcel:'T01',kind:'house',coins:0}),f.land(a,'build',{parcel:'T01',kind:'house',coins:-100})]);assert.equal(starts.filter(r=>r.status===200).length,1);
 assert.equal(f.qty(a,'wood'),3);assert.equal(f.qty(a,'stone'),1);assert.equal(f.sql.prepare('SELECT coins FROM users WHERE id=?').get(a.id).coins,30);
 assert.equal((await f.land(a,'build',{parcel:'T01',kind:'garden'})).status,400);
 f.sql.prepare("UPDATE land_parcels SET house_ready=1 WHERE id='T01'").run();let s=(await f.call('state',null,b)).data;assert.equal(s.land.parcels.find(p=>p.id==='T01').house_level,1);
 assert.equal((await f.land(a,'build',{parcel:'T01',kind:'garden'})).status,200);f.sql.prepare("UPDATE land_parcels SET garden_ready=1 WHERE id='T01'").run();await f.call('state',null,a);
 assert.equal(f.qty(a,'wood'),1);assert.equal(f.sql.prepare('SELECT coins FROM users WHERE id=?').get(a.id).coins,10);
 assert.equal((await f.land(a,'build',{parcel:'T01',kind:'greenhouse'})).status,400);assert.equal(f.qty(a,'wood'),1);
});
test('private gardens consume seeds once, allow helping and prevent stealing or duplicate harvests',async()=>{
 const f=fixture(),a=await f.register('farmer_a'),b=await f.register('helper_b');await approved(f,a);f.sql.prepare("UPDATE land_parcels SET garden_level=1 WHERE id='T01'").run();
 for(const u of [a,b])await f.land(u,'visit',{parcel:'T01',bed:0});
 assert.equal((await f.land(b,'plant',{parcel:'T01',bed:0,crop:'cabbage'})).status,400);
 const planted=await Promise.all([f.land(a,'plant',{parcel:'T01',bed:0,crop:'cabbage'}),f.land(a,'plant',{parcel:'T01',bed:0,crop:'cabbage'})]);assert.equal(planted.filter(r=>r.status===200).length,1);assert.equal(f.qty(a,'seed'),7);
 assert.equal((await f.land(a,'harvest',{parcel:'T01',bed:0})).status,400);
 assert.equal((await f.land(b,'water',{parcel:'T01',bed:0})).status,200);assert.equal((await f.land(a,'water',{parcel:'T01',bed:0})).status,400);
 f.sql.prepare("UPDATE land_beds SET ready_at=1 WHERE parcel_id='T01' AND bed=0").run();
 assert.equal((await f.land(b,'harvest',{parcel:'T01',bed:0})).status,400);
 const harvested=await Promise.all([f.land(a,'harvest',{parcel:'T01',bed:0}),f.land(a,'harvest',{parcel:'T01',bed:0})]);assert.equal(harvested.filter(r=>r.status===200).length,1);assert.equal(f.qty(a,'vegetable'),2);
 assert.equal((await f.land(a,'sell',{count:1})).status,400);await f.call('move',{area:'government'},a);
 assert.equal((await f.land(a,'sell',{count:1,price:99999})).status,200);assert.equal(f.qty(a,'vegetable'),1);assert.equal(f.sql.prepare('SELECT coins FROM users WHERE id=?').get(a.id).coins,83);
 assert.equal((await f.land(a,'buy',{item:'wood',count:-1})).status,400);assert.equal((await f.land(a,'buy',{item:'wood',count:2,price:0})).status,200);assert.equal(f.qty(a,'wood'),8);assert.equal(f.sql.prepare('SELECT coins FROM users WHERE id=?').get(a.id).coins,75);
 f.sql.prepare('UPDATE users SET wf_locked=1 WHERE id=?').run(a.id);assert.equal((await f.land(a,'visit',{parcel:'T01'})).status,403);
 f.sql.prepare('UPDATE users SET wf_locked=0,jailed_until=? WHERE id=?').run(Date.now()+60000,a.id);assert.equal((await f.land(a,'buy',{item:'seed',count:1})).status,403);
});

test('greenhouse upgrades persist and shorten new growing cycles by 25 percent',async()=>{
 const f=fixture(),a=await f.register('greenhouse_owner');await approved(f,a);
 f.sql.prepare("UPDATE land_parcels SET garden_level=1 WHERE id='T01'").run();f.sql.prepare('UPDATE users SET coins=200 WHERE id=?').run(a.id);
 await f.land(a,'visit',{parcel:'T01'});assert.equal((await f.land(a,'build',{parcel:'T01',kind:'greenhouse'})).status,200);
 assert.equal(f.qty(a,'wood'),2);assert.equal(f.qty(a,'stone'),1);assert.equal(f.sql.prepare('SELECT coins FROM users WHERE id=?').get(a.id).coins,160);
 f.sql.prepare("UPDATE land_parcels SET greenhouse_ready=1 WHERE id='T01'").run();await f.call('state',null,a);
 await f.land(a,'visit',{parcel:'T01',bed:1});assert.equal((await f.land(a,'plant',{parcel:'T01',bed:1,crop:'carrot'})).status,200);
 const bed=f.sql.prepare("SELECT * FROM land_beds WHERE parcel_id='T01' AND bed=1").get();assert.equal(bed.ready_at-bed.planted_at,52500);
 assert.equal((await f.land(a,'build',{parcel:'T01',kind:'greenhouse'})).status,400);
});
