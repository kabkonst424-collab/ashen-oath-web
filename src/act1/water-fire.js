import { buildAuthoredOcean } from './authored-landscape.js?v=campaign-v1';
import * as T from '../../assets/vendor/three.module.js';
import { environmentalTime, fireDistanceFade, waterReadability } from './presentation-environment.js?v=0.16.0-demo';
import { tileTerrainGeometry } from './meshy-world.js?v=campaign-170';

// The old radial shore serves the battle arenas. Authored zones set their own banks.
export const SHORE = Object.freeze({radius: Math.sqrt(.9) + .018, noise: .22});
const hash = text => [...String(text)].reduce((h,c) => Math.imul(h^c.charCodeAt(0),16777619)>>>0,2166136261);
const tag = object => { object.userData.modelOrigin={kind:'vfx',source:'Painted campfire and ambient particles'};return object; };
const vertex = `
  uniform float clock; uniform float river;
  uniform vec2 island; uniform vec2 center; uniform float phase;
  attribute float waterEdge; varying vec3 surface; varying float edge;
  #include <fog_pars_vertex>
  float coast(vec2 p){float a=atan(p.y,p.x);return ${SHORE.radius.toFixed(8)}+sin(a*5.+phase)*.026*.22+cos(a*9.-phase)*.018*.22;}
  void main(){
    vec3 p=position; vec2 q=(p.xz-center)/island;
    float shore=max(0.,(length(q)-coast(q))*min(island.x,island.y));
    float amplitude=mix(smoothstep(0.,2.,shore),.55,river);
    p.y+=(sin(dot(p.xz,vec2(.72,.49))-clock*1.12)*.022+sin(dot(p.xz,vec2(-1.11,.73))+clock*.84)*.012)*amplitude;
    surface=(modelMatrix*vec4(p,1.)).xyz;edge=waterEdge;
    vec4 mvPosition=viewMatrix*vec4(surface,1.);gl_Position=projectionMatrix*mvPosition;
    #include <fog_vertex>
  }`;
const fragment = `
  uniform float clock;uniform float river;uniform float flowing;uniform float authoredOcean;uniform float phase;uniform float rippleDetail;uniform float glintStrength;uniform float foamCap;
  uniform vec2 island;uniform vec2 center;
  uniform vec3 deepColor;uniform vec3 shallowColor;uniform vec3 skyColor;uniform vec3 sunDirection;
  uniform sampler2D sourceMap;uniform float hasSource;
  varying vec3 surface;varying float edge;
  #include <fog_pars_fragment>
  void main(){
    vec2 p=surface.xz,q=(p-center)/island;
    float a=atan(q.y,q.x),coast=${SHORE.radius.toFixed(8)}+sin(a*5.+phase)*.026*.22+cos(a*9.-phase)*.018*.22;
    float shore=(length(q)-coast)*min(island.x,island.y);
    if(river<.5 && shore<-.10 && authoredOcean<.5)discard;
    if(authoredOcean>.5)shore=max(2.,shore);
    float depth=mix(smoothstep(0.,8.,shore),.42,river);
    depth=mix(depth,.22+.65*(1.-smoothstep(.32,1.,edge)),flowing);
    float w1=dot(p,vec2(.72,.49))-clock*1.12,w2=dot(p,vec2(-1.11,.73))+clock*.84;
    float r1=dot(p,vec2(2.7,-1.9))+clock*1.37,r2=dot(p,vec2(-3.2,-2.1))-clock*1.09;
    vec2 slope=vec2(.72,.49)*cos(w1)*.065+vec2(-1.11,.73)*cos(w2)*.044;
    slope+=(vec2(2.7,-1.9)*cos(r1)*.012+vec2(-3.2,-2.1)*cos(r2)*.009)*rippleDetail;
    vec3 normal=normalize(vec3(-slope.x,1.,-slope.y));
    vec3 viewDirection=normalize(cameraPosition-surface);
    float fresnel=.025+.975*pow(1.-max(dot(viewDirection,normal),0.),5.);
    vec3 base=mix(shallowColor,deepColor,depth);
    vec3 scanned=vec3(.5);if(hasSource>.5)scanned=texture2D(sourceMap,p*.055+slope*.018).rgb;
    base*=mix(vec3(1.),mix(vec3(.86),vec3(1.14),scanned),hasSource*.18);
    vec3 reflectedSky=mix(skyColor*.58,skyColor*1.12,clamp(reflect(-viewDirection,normal).y,0.,1.));
    float skyBand=mix(.19,.63,smoothstep(.28,.43,fresnel));
    skyBand=mix(skyBand,min(skyBand,.42),flowing);
    vec3 color=mix(base,reflectedSky,skyBand);
    vec3 halfVector=normalize(sunDirection+viewDirection);
    float glint=pow(max(dot(normal,halfVector),0.),160.);
    color+=vec3(1.,.90,.72)*smoothstep(.08,.40,glint)*glintStrength*.58;
    float front=.18+sin(clock*.87+sin(a*7.)*.45)*.16;
    float coastalFoam=(1.-smoothstep(.04,.19,abs(shore-front)))*(1.-smoothstep(.7,1.15,shore));
    coastalFoam*=smoothstep(-.72,.62,sin(dot(p,vec2(1.3,.8))+sin(dot(p,vec2(-.43,.71)))*1.8-clock*.31));
    float riverFoam=smoothstep(.78,.97,edge)*(.35+.25*sin(r1+w2));
    if(flowing>.5){
      vec2 current=vec2(p.x,p.y-clock*1.7);
      float lane=dot(current,vec2(2.9,-.36))+sin(dot(current,vec2(.47,.62)))*.68+
        sin(dot(current,vec2(-.88,.16)))*.6;
      float currentNoise=cos(dot(current,vec2(.51,.46))+.92*sin(dot(current,vec2(.23,-.74))));
      float threads=smoothstep(.57,.98,sin(lane))*smoothstep(.37,.92,currentNoise);
      float wash=sin(dot(current,vec2(-.34,.43))+.72*sin(dot(current,vec2(.63,.26))));
      color+=vec3(.14,.19,.175)*(threads*.68+wash*.15)*(1.-smoothstep(.62,1.,edge));
      riverFoam=smoothstep(.81,1.,edge)*(.29+.24*smoothstep(-.6,.9,currentNoise));
    }
    float foam=mix(coastalFoam,riverFoam,river)*(.54+.22*sin(r1)*sin(r2));
    color=mix(color,vec3(.76,.87,.80),clamp(foam,0.,foamCap));
    gl_FragColor=vec4(color,1.);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #include <fog_fragment>
  }`;

