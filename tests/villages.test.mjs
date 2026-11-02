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

test('new accounts choose a village, founders become chiefs and village data cannot leak across worlds',async()=>{
 const f=fixture(),a=await f.register('chief_a'),b=await f.register('chief_b'),guest=await f.register('resident_c');
 assert.equal((await f.call('state',null,a)).data.needs_village,true);assert.equal((await f.call('move',{area:'village'},a)).status,403);
 const create=async(u,name)=>(await f.call('villages',{action:'create',name,description:'Một làng thử độc lập'},u));
 const av=await create(a,'Làng Sen Xanh');assert.equal(av.status,200);const bv=await create(b,'Làng Hoa Vàng');assert.equal(bv.status,200);
 const va=av.data.village,vb=bv.data.village;assert.notEqual(va,vb);
 assert.equal((await f.call('villages',{action:'join',village:va},guest)).status,200);
 let as=(await f.call('state',null,a)).data,bs=(await f.call('state',null,b)).data;
 assert.equal(as.user.is_chief,true);assert.equal(as.village.owner_id,a.id);assert.equal(as.players.length,2);assert.equal(bs.players.length,1);assert.ok(!as.players.some(p=>p.id===b.id));assert.equal(as.land.parcels.length,12);assert.equal(bs.land.parcels.length,12);
 await f.call('messages',{channel:'global',body:'Chỉ làng Sen Xanh thấy'},a);assert.equal((await f.call('messages?channel=global',null,guest)).data.messages.length,1);assert.equal((await f.call('messages?channel=global',null,b)).data.messages.length,0);
 assert.equal((await f.call('messages',{channel:'private',recipient:b.id,body:'Không xuyên làng'},a)).status,400);
 const t=await f.call('team',{action:'create',name:'Đội Sen'},a);assert.equal(t.status,200);as=(await f.call('state',null,a)).data;assert.equal((await f.call('team',{action:'join',id:as.user.team},b)).status,404);
 await f.call('move',{area:'government'},a);await f.call('move',{area:'government'},b);
 assert.equal((await f.land(a,'apply',{title:'Nhà Sen',purpose:'Trồng rau nuôi gà'})).status,200);assert.equal((await f.land(b,'apply',{title:'Nhà Hoa',purpose:'Trồng rau nuôi bò'})).status,200);
 assert.equal((await f.call('state',null,a)).data.land.parcels.find(p=>p.id==='T01').owner_id,a.id);assert.equal((await f.call('state',null,b)).data.land.parcels.find(p=>p.id==='T01').owner_id,b.id);
 const wolf=await f.call('werewolf',{action:'create',title:'Đêm làng Sen'},a);assert.equal(wolf.status,200);assert.equal((await f.call('werewolf',{action:'join',room:wolf.data.room.id},b)).status,400);
 assert.equal((await f.call('villages',{action:'edit',name:'Tên giả'},guest)).status,403);assert.equal((await f.call('villages',{action:'edit',name:'Làng Sen Mới',description:'Đổi tên bởi trưởng làng'},a)).status,200);
 assert.equal((await f.call('villages',{action:'join',village:vb},a)).status,409);assert.equal((await f.call('villages',{action:'create',name:'Làng thứ hai'},a)).status,409);
 const directory=(await f.call('villages',null,a)).data.villages;assert.equal(directory.find(v=>v.id===va).members,2);assert.equal(directory.find(v=>v.id===va).chief_name,'chief_a');
 assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM users').get().n,0); // Newly created villages do not contaminate legacy Thảo Đậu.
});
test('duplicate names and concurrent membership choices cannot create two chiefs or two profiles',async()=>{
 const f=fixture(),a=await f.register('parallel_a'),b=await f.register('parallel_b');
 const rs=await Promise.all([f.call('villages',{action:'create',name:'Làng Một'},a),f.call('villages',{action:'create',name:'Làng Hai'},a)]);assert.equal(rs.filter(r=>r.status===200).length,1);
 const v=(await f.call('state',null,a)).data.village;assert.equal((await f.call('villages',{action:'create',name:v.name},b)).status,409);
 assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM villages WHERE owner_id=?').get(a.id).n,1);
 const same=await Promise.all([f.call('villages',{action:'join',village:v.id},b),f.call('villages',{action:'join',village:'thao-dau'},b)]);assert.equal(same.filter(r=>r.status===200).length,1);
 const login=await f.call('auth',{mode:'login',username:'parallel_a',password:'Synthetic-livestock-test'});assert.equal(login.status,200);assert.equal(login.data.user.village_id,v.id);
});

test('migration retains legacy residents, land, wallets and session identity in Thảo Đậu',()=>{
 const sql=new DatabaseSync(':memory:');for(const f of readdirSync(new URL('../drizzle/',import.meta.url)).filter(n=>n.endsWith('.sql')&&!n.startsWith('0009')).sort())sql.exec(readFileSync(new URL('../drizzle/'+f,import.meta.url),'utf8'));
 sql.prepare("INSERT INTO users(id,username,name,salt,hash,color,coins) VALUES('legacy','legacy','Cư dân cũ','salt','hash','#e2a650',257)").run();sql.prepare("INSERT INTO sessions VALUES('legacy-session','legacy',9999999999999)").run();sql.prepare("INSERT INTO land_parcels(id,owner_id,status,house_level) VALUES('T01','legacy','approved',1)").run();
 sql.exec(readFileSync(new URL('../drizzle/0009_villages.sql',import.meta.url),'utf8'));assert.equal(sql.prepare("SELECT village_id FROM accounts WHERE id='legacy'").get().village_id,'thao-dau');assert.equal(sql.prepare("SELECT coins FROM users WHERE id='legacy'").get().coins,257);assert.equal(sql.prepare("SELECT owner_id,house_level FROM land_parcels WHERE id='T01'").get().owner_id,'legacy');assert.equal(sql.prepare("SELECT a.id FROM accounts a JOIN sessions s ON a.id=s.user_id WHERE s.token='legacy-session'").get().id,'legacy');
});
