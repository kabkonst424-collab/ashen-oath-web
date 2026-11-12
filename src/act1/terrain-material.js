import * as T from '../../assets/vendor/three.module.js';
import {safeAtlasDomain,TERRAIN_GLSL,ATLAS_LINEAR_LUMINANCE} from './terrain-sampling.js?v=0.16.0-demo';

// Three-support stochastic atlas sampling; bounded luminance compensation, not full histogram synthesis.
// Reuse each embedded Meshy texture; material variants never copy its pixels.
const BIOMES = Object.freeze({
  terrain_village: { scale: .15, macro: .13, roughness: .04 },
  terrain_forest: { scale: .56, macro: .19, roughness: .06 },
  terrain_marsh: { scale: .14, macro: .18, roughness: -.035 },
  terrain_ruin: { scale: .155, macro: .14, roughness: .025 },
  path_strip: { scale: .17, macro: .12, roughness: .045 },
});

const COMMON=TERRAIN_GLSL;

const MAP = `
#ifdef USE_MAP
  vec4 sampledDiffuseColor=terrainSample(map);
  float terrainY=dot(sampledDiffuseColor.rgb,vec3(.2126,.7152,.0722));
  float terrainGain=min(1.3,inversesqrt(max(dot(terrainWeights,terrainWeights),1e-5)));
  float terrainTarget=max(0.,terrainMean+(terrainY-terrainMean)*terrainGain);
  sampledDiffuseColor.rgb=clamp(sampledDiffuseColor.rgb*clamp(terrainTarget/max(terrainY,1e-5),.78,1.22),vec3(0.),vec3(1.));
  float macroA=terrainNoise(mat2(.8,.6,-.6,.8)*vTerrainWorld.xz*.023);
  float macroB=terrainNoise(mat2(.3846,.9231,-.9231,.3846)*vTerrainWorld.xz*.061+vec2(21.,7.));
  sampledDiffuseColor.rgb*=(1.+(macroA-.5)*terrainMacro+(macroB-.5)*terrainMacro*.28);
  diffuseColor*=sampledDiffuseColor;
#endif
#ifdef TERRAIN_PATH
  float edgeBreak=(terrainNoise(vTerrainWorld.xz*1.7)-.5)*.12;
  float edgeAA=clamp(fwidth(vTerrainEdge),.001,.06);
  diffuseColor.a*=1.-smoothstep(.70+edgeBreak-edgeAA,.995+edgeAA,abs(vTerrainEdge));
#endif
`;
const NORMAL = `
#ifdef USE_NORMALMAP_TANGENTSPACE
  if(terrainDetail>.5){
  vec3 mapN=terrainNormal(normalMap);mapN.xy*=normalScale;
  mat3 terrainTbn=terrainTangentFrame(-vViewPosition,normal,terrainUV);
  #ifdef DOUBLE_SIDED
    terrainTbn[0]*=faceDirection;terrainTbn[1]*=faceDirection;
  #endif
  normal=normalize(terrainTbn*mapN);
  float terrainMinify=smoothstep(.001,.02,max(length(terrainDx),length(terrainDy)));
  roughnessFactor=clamp(roughnessFactor+min(.12,terrainVariance*.02)*terrainMinify,.18,1.);
  }
#elif defined(USE_NORMALMAP_OBJECTSPACE)
  normal=normalize(normalMatrix*terrainNormal(normalMap));
#endif
`;

