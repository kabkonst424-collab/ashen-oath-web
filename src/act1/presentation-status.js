export const STATUS_KINDS=['burn','chill','fracture','disrupt','barrier','cover'];
export function statusRows(state){
 if(!state?.battle)return [];
 return [...(state.party||[]).map(unit=>({id:unit.id,status:state.battle.status?.[unit.id]||{}})),...(state.battle.enemies||[]).map(unit=>({id:unit.uid,status:unit.status||{}}))];
}
export function statusParts(kind,quality){
 if(kind==='cover')return [{kind:'beam',color:0x8de1cb,x:0,y:0,z:0,sx:.014,sy:1,sz:.014,opacity:.2}];
 if(kind==='barrier')return [{kind:'shield',color:0x96c9e8,x:0,y:0,h:.48,z:0,sx:.66,sy:.48,sz:.66,heightScale:true,opacity:.17},{kind:'ring',color:0xb4def3,x:0,y:.08,z:0,sx:.68,sy:.68,sz:.68,rx:-Math.PI/2,opacity:.3}];
 if(kind==='disrupt'){
  const parts=[{kind:'beam',color:0xc4a0ec,x:0,y:.18,h:1,z:0,sx:.025,sy:.55,sz:.025,rz:Math.PI/4},{kind:'beam',color:0xc4a0ec,x:0,y:.18,h:1,z:0,sx:.025,sy:.55,sz:.025,rz:-Math.PI/4},{kind:'ring',color:0xc4a0ec,x:0,y:.18,h:1,z:0,sx:.34,sy:.34,sz:.34}];return quality==='low'?parts.slice(0,2):parts;
 }
 if(kind==='fracture'){
  const parts=[{kind:'beam',color:0xe5bd87,x:-.43,y:1.28,z:0,sx:.035,sy:.38,sz:.035,rz:-.34},{kind:'beam',color:0xe5bd87,x:.43,y:1.66,z:0,sx:.035,sy:.38,sz:.035,rz:-.34},{kind:'beam',color:0xe5bd87,x:-.43,y:1.84,z:0,sx:.035,sy:.24,sz:.035,rz:.34},{kind:'beam',color:0xe5bd87,x:.43,y:1.1,z:0,sx:.035,sy:.24,sz:.035,rz:.34}];return quality==='low'?parts.slice(0,2):parts;
 }
 if(kind==='chill')return [{kind:'ring',color:0x79d9f7,x:0,y:.35,z:0,sx:.52,sy:.52,sz:.52,rx:-Math.PI/2},{kind:'shard',color:0xcdf3ff,x:.37,y:.43,z:0,sx:.07,sy:.15,sz:.07}];
 if(kind==='burn')return [{kind:'shard',color:0xffa24a,x:-.16,y:.24,z:0,sx:.06,sy:.16,sz:.06},{kind:'shard',color:0xff6832,x:.16,y:.32,z:0,sx:.055,sy:.12,sz:.055}];
 return [];
}
