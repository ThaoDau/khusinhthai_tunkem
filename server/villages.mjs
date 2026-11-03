export const brandVillage=v=>v&&v.id==='thao-dau'&&v.name==='Thảo Đậu'?{...v,name:'Khu sinh thái Địa Ngục'}:v;
// Accounts and sessions are global. Every village owns an isolated set of gameplay tables.
export const GAME_TABLES=['users','teams','messages','progress','cases','votes','inventory','garden_plots','incidents','incident_votes','wf_rooms','wf_messages','land_parcels','land_beds','land_log','land_animals','toilet_visits','toilet_camera','toilet_bail'];
export function villageDatabase(root,id){
 if(id==='thao-dau')return root;
 if(!/^v_[a-f0-9]{32}$/.test(id))throw Error('Làng không hợp lệ.');
 const names=new Set(GAME_TABLES),prefix=id+'_';
 const sql=s=>s.replace(/'(?:''|[^'])*'|[A-Za-z_][A-Za-z_0-9]*/g,t=>names.has(t)?prefix+t:t);
 return {prepare:s=>root.prepare(sql(s)),batch:ss=>root.batch(ss)};
}
export async function villageDirectory(root){return (await root.prepare('SELECT v.id,v.name,v.description,v.owner_id,a.name AS chief_name,(SELECT COUNT(*) FROM accounts m WHERE m.village_id=v.id) AS members FROM villages v LEFT JOIN accounts a ON a.id=v.owner_id ORDER BY v.created,v.id LIMIT 100').all()).results.map(brandVillage);}
export async function villageAction({root,account,body,now}){
 const result=(data,status=200)=>({data,status}),a=body.action;
 if(a==='edit'){
  const name=typeof body.name==='string'?body.name.trim().slice(0,32):'',description=typeof body.description==='string'?body.description.trim().slice(0,180):'';
  if(name.length<3)return result({error:'Tên làng cần 3–32 ký tự.'},400);
  const r=await root.prepare('UPDATE villages SET name=?,description=? WHERE id=? AND owner_id=?').bind(name,description,account.village_id,account.id).run();
  return (r.meta?.changes??r.changes)?result({ok:true,message:'Đã cập nhật làng.'}):result({error:'Chỉ trưởng làng được sửa thông tin làng.'},403);
 }
 if(account.village_id)return result({error:'Bạn đã là cư dân một làng. Bản này chưa hỗ trợ chuyển làng.'},409);
 if(!['create','join'].includes(a))return result({error:'Chọn lập làng hoặc gia nhập làng.'},400);
 const id=a==='create'?'v_'+crypto.randomUUID().replaceAll('-',''):body.village;
 if(a==='join'&&!await root.prepare('SELECT id FROM villages WHERE id=?').bind(typeof id==='string'?id:'').first())return result({error:'Làng không còn tồn tại.'},404);
 const db=villageDatabase(root,id),steps=[];
 if(a==='create'){
  const name=typeof body.name==='string'?body.name.trim().slice(0,32):'',description=typeof body.description==='string'?body.description.trim().slice(0,180):'';
  if(name.length<3)return result({error:'Tên làng cần 3–32 ký tự.'},400);
  if(await root.prepare('SELECT id FROM villages WHERE name=?').bind(name).first())return result({error:'Tên làng đã có người dùng.'},409);
  // Clone the current authoritative schema, including constraints and indexes, before atomically assigning membership.
  const schema=(await root.prepare("SELECT type,name,tbl_name,sql FROM sqlite_master WHERE type IN ('table','index') AND sql IS NOT NULL ORDER BY CASE type WHEN 'table' THEN 0 ELSE 1 END").all()).results.filter(r=>GAME_TABLES.includes(r.tbl_name));
  const names=new Set([...GAME_TABLES,...schema.filter(r=>r.type==='index').map(r=>r.name)]);
  for(const row of schema){const sql=row.sql.replace(/'(?:''|[^'])*'|[A-Za-z_][A-Za-z_0-9]*/g,t=>names.has(t)?id+'_'+t:t);steps.push(root.prepare(sql));}
  steps.push(root.prepare('INSERT INTO villages(id,name,description,owner_id,created) SELECT ?,?,?,?,? WHERE EXISTS(SELECT 1 FROM accounts WHERE id=? AND village_id IS NULL)').bind(id,name,description,account.id,now,account.id));
 }
 const membershipIndex=steps.length;
 steps.push(root.prepare('UPDATE accounts SET village_id=? WHERE id=? AND village_id IS NULL AND EXISTS(SELECT 1 FROM villages WHERE id=?)').bind(id,account.id,id),db.prepare("INSERT INTO users(id,username,name,salt,hash,color,seen,area,x,z) SELECT ?,?,?,?,?,?,?,'village',0,10 WHERE changes()>0").bind(account.id,account.username,account.name,account.salt,account.hash,account.color,now));
 const rs=await root.batch(steps);if(!(rs[membershipIndex].meta?.changes??rs[membershipIndex].changes))return result({error:'Bạn vừa chọn làng ở cửa sổ khác. Tải lại để tiếp tục.'},409);
 return result({ok:true,message:a==='create'?'Làng mới đã ra đời! Bạn là trưởng làng.':'Chào mừng cư dân mới!',village:id});
}
