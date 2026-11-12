import * as T from '../../assets/vendor/three.module.js';
import {GLTFLoader} from '../../assets/vendor/GLTFLoader.js';
import {BASE_MODELS} from './graphics-refresh.js?v=0.16.0-demo';
import {mergeGeometries} from '../../assets/vendor/BufferGeometryUtils.js';
import {TerrainMaterials} from './terrain-material.js?v=0.16.0-demo';
import {fetchBytes} from './resource-loader.js?v=0.16.0-demo';

// This module is installed after graphics-refresh. It changes presentation only;
// the authoritative ellipse, interaction definitions and campaign state stay in model.js.
export const WORLD_SLOTS=Object.freeze(['tree','rock','grass','wheat','house','tower','wall','pillar','arch','altar_inspect','brazier','well','chest','crate','barrel','camp','puzzle','bookshelf_book','merchant_stall','bridge','cart','crane','waterwheel','banner','satchel','basket','lantern','terrain_village','terrain_forest','terrain_marsh','terrain_ruin','path_strip','water_strip']);
export const EXEMPT_WEAPONS=Object.freeze(['Sword','Shield','Staff','Spear','Censer','Hammer','Bow','Crossbow','Oar']);
export const PROP_SLOTS=Object.freeze({Rock:'rock',House:'house',Tower:'tower',Wall:'wall',Pillar:'pillar',Arch:'arch',Altar:'altar_inspect',Inspect:'altar_inspect',Brazier:'brazier',Well:'well',Chest:'chest',Crate:'crate',Barrel:'barrel',Camp:'camp',Puzzle:'puzzle',Bookshelf:'bookshelf_book',Book:'book',Stall:'merchant_stall',Bridge:'bridge',Cart:'cart',Crane:'crane',Waterwheel:'waterwheel',BannerFrame:'banner',Satchel:'satchel',Basket:'basket',Lantern:'lantern',Tree:'tree',Grass:'grass',Wheat:'wheat'});
// Comparable to the existing library's dimensions, independent of Meshy's arbitrary units.
const HEIGHT={tree:7.5,rock:1,grass:1,wheat:1,house:7,tower:11,wall:3.5,pillar:3.8,arch:4.7,altar_inspect:1.35,brazier:1.5,well:2.2,chest:1.2,crate:1.1,barrel:1.1,camp:.6,puzzle:1.7,bookshelf_book:4.8,merchant_stall:3,bridge:1.2,cart:2.1,crane:7,waterwheel:5.6,banner:5,satchel:.48,basket:.55,lantern:.55,book:.5};
const UI_KEY=/^(proxy:|ring:|selection:|selection-gold:|target-arrow$|exit-glyph$|inspect-glyph$|fire$|effect-ring$)/;
const ORIGINS=new Set(['meshy-world','meshy-character','exempt-weapon','ui-marker','vfx','interaction-proxy']);
const TAU=Math.PI*2;
const TERRAIN_TEMPLATES=new WeakMap();
const NO_CAST_SHADOW=new Set(['grass','wheat','book','satchel','basket','lantern','camp']);
const list=value=>Array.isArray(value)?value:Object.values(value||{});
const ANIMATION_SKIN_VARIANTS={"refresh/wolf.glb":"7c6e8f935137a339040ce6fb56ae9486588826be361e5c921bd6f8136637a372","refresh/rat.glb":"b44f3132dd4be6301da39fae78482fd10c2365beb4a31ce8c672555d12bb4af7"};
const sourceURL=(file)=>{const url=new URL('../../assets/models/'+file,import.meta.url);if(file==='refresh-manifest.json')url.searchParams.set('v',new URL(import.meta.url).searchParams.get('v')||'0.16.0-demo');if(ANIMATION_SKIN_VARIANTS[file])url.searchParams.set('sha256',ANIMATION_SKIN_VARIANTS[file]);return url.href;};

export function assertCharacterManifest(manifest){if(!Array.isArray(manifest?.models))throw Error('Retained Meshy character manifest is invalid');const result=new Map();for(const item of manifest.models){if(typeof item?.id!=='string'||result.has(item.id)||!/^[a-f0-9]{64}$/.test(item.sha256||''))throw Error('Invalid or duplicate retained Meshy source: '+item?.id);result.set(item.id,item);}for(const id of BASE_MODELS)if(!result.has(id))throw Error('Required retained Meshy character is absent: '+id);if(!/^[a-f0-9]{64}$/.test(manifest.props?.sha256||''))throw Error('Retained Meshy prop source hash is missing');result.set('refreshProps',manifest.props);return result;}

export function assertWorldManifest(manifest){
 if(manifest?.schema!==1||!Array.isArray(manifest.models))throw new Error('Meshy world manifest is missing or has an unsupported schema');
 const entries=new Map();
 for(const item of manifest.models){
  if(!item?.id||entries.has(item.id))throw new Error('Duplicate or missing Meshy model id: '+item?.id);
  if(!/^[a-z_]+(?:\.lod[12])?\.glb$/.test(item.file||''))throw new Error('Unsafe Meshy model filename: '+item?.id);
  if(!/^[a-f0-9]{64}$/.test(item.sha256||'')||!/^[a-f0-9]{64}$/.test(item.rawSha256||'')||!item.taskId)throw new Error('Incomplete Meshy provenance: '+item.id);
  if(!(item.triangles>0))throw new Error('Empty Meshy model: '+item.id);
  entries.set(item.id,item);
 }
 for(const id of [...WORLD_SLOTS,'book'])if(!entries.has(id))throw new Error('Required Meshy artifact is absent: '+id);
 return entries;
}

export function geometryClass(key){
 if(!UI_KEY.test(key||''))return null;
 return key.startsWith('proxy:')?'interaction-proxy':key==='fire'||key==='effect-ring'?'vfx':'ui-marker';
}

