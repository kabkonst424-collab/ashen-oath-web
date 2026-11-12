// Optional pose presentation; never creates items or changes inventory/model data.
export function normalizeBattleEquipment(value) {
  if (value == null) return Object.freeze([]);
  if (!Array.isArray(value) || value.length > 1) throw new Error('Invalid battle equipment');
  const vector=(v,n,predicate)=>Array.isArray(v)&&v.length===n&&v.every(x=>Number.isFinite(x)&&predicate(x));
  return Object.freeze(value.map(entry=>{
    if(entry?.object!=='Bow'||entry.parent!=='LeftHand')throw new Error('Unsupported battle equipment binding');
    if(!vector(entry.position,3,x=>Math.abs(x)<=500)||!vector(entry.quaternion,4,x=>Math.abs(x)<=1.01)||!vector(entry.scale,3,x=>x>0&&x<=500))throw new Error('Invalid battle equipment transform');
    if(Math.abs(Math.hypot(...entry.quaternion)-1)>.001)throw new Error('Battle equipment rotation must be normalized');
    return Object.freeze({object:entry.object,parent:entry.parent,position:Object.freeze([...entry.position]),quaternion:Object.freeze([...entry.quaternion]),scale:Object.freeze([...entry.scale])});
  }));
}

export function applyBattleEquipment(actor, bindings) {
  const report={applied:[],skipped:[]};
  // Encounter/NPC carry uses separate actors and keeps the original back slot.
  if(!actor?.options?.hostile||!actor.id?.startsWith('enemy:'))return report;
  for(const binding of bindings||[]){
    const object=actor.root.getObjectByName(binding.object),parent=actor.root.getObjectByName(binding.parent);
    if(!object||!parent||object===parent){report.skipped.push({object:binding.object,reason:!object?'missing-object':'missing-parent'});continue;}
    if(object.parent!==parent)parent.add(object);
    object.position.fromArray(binding.position);object.quaternion.fromArray(binding.quaternion);object.scale.fromArray(binding.scale);
    object.updateMatrix();object.updateWorldMatrix(true,true);report.applied.push({object:binding.object,parent:binding.parent});
  }
  actor.equipmentPresentationReport=report;
  return report;
}
