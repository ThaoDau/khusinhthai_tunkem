import {WOLF_TIMES,wolfSeat} from '../public/werewolf-data.mjs';
export const active=s=>['night','discussion','vote'].includes(s.phase);
const living=s=>s.players.filter(p=>p.alive&&!p.left);
function log(s,text){s.logs.push({text,round:s.round,phase:s.phase});s.logs=s.logs.slice(-40);}
function plurality(values){const counts=new Map();for(const v of values)if(v)counts.set(v,(counts.get(v)||0)+1);const ranked=[...counts].sort((a,b)=>b[1]-a[1]);return ranked.length&&(!ranked[1]||ranked[0][1]>ranked[1][1])?ranked[0][0]:null;}
function eliminate(s,id,reason){const p=s.players.find(p=>p.id===id);if(!p||!p.alive)return;p.alive=false;log(s,`${p.name} ${reason}. Vai được công bố: ${s.roles[id]==='wolf'?'Ma Sói':s.roles[id]==='seer'?'Tiên tri':s.roles[id]==='guard'?'Bảo vệ':'Dân làng'}.`);}
export function finishIfWon(s){const alive=living(s),wolves=alive.filter(p=>s.roles[p.id]==='wolf').length,town=alive.length-wolves;if(!wolves||wolves>=town){s.phase='finished';s.winner=!alive.length?'draw':wolves?'wolf':'village';s.deadline=0;log(s,!alive.length?'Không còn người chơi. Trận hòa.':wolves?'Bầy Sói chiến thắng.':'Dân làng chiến thắng!');return true;}return false;}
export function createWolfRoom(host,now){return {phase:'lobby',round:0,game:1,host:host.id,deadline:0,winner:null,players:[{id:host.id,name:host.name,color:host.color,alive:true,left:false}],roles:{},night:{},votes:{},visions:{},guardLast:null,logs:[{text:'Phòng đã mở. Cần 4–12 người để bắt đầu.',round:0,phase:'lobby'}]};}
export function startWolfGame(s,actor,now,random=n=>crypto.getRandomValues(new Uint32Array(1))[0]%n){
 if(s.host!==actor)throw Error('Chỉ chủ phòng được bắt đầu.');if(s.phase!=='lobby')throw Error('Trận đã bắt đầu.');
 s.players=s.players.filter(p=>!p.left);const n=s.players.length;if(n<4||n>12)throw Error('Cần từ 4 đến 12 người.');
 const wolves=n>=9?3:n>=6?2:1,roles=[...Array(wolves).fill('wolf'),'seer','guard',...Array(n-wolves-2).fill('villager')];
 for(let i=roles.length-1;i>0;i--){const j=random(i+1);[roles[i],roles[j]]=[roles[j],roles[i]];}
 s.roles={};s.players.forEach((p,i)=>{p.alive=true;p.left=false;s.roles[p.id]=roles[i];});
 s.phase='night';s.round=1;s.deadline=now+WOLF_TIMES.night;s.night={};s.votes={};s.visions={};s.guardLast=null;s.winner=null;
 log(s,'Đêm đầu tiên buông xuống. Mỗi người chỉ biết vai của mình.');
}
export function submitWolfAction(s,actor,kind,target,now){
 const p=s.players.find(p=>p.id===actor&&!p.left);if(!p||!p.alive)throw Error('Người đã bị loại chỉ được theo dõi và chat linh hồn.');
 if(now>=s.deadline)throw Error('Lượt này đã hết giờ.');
 if(s.phase==='vote'){
  if(kind!=='vote')throw Error('Hiện tại chỉ được bỏ phiếu.');
  if(target&&(!living(s).some(p=>p.id===target)||target===actor))throw Error('Chọn một người còn sống khác hoặc bỏ qua.');s.votes[actor]=target||null;return;
 }
 if(s.phase!=='night')throw Error('Hãy thảo luận, chưa đến lượt dùng năng lực.');
 const role=s.roles[actor],expected={wolf:'bite',seer:'see',guard:'protect'}[role];
 if(!expected||kind!==expected)throw Error('Vai của bạn không có năng lực đó.');
 if(!living(s).some(p=>p.id===target))throw Error('Mục tiêu phải còn sống.');
 if(role==='wolf'&&s.roles[target]==='wolf')throw Error('Sói không cắn đồng đội.');
 if(role==='seer'&&target===actor)throw Error('Tiên tri không soi chính mình.');
 if(role==='guard'&&target===s.guardLast)throw Error('Không bảo vệ cùng một người hai đêm liên tiếp.');
 s.night[actor]={kind,target};
}
export function advanceWolfGame(s,now){
 if(!active(s)||now<s.deadline)return false;
 if(s.phase==='night'){
  const choices=Object.entries(s.night).filter(([id])=>living(s).some(p=>p.id===id)),victim=plurality(choices.filter(([id])=>s.roles[id]==='wolf').map(([,a])=>a.target));
  const guard=choices.find(([id])=>s.roles[id]==='guard'),protectedId=guard?.[1].target;s.guardLast=protectedId||null;
  for(const [id,a]of choices)if(s.roles[id]==='seer'){(s.visions[id]??=[]).push({round:s.round,target:a.target,wolf:s.roles[a.target]==='wolf'});}
  if(victim&&victim!==protectedId)eliminate(s,victim,'đã bị Sói loại trong đêm');else log(s,'Đêm qua không có ai bị loại.');
  if(finishIfWon(s))return true;s.phase='discussion';s.deadline=now+WOLF_TIMES.discussion;log(s,'Trời sáng. Cả làng bắt đầu thảo luận.');
 }else if(s.phase==='discussion'){s.phase='vote';s.votes={};s.deadline=now+WOLF_TIMES.vote;log(s,'Đến giờ bỏ phiếu. Hòa phiếu hoặc bỏ qua nhiều nhất thì không treo ai.');}
 else{
  const eligible=living(s),values=eligible.filter(p=>Object.hasOwn(s.votes,p.id)).map(p=>s.votes[p.id]);
  const skipped=values.filter(v=>!v).length,target=plurality(values),count=target?values.filter(v=>v===target).length:0;
  if(target&&count>skipped)eliminate(s,target,'đã bị cả làng treo cổ');else log(s,'Không có người bị treo cổ vì hòa phiếu hoặc bỏ qua.');
  if(finishIfWon(s))return true;
  if(s.round>=20){s.phase='finished';s.winner='draw';s.deadline=0;log(s,'Trận hòa sau 20 đêm.');return true;}
  s.round++;s.phase='night';s.night={};s.votes={};s.deadline=now+WOLF_TIMES.night;log(s,'Đêm mới bắt đầu.');
 }
 return true;
}
export function leaveWolfRoom(s,id){const p=s.players.find(p=>p.id===id);if(!p)return;p.left=true;if(active(s)&&p.alive){eliminate(s,id,'đã rời trận và bị tính loại');finishIfWon(s);}if(s.host===id)s.host=s.players.find(p=>!p.left)?.id||null;if(!s.host){s.phase='finished';s.winner='abandoned';s.deadline=0;}}
export function projectWolfRoom(row,s,viewer,now){
 const member=s.players.find(p=>p.id===viewer),role=member?s.roles[viewer]||null:null,finished=s.phase==='finished';
 const participants=s.players.filter(p=>!p.left),seats=new Map(participants.map((p,i)=>[p.id,wolfSeat(i,participants.length)]));
 return {id:row.id,title:row.title,revision:row.version||0,phase:s.phase,round:s.round,game:s.game,host:s.host,deadline:s.deadline,winner:s.winner,server_time:now,
  players:s.players.map(p=>({id:p.id,name:p.name,color:p.color,alive:p.alive,left:p.left,...(p.seat||seats.get(p.id)),publicRole:finished||!p.alive?s.roles[p.id]||null:null})),
  own:member?{id:member.id,role,alive:member.alive,left:member.left,acted:s.phase==='night'?Object.hasOwn(s.night,viewer):s.phase==='vote'?Object.hasOwn(s.votes,viewer):false,choice:s.phase==='night'?s.night[viewer]?.target||null:s.phase==='vote'?s.votes[viewer]||null:null,visions:s.visions[viewer]||[],guardLast:role==='guard'?s.guardLast:null,pack:role==='wolf'?s.players.filter(p=>s.roles[p.id]==='wolf').map(p=>p.id):[],packChoices:role==='wolf'&&s.phase==='night'?Object.entries(s.night).filter(([id])=>s.roles[id]==='wolf').map(([id,a])=>({id,target:a.target})):[]}:null,
  votes:s.phase==='vote'?Object.entries(s.votes).map(([id,target])=>({id,target})):[],logs:s.logs.slice(-15)};
}
export function wolfChannel(s,id,channel,write=false){const member=s.players.find(p=>p.id===id&&!p.left);if(!member)throw Error('Bạn không thuộc phòng này.');if(channel==='pack'){if(s.roles[id]!=='wolf'||!member.alive||s.phase!=='night')throw Error('Kênh bầy Sói chỉ mở cho Sói còn sống ban đêm.');return;}
 if(channel==='ghost'){if(member.alive||!active(s))throw Error('Kênh linh hồn dành cho người đã bị loại.');return;}
 if(channel!=='table')throw Error('Kênh không hợp lệ.');if(write&&active(s)&&(!member.alive||s.phase==='night'))throw Error('Ban đêm và người đã bị loại không được nói ở bàn làng.');}
