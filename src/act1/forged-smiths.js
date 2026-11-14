const SMITHIES = [
  { area: 'village', id: 'forge_village', name: 'Кузнец Бран', position: [7,13], shelter: [8,8],
    line: 'Орин держит большую кузницу. Я подгоняю доспехи путникам, пока железо ещё горячее.',
    stock: ['iron_trail_blade','hardened_jack','tin_waymark','healing_draught'] },
  { area: 'quarry', id: 'forge_quarry', name: 'Кузнец Сава', position: [-60,33], shelter: [-61,37.8],
    line: 'Раньше правил кирки восьмой смены. Теперь берусь и за клинки.',
    stock: ['hardened_jack','ward_spear','ether_drop','healing_draught'] },
  { area: 'fen', id: 'forge_fen', name: 'Кузнец Нильс', position: [-61,12.5], shelter: [-64.2,8.5],
    line: 'Топь ест железо быстрее огня. Положите снасти на край колоды.',
    stock: ['road_mail','reed_staff','ether_drop','revival_salt'] },
  { area: 'sunfields', id: 'forge_sunfields', name: 'Кузнец Мартен', position: [-59,27], shelter: [-63,24],
    line: 'Днём чиню сошники, ночью — всё, что приносят с переправы.',
    stock: ['witness_blade','road_mail','travel_stew','healing_draught'] },
  { area: 'fortress', id: 'forge_fortress', name: 'Кузнец Лада', position: [-30,22], shelter: [-27.5,17.5],
    line: 'Клёпки для затвора и для лат одинаковы. Кладите на наковальню.',
    stock: ['oath_plate','dawn_censer','healing_draught','revival_salt'] },
];

export function addSmithies(areas, layouts) {
  for (const entry of SMITHIES) {
    const area = areas.find(a => a.id === entry.area), layout = layouts[entry.area];
    const [x,z] = entry.position, [sx,sz] = entry.shelter, angle = Math.atan2(x-sx,z-sz);
    area.npcs.push({
      id: entry.id, name: entry.name, x, z, portrait: entry.id === 'forge_fortress' ? 5 : 6,
      smith: true, smithLine: entry.line, shop: entry.stock, radius: 3.55,
      animationSource: 'orin', visual: { accent: 'harness', color: 0xb9926b },
    });
    layout.positions[entry.id] = entry.position;
    layout.props.push(
      { slot:'merchant_stall', x:sx, z:sz, scale:1.03, yaw:angle },
      { slot:'brazier', x:x+1.7, z:z+.4, scale:.90, yaw:angle },
      { slot:'crate', x:sx-.7, z:sz-1.45, scale:.82 },
      { slot:'anvil', x:x+.1, z:z+1.55, yaw:angle },
    );
  }
}