export function tagKnownCharacterMeshes(root,geometrySources){
 root.traverse(object=>{if(object.isMesh&&!object.userData.modelOrigin&&geometrySources?.has(object.geometry))object.userData.modelOrigin={...geometrySources.get(object.geometry)};});
}

export function auditMeshyCoverage(root){
 const report={pass:true,meshes:0,triangles:0,instances:0,origins:{},unknown:[],slots:{}};
 root.traverse(object=>{
  if(!object.isMesh)return;
  for(let p=object;p;p=p.parent)if(p.visible===false)return;
  const materials=Array.isArray(object.material)?object.material:[object.material];
  if(materials.every(m=>m?.colorWrite===false||m?.visible===false))return;
  const declared=geometryClass(object.geometry?.userData.runtimeKey);
  const tag=object.userData?.modelOrigin||(declared?{kind:declared}:null),origin=tag?.kind;
  const count=object.isInstancedMesh?object.count:1;
  const triangles=(object.geometry.index?.count??object.geometry.attributes.position?.count??0)/3*count;
  report.meshes++;report.triangles+=triangles;report.instances+=count;
  report.origins[origin||'unknown']=(report.origins[origin||'unknown']||0)+1;
  if(tag?.slot)report.slots[tag.slot]=(report.slots[tag.slot]||0)+count;
  if(!ORIGINS.has(origin)||(origin==='meshy-world'&&(!tag.rawSha256||!tag.sha256||!tag.taskId))){report.pass=false;report.unknown.push({name:object.name||'(unnamed)',geometry:object.geometry.type,origin:origin||null});}
 });
 return report;
}

// A radial map derived from the actual Meshy footprint. No replacement vertices,
// indices or procedural terrain triangles are generated by this operation.
export function convexFootprint(points){
 const sorted=[...new Map(points.map(p=>[p[0].toFixed(6)+':'+p[1].toFixed(6),p])).values()].sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
 if(sorted.length<3)throw new Error('Meshy surface has no usable XZ footprint');
 const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
 const lower=[],upper=[];
 for(const p of sorted){while(lower.length>=2&&cross(lower.at(-2),lower.at(-1),p)<=0)lower.pop();lower.push(p);}
 for(const p of [...sorted].reverse()){while(upper.length>=2&&cross(upper.at(-2),upper.at(-1),p)<=0)upper.pop();upper.push(p);}
 lower.pop();upper.pop();return lower.concat(upper);
}
function rayBoundary(hull,dx,dz){
 let distance=Infinity;
 for(let i=0;i<hull.length;i++){
  const a=hull[i],b=hull[(i+1)%hull.length],ex=b[0]-a[0],ez=b[1]-a[1],den=dx*ez-dz*ex;
  if(Math.abs(den)<1e-9)continue;
  const t=(a[0]*ez-a[1]*ex)/den,u=(a[0]*dz-a[1]*dx)/den;
  if(t>=0&&u>=-1e-6&&u<=1+1e-6)distance=Math.min(distance,t);
 }
 return distance;
}
export function deformTerrainGeometry(source,{radiusX,radiusZ,centerX=0,centerZ=0,angle=0,phase=0,height=()=>0,elevation=0,foundation=-4.8}){
 const geometry=source.clone(),positions=geometry.attributes.position;
 if(!positions||!positions.count)throw new Error('Meshy terrain is empty');
 geometry.computeBoundingBox();const b=geometry.boundingBox,midX=(b.min.x+b.max.x)/2,midZ=(b.min.z+b.max.z)/2,range=Math.max(.001,b.max.y-b.min.y);
 const footprint=convexFootprint(Array.from({length:positions.count},(_,i)=>[positions.getX(i)-midX,positions.getZ(i)-midZ]));
 const cosine=Math.cos(angle),sine=Math.sin(angle);
 for(let i=0;i<positions.count;i++){
  const px=positions.getX(i)-midX,pz=positions.getZ(i)-midZ,r=Math.hypot(px,pz),a=Math.atan2(pz,px),boundary=rayBoundary(footprint,Math.cos(a),Math.sin(a));
  const radial=r<1e-8?0:Math.min(1.002,r/Math.max(.0001,boundary));
  const edge=1.065+Math.sin(a*5+phase)*.026+Math.cos(a*9-phase)*.018;
  const localX=Math.cos(a)*radiusX*radial*edge,localZ=Math.sin(a)*radiusZ*radial*edge;
  const x=centerX+localX*cosine+localZ*sine,z=centerZ-localX*sine+localZ*cosine;
  const normalizedY=(positions.getY(i)-b.min.y)/range;
  // Thin scan patches are flattened; closed slabs retain their Meshy underside.
  const ny=source.attributes.normal?.getY(i);
  const lower=range>.03&&(ny===undefined?normalizedY<.12:ny<-.15||(normalizedY<.08&&ny<.25));
  const y=lower?height(x,z)+foundation:height(x,z)+elevation+Math.max(0,normalizedY-.5)*.026;
  positions.setXYZ(i,x,y,z);
 }
 positions.needsUpdate=true;geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();
 geometry.userData={...geometry.userData,meshyDeformation:'footprint-to-organic-ellipse; original connectivity retained'};
 return geometry;
}

