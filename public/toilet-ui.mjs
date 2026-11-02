async function toiletDo(body){if(!requireUser())return;hideWcChoice();try{const d=await call('toilet',body);await refresh();toast(d.message);
 // Stand up on their behalf when the visit ends; the prompt at the bowl then offers flushing and wiping.
 if(body.action==='use')setTimeout(async()=>{if(!state.user?.seat?.startsWith('wc-'))return;await gesture('stand');toast('Xong rồi! Giữ E để xả nước.');},d.duration);
 if(body.action==='bail')bailMenu();}catch(e){toast(e.message);}}
function hideWcChoice(){const box=document.getElementById('wc-choice');if(box)box.hidden=true;}
function showWcChoice(stall){let box=document.getElementById('wc-choice');if(!box){box=document.createElement('div');box.id='wc-choice';box.className='glass wc-choice';box.innerHTML='<button data-kind="pee"><kbd>1</kbd> 💧 Đi tiểu · 6 giây</button><button data-kind="poop"><kbd>2</kbd> 💩 Đi nặng · 10 giây</button>';$('#interaction').before(box);}
 box.dataset.stall=stall;box.hidden=false;box.querySelectorAll('button').forEach(b=>b.onclick=()=>toiletDo({action:'use',kind:b.dataset.kind,stall}));}
function toiletAt(stall,stage){if(!requireUser())return;const v=state.sanitation?.today?.[0];if(stage==='flush'||stage==='wipe')return toiletDo({action:stage,visit:v?.id});if(stage==='use'){const box=document.getElementById('wc-choice');return box&&!box.hidden?hideWcChoice():showWcChoice(stall);}toast('Chờ một chút rồi dùng lại nhé.');}
function onToiletPrompt(key){if(!key.startsWith('toilet')||!key.endsWith(':use'))hideWcChoice();}
window.addEventListener('keydown',e=>{const box=document.getElementById('wc-choice');if(!box||box.hidden||!['1','2'].includes(e.key)||/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName||''))return;toiletDo({action:'use',kind:e.key==='1'?'pee':'poop',stall:box.dataset.stall});});
const bailList=()=>(state?.sanitation?.bail||[]).filter(b=>b.user_id!==state.user?.id);
function bailMenu(){const list=bailList();modal(`<div class="modal-eyebrow">NHÀ TẠM GIỮ</div><h2>🔓 Chuộc bạn</h2><p>Mỗi lượt 20 xu trong game.</p>${list.map(b=>`<button data-bail="${b.incident}">Chuộc ${esc(b.name)} · 20 xu</button>`).join(' ')||'<p>Không còn ai cần chuộc.</p>'}`);document.querySelectorAll('[data-bail]').forEach(b=>b.onclick=()=>toiletDo({action:'bail',incident:b.dataset.bail}));}
const wcHelp=document.createElement('button');wcHelp.className='mystery-alert quiet';wcHelp.style.cssText='top:auto;bottom:76px;left:auto;right:18px';wcHelp.hidden=true;wcHelp.onclick=bailMenu;document.body.append(wcHelp);
setInterval(()=>{const n=bailList().length;wcHelp.hidden=!n;wcHelp.textContent='🔓 Chuộc bạn · '+n;},1500);
