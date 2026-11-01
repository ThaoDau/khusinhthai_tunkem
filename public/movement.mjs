export function nearestWalkable(x,z,walkable){
 if(walkable(x,z))return {x,z};
 // Recover only a small overlap, never teleport across the map.
 for(let r=.25;r<=4;r+=.25)for(let i=0;i<24;i++){
  const a=i*Math.PI/12,nx=x+Math.sin(a)*r,nz=z+Math.cos(a)*r;
  if(walkable(nx,nz))return {x:nx,z:nz};
 }
 return null;
}
