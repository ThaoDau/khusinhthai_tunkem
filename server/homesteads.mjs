import {LAND_LOTS,LAND_RULES,LAND_BUILDS,LAND_SUPPLIES,LAND_CROPS,landBed} from '../public/land-data.mjs';
const changes=r=>Number(r?.meta?.changes??r?.changes??0),result=(data,status=200)=>({data,status});
const kit={wood:6,stone:3,seed:8};
export async function settleLand({db,all,now}){
 const rows=await all('SELECT * FROM land_parcels');
 if(rows.length<LAND_LOTS.length)await db.batch(LAND_LOTS.filter(l=>!rows.some(p=>p.id===l.id)).map(l=>db.prepare('INSERT OR IGNORE INTO land_parcels(id) VALUES(?)').bind(l.id)));
 for(const p of rows){
  if(p.status==='pending'&&p.permit_at<=now){
   const nonce=crypto.randomUUID(),allowed='EXISTS(SELECT 1 FROM land_parcels WHERE id=? AND nonce=?)';
   const batch=[db.prepare("UPDATE land_parcels SET status='approved',revision=revision+1,nonce=? WHERE id=? AND status='pending' AND permit_at<=?").bind(nonce,p.id,now)];
   for(const [item,count]of Object.entries(kit))batch.push(db.prepare(`INSERT INTO inventory(user_id,item,quantity) SELECT ?,?,? WHERE ${allowed} ON CONFLICT(user_id,item) DO UPDATE SET quantity=quantity+excluded.quantity`).bind(p.owner_id,item,count,p.id,nonce));
   for(let bed=0;bed<3;bed++)batch.push(db.prepare(`INSERT OR IGNORE INTO land_beds(parcel_id,bed) SELECT ?,? WHERE ${allowed}`).bind(p.id,bed,p.id,nonce));
   batch.push(db.prepare(`INSERT INTO land_log(parcel_id,text,created) SELECT ?,?,? WHERE ${allowed}`).bind(p.id,'Đã cấp đất '+p.id+' và bộ vật liệu khởi đầu.',now,p.id,nonce));await db.batch(batch);
  }
  for(const kind of ['house','garden','greenhouse'])if(p.status==='approved'&&p[kind+'_ready']>0&&p[kind+'_ready']<=now){
   const level=kind==='house'?'house_level':'garden_level',target=kind==='greenhouse'?2:1;
   await db.batch([db.prepare(`UPDATE land_parcels SET ${level}=?,${kind}_ready=0,revision=revision+1 WHERE id=? AND ${kind}_ready>0 AND ${kind}_ready<=?`).bind(target,p.id,now),db.prepare('INSERT INTO land_log(parcel_id,text,created) SELECT ?,?,? WHERE changes()>0').bind(p.id,'Hoàn thành '+LAND_BUILDS[kind].name.toLowerCase()+' tại '+p.id+'.',now)]);
  }
 }
}
export async function landSnapshot(ctx){
 await settleLand(ctx);const {all,me,now}=ctx;
 const rows=await all('SELECT p.*,u.name AS owner_name FROM land_parcels p LEFT JOIN users u ON u.id=p.owner_id ORDER BY p.id'),beds=await all('SELECT * FROM land_beds');
 return {parcels:rows.map(p=>{const {nonce,purpose,...rest}=p;return {...rest,...LAND_LOTS.find(l=>l.id===p.id),purpose:p.owner_id===me?.id?purpose:undefined,beds:beds.filter(b=>b.parcel_id===p.id)};}),logs:await all('SELECT * FROM land_log ORDER BY id DESC LIMIT 20'),server_time:now};
}
export async function homesteads(ctx){
 const {db,me,now,one,all,body}=ctx,action=body.action;
 try{
  if(me.wf_locked||me.jailed_until>now)return result({error:'Bạn cần rời bàn Ma Sói hoặc hết thời gian tạm giữ trước.'},403);
  await settleLand(ctx);
  const lot=LAND_LOTS.find(l=>l.id===body.parcel),p=lot?await one('SELECT * FROM land_parcels WHERE id=?',lot.id):null;
  const office=()=>{if(me.area!=='government')throw Error('Hãy tới Nhà chính quyền để làm thủ tục và giao dịch.');};
  const near=()=>{if(me.area!=='village'||!lot||Math.hypot(me.x-lot.x,me.z-lot.z)>19)throw Error('Hãy tới lô đất trước khi xây dựng hoặc chăm rau.');};
  if(action==='apply'){
   office();if(!p||p.status!=='vacant')throw Error('Lô này đã có người đăng ký. Hãy chọn lô còn trống.');
   if(await one('SELECT id FROM land_parcels WHERE owner_id=?',me.id))throw Error('Mỗi cư dân được đăng ký một lô đất.');
   const purpose=typeof body.purpose==='string'?body.purpose.trim().slice(0,180):'',title=typeof body.title==='string'?body.title.trim().slice(0,32):'';
   if(purpose.length<8||!title)throw Error('Nhập tên khu nhà và mục đích sử dụng đất (ít nhất 8 ký tự).');
   const nonce=crypto.randomUUID();
   const rs=await db.batch([db.prepare("UPDATE land_parcels SET owner_id=?,status='pending',title=?,purpose=?,applied_at=?,permit_at=?,revision=revision+1,nonce=? WHERE id=? AND status='vacant' AND NOT EXISTS(SELECT 1 FROM land_parcels WHERE owner_id=?) AND EXISTS(SELECT 1 FROM users WHERE id=? AND coins>=?)").bind(me.id,title,purpose,now,now+LAND_RULES.reviewMs,nonce,p.id,me.id,me.id,LAND_RULES.fee),db.prepare('UPDATE users SET coins=coins-? WHERE id=? AND EXISTS(SELECT 1 FROM land_parcels WHERE id=? AND nonce=?)').bind(LAND_RULES.fee,me.id,p.id,nonce)]);
   if(!changes(rs[0]))throw Error('Lô vừa có người đăng ký hoặc bạn chưa đủ 20 xu.');
   return result({ok:true,message:'Đã nhận đơn. Cán bộ làng sẽ cấp đất sau 15 giây.',parcel:p.id});
  }
  if(action==='visit'){
   if(!p)throw Error('Không tìm thấy lô đất.');
   const bed=body.bed,spot=Number.isInteger(bed)&&bed>=0&&bed<3&&p.garden_level?landBed(lot,bed):null,x=spot?.x??lot.x,z=spot?spot.z+2.8:lot.z+10;
   await db.prepare("UPDATE users SET area='village',seat='',action='',x=?,z=?,facing=3.14159,position_at=?,seen=? WHERE id=?").bind(x,z,now,now,me.id).run();
   return result({ok:true,spawn:{x,z,facing:Math.PI},message:'Đã tới '+lot.name+'. Nhấn E gần biển đất hoặc luống rau để tương tác.'});
  }
  if(action==='buy'){
   office();const item=Object.hasOwn(LAND_SUPPLIES,body.item||'')?LAND_SUPPLIES[body.item]:null,count=Number(body.count);
   if(!item||!Number.isInteger(count)||count<1||count>20)throw Error('Chọn vật liệu và số lượng từ 1 đến 20.');
   const rs=await db.batch([db.prepare('UPDATE users SET coins=coins-? WHERE id=? AND coins>=?').bind(item.price*count,me.id,item.price*count),db.prepare('INSERT INTO inventory(user_id,item,quantity) SELECT ?,?,? WHERE changes()>0 ON CONFLICT(user_id,item) DO UPDATE SET quantity=quantity+excluded.quantity').bind(me.id,body.item,count)]);
   if(!changes(rs[0]))throw Error('Bạn chưa đủ xu.');return result({ok:true,message:'Đã mua '+count+' '+item.name.toLowerCase()+'.'});
  }
  if(action==='sell'){
   office();const count=Number(body.count);if(!Number.isInteger(count)||count<1||count>100)throw Error('Chọn từ 1 đến 100 bó rau.');
   const rs=await db.batch([db.prepare("UPDATE inventory SET quantity=quantity-? WHERE user_id=? AND item='vegetable' AND quantity>=?").bind(count,me.id,count),db.prepare('UPDATE users SET coins=coins+? WHERE id=? AND changes()>0').bind(count*LAND_RULES.salePrice,me.id)]);
   if(!changes(rs[0]))throw Error('Bạn chưa có đủ rau để bán.');return result({ok:true,message:'Đã bán '+count+' bó rau, nhận '+count*LAND_RULES.salePrice+' xu.'});
  }
  if(!p||p.status!=='approved')throw Error('Lô đất chưa được cấp phép.');near();
  if(action==='build'){
   if(p.owner_id!==me.id)throw Error('Chỉ chủ đất được xây dựng.');
   const kind=body.kind,c=Object.hasOwn(LAND_BUILDS,kind||'')?LAND_BUILDS[kind]:null;if(!c)throw Error('Công trình không hợp lệ.');
   if(p.house_ready||p.garden_ready||p.greenhouse_ready)throw Error('Đợi công trình hiện tại hoàn thành trước.');
   if(kind==='house'&&p.house_level||kind==='garden'&&p.garden_level||kind==='greenhouse'&&p.garden_level!==1)throw Error('Công trình đã có hoặc cần xây vườn rau trước.');
   const nonce=crypto.randomUUID(),allowed='EXISTS(SELECT 1 FROM land_parcels WHERE id=? AND nonce=?)';
   const enough="EXISTS(SELECT 1 FROM users WHERE id=? AND coins>=?) AND COALESCE((SELECT quantity FROM inventory WHERE user_id=? AND item='wood'),0)>=? AND COALESCE((SELECT quantity FROM inventory WHERE user_id=? AND item='stone'),0)>=?";
   const statements=[db.prepare(`UPDATE land_parcels SET ${kind}_ready=?,revision=revision+1,nonce=? WHERE id=? AND owner_id=? AND revision=? AND ${enough}`).bind(now+c.ms,nonce,p.id,me.id,p.revision,me.id,c.coins,me.id,c.wood,me.id,c.stone),db.prepare(`UPDATE users SET coins=coins-? WHERE id=? AND ${allowed}`).bind(c.coins,me.id,p.id,nonce)];
   for(const item of ['wood','stone'])if(c[item])statements.push(db.prepare(`UPDATE inventory SET quantity=quantity-? WHERE user_id=? AND item=? AND ${allowed}`).bind(c[item],me.id,item,p.id,nonce));
   const rs=await db.batch(statements);if(!changes(rs[0]))throw Error('Thiếu xu/vật liệu hoặc lô đất vừa thay đổi.');return result({ok:true,message:'Đang dựng '+c.name.toLowerCase()+'. Công trình tiếp tục kể cả khi bạn rời game.'});
  }
  const bed=Number(body.bed);if(!Number.isInteger(bed)||bed<0||bed>2||!p.garden_level)throw Error('Hãy xây vườn rau trước.');
  const spot=landBed(lot,bed);if(Math.hypot(me.x-spot.x,me.z-spot.z)>7)throw Error('Hãy đứng gần luống rau.');
  const crop=await one('SELECT * FROM land_beds WHERE parcel_id=? AND bed=?',p.id,bed);
  if(action==='water'){
   if(!crop?.crop||crop.ready_at<=now||crop.watered_at)throw Error('Luống chưa trồng, đã chín hoặc đã được tưới ở vụ này.');
   const rs=await db.batch([db.prepare('UPDATE land_beds SET watered_at=?,ready_at=MAX(?,ready_at-10000),revision=revision+1 WHERE parcel_id=? AND bed=? AND revision=? AND watered_at=0 AND ready_at>?').bind(now,now+1000,p.id,bed,crop.revision,now),db.prepare("UPDATE users SET action='water',action_at=? WHERE id=? AND changes()>0").bind(now,me.id)]);
   if(!changes(rs[0]))throw Error('Luống vừa được người khác tưới.');return result({ok:true,message:'Đã tưới. Rau sẽ chín sớm hơn 10 giây!'});
  }
  if(p.owner_id!==me.id)throw Error('Bạn có thể tưới giúp; chỉ chủ đất được trồng và thu hoạch.');
  if(action==='plant'){
   const seed=Object.hasOwn(LAND_CROPS,body.crop||'')?LAND_CROPS[body.crop]:null;if(!seed||crop?.crop)throw Error('Chọn giống hợp lệ và luống trống.');
   const rs=await db.batch([db.prepare("UPDATE land_beds SET crop=?,planted_at=?,ready_at=?,watered_at=0,revision=revision+1 WHERE parcel_id=? AND bed=? AND crop='' AND EXISTS(SELECT 1 FROM inventory WHERE user_id=? AND item='seed' AND quantity>0)").bind(body.crop,now,now+Math.round(seed.ms*(p.garden_level===2?.75:1)),p.id,bed,me.id),db.prepare("UPDATE inventory SET quantity=quantity-1 WHERE user_id=? AND item='seed' AND changes()>0").bind(me.id)]);
   if(!changes(rs[0]))throw Error('Thiếu hạt giống hoặc luống vừa được trồng.');return result({ok:true,message:'Đã gieo '+seed.name.toLowerCase()+'.'});
  }
  if(action==='harvest'){
   const seed=crop&&LAND_CROPS[crop.crop];if(!seed||crop.ready_at>now)throw Error('Rau chưa chín.');
   const rs=await db.batch([db.prepare("UPDATE land_beds SET crop='',planted_at=0,ready_at=0,watered_at=0,revision=revision+1 WHERE parcel_id=? AND bed=? AND revision=? AND ready_at<=? AND crop!=''").bind(p.id,bed,crop.revision,now),db.prepare("INSERT INTO inventory(user_id,item,quantity) SELECT ?,'vegetable',? WHERE changes()>0 ON CONFLICT(user_id,item) DO UPDATE SET quantity=quantity+excluded.quantity").bind(me.id,seed.yield),db.prepare("UPDATE users SET points=points+5,action='harvest',action_at=? WHERE id=? AND changes()>0").bind(now,me.id)]);
   if(!changes(rs[0]))throw Error('Luống vừa được thu hoạch.');return result({ok:true,message:'Thu được '+seed.yield+' bó rau và 5 điểm. Mang rau tới Nhà chính quyền để bán lấy xu.'});
  }
  throw Error('Thao tác đất đai không hợp lệ.');
 }catch(e){return result({error:e.message?.includes('UNIQUE')?'Bạn vừa đăng ký một lô đất khác. Mỗi cư dân chỉ được một lô.':e.message||'Chưa thể xử lý đất đai.'},400);}
}
