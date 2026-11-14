import {addRoadAccent} from './road-actor-looks.js?v=roads-018';
import * as T from '../../assets/vendor/three.module.js';
import {GLTFLoader} from '../../assets/vendor/GLTFLoader.js';
import {groundClearanceLift,flightBaseline,mirrorWingDelta} from './party-motion.js?v=0.16.0-demo';
import {SOURCE_BASES} from './source-facing.js?v=campaign-v1';
import {isCampaignModel,campaignActor} from './campaign-visuals.js?v=campaign-v1';

export const BASE_MODELS=SOURCE_BASES.filter(id=>!isCampaignModel(id));
const v=(base,gear=[],extra={})=>({base,gear,...extra});
export const ROLE_VISUALS={
 alar:v('alar_nocape',['Sword','Shield']),iona:v('iona_nocape',['Staff'],{back:'Book'}),radan:v('radan_nocape',['Spear','Shield']),leia:v('leia_nocape',['Censer']),
 velda:v('townswoman',[],{back:'Book',tint:0xe9def1}),orin:v('townsman',['Hammer'],{back:'Satchel'}),nara:v('townswoman',[],{back:'Basket',tint:0xf4e4bd}),mirel:v('townsman',[],{back:'Bow',tint:0xc9dfb9}),lio:v('townsman',[],{back:'Satchel',scale:.91}),teren:v('townsman',['Lantern'],{tint:0xd8d8c9}),gerd:v('townsman',['Oar'],{tint:0xc5e2df}),severin:v('townsman',[],{back:'Book',tint:0xc5cedf}),dagan:v('radan_nocape',['Sword','Shield'],{tint:0xd9a9a0}),elda:v('leia_nocape',['Censer'],{tint:0xe9e5d0})
};
export const ENEMY_VISUALS={
 ash_husk:v('ash_husk',['Sword']),ember_acolyte:v('ember_acolyte',['Staff']),iron_sentinel:v('radan_nocape',['Sword','Shield'],{tint:0x98a5ac}),broken_reliquary:v('bellkeeper',[],{scale:1.10,tint:0xc5c6b8}),road_extorter:v('townsman',['Sword'],{tint:0xb9aa9b}),thorn_wolf:v('wolf'),resin_moth:v('moth'),thorn_keeper:v('root_keeper'),iron_rat:v('rat'),tithe_guard:v('radan_nocape',['Spear'],{tint:0xc5b694}),quarry_overseer:v('townsman',['Hammer'],{scale:1.15,tint:0xab9c88}),quarry_echo:v('root_keeper',[],{tint:0xa3a9b7,scale:1.08}),drowned:v('ash_husk',[],{tint:0x94c1cc}),wick_light:v('moth',[],{scale:.7,tint:0xffa951,glow:.2}),reed_stalker:v('townsman',[],{back:'Bow',tint:0xa6c2a0}),ferry_echo:v('ember_acolyte',['Oar'],{tint:0x91b4d5,opacity:.75,scale:1.15}),paper_swarm:v('moth',[],{tint:0xe0e2c8,scale:.88}),ink_guard:v('radan_nocape',['Spear'],{tint:0x777b8e}),hush_acolyte:v('ember_acolyte',[],{tint:0xb6b6c8}),catalogue_warden:v('bellkeeper',[],{back:'Book',tint:0xb9c0a8}),hollow_reaper:v('ash_husk',['Spear'],{tint:0xb3ad83}),cinder_bird:v('bird'),harvest_engine:v('root_keeper',[],{tint:0xd8ba71,scale:1.15}),fortress_archer:v('radan_nocape',['Crossbow'],{tint:0xc1c7b0}),warden_hound:v('wolf',[],{tint:0xb8c0ca,scale:1.12}),dagan:ROLE_VISUALS.dagan,oath_knight:v('alar_nocape',['Sword','Shield'],{tint:0x979aaa}),silent_choir:v('ember_acolyte',[],{tint:0xe4d0a0,scale:1.1}),oathshade:v('ash_husk',[],{tint:0x8593c5,opacity:.77}),mute_abbot:v('ember_acolyte',['Censer'],{scale:1.4,tint:0xa9aaac}),bellkeeper:v('bellkeeper')
};
const FALLBACK={hero:ROLE_VISUALS.alar,acolyte:ENEMY_VISUALS.ember_acolyte,husk:ENEMY_VISUALS.ash_husk,sentinel:ENEMY_VISUALS.iron_sentinel,boss:ENEMY_VISUALS.bellkeeper};
const FORGED_VISUALS={
 forged_resin_lynx:v('forged_resin_lynx',[],{height:1.78}),
 forged_slag_golem:v('forged_slag_golem',[],{height:3.92}),
 forged_fen_weaver:v('forged_fen_weaver',[],{height:3.10}),
 forged_mill_wisp:v('forged_mill_wisp',[],{height:1.28,hover:.86}),
 forged_rivet_guard:v('forged_rivet_guard',['Hammer','Shield'],{height:3.28}),
};
export function installRefresh(World){
 const P=World.prototype,create=P.createActor,play=P.play,dispose=P.dispose;
 P.dispose=function(...args){if(this.disposed)return;const owned=new Set();for(const item of this.refreshInstances?.values()||[])for(const part of item.parts)owned.add(part.geometry);const result=dispose.apply(this,args);for(const geometry of owned)geometry.dispose();this.refreshInstances?.clear();return result;};
 P.loadAssets=async function(onProgress){
  const loader=new GLTFLoader();let done=0;
  await Promise.all([...BASE_MODELS.map(id=>['refresh/'+id,id]),['environment','environment'],['refresh-props','refreshProps']].map(async([file,key])=>{
   const gltf=await loader.loadAsync(new URL('../../assets/models/'+file+'.glb',import.meta.url).href);gltf.scene.traverse(o=>{if(o.isMesh)o.castShadow=o.receiveShadow=true;});this.assets[key]=gltf;onProgress?.(`Персонажи и мир · ${++done} / ${BASE_MODELS.length+2}`);
  }));
  this.assets.hero=this.assets.alar_nocape;this.assets.husk=this.assets.ash_husk;this.assets.acolyte=this.assets.ember_acolyte;this.assets.sentinel=this.assets.radan_nocape;this.assets.boss=this.assets.bellkeeper;
  this.atlas=await new T.TextureLoader().loadAsync(new URL('../../assets/act1/terrain-atlas.png',import.meta.url).href);this.atlas.colorSpace=T.SRGBColorSpace;this.atlas.wrapS=this.atlas.wrapT=T.ClampToEdgeWrapping;this.atlas.anisotropy=Math.min(8,this.renderer.capabilities.getMaxAnisotropy());this.atlas.generateMipmaps=true;this.makeMaterials();this.loaded=true;onProgress?.('Мир первого акта готов');return this;
 };
 P.prop=function(name,parent=this.areaGroup,position=[0,0,0],scale=1){
  const source=this.assets.refreshProps?.scene.getObjectByName(name);if(!source)throw new Error('Missing Blender prop '+name);const o=source.clone(true);o.position.set(...position);o.scale.setScalar(scale);parent.add(o);return o;
 };
 P.createActor=function(id,type,options={}){
  if(this.actors.has(id))return this.actors.get(id);
  const role=String(options.npc&&options.animationSource||options.role||'').split('_')[0];
  const campaignBase=options.enemyId||options.model||(options.party&&role==='alar'?'alar_unhelmed':role);
  const campaign=this.assets[campaignBase]?campaignActor(campaignBase):null;
  const visual=campaign||(options.enemyId?(FORGED_VISUALS[options.enemyId]||ENEMY_VISUALS[options.animationSource||options.enemyId]):ROLE_VISUALS[role]);
  const source=visual||FALLBACK[type]||ROLE_VISUALS.alar;
  const accent=options.visual;
  const look=accent?{...source,tint:accent.color??source.tint,scale:(source.scale||1)*(accent.scale||1),gear:accent.gear??source.gear}:source;
  const actor=create.call(this,id,look.base,{...options,refreshVisual:look});actor.type=type;actor.refreshVisual=look;
  this.characterAnimations?.bindActor(actor);
  if(!options.role)this.accessories(actor,'',false);
  this.characterAnimations?.equipPresentation?.(actor);
  actor.root.updateMatrixWorld(true);const box=new T.Box3();actor.root.traverse(o=>{if(o.isSkinnedMesh){o.computeBoundingBox();box.union(o.boundingBox.clone().applyMatrix4(o.matrixWorld));}});const height=box.max.y-box.min.y;const desired=look.height||(['wolf','rat'].includes(look.base)?1.65:look.base==='bird'||look.base==='moth'?1.45:['bellkeeper','root_keeper'].includes(look.base)?4.0:2.8);
  const factor=desired/Math.max(.1,height)*(look.scale||1);actor.wrapper.scale.multiplyScalar(factor);actor.refreshHeight=desired*(look.scale||1);
  actor.flightBaseline=look.hover==null?flightBaseline(look.base):look.hover/factor;actor.refreshRootBaseY=actor.root.position.y+actor.flightBaseline;
  actor.presentationHeight=actor.refreshHeight+actor.flightBaseline*Math.abs(actor.wrapper.scale.y);actor.root.position.y=actor.refreshRootBaseY;
  if(['moth','bird'].includes(look.base)){const bone=actor.root.getObjectByName('WingR');if(bone)actor.wingCorrection={bone,rest:bone.quaternion.clone(),scratch:new T.Quaternion()};}
  if(look.tint||look.opacity||look.glow)actor.root.traverse(o=>{if(!o.isMesh)return;for(const m of Array.isArray(o.material)?o.material:[o.material]){if(look.tint)m.color.multiply(new T.Color(look.tint));if(look.opacity){m.transparent=true;m.opacity=look.opacity;m.depthWrite=false;}if(look.glow){m.emissive.setHex(look.tint||0xffa040);m.emissiveIntensity=look.glow;}}});
  addRoadAccent(this,actor,accent);
  return actor;
 };
 P.accessories=function(actor,role,npc){
  const look=actor.options.refreshVisual;if(!look)return;
  const attach=(name,side)=>{
   const bone=actor.root.getObjectByName(side+'Hand');if(!bone)return;
   const info=bone.userData.weapon_socket;if(!info)return;
   const socket=new T.Group();socket.name='EquipmentSocket_'+side;socket.position.fromArray(info.translation);socket.quaternion.fromArray(info.rotation);bone.add(socket);
   const prop=this.prop(name,socket,[0,0,0],info.item_scale||100);prop.userData.separateEquipment=true;
  };
  if(look.gear?.[0])attach(look.gear[0],'Right');if(look.gear?.[1])attach(look.gear[1],'Left');
  if(look.back){
   actor.root.updateMatrixWorld(true);const anchor=actor.root.getObjectByName('Spine2')||actor.root.getObjectByName('Spine')||actor.root;const ws=anchor.getWorldScale(new T.Vector3());const s=1/Math.max(.001,Math.abs(ws.x));
   const prop=this.prop(look.back,anchor,[0,0,0],s*.8);prop.position.set(0,.13*s,-.20*s);if(look.back==='Bow'||look.back==='Oar')prop.rotation.z=.35;
  }
 };
 P.play=function(actor,name,restart=false){if(name==='Attack'&&!actor.actions.Attack&&actor.actions.Cast)name='Cast';if(name==='Cast'&&!actor.actions.Cast&&actor.actions.Attack)name='Attack';return play.call(this,actor,name,restart);};
 // Static source meshes originate from the Blender library and retain authored materials.
 const meshOf=function(name){this.refreshInstances??=new Map();if(this.refreshInstances.has(name))return this.refreshInstances.get(name);const source=this.assets.refreshProps.scene.getObjectByName(name);source.updateMatrixWorld(true);const parts=[];source.traverse(o=>{if(o.isMesh)parts.push({geometry:o.geometry.clone().applyMatrix4(o.matrixWorld),material:o.material});});const baked={...parts[0],parts};this.refreshInstances.set(name,baked);return baked;};
 const geo=P.geometry;const replacements={'tree-trunk':'TreeTrunk','tree-crown':'TreeCrown',rock:'Rock',grass:'Grass',wheat:'Wheat','quarry-ridge':'Rock',book:'Book','battle-rock':'Rock','battle-crown':'TreeCrown','battle-grass':'Grass'};
 P.geometry=function(key,factory){if(replacements[key]){const mesh=meshOf.call(this,replacements[key]);return mesh.geometry;}return geo.call(this,key,factory);};
 const instance=P.instance;
 P.instance=function(geometry,material,transforms,colors){for(const [key,name]of Object.entries(replacements)){const mesh=meshOf.call(this,name);if(mesh.geometry===geometry){let first;for(const part of mesh.parts){const result=instance.call(this,part.geometry,part.material,transforms,colors);first??=result;}return first;}}return instance.call(this,geometry,material,transforms,colors);};
 const mesh=P.mesh;P.mesh=function(geometry,material,parent=this.areaGroup,x=0,y=0,z=0,local=false){if(this.assets.refreshProps)for(const name of new Set(Object.values(replacements))){const source=meshOf.call(this,name);if(source.geometry===geometry){const group=new T.Group();group.position.set(x,y,z);parent.add(group);for(const part of source.parts){const o=new T.Mesh(part.geometry,part.material);o.castShadow=o.receiveShadow=true;group.add(o);}return group;}}return mesh.call(this,geometry,material,parent,x,y,z,local);};
 const battleStage=P.buildBattleStage;if(battleStage)P.buildBattleStage=function(){battleStage.call(this);for(const old of [...this.battleStage.children])if(old.isMesh&&old.geometry?.type==='CylinderGeometry'&&old.material===this.materials.get('bark')){const trunk=this.prop('TreeTrunk',this.battleStage,old.position.toArray());trunk.scale.set(1,old.geometry.parameters.height,1);this.battleStage.remove(old);}};
 P.house=function(x,z,angle,scale=1,ruined=false){const o=this.prop('House',this.areaGroup,[x,this.height(x,z),z],scale*.7);o.rotation.y=angle;this.perimeter(o,4,3.4);if(ruined)o.scale.y*=.65;return o;};
 P.archive=function(){for(const side of [-1,1])for(let row=0;row<4;row++){const o=this.prop('Bookshelf',this.areaGroup,[side*this.radiusX*.6,0,(row-1.5)*10]);o.rotation.y=side*-.13;o.scale.z=3;this.perimeter(o,.85,3.15);}};
 P.village=function(){for(const[x,z,a,s]of[[-.57,-.48,.46,1.15],[.58,-.4,-.7,.95],[-.7,.12,.9,.85],[.66,.29,-.9,1.05],[.03,-.72,.15,1.1]])this.house(x*this.radiusX,z*this.radiusZ,a,s);const x=-this.radiusX*.24,z=this.radiusZ*.1;this.prop('Well',this.areaGroup,[x,this.height(x,z),z],1.6);for(const a of[-1,1]){const p=this.prop('Crate',this.areaGroup,[a*this.radiusX*.28,this.height(a*this.radiusX*.28,this.radiusZ*.4),this.radiusZ*.4],1.5);this.perimeter(p,.8,.8);const barrel=this.prop('Barrel',this.areaGroup,[a*this.radiusX*.32,0,this.radiusZ*.52],1.8);this.perimeter(barrel,.7,.7);}const stall=this.prop('Stall',this.areaGroup,[-this.radiusX*.18,0,this.radiusZ*.6],1.4);this.perimeter(stall,2.7,1.8);};
 P.stream=function(){const x=-this.radiusX*.52,points=[{x:x-3,z:-this.radiusZ*.84},{x:x+2,z:-this.radiusZ*.48},{x:x-1.5,z:0},{x:x+3.5,z:this.radiusZ*.47},{x:x+6,z:this.radiusZ*.81}],width=this.biome==='marsh'?5:2.7;this.ribbon(points,width+2.6,'bank',.034);const river=this.ribbon(points,width,'water',.045);this.animations.push({kind:'water',object:river.mesh});if(this.biome==='forest'){const bridge=this.prop('Bridge',this.areaGroup,[x-4.15,this.height(x-1.4,0)+.18,0]);bridge.rotation.y=-Math.PI/2;}else for(const[px,pz,s]of[[.57,-.45,.8],[.6,.46,.62]])this.house(px*this.radiusX,pz*this.radiusZ,-.6,s,true);};
 P.banner=function(x,z,angle=0){const group=this.prop('BannerFrame',this.areaGroup,[x,this.height(x,z),z]);group.rotation.y=angle;const cloth=this.box(1.45,2.5,.045,'cloth',group,.75,3.95,0);this.animations.push({kind:'banner',object:cloth,phase:this.rng()*Math.PI*2});};
 P.abbey=function(){const rz=this.radiusZ,rx=this.radiusX;const arch=this.module('Arch',0,-rz*.53,1.55);if(arch)this.perimeter(arch,6,3);for(const side of[-1,1]){for(let i=0;i<3;i++)this.module('Pillar',side*rx*.45,(i-1)*rz*.43,i===0?1.25:.95);for(let i=0;i<Math.ceil(rz*1.15/3);i++){const wall=this.prop('Wall',this.areaGroup,[side*rx*.72,0,-rz*.14+(i-(Math.ceil(rz*1.15/3)-1)/2)*3]);wall.rotation.y=side*.07;this.perimeter(wall,.65,1.5);}for(let i=0;i<3;i++){const rock=this.prop('Rock',this.areaGroup,[side*rx*.72+(this.rng()-.5)*2,.25,-rz*.5+i*4.8]);rock.scale.set(1.4,.6,1.2);rock.rotation.y=this.rng()*Math.PI*2;}this.banner(side*rx*.42,-rz*.6,side*.15);}const altar=this.module('Altar',0,-rz*.73,1.3);if(altar)this.perimeter(altar,1.7,1.1);for(const x of[-4.3,4.3]){const brazier=this.module('Brazier',x,-rz*.68,1);if(brazier)this.perimeter(brazier,.9,.9);}};
 P.quarry=function(){for(let i=0;i<11;i++){const a=-Math.PI*.9+i/10*Math.PI*1.65,x=Math.cos(a)*this.radiusX*.82,z=Math.sin(a)*this.radiusZ*.82,rock=this.prop('Rock',this.areaGroup,[x,1.5+i%3,z]);rock.scale.set(4+i%3,3.2+i%4,4.5);rock.rotation.y=a;this.perimeter(rock,1,1);}const crane=this.prop('Crane',this.areaGroup,[this.radiusX*.45,0,-this.radiusZ*.45]);crane.rotation.y=-.4;this.house(-this.radiusX*.59,-this.radiusZ*.38,.6,.8,true);for(let i=0;i<5;i++){const cart=this.prop('Cart',this.areaGroup,[-this.radiusX*.4+i*6,.15,this.radiusZ*.65+Math.sin(i)*1.7]);cart.rotation.y=.12*i;this.perimeter(cart,1.15,1.05);}};
 P.fortress=function(){for(const side of[-1,1]){const x=side*this.radiusX*.68,z=-this.radiusZ*.65,tower=this.prop('Tower',this.areaGroup,[x,this.height(x,z),z]);this.perimeter(tower,4.15,4.15);this.house(side*this.radiusX*.63,this.radiusZ*.35,-side*.6,.85);}const gate=this.module('Arch',0,-this.radiusZ*.72,2.1);if(gate)this.perimeter(gate,6,3);};
 // Baked creature Death clips are used directly. Humanoid reactions use an
 // additional presentation transform, leaving combat state and source clips intact.
 const animate=P.animate;P.animate=function(actor,target,angle,desired,hp,dt,snap=false){
  const sampled = animate.call(this,actor,target,angle,desired,hp,dt,snap);
  // New Blender profile clips already contain coherent wing and death motion.
  // Keep only the original per-model ground/flight placement around those poses.
  if(actor.profileActions?.has(actor.current)){
   actor.clearanceLift=0;actor.fall=0;actor.wrapper.rotation.x=actor.wrapper.rotation.z=0;
   if(actor.refreshRootBaseY!=null)actor.root.position.y=actor.refreshRootBaseY;
   return sampled;
  }
  // The raw WingR track mirrors the already mirrored local bone a second time.
  // Invert only its animated delta, preserving its rest orientation and Death pose.
  if(sampled!==null&&actor.wingCorrection&&actor.current!=='Death'){const {bone,rest,scratch}=actor.wingCorrection;mirrorWingDelta(bone.quaternion,rest,scratch);}
  const attack=actor.actions.Attack,phase=attack?.getClip().duration?attack.time/attack.getClip().duration:0;
  actor.refreshRootBaseY??=actor.root.position.y;
  actor.clearanceLift=hp>0?groundClearanceLift(actor.refreshVisual?.base,actor.current,phase,attack?.getEffectiveWeight()||0,actor.flightBaseline||0):0;
  actor.root.position.y=actor.refreshRootBaseY+actor.clearanceLift;
  if(actor.actions.Death)return sampled;
  actor.fall=actor.fall||0;const fallen=hp<=0&&this.time>=(actor.deathAt||0);actor.fall=T.MathUtils.damp(actor.fall,fallen?1:0,8,dt);actor.wrapper.rotation.x=-1.48*actor.fall;if(!fallen&&!this.reducedMotion&&this.time<actor.reactionUntil)actor.wrapper.rotation.z=Math.sin((actor.reactionUntil-this.time)*18)*.10;else actor.wrapper.rotation.z=0;actor.wrapper.position.y+=actor.fall*.12;
  return sampled;
 };
 const interactions=P.buildInteractions;
 P.buildInteractions=function(){
  interactions.call(this);
  for(const item of this.interactables){if(item.kind!=='node')continue;const name=({chest:'Chest',camp:'Camp',puzzle:'Puzzle',inspect:'Inspect'})[item.definition.type||'inspect'];
   if(!name)continue;for(const c of [...item.group.children])if(c!==item.proxy&&c!==item.marker&&!this.animations.some(a=>a.object===c))item.group.remove(c);const prop=this.prop(name,item.group);item.lid=name==='Chest'?prop.getObjectByName('ChestLid'):null;item.craftedLid=!!item.lid;
  }
 };
}
