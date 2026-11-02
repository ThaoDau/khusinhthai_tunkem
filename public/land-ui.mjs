let landBusy=false,landView=null,landViewKey='',landError='';
const landRows=()=>state.land?.parcels||[];
const landMine=()=>landRows().find(p=>p.owner_id===state.user?.id);
const landInventory=item=>state.inventory?.find(i=>i.item===item)?.quantity||0;
const landTime=()=>Date.now()+(state.server_time?state.server_time-(state._received_at||Date.now()):0);
const landTimer=t=>`<span data-land-until="${t}">${Math.max(0,Math.ceil((t-landTime())/1000))} giây</span>`;
const landNear=p=>{const v=game?.position();return area.id==='village'&&v&&Math.hypot(v.x-p.x,v.z-p.z)<19;};
function landShell(title,body){modal(`<div class="land-view" id="land-dialog"><div class="modal-eyebrow">KHU SINH THÁI · CÙNG XÂY MỘT NGÔI LÀNG</div><h2>${title}</h2><div id="land-error" class="modal-error" role="alert">${esc(landError)}</div>${body}</div>`);landViewKey=landCurrentKey();}
function landCommon(){
 document.querySelectorAll('[data-land-parcel]').forEach(b=>b.onclick=()=>landParcelMenu(b.dataset.landParcel));
 document.querySelectorAll('[data-land-apply]').forEach(b=>b.onclick=()=>landApplication(b.dataset.landApply));
 document.querySelectorAll('[data-land-visit]').forEach(b=>b.onclick=()=>landMutate('visit',{parcel:b.dataset.landVisit,...(b.dataset.bed!==undefined?{bed:Number(b.dataset.bed)}:{}),...(b.dataset.pen?{pen:true}:{})}));
 document.querySelectorAll('[data-land-bed]').forEach(b=>b.onclick=()=>landCropMenu(b.dataset.parcel,Number(b.dataset.landBed)));
 document.querySelectorAll('[data-land-livestock]').forEach(b=>b.onclick=()=>livestockMenu(b.dataset.landLivestock));
 if($('#land-to-office'))$('#land-to-office').onclick=async()=>{$('#modal').close();await move('government');await refresh();landOffice();};
 if($('#land-back-office'))$('#land-back-office').onclick=landOffice;
 if($('#land-recheck'))$('#land-recheck').onclick=async()=>{await refresh();renderCurrentLand();};
}
async function landOffice(){
 if(!requireUser())return;if(state.user.wf_locked)return toast('Rời bàn Ma Sói trước khi làm thủ tục đất đai.');
 landView={type:'office'};renderLandOffice();
}
function renderLandOffice(){
 const mine=landMine(),atOffice=area.id==='government';
 landShell('Nhà chính quyền 🏛️',`<p class="land-intro">Xin đất, dựng nhà, làm vườn và mang rau về quầy thu mua. Nhà của bạn sẽ xuất hiện trong làng chung.</p><div class="land-steps"><span>① Xin phép đất</span><span>② Dựng nhà & vườn</span><span>③ Trồng rau · bán nông sản</span></div><div class="land-notice">${atOffice?'👨‍💼 Cán bộ địa chính đang tiếp nhận hồ sơ.':'Bạn đang xem sổ đất. Tới Nhà chính quyền để nộp đơn hoặc mua bán.'} ${!atOffice?'<button id="land-to-office">Đến Nhà chính quyền →</button>':''}</div>${mine?`<div class="land-own-card"><b>🏡 ${esc(mine.title)} · ${mine.id}</b><p>${mine.status==='pending'?'Hồ sơ đang xét · '+landTimer(mine.permit_at):'Đã cấp đất. Bạn có thể xây nhà và vườn rau.'}</p><button data-land-parcel="${mine.id}" class="primary-btn">Mở đất của tôi</button></div>`:`<p>Phí hồ sơ <b>${LAND_RULES.fee} xu</b> · Mỗi cư dân một lô · Cán bộ tự duyệt sau 15 giây. Khi cấp đất, nhận <b>6 gỗ, 3 đá và 8 gói hạt giống</b>.</p>`}<div class="land-lot-grid">${LAND_LOTS.map(l=>{const p=landRows().find(p=>p.id===l.id);return `<button class="land-lot ${p?.status||'vacant'}" data-land-parcel="${l.id}"><b>${l.id} · ${l.name}</b><small>${p?.status==='approved'?'🏡 '+esc(p.owner_name):p?.status==='pending'?'⏳ Đang xét đơn':'🌱 Đất còn trống'}</small></button>`;}).join('')}</div><div class="land-section-head"><h3>Quầy vật liệu & thu mua</h3><b>🪙 ${state.user?.coins||0} xu</b></div><div class="land-supply-grid">${Object.entries(LAND_SUPPLIES).map(([id,v])=>`<button data-land-buy="${id}" ${!atOffice?'disabled':''}>${v.emoji} ${v.name}<small>${v.price} xu / 1 · có ${landInventory(id)}</small></button>`).join('')}</div><div class="land-sell"><span>🥬 Có ${landInventory('vegetable')} bó rau · thu mua ${LAND_RULES.salePrice} xu/bó</span><button id="land-sell-one" ${!atOffice||!landInventory('vegetable')?'disabled':''}>Bán 1 bó</button><button id="land-sell-all" ${!atOffice||!landInventory('vegetable')?'disabled':''}>Bán hết (tối đa 100)</button></div>${Object.entries(LAND_PRODUCTS).filter(([id])=>id!=='vegetable').map(([id,v])=>`<div class="land-sell"><span>${v.emoji} Có ${landInventory(id)} ${v.name.toLowerCase()} · thu mua ${v.price} xu</span><button data-land-sell="${id}" data-count="1" ${!atOffice||!landInventory(id)?'disabled':''}>Bán 1</button><button data-land-sell="${id}" data-count="all" ${!atOffice||!landInventory(id)?'disabled':''}>Bán hết</button></div>`).join('')}<details><summary>📜 Sổ xây dựng của làng</summary>${(state.land?.logs||[]).slice(0,6).map(l=>`<p class="land-small">${esc(l.text)}</p>`).join('')||'<p>Chưa có công trình mới.</p>'}</details>`);
 landCommon();document.querySelectorAll('[data-land-buy]').forEach(b=>b.onclick=()=>landMutate('buy',{item:b.dataset.landBuy,count:1}));
 document.querySelectorAll('[data-land-sell]').forEach(b=>b.onclick=()=>landMutate('sell',{item:b.dataset.landSell,count:b.dataset.count==='all'?Math.min(100,landInventory(b.dataset.landSell)):1}));
 $('#land-sell-one').onclick=()=>landMutate('sell',{count:1});$('#land-sell-all').onclick=()=>landMutate('sell',{count:Math.min(100,landInventory('vegetable'))});
}
function landApplication(id){
 if(!requireUser())return;if(area.id!=='government'){landView={type:'office'};renderLandOffice();return;}
 landView={type:'application',id};const lot=LAND_LOTS.find(l=>l.id===id);if(!lot)return;
 landShell('Đơn xin đất · '+id,`<p>${lot.name} · lô 22 × 22 · đất ở kết hợp trồng rau sinh thái. Phí hồ sơ <b>20 xu</b>, cán bộ làng tự xét sau 15 giây.</p><form id="land-apply-form"><label for="land-title">Tên nhà / khu vườn</label><input id="land-title" maxlength="32" required placeholder="Ví dụ: Nhà nhỏ vườn xanh"><label for="land-purpose">Bạn muốn dùng lô đất để làm gì?</label><textarea id="land-purpose" maxlength="180" minlength="8" required placeholder="Xây nhà gỗ và trồng rau sạch cùng bạn bè…"></textarea><p class="land-small">Mỗi tài khoản một lô. Chỉ chủ đất được xây dựng, gieo trồng và thu hoạch; bạn bè có thể ghé thăm, tưới giúp. Đây là thủ tục nhập vai của trò chơi.</p><button class="primary-btn" ${landBusy?'disabled':''}>Nộp hồ sơ · 20 xu</button></form><button id="land-back-office" class="switch">← Về sổ đất</button>`);
 landCommon();$('#land-apply-form').onsubmit=e=>{e.preventDefault();landMutate('apply',{parcel:id,title:$('#land-title').value,purpose:$('#land-purpose').value});};
}
function landParcelMenu(id){
 const p=landRows().find(p=>p.id===id),lot=LAND_LOTS.find(l=>l.id===id);if(!lot)return;landView={type:'parcel',id};
 const mine=p?.owner_id===state.user?.id,approved=p?.status==='approved',near=p&&landNear(p),building=p&&Object.keys(LAND_BUILDS).some(k=>p[k+'_ready']);
 let body=`<p>${lot.name} · 22 × 22 · ${p?.owner_name?'Chủ đất: <b>'+esc(p.owner_name)+'</b>':'Chưa có chủ đất'}</p>`;
 if(!p||p.status==='vacant')body+=`<div class="land-own-card"><p>Đất ở kết hợp vườn rau. Cần giấy phép trước khi xây dựng.</p>${landMine()?'<p>Bạn đã có một lô đất trong làng.</p>':area.id==='government'?`<button data-land-apply="${id}" class="primary-btn">Viết đơn xin lô này · 20 xu</button>`:'<button id="land-to-office" class="primary-btn">Tới chính quyền xin đất</button>'}</div>`;
 else if(!approved)body+=`<div class="land-own-card"><b>⏳ Cán bộ đang xét hồ sơ</b><p>Còn ${landTimer(p.permit_at)}. Giấy phép và bộ vật liệu sẽ tự cấp, kể cả khi bạn rời game.</p><button id="land-recheck">Kiểm tra hồ sơ</button></div>`;
 else{
  body+=`${mine?'<div class="wallet">🪙 '+(state.user?.coins||0)+' xu · '+landInventory('wood')+' gỗ · '+landInventory('stone')+' đá</div>':''}<div class="land-permit">✓ GIẤY PHÉP ${p.id} · Đã cấp cho ${esc(p.owner_name)}${mine&&p.purpose?'<p>'+esc(p.purpose)+'</p>':''}</div>`;
  if(!near)body+='<p class="land-notice">Hãy tới lô đất để xây dựng và chăm rau.</p>';
  body+=`<div class="land-build-grid">${Object.entries(LAND_BUILDS).map(([kind,c])=>{const done=landBuildDone(p,kind),ready=p[kind+'_ready'],eligible=kind!=='greenhouse'||p.garden_level===1,enough=(state.user?.coins||0)>=c.coins&&landInventory('wood')>=c.wood&&landInventory('stone')>=c.stone;return `<article><span>${c.emoji}</span><b>${c.name}</b><small>${done?'✓ Đã hoàn thành':ready?'Đang dựng · '+landTimer(ready):c.coins+' xu · '+c.wood+' gỗ'+(c.stone?' · '+c.stone+' đá':'')}</small>${!done&&!ready?`<button data-land-build="${kind}" ${!mine||!near||!eligible||building||!enough?'disabled':''}>${mine&&!enough?'Chưa đủ xu / vật liệu':kind==='greenhouse'?'Nâng cấp · nhanh hơn 25%':'Xây · '+c.ms/1000+' giây'}</button>`:''}</article>`;}).join('')}</div>`;
  if(mine&&!p.garden_level)body+=`<section class="land-own-card"><h3>🥬 Trồng rau ngay trong đất nhà</h3><p>Khu đất này chưa có luống rau. Xây <b>Vườn rau 3 luống</b> với ${LAND_BUILDS.garden.coins} xu và ${LAND_BUILDS.garden.wood} gỗ, rồi đi gần luống nhấn E để gieo hạt.</p>${p.garden_ready?'<p>Đang làm vườn · '+landTimer(p.garden_ready)+'</p>':`<button data-land-build="garden" class="primary-btn" ${!near||building||(state.user?.coins||0)<LAND_BUILDS.garden.coins||landInventory('wood')<LAND_BUILDS.garden.wood?'disabled':''}>Tạo vườn rau bên nhà</button>`}</section>`;
  body+=`<div class="land-own-card"><h3>🐔 Khu chăn nuôi riêng</h3><p>${p.coop_level?(p.animals?.length||0)+'/'+LIVESTOCK_CAPACITY+' vật nuôi · cho ăn, lấy trứng và sữa':p.coop_ready?'Đang dựng chuồng · '+landTimer(p.coop_ready):'Xây chuồng trong đất nhà, nhận 1 gà mái và 3 phần thức ăn.'}</p><button data-land-livestock="${id}">${p.coop_level?'Mở chuồng chăn nuôi':'Xây chuồng / xem chăn nuôi'}</button></div>`;
  if(p.garden_level)body+=`<h3>Vườn riêng ${p.garden_level===2?'· có nhà kính':''}</h3><div class="land-bed-grid">${(p.beds||[]).map(b=>{const c=LAND_CROPS[b.crop];return `<button data-parcel="${id}" data-land-bed="${b.bed}"><b>Luống ${b.bed+1} ${c?.emoji||'🌱'}</b><small>${c?c.name+' · '+(b.ready_at<=landTime()?'Chín rồi!':landTimer(b.ready_at)):'Đất trống · sẵn sàng gieo'}</small></button>`;}).join('')}</div>`;
  if(mine)body+=`<p class="land-small">Vật liệu trong túi: ${landInventory('wood')} gỗ · ${landInventory('stone')} đá · ${landInventory('seed')} hạt giống. Mua thêm hoặc bán rau tại Nhà chính quyền.</p>`;
 }
 body+=`<div class="land-footer"><button data-land-visit="${id}" class="primary-btn">${mine?'🏡 Về đất của tôi':'🚶 Đến thăm lô đất'}</button><button id="land-back-office">Sổ đất & quầy vật liệu</button></div>`;
 landShell(esc(p?.title||'Lô đất '+id),body);landCommon();document.querySelectorAll('[data-land-build]').forEach(b=>b.onclick=()=>landMutate('build',{parcel:id,kind:b.dataset.landBuild}));
}
function landCropMenu(id,bed){
 const p=landRows().find(p=>p.id===id),b=p?.beds?.find(b=>b.bed===bed);if(!p||!b||!p.garden_level)return landParcelMenu(id);landView={type:'crop',id,bed};
 const crop=LAND_CROPS[b.crop],mine=p.owner_id===state.user?.id,pos=game?.position(),spot=landBed(p,bed),near=area.id==='village'&&pos&&Math.hypot(pos.x-spot.x,pos.z-spot.z)<=7,ready=b.ready_at<=landTime();
 let body=`<p>${esc(p.title)} · ${esc(p.owner_name)} · Luống ${bed+1}</p>`;
 if(crop)body+=`<div class="land-own-card"><h3>${crop.emoji} ${crop.name}</h3><p>${ready?'Đã chín! Thu được '+crop.yield+' bó rau.':'Đang lớn · còn '+landTimer(b.ready_at)}</p><p class="land-small">${b.watered_at?'💧 Vụ này đã được tưới.':'Tưới một lần để rau chín sớm hơn 10 giây.'}</p><button id="land-water" ${ready||b.watered_at||!near?'disabled':''}>💧 ${mine?'Tưới rau':'Tưới giúp chủ vườn'}</button> <button id="land-harvest" ${!mine||!ready||!near?'disabled':''}>🥬 Thu hoạch</button></div>`;
 else body+=mine?`<p>Mỗi luống dùng 1 gói hạt. Bạn đang có ${landInventory('seed')} gói.</p><div class="land-supply-grid">${Object.entries(LAND_CROPS).map(([key,c])=>`<button data-land-plant="${key}" ${!near||!landInventory('seed')?'disabled':''}>${c.emoji} ${c.name}<small>${Math.round(c.ms/1000*(p.garden_level===2?.75:1))} giây · ${c.yield} bó rau</small></button>`).join('')}</div>`:'<p>Luống trống. Chỉ chủ vườn được gieo trồng và thu hoạch; bạn có thể tưới giúp khi cây đang lớn.</p>';
 body+=`<div class="land-footer"><button data-land-visit="${id}" data-bed="${bed}" class="primary-btn">Đến bên luống rau</button><button data-land-parcel="${id}">← Nhà & vườn</button></div>`;
 landShell('Vườn rau riêng 🌱',body);landCommon();document.querySelectorAll('[data-land-plant]').forEach(b=>b.onclick=()=>landMutate('plant',{parcel:id,bed,crop:b.dataset.landPlant}));if($('#land-water'))$('#land-water').onclick=()=>landMutate('water',{parcel:id,bed});if($('#land-harvest'))$('#land-harvest').onclick=()=>landMutate('harvest',{parcel:id,bed});
}
async function landMutate(action,data){
 if(landBusy||!requireUser())return;landBusy=true;landError='';if($('#land-error'))$('#land-error').textContent='';document.querySelectorAll('[data-land-build],[data-land-plant],#land-water,#land-harvest,#land-apply-form button,[data-animal-buy],[data-animal-feed],[data-animal-collect]').forEach(b=>b.disabled=true);const visit=action==='visit';
 if(visit){worldTransitionBusy=true;worldRevision++;}
 try{
  if(visit)await presenceRequest?.catch(()=>{});else if(['build','plant','water','harvest','animal_buy','animal_feed','animal_collect'].includes(action))await call('presence',game.position());
  const d=await call('land',{action,...data});
  if(visit){state.user={...state.user,area:'village',seat:'',action:'',...d.spawn};area=areas.find(a=>a.id==='village');game.setState({...state,area:area.id});game.snap(d.spawn);game.resetCamera();game.zoom(-30);renderArea();$('#modal').close();}
  if(action==='apply')landView={type:'parcel',id:d.parcel};toast(d.message);
 }catch(e){landError=e.message;if($('#land-error'))$('#land-error').textContent=e.message;toast(e.message);}finally{if(visit){worldRevision++;worldTransitionBusy=false;}landBusy=false;}
 await refresh();if(!visit)renderCurrentLand();
}
function renderCurrentLand(){if(!landView)return;if(landView.type==='office')renderLandOffice();else if(landView.type==='parcel')landParcelMenu(landView.id);else if(landView.type==='crop')landCropMenu(landView.id,landView.bed);else if(landView.type==='livestock')livestockMenu(landView.id);}
function landCurrentKey(){const p=landRows().find(p=>p.id===landView?.id);return JSON.stringify([p,p?.beds?.map(b=>b.ready_at<=landTime()),p?.animals?.map(a=>a.ready_at>0&&a.ready_at<=landTime()),state.user?.coins,state.inventory,area.id]);}
function updateLandUI(){if(!$('#land-open')||!$('#modal').open||!$('#land-dialog')||landBusy)return;if(['parcel','crop','livestock'].includes(landView?.type)&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)&&landViewKey!==landCurrentKey())renderCurrentLand();}
const landOpen=document.createElement('button');landOpen.id='land-open';landOpen.className='map-land-open';landOpen.textContent='🏡';landOpen.title='Đất & nhà · Xin đất tại chính quyền';landOpen.setAttribute('aria-label','Đất và nhà');$('.mini-map').append(landOpen);landOpen.onclick=()=>landMine()?landParcelMenu(landMine().id):landOffice();
setInterval(()=>{if(document.hidden)return;document.querySelectorAll('[data-land-until]').forEach(e=>{const seconds=Math.max(0,Math.ceil((Number(e.dataset.landUntil)-landTime())/1000));e.textContent=seconds?seconds+' giây':'Đang cập nhật…';});},1000);
