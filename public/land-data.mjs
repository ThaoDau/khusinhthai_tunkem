export const LAND_LOTS=Array.from({length:12},(_,i)=>({id:(i<6?'T':'D')+String(i%6+1).padStart(2,'0'),name:(i<6?'Xóm Tây ':'Xóm Đông ')+(i%6+1),x:i<6?-77:77,z:-62+(i%6)*26}));
export const GOVERNMENT={id:'government',name:'Nhà chính quyền',x:-29,z:-60,color:0xb6a174};
export const LAND_RULES={fee:20,reviewMs:15000,salePrice:3};
export const LAND_BUILDS={house:{name:'Nhà gỗ',emoji:'🏡',coins:50,wood:3,stone:2,ms:30000},garden:{name:'Vườn rau 3 luống',emoji:'🥬',coins:20,wood:2,stone:0,ms:15000},greenhouse:{name:'Nhà kính trồng rau',emoji:'🌿',coins:40,wood:4,stone:2,ms:30000}};
export const LAND_SUPPLIES={wood:{name:'Gỗ xây dựng',emoji:'🪵',price:4},stone:{name:'Đá xây dựng',emoji:'🪨',price:5},seed:{name:'Gói hạt giống',emoji:'🌱',price:2}};
export const LAND_CROPS={cabbage:{name:'Cải xanh',emoji:'🥬',ms:45000,yield:2,color:0x7eaa57},carrot:{name:'Cà rốt',emoji:'🥕',ms:70000,yield:3,color:0xe8a352},pumpkin:{name:'Bí đỏ',emoji:'🎃',ms:90000,yield:4,color:0xdca04b}};
export const landBed=(lot,bed)=>({x:lot.x+5,z:lot.z-6+bed*6});
export const isLandDistrict=(x,z)=>Math.abs(x)>57&&Math.abs(x)<94&&z>-78&&z<83;
