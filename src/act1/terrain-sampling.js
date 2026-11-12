// Verified interior regions of the original packed GLB atlases (flipY=false).
export const ATLAS_DOMAINS=Object.freeze({
 terrain_village:[.035,.55,.42,.39],
 terrain_forest:[.267,.735,.08,.08],
 terrain_marsh:[.57,.56,.36,.36],
 terrain_ruin:[.035,.62,.30,.30],
 path_strip:[.014,.28,.245,.69],
});
export function atlasDomain(id){return [...(ATLAS_DOMAINS[id]||ATLAS_DOMAINS.terrain_ruin)];}

export function safeAtlasDomain(id){const r=atlasDomain(id),size=id==='path_strip'?512:1024,g=2/size;return [r[0]+g,r[1]+g,r[2]-2*g,r[3]-2*g];}
export function atlasAspect(rect){return [1,rect[2]/rect[3]];}

export function cellHash(x,y){let n=(Math.imul(x|0,1597334677)+Math.imul(y|0,3812015801))>>>0;n=Math.imul(n^(n>>>16),2246822519)>>>0;n=Math.imul(n^(n>>>13),3266489917)>>>0;return ((n^(n>>>16))>>>0)%16777216/16777216;}
export function valueNoise(x,y){let i=Math.floor(x),j=Math.floor(y),a=x-i,b=y-j;a=a*a*(3-2*a);b=b*b*(3-2*b);return (cellHash(i,j)*(1-a)+cellHash(i+1,j)*a)*(1-b)+(cellHash(i,j+1)*(1-a)+cellHash(i+1,j+1)*a)*b;}
export function domainWarp(uv){return [uv[0]+(valueNoise(uv[0]*.31,uv[1]*.31)-.5)*.24,uv[1]+(valueNoise(uv[0]*.31+17.3,uv[1]*.31+9.7)-.5)*.24];}
export function lattice(uv){let q=[uv[0]-uv[1]/Math.sqrt(3),uv[1]*2/Math.sqrt(3)],x=Math.floor(q[0]),y=Math.floor(q[1]),f=[q[0]-x,q[1]-y];return f[0]+f[1]<1?{keys:[[x,y],[x+1,y],[x,y+1]],weights:[1-f[0]-f[1],f[0],f[1]]}:{keys:[[x+1,y+1],[x,y+1],[x+1,y]],weights:[f[0]+f[1]-1,1-f[0],1-f[1]]};}
export function blendWeights(w){let v=w.map(t=>t*t*t*(t*(t*6-15)+10)),sum=v.reduce((a,b)=>a+b,0);return v.map(t=>t/Math.max(sum,1e-12));}
export function rotationFor(key){return Math.floor(cellHash(key[0]+37,key[1]+89)*4);}
export function densityFor(key){return .88+cellHash(key[0]+113,key[1]+29)*.24;}
export function mirrorAxis(p){let t=1-Math.abs(((p*.5)%1+1)%1*2-1);let sign=p-Math.floor(p/2)*2<1?1:-1;return {value:t*t*(3-2*t),derivative:sign*6*t*(1-t)};}
export function samplePlan(x,z,{id='terrain_village',scale=.15}={}){
 const domain=domainWarp([x*scale,z*scale]),support=lattice(domain),weights=blendWeights(support.weights),rect=safeAtlasDomain(id),aspect=atlasAspect(rect);
 const taps=support.keys.map((key,i)=>{let rotation=rotationFor(key),angle=rotation*Math.PI/2,c=Math.round(Math.cos(angle)),sn=Math.round(Math.sin(angle)),density=densityFor(key),rot=[c,-sn,sn,c],q=[(c*domain[0]-sn*domain[1])*density*aspect[0]+cellHash(key[0]+17,key[1]+53)*2,(sn*domain[0]+c*domain[1])*density*aspect[1]+cellHash(key[0]+71,key[1]+19)*2],m=q.map(mirrorAxis),jacobian=[rect[2]*m[0].derivative*density*c,rect[2]*m[0].derivative*density*-sn,rect[3]*m[1].derivative*density*aspect[1]*sn,rect[3]*m[1].derivative*density*aspect[1]*c];return {key,weight:weights[i],uv:m.map((v,j)=>rect[j]+rect[j+2]*v.value),jacobian,rotation,rot,density,mirror:m.map(v=>v.derivative)};});return {domain,weights,taps};
}
export const TERRAIN_GLSL=`
varying vec3 vTerrainWorld;
uniform vec4 terrainRect;
uniform float terrainScale,terrainMacro,terrainDetail,terrainRoughness;
uniform float terrainMean;
#ifdef TERRAIN_PATH
varying float vTerrainEdge;
#endif
struct TerrainTap {vec2 uv;mat2 jac;mat2 rot;vec2 mirror;float density;};
TerrainTap terrainTaps[3];
vec2 terrainDx,terrainDy,terrainUV;
vec3 terrainWeights;
float terrainVariance;
float terrainHash(ivec2 p){uint n=uint(p.x)*1597334677u+uint(p.y)*3812015801u;n=(n^(n>>16u))*2246822519u;n=(n^(n>>13u))*3266489917u;return float((n^(n>>16u))&16777215u)/16777216.;}
float terrainNoise(vec2 p){ivec2 i=ivec2(floor(p));vec2 f=fract(p);f=f*f*(3.-2.*f);return mix(mix(terrainHash(i),terrainHash(i+ivec2(1,0)),f.x),mix(terrainHash(i+ivec2(0,1)),terrainHash(i+ivec2(1,1)),f.x),f.y);}
vec2 terrainWarp(vec2 uv){return uv+(vec2(terrainNoise(uv*.31),terrainNoise(uv*.31+vec2(17.3,9.7)))-.5)*.24;}
mat2 terrainRotation(ivec2 key){float r=floor(terrainHash(key+ivec2(37,89))*4.);if(r<.5)return mat2(1.,0.,0.,1.);if(r<1.5)return mat2(0.,1.,-1.,0.);if(r<2.5)return mat2(-1.,0.,0.,-1.);return mat2(0.,-1.,1.,0.);}
float terrainDensity(ivec2 key){return .88+terrainHash(key+ivec2(113,29))*.24;}
TerrainTap terrainTap(vec2 domain,ivec2 key){
 TerrainTap tap;tap.rot=terrainRotation(key);tap.density=terrainDensity(key);
 vec2 aspect=vec2(1.,terrainRect.z/terrainRect.w);
 vec2 p=(tap.rot*domain)*tap.density*aspect+vec2(terrainHash(key+ivec2(17,53)),terrainHash(key+ivec2(71,19)))*2.;
 vec2 v=1.-abs(fract(p*.5)*2.-1.);
 tap.mirror=mix(vec2(1.),vec2(-1.),step(vec2(1.),mod(p,2.)))*6.*v*(1.-v);
 tap.uv=terrainRect.xy+(v*v*(3.-2.*v))*terrainRect.zw;
 tap.jac=mat2(terrainRect.z*tap.mirror.x,0.,0.,terrainRect.w*tap.mirror.y)*mat2(aspect.x,0.,0.,aspect.y)*tap.rot*tap.density;
 return tap;
}
void terrainSupport(vec2 uv,out ivec2 a,out ivec2 b,out ivec2 c,out vec3 weights){vec2 q=vec2(uv.x-uv.y*.57735026919,uv.y*1.15470053838),f=fract(q);ivec2 i=ivec2(floor(q));if(f.x+f.y<1.){a=i;b=i+ivec2(1,0);c=i+ivec2(0,1);weights=vec3(1.-f.x-f.y,f.x,f.y);}else{a=i+ivec2(1,1);b=i+ivec2(0,1);c=i+ivec2(1,0);weights=vec3(f.x+f.y-1.,1.-f.x,1.-f.y);}}
vec3 terrainBlendWeights(vec3 w){w=w*w*w*(w*(w*6.-15.)+10.);return w/max(dot(w,vec3(1.)),1e-8);}
void terrainPrepare(vec2 uv){
 terrainUV=terrainWarp(uv);terrainDx=dFdx(terrainUV);terrainDy=dFdy(terrainUV);
 float footprint=terrainDetail<.5?1.45:1.;terrainDx*=footprint;terrainDy*=footprint;
 ivec2 a,b,c;vec3 w;terrainSupport(terrainUV,a,b,c,w);terrainWeights=terrainBlendWeights(w);
 terrainTaps[0]=terrainTap(terrainUV,a);terrainTaps[1]=terrainTap(terrainUV,b);terrainTaps[2]=terrainTap(terrainUV,c);terrainVariance=0.;
}
vec4 terrainFetch(sampler2D image,TerrainTap tap){return textureGrad(image,tap.uv,tap.jac*terrainDx,tap.jac*terrainDy);}
vec4 terrainSample(sampler2D image){return terrainFetch(image,terrainTaps[0])*terrainWeights.x+terrainFetch(image,terrainTaps[1])*terrainWeights.y+terrainFetch(image,terrainTaps[2])*terrainWeights.z;}
vec2 terrainSlope(sampler2D image,TerrainTap tap){vec3 n=terrainFetch(image,tap).xyz*2.-1.;
#ifdef USE_PACKED_NORMALMAP
n.z=sqrt(max(1.-dot(n.xy,n.xy),0.));
#endif
vec2 slope=clamp(n.xy/max(n.z,.25),vec2(-3.),vec2(3.));return transpose(tap.rot)*(slope*tap.mirror)*tap.density;}
vec3 terrainNormal(sampler2D image){vec2 a=terrainSlope(image,terrainTaps[0]),b=terrainSlope(image,terrainTaps[1]),c=terrainSlope(image,terrainTaps[2]),s=a*terrainWeights.x+b*terrainWeights.y+c*terrainWeights.z;terrainVariance=max(dot(a,a)*terrainWeights.x+dot(b,b)*terrainWeights.y+dot(c,c)*terrainWeights.z-dot(s,s),0.);return normalize(vec3(s,1.));}
mat3 terrainTangentFrame(vec3 eye,vec3 n,vec2 uv){
vec3 q0=dFdx(eye),q1=dFdy(eye);vec2 s0=dFdx(uv),s1=dFdy(uv);float det=s0.x*s1.y-s0.y*s1.x;
vec3 axis=abs(n.y)<.9?vec3(0.,1.,0.):vec3(1.,0.,0.);vec3 t=normalize(cross(axis,n)),b=cross(n,t);
if(abs(det)>1e-10){vec3 rawT=(q0*s1.y-q1*s0.y)/det,rawB=(q1*s0.x-q0*s1.x)/det;vec3 projected=rawT-n*dot(n,rawT);if(dot(projected,projected)>1e-12){t=normalize(projected);b=normalize(cross(n,t));b*=dot(b,rawB)<0.?-1.:1.;}}return mat3(t,b,n);}
`;

