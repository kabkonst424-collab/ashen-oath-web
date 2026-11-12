export function arcPoint(a,b,t,lift,side,out){
 const x=b.x-a.x,z=b.z-a.z,length=Math.hypot(x,z)||1,bend=4*t*(1-t);
 return out.set(a.x+x*t-z/length*side*bend,a.y+(b.y-a.y)*t+lift*bend,a.z+z*t+x/length*side*bend);
}
