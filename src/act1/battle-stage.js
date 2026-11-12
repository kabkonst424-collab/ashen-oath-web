// Read-only combat staging. Exploration positions and model turn rules never change.
export function battleFormation(side,index,count){
  const row=index-(count-1)/2;
  return side==='party'
    ? {x:-3.3-(index%2)*.5-(index===2?1.3:0),z:row*2.3,facing:Math.PI/2}
    : {x:2.7+(index%2)*.8,z:row*2.3,facing:-Math.PI/2};
}
export const wrapFacing = angle => Math.atan2(Math.sin(angle), Math.cos(angle));
export function facingToward(from, to, fallback = 0) {
  const dx = to.x - from.x, dz = to.z - from.z;
  return dx * dx + dz * dz > .000001 ? Math.atan2(dx, dz) : fallback;
}
/** Anatomical world heading, independent of the source GLB's local front axis. */
export function oppositionFacing(side, from, units, center) {
  const other = side === 'party' ? 'enemy' : 'party';
  let x = 0, z = 0, count = 0;
  units.forEach((unit, index) => {
    if (unit.hp <= 0) return;
    const slot = battleFormation(other, index, units.length);
    x += center.x + slot.x; z += center.z + slot.z; count++;
  });
  const fallback = side === 'party' ? Math.PI / 2 : -Math.PI / 2;
  return facingToward(from, count ? { x: x / count, z: z / count } : { x: center.x + (side === 'party' ? 3 : -3), z: center.z }, fallback);
}
const normalize=a=>{const n=Math.hypot(...a);return a.map(v=>v/n)};
const dot=(a,b)=>a.reduce((n,v,i)=>n+v*b[i],0);
const direction=normalize([-16,5.2,8]);
const right=normalize([direction[2],0,-direction[0]]);
const up=[direction[1]*right[2],direction[2]*right[0]-direction[0]*right[2],-direction[1]*right[0]];
export function fitBattleCamera(points,width,height,insets={}){
  width=Math.max(1,width);height=Math.max(1,height);
  const clamp=(n,max)=>Math.max(0,Math.min(Number(n)||0,max));
  const r=clamp(insets.right,width*.4),t=clamp(insets.top,height*.3),b=clamp(insets.bottom,height*.4);
  const fov=40,tan=Math.tan(fov*Math.PI/360),aspect=width/height;
  const safeX=Math.max(.2,(width-r)/width)*.9,safeY=Math.max(.2,(height-t-b)/height)*.9;
  let distance=12.8;
  for(const p of points){
    const d=dot(p,direction);
    distance=Math.max(distance,d+Math.abs(dot(p,right))/(tan*aspect*safeX),d+Math.abs(dot(p,up))/(tan*safeY));
  }
  return {fov,distance,direction:[...direction],offsetX:r/2,offsetY:(b-t)/2,safe:{left:0,right:width-r,top:t,bottom:height-b}};
}
