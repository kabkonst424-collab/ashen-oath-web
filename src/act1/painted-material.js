import * as T from '../../assets/vendor/three.module.js';

const shaded = new WeakSet();
const PAINTED_SHADER = T.ShaderChunk.lights_physical_pars_fragment.replace(
  'vec3 irradiance = dotNL * directLight.color;',
  `float inkWidth = clamp(fwidth(dotNL) * 0.7, 0.018, 0.08);
   float inkLight = 0.24 * smoothstep(0.04, 0.13, dotNL)
                  + 0.34 * smoothstep(0.40 - inkWidth, 0.40 + inkWidth, dotNL)
                  + 0.42 * smoothstep(0.74 - inkWidth, 0.74 + inkWidth, dotNL);
   vec3 irradiance = inkLight * directLight.color;`
);

const PIGMENT_MAP = `
  #ifdef USE_MAP
    vec4 colorSource = texture2D(map, vMapUv);
    float tone = dot(colorSource.rgb, vec3(0.2126, 0.7152, 0.0722));
    float redCloth = step(0.042, colorSource.r - colorSource.g)
                   * step(colorSource.g, 0.15);
    float linen = step(0.35, tone) * (1.0 - redCloth);
    float warm = step(0.035, colorSource.r - colorSource.b);
    vec2 origin = vec2(max(linen, warm * (1.0 - redCloth)), 1.0 - max(linen, redCloth)) * 0.5;
    vec2 grainUV = origin + vec2(0.0078125) + fract(vMapUv * 2.0) * 0.484375;
    vec3 grain = texture2D(paintedPigmentAtlas, grainUV).rgb;
    float grainTone = dot(grain, vec3(0.2126, 0.7152, 0.0722));
    float simplified = mix(tone, sqrt(max(tone, 0.0)), 0.23);
    vec3 pigment = grain * clamp(simplified / max(grainTone, 0.04), 0.21, 2.8);
    colorSource.rgb = mix(colorSource.rgb, pigment, 0.60);
    diffuseColor *= colorSource;
  #endif
`;

/** Matte lighting bands on original meshes. Keep material and geometry ownership. */
export function paintMaterial(material, { character = false, pigments = null } = {}) {
  if (!material?.isMeshStandardMaterial || shaded.has(material)) return material;
  shaded.add(material);
  material.metalness = Math.min(material.metalness, character ? 0.19 : 0.06);
  material.roughness = Math.max(material.roughness, character ? 0.73 : 0.91);
  if (material.normalScale) material.normalScale.multiplyScalar(character ? 0.18 : 0.24);
  const compile = material.onBeforeCompile;
  const baseKey = material.customProgramCacheKey();
  material.onBeforeCompile = function (shader, renderer) {
    compile.call(this, shader, renderer);
    shader.fragmentShader = shader.fragmentShader.replace('#include <lights_physical_pars_fragment>', PAINTED_SHADER);
    if (character && pigments && material.map && shader.fragmentShader.includes('#include <map_fragment>')) {
      shader.uniforms.paintedPigmentAtlas = { value: pigments };
      shader.fragmentShader = 'uniform sampler2D paintedPigmentAtlas;\n' + shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', PIGMENT_MAP);
    }
    if (character) {
      shader.fragmentShader = shader.fragmentShader.replace('#include <opaque_fragment>', `
        float inkRim = smoothstep(0.77, 0.97, 1.0 - abs(dot(normal, normalize(vViewPosition))));
        outgoingLight = mix(outgoingLight, outgoingLight * vec3(0.52, 0.61, 0.71) + vec3(0.007, 0.010, 0.014), inkRim * 0.55);
        #include <opaque_fragment>
      `);
    }
  };
  material.customProgramCacheKey = () => `${baseKey}|ashen-painted-2:${character ? 'actor' : 'decoration'}:${!!pigments}`;
  material.needsUpdate = true;
  return material;
}

export function paintMeshes(root, options = {}, keepMaterial = () => false) {
  root.traverse(object => {
    if (!object.isMesh || keepMaterial(object)) return;
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      paintMaterial(material, options);
    }
  });
}
