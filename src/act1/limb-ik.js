import * as T from '../../assets/vendor/three.module.js';

export function limbSolver() {
  const [start, middle, end, goal, axis, bend, pole, current, desired] =
    Array.from({length:9},()=>new T.Vector3());
  const delta=new T.Quaternion(), parent=new T.Quaternion(), orientation=new T.Quaternion();
  function aim(bone,joint,from,to) {
    bone.parent.getWorldQuaternion(parent).invert();
    current.copy(from).sub(joint).applyQuaternion(parent).normalize();
    desired.copy(to).sub(joint).applyQuaternion(parent).normalize();
    bone.quaternion.premultiply(delta.setFromUnitVectors(current,desired)).normalize();
    bone.updateWorldMatrix(false,true);
  }
  return (upperBone, lowerBone, tipBone, target, bendDirection) => {
    upperBone.getWorldPosition(start);lowerBone.getWorldPosition(middle);tipBone.getWorldPosition(end);
    const upper=start.distanceTo(middle),lower=middle.distanceTo(end);
    if(Math.min(upper,lower)<.06)return;
    axis.copy(target).sub(start);
    if(axis.lengthSq()<.0001)return;
    const distance=T.MathUtils.clamp(axis.length(),Math.abs(upper-lower)+.025,(upper+lower)*.985);
    axis.normalize();
    goal.copy(start).addScaledVector(axis,distance);
    pole.copy(bendDirection || current.copy(middle).sub(start));
    pole.addScaledVector(axis,-pole.dot(axis));
    if(pole.lengthSq()<.0001)return;
    const depth=(upper*upper-lower*lower+distance*distance)/(2*distance);
    bend.copy(start).addScaledVector(axis,depth)
      .addScaledVector(pole.normalize(),Math.sqrt(Math.max(0,upper*upper-depth*depth)));
    tipBone.getWorldQuaternion(orientation);
    aim(upperBone,start,middle,bend);
    lowerBone.getWorldPosition(middle);tipBone.getWorldPosition(end);
    aim(lowerBone,middle,end,goal);
    tipBone.quaternion.copy(lowerBone.getWorldQuaternion(parent).invert().multiply(orientation)).normalize();
    tipBone.updateWorldMatrix(false,true);
  };
}
