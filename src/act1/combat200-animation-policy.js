// Visual contracts only. Combat resources, target choice and RNG remain in model.js.
export function heavyTiming(base,event={}){
 if(event.heavy!==true)return base;
 return Object.freeze({...base,duration:base.duration*1.2,release:base.release*1.35,impact:base.impact*1.22,spacing:base.duration*1.2+.13});
}
export function heavyAnimation(actor,event){return event?.heavy===true&&actor?.actions?.CastHeavy?'CastHeavy':null;}
export function reactionPhase(now,at,duration=.28){return Math.max(0,Math.min(1,(now-at)/duration));}
export function contactReaction(event={}){return event.source!=='burn';}
export function transitionBlend(from,to){return to==='Hit'?.035:['Idle','Walk','Run'].includes(to)&&['Idle','Walk','Run'].includes(from)?.24:.12;}
export function hasUnsettledDeath(actors){
 for(const actor of actors.values()){
  if(actor.wrapper?.visible===false||actor.restoredCorpse)continue;
  const death=actor.actions?.Death,duration=death?.getClip?.().duration;
  if(!(duration>0))continue;
  if(actor.presentedDead&&death.time<duration-1e-4)return true;
  if(!actor.presentedDead&&actor.lastHp<=0&&actor.deathAt>0)return true;
 }
 return false;
}