export function deformRibbonGeometry(source,points,width,{height=()=>0,elevation=.032,trim=0}={}){
 const geometry=source.clone();geometry.computeBoundingBox();const b=geometry.boundingBox,pos=geometry.attributes.position;
 const waterEdge=new Float32Array(pos.count);
 const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(p.x,0,p.z)));
 const length=Math.max(.001,b.max.z-b.min.z),halfWidth=Math.max(.001,(b.max.x-b.min.x)/2),midX=(b.max.x+b.min.x)/2,rangeY=b.max.y-b.min.y;
 for(let i=0;i<pos.count;i++){
  const rawT=(pos.getZ(i)-b.min.z)/length,t=T.MathUtils.clamp((rawT-trim)/Math.max(.01,1-trim*2),0,1),point=curve.getPointAt(t),direction=curve.getTangentAt(t);
  const lateral=T.MathUtils.clamp((pos.getX(i)-midX)/(halfWidth*(1-trim*2)),-1,1)*width*(.48+Math.sin(t*17)*.04);
  waterEdge[i]=Math.min(1,Math.abs(lateral)/Math.max(.001,width*(.48+Math.sin(t*17)*.04)));
  const x=point.x-direction.z*lateral,z=point.z+direction.x*lateral;
  const ny=source.attributes.normal?.getY(i),low=rangeY>.03&&(ny===undefined?(pos.getY(i)-b.min.y)/rangeY<.12:ny<-.15);
  pos.setXYZ(i,x,height(x,z)+elevation-(low?.06:0),z);
 }
 geometry.setAttribute('waterEdge',new T.Float32BufferAttribute(waterEdge,1));
 pos.needsUpdate=true;geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();
 geometry.userData={...geometry.userData,meshyDeformation:'Meshy strip bent along route; original connectivity retained'};
 return {geometry,samples:curve.getPoints(Math.max(22,points.length*12))};
}

function terrainFootprintPlanes({radiusX,radiusZ,phase=0,edgeScale=1.065,edgeNoise=1}){
 return Array.from({length:64},(_,i)=>{const a=(i+.5)/64*TAU;return {x:Math.cos(a)/radiusX,z:Math.sin(a)/radiusZ,d:edgeScale+(Math.sin(a*5+phase)*.026+Math.cos(a*9-phase)*.018)*edgeNoise};});
}
function clipTerrainPolygon(polygon,plane,centerX,centerZ){
 const output=[];
 for(let i=0;i<polygon.length;i++){
  const a=polygon[i],b=polygon[(i+1)%polygon.length],da=(a.x-centerX)*plane.x+(a.z-centerZ)*plane.z-plane.d,db=(b.x-centerX)*plane.x+(b.z-centerZ)*plane.z-plane.d,ina=da<=0,inb=db<=0;
  if(ina)output.push(a);
  if(ina!==inb){const t=da/(da-db);output.push({x:T.MathUtils.lerp(a.x,b.x,t),y:T.MathUtils.lerp(a.y,b.y,t),z:T.MathUtils.lerp(a.z,b.z,t),u:T.MathUtils.lerp(a.u,b.u,t),v:T.MathUtils.lerp(a.v,b.v,t),...(a.offset!==undefined?{offset:T.MathUtils.lerp(a.offset,b.offset,t)}:{})});}
 }
 return output;
}
function terrainHeightNormals(positions,height){
 const normals=new Float32Array(positions.length),step=.04;
 for(let i=0;i<positions.length;i+=3){const x=positions[i],z=positions[i+2],dx=(height(x+step,z)-height(x-step,z))/(step*2),dz=(height(x,z+step)-height(x,z-step))/(step*2),inverse=1/Math.hypot(dx,1,dz);normals[i]=-dx*inverse;normals[i+1]=inverse;normals[i+2]=-dz*inverse;}
 return normals;
}

// A shallow coverage layer derived from every original Meshy face. Enlargement
// moves scan gaps outside the playable region; the shared island planes remove
// the enlarged fringe. Clipping interpolates source triangles and their UVs.
export function terrainFoundationGeometry(source,{radiusX,radiusZ,centerX=0,centerZ=0,phase=0,height=()=>0,elevation=0,edgeScale=1.065,edgeNoise=1}={}){
 const cap=deformTerrainGeometry(source,{radiusX:radiusX*1.3,radiusZ:radiusZ*1.3,centerX,centerZ,phase,height,elevation:elevation-.065,foundation:elevation-.065});
 const p=cap.attributes.position,uv=cap.attributes.uv,index=cap.index?.array,count=index?.length??p.count,planes=terrainFootprintPlanes({radiusX,radiusZ,phase,edgeScale,edgeNoise}),positions=[],uvs=[];
 const midpoint=(a,b)=>({x:(a.x+b.x)*.5,z:(a.z+b.z)*.5,u:(a.u+b.u)*.5,v:(a.v+b.v)*.5,offset:(a.offset+b.offset)*.5});
 const emit=(a,b,c)=>{
  const pending=[[a,b,c]];
  while(pending.length){const [a,b,c]=pending.pop(),ab=(a.x-b.x)**2+(a.z-b.z)**2,bc=(b.x-c.x)**2+(b.z-c.z)**2,ca=(c.x-a.x)**2+(c.z-a.z)**2;
   // Only long edges of Meshy-derived faces are split. Reprojection prevents a
   // broad source cap triangle from crossing above the undulating tiled top.
   if(Math.max(ab,bc,ca)>16){if(ab>=bc&&ab>=ca){const m=midpoint(a,b);pending.push([a,m,c],[m,b,c]);}else if(bc>=ca){const m=midpoint(b,c);pending.push([a,b,m],[a,m,c]);}else{const m=midpoint(c,a);pending.push([a,b,m],[m,b,c]);}continue;}
   const up=(b.z-a.z)*(c.x-a.x)-(b.x-a.x)*(c.z-a.z);if(Math.abs(up)<1e-10)continue;
   for(const q of up>0?[a,b,c]:[a,c,b]){positions.push(q.x,height(q.x,q.z)+q.offset,q.z);uvs.push(q.u,q.v);}
  }
 };
 for(let t=0;t<count;t+=3){
  let polygon=[0,1,2].map(k=>{const i=index?index[t+k]:t+k,x=p.getX(i),z=p.getZ(i),y=p.getY(i);return {x,y,z,offset:y-height(x,z),u:uv?.getX(i)||0,v:uv?.getY(i)||0};});
  for(const plane of planes){polygon=clipTerrainPolygon(polygon,plane,centerX,centerZ);if(polygon.length<3)break;}
  for(let i=1;i<polygon.length-1;i++)emit(polygon[0],polygon[i],polygon[i+1]);
 }
 cap.dispose();
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));geometry.setAttribute('normal',new T.Float32BufferAttribute(terrainHeightNormals(positions,height),3));geometry.computeBoundingBox();geometry.computeBoundingSphere();
 geometry.userData={meshyDeformation:'All original Meshy faces; shallow 1.3x foundation clipped to shared organic island planes; only long source edges split/reprojected; interpolated authored UV',sourceTriangles:count/3,foundationDepth:.065,foundationRadiusScale:1.3,foundationMaxEdge:4};return geometry;
}

