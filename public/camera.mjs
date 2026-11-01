export function cameraPreset(area){
 return area==='village'?{pitch:.8,distance:55}:area==='jail'?{pitch:.72,distance:18}:{pitch:.55,distance:23};
}

export function roomOrbitDistance(area,look,yaw,pitch,requested){
 if(!area||area==='village'||area==='werewolf')return requested;
 // Keep the camera inside the outer walls, including while rotating or zooming.
 const dx=Math.sin(yaw)*Math.cos(pitch),dz=Math.cos(yaw)*Math.cos(pitch);
 let distance=requested;
 for(const [origin,direction,min,max] of [[look.x,dx,-17.25,17.25],[look.z,dz,-24.25,24.25]]){
  if(Math.abs(direction)<1e-8)continue;
  distance=Math.min(distance,((direction>0?max:min)-origin)/direction);
 }
 return Math.max(.1,distance);
}
