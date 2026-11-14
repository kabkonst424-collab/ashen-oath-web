import * as T from '../../assets/vendor/three.module.js';
import { limbSolver } from './limb-ik.js?v=motion-110';

const UP = new T.Vector3(0, 1, 0);
const SIDES = ['Left', 'Right'];
const { clamp, smoothstep } = T.MathUtils;
const cycle = value => (value % 1 + 1) % 1;

function mean(points) {
  const centre = new T.Vector3();
  for (const point of points) centre.add(point);
  return centre.multiplyScalar(1 / points.length);
}

function shoeMarkers(meshes, names, forward) {
  const points = [];
  const point = new T.Vector3();
  for (const mesh of meshes) {
    const indices = mesh.geometry.getAttribute('skinIndex');
    const weights = mesh.geometry.getAttribute('skinWeight');
    if (!indices || !weights) continue;
    const bones = new Set(mesh.skeleton.bones.flatMap((bone, i) => names.includes(bone.name) ? [i] : []));
    if (!bones.size) continue;
    for (let i = 0; i < indices.count; i++) {
      let weight = 0;
      for (let j = 0; j < 4; j++) if (bones.has(indices.getComponent(i, j))) weight += weights.getComponent(i, j);
      if (weight >= .57) points.push(mesh.getVertexPosition(i, point).applyMatrix4(mesh.matrixWorld).clone());
    }
  }
  if (points.length < 12) return null;
  points.sort((a,b) => a.y-b.y);
  // Select the front and back of the sole using actual skinned geometry. Local
  // axes of the ankle joints differ between rigs, and also between left and right.
  const sole = points.slice(0,Math.ceil(points.length*.55)).sort((a,b)=>a.dot(forward)-b.dot(forward));
  const n = Math.max(3,Math.min(28,Math.floor(sole.length*.19)));
  return {heel:mean(sole.slice(0,n)), toe:mean(sole.slice(-n))};
}

export function preparePartyGait(actor) {
  if (!actor.options.party || Math.abs(actor.flightBaseline || 0) > .02) return;
  const bone = name => actor.root.getObjectByName(name);
  const hips=bone('Hips'), spine=bone('Spine02')||bone('Spine01')||bone('Spine'), head=bone('Head');
  if (!hips?.parent || !spine?.parent || !head) return;
  actor.wrapper.updateMatrixWorld(true);
  const origin = actor.wrapper.getWorldPosition(new T.Vector3());
  const yaw = actor.sourceFrontYaw || 0;
  const forward = new T.Vector3(Math.sin(yaw),0,Math.cos(yaw));
  const right = new T.Vector3().crossVectors(UP,forward);
  const meshes = [];
  actor.root.traverse(mesh=>{if(mesh.isSkinnedMesh)meshes.push(mesh);});
  const legs = SIDES.map(side=>{
    const thigh=bone(side+'UpLeg'), shin=bone(side+'Leg'), foot=bone(side+'Foot'), toe=bone(side+'ToeBase');
    if (shin?.parent!==thigh || foot?.parent!==shin || toe?.parent!==foot) return null;
    const heelToToe=shoeMarkers(meshes,[foot.name,toe.name],forward);
    if (!heelToToe) return null;
    const {heel,toe:tip}=heelToToe;
    const axis=tip.clone().sub(heel).normalize(), across=new T.Vector3().crossVectors(UP,axis).normalize();
    if (across.lengthSq()<.9 || tip.distanceTo(heel)<.08) return null;
    const normal=new T.Vector3().crossVectors(axis,across);
    const basis=new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(across,normal,axis));
    const inverseBasis=basis.clone().invert();
    const ankle=foot.getWorldPosition(new T.Vector3());
    const offset=point=>point.clone().sub(ankle).applyQuaternion(inverseBasis);
    const heelOffset=offset(heel), tipOffset=offset(tip);
    const length=thigh.getWorldPosition(new T.Vector3()).distanceTo(shin.getWorldPosition(new T.Vector3()))+
      shin.getWorldPosition(new T.Vector3()).distanceTo(ankle);
    const sideOffset=ankle.clone().sub(origin).dot(right);
    return {thigh,shin,foot,toe,length,sideOffset,restToe:toe.quaternion.clone(),
      ankleInShoe:inverseBasis.clone().multiply(foot.getWorldQuaternion(new T.Quaternion())),
      heel:heelOffset,tip:tipOffset,ankleHeight:-Math.min(heelOffset.y,tipOffset.y),
      pin:new T.Vector3(),target:new T.Vector3(),rotation:new T.Quaternion(),
      lastSole:new T.Vector3(),settleOffset:new T.Vector3(),
      fore:0,lift:0,pitch:0,presentedLift:0,presentedPitch:0,settleLift:0,settlePitch:0,planted:false};
  });
  if (legs.some(leg=>!leg)) return;
  actor.partyGait={hips,spine,head,legs,solve:limbSolver(),origin,forward,right,
    centre:new T.Vector3(),sole:new T.Vector3(),heel:new T.Vector3(),tip:new T.Vector3(),
    point:new T.Vector3(),axis:new T.Vector3(),pole:new T.Vector3(),facing:new T.Quaternion(),
    alignment:new T.Quaternion(),adjustment:new T.Quaternion(),previousMode:null};
}

