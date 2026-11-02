import {PLOTS,THEFT_SPOTS,JAIL_SECONDS} from '../public/mystery-data.mjs';
const result=(data,status=200)=>({data,status});
const changes=r=>Number(r?.meta?.changes??r?.changes??0);
export async function ensurePlots({all,db}){
 const plots=await all('SELECT * FROM garden_plots ORDER BY id');
 if(plots.length===16)return plots;
 await db.batch(PLOTS.filter(p=>!plots.some(row=>row.id===p.id)).map(p=>db.prepare('INSERT OR IGNORE INTO garden_plots(id) VALUES(?)').bind(p.id)));
 return all('SELECT * FROM garden_plots ORDER BY id');
}
export async function mysterySnapshot({all,run,now,me,db}){
 await run("UPDATE incidents SET status='expired' WHERE status='open' AND expires<=?",now);
 const incidents=await all('SELECT id,item,location,suspects,clue,eliminated,quorum,status,created,expires,solved_name FROM incidents ORDER BY created DESC LIMIT 12');
 const votes=await all('SELECT v.incident_id,v.suspect,COUNT(*) AS count FROM incident_votes v JOIN incidents i ON i.id=v.incident_id WHERE i.status=? GROUP BY v.incident_id,v.suspect','open');
 for(const incident of incidents){incident.suspects=JSON.parse(incident.suspects);incident.eliminated=JSON.parse(incident.eliminated);incident.votes=votes.filter(v=>v.incident_id===incident.id).map(v=>({suspect:v.suspect,count:v.count}));incident.clues=[incident.clue];if(now-incident.created>20000)incident.clues.push('Đối chiếu trang phục của người có mặt lúc vụ việc xảy ra. Phiếu sai chỉ loại trừ nghi phạm, không bắt người.');}
 return {plots:await ensurePlots({all,db}),incidents,server_time:now};
}
export async function villagePlay(ctx){
 const {route,body,db,me,now,one,all,run}=ctx;
 if(!['farm','steal','investigate'].includes(route))return null;
 if(me.jailed_until>now)return result({error:'Bạn đang bị tạm giữ. Chờ hết giờ để trở lại làng.'},403);
 if(route==='farm'){
  const plot=PLOTS.find(p=>p.id===body.plot);
  if(!plot||!['village','garden'].includes(me.area))return result({error:'Hãy đến vườn rau.'},400);
  const x=me.area==='village'?plot.x:plot.insideX,z=me.area==='village'?plot.z:plot.insideZ;
  if(Math.hypot(me.x-x,me.z-z)>5)return result({error:'Hãy đứng gần luống rau muốn chăm.'},400);
  const plots=await ensurePlots(ctx),crop=plots.find(p=>p.id===plot.id);
  if(now-me.farm_at<2500)return result({error:'Chờ một chút rồi chăm tiếp nhé.'},429);
  if(body.action==='water'){
   const day=new Date(now+25200000).toISOString().slice(0,10),progress=await one('SELECT count FROM progress WHERE user_id=? AND task=? AND day=?',me.id,'water',day),reward=(progress?.count||0)<3?30:0;
   const rs=await db.batch([db.prepare('UPDATE users SET farm_at=?,action=?,action_at=?,points=points+?,coins=coins+? WHERE id=? AND farm_at<=?').bind(now,'water',now,reward,Math.floor(reward/3),me.id,now-2500),db.prepare('UPDATE garden_plots SET watered_at=?,ready_at=CASE WHEN ready_at>? THEN MAX(? ,ready_at-10000) ELSE ready_at END WHERE id=? AND changes()>0').bind(now,now,now+5000,plot.id),db.prepare('INSERT INTO progress(user_id,task,day,count) SELECT ?,?,?,1 WHERE changes()>0 ON CONFLICT(user_id,task,day) DO UPDATE SET count=MIN(count+1,3)').bind(me.id,'water',day)]);
   if(!changes(rs[0]))return result({error:'Bạn thao tác hơi nhanh.'},429);
   return result({ok:true,reward,message:'Đã tưới luống rau. Cây đang lớn sẽ chín sớm hơn!'});
  }
  if(body.action!=='harvest')return result({error:'Hành động không tồn tại.'},400);
  if(crop.ready_at>now)return result({error:'Luống này đang mọc lại. Tưới nước để rau lớn nhanh hơn.'},400);
  const rs=await db.batch([db.prepare('UPDATE users SET farm_at=?,action=?,action_at=?,coins=coins+2,points=points+5 WHERE id=? AND farm_at<=? AND EXISTS(SELECT 1 FROM garden_plots WHERE id=? AND ready_at<=?)').bind(now,'harvest',now,me.id,now-2500,plot.id,now),db.prepare('UPDATE garden_plots SET ready_at=?,harvested_at=? WHERE id=? AND changes()>0').bind(now+45000,now,plot.id),db.prepare('INSERT INTO inventory(user_id,item,quantity) SELECT ?,?,1 WHERE changes()>0 ON CONFLICT(user_id,item) DO UPDATE SET quantity=quantity+1').bind(me.id,'vegetable')]);
  if(!changes(rs[0]))return result({error:'Rau vừa được người khác thu hoạch. Thử luống khác nhé.'},409);
  return result({ok:true,message:'Thu hoạch được 1 bó rau, +2 xu và +5 điểm tốt.'});
 }
 if(route==='steal'){
  if(now-me.theft_at<120000)return result({error:'Sau một vụ trộm, phải chờ 2 phút mới được thử lại.'},429);
  if(await one("SELECT id FROM incidents WHERE culprit=? AND status='open' AND expires>?",me.id,now))return result({error:'Bạn đang liên quan một vụ trộm chưa khép lại.'},409);
  const spot=THEFT_SPOTS[body.spot];if(!spot||typeof spot.id!=='string')return result({error:'Không có đồ để trộm ở đây.'},400);
  let crop=null;
  if(spot.id==='garden'){
   const plot=PLOTS.find(p=>p.id===body.plot);if(!plot||!['garden','village'].includes(me.area))return result({error:'Hãy đến vườn rau.'},400);
   const x=me.area==='village'?plot.x:plot.insideX,z=me.area==='village'?plot.z:plot.insideZ;
   if(Math.hypot(me.x-x,me.z-z)>5)return result({error:'Hãy đứng gần luống rau.'},400);
   crop=(await ensurePlots(ctx)).find(p=>p.id===plot.id);if(crop.ready_at>now)return result({error:'Luống này chưa có rau chín để lấy.'},400);
  }else if(me.area!=='village'||Math.hypot(me.x-spot.x,me.z-spot.z)>6)return result({error:'Hãy đứng gần quầy muốn lấy đồ.'},400);
  const nearby=await all('SELECT id,name,color,hat,area,x,z FROM users WHERE seen>? ORDER BY seen DESC LIMIT 60',now-60000);
  const candidates=nearby.filter(p=>p.id!==me.id).sort((a,b)=>Math.hypot(a.x-spot.x,a.z-spot.z)-Math.hypot(b.x-spot.x,b.z-spot.z)).slice(0,4);
  candidates.push(me);candidates.sort((a,b)=>a.id.localeCompare(b.id));
  const suspects=candidates.map(p=>({id:p.id,name:p.name,place:p.area===me.area&&Math.hypot(p.x-spot.x,p.z-spot.z)<30?'Có mặt gần khu vực':'Có mặt trong làng'}));
  const colors={'#e2a650':'vàng','#6d9e95':'xanh','#c28068':'nâu','#9292b8':'tím'},clue=`Nhặt được mảnh vải màu ${colors[me.color]||'sẫm'} ở hiện trường. ${me.hat?'Dấu vành nón còn in trên đất.':'Không thấy dấu vành nón.'}`;
  const id=crypto.randomUUID(),quorum=Math.min(2,Math.max(1,nearby.filter(p=>p.id!==me.id).length));
  const statements=[db.prepare("UPDATE users SET theft_at=?,action='steal',action_at=? WHERE id=? AND theft_at<=?"+(crop?' AND EXISTS(SELECT 1 FROM garden_plots WHERE id=? AND ready_at<=?)':'')).bind(...[now,now,me.id,now-120000,...(crop?[crop.id,now]:[])])];
  if(crop)statements.push(db.prepare('UPDATE garden_plots SET ready_at=?,harvested_at=? WHERE id=? AND changes()>0').bind(now+45000,now,crop.id));
  statements.push(db.prepare("INSERT INTO incidents(id,culprit,item,location,suspects,clue,quorum,created,expires) SELECT ?,?,?,?,?,?,?,?,? WHERE changes()>0").bind(id,me.id,spot.item,spot.id,JSON.stringify(suspects),clue,quorum,now,now+180000),db.prepare('INSERT INTO inventory(user_id,item,quantity) SELECT ?,?,1 WHERE changes()>0 ON CONFLICT(user_id,item) DO UPDATE SET quantity=quantity+1').bind(me.id,spot.item));
  const rs=await db.batch(statements);if(!changes(rs[rs.length-1]))return result({error:'Không lấy được đồ. Hãy thử lại sau.'},409);
  return result({ok:true,incident:id,message:'Đã lấy đồ! Cảnh báo đỏ vừa vang lên trong làng. Bạn để lại dấu vết ở hiện trường.'});
 }
 const c=await one("SELECT * FROM incidents WHERE id=? AND status='open' AND expires>?",body.incident||'',now);
 if(!c)return result({error:'Vụ việc đã khép lại hoặc hết thời gian điều tra.'},400);
 const suspects=JSON.parse(c.suspects),eliminated=JSON.parse(c.eliminated);
 if(!suspects.some(p=>p.id===body.suspect)||eliminated.includes(body.suspect))return result({error:'Nghi phạm không hợp lệ hoặc đã được loại trừ.'},400);
 if(body.suspect===me.id)return result({error:'Hãy bỏ phiếu cho người bạn nghi ngờ, không phải chính mình.'},400);
 const vote=await one('SELECT created FROM incident_votes WHERE incident_id=? AND voter=?',c.id,me.id);
 if(vote&&now-vote.created<3000)return result({error:'Chờ 3 giây trước khi đổi phiếu.'},429);
 await run('INSERT INTO incident_votes VALUES(?,?,?,?) ON CONFLICT(incident_id,voter) DO UPDATE SET suspect=excluded.suspect,created=excluded.created',c.id,me.id,body.suspect,now);
 const votes=await one('SELECT COUNT(*) AS n FROM incident_votes WHERE incident_id=? AND suspect=? AND voter!=?',c.id,body.suspect,c.culprit);
 if(votes.n<c.quorum)return result({ok:true,message:`Đã ghi nhận phiếu. Cần ${c.quorum} phiếu độc lập để đối chiếu bằng chứng.`});
 if(body.suspect!==c.culprit){eliminated.push(body.suspect);await run('UPDATE incidents SET eliminated=? WHERE id=? AND status=?',JSON.stringify(eliminated),c.id,'open');return result({ok:true,message:'Đối chiếu bằng chứng: nghi phạm này không lấy đồ và được loại trừ. Không ai bị nhốt nhầm.'});}
 const culprit=await one('SELECT name FROM users WHERE id=?',c.culprit);
 const rs=await db.batch([db.prepare("UPDATE incidents SET status='solved',solved_name=? WHERE id=? AND status='open'").bind(culprit.name,c.id),db.prepare("UPDATE users SET area='jail',x=0,z=0,seat='',action='',jailed_until=?,coins=MAX(0,coins-10),position_at=? WHERE id=? AND changes()>0").bind(now+JAIL_SECONDS*1000,now,c.culprit)]);
 if(!changes(rs[0]))return result({error:'Vụ việc vừa được giải quyết.'},409);
 if(c.item==='sanitation')await run('INSERT OR IGNORE INTO toilet_bail(incident,user_id) VALUES(?,?)',c.id,c.culprit);
 await run('UPDATE inventory SET quantity=MAX(0,quantity-1) WHERE user_id=? AND item=?',c.culprit,c.item);
  if(c.item==='hat')await run("UPDATE users SET hat=0 WHERE id=? AND NOT EXISTS(SELECT 1 FROM inventory WHERE user_id=? AND item='hat' AND quantity>0)",c.culprit,c.culprit);
 return result({ok:true,message:`Đúng thủ phạm: ${culprit.name}. Tạm giữ ${JAIL_SECONDS} giây và thu hồi món đồ còn lại.`});
}