export class WorldElements {
  constructor(world){this.world=world;this.motionClock={value:world.time||0,last:world.time||0,reduced:!!world.reducedMotion};this.water=[];this.waterCache=new Map();this.fireAtlasCache=new Map();this.fires=[];this.serial=0;this.nearest=[null,null,null,null];this.nearestDistance=[Infinity,Infinity,Infinity,Infinity];this.nextLightSelection=0;this.viewProjection=new T.Matrix4();this.frustum=new T.Frustum();this.fireBounds=new T.Sphere(new T.Vector3(),2.5);}
  material(source,river=false,center={x:0,z:0},rx=this.world.radiusX,rz=this.world.radiusZ,authoredOcean=false,flowing=false){
    const w=this.world,marsh=w.biome==='marsh',dark=w.biome==='abbey';
    const key=`${source?.uuid||'none'}:${river?1:0}:${center.x}:${center.z}:${rx}:${rz}:${w.biome}:${authoredOcean?1:0}:${flowing?1:0}`;
    if(this.waterCache.has(key))return this.waterCache.get(key);
    const material=new T.ShaderMaterial({vertexShader:vertex,fragmentShader:fragment,fog:true,side:T.DoubleSide,
      uniforms:T.UniformsUtils.merge([T.UniformsLib.fog,{
        clock:{value:w.time},river:{value:river?1:0},flowing:{value:flowing?1:0},authoredOcean:{value:authoredOcean?1:0},phase:{value:w.seedPhase||0},island:{value:new T.Vector2(rx,rz)},center:{value:new T.Vector2(center.x,center.z)},
        deepColor:{value:new T.Color(marsh?0x123d39:dark?0x173940:0x10586a)},shallowColor:{value:new T.Color(marsh?0x577e63:dark?0x447979:0x529b96)},
        skyColor:{value:w.scene.background.clone()},sunDirection:{value:w.sun.position.clone().sub(w.sun.target.position).normalize()},
        sourceMap:{value:null},hasSource:{value:source?.map?1:0},rippleDetail:{value:w.qualityLevel==='low'?0:1},glintStrength:{value:waterReadability(w.reducedMotion).glint},foamCap:{value:waterReadability(w.reducedMotion).foam}
      }])});
    // Borrow the embedded Meshy map; never clone or dispose its owner here.
    material.uniforms.sourceMap.value=source?.map||w.atlas;
    this.water.push(material);this.waterCache.set(key,material);return material;
  }
  ocean(parent=this.world.areaGroup,stage=false){
    const w=this.world;
    if(!stage&&w.area?.layout){buildAuthoredOcean(w);return;}
    const source=w.meshyParts('water_strip'),center=stage?w.battleCenter:{x:0,z:0},rx=stage?72:w.radiusX,rz=stage?72:w.radiusZ;
    const group=new T.Group();group.name='Meshy_surrounding_water';parent.add(group);
    for(const part of source.parts){
      const geometry=tileTerrainGeometry(part.geometry,{radiusX:Math.max(145,rx+100),radiusZ:Math.max(145,rz+100),centerX:center.x,centerZ:center.z,tileSize:40,
        height:(x,z)=>{const r=Math.hypot((x-center.x)/rx,(z-center.z)/rz),blend=T.MathUtils.smoothstep(r,1,1.22);return T.MathUtils.lerp(w.height(x,z)-.065,-.12,blend);}});
      geometry.computeBoundingBox();geometry.boundingBox.min.y-=.035;geometry.boundingBox.max.y+=.035;
      geometry.computeBoundingSphere();geometry.boundingSphere.radius+=.035;
      geometry.setAttribute('waterEdge',new T.Float32BufferAttribute(new Float32Array(geometry.attributes.position.count),1));
      const original=Array.isArray(part.material)?part.material[0]:part.material,mesh=new T.Mesh(geometry,this.material(original,false,center,rx,rz));
      mesh.name='Meshy_water_strip_ocean';mesh.userData.modelOrigin={kind:'meshy-world',slot:'water_strip',sha256:source.entry.sha256,rawSha256:source.entry.rawSha256,taskId:source.entry.taskId,derivation:'Original Meshy upper faces tiled, clipped and wave-shaded; no replacement plane'};
      mesh.userData.stageGeometry=stage;mesh.userData.waterSurface=true;mesh.castShadow=mesh.receiveShadow=false;group.add(mesh);
      if(!stage)w.areaGeometries.add(geometry);
    }
  }
  river(group){
    group.traverse(mesh=>{if(!mesh.isMesh)return;const source=Array.isArray(mesh.material)?mesh.material[0]:mesh.material;mesh.material=this.material(source,true);mesh.userData.waterSurface=true;mesh.castShadow=mesh.receiveShadow=false;});
  }
  fireMap(source){
    if(this.fireAtlasCache.has(source))return this.fireAtlasCache.get(source);
    const map=source.clone();map.generateMipmaps=false;map.minFilter=T.LinearFilter;map.needsUpdate=true;
    this.fireAtlasCache.set(source,map);return map;
  }
  addFire(parent,kind){
    if(parent.userData.hasLiveFire)return;parent.userData.hasLiveFire=true;
    const w=this.world,atlas=w.magicVfx?.textures,phase=(hash(`${w.areaId}:${parent.position.toArray()}:${kind}:${this.serial++}`)%10007)/10007;
    const root=tag(new T.Group());root.name='Painted_live_'+kind;root.position.y=kind==='brazier'?1.22:.26;parent.add(root);
    const sprites=[];
    const sprite=(key,x,y,size,opacity,color,additive=false)=>{
      if(!atlas?.[key])return;
      const map=this.fireMap(atlas[key]),inset=.5/(map.image?.width||640),cell={value:new T.Vector4(.2-inset*2,.2-inset*2,inset,.8+inset)};
      const material=new T.SpriteMaterial({map,color,transparent:true,opacity,depthWrite:false,depthTest:true,toneMapped:false,blending:additive?T.AdditiveBlending:T.NormalBlending});
      material.onBeforeCompile=shader=>{shader.uniforms.fireCell=cell;shader.fragmentShader=`uniform vec4 fireCell;\n${shader.fragmentShader}`;shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','#ifdef USE_MAP\ndiffuseColor*=texture2D(map,vMapUv*fireCell.xy+fireCell.zw);\n#endif');};
      material.customProgramCacheKey=()=> 'ashen-shared-fire-atlas-v1';
      const object=tag(new T.Sprite(material));object.position.set(x,y,0);object.scale.set(size,size*1.4,1);root.add(object);sprites.push({object,cell,material,key,size,opacity,y,x,inset});
    };
    sprite('flame',0,.55,1.35,.92,0xffffff);
    sprite('flame',.10,.39,.72,.44,0xffc57a,true);
    sprite('smoke',.08,1.45,1.12,.24,0x77736c);
    const light=new T.PointLight(0xffa249,0,6.5,2);light.position.y=.6;root.add(light);
    const sparks=[];
    for(let i=0;i<5;i++){
      const material=new T.SpriteMaterial({map:w.magicVfx?.softTexture,color:0xffbb64,transparent:true,depthWrite:false,depthTest:true,toneMapped:false,blending:T.AdditiveBlending});
      const object=tag(new T.Sprite(material));object.scale.setScalar(.035+(i%3)*.012);root.add(object);sparks.push(object);
    }
    this.fires.push({root,parent,phase,sprites,sparks,light,worldPosition:new T.Vector3(),distance:Infinity,visible:true});
  }
  update(){
    const w=this.world,t=environmentalTime(this.motionClock,w.time,!!w.reducedMotion);
    for(const material of this.water){material.uniforms.sunDirection.value.copy(w.sun.position).sub(w.sun.target.position).normalize();material.uniforms.clock.value=t;material.uniforms.rippleDetail.value=w.qualityLevel==='low'?0:1;const readability=waterReadability(w.reducedMotion);material.uniforms.glintStrength.value=readability.glint;material.uniforms.foamCap.value=readability.foam;}
    // Only the four nearest visible fires receive real lights. No extra shadow maps.
    const camera=w.activeCamera||w.camera,position=camera.position,lightLimit=w.qualityLevel==='low'?1:4;
    if(w.time>=this.nextLightSelection){
      this.nextLightSelection=w.time+.12;this.nearest.fill(null);this.nearestDistance.fill(Infinity);
      this.viewProjection.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);this.frustum.setFromProjectionMatrix(this.viewProjection);
      for(const fire of this.fires){
        fire.visible=true;for(let p=fire.root;p;p=p.parent)if(!p.visible){fire.visible=false;break;}
        fire.root.getWorldPosition(fire.worldPosition);fire.distance=fire.worldPosition.distanceToSquared(position);
        this.fireBounds.center.copy(fire.worldPosition);this.fireBounds.center.y+=1.2;
        if(!fire.visible||fire.distance>6400||!this.frustum.intersectsSphere(this.fireBounds))continue;
        for(let i=0;i<lightLimit;i++)if(fire.distance<this.nearestDistance[i]){for(let j=lightLimit-1;j>i;j--){this.nearest[j]=this.nearest[j-1];this.nearestDistance[j]=this.nearestDistance[j-1];}this.nearest[i]=fire;this.nearestDistance[i]=fire.distance;break;}
      }
    }
    for(const fire of this.fires){
      const fade=fire.visible?fireDistanceFade(fire.distance):0;
      for(const s of fire.sprites)s.material.opacity=s.opacity*fade;
      if(fade<=0){fire.light.visible=false;fire.light.intensity=0;for(const spark of fire.sparks)spark.material.opacity=0;continue;}
      const p=fire.phase,clock=t*(.88+p*.17)+p*8;
      for(const s of fire.sprites){
        const frame=s.key==='flame'
          ? Math.floor((t+p)*25)%25
          : Math.floor(clock*6)%25;
        s.cell.value.z=frame%5/5+s.inset;s.cell.value.w=1-(Math.floor(frame/5)+1)/5+s.inset;
        const flutter=Math.sin(clock*3.3+p*15)*.035;s.object.material.rotation=flutter;
        s.object.position.x=s.x+Math.sin(clock*1.9)*.045;
        s.object.scale.set(s.size*(1+flutter),s.size*1.4*(1+Math.sin(clock*4.7)*.035),1);
      }
      for(let i=0;i<fire.sparks.length;i++){const spark=fire.sparks[i];spark.visible=!w.reducedMotion;const cycle=(clock*.32+i*.197)%1;spark.position.set(Math.sin(i*4.17+clock*.7)*(.10+cycle*.21),.4+cycle*1.65,Math.cos(i*2.3+clock*.4)*.17);spark.material.opacity=Math.sin(cycle*Math.PI)*.58*fade;}
      fire.light.visible=false;for(let i=0;i<lightLimit;i++)if(this.nearest[i]===fire){fire.light.visible=true;break;}
      fire.light.intensity=fire.light.visible?(w.reducedMotion?1.25:1.25+Math.sin(clock*3.1)*.09+Math.sin(clock*5.7+.8)*.055)*fade:0;
    }
  }
  clearArea(){
    for(const fire of this.fires){for(const s of fire.sprites)s.material.dispose();for(const spark of fire.sparks)spark.material.dispose();fire.root.removeFromParent();delete fire.parent.userData.hasLiveFire;}
    this.fires.length=0;this.nearest.fill(null);this.nearestDistance.fill(Infinity);this.nextLightSelection=0;for(const material of this.water)material.dispose();this.water.length=0;this.waterCache.clear();for(const map of this.fireAtlasCache.values())map.dispose();this.fireAtlasCache.clear();
  }
  dispose(){this.clearArea();}
}

export function installWorldElements(World){
  const p=World.prototype,ground=p.buildGround,ribbon=p.ribbon,prop=p.meshyProp,interactions=p.buildInteractions;
  p.buildGround=function(...args){ground.apply(this,args);this.worldElements?.ocean();};
  p.ribbon=function(...args){const result=ribbon.apply(this,args);if(args[2]==='water')this.worldElements?.river(result.mesh);return result;};
  p.meshyProp=function(id,...args){const group=prop.call(this,id,...args);if(id==='camp'||id==='brazier')this.worldElements?.addFire(group,id);return group;};
  p.buildInteractions=function(...args){interactions.apply(this,args);for(const a of this.animations)if(a.kind==='fire')a.object.visible=false;};
}