function footPose(leg, index, rig, ground, step) {
  const {walk, run, phase, cycleDistance, delta, snap, changed, release} = step;
  const support = run ? .43 : .62;
  const age=cycle(phase-index*.5);
  const stance=walk&&age<support;
  const stride=clamp(cycleDistance*support,leg.length*.24,leg.length*(run?1.08:.91));
  const ahead=.5*stride+(run?.025:.035)*leg.length;
  const pass=clamp((age-support)/(1-support),0,1);
  if (walk) {
    leg.fore = stance ? ahead-stride*(age/support) : ahead-stride*(1-smoothstep(pass,0,1));
    leg.lift = stance ? 0 : Math.sin(Math.PI*pass)**1.65*leg.length*(run?.21:.108);
    // Raise the heel at push-off and lead with it again at the next strike.
    if (stance) leg.pitch=.16*(1-smoothstep(age,0,.13))-.34*smoothstep(age,support-.16,support);
    else leg.pitch=-.34*(1-smoothstep(pass,0,.45))+.16*smoothstep(pass,.5,1);
  } else {
    const blend=snap?1:1-Math.exp(-delta*13);
    leg.fore+=(.025*leg.length-leg.fore)*blend;
    leg.lift*=1-blend;leg.pitch*=1-blend;
  }
  const side=Math.sign(leg.sideOffset)||1;
  const width=clamp(Math.abs(leg.sideOffset),leg.length*.10,leg.length*.21);
  const sole=rig.sole.copy(rig.origin).addScaledVector(rig.forward,leg.fore)
    .addScaledVector(rig.right,side*(width+leg.lift*.19));
  if(stance) {
    if(!leg.planted||snap)leg.pin.copy(sole);
    const drift=Math.hypot(sole.x-leg.pin.x,sole.z-leg.pin.z);
    const strength=(.92-.16*smoothstep(age,support-.10,support))*(1-smoothstep(drift,.16,.42));
    sole.lerp(leg.pin,strength);
  }
  leg.planted=stance;
  // Carry the last displayed plant into gait changes. Let its offset decay
  // while the new phase advances, so switching clips cannot snap either ankle.
  if (changed) {
    leg.settleOffset.copy(leg.lastSole).sub(sole);
    leg.settleLift=leg.presentedLift-leg.lift;
    leg.settlePitch=leg.presentedPitch-leg.pitch;
  }
  sole.addScaledVector(leg.settleOffset,release);
  leg.lastSole.copy(sole);
  leg.presentedLift=Math.max(0,leg.lift+leg.settleLift*release);
  leg.presentedPitch=leg.pitch+leg.settlePitch*release;

  const toeOut=side*(walk ? .068+.028*Math.sin(Math.PI*pass)**2 : .09);
  const length = leg.heel.distanceTo(leg.tip);
  const frontGround=ground(sole.x+rig.forward.x*length*.5,sole.z+rig.forward.z*length*.5);
  const backGround=ground(sole.x-rig.forward.x*length*.5,sole.z-rig.forward.z*length*.5);
  const slope=clamp(Math.atan2(frontGround-backGround,length),-.22,.22);
  // Positive foot pitch denotes toe-up. Rotating local +Z around +X is toe-down.
  leg.rotation.setFromAxisAngle(UP,toeOut).premultiply(rig.facing);
  rig.axis.set(1,0,0);
  leg.rotation.multiply(rig.adjustment.setFromAxisAngle(rig.axis,-leg.presentedPitch-slope));
  const heel=rig.heel.copy(leg.heel).applyQuaternion(leg.rotation), tip=rig.tip.copy(leg.tip).applyQuaternion(leg.rotation);
  leg.target.copy(sole).addScaledVector(heel,-.5).addScaledVector(tip,-.5);
  const floor=Math.max(ground(leg.target.x+heel.x,leg.target.z+heel.z)-heel.y,
    ground(leg.target.x+tip.x,leg.target.z+tip.z)-tip.y);
  leg.target.y=floor+.012+leg.presentedLift;
}

