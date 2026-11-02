import {TOILETS} from '../public/world-data.mjs';
const result=(data,status=200)=>({data,status});
const dayOf=t=>new Date(t+25200000).toISOString().slice(0,10);
export async function sanitationSnapshot({all,one,run,db,now,me}){
 const noon=Date.parse(dayOf(now)+'T05:00:00Z')-(new Date(now+25200000).getUTCHours()<12?86400000:0);
 const dirty=await all('SELECT * FROM toilet_visits WHERE (flushed=0 OR wiped=0) AND incident IS NULL AND finished<=? ORDER BY created LIMIT 16',noon);
 for(const v of dirty){
  const camera=await all('SELECT user_id AS id,name,created FROM toilet_camera WHERE created>=? AND created<=? ORDER BY created DESC LIMIT 30',v.created-300000,v.finished+60000),owner=await one('SELECT id,name FROM users WHERE id=?',v.user_id);if(!owner)continue;
  const suspects=[...new Map([...camera,owner].map(p=>[p.id,{id:p.id,name:p.name,place:p.created?'Camera cửa · '+new Date(p.created+25200000).toISOString().slice(11,19)+' giờ Việt Nam':'Có mặt gần thời điểm bỏ bẩn'}])).values()],id='wc-'+v.id;
  const eligible=await one('SELECT COUNT(*) AS n FROM users WHERE seen>? AND id!=?',now-25000,v.user_id),quorum=Math.max(2,Math.min(3,eligible.n));
  await db.batch([db.prepare('UPDATE toilet_visits SET incident=? WHERE id=? AND incident IS NULL AND (flushed=0 OR wiped=0)').bind(id,v.id),db.prepare("INSERT OR IGNORE INTO incidents(id,culprit,item,location,suspects,clue,quorum,created,expires) SELECT ?,?,'sanitation','toilet',?,?,?,?,? WHERE changes()>0").bind(id,v.user_id,JSON.stringify(suspects),'Cô lao công kiểm tra 12:00: có vệt vàng chưa xả/lau. Camera chỉ ghi cửa ra vào. Cùng đối chiếu và bỏ phiếu.',quorum,now,now+900000)]);
 }
 await run('DELETE FROM toilet_camera WHERE created<?',now-172800000);
 return {sanitation:{today:me?await all('SELECT id,kind,created,finished,flushed,wiped FROM toilet_visits WHERE user_id=? AND day=? ORDER BY created DESC',me.id,dayOf(now)):[],stains:(await one('SELECT COUNT(*) AS n FROM toilet_visits WHERE flushed=0 OR wiped=0')).n,nextInspection:noon+86400000,bail:await all('SELECT b.incident,b.user_id,u.name,u.jailed_until FROM toilet_bail b JOIN users u ON u.id=b.user_id WHERE b.paid_by IS NULL AND u.jailed_until>?',now)}};
}
export async function sanitation({body,db,me,now,one,all}){
 if(me.wf_locked||me.jailed_until>now)return result({error:'Bạn đang trong trận Ma Sói hoặc tạm giữ. Nhờ bạn bè chuộc hoặc chờ hết giờ.'},403);
 if(body.action==='bail'){
  const b=await one('SELECT b.*,u.jailed_until FROM toilet_bail b JOIN users u ON u.id=b.user_id WHERE b.incident=?',body.incident||'');
  if(!b||b.paid_by||b.jailed_until<=now||b.user_id===me.id)return result({error:'Không có người bạn cần chuộc.'},400);
  const rs=await db.batch([db.prepare('UPDATE users SET coins=coins-20 WHERE id=? AND coins>=20 AND EXISTS(SELECT 1 FROM toilet_bail WHERE incident=? AND paid_by IS NULL)').bind(me.id,b.incident),db.prepare('UPDATE toilet_bail SET paid_by=? WHERE incident=? AND paid_by IS NULL AND changes()>0').bind(me.id,b.incident),db.prepare("UPDATE users SET jailed_until=0,area='village',x=50,z=75,position_at=? WHERE id=? AND changes()>0").bind(now,b.user_id),db.prepare("UPDATE cases SET status='resolved' WHERE id=? AND changes()>0").bind(b.incident)]);
  return (rs[0].meta?.changes??rs[0].changes)?result({ok:true,message:'Đã trả 20 xu trong game, bạn của bạn được về làng.'}):result({error:'Chưa đủ 20 xu hoặc đã có người chuộc.'},409);
 }
 if(me.area!=='toilet')return result({error:'Hãy đến Nhà xí trước.'},400);
 if(body.action==='use'){
  if(!['pee','poop'].includes(body.kind))return result({error:'Chọn đi tiểu hoặc đi nặng.'},400);
  const last=await one('SELECT * FROM toilet_visits WHERE user_id=? ORDER BY created DESC LIMIT 1',me.id);
  if(last&&now-last.created<30000)return result({error:'Chờ 30 giây giữa hai lần nhé.'},429);
  if(last&&(!last.flushed||!last.wiped))return result({error:'Hãy xả nước và lau bồn lần trước.'},400);
  const taken=new Set((await all("SELECT seat FROM users WHERE area='toilet' AND seat LIKE 'wc-%' AND seen>? AND id!=?",now-25000,me.id)).map(u=>u.seat));
  if(taken.has(body.stall))return result({error:'Buồng này có người rồi.'},409);
  const stall=TOILETS.find(t=>t.id===body.stall)||TOILETS.filter(t=>!taken.has(t.id)).sort((a,b)=>Math.hypot(me.x-a.x,me.z-a.z)-Math.hypot(me.x-b.x,me.z-b.z))[0];
  if(!stall)return result({error:'Các buồng đều có người. Chờ một chút nhé.'},409);
  const id=crypto.randomUUID(),duration=body.kind==='pee'?6000:10000;
  const rs=await db.batch([db.prepare('INSERT INTO toilet_visits(id,user_id,day,kind,created,finished) SELECT ?,?,?,?,?,? WHERE NOT EXISTS(SELECT 1 FROM toilet_visits WHERE user_id=? AND created>?) AND NOT EXISTS(SELECT 1 FROM users WHERE area=? AND seat=? AND seen>? AND id!=?)').bind(id,me.id,dayOf(now),body.kind,now,now+duration,me.id,now-30000,'toilet',stall.id,now-25000,me.id),db.prepare('UPDATE users SET action=?,action_at=?,seat=?,x=?,z=?,facing=?,position_at=?,seen=? WHERE id=? AND changes()>0').bind('need_'+body.kind,now,stall.id,stall.x,stall.z,stall.facing,now,now,me.id)]);
  if(!(rs[0].meta?.changes??rs[0].changes))return result({error:'Bạn vừa thực hiện rồi.'},409);
  return result({ok:true,duration,message:'Đang đi vệ sinh… xong nhớ xả nước và lau bồn.'});
 }
 if(!['flush','wipe'].includes(body.action))return result({error:'Thao tác không hợp lệ.'},400);
 const v=await one('SELECT * FROM toilet_visits WHERE id=? AND user_id=?',body.visit||'',me.id);
 if(!v||v.finished>now)return result({error:'Chờ đi xong rồi vệ sinh bồn nhé.'},400);
 const col=body.action==='flush'?'flushed':'wiped';
 await db.batch([db.prepare('UPDATE toilet_visits SET '+col+'=1 WHERE id=? AND '+col+'=0').bind(v.id),db.prepare("INSERT INTO progress(user_id,task,day,count) SELECT ?,'clean',?,1 WHERE changes()>0 AND EXISTS(SELECT 1 FROM toilet_visits WHERE id=? AND flushed=1 AND wiped=1) ON CONFLICT(user_id,task,day) DO UPDATE SET count=count+1").bind(me.id,v.day,v.id),db.prepare("UPDATE users SET action='relieved',action_at=?,points=points+CASE WHEN (SELECT count FROM progress WHERE user_id=? AND task='clean' AND day=?)<=2 THEN 20 ELSE 0 END,coins=coins+CASE WHEN (SELECT count FROM progress WHERE user_id=? AND task='clean' AND day=?)<=2 THEN 6 ELSE 0 END WHERE id=? AND changes()>0").bind(now,me.id,v.day,me.id,v.day,me.id)]);
 return result({ok:true,message:body.action==='flush'?'Đã xả nước. Nhớ lau bồn nữa nhé.':'Đã lau bồn. Đủ xả + lau mới tính nhiệm vụ (2 lần/ngày).'});
}
