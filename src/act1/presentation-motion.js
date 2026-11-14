import {magicProfile} from './data/magic-profiles.js?v=forged-019';
export function combatMotionPolicy(event,actor){const p=magicProfile(event,actor);return {planted:p.family!=='physical'||p.style==='arrow',distance:p.family!=='physical'||p.style==='arrow'?0:p.style==='thrust'?.50:p.style==='claw'?.30:.42};}
export function actionLunge(age,timing,distance){
 if(!(age>0)||age>=timing.duration)return 0;
 const phase=age<=timing.impact?age/timing.impact:1-(age-timing.impact)/(timing.duration-timing.impact);
 const t=Math.max(0,Math.min(1,phase));return distance*t*t*(3-2*t);
}
