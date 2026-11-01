export const PLOTS=Array.from({length:16},(_,id)=>({id,x:28+Math.floor(id/4)*4,z:3+(id%4)*4,insideX:-11+(id%4)*7,insideZ:-17+Math.floor(id/4)*8}));
export const THEFT_SPOTS={garden:{id:'garden',name:'Vườn rau',x:34,z:9,item:'vegetable'},tea:{id:'tea',name:'Góc trà',x:-17,z:36,item:'bun'},gifts:{id:'gifts',name:'Quầy quà',x:15,z:-6,item:'hat'}};
export const JAIL_SECONDS=90;