// Tile actual upper-facing Meshy triangles at their intended 8m scale. Boundary
// vertices are intersections of those source triangles, not a generated plane.
export function tileTerrainGeometry(source,{radiusX,radiusZ,centerX=0,centerZ=0,phase=0,tileSize=8,height=()=>0,elevation=0,edgeScale=1.065,edgeNoise=1}){
 const p=source.attributes.position;let template=TERRAIN_TEMPLATES.get(source);
 if(!template||template.version!==p.version){
  source.computeBoundingBox();const b=source.boundingBox,uv=source.attributes.uv,cx=(b.min.x+b.max.x)/2,cz=(b.min.z+b.max.z)/2,yr=Math.max(.001,b.max.y-b.min.y);
  const hull=convexFootprint(Array.from({length:p.count},(_,i)=>[p.getX(i)-cx,p.getZ(i)-cz]));
  const normalized=Array.from({length:p.count},(_,i)=>{const x=p.getX(i)-cx,z=p.getZ(i)-cz,a=Math.atan2(z,x),r=Math.hypot(x,z),edge=rayBoundary(hull,Math.cos(a),Math.sin(a)),square=1/Math.max(Math.abs(Math.cos(a)),Math.abs(Math.sin(a)));return {x:Math.cos(a)*r/Math.max(.0001,edge)*square,z:Math.sin(a)*r/Math.max(.0001,edge)*square,relief:(p.getY(i)-b.min.y)/yr*.012,u:uv?.getX(i)||0,v:uv?.getY(i)||0};});
  const index=source.index?.array||Array.from({length:p.count},(_,i)=>i),faces=[];
  for(let t=0;t<index.length;t+=3){const a=index[t],b=index[t+1],c=index[t+2],cross=(p.getZ(b)-p.getZ(a))*(p.getX(c)-p.getX(a))-(p.getX(b)-p.getX(a))*(p.getZ(c)-p.getZ(a));if(cross>1e-10)faces.push([a,b,c]);}
  template={normalized,faces,version:p.version};TERRAIN_TEMPLATES.set(source,template);
 }
 const {normalized,faces}=template;
 if(!faces.length)throw new Error('Meshy terrain has no upward-facing source triangles');
 const planes=terrainFootprintPlanes({radiusX,radiusZ,phase,edgeScale,edgeNoise});
 const clipInner=Math.max(.01,edgeScale-.044*Math.abs(edgeNoise)-.002);
 const clip=(polygon,plane)=>clipTerrainPolygon(polygon,plane,centerX,centerZ);
 const positions=[],uvs=[];let copies=0;
 const half=tileSize*.5,nx=Math.ceil(radiusX*1.12/tileSize),nz=Math.ceil(radiusZ*1.12/tileSize);
 for(let ix=-nx;ix<=nx;ix++)for(let iz=-nz;iz<=nz;iz++){
  const tx=centerX+ix*tileSize,tz=centerZ+iz*tileSize;
  if((Math.max(0,Math.abs(tx-centerX)-half)/radiusX)**2+(Math.max(0,Math.abs(tz-centerZ)-half)/radiusZ)**2>1.12**2)continue;
  copies++;
  const h00=height(tx-half,tz-half),h10=height(tx+half,tz-half),h01=height(tx-half,tz+half),h11=height(tx+half,tz+half);
  for(const face of faces){let polygon=face.map(i=>{const q=normalized[i],x=tx+q.x*half,z=tz+q.z*half,edgeFade=T.MathUtils.smoothstep(1-Math.max(Math.abs(q.x),Math.abs(q.z)),0,.18),u=(q.x+1)*.5,v=(q.z+1)*.5,edgeHeight=T.MathUtils.lerp(T.MathUtils.lerp(h00,h10,u),T.MathUtils.lerp(h01,h11,u),v);return {x,z,y:T.MathUtils.lerp(edgeHeight,height(x,z),edgeFade)+elevation+q.relief*edgeFade,u:q.u,v:q.v};});
   if(!polygon.every(q=>Math.hypot((q.x-centerX)/radiusX,(q.z-centerZ)/radiusZ)<clipInner))for(const plane of planes){polygon=clip(polygon,plane);if(polygon.length<3)break;}
   for(let i=1;i<polygon.length-1;i++)for(const q of [polygon[0],polygon[i],polygon[i+1]]){positions.push(q.x,q.y,q.z);uvs.push(q.u,q.v);}
  }
 }
 const normals=terrainHeightNormals(positions,height);
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));geometry.setAttribute('normal',new T.Float32BufferAttribute(normals,3));geometry.computeBoundingBox();geometry.computeBoundingSphere();geometry.userData={meshyDeformation:'Original upper Meshy triangles at 8m scale; exact shared tile extent, source relief fades to continuous boundary heights/normals, footprint clipping retained',sourceTriangles:faces.length,tileCopies:copies};return geometry;
}