export class TerrainMaterials {
  constructor(world){this.world=world;this.qualityLevel=world.qualityLevel==='low'?'low':'high';this.cache=new Map();this.uniforms=[];this.textures=new Set();this.samplers=new Map();this.samplerState=new Map();this.disposed=false;}
  _anisotropy(quality=this.qualityLevel){let max=this.world.renderer?.capabilities?.getMaxAnisotropy?.()??1;return Math.max(1,Math.min(Number.isFinite(max)?max:1,quality==='low'?2:8));}
  _sampler(source){if(!source)return null;if(this.samplers.has(source))return this.samplers.get(source);const texture=source.clone();texture.wrapS=texture.wrapT=T.ClampToEdgeWrapping;texture.magFilter=T.LinearFilter;if(!source.isCompressedTexture){texture.minFilter=T.LinearMipmapLinearFilter;texture.generateMipmaps=true;}texture.anisotropy=this._anisotropy();this.textures.add(texture);this.samplers.set(source,texture);this.samplerState.set(source,{version:source.version,source:source.source});return texture;}
  syncTextures(){if(this.disposed)return;for(const [source,texture]of this.samplers){const state=this.samplerState.get(source);if(state.version!==source.version||state.source!==source.source){texture.source=source.source;texture.colorSpace=source.colorSpace;texture.flipY=source.flipY;texture.mipmaps=source.mipmaps.slice();texture.needsUpdate=true;this.samplerState.set(source,{version:source.version,source:source.source});}}}
  material(source,id,{path=false}={}){
    if(this.disposed)throw new Error('TerrainMaterials is disposed');
    if(Array.isArray(source))return source.map(material=>this.material(material,id,{path}));
    if(!source?.isMeshStandardMaterial)throw new TypeError('Terrain surfaces require a MeshStandardMaterial');
    if(source.normalMap&&source.normalMapType===T.ObjectSpaceNormalMap)throw new TypeError('Terrain atlas normals must use tangent space');
    if(['bumpMap','displacementMap','lightMap','alphaMap','emissiveMap','clearcoatNormalMap'].some(key=>source[key]))throw new TypeError('Terrain surfaces require the supported base-color/normal/ORM map contract');
    const key=`${source.uuid}:${id}:${path?'path':'ground'}`;
    if(this.cache.has(key))return this.cache.get(key);
    const settings=BIOMES[id]||BIOMES.terrain_ruin,material=source.clone();
    for(const key of ['map','normalMap','roughnessMap','metalnessMap','aoMap'])material[key]=this._sampler(source[key]);
    const uniforms={terrainMean:{value:ATLAS_LINEAR_LUMINANCE[id]??ATLAS_LINEAR_LUMINANCE.terrain_ruin},terrainRect:{value:new T.Vector4(...safeAtlasDomain(id))},terrainScale:{value:settings.scale},terrainMacro:{value:settings.macro},terrainDetail:{value:this.qualityLevel==='low'?0:1},terrainRoughness:{value:settings.roughness}};
    material.name=`${source.name||'Meshy'}_continuous_${id}`;
    material.userData={...material.userData,terrainSource:source.uuid,terrainSampling:'world XZ; 3 continuous stochastic supports; verified atlas island; co-transformed PBR/gradients/normals; original embedded pixels'};
    material.defines={...material.defines,...(source.aoMap&&source.aoMap===source.roughnessMap&&source.aoMap===source.metalnessMap?{TERRAIN_AO_ORM:1}:{}),...(source.roughnessMap&&source.roughnessMap===source.metalnessMap?{TERRAIN_SHARED_ORM:1}:{}),...(path?{TERRAIN_PATH:1}:{})};
    material.normalScale?.multiplyScalar(.82);
    if(path){material.transparent=true;material.forceSinglePass=material.side===T.DoubleSide;material.depthWrite=false;material.alphaTest=.018;material.polygonOffset=true;material.polygonOffsetFactor=-1;material.polygonOffsetUnits=-1;}
    const upstreamCompile=source.onBeforeCompile;
    material.onBeforeCompile=(shader,renderer)=>{
      this.syncTextures();
      upstreamCompile?.call(material,shader,renderer);
      const vertexChunks=['project_vertex'],fragmentChunks=['clipping_planes_fragment','map_fragment','normal_fragment_maps','roughnessmap_fragment','metalnessmap_fragment','aomap_fragment'];
      for(const chunk of vertexChunks)if(!shader.vertexShader.includes('#include <'+chunk+'>'))throw new Error('Terrain shader missing vertex chunk '+chunk);
      for(const chunk of fragmentChunks)if(!shader.fragmentShader.includes('#include <'+chunk+'>'))throw new Error('Terrain shader missing fragment chunk '+chunk);
      Object.assign(shader.uniforms,uniforms);
      shader.vertexShader=`varying vec3 vTerrainWorld;\n${path?'attribute float waterEdge; varying float vTerrainEdge;\n':''}${shader.vertexShader}`;
      shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',`vec4 terrainPosition=vec4(transformed,1.);\n#ifdef USE_BATCHING\nterrainPosition=batchingMatrix*terrainPosition;\n#endif\n#ifdef USE_INSTANCING\nterrainPosition=instanceMatrix*terrainPosition;\n#endif\nvTerrainWorld=(modelMatrix*terrainPosition).xyz;\n${path?'vTerrainEdge=waterEdge;':''}\n#include <project_vertex>`);
      shader.fragmentShader=COMMON+shader.fragmentShader;
      shader.fragmentShader=shader.fragmentShader.replace('#include <clipping_planes_fragment>','#include <clipping_planes_fragment>\nterrainPrepare(vTerrainWorld.xz*terrainScale);');
      shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',MAP);
      shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',NORMAL);
      shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`float roughnessFactor=roughness;\n#ifdef USE_ROUGHNESSMAP\nvec4 terrainOrmSample=terrainSample(roughnessMap);\nroughnessFactor*=terrainOrmSample.g;\n#endif\nroughnessFactor=clamp(roughnessFactor+terrainRoughness, .18, 1.);`);
      shader.fragmentShader=shader.fragmentShader.replace('#include <metalnessmap_fragment>',`float metalnessFactor=metalness;\n#ifdef USE_METALNESSMAP\n#ifdef TERRAIN_SHARED_ORM\nmetalnessFactor*=terrainOrmSample.b;\n#else\nmetalnessFactor*=terrainSample(metalnessMap).b;\n#endif\n#endif`);
      const ao=T.ShaderChunk.aomap_fragment.replace(/texture2D\(\s*aoMap,\s*vAoMapUv\s*\)/g,material.defines.TERRAIN_AO_ORM?'terrainOrmSample':'terrainSample(aoMap)');
      shader.fragmentShader=shader.fragmentShader.replace('#include <aomap_fragment>',ao);
    };
    const bindings=['map','normalMap','roughnessMap','metalnessMap','aoMap'];
    material.onBeforeRender=(...args)=>{
      this.syncTextures();let rebound=false;for(const key of bindings){const next=source[key]?this._sampler(source[key]):null;if(material[key]!==next){material[key]=next;rebound=true;}}
      if(rebound){delete material.defines.TERRAIN_SHARED_ORM;delete material.defines.TERRAIN_AO_ORM;if(material.roughnessMap&&material.roughnessMap===material.metalnessMap)material.defines.TERRAIN_SHARED_ORM=1;if(material.aoMap&&material.aoMap===material.roughnessMap&&material.aoMap===material.metalnessMap)material.defines.TERRAIN_AO_ORM=1;material.needsUpdate=true;}source.onBeforeRender?.apply(material,args);
    };
    material.customProgramCacheKey=()=>JSON.stringify(['ashen-terrain-stochastic-v3',path?'path':'ground',source.customProgramCacheKey?.()??String(upstreamCompile),!!material.defines.TERRAIN_SHARED_ORM,!!material.defines.TERRAIN_AO_ORM]);
    this.uniforms.push(uniforms);this.cache.set(key,material);return material;
  }
  setQuality(value){value=value==='low'?'low':'high';if(this.qualityLevel===value)return this;this.qualityLevel=value;for(const uniforms of this.uniforms)uniforms.terrainDetail.value=value==='low'?0:1;for(const texture of this.textures){const anisotropy=this._anisotropy(value);if(texture.anisotropy!==anisotropy){texture.anisotropy=anisotropy;texture.needsUpdate=true;}}return this;}
  dispose(){if(this.disposed)return;this.disposed=true;for(const material of this.cache.values())material.dispose();this.cache.clear();this.uniforms.length=0;for(const texture of this.textures)texture.dispose();this.textures.clear();this.samplers.clear();this.samplerState.clear();}
}
