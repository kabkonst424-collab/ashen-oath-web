import {magicProfile} from './data/magic-profiles.js?v=motion-110';

const smooth = t => {const s=Math.max(0,Math.min(1,t));return s*s*(3-2*s);};

export function combatMotionPolicy(event, actor, target) {
  const profile = magicProfile(event, actor);
  const planted = profile.family !== 'physical' || profile.style === 'arrow' || event.kind !== 'attack' && !target;
  if (planted || !target || !actor?.wrapper || !target.wrapper) return { planted, distance: 0 };
  const from = actor.wrapper.position, to = target.wrapper.position;
  const separation = Math.hypot(to.x - from.x, to.z - from.z);
  const actorHeight = actor.refreshHeight || 2.8, targetHeight = target.refreshHeight || 2.8;
  const reach = (profile.style === 'thrust' ? .89 : profile.style === 'claw' ? .51 : .68) * actorHeight + targetHeight * .17;
  return { planted: false, distance: Math.max(0, Math.min(separation - reach, 4.3)) };
}

export function meleeTiming(body, motion) {
  const approachDistance=Math.max(0,motion.distance-.46);
  const approach=approachDistance>.18 ? approachDistance/5.8+.08 : 0;
  if(!approach)return body;
  const turn=.34, retreat=motion.distance/5.7+.10;
  return {...body,body,approach,turn,retreat,approachDistance,
    release:approach+body.release,impact:approach+body.impact,
    duration:approach+body.duration+turn+retreat,spacing:approach+body.spacing+turn+retreat};
}

export function actionLunge(age,timing,distance){
 if(!(age>0)||age>=timing.duration||!distance)return 0;
 if(timing.approach){
  if(age<timing.approach)return timing.approachDistance*smooth(age/timing.approach);
  age-=timing.approach;
  const {body,turn,retreat,approachDistance}=timing;
  if(age<body.duration)return approachDistance+actionLunge(age,body,distance-approachDistance);
  return approachDistance*(1-smooth((age-body.duration-turn)/retreat));
 }
 const advanceStart=timing.impact*.10, contactEnd=timing.impact+Math.min(.08,(timing.duration-timing.impact)*.19);
 if(age<=timing.impact)return distance*smooth((age-advanceStart)/(timing.impact-advanceStart));
 return distance*(1-smooth((age-contactEnd)/(timing.duration-contactEnd)));
}

export function meleeTravel(age,timing) {
  if(!timing?.approach||age<0||age>=timing.duration)return null;
  if(age<timing.approach)return 'forward';
  if(age>=timing.approach+timing.body.duration){
    return age>=timing.approach+timing.body.duration+timing.turn?'back':'turn';
  }
  return null;
}

export function impactRecoil(age,duration,distance) {
 if(!(age>=0)||age>=duration||!distance)return 0;
 const phase=age/duration;
 return distance*(phase<.28?smooth(phase/.28):1-smooth((phase-.28)/.72));
}