function provenance(entry){return {kind:'meshy-world',slot:entry.id,sha256:entry.sha256,rawSha256:entry.rawSha256,taskId:entry.taskId,derivation:entry.derivation||'local static LOD; authored UV/material retained'};}
function prepareParts(gltf,entry){
 gltf.scene.updateMatrixWorld(true);const parts=[];const bounds=new T.Box3();
 gltf.scene.traverse(o=>{if(o.isMesh){const geometry=o.geometry.clone().applyMatrix4(o.matrixWorld);geometry.computeBoundingBox();bounds.union(geometry.boundingBox);parts.push({geometry,material:o.material,name:o.name});}});
 if(!parts.length)throw new Error('Meshy artifact contains no meshes: '+entry.id);
 const size=bounds.getSize(new T.Vector3()),center=bounds.getCenter(new T.Vector3());
 const surface=entry.id.startsWith('terrain_')||entry.id.endsWith('_strip');
 if(entry.id.endsWith('_strip')&&size.x>size.z){const rotation=new T.Matrix4().makeRotationY(Math.PI/2);for(const part of parts){part.geometry.applyMatrix4(rotation);part.geometry.computeBoundingBox();}const oldX=size.x;size.x=size.z;size.z=oldX;}
 if(!surface){
  const scale=(HEIGHT[entry.id]||1)/Math.max(.001,size.y);
  const matrix=new T.Matrix4().makeScale(scale,scale,scale).multiply(new T.Matrix4().makeTranslation(-center.x,-bounds.min.y,-center.z));
  for(const part of parts){part.geometry.applyMatrix4(matrix);part.geometry.computeBoundingBox();}
  size.multiplyScalar(scale);
 }
 for(const part of parts){part.geometry.userData.modelOrigin=provenance(entry);for(const material of Array.isArray(part.material)?part.material:[part.material]){material.side=T.DoubleSide;for(const value of Object.values(material))if(value?.isTexture)value.anisotropy=4;}}
 return {entry,parts,halfWidth:size.x/2,halfDepth:size.z/2};
}


