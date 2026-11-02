import {LIVESTOCK_TYPES,LIVESTOCK_CAPACITY,landPen} from '../public/land-data.mjs';
const changes=r=>Number(r?.meta?.changes??r?.changes??0);
export async function livestock({db,me,now,one,body},p,lot){
 if(!['animal_buy','animal_feed','animal_collect'].includes(body.action))return null;
 if(!p.coop_level)throw Error('Hãy xây chuồng chăn nuôi trên đất của bạn trước.');
 const spot=landPen(lot);if(Math.hypot(me.x-spot.x,me.z-spot.z)>7)throw Error('Hãy đứng gần máng ăn của chuồng.');
 if(body.action==='animal_buy'){
  if(p.owner_id!==me.id)throw Error('Chỉ chủ đất được mua thêm vật nuôi.');
  const spec=Object.hasOwn(LIVESTOCK_TYPES,body.kind||'')?LIVESTOCK_TYPES[body.kind]:null;if(!spec)throw Error('Loại vật nuôi không hợp lệ.');
  const nonce=crypto.randomUUID(),allowed='EXISTS(SELECT 1 FROM land_parcels WHERE id=? AND nonce=?)';
  const rs=await db.batch([
   db.prepare('UPDATE land_parcels SET revision=revision+1,nonce=? WHERE id=? AND owner_id=? AND coop_level=1 AND revision=? AND (SELECT COUNT(*) FROM land_animals WHERE parcel_id=?)<? AND EXISTS(SELECT 1 FROM users WHERE id=? AND coins>=?)').bind(nonce,p.id,me.id,p.revision,p.id,LIVESTOCK_CAPACITY,me.id,spec.price),
   db.prepare(`UPDATE users SET coins=coins-? WHERE id=? AND ${allowed}`).bind(spec.price,me.id,p.id,nonce),
   db.prepare(`INSERT INTO land_animals(id,parcel_id,kind) SELECT ?,?,? WHERE ${allowed}`).bind(crypto.randomUUID(),p.id,body.kind,p.id,nonce)
  ]);
  if(!changes(rs[0]))throw Error('Chuồng đã đủ 3 con, thiếu xu hoặc chuồng vừa thay đổi.');
  return {ok:true,message:'Đã đưa '+spec.name.toLowerCase()+' về chuồng. Cho ăn để bắt đầu một lượt lấy sản phẩm.'};
 }
 const animal=await one('SELECT * FROM land_animals WHERE id=? AND parcel_id=?',body.animal||'',p.id),spec=animal&&LIVESTOCK_TYPES[animal.kind];
 if(!spec)throw Error('Vật nuôi không thuộc chuồng này.');
 if(body.action==='animal_feed'){
  if(animal.ready_at)throw Error(animal.ready_at<=now?'Vật nuôi đã có sản phẩm. Chủ đất thu trước rồi cho ăn lượt mới.':'Vật nuôi đã được cho ăn, hãy chờ tới giờ thu sản phẩm.');
  const rs=await db.batch([
   db.prepare("UPDATE land_animals SET fed_at=?,ready_at=?,revision=revision+1 WHERE id=? AND parcel_id=? AND revision=? AND ready_at=0 AND COALESCE((SELECT quantity FROM inventory WHERE user_id=? AND item='feed'),0)>=?").bind(now,now+spec.ms,animal.id,p.id,animal.revision,me.id,spec.feed),
   db.prepare("UPDATE inventory SET quantity=quantity-? WHERE user_id=? AND item='feed' AND changes()>0").bind(spec.feed,me.id),
   db.prepare("UPDATE users SET action='animal_feed',action_at=? WHERE id=? AND changes()>0").bind(now,me.id)
  ]);
  if(!changes(rs[0]))throw Error('Cần '+spec.feed+' phần thức ăn hoặc vật nuôi vừa được người khác cho ăn.');
  return {ok:true,message:'Đã cho '+spec.name.toLowerCase()+' ăn. Có thể thu sản phẩm sau '+spec.ms/1000+' giây.'};
 }
 if(p.owner_id!==me.id)throw Error('Chỉ chủ đất được thu trứng và sữa.');
 if(!animal.ready_at||animal.ready_at>now)throw Error('Chưa có sản phẩm để thu. Hãy cho ăn và chờ đủ thời gian.');
 const rs=await db.batch([
  db.prepare('UPDATE land_animals SET fed_at=0,ready_at=0,revision=revision+1 WHERE id=? AND parcel_id=? AND revision=? AND ready_at>0 AND ready_at<=?').bind(animal.id,p.id,animal.revision,now),
  db.prepare('INSERT INTO inventory(user_id,item,quantity) SELECT ?,?,? WHERE changes()>0 ON CONFLICT(user_id,item) DO UPDATE SET quantity=quantity+excluded.quantity').bind(me.id,spec.product,spec.yield),
  db.prepare("UPDATE users SET points=points+3,action='harvest',action_at=? WHERE id=? AND changes()>0").bind(now,me.id)
 ]);
 if(!changes(rs[0]))throw Error('Sản phẩm vừa được thu.');
 return {ok:true,message:'Đã thu '+spec.yield+(spec.product==='egg'?' trứng gà':' phần sữa')+' và 3 điểm. Mang tới Nhà chính quyền để bán lấy xu.'};
}
