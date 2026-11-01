// Appended to app.js; shares the existing session, modal and state helpers.
function mysteryNow(){return Date.now()+(state.server_time?state.server_time-(state._received_at||Date.now()):0);}
function updateMystery(){
 if(!$('#crime-alert'))return;
 const now=mysteryNow(),open=(state.incidents||[]).filter(c=>c.status==='open'&&c.expires>now),jailed=state.user?.jailed_until>now,alert=$('#crime-alert');
 alert.className='mystery-alert '+(jailed?'jailed':open.length?'danger':'quiet');
 const label=jailed?`🔒 Tạm giữ · còn ${Math.max(0,Math.ceil((state.user.jailed_until-now)/1000))} giây`:open.length?`🚨 BÁO ĐỎ · Mất ${ITEMS[open[0].item]?.name.toLowerCase()||'đồ'} tại ${THEFT_SPOTS[open[0].location]?.name} · Bấm để điều tra`:'🚨 Bảng vụ việc · Làng đang yên bình';
 if(alert.textContent!==label)alert.textContent=label;
 const latest=(state.incidents||[])[0];if(latest&&latest.id!==lastMysteryId){if(lastMysteryId!==null&&latest.status==='open')toast('🚨 Có vụ mất đồ! Cả làng hãy cùng xem dấu vết.');lastMysteryId=latest.id;}
 $('#village-exit').disabled=Boolean(jailed);
}
async function playAction(route,body){if(!requireUser())return;try{if(['farm','steal'].includes(route))await call('presence',game.position());const d=await call(route,body);$('#modal').close();await refresh();toast(d.message||'Đã cập nhật.');return d;}catch(e){toast(e.message);}}
function nearestPlot(){const p=game.position(),inside=area.id==='garden';return PLOTS.slice().sort((a,b)=>Math.hypot(p.x-(inside?a.insideX:a.x),p.z-(inside?a.insideZ:a.z))-Math.hypot(p.x-(inside?b.insideX:b.x),p.z-(inside?b.insideZ:b.z)))[0]?.id??0;}
function gardenMenu(id=nearestPlot()){
 if(!requireUser())return;const p=PLOTS.find(p=>p.id===Number(id));if(!p)return;
 const crop=state.plots?.find(r=>r.id===p.id),remaining=Math.max(0,Math.ceil(((crop?.ready_at||0)-mysteryNow())/1000));
 modal(`<div class="modal-eyebrow">VƯỜN CHUNG CỦA CẢ LÀNG</div><h2>Luống rau ${p.id+1} 🥬</h2><p>${remaining?'Rau đang mọc lại, khoảng '+remaining+' giây nữa sẽ chín. Tưới giúp giảm thời gian.':'Rau đã chín. Thu hoạch đàng hoàng để nhận rau, xu và điểm tốt.'}</p><div class="garden-actions"><button id="water-plot">💧 Tưới nước</button><button id="harvest-plot" ${remaining?'disabled':''}>🥬 Thu hoạch · +2 xu</button><button id="steal-plot" class="danger-choice" ${remaining?'disabled':''}>🕵️ Lén nhổ rau · cả làng báo đỏ</button></div><p class="rule-note">Trộm là lựa chọn nhập vai. Bạn để lại manh mối; bị tìm ra sẽ tạm giữ 90 giây. Rau bị hái sẽ mọc lại sau khoảng 45 giây.</p>`);
 $('#water-plot').onclick=()=>playAction('farm',{action:'water',plot:p.id});$('#harvest-plot').onclick=()=>playAction('farm',{action:'harvest',plot:p.id});$('#steal-plot').onclick=()=>playAction('steal',{spot:'garden',plot:p.id});
}
function theftChoice(spot){if(!requireUser())return;const s=THEFT_SPOTS[spot];if(!s)return;modal(`<div class="modal-eyebrow">MỘT LỰA CHỌN MẠO HIỂM TRONG GAME</div><h2>Lén lấy ${ITEMS[s.item].name.toLowerCase()}?</h2><p>Cả làng sẽ nhận cảnh báo đỏ tại ${s.name}. Người chơi có thể lần theo dấu vết và bỏ phiếu. Nếu bị tìm ra: tạm giữ 90 giây, thu hồi đồ còn lại và mất 10 xu.</p><button class="primary-btn danger-choice" id="confirm-theft">🕵️ Lén lấy đồ · chấp nhận để lại dấu vết</button>`);$('#confirm-theft').onclick=()=>playAction('steal',{spot});}
function investigationBoard(){
 const now=mysteryNow(),cases=state.incidents||[];
 modal(`<div class="modal-eyebrow">CÙNG NHAU GIỮ LÀNG BÌNH YÊN</div><h2>Hồ sơ vụ việc 🚨</h2><p>Khoanh vùng từ người có mặt và dấu vết trang phục. Đủ phiếu sẽ đối chiếu với bằng chứng của game. Chọn sai chỉ loại trừ nghi phạm; không ai bị nhốt vì lời tố sai.</p>${cases.length?cases.map(c=>`<article class="incident-card ${c.status}"><div class="incident-heading"><b>${ITEMS[c.item]?.emoji||'📦'} Mất ${esc(ITEMS[c.item]?.name||'đồ')} · ${esc(THEFT_SPOTS[c.location]?.name||c.location)}</b><span>${c.status==='open'?Math.max(0,Math.ceil((c.expires-now)/1000))+'s':c.status==='solved'?'Đã tìm ra':'Hết thời gian'}</span></div>${c.status==='solved'?`<p>Đã xác định: <b>${esc(c.solved_name)}</b>. Tạm giữ có thời hạn.</p>`:c.status==='open'?`<p class="crime-clue">🔎 ${esc(c.clue)}</p><p>Cần ${c.quorum} phiếu độc lập. Các vòng đỏ dưới nhân vật là người đang được khoanh vùng, chưa phải thủ phạm.</p><div class="suspect-grid">${c.suspects.map(p=>{const cleared=c.eliminated.includes(p.id),count=c.votes?.find(v=>v.suspect===p.id)?.count||0;return `<button data-incident="${c.id}" data-suspect="${p.id}" ${cleared||p.id===state.user?.id?'disabled':''}><b>${esc(p.name)}</b><small>${cleared?'✓ Đã loại trừ':p.id===state.user?.id?'Bạn có mặt trong danh sách':esc(p.place)+' · '+count+'/'+c.quorum+' phiếu'}</small></button>`;}).join('')}</div>`:'<p>Không đủ bằng chứng trong thời gian điều tra. Không ai bị tạm giữ.</p>'}</article>`).join(''):'<p class="empty">Chưa có vụ việc. Cả làng đang yên bình 🌿</p>'}`);
 document.querySelectorAll('[data-suspect]').forEach(b=>b.onclick=async()=>{const d=await playAction('investigate',{incident:b.dataset.incident,suspect:b.dataset.suspect});if(d)investigationBoard();});
}
let lastMysteryId=null;const mysteryAlert=document.createElement('button');mysteryAlert.id='crime-alert';mysteryAlert.className='mystery-alert quiet';mysteryAlert.onclick=investigationBoard;document.body.append(mysteryAlert);
updateMystery();setInterval(updateMystery,1000);
