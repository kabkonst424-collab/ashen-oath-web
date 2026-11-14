import { magicProfile } from './data/magic-profiles.js?v=forged-019';
import { heavyTiming } from './combat200-animation-policy.js?v=0.16.0-demo';
const make=(kind,duration,release,impact)=>Object.freeze({kind,duration,release,impact,spacing:duration+.13,releasePose:7/24,impactPose:.5});
export const ACTION_TIMINGS=Object.freeze({
 sword:make('sword',.88,.23,.41),spear:make('spear',.94,.24,.45),bow:make('bow',1.04,.36,.62),beast:make('beast',.78,.19,.34),
 heal:make('heal',1.02,.32,.57),fire:make('fire',1.10,.34,.64),ice:make('ice',1.08,.35,.63),lightning:make('lightning',.86,.28,.43),ward:make('ward',.98,.30,.53),
 legacy:Object.freeze({kind:'legacy',duration:.92,release:.92*7/24,impact:.46,spacing:1.05,releasePose:7/24,impactPose:.5})
});
export function actionTimeline(event={},actor){
 if(!event.skillId)return heavyTiming(ACTION_TIMINGS.legacy,event);
 const p=magicProfile(event,actor);
 const kind=p.family==='physical'?(p.style==='arrow'?'bow':p.style==='claw'?'beast':p.style==='thrust'?'spear':'sword'):['heal','revive'].includes(p.family)?'heal':['runes','nova'].includes(p.family)?'ward':p.family;
 return heavyTiming(ACTION_TIMINGS[kind]||ACTION_TIMINGS.legacy,event);
}

// Retiming only: authored quaternion/position tracks are never modified.
export function actionClipPhase(age,timing){
 const points=[[0,0],[timing.release,timing.releasePose],[timing.impact,timing.impactPose],[timing.duration,1]];
 if(!Number.isFinite(age)||age<=0)return 0;if(age>=timing.duration)return 1;
 for(let i=1;i<points.length;i++)if(age<=points[i][0]){const a=points[i-1],b=points[i];return a[1]+(b[1]-a[1])*(age-a[0])/(b[0]-a[0]);}return 1;
}