function releaseUnadopted(gltf){const geometries=new Set(),materials=new Set(),textures=new Set();gltf?.scene?.traverse(object=>{if(!object.isMesh)return;geometries.add(object.geometry);for(const material of Array.isArray(object.material)?object.material:[object.material])if(material){materials.add(material);for(const value of Object.values(material))if(value?.isTexture)textures.add(value);}});for(const geometry of geometries)geometry.dispose();for(const material of materials)material.dispose();for(const texture of textures)texture.dispose();}
function decodeWorldAtlas(bytes,signal){const url=URL.createObjectURL(new Blob([bytes],{type:'image/png'})),image=new Image();let completed=false;const decoding=new Promise((resolve,reject)=>{image.onload=()=>resolve(image);image.onerror=()=>reject(Error('Не удалось декодировать атлас поверхностей'));image.src=url;});return worldStage(decoding,signal).then(value=>new T.Texture(value)).then(texture=>{texture.needsUpdate=true;completed=true;return texture;}).finally(()=>{URL.revokeObjectURL(url);if(!completed){image.onload=null;image.onerror=null;image.src='';}});}
function worldStage(promise,signal,late=()=>{}){return new Promise((resolve,reject)=>{let settled=false;const finish=(callback,value)=>{if(settled)return false;settled=true;clearTimeout(timer);signal.removeEventListener('abort',aborted);callback(value);return true;},aborted=()=>finish(reject,signal.reason||new DOMException('World load cancelled','AbortError')),timer=setTimeout(()=>finish(reject,Object.assign(Error('Модель не завершила декодирование за 30 секунд'),{name:'TimeoutError'})),30000);signal.addEventListener('abort',aborted,{once:true});if(signal.aborted)aborted();Promise.resolve(promise).then(value=>{if(!finish(resolve,value))late(value);},error=>finish(reject,error));});}
export function installMeshyWorld(World){
 const P=World.prototype,oldProp=P.prop,oldActor=P.createActor,oldInteractions=P.buildInteractions,oldPerimeter=P.perimeter,oldDispose=P.dispose,oldClearStage=P.clearBattleStage;
 const loadWorldAssets=async function(onProgress){
  this.meshyLoadController?.abort();const controller=new AbortController();this.meshyLoadController=controller;const signal=controller.signal,assertActive=()=>{if(signal.aborted||this.meshyLoadController!==controller)throw signal.reason||new DOMException('World load superseded','AbortError');};let workers=[];try{
  const request=async url=>fetchBytes(url,{...this.assetRequestOptions,signal,onRetry:notice=>{this.assetRequestOptions?.onRetry?.(notice);onProgress?.('Повтор загрузки ресурса · попытка '+notice.nextAttempt);}}),readJSON=async url=>JSON.parse(new TextDecoder().decode(await request(url)));
  const [manifest,characterManifest]=await Promise.all([readJSON(sourceURL('world-meshy/manifest.json')),readJSON(sourceURL('refresh-manifest.json'))].map(operation=>operation.catch(error=>{controller.abort(error);throw error;}))),entries=assertWorldManifest(manifest);assertActive();this.meshyManifest=manifest;this.meshyLibrary=new Map();this.loadedAssetHashes=new Map();
  const characters=assertCharacterManifest(characterManifest);this.meshyCharacterGeometry=new Map();
  const loader=new GLTFLoader();let completed=0;
  const jobs=[...BASE_MODELS.map(id=>({file:'refresh/'+id+'.glb',key:id})),{file:'refresh-props.glb',key:'refreshProps'},...entries.values()].map(item=>async()=>{
   const physical=entries.get(item.id),file=physical?'world-meshy/'+item.file:item.file,cacheURL=new URL(sourceURL(file)),expectedHash=physical?item.sha256:characters.get(item.key)?.sha256;if(expectedHash)cacheURL.searchParams.set('sha256',expectedHash);const url=cacheURL.href;
   const bytes=await request(url);
   const digest=await crypto.subtle.digest('SHA-256',bytes),sha=Array.from(new Uint8Array(digest),n=>n.toString(16).padStart(2,'0')).join('');assertActive();
   if(physical&&sha!==item.sha256)throw new Error('Meshy asset hash mismatch: '+item.id);
   if(item.key&&sha!==characters.get(item.key)?.sha256)throw new Error('Retained Meshy character hash mismatch: '+item.key);
   this.loadedAssetHashes.set(item.key||item.id,sha);
   assertActive();const gltf=await worldStage(loader.parseAsync(bytes,url.slice(0,url.lastIndexOf('/')+1)),signal,releaseUnadopted);if(signal.aborted){releaseUnadopted(gltf);throw signal.reason;}
   gltf.scene.traverse(o=>{if(o.isMesh)o.castShadow=o.receiveShadow=true;});
   this.assets[physical?'world:'+item.id:item.key]=gltf;if(physical)this.meshyLibrary.set(item.id,prepareParts(gltf,item));
   if(BASE_MODELS.includes(item.key))gltf.scene.traverse(object=>{if(object.isMesh)this.meshyCharacterGeometry.set(object.geometry,{kind:'meshy-character',base:item.key,source:'assets/models/'+item.file,sourceSha256:sha});});
   if(item.key==='refreshProps')this.exemptWeaponSourceSha256=sha;
   onProgress?.('Модели Meshy · '+(++completed)+' / '+jobs.length);
  });
  let next=0;workers=Array.from({length:4},async()=>{try{while(next<jobs.length&&!signal.aborted)await jobs[next++]();}catch(error){controller.abort(error);throw error;}});await Promise.all(workers);assertActive();
  Object.assign(this.assets,{hero:this.assets.alar_nocape,husk:this.assets.ash_husk,acolyte:this.assets.ember_acolyte,sentinel:this.assets.radan_nocape,boss:this.assets.bellkeeper});
  // The old atlas remains a material dependency for UI helpers only. All physical
  // surface meshes below use their own embedded Meshy PBR materials.
  const atlas=await decodeWorldAtlas(await request(new URL('../../assets/act1/terrain-atlas.png',import.meta.url).href),signal);try{assertActive();}catch(error){atlas.dispose();throw error;}this.atlas=atlas;this.atlas.colorSpace=T.SRGBColorSpace;
  this.makeMaterials();this.loaded=true;onProgress?.('Мир Meshy готов');return this;
  }catch(error){controller.abort(error);await Promise.allSettled(workers);if(this.meshyLoadController===controller){this.loaded=false;try{this.dispose();}catch(disposeError){console.warn('Partial world cleanup:',disposeError);}}throw error;}
 };
 // A second caller joins the same load; it never replaces partially adopted sources.
 P.loadAssets=function(onProgress){if(this.loaded)return Promise.resolve(this);if(this.meshyLoadPromise)return this.meshyLoadPromise;const pending=loadWorldAssets.call(this,onProgress).finally(()=>{if(this.meshyLoadPromise===pending)this.meshyLoadPromise=null;});this.meshyLoadPromise=pending;return pending;};
 P.meshyParts=function(id){const item=this.meshyLibrary?.get(id);if(!item)throw new Error('Required Meshy model is not loaded: '+id);return item;};
 P.meshyProp=function(id,parent=this.areaGroup,position=[0,0,0],scale=1){
  const source=this.meshyParts(id),group=new T.Group();group.name='Meshy_'+id;group.position.set(...position);group.scale.setScalar(scale);group.userData.meshyFootprint={halfWidth:source.halfWidth,halfDepth:source.halfDepth};parent.add(group);
  for(const part of source.parts){const mesh=new T.Mesh(part.geometry,part.material);mesh.name='Meshy_'+id+'_'+part.name;mesh.castShadow=!NO_CAST_SHADOW.has(id);mesh.receiveShadow=true;mesh.userData.modelOrigin=provenance(source.entry);group.add(mesh);}
  return group;
 };
 P.prop=function(name,parent=this.areaGroup,position=[0,0,0],scale=1){
  if(EXEMPT_WEAPONS.includes(name)){const object=oldProp.call(this,name,parent,position,scale);object.traverse(o=>{if(o.isMesh)o.userData.modelOrigin={kind:'exempt-weapon',source:'assets/models/refresh-props.glb',sourceSha256:this.exemptWeaponSourceSha256,name};});return object;}
  const id=PROP_SLOTS[name];if(!id)throw new Error('Unmapped physical prop; procedural fallback is forbidden: '+name);
  const object=this.meshyProp(id,parent,position,scale);if(name==='Book')object.rotation.y=Math.PI;return object;
 };
 P.module=function(name,x,z,scale=1,angle=0,parent=this.areaGroup){const group=this.prop(name,parent,[x,this.height(x,z),z],scale);group.rotation.y=angle;return group;};
 P.createActor=function(...args){const actor=oldActor.apply(this,args);tagKnownCharacterMeshes(actor.root,this.meshyCharacterGeometry);return actor;};
 // Replace refresh's geometry substitutions. Only UI and temporary interaction
 // construction use these helpers; the temporary physical nodes are removed below.
 P.geometry=function(key,factory){if(!this.geometries.has(key)){const geometry=factory();geometry.userData.runtimeKey=key;this.geometries.set(key,geometry);}return this.geometries.get(key);};
 P.mesh=function(geometry,material,parent=this.areaGroup,x=0,y=0,z=0,local=false){
  if(local)this.areaGeometries.add(geometry);const mesh=new T.Mesh(geometry,typeof material==='string'?this.materials.get(material):material);mesh.position.set(x,y,z);mesh.castShadow=mesh.receiveShadow=true;
  const kind=geometryClass(geometry.userData.runtimeKey);if(kind)mesh.userData.modelOrigin={kind};parent.add(mesh);return mesh;
 };
 P.meshyInstances=function(id,transforms,parent=this.areaGroup){
  if(!transforms.length)return null;const source=this.meshyParts(id),group=new T.Group(),object=new T.Object3D();group.name='Meshy_instances_'+id;parent.add(group);
  const chunks=new Map();
  for(const transform of transforms){const key=transforms.length>64?`${Math.floor(transform.x/32)}:${Math.floor(transform.z/32)}`:'all';if(!chunks.has(key))chunks.set(key,[]);chunks.get(key).push(transform);}
  for(const [key,chunk] of chunks)for(const part of source.parts){const mesh=new T.InstancedMesh(part.geometry,part.material,chunk.length);chunk.forEach((t,index)=>{object.position.set(t.x,t.y,t.z);object.rotation.set(t.rx||0,t.ry||0,t.rz||0);object.scale.set(t.sx??t.scale??1,t.sy??t.scale??1,t.sz??t.scale??1);object.updateMatrix();mesh.setMatrixAt(index,object.matrix);});mesh.name=`Meshy_${id}_chunk_${key}`;mesh.instanceMatrix.setUsage(T.StaticDrawUsage);mesh.instanceMatrix.needsUpdate=true;mesh.castShadow=!NO_CAST_SHADOW.has(id);mesh.receiveShadow=true;mesh.userData.modelOrigin=provenance(source.entry);mesh.computeBoundingBox();mesh.computeBoundingSphere();group.add(mesh);}
  return group;
 };
 P.meshyTerrainId=function(){return ({village:'terrain_village',forest:'terrain_forest',marsh:'terrain_marsh',abbey:'terrain_ruin'})[this.biome]||'terrain_ruin';};
 P.meshySurface=function(id,options,parent=this.areaGroup,stage=false){
  const source=this.meshyParts(id),group=new T.Group();group.name='Meshy_surface_'+id;parent.add(group);
  this.terrainMaterials??=new TerrainMaterials(this);
  for(const part of source.parts){
   const surfaceOptions={...options,height:(x,z)=>this.height(x,z)},geometries=[(options.tiled?tileTerrainGeometry:deformTerrainGeometry)(part.geometry,surfaceOptions)];
   if(options.tiled&&id.startsWith('terrain_'))geometries.push(terrainFoundationGeometry(part.geometry,surfaceOptions));
   for(const geometry of geometries){const mesh=new T.Mesh(geometry,this.terrainMaterials.material(part.material,id));mesh.name=geometry.userData.foundationDepth?'Meshy_terrain_foundation_'+id:'Meshy_terrain_top_'+id;mesh.userData.modelOrigin={...provenance(source.entry),deformation:geometry.userData.meshyDeformation};mesh.userData.stageGeometry=stage;mesh.castShadow=false;mesh.receiveShadow=true;group.add(mesh);if(!stage)this.areaGeometries.add(geometry);}
  }
  return group;
 };
 P.buildGround=function(){const group=this.meshySurface(this.meshyTerrainId(),{radiusX:this.radiusX,radiusZ:this.radiusZ,phase:this.seedPhase,tiled:true,edgeScale:Math.sqrt(.9)+.018,edgeNoise:.22});this.ground=group.children.reduce((largest,m)=>!largest||(m.geometry.attributes.position.count)>(largest.geometry.attributes.position.count)?m:largest,null);};
 P.perimeterApron=function(cx,cz,hw,hd,angle){let rx=hw+2.7,rz=hd+2.7,corner=Math.hypot(hw/rx,hd/rz);if(corner>.94){rx*=corner/.94;rz*=corner/.94;}this.meshySurface(this.meshyTerrainId(),{radiusX:rx,radiusZ:rz,centerX:cx,centerZ:cz,angle,phase:this.seedPhase,elevation:.014});};
 P.perimeter=function(group,hw,hd){const footprint=group.userData.meshyFootprint;return oldPerimeter.call(this,group,Math.max(hw,footprint?.halfWidth||0),Math.max(hd,footprint?.halfDepth||0));};
 P.ribbon=function(points,width,material,elevation=.025){
  const id=material==='water'?'water_strip':material==='bank'?this.meshyTerrainId():'path_strip',source=this.meshyParts(id),group=new T.Group();group.name='Meshy_route_'+id;this.areaGroup.add(group);let samples;
  const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(p.x,0,p.z))),pieces=Math.max(1,Math.ceil(curve.getLength()/8));samples=curve.getPoints(Math.max(22,points.length*12));
  this.terrainMaterials??=new TerrainMaterials(this);
  for(const part of source.parts){const geometries=[];
   for(let piece=0;piece<pieces;piece++){
    const segment=Array.from({length:5},(_,i)=>{const p=curve.getPointAt((piece+i/4)/pieces);return{x:p.x,z:p.z};});
    geometries.push(deformRibbonGeometry(part.geometry,segment,width,{height:(x,z)=>this.height(x,z),elevation,trim:id==='water_strip'?.1:0}).geometry);
   }
   const geometry=geometries.length===1?geometries[0]:mergeGeometries(geometries,false);
   if(!geometry)throw new Error('Cannot merge compatible Meshy ribbon pieces: '+id);
   if(geometries.length>1)for(const piece of geometries)piece.dispose();
   geometry.computeBoundingBox();geometry.computeBoundingSphere();geometry.userData.meshyDeformation='Original Meshy strip triangles bent at <=8m scale and merged by source part';this.areaGeometries.add(geometry);
   const surface=id==='water_strip'?part.material:this.terrainMaterials.material(part.material,id,{path:true}),mesh=new T.Mesh(geometry,surface);mesh.userData.modelOrigin={...provenance(source.entry),deformation:geometry.userData.meshyDeformation};mesh.castShadow=false;mesh.receiveShadow=true;group.add(mesh);
  }
  return {mesh:group,samples};
 };
 P.buildLandscape=function(){
  const trees=[],rocks=[],grass=[],count=this.theme==='grass'?10:this.biome==='village'?18:this.biome==='abbey'?12:40;
  for(let attempt=0;attempt<count*9&&trees.length<count;attempt++){const a=this.rng()*TAU,r=Math.sqrt(this.rng())*.98,x=Math.cos(a)*this.radiusX*r,z=Math.sin(a)*this.radiusZ*r;if(!this.free(x,z,3.6)||trees.some(p=>Math.hypot(p.x-x,p.z-z)<4.4))continue;const scale=.65+this.rng()*.55;trees.push({x,y:this.height(x,z),z,scale,ry:this.rng()*TAU,rz:(this.rng()-.5)*.05});}
  for(let i=0;i<170;i++){const a=this.rng()*TAU,r=.45+this.rng()*.52,x=Math.cos(a)*this.radiusX*r,z=Math.sin(a)*this.radiusZ*r;if(!this.free(x,z,1.6))continue;const s=.4+this.rng()*1.1;rocks.push({x,y:this.height(x,z)-.06,z,sx:s*1.4,sy:s*.7,sz:s,ry:this.rng()*TAU});}
  for(let i=0;i<220;i++){const x=(this.rng()*2-1)*this.radiusX,z=(this.rng()*2-1)*this.radiusZ;if(!this.free(x,z,1.2))continue;const h=(this.biome==='marsh'?.65:.25)+this.rng()*.5;grass.push({x,y:this.height(x,z),z,sx:.35+this.rng()*.3,sy:h,sz:.35+this.rng()*.3,ry:this.rng()*TAU});}
  this.meshyInstances('tree',trees);this.meshyInstances('rock',rocks);this.meshyInstances('grass',grass);
  if(this.biome==='village')this.village();if(this.biome==='forest'||this.biome==='marsh')this.stream();if(this.theme==='quarry')this.quarry();else if(this.theme==='grass')this.fields();else if(this.biome==='abbey'){this.abbey();if(this.theme==='archive')this.archive();if(this.theme==='fortress')this.fortress();}this.buildAtmosphere();
 };
 P.fields=function(){
  const stalks=[];for(let i=0;i<450;i++){const a=this.rng()*TAU,r=Math.sqrt(this.rng())*.92,x=Math.cos(a)*this.radiusX*r,z=Math.sin(a)*this.radiusZ*r;if(!this.free(x,z,1.7)||Math.sin(z*.21+Math.sin(x*.08)*2.4)<-.1)continue;stalks.push({x,y:this.height(x,z),z,sx:.28,sy:.6+this.rng()*.55,sz:.28,ry:this.rng()*TAU});}this.meshyInstances('wheat',stalks);
  this.house(this.radiusX*.63,this.radiusZ*.25,-.8,1.1);this.house(-this.radiusX*.6,-this.radiusZ*.47,.7,.95);this.stream();const wheel=this.prop('Waterwheel',this.areaGroup,[-this.radiusX*.54,this.height(-this.radiusX*.54,-this.radiusZ*.55),-this.radiusZ*.55]);this.perimeter(wheel,.8,3.2);
 };
 P.banner=function(x,z,angle=0){const banner=this.prop('BannerFrame',this.areaGroup,[x,this.height(x,z),z]);banner.rotation.y=angle;};
 P.buildBattleStage=function(){
  this.clearBattleStage();const center=this.battleCenter;this.meshySurface(this.meshyTerrainId(),{radiusX:72,radiusZ:72,centerX:center.x,centerZ:center.z,phase:this.seedPhase,tiled:true},this.battleStage,true);
  let seed=177;for(const c of this.areaId)seed=(seed*31+c.charCodeAt(0))>>>0;const rng=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);
  for(let i=-6;i<=6;i++){const x=center.x+22+i*2.5,z=center.z-13+i*5,rock=this.meshyProp('rock',this.battleStage,[x,this.height(x,z)-1,z]);rock.scale.set(8+rng()*3,6+rng()*4,8+rng()*3);rock.rotation.y=rng()*TAU;}
  for(let i=0;i<22;i++){const x=center.x+12+rng()*20,z=center.z-20+rng()*39;if(['forest','marsh','village'].includes(this.biome)){const tree=this.meshyProp('tree',this.battleStage,[x,this.height(x,z),z],.75+rng()*.4);tree.rotation.y=rng()*TAU;}else if(i%3===0)this.module(i%2?'Pillar':'Arch',x,z,.9+rng()*.5,rng()*.6,this.battleStage);}
  const grass=[];for(let i=0;i<100;i++){const x=center.x+(rng()-.5)*32,z=center.z+(rng()-.5)*34;if(Math.abs(x-center.x)<8&&Math.abs(z-center.z)<8)continue;grass.push({x,y:this.height(x,z),z,scale:.4+rng()*.4,ry:rng()*TAU});}this.meshyInstances('grass',grass,this.battleStage);
 };
 P.clearBattleStage=function(){this.battleStage?.traverse(object=>{if(object.isInstancedMesh)object.dispose();});return oldClearStage?.call(this);};
 P.buildInteractions=function(){
  oldInteractions.call(this);
  for(const item of this.interactables){
   if(item.kind==='exit'){for(const child of [...item.group.children])if(child!==item.proxy&&child!==item.glyph&&!geometryClass(child.geometry?.userData.runtimeKey))item.group.remove(child);this.prop('Arch',item.group,[0,0,0],.83);}
   if(item.kind==='node'&&item.definition.type==='chest'){item.lid=null;item.craftedLid=false;/* Actual Meshy closed chest is not split by an invented procedural lid. */}
  }
 };
 P.auditMeshyCoverage=function(){return auditMeshyCoverage(this.scene);};
 P.dispose=function(){this.meshyLoadController?.abort(new DOMException('World disposed','AbortError'));const baked=new Set();for(const item of this.meshyLibrary?.values()||[])for(const part of item.parts)baked.add(part.geometry);oldDispose.call(this);this.terrainMaterials?.dispose();for(const geometry of baked)geometry.dispose();this.meshyLibrary?.clear();};
}
