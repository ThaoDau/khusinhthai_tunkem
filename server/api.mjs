import {BENCHES,SHOPS,ITEMS,GESTURES} from '../public/world-data.mjs';
import {villagePlay,mysterySnapshot} from './village-play.mjs';
import {werewolf} from './werewolf.mjs';
import {homesteads,landSnapshot} from './homesteads.mjs';
export const AREAS = ['temple','church','pond','kitchen','garden','toilet','meeting','court','village','jail','werewolf','government'];
export const TASKS = {bow:{area:'temple',goal:3,reward:30},pray:{area:'church',goal:2,reward:20},feed:{area:'pond',goal:3,reward:25},cook:{area:'kitchen',goal:2,reward:25},water:{area:'garden',goal:3,reward:30},clean:{area:'toilet',goal:2,reward:20},meet:{area:'meeting',goal:1,reward:15}};
const enc=new TextEncoder();
const json=(data,status=200,headers={})=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...headers}});
const hex=b=>Array.from(new Uint8Array(b),x=>x.toString(16).padStart(2,'0')).join('');
async function password(pass,salt){const key=await crypto.subtle.importKey('raw',enc.encode(pass),'PBKDF2',false,['deriveBits']);return hex(await crypto.subtle.deriveBits({name:'PBKDF2',salt:enc.encode(salt),iterations:100000,hash:'SHA-256'},key,256));}
const clean=(x,max=300)=>typeof x==='string'?x.trim().slice(0,max):'';
const publicUser=u=>({id:u.id,name:u.name,color:u.color,points:u.points,coins:u.coins,hat:u.hat,seat:u.seat,jailed_until:u.jailed_until,wf_room:u.wf_room,wf_locked:u.wf_locked,team:u.team,area:u.area,action:u.action,action_at:u.action_at,x:u.x,z:u.z,facing:u.facing});
export async function api(req,env){
 const db=env.DB, url=new URL(req.url), route=url.pathname.slice(5), now=Date.now();
 const one=(sql,...a)=>db.prepare(sql).bind(...a).first();
 const all=async(sql,...a)=>(await db.prepare(sql).bind(...a).all()).results;
 const run=(sql,...a)=>db.prepare(sql).bind(...a).run();
 try{
 if(req.method!=='GET'&&req.headers.get('origin')&&req.headers.get('origin')!==url.origin)return json({error:'Yêu cầu không hợp lệ.'},403);
 let body={}; if(req.method==='POST'){if(Number(req.headers.get('content-length'))>8192)return json({error:'Nội dung quá dài.'},413);try{const raw=await req.text();if(raw.length>8192)return json({error:'Nội dung quá dài.'},413);body=JSON.parse(raw);}catch{return json({error:'Dữ liệu không hợp lệ.'},400);}}
 const token=req.headers.get('cookie')?.match(/(?:^|;\s*)td_session=([a-f0-9-]+)/)?.[1];
 let me=token?await one('SELECT u.* FROM users u JOIN sessions s ON u.id=s.user_id WHERE s.token=? AND s.expires>?',token,now):null;
 if(me?.jailed_until){
  if(me.jailed_until<=now){await run("UPDATE users SET jailed_until=0,area='village',x=52,z=53,seat='',action='',position_at=? WHERE id=?",now,me.id);me=await one('SELECT * FROM users WHERE id=?',me.id);}
  else if(me.area!=='jail'){await run("UPDATE users SET area='jail',x=0,z=0,seat='',action='',position_at=? WHERE id=?",now,me.id);me=await one('SELECT * FROM users WHERE id=?',me.id);}
 }
 if(route==='auth'&&req.method==='POST'){
  const username=clean(body.username,24).toLowerCase(), pass=body.password;
  const window=Math.floor(now/600000),ip=req.headers.get('cf-connecting-ip')||'local';
  for(const [label,value,max] of [['account',username,10],['network',ip,60]]){
   const key=hex(await crypto.subtle.digest('SHA-256',enc.encode(label+':'+value+':'+window)));
   await run('INSERT INTO auth_limits(key,count,expires) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1',key,now+1200000);
   const limit=await one('SELECT count FROM auth_limits WHERE key=?',key);if(limit.count>max)return json({error:'Bạn đã thử quá nhiều lần. Vui lòng quay lại sau 10 phút.'},429);
  }
  await run('DELETE FROM auth_limits WHERE expires<?',now);
  if(!/^[a-z0-9_]{3,24}$/.test(username)||typeof pass!=='string'||pass.length<8||pass.length>128)return json({error:'Tên đăng nhập 3–24 ký tự a-z, số, dấu _. Mật khẩu 8–128 ký tự.'},400);
  let u=await one('SELECT * FROM users WHERE username=?',username);
  if(body.mode==='register'){
   if(u)return json({error:'Tên đăng nhập đã được sử dụng.'},409);
   const name=clean(body.name,24);if(!name)return json({error:'Hãy nhập tên nhân vật.'},400);
   const salt=crypto.randomUUID(),id=crypto.randomUUID(),hash=await password(pass,salt);
   await run('INSERT INTO users(id,username,name,salt,hash,color,seen) VALUES(?,?,?,?,?,?,?)',id,username,name,salt,hash,['#e2a650','#6d9e95','#c28068','#9292b8'][Math.floor(Math.random()*4)],now);
   u=await one('SELECT * FROM users WHERE id=?',id);
  }else if(!u||await password(pass,u.salt)!==u.hash)return json({error:'Tên đăng nhập hoặc mật khẩu chưa đúng.'},401);
  const session=crypto.randomUUID();await run('INSERT INTO sessions VALUES(?,?,?)',session,u.id,now+604800000);
  return json({user:publicUser(u)},200,{'Set-Cookie':`td_session=${session}; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800${url.protocol==='https:'?'; Secure':''}`});
 }
 if(route==='logout'&&req.method==='POST'){if(token)await run('DELETE FROM sessions WHERE token=?',token);return json({ok:true},200,{'Set-Cookie':'td_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0'});}
 if(route==='state'){
  if(me)await run('UPDATE users SET seen=? WHERE id=?',now,me.id);
  const land=await landSnapshot({all,run,now,me,db});
  const players=await all('SELECT id,name,color,points,hat,seat,wf_room,wf_locked,team,area,action,action_at,x,z,facing,position_at FROM users WHERE seen>? ORDER BY seen DESC LIMIT 60',now-25000);
  const teams=await all('SELECT t.*, (SELECT COUNT(*) FROM users u WHERE u.team=t.id) AS members, (SELECT COALESCE(SUM(points),0) FROM users u WHERE u.team=t.id) AS points FROM teams t ORDER BY points DESC LIMIT 50');
  const progress=me?await all('SELECT task,count FROM progress WHERE user_id=? AND day=?',me.id,new Date(now+25200000).toISOString().slice(0,10)):[];
  const cases=await all('SELECT c.*,a.name AS plaintiff_name,b.name AS defendant_name,(SELECT COUNT(*) FROM votes v WHERE v.case_id=c.id) AS votes FROM cases c JOIN users a ON a.id=c.plaintiff JOIN users b ON b.id=c.defendant ORDER BY c.created DESC LIMIT 20');
  const inventory=me?await all('SELECT item,quantity FROM inventory WHERE user_id=? AND quantity>0',me.id):[];
  return json({user:me?publicUser(me):null,players,teams,progress,cases,inventory,land,...await mysterySnapshot({all,run,now,me,db})});
 }
 if(!me)return json({error:'Hãy đăng nhập để cùng chơi nhé.'},401);
 if(route==='land'){if(req.method!=='POST')return json({error:'Dùng thao tác đất đai trong game.'},405);const r=await homesteads({db,me,now,one,all,run,body});return json(r.data,r.status);}
 if(route==='werewolf'){if(req.method!=='POST')return json({error:'Dùng thao tác trong phòng Ma Sói.'},405);const w=await werewolf({db,me,now,one,all,run,body});return json(w.data,w.status);}
 if(me.wf_locked&&(['move','gesture','farm','steal','investigate','case','buy','use','action','team'].includes(route)||route==='messages'&&req.method==='POST'))return json({error:'Bạn đang ở bàn Ma Sói. Dùng bảng Ma Sói để hành động/chat hoặc rời trận.'},403);
 if(me.jailed_until>now&&['move','case'].includes(route))return json({error:'Bạn đang bị tạm giữ. Hết giờ sẽ tự trở lại làng.'},403);
 const play=await villagePlay({route,body,db,me,now,one,all,run});if(play)return json(play.data,play.status);
 if(route==='gesture'&&req.method==='POST'){
  if(body.action==='sit'){
   if(me.jailed_until>now)return json({error:'Bạn đang ở phòng tạm giữ.'},403);
   const bench=BENCHES.find(b=>b.id===body.bench);
   if(me.area!=='village'||!bench||Math.hypot(me.x-bench.x,me.z-bench.z)>5)return json({error:'Hãy đi lại gần chiếc ghế trước nhé.'},400);
   if(await one('SELECT id FROM users WHERE area=? AND seat=? AND seen>? AND id!=?','village',bench.id,now-25000,me.id))return json({error:'Ghế này có bạn ngồi rồi. Chọn ghế khác nhé.'},409);
   await run('UPDATE users SET seat=?,action=?,action_at=?,x=?,z=?,facing=?,position_at=?,seen=? WHERE id=?',bench.id,'sit',now,bench.x,bench.z,bench.facing,now,now,me.id);
   return json({ok:true,x:bench.x,z:bench.z,facing:bench.facing,user:publicUser(await one('SELECT * FROM users WHERE id=?',me.id))});
  }
  if(!GESTURES.some(g=>g.id===body.action))return json({error:'Động tác không tồn tại.'},400);
  const standing=body.action==='stand';
  if(!standing&&now-me.action_at<700)return json({error:'Chờ một chút để đổi động tác nhé.'},429);
  // Step out in front of a bench when standing, so its collision box cannot trap the player.
  const bench=standing?BENCHES.find(b=>b.id===me.seat):null;
  const x=bench?bench.x+Math.sin(bench.facing)*1.8:me.x,z=bench?bench.z+Math.cos(bench.facing)*1.8:me.z;
  await run('UPDATE users SET action=?,action_at=?,x=?,z=?,seat=?,position_at=? WHERE id=?',standing?'':body.action,now,x,z,standing?'':me.seat,now,me.id);
  return json({ok:true,x,z,facing:me.facing,user:publicUser(await one('SELECT * FROM users WHERE id=?',me.id))});
 }
 if(route==='buy'&&req.method==='POST'){
  const shop=SHOPS.find(s=>s.id===body.shop),item=ITEMS[body.item];
  if(me.area!=='village'||!shop||Math.hypot(me.x-shop.x,me.z-shop.z)>6)return json({error:'Hãy đến gần quầy bán hàng để mua.'},400);
  if(!item||!shop.items.includes(item.id))return json({error:'Quầy này không bán món đó.'},400);
  const results=await db.batch([db.prepare('UPDATE users SET coins=coins-? WHERE id=? AND coins>=?').bind(item.price,me.id,item.price),db.prepare('INSERT INTO inventory(user_id,item,quantity) SELECT ?,?,1 WHERE changes()>0 ON CONFLICT(user_id,item) DO UPDATE SET quantity=quantity+1').bind(me.id,item.id)]);
  const changed=results[0].meta?.changes??results[0].changes;
  if(!changed)return json({error:'Bạn chưa đủ xu. Làm nhiệm vụ để kiếm thêm nhé.'},400);
  return json({ok:true,item:item.id,coins:(await one('SELECT coins FROM users WHERE id=?',me.id)).coins});
 }
 if(route==='use'&&req.method==='POST'){
  const item=ITEMS[body.item];if(!item)return json({error:'Vật phẩm không tồn tại.'},400);
  if(item.action==='material')return json({error:'Mở Đất & nhà để dùng vật liệu xây dựng và hạt giống.'},400);
  if(item.action==='wear'){
   if(!await one('SELECT quantity FROM inventory WHERE user_id=? AND item=? AND quantity>0',me.id,item.id))return json({error:'Bạn chưa có món này trong túi.'},400);
   await run('UPDATE users SET hat=? WHERE id=?',me.hat?0:1,me.id);return json({ok:true});
  }
  const results=await db.batch([db.prepare('UPDATE inventory SET quantity=quantity-1 WHERE user_id=? AND item=? AND quantity>0').bind(me.id,item.id),db.prepare('UPDATE users SET action=?,action_at=? WHERE id=? AND changes()>0').bind(item.action,now,me.id)]);
  if(!(results[0].meta?.changes??results[0].changes))return json({error:'Món này đã hết trong túi.'},400);
  return json({ok:true,action:item.action});
 }
 if(route==='presence'&&req.method==='POST'){
  if(me.wf_locked)await run('UPDATE users SET seen=? WHERE id=?',now,me.id);
  if(!me.wf_locked&&body.area===me.area&&[body.x,body.z,body.facing].every(Number.isFinite)){
   const bound=me.jailed_until>now?4:me.area==='village'?100:17,depth=me.jailed_until>now?4:me.area==='village'?100:23;
   const elapsed=Math.max(.25,Math.min(4,(now-me.position_at)/1000)),distance=Math.hypot(body.x-me.x,body.z-me.z);
   if(Math.abs(body.x)>bound||Math.abs(body.z)>depth||distance>elapsed*10+2)return json({error:'Vị trí di chuyển không hợp lệ.',x:me.x,z:me.z},400);
   if(!me.seat)await run('UPDATE users SET x=?,z=?,facing=?,seen=?,position_at=? WHERE id=?',body.x,body.z,body.facing,now,now,me.id);
  }
  return json({players:await all('SELECT id,name,color,points,hat,seat,wf_room,wf_locked,team,area,action,action_at,x,z,facing,position_at FROM users WHERE seen>? ORDER BY seen DESC LIMIT 60',now-25000),area:me.area});
 }
 if(route==='move'&&req.method==='POST'){
  if(!AREAS.includes(body.area))return json({error:'Khu vực không tồn tại.'},400);
  if(body.area==='werewolf'&&!me.wf_room)return json({error:'Hãy tạo hoặc tham gia phòng Ma Sói trước.'},400);
  if(me.wf_room&&!me.wf_locked)await run('UPDATE users SET wf_room=NULL WHERE id=?',me.id);
  const exits={temple:[0,-24],church:[39,-19],pond:[-34,-7],kitchen:[-34,28],garden:[34,21],toilet:[-34,59],meeting:[3,60],court:[37,56],jail:[52,53],government:[-29,-49]};
  const [x,z]=body.area==='village'?(exits[me.area]||[0,10]):[0,10];
  await run("UPDATE users SET area=?,action=?,seat='',seen=?,x=?,z=?,facing=0,position_at=? WHERE id=?",body.area,'',now,x,z,now,me.id);return json({ok:true,x,z});
 }
 if(route==='action'&&req.method==='POST'){
  const task=TASKS[body.task];if(!task||task.area!==me.area)return json({error:'Hãy đến đúng khu vực để làm nhiệm vụ.'},400);
  if(now-me.action_at<2500)return json({error:'Thảnh thơi một chút, rồi thử lại nhé.'},429);
  const day=new Date(now+25200000).toISOString().slice(0,10),p=await one('SELECT count FROM progress WHERE user_id=? AND task=? AND day=?',me.id,body.task,day),count=p?.count||0,reward=count<task.goal?task.reward:0;
  await db.batch([db.prepare('UPDATE users SET action=?,action_at=?,points=points+?,coins=coins+?,seen=? WHERE id=? AND action_at<=?').bind(body.task,now,reward,Math.floor(reward/3),now,me.id,now-2500),db.prepare('INSERT INTO progress VALUES(?,?,?,1) ON CONFLICT(user_id,task,day) DO UPDATE SET count=MIN(count+1,?)').bind(me.id,body.task,day,task.goal)]);
  return json({ok:true,reward});
 }
 if(route==='messages'){
  let channel=body.channel||url.searchParams.get('channel')||'global',recipient=clean(body.recipient||url.searchParams.get('recipient'),40);
  if(channel==='team'){if(!me.team)return json({error:'Bạn chưa tham gia đội.'},400);channel='team:'+me.team;}
  else if(channel==='private'){if(!recipient||recipient===me.id||!await one('SELECT id FROM users WHERE id=?',recipient))return json({error:'Chọn người nhận hợp lệ.'},400);channel='dm:'+ [me.id,recipient].sort().join(':');}
  else if(channel!=='global')return json({error:'Kênh không hợp lệ.'},400);
  if(req.method==='POST'){
   const text=clean(body.body);if(!text)return json({error:'Hãy nhập lời nhắn.'},400);
   const last=await one('SELECT created FROM messages WHERE user_id=? ORDER BY id DESC LIMIT 1',me.id);if(last&&now-last.created<1200)return json({error:'Bạn gửi hơi nhanh. Chờ một chút nhé.'},429);
   await run('INSERT INTO messages(user_id,name,channel,recipient,body,created) VALUES(?,?,?,?,?,?)',me.id,me.name,channel,recipient||null,text,now);
  }
  return json({messages:(await all('SELECT id,user_id,name,body,created FROM messages WHERE channel=? ORDER BY id DESC LIMIT 50',channel)).reverse()});
 }
 if(route==='team'&&req.method==='POST'){
  if(body.action==='leave'){await run('UPDATE users SET team=NULL WHERE id=?',me.id);return json({ok:true});}
  if(me.team)return json({error:'Hãy rời đội hiện tại trước.'},400);
  let id=body.id;
  if(body.action==='create'){const name=clean(body.name,28);if(name.length<3)return json({error:'Tên đội cần ít nhất 3 ký tự.'},400);id=crypto.randomUUID();await run('INSERT INTO teams VALUES(?,?,?)',id,name,me.id);}
  else if(!await one('SELECT id FROM teams WHERE id=?',id||''))return json({error:'Đội không tồn tại.'},404);
  await run('UPDATE users SET team=? WHERE id=?',id,me.id);return json({ok:true});
 }
 if(route==='case'&&req.method==='POST'){
  if(body.action==='vote'){
   const c=await one('SELECT * FROM cases WHERE id=? AND status=?',body.id,'open');if(!c)return json({error:'Phiên hòa giải đã kết thúc.'},400);
   if([c.plaintiff,c.defendant].includes(me.id))return json({error:'Người trong vụ việc không tự bỏ phiếu.'},400);
   await run('INSERT OR IGNORE INTO votes VALUES(?,?)',c.id,me.id);const v=await one('SELECT COUNT(*) AS n FROM votes WHERE case_id=?',c.id);
   if(v.n>=3)await run('UPDATE cases SET status=? WHERE id=?','resolved',c.id);return json({ok:true});
  }
  if(body.action==='reconcile'){const c=await one('SELECT * FROM cases WHERE id=?',body.id);if(!c||![c.plaintiff,c.defendant].includes(me.id))return json({error:'Chỉ người trong vụ việc mới có thể chủ động làm hòa.'},403);await run('UPDATE cases SET status=? WHERE id=?','resolved',c.id);return json({ok:true});}
  const target=clean(body.defendant,40),reason=clean(body.reason,200);if(target===me.id||reason.length<5||!await one('SELECT id FROM users WHERE id=?',target))return json({error:'Chọn người chơi và mô tả vụ việc (ít nhất 5 ký tự).'},400);
  if(await one('SELECT id FROM cases WHERE plaintiff=? AND created>?',me.id,now-60000))return json({error:'Mỗi phút chỉ mở một vụ việc.'},429);
  await db.batch([db.prepare('INSERT INTO cases(id,plaintiff,defendant,reason,created) VALUES(?,?,?,?,?)').bind(crypto.randomUUID(),me.id,target,reason,now),db.prepare("UPDATE users SET area=?,seat='',action='',x=0,z=10 WHERE id IN (?,?)").bind('court',me.id,target)]);return json({ok:true});
 }
 return json({error:'Không tìm thấy chức năng.'},404);
 }catch(e){console.error('API error',e.message);return json({error:e.message?.includes('UNIQUE')?'Tên này đã được sử dụng.':'Không thể xử lý yêu cầu. Vui lòng thử lại.'},500);}
}