export function domainJacobian(x,z,scale=.15){const e=1e-5,a=domainWarp([x*scale,z*scale]),b=domainWarp([(x+e)*scale,z*scale]),c=domainWarp([x*scale,(z+e)*scale]);return [(b[0]-a[0])/e,(c[0]-a[0])/e,(b[1]-a[1])/e,(c[1]-a[1])/e];}

export function normalSlopeForTap(tap,n){let z=Math.max(n[2],.25),a=Math.max(-3,Math.min(3,n[0]/z))*tap.mirror[0]*tap.density,b=Math.max(-3,Math.min(3,n[1]/z))*tap.mirror[1]*tap.density;return [tap.rot[0]*a+tap.rot[2]*b,tap.rot[1]*a+tap.rot[3]*b];}

export function blendNormalSlopes(plan,normals){const slopes=plan.taps.map((tap,i)=>normalSlopeForTap(tap,normals[i])),s=[0,0];for(let i=0;i<3;i++)for(let c=0;c<2;c++)s[c]+=slopes[i][c]*plan.weights[i];let length=Math.hypot(...s,1);return {normal:[s[0]/length,s[1]/length,1/length],slopes};}

export function tangentFrame(q0,q1,s0,s1,normal){const dot=(a,b)=>a.reduce((n,v,i)=>n+v*b[i],0),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],unit=a=>{let l=Math.hypot(...a);return a.map(v=>v/l);};let n=unit(normal),det=s0[0]*s1[1]-s0[1]*s1[0],t=unit(cross(Math.abs(n[1])<.9?[0,1,0]:[1,0,0],n)),b=cross(n,t);if(Math.abs(det)>1e-10){let raw=q0.map((v,i)=>(v*s1[1]-q1[i]*s0[1])/det),rb=q1.map((v,i)=>(v*s0[0]-q0[i]*s1[0])/det),proj=raw.map((v,i)=>v-n[i]*dot(n,raw));if(dot(proj,proj)>1e-12){t=unit(proj);b=unit(cross(n,t));if(dot(b,rb)<0)b=b.map(v=>-v);}}return [t,b,n];}

// Means measured from original base-color pixels, decoded from sRGB before averaging.
export const ATLAS_LINEAR_LUMINANCE=Object.freeze({terrain_village:.1294318918,terrain_forest:.0682348593,terrain_marsh:.0464828266,terrain_ruin:.2745454960,path_strip:.4328306096});
export function contrastColor(rgb,weights,mean){let y=rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722,gain=Math.min(1.3,1/Math.sqrt(weights.reduce((n,v)=>n+v*v,0))),target=Math.max(0,mean+(y-mean)*gain),ratio=Math.max(.78,Math.min(1.22,target/Math.max(y,1e-5)));return rgb.map(v=>Math.min(1,Math.max(0,v*ratio)));}
