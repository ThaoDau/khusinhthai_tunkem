let wolfRoom=null,wolfBusy=false,wolfPolling=false,wolfEpoch=0,wolfChannelName='table',wolfRenderKeys=new Map(),wolfClockOffset=0;
const wolfLive=r=>r&&['night','discussion','vote'].includes(r.phase);
function wolfHTML(id,html){if(wolfRenderKeys.get(id)!==html){wolfRenderKeys.set(id,html);$('#'+id).innerHTML=html;}}
function acceptWolf(data){
 const room=data.room;if(!room)return;
 if(wolfRoom?.id===room.id&&room.revision<wolfRoom.revision)return;
 const previous=wolfRoom;wolfRoom=room;wolfClockOffset=room.server_time-Date.now();
 wolfChannelName=data.channel||(!room.own?.alive&&wolfLive(room)?'ghost':room.phase==='night'&&room.own?.role==='wolf'?'pack':'table');
 if(data.messages)renderWolfMessages(data.messages);
 renderWolfPanel();
 if(previous&&previous.id===room.id&&previous.phase!==room.phase){toast(room.phase==='night'?'🌙 Đêm xuống. Hãy xem lượt vai của bạn.':room.phase==='vote'?'🗳️ Đến giờ bỏ phiếu.':room.phase==='finished'?'🏁 Trận Ma Sói đã kết thúc.':'☀️ Trời sáng, cả làng thảo luận!');refresh();}
}
async function wolfRequest(action,more={}){const data=await call('werewolf',{action,...(wolfRoom?{room:wolfRoom.id}:{}),...more});acceptWolf(data);return data;}
async function wolfLobby(){
 if(!requireUser())return;
 try{
  if(state.user.wf_room){await wolfRequest('state',{room:state.user.wf_room});$('#wolf-panel').hidden=false;$('#wolf-panel').classList.remove('collapsed');return;}
  const d=await call('werewolf',{action:'list'});
  modal(`<div class="modal-eyebrow">KHI ĐÊM XUỐNG Ở THẢO ĐẬU</div><h2>Ma Sói trong làng 🐺</h2><p>4–12 người thật. Sói, Tiên tri, Bảo vệ và Dân làng. Vai được chia kín, ngày/đêm tự chuyển theo đồng hồ.</p><form id="wolf-create"><label for="wolf-title">Tên bàn chơi</label><input id="wolf-title" maxlength="36" placeholder="Đêm Thảo Đậu"><button class="primary-btn">＋ Tạo phòng & ngồi vào bàn</button></form><div class="wolf-lobby-rooms">${d.rooms.map(r=>`<div class="team-row"><div><b>${esc(r.title)}</b><small>${r.count}/12 người · ${WOLF_PHASES[r.phase]||r.phase} · ${esc(r.host)}</small></div><button data-wolf-join="${r.id}" ${r.phase!=='lobby'||r.count>=12?'disabled':''}>Vào bàn</button></div>`).join('')||'<p class="empty">Chưa có bàn nào. Bạn có thể mở bàn và rủ bạn bè vào.</p>'}</div><button class="switch" id="wolf-rules-open">📖 Luật của bản này</button>`);
  $('#wolf-rules-open').onclick=wolfRules;
  $('#wolf-create').onsubmit=async e=>{e.preventDefault();await wolfMutation('create',{title:$('#wolf-title').value,room:null});};
  document.querySelectorAll('[data-wolf-join]').forEach(b=>b.onclick=()=>wolfMutation('join',{room:b.dataset.wolfJoin}));
 }catch(e){toast(e.message);}
}
async function wolfMutation(action,more={}){
 if(wolfBusy)return;wolfBusy=true;wolfEpoch++;
 try{const d=await wolfRequest(action,more);$('#modal').close();if(d.left){wolfRoom=null;$('#wolf-panel').hidden=true;document.body.classList.remove('playing-werewolf');game?.setWerewolf(null);}await refresh();renderWolfPanel();}
 catch(e){toast(e.message);}finally{wolfBusy=false;}
}
function wolfRules(){modal(`<div class="modal-eyebrow">BỘ 4 VAI · BẢN NHANH</div><h2>Luật Ma Sói 🌙</h2><p><b>Ban đêm · 30 giây:</b> Sói chọn người cắn, Tiên tri chọn một người để soi, Bảo vệ chọn người che chở. Kết quả soi chỉ Tiên tri được xem khi sáng. Sói không được cắn đồng đội; Bảo vệ được tự bảo vệ nhưng không chọn cùng người hai đêm liên tiếp.</p><p><b>Ban ngày:</b> thảo luận 60 giây, rồi bỏ phiếu 30 giây. Hòa phiếu hoặc bỏ qua nhiều nhất thì không treo ai. Sói hòa mục tiêu thì không ai bị cắn. Vai của người bị loại được công bố.</p><p><b>Thắng:</b> hết Sói thì Dân thắng; số Sói bằng hoặc hơn người còn lại thì Sói thắng. Sau 20 đêm chưa phân thắng bại thì hòa. Phòng 4–5 có 1 Sói, 6–8 có 2 Sói, 9–12 có 3 Sói; luôn có 1 Tiên tri và 1 Bảo vệ.</p><p>Rời trận hoặc mất kết nối quá 90 giây bị tính loại. Người bị loại chỉ chat ở kênh linh hồn. Lúc chơi dùng chat của bàn Ma Sói; các thao tác và chat ngoài làng tạm khóa. Chế độ này không dùng luật trộm hay nhà tù.</p>`);}
function renderWolfPanel(){
 if(!$('#wolf-panel')||!wolfRoom)return;const r=wolfRoom,own=r.own,mine=state.user?.id;if(!own||own.left)return;
 $('#wolf-panel').hidden=false;
 const playing=area.id==='werewolf'&&state.user?.wf_room===r.id;document.body.classList.toggle('playing-werewolf',playing);if(playing){game?.setWerewolf(r);$('#area-title').textContent='Ma Sói · '+(WOLF_PHASES[r.phase]||r.phase)+(r.round?' '+r.round:'');}
 $('#wolf-table-title').textContent=r.title;
 const role=WOLF_ROLES[own.role],alive=r.players.filter(p=>p.alive&&!p.left),count=r.players.filter(p=>!p.left).length;
 const roleText=r.phase==='lobby'?`<span class="wolf-role-emoji">🌒</span><div><b>Vai chưa được chia</b><p>Rủ thêm bạn bè, đủ 4 người để chủ phòng bắt đầu.</p></div>`:`<span class="wolf-role-emoji">${role?.emoji||'👻'}</span><div><b>${own.alive?'Vai riêng của bạn: ':'Bạn đã bị loại · '}${role?.name||''}</b><p>${own.alive?role?.description||'':'Bạn vẫn xem được diễn biến và nói chuyện trong kênh linh hồn.'}</p></div>`;
 wolfHTML('wolf-role',roleText);
 let actions='';
 if(r.phase==='lobby'){actions=`<p>${count}/12 người · cần ít nhất 4 người</p>${r.host===mine?`<button class="wolf-main-button" id="wolf-start" ${count<4?'disabled':''}>🌙 Bắt đầu, chia vai kín</button>`:'<p>Đang chờ chủ phòng bắt đầu…</p>'}`;}
 else if(r.phase==='finished'){actions=`<div class="wolf-result">${r.winner==='wolf'?'🐺 Bầy Sói chiến thắng':r.winner==='village'?'🌾 Dân làng chiến thắng':r.winner==='abandoned'?'Bàn chơi đã đóng':'🤝 Trận hòa'}</div>${r.host===mine?'<button class="wolf-main-button" id="wolf-replay">Chơi ván mới · chia lại vai</button>':''}`;}
 else if(own.alive&&(r.phase==='vote'||r.phase==='night'&&own.role!=='villager')){
  const kind=r.phase==='vote'?'vote':{wolf:'bite',seer:'see',guard:'protect'}[own.role];
  const label={vote:'Bạn nghi ai là Sói?',bite:'Bầy Sói chọn người cắn',see:'Chọn người để soi',protect:'Chọn người bảo vệ'}[kind];
  const targets=alive.filter(p=>kind==='protect'||p.id!==mine).filter(p=>kind!=='bite'||!own.pack.includes(p.id));
  actions=`<b class="wolf-action-title">${label}</b><div class="wolf-targets">${targets.map(p=>`<button data-wolf-target="${p.id}" data-wolf-kind="${kind}" class="${own.choice===p.id?'chosen':''}" ${kind==='protect'&&p.id===own.guardLast?'disabled':''}>${own.choice===p.id?'✓ ':''}${esc(p.name)}${p.id===mine?' (bạn)':''}</button>`).join('')}${kind==='vote'?`<button data-wolf-target="" data-wolf-kind="vote" class="${own.acted&&!own.choice?'chosen':''}">Bỏ qua, chưa đủ bằng chứng</button>`:''}</div><p class="wolf-small">${own.acted?'Đã ghi nhận. Có thể đổi trước khi hết giờ.':'Chọn trước khi đồng hồ kết thúc.'}</p>`;
 }else actions=`<p>${!own.alive?'Bạn đang theo dõi trận đấu.':r.phase==='discussion'?'Cùng bàn làng thảo luận. Chưa đến giờ bỏ phiếu.':'Dân làng ngủ. Chờ trời sáng để suy luận.'}</p>`;
 if(own.role==='wolf'&&own.pack.length>1)actions+=`<p class="wolf-private-note">🐺 Đồng đội: ${r.players.filter(p=>own.pack.includes(p.id)&&p.id!==mine).map(p=>esc(p.name)).join(', ')}</p>`;
 if(own.role==='seer'&&own.visions.length)actions+=`<div class="wolf-visions">${own.visions.map(v=>`<p>🔮 Đêm ${v.round}: ${esc(r.players.find(p=>p.id===v.target)?.name||'Người chơi')} — <b>${v.wolf?'thuộc phe Sói':'không phải Sói'}</b></p>`).join('')}</div>`;
 wolfHTML('wolf-actions',actions);
 if($('#wolf-start'))$('#wolf-start').onclick=()=>wolfMutation('start');if($('#wolf-replay'))$('#wolf-replay').onclick=()=>wolfMutation('replay');
 document.querySelectorAll('[data-wolf-target]').forEach(b=>b.onclick=()=>wolfMutation('act',{kind:b.dataset.wolfKind,target:b.dataset.wolfTarget||null}));
 const counts={};for(const v of r.votes)if(v.target)counts[v.target]=(counts[v.target]||0)+1;
 wolfHTML('wolf-roster',r.players.map(p=>`<div class="wolf-person ${!p.alive||p.left?'eliminated':''}"><i style="background:${/^#[0-9a-f]{6}$/i.test(p.color)?p.color:'#aab39a'}"></i><span>${esc(p.name)}${p.id===mine?' · bạn':''}${p.id===r.host?' ♛':''}</span><small>${p.left?'Rời trận':p.publicRole?WOLF_ROLES[p.publicRole]?.emoji+' '+WOLF_ROLES[p.publicRole]?.name:p.alive?(counts[p.id]?counts[p.id]+' phiếu':p.online===false?'Mất kết nối':'Còn sống'):'Bị loại'}</small></div>`).join(''));
 wolfHTML('wolf-log',r.logs.slice(-4).map(l=>`<p>${esc(l.text)}</p>`).join(''));
 const labels={table:'💬 Bàn làng',pack:'🐺 Bầy Sói · bí mật',ghost:'👻 Linh hồn · người đã bị loại'};$('#wolf-channel').textContent=labels[wolfChannelName]||labels.table;
 const canChat=r.phase==='lobby'||r.phase==='finished'||!own.alive||r.phase!=='night'||own.role==='wolf';$('#wolf-chat-input').disabled=!canChat;$('#wolf-chat-send').disabled=!canChat;$('#wolf-chat-input').placeholder=canChat?'Nói với kênh hiện tại…':'Ban đêm, dân làng hãy chờ…';
 updateWolfClock();
}
function renderWolfMessages(messages){if(!$('#wolf-chat-log'))return;const key=JSON.stringify(messages);if(wolfRenderKeys.get('chat')===key)return;wolfRenderKeys.set('chat',key);const log=$('#wolf-chat-log'),bottom=log.scrollHeight-log.scrollTop-log.clientHeight<50;log.innerHTML=messages.map(m=>`<p><b>${esc(m.name)}</b> ${esc(m.body)}</p>`).join('')||'<p class="wolf-small">Chưa có lời nhắn trong kênh này.</p>';if(bottom)log.scrollTop=log.scrollHeight;}
function updateWolfClock(){if(!wolfRoom||!$('#wolf-phase'))return;const r=wolfRoom,seconds=Math.max(0,Math.ceil((r.deadline-Date.now()-wolfClockOffset)/1000));$('#wolf-phase').textContent=(WOLF_PHASES[r.phase]||r.phase)+(r.round?' '+r.round:'');$('#wolf-timer').textContent=r.deadline?seconds+'s':r.phase==='lobby'?'Chờ đủ người':'🏁';}
function updateWerewolf(){if(!$('#wolf-open'))return;const locked=Boolean(state.user?.wf_locked);$('#message').disabled=locked;$('#chat-form button').disabled=locked;if(locked)$('#message').placeholder='Dùng chat của bàn Ma Sói';if(!state.user?.wf_room){document.body.classList.remove('playing-werewolf');wolfRenderKeys.clear();$('#wolf-chat-log').replaceChildren();if(wolfRoom){wolfRoom=null;$('#wolf-panel').hidden=true;game?.setWerewolf(null);}}else if(wolfRoom)renderWolfPanel();}
const wolfButton=document.createElement('button');wolfButton.id='wolf-open';wolfButton.className='hud-circle';wolfButton.textContent='🐺';wolfButton.title='Ma Sói';wolfButton.setAttribute('aria-label','Ma Sói');wolfButton.onclick=wolfLobby;$('.top-controls').append(wolfButton);
const wolfPanel=document.createElement('section');wolfPanel.id='wolf-panel';wolfPanel.className='wolf-panel glass';wolfPanel.hidden=true;wolfPanel.innerHTML='<header class="wolf-panel-header"><b id="wolf-table-title">Ma Sói</b><button id="wolf-collapse" aria-label="Thu gọn bảng Ma Sói">−</button></header><div class="wolf-panel-body"><div class="wolf-phase-row"><b id="wolf-phase"></b><span id="wolf-timer"></span></div><div id="wolf-role" class="wolf-role"></div><div id="wolf-actions" class="wolf-actions"></div><div id="wolf-roster" class="wolf-roster"></div><div id="wolf-log" class="wolf-log"></div><div class="wolf-chat"><b id="wolf-channel"></b><div id="wolf-chat-log"></div><form id="wolf-chat-form"><input id="wolf-chat-input" aria-label="Tin nhắn Ma Sói" maxlength="300" autocomplete="off"><button id="wolf-chat-send" aria-label="Gửi tin Ma Sói">➤</button></form></div><div class="wolf-footer"><button id="wolf-rule-button">📖 Luật</button><button id="wolf-leave">Rời phòng / rời trận</button></div></div>';document.body.append(wolfPanel);
$('#wolf-collapse').onclick=()=>wolfPanel.classList.toggle('collapsed');$('#wolf-rule-button').onclick=wolfRules;$('#wolf-leave').onclick=()=>{if(wolfLive(wolfRoom)){modal('<h2>Rời trận đang chơi?</h2><p>Bạn sẽ bị tính loại và không thể quay lại ván này. Nếu chỉ cần xem cảnh, bạn có thể thu gọn bảng thay vì rời.</p><button id="wolf-confirm-leave" class="primary-btn">Rời trận và trở về làng</button>');$('#wolf-confirm-leave').onclick=()=>wolfMutation('leave');}else wolfMutation('leave');};
$('#wolf-chat-form').onsubmit=async e=>{e.preventDefault();const input=$('#wolf-chat-input'),text=input.value.trim();if(!text||!wolfRoom)return;try{const d=await wolfRequest('chat',{channel:wolfChannelName,text});input.value='';renderWolfMessages(d.messages||[]);}catch(e){toast(e.message);}};
setInterval(async()=>{if(wolfPolling||wolfBusy||document.hidden||!state.user?.wf_room)return;wolfPolling=true;const epoch=wolfEpoch;try{const d=await call('werewolf',{action:'state',room:state.user.wf_room});if(epoch===wolfEpoch)acceptWolf(d);}catch(e){$('#wolf-timer').textContent='Đang nối lại';}finally{wolfPolling=false;}},1000);setInterval(updateWolfClock,250);updateWerewolf();
