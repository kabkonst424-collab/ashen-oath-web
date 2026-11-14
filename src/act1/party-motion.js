// Presentation-only motion. This never changes authoritative world or save positions.
import {GROUND_CLEARANCE,CLEARANCE_PROVENANCE} from './data/ground-clearance.js?v=0.16.0-demo';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const hash=text=>[...String(text)].reduce((h,c)=>Math.imul(h^c.charCodeAt(0),16777619)>>>0,2166136261);
export function motionProfile(id){
  const a=hash(id),b=hash(id+':stride'),c=hash(id+':settle');
  return {phase:(a%10007)/10007,idleRate:.94+(b%997)/997*.12,strideRate:.97+(a%991)/991*.06,
    reaction:.06+(c%983)/983*.16,gapOffset:((b%977)/977-.5)*.22,maxSpeed:6.05+(c%971)/971*.45};
}
export function loopTiming(id,name,duration,time=0,speed=0){
  const p=motionProfile(id+':'+name),loop=['Idle','Walk','Run'].includes(name);
  if(!loop)return {phase:0,rate:1};
  const rate=name==='Idle'?p.idleRate:p.strideRate*clamp(speed/(name==='Walk'?2.35:5.4),.55,1.28);
  return {phase:duration>0?((p.phase+time*rate/duration)%1)*duration:0,rate};
}
const approach=(value,target,amount)=>value<target?Math.min(target,value+amount):Math.max(target,value-amount);
// A deterministic presentation contract; this does not change model action or RNG timing.
export const COMBAT_MOTION=Object.freeze({duration:.92,impact:.46,spacing:1.05,reaction:.28,finishPad:.12});
export function combatPlaybackRate(name,clipDuration,timing=COMBAT_MOTION){
  return (name==='Attack'||name==='ShootBow'||/^Cast[A-Za-z0-9_]*$/.test(name))&&Number.isFinite(clipDuration)&&clipDuration>0?clipDuration/(timing?.body?.duration||timing?.duration||COMBAT_MOTION.duration):1;
}
export const flightBaseline=base=>base==='moth'?.17:0;
export function mirrorWingDelta(quaternion,rest,scratch){
  scratch.copy(rest).invert().multiply(quaternion).invert();
  quaternion.copy(rest).multiply(scratch);
}
export function groundClearanceLift(base,animation,phase,weight=1,baseline=0){
  const samples=animation==='Attack'?GROUND_CLEARANCE[base]:null;
  if(!samples)return 0;
  phase=clamp(Number(phase)||0,0,1);let a=samples[0],b=samples.at(-1);
  for(let i=1;i<samples.length;i++){b=samples[i];if(b.phase>=phase)break;a=b;}
  const t=b.phase>a.phase?(phase-a.phase)/(b.phase-a.phase):0,minY=a.minY+(b.minY-a.minY)*t+baseline;
  return minY<-.0001?(-minY+CLEARANCE_PROVENANCE.marginMetres*Math.sin(Math.PI*phase))*clamp(Number(weight)||0,0,1):0;
}

/** Followers travel independently along the leader's actual polyline, not a rotating offset. */
export class PartyTrail {
  constructor(constrain=p=>({...p})){this.constrain=constrain;this.points=[];this.followers=new Map();}
  reset(leader,angle=0){
    this.points=[];this.followers.clear();
    // A safe starting tail is used only after load/area changes, never while walking.
    for(let i=24;i>=0;i--){const d=i*.36,p=this.constrain({x:leader.x-Math.sin(angle)*d,z:leader.z-Math.cos(angle)*d});this.append(p);}
    this.lastLeader={...leader};
  }
  retain(ids){const present=new Set(ids);for(const id of this.followers.keys())if(!present.has(id))this.followers.delete(id);}
  append(point){const last=this.points.at(-1),d=last?distance(last,point):0;if(last&&d<.001)return;this.points.push({x:point.x,z:point.z,s:(last?.s||0)+d});}
  record(leader,angle=0){
    if(!this.points.length||distance(this.lastLeader||leader,leader)>8){this.reset(leader,angle);return true;}
    this.lastLeader={...leader};
    if(distance(this.points.at(-1),leader)>.035)this.append(leader);
    // Keep enough history for the entire party while bounding long-session memory.
    const head=this.points.at(-1).s;
    while(this.points.length>2&&this.points[1].s<head-90)this.points.shift();
    return false;
  }
  sample(progress){
    const points=this.points;if(!points.length)return {x:0,z:0,angle:0};
    progress=clamp(progress,points[0].s,points.at(-1).s);
    let a=points[0],b=points[1]||a;
    for(let i=1;i<points.length;i++){b=points[i];if(b.s>=progress)break;a=b;}
    const span=b.s-a.s,t=span>0?clamp((progress-a.s)/span,0,1):0;
    return {x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t,angle:span>0?Math.atan2(b.x-a.x,b.z-a.z):0};
  }
  step(id,index,delta){
    const dt=clamp(Number(delta)||0,0,.1),head=this.points.at(-1)?.s||0,profile=motionProfile(id),gap=index*2.2+profile.gapOffset;
    let f=this.followers.get(id);
    if(!f){const progress=Math.max(this.points[0]?.s||0,head-gap),p=this.sample(progress);f={progress,speed:0,moving:false,delay:0,angle:p.angle,locomotion:'Idle'};this.followers.set(id,f);}
    const target=Math.max(this.points[0]?.s||0,head-gap),remaining=Math.max(0,target-f.progress);
    if(dt>0){
      if(!f.moving&&remaining>.38){if(!f.delay)f.delay=profile.reaction;f.delay=Math.max(0,f.delay-dt);if(!f.delay)f.moving=true;}
      else if(remaining<.04){f.moving=false;f.delay=0;}
      const desired=f.moving?Math.min(profile.maxSpeed,Math.sqrt(2*7.5*remaining)):0;
      f.speed=approach(f.speed,desired,(desired<f.speed?7.5:5.2)*dt);
      const travel=Math.min(remaining,f.speed*dt);f.progress+=travel;
      const actualSpeed=travel/dt;
      if(actualSpeed>.05)f.angle=this.sample(f.progress+.08).angle;
      if(actualSpeed<.1)f.locomotion='Idle';
      else if(f.locomotion==='Run'?actualSpeed>2.9:actualSpeed>3.6)f.locomotion='Run';
      else f.locomotion='Walk';
      f.actualSpeed=actualSpeed;
    }
    const p=this.sample(f.progress);
    return {...p,angle:f.angle,speed:f.actualSpeed||0,animation:f.locomotion,progress:f.progress};
  }
}
