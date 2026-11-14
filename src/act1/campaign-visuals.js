export const CHAPTER_BIOMES = Object.freeze({
  coast:{tile:2, surface:'terrain_marsh', atlas:0, sky:0x688b9a, fog:0x88a0a6, foliage:0x647653, earth:0x536e71, light:0xffdfa5, exposure:2.85, density:.012, color:0xc5d5cd, trees:23},
  reef:{tile:2, surface:'terrain_marsh', atlas:0, sky:0x486875, fog:0x65818a, foliage:0x526b59, earth:0x38585d, light:0xcce9ec, exposure:2.65, density:.016, color:0x90bcc2, trees:12},
  snow:{tile:3, surface:'terrain_ruin', atlas:1, sky:0x9baebf, fog:0xb1c5d2, foliage:0x60776f, earth:0x7292a4, light:0xffefe0, exposure:2.6, density:.012, color:0xdbeaf6, trees:16},
  crystal:{tile:3, surface:'terrain_ruin', atlas:1, sky:0x8496bb, fog:0x93afce, foliage:0x52697b, earth:0x648d9e, light:0xe2edff, exposure:2.7, density:.014, color:0xa6becf, trees:5},
  slag:{tile:3, surface:'terrain_ruin', atlas:2, sky:0x674d4b, fog:0x836857, foliage:0x685a35, earth:0x563f38, light:0xffbb7f, exposure:3.25, density:.015, color:0xc79980, trees:7},
  forge:{tile:3, surface:'terrain_ruin', atlas:2, sky:0x513f46, fog:0x755b4d, foliage:0x6c5c47, earth:0x4a3e37, light:0xffbd80, exposure:3.3, density:.013, color:0xe4ad8f, trees:2},
  orchard:{tile:1, surface:'terrain_forest', atlas:3, sky:0x878d9b, fog:0x96a5ae, foliage:0x75936c, earth:0x6b7866, light:0xffe3c4, exposure:3.0, density:.011, color:0xabb694, trees:78},
  glass:{tile:3, surface:'terrain_ruin', atlas:3, sky:0x72a2a3, fog:0x8ba9a6, foliage:0x5a7268, earth:0x547272, light:0xe3fcf0, exposure:3.05, density:.011, color:0xc6eddf, trees:12},
  moor:{tile:1, surface:'terrain_forest', atlas:0, sky:0x597e80, fog:0x749a98, foliage:0x797d54, earth:0x606e51, light:0xffe4b7, exposure:3.0, density:.015, color:0xafb890, trees:15},
  amphitheatre:{tile:3, surface:'terrain_ruin', atlas:3, sky:0x677582, fog:0x879a9c, foliage:0x716956, earth:0x635d47, light:0xffd294, exposure:2.85, density:.011, color:0xe0c9a5, trees:4},
});

export const STARTING_MODELS = Object.freeze(['alar_unhelmed','myrt','elian']);
const chapterRoles = ['boss','mob_a','mob_b','npc_a','npc_b'];
export const NEW_CHARACTERS = Object.freeze([...STARTING_MODELS,
  ...Array.from({length:5},(_,i)=>chapterRoles.map(role=>`c${i+2}_${role}`)).flat()]);
export const isCampaignModel = id => NEW_CHARACTERS.includes(id);

const looks = {
  alar_unhelmed:{gear:['Sword','Shield'],height:2.8},
  myrt:{gear:[],back:'Bow',height:2.74},
  elian:{gear:['Staff'],height:2.81},
  c2_boss:{height:3.95}, c3_boss:{height:3.86}, c4_boss:{height:4.2}, c5_boss:{height:3.78}, c6_boss:{height:4.34},
  c2_mob_a:{gear:['Sword'],height:2.65},c2_mob_b:{gear:['Spear'],height:2.83},
  c3_mob_a:{gear:['Spear'],height:3.0},c3_mob_b:{height:2.74},
  c4_mob_a:{gear:['Hammer'],height:2.7},c4_mob_b:{gear:['Sword','Shield'],height:2.9},
  c5_mob_a:{gear:['Sword'],height:2.68},c5_mob_b:{height:2.91},
  c6_mob_a:{height:2.75},c6_mob_b:{gear:['Spear'],height:2.95},
};

export function campaignActor(base) {
  return isCampaignModel(base) ? { base, gear:[], height:2.66, ...looks[base] } : null;
}

export function campaignModelsForArea(area) {
  const models = new Set();
  for(const npc of area?.npcs || []) if(isCampaignModel(npc.model))models.add(npc.model);
  for(const encounter of area?.encounters || [])for(const id of encounter.enemies)if(isCampaignModel(id))models.add(id);
  return [...models];
}