function balanceTorso(rig,walk,run,phase) {
  const axis=rig.axis;
  rig.head.getWorldPosition(axis).sub(rig.hips.getWorldPosition(rig.point));
  const pitch=Math.atan2(axis.dot(rig.forward),axis.y);
  const roll=Math.atan2(axis.dot(rig.right),axis.y);
  const desiredPitch=run?.12:walk?.052:.016, cadence=phase*Math.PI*2;
  rig.spine.parent.getWorldQuaternion(rig.alignment).invert();
  axis.copy(rig.right).applyQuaternion(rig.alignment);
  rig.spine.quaternion.premultiply(rig.adjustment.setFromAxisAngle(axis,
    clamp(desiredPitch-pitch,-.27,.14)));
  axis.copy(rig.forward).applyQuaternion(rig.alignment);
  rig.spine.quaternion.premultiply(rig.adjustment.setFromAxisAngle(axis,
    clamp(roll-(walk?.024*Math.sin(cadence):0),-.1,.1))).normalize();
}

export function applyPartyGait(actor,ground,yaw,time,snap) {
  const rig=actor.partyGait, mode=actor.current;
  const action=actor.actions[mode], walk=mode==='Walk'||mode==='Run', run=mode==='Run';
  if (!rig || actor.battleControlled || !action || (!walk&&mode!=='Idle')) {
    if(rig)rig.previousMode=null;
    return false;
  }
  snap ||= rig.previousMode===null;
  const delta=clamp(time-(rig.time??time-.04),.01,.12);
  const changed=!snap&&mode!==rig.previousMode;
  if (snap) rig.transitionAt=null;
  else if (changed) rig.transitionAt=time-delta;
  const release=rig.transitionAt===null?0:1-smoothstep(time-rig.transitionAt,0,.16);
  rig.time=time;
  rig.previousMode=mode;
  const phase=cycle(action.time/action.getClip().duration);
  const cycleDistance=actor.motionSpeed*action.getClip().duration/Math.max(.18,action.getEffectiveTimeScale());
  // Refresh the whole branch after the facing pivot moves and before solving.
  actor.wrapper.updateMatrixWorld(true);
  actor.wrapper.getWorldPosition(rig.origin);
  rig.right.set(Math.cos(yaw),0,-Math.sin(yaw));
  rig.forward.set(Math.sin(yaw),0,Math.cos(yaw));
  rig.facing.setFromAxisAngle(UP,yaw);
  const step = {walk, run, phase, cycleDistance, delta, snap, changed, release};
  rig.legs.forEach((leg, index) => footPose(leg, index, rig, ground, step));
  const centre=rig.hips.getWorldPosition(rig.centre);
  const length=(rig.legs[0].length+rig.legs[1].length)*.5;
  const sway=walk?Math.sin(phase*Math.PI*2)*length*.035:0;
  centre.addScaledVector(rig.right,sway);
  // Pelvis height leaves extension in the support knee and reach in the swing
  // knee. Measure the reach in world space so the solve also works on ramps.
  const floor=ground(rig.origin.x,rig.origin.z);
  const extension=run ? .95 : walk ? .983 : .987;
  let neutralHeight=0, reachableHeight=Infinity;
  for(const leg of rig.legs){
    const thigh=leg.thigh.getWorldPosition(rig.point);
    const x=leg.target.x-thigh.x-sway*rig.right.x,z=leg.target.z-thigh.z-sway*rig.right.z;
    const jointOffset=centre.y-thigh.y;
    const reach=Math.sqrt(Math.max(0,(leg.length*.981)**2-x*x-z*z));
    neutralHeight+=floor+leg.ankleHeight+jointOffset+leg.length*extension;
    reachableHeight=Math.min(reachableHeight,leg.target.y+reach+jointOffset);
  }
  centre.y=Math.min(neutralHeight*.5,reachableHeight);
  rig.hips.position.copy(rig.hips.parent.worldToLocal(centre));
  rig.hips.updateWorldMatrix(false,true);
  balanceTorso(rig,walk,run,phase);
  for(const leg of rig.legs) {
    rig.pole.copy(rig.forward).addScaledVector(rig.right,Math.sign(leg.sideOffset)*.10);
    rig.solve(leg.thigh,leg.shin,leg.foot,leg.target,rig.pole);
    leg.foot.quaternion.copy(leg.shin.getWorldQuaternion(rig.alignment).invert()
      .multiply(leg.rotation).multiply(leg.ankleInShoe)).normalize();
    leg.toe.quaternion.copy(leg.restToe);
  }
  return true;
}

export function resetPartyGait(actor) {
  if(actor.partyGait)actor.partyGait.previousMode=null;
}
