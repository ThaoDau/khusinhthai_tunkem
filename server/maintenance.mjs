// Temporary, narrowly scoped operator action. Disabled unless an expiring secret is configured.
export async function maintenance(req,env){
 const reply=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
 let cfg;try{cfg=JSON.parse(env.ACCOUNT_CLEANUP_ONCE||'null');}catch{}
 if(req.method!=='POST'||!cfg||cfg.expires<Date.now()||req.headers.get('x-cleanup-key')!==cfg.key)return reply({error:'Not found'},404);
 const ids=['28a63262-f603-4169-a1fa-53d49c0cea2b','96938a4d-c952-4418-911f-7ca530d37d7b'],db=env.DB;
 const accounts=(await db.prepare('SELECT id,village_id FROM accounts').all()).results;
 if(!accounts.length)return reply({ok:true,accounts:0,alreadyCompleted:true});
 if(accounts.length!==2||accounts.some(a=>!ids.includes(a.id)||a.village_id!=='thao-dau'))return reply({error:'Account set changed; no data deleted.'},409);
 const refs='(?,?)',steps=[],add=(sql,args=ids)=>steps.push(db.prepare(sql).bind(...args));
 // Remove dependants before their parent records; retain village and vacant parcel geometry.
 for(const t of ['land_animals','land_beds','land_log'])add(`DELETE FROM ${t} WHERE parcel_id IN (SELECT id FROM land_parcels WHERE owner_id IN ${refs})`);
 add(`UPDATE land_parcels SET owner_id=NULL,status='vacant',title='',purpose='',applied_at=0,permit_at=0,house_level=0,house_ready=0,garden_level=0,garden_ready=0,greenhouse_ready=0,coop_level=0,coop_ready=0,nonce='',revision=revision+1 WHERE owner_id IN ${refs}`);
 add(`DELETE FROM incident_votes WHERE voter IN ${refs} OR incident_id IN (SELECT id FROM incidents WHERE culprit IN ${refs})`,[...ids,...ids]);
 add(`DELETE FROM incidents WHERE culprit IN ${refs}`);
 add(`DELETE FROM votes WHERE user_id IN ${refs} OR case_id IN (SELECT id FROM cases WHERE plaintiff IN ${refs} OR defendant IN ${refs})`,[...ids,...ids,...ids]);
 add(`DELETE FROM cases WHERE plaintiff IN ${refs} OR defendant IN ${refs}`,[...ids,...ids]);
 for(const t of ['inventory','progress','toilet_visits','toilet_camera','toilet_bail','sessions'])add(`DELETE FROM ${t} WHERE user_id IN ${refs}`);
 // No other residents were present in this verified world. Clear its chat history and empty wolf rooms.
 add('DELETE FROM messages',[]);add('DELETE FROM wf_messages',[]);add('DELETE FROM wf_rooms',[]);
 add(`UPDATE users SET team=NULL WHERE team IN (SELECT id FROM teams WHERE owner IN ${refs})`);
 add(`DELETE FROM teams WHERE owner IN ${refs}`);add(`DELETE FROM users WHERE id IN ${refs}`);
 add(`UPDATE villages SET owner_id=NULL WHERE owner_id IN ${refs}`);add(`DELETE FROM accounts WHERE id IN ${refs}`);
 await db.batch(steps);
 return reply({ok:true,deletedAccounts:2,accounts:(await db.prepare('SELECT COUNT(*) AS n FROM accounts').first()).n,messages:(await db.prepare('SELECT COUNT(*) AS n FROM messages').first()).n,sessions:(await db.prepare('SELECT COUNT(*) AS n FROM sessions').first()).n,ownedParcels:(await db.prepare('SELECT COUNT(*) AS n FROM land_parcels WHERE owner_id IS NOT NULL').first()).n});
}
