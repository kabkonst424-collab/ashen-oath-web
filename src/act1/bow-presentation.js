import * as T from '../../assets/vendor/three.module.js';
import {limbSolver} from './limb-ik.js?v=motion-110';

const up = new T.Vector3(0,1,0);

// The Archer stance starts from the same rig's idle, with its arms driven by
// the bow grip and the nock target at the release beat.
export function bowClip(idle) {
  return new T.AnimationClip('ShootBow',idle.duration,idle.tracks.map(track=>track.clone()));
}

function attachBow(actor, world) {
  const arms=['Left','Right'].map(side=>{
    const bones=['Arm','ForeArm','Hand'].map(name=>actor.root.getObjectByName(side+name));
    return bones[1]?.parent===bones[0]&&bones[2]?.parent===bones[1] ? bones : null;
  });
  if(arms.some(arm=>!arm))return null;
  const bow=world.prop('Bow',actor.wrapper,[0,0,0]);
  // Replace the straight string in the source prop with a string that follows
  // the draw hand. Keep the existing limbs, tips, grip and materials.
  bow.traverse(mesh=>{
    if(mesh.isMesh&&mesh.material?.name==='Refresh_Ivory'&&mesh.geometry.attributes.position.count<100)mesh.visible=false;
  });
  const stringGeometry=new T.BufferGeometry().setAttribute('position',new T.BufferAttribute(new Float32Array(9),3));
  const string=new T.Line(stringGeometry,new T.LineBasicMaterial({color:0xc6b69c}));
  string.frustumCulled=false;
  bow.add(string);
  const nock=new T.Object3D();
  nock.name='BowNock';
  bow.add(nock);
  return {
    bow,string,nock,arms,solve:limbSolver(),nockLocal:new T.Vector3(),origin:new T.Vector3(),direction:new T.Vector3(),
    shoulder:new T.Vector3(),grip:new T.Vector3(),draw:new T.Vector3(),elbow:new T.Vector3(),pole:new T.Vector3(),
    right:new T.Vector3(),local:new T.Vector3(),quaternion:new T.Quaternion(),
  };
}

export function updateBow(actor,world) {
  if(actor.options.role!=='myrt'||!actor.actions.ShootBow)return;
  const rig=actor.archery ||= attachBow(actor,world);
  if(!rig)return;
  const ready=actor.battleControlled&&['Idle','ShootBow'].includes(actor.current)&&!actor.presentedDead;
  rig.bow.visible=ready;
  if(actor.stowedBow)actor.stowedBow.visible=!ready;
  if(!ready||!actor.poseSampled)return;
  const {bow,string,arms,solve,origin,direction,shoulder,grip,draw,elbow,pole,right,local,quaternion}=rig;
  actor.wrapper.updateWorldMatrix(true,true);
  actor.wrapper.getWorldPosition(origin);
  const heading=actor.wrapper.rotation.y+(actor.sourceFrontYaw||0);
  direction.set(Math.sin(heading),0,Math.cos(heading));
  const target=actor.actionTargetId&&world.actors.get(actor.actionTargetId);
  const shooting=actor.current==='ShootBow'&&target?.wrapper.visible&&world.time<actor.pulseUntil;
  const timing=actor.presentationTiming;
  const age=shooting ? world.time-actor.actionAt : 0;
  const strength=shooting ? T.MathUtils.smoothstep(age,0,timing.release)*(1-T.MathUtils.smoothstep(age,timing.release+.13,timing.duration)) : 0;
  if(shooting) {
    direction.subVectors(target.wrapper.position,origin);
    direction.y=target.wrapper.position.y+target.refreshHeight*.55-origin.y-actor.refreshHeight*.69;
    direction.normalize();
  }
  right.crossVectors(up,direction).normalize();
  // Open the shoulder line as the bow comes up. The head keeps tracking the
  // opponent while the torso turns. Movement resumes on the unmodified clip.
  const chest=actor.root.getObjectByName('Spine'), head=actor.root.getObjectByName('Head');
  if (chest?.parent&&head?.parent) {
    head.getWorldQuaternion(quaternion);
    chest.parent.getWorldQuaternion(rig.parentQ ||= new T.Quaternion()).invert();
    local.copy(up).applyQuaternion(rig.parentQ);
    chest.quaternion.premultiply((rig.twist ||= new T.Quaternion()).setFromAxisAngle(local,-(.24+.36*strength)));
    chest.updateWorldMatrix(false,true);
    head.quaternion.copy(head.parent.getWorldQuaternion(rig.parentQ).invert().multiply(quaternion)).normalize();
    head.updateWorldMatrix(false,true);
  }
  const height=actor.refreshHeight||2.74;
  arms[0][0].getWorldPosition(shoulder);
  grip.copy(shoulder).addScaledVector(direction,height*(.16+.10*strength))
    .addScaledVector(right,height*(.10+.045*strength)).addScaledVector(up,height*(-.15+.11*strength));
  pole.copy(right).negate().addScaledVector(up,-.64);
  solve(...arms[0],grip,pole);
  arms[0][2].getWorldPosition(grip);
  arms[1][0].getWorldPosition(shoulder);
  // The rear hand draws back by the cheek while the leading arm stays extended.
  draw.copy(grip).addScaledVector(direction,-height*(.13+.17*strength));
  draw.lerp(shoulder.addScaledVector(direction,-height*.095).addScaledVector(up,height*.015),.38*strength);
  pole.copy(right).addScaledVector(direction,-.62);
  solve(...arms[1],draw,pole);
  arms[1][2].getWorldPosition(elbow);
  // Prop axis +X points towards the outside of the bow, -X towards the nock.
  actor.wrapper.worldToLocal(local.copy(grip));
  bow.position.copy(local);
  actor.wrapper.getWorldQuaternion(quaternion).invert();
  local.copy(direction).applyQuaternion(quaternion);
  bow.rotation.set(.12-.14*strength,Math.atan2(-local.z,local.x),0,'YXZ');
  const scale=Math.abs(actor.wrapper.getWorldScale(local).x)||1;
  bow.scale.setScalar(height*.36/scale);
  bow.updateWorldMatrix(false,true);
  bow.worldToLocal(rig.nockLocal.copy(elbow));
  if(shooting && age>=timing.release) {
    const recoil=T.MathUtils.smoothstep(age,timing.release,timing.release+.055);
    rig.nockLocal.x=T.MathUtils.lerp(rig.nockLocal.x,.044,recoil);
    rig.nockLocal.y*=1-recoil;
    rig.nockLocal.z=T.MathUtils.lerp(rig.nockLocal.z,-.049,recoil);
  }
  rig.nock.position.copy(rig.nockLocal);
  const points=string.geometry.attributes.position;
  points.setXYZ(0,.086,.475,-.049);points.setXYZ(1,rig.nockLocal.x,rig.nockLocal.y,rig.nockLocal.z);
  points.setXYZ(2,.002,-.475,-.049);points.needsUpdate=true;
}

export function bowNock(actor) {
  return actor.archery?.bow.visible ? actor.archery.nock : null;
}

export function disposeBow(actor) {
  const string=actor.archery?.string;
  string?.geometry.dispose();
  string?.material.dispose();
}
