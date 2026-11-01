import {active,createWolfRoom,startWolfGame,submitWolfAction,advanceWolfGame,leaveWolfRoom,projectWolfRoom,wolfChannel,finishIfWon} from './werewolf-engine.mjs';
import {wolfSeat} from '../public/werewolf-data.mjs';
const changes=r=>Number(r?.meta?.changes??r?.changes??0),answer=(data,status=200)=>({data,status});
function arrange(s){const ps=s.players.filter(p=>!p.left);ps.forEach((p,i)=>p.seat=wolfSeat(i,ps.length));}
export async function werewolf(ctx){
 const {db,me,now,one,all,run,body}=ctx,action=body.action||'list';
 try{
  await run('UPDATE users SET seen=? WHERE id=?',now,me.id);
  if(action==='list'){
   const rows=await all('SELECT id,title,state,updated FROM wf_rooms WHERE updated>? ORDER BY updated DESC LIMIT 30',now-21600000);
   return answer({rooms:rows.map(r=>{const s=JSON.parse(r.state);return {id:r.id,title:r.title,phase:s.phase,host:s.players.find(p=>p.id===s.host)?.name||'',count:s.players.filter(p=>!p.left).length};}).filter(r=>r.count>0),current:me.wf_room||null,server_time:now});
  }
  if(['create','join'].includes(action)){
   if(me.jailed_until>now)throw Error('Hãy chờ hết thời gian tạm giữ trước khi vào Ma Sói.');
   if(await one("SELECT id FROM incidents WHERE culprit=? AND status='open' AND expires>?",me.id,now))throw Error('Bạn cần khép lại vụ trộm đang liên quan trước khi vào Ma Sói.');
   if(me.wf_room&&me.wf_room!==body.room)throw Error('Hãy rời phòng hiện tại trước.');
  }
  if(action==='create'){
   if(me.wf_room)throw Error('Bạn đang ở một phòng Ma Sói.');
   const id=crypto.randomUUID(),title=typeof body.title==='string'?body.title.trim().slice(0,36)||'Đêm Thảo Đậu':'Đêm Thảo Đậu',s=createWolfRoom(me,now);arrange(s);const seat=s.players[0].seat;
   const rs=await db.batch([db.prepare("UPDATE users SET wf_room=?,wf_locked=1,area='werewolf',seat='',action='',x=?,z=?,facing=?,position_at=? WHERE id=? AND wf_room IS NULL AND jailed_until<=?").bind(id,seat.x,seat.z,seat.facing,now,me.id,now),db.prepare('INSERT INTO wf_rooms(id,title,state,nonce,updated) SELECT ?,?,?,?,? WHERE changes()>0').bind(id,title,JSON.stringify(s),crypto.randomUUID(),now)]);
   if(!changes(rs[0]))return answer({error:'Bạn vừa vào phòng khác. Tải lại bảng Ma Sói.'},409);
   return answer({room:projectWolfRoom({id,title},s,me.id,now)});
  }
  const roomId=typeof body.room==='string'?body.room:me.wf_room;if(!roomId)throw Error('Bạn chưa tham gia phòng Ma Sói.');
  for(let attempt=0;attempt<4;attempt++){
   const row=await one('SELECT * FROM wf_rooms WHERE id=?',roomId);if(!row)throw Error('Phòng không còn tồn tại.');const s=JSON.parse(row.state),member=s.players.find(p=>p.id===me.id);
   if(action!=='join'&&!member)throw Error('Bạn không thuộc phòng này.');
   const activity=await all('SELECT id,seen FROM users WHERE wf_room=?',roomId),seen=new Map(activity.map(p=>[p.id,p.seen]));
   let changed=false,reposition=false,clearMe=false;const staleLobby=[];
   if(s.phase==='lobby'){
    for(const p of s.players)if(!p.left&&p.id!==me.id&&now-(seen.get(p.id)||row.updated)>90000){p.left=true;staleLobby.push(p.id);changed=true;reposition=true;}
   }else if(active(s)){
    for(const p of s.players)if(p.alive&&!p.left&&now-(seen.get(p.id)||row.updated)>90000){p.alive=false;s.logs.push({text:p.name+' mất kết nối quá 90 giây và bị tính loại.',round:s.round,phase:s.phase});changed=true;}
    if(changed)finishIfWon(s);
   }
   if(!s.players.some(p=>p.id===s.host&&!p.left&&(seen.get(p.id)||0)>now-60000)){const next=s.players.find(p=>!p.left&&(seen.get(p.id)||0)>now-25000);if(next&&next.id!==s.host){s.host=next.id;changed=true;}}
   if(advanceWolfGame(s,now))changed=true;
   if(action==='join'){
    if(s.phase!=='lobby')throw Error('Trận đã bắt đầu. Hãy vào một phòng đang chờ.');
    if(member&&!member.left&&me.wf_room===roomId)return answer({room:projectWolfRoom(row,s,me.id,now)});
    if(s.players.filter(p=>!p.left).length>=12)throw Error('Phòng đã đủ 12 người.');
    if(member)Object.assign(member,{left:false,alive:true,name:me.name,color:me.color});else s.players.push({id:me.id,name:me.name,color:me.color,alive:true,left:false});changed=true;reposition=true;
   }else if(action==='start'){
    if(me.wf_room!==roomId||member.left)throw Error('Bạn không còn ở phòng này.');
    if(s.players.some(p=>!p.left&&p.id!==me.id&&(seen.get(p.id)||0)<now-30000))throw Error('Có người chưa kết nối. Đợi bạn quay lại hoặc phòng sẽ tự loại chỗ vắng sau 90 giây.');
    startWolfGame(s,me.id,now);changed=true;reposition=true;
   }else if(action==='act'){
    if(me.wf_room!==roomId||member.left)throw Error('Bạn đã rời trận.');
    submitWolfAction(s,me.id,body.kind,typeof body.target==='string'?body.target:null,now);changed=true;
   }else if(action==='leave'){
    leaveWolfRoom(s,me.id);changed=true;reposition=s.phase==='lobby';clearMe=true;
   }else if(action==='replay'){
    if(s.host!==me.id||s.phase!=='finished')throw Error('Chỉ chủ phòng được mở ván mới khi trận đã kết thúc.');
    const ids=new Set(activity.map(p=>p.id));s.players=s.players.filter(p=>!p.left&&ids.has(p.id));s.players.forEach(p=>p.alive=true);s.phase='lobby';s.game++;s.round=0;s.deadline=0;s.roles={};s.night={};s.votes={};s.visions={};s.guardLast=null;s.logs=[{text:'Ván mới đang chờ. Vai sẽ được chia lại ngẫu nhiên.',round:0,phase:'lobby'}];s.winner=null;changed=true;reposition=true;
   }else if(!['state','chat'].includes(action))throw Error('Chức năng Ma Sói không tồn tại.');
   if(reposition)arrange(s);
   if(changed){
    const nonce=crypto.randomUUID(),guard=action==='join'?' AND EXISTS(SELECT 1 FROM users WHERE id=? AND (wf_room IS NULL OR wf_room=?))':'';
    const args=[JSON.stringify(s),nonce,now,row.id,row.version,...(action==='join'?[me.id,roomId]:[])];
    const statements=[db.prepare('UPDATE wf_rooms SET state=?,nonce=?,updated=?,version=version+1 WHERE id=? AND version=?'+guard).bind(...args)];
    const permission='EXISTS(SELECT 1 FROM wf_rooms WHERE id=? AND nonce=?)';
    for(const id of staleLobby)statements.push(db.prepare(`UPDATE users SET wf_room=NULL,wf_locked=0,area='village',seat='',action='',x=-20,z=77,position_at=? WHERE id=? AND wf_room=? AND ${permission}`).bind(now,id,roomId,roomId,nonce));
    for(const p of s.players.filter(p=>!p.left)){
     if(reposition){const seat=p.seat;statements.push(db.prepare(`UPDATE users SET wf_room=?,wf_locked=?,area='werewolf',seat='',action='',x=?,z=?,facing=?,position_at=? WHERE id=? AND (wf_room=? OR id=?) AND jailed_until<=? AND ${permission}`).bind(roomId,s.phase==='finished'?0:1,seat.x,seat.z,seat.facing,now,p.id,roomId,action==='join'?me.id:'',now,roomId,nonce));}
     else if(s.phase==='finished')statements.push(db.prepare(`UPDATE users SET wf_locked=0 WHERE id=? AND wf_room=? AND ${permission}`).bind(p.id,roomId,roomId,nonce));
    }
    if(clearMe)statements.push(db.prepare(`UPDATE users SET wf_room=NULL,wf_locked=0,area='village',seat='',action='',x=-20,z=77,position_at=? WHERE id=? AND wf_room=? AND ${permission}`).bind(now,me.id,roomId,roomId,nonce));
    const rs=await db.batch(statements);if(!changes(rs[0]))continue;row.version++;
   }
   if(clearMe)return answer({left:true,room:null,server_time:now});
   if(action==='chat'){
    const channel=body.channel||'table',text=typeof body.text==='string'?body.text.trim().slice(0,300):'';wolfChannel(s,me.id,channel,Boolean(text));
    if(text){const last=await one('SELECT created FROM wf_messages WHERE user_id=? ORDER BY id DESC LIMIT 1',me.id);if(last&&now-last.created<1000)return answer({error:'Bạn nhắn hơi nhanh. Chờ một giây nhé.'},429);await run('INSERT INTO wf_messages(room_id,game,channel,user_id,name,body,created) VALUES(?,?,?,?,?,?,?)',roomId,s.game,channel,me.id,me.name,text,now);}
    return answer({messages:(await all('SELECT id,user_id,name,body,created FROM wf_messages WHERE room_id=? AND game=? AND channel=? ORDER BY id DESC LIMIT 40',roomId,s.game,channel)).reverse(),room:projectWolfRoom(row,s,me.id,now)});
   }
   const projection=projectWolfRoom(row,s,me.id,now);projection.players.forEach(p=>p.online=(seen.get(p.id)||0)>now-25000||p.id===me.id);
   const channel=active(s)&&!member?.alive?'ghost':s.phase==='night'&&s.roles[me.id]==='wolf'?'pack':'table';
   const messages=member&&!member.left?(await all('SELECT id,user_id,name,body,created FROM wf_messages WHERE room_id=? AND game=? AND channel=? ORDER BY id DESC LIMIT 40',roomId,s.game,channel)).reverse():[];
   return answer({room:projection,channel,messages});
  }
  return answer({error:'Phòng đang cập nhật. Thử lại sau một chút.'},409);
 }catch(e){return answer({error:e.message||'Không thể xử lý Ma Sói.'},400);}
}
