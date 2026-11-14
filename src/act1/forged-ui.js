const SLOT_NAMES = { weapon:'оружие', armor:'доспех', charm:'талисман' };
const RARITY = { common:'Обычный', uncommon:'Необычный', rare:'Редкий' };

export function itemRarity(def) {
  return RARITY[def?.rarity] || '';
}

export function durabilityLabel(condition) {
  if (!condition) return '';
  const state = condition.broken ? 'Сломано' : condition.worn ? 'Изношено' : 'Прочность';
  return state + ' ' + condition.current + ' / ' + condition.max;
}

export function durabilityMeter(condition, el, text, { tiny = false } = {}) {
  if (!condition) return null;
  const label = durabilityLabel(condition);
  const damaged = condition.broken ? 'broken' : condition.worn ? 'worn' : 'sound';
  const fill = el('i','condition-fill');
  fill.style.width = Math.max(0, Math.min(100,condition.ratio*100)) + '%';
  const bar = el('span','condition-track '+damaged,fill);
  bar.setAttribute('aria-hidden','true');
  const meter = el('div','item-condition'+(tiny?' compact':''),bar);
  if (tiny) meter.setAttribute('aria-hidden','true');
  else meter.append(text(label,220,13,condition.broken?'#f09f88':condition.worn?'#efce8d':'#adcdb9'));
  return meter;
}

export function renderSmithy(body, { model, state, smith, items, party, el, text, button, icon, repair, trade }) {
  const quote = model.repairOptions(state,smith?.id);
  if (!smith || !quote.ok) {
    body.append(text(quote.reason||'Подойдите к кузнецу.',740,17));
    return;
  }
  const toolbar = el('div','smithy-toolbar',el('div','grow',
    text(smith.name+' · '+state.gold+' золота',630,22,'#efcb87',true),
    text(smith.smithLine,630,16)));
  if (smith.shop?.length) toolbar.append(button('Купить или продать',trade,{small:true,width:240,focusKey:'smith:trade'}));
  body.append(toolbar);
  if (!quote.entries.length) {
    body.append(text('Всё снаряжение исправно.',760,17,'#bce3cd'));
    return;
  }

  const total = button('Починить всё · '+quote.total+' золота',()=>repair({revision:quote.revision}),
    {width:340,primary:true,disabled:!quote.affordable,focusKey:'smith:repair-all'});
  body.append(el('div','smithy-total',total,
    text(quote.affordable?'Сумма включает вещи в сумке и на спутниках.':'На полный ремонт не хватает золота. Можно починить одну вещь.',550,15)));
  const list = el('div','smithy-list');
  for (const entry of quote.entries) {
    const { location, durability, price } = entry;
    const item = location.kind === 'bag' ? state.bag[location.index] : state.gear[location.heroId]?.[location.slot];
    const owner = location.kind === 'bag' ? 'Сумка' : party[location.heroId]?.name+' · '+SLOT_NAMES[location.slot];
    const info = el('div','grow',text(entry.name,460,17,'#eed29a',true),text(owner,300,13),
      durabilityMeter(durability,el,text));
    const fix = button('Чинить · '+price,()=>repair({uid:entry.uid,revision:quote.revision}),
      {small:true,width:155,disabled:price>state.gold,focusKey:'smith:repair:'+entry.uid,ariaLabel:'Починить '+entry.name+' за '+price+' золота'});
    list.append(el('div','shop-entry smithy-item',icon(items[item?.defId]),info,fix));
  }
  body.append(list);
}

export function renderChestLoot(body, { grant, label, defs, el, text, button, icon, goToInventory }) {
  if (!grant) return;
  body.append(text(label,730,22,'#efcb87',true));
  const list = el('div','smithy-list');
  for (const found of grant.items||[]) {
    const def = defs[found.id ?? found.defId];
    if (!def) continue;
    const role = SLOT_NAMES[def.kind] ? 'Снаряжение · '+SLOT_NAMES[def.kind] : def.kind==='material'?'Можно продать':'Припасы';
    const delivery = found.pending ? '\nВ сумке: '+(found.delivered||0)+' · Отложено: '+found.pending : '';
    list.append(el('div','shop-entry',icon(def),el('div','grow',text(def.name+' ×'+found.qty,520,17,'#eed29a',true),
      text([itemRarity(def),role].filter(Boolean).join(' · ')+delivery,500,14))));
  }
  if (grant.gold) body.append(text('Золото +'+grant.gold,500,15));
  body.append(list,button('Открыть сумку',goToInventory,{small:true,width:240,focusKey:'loot:inventory'}));
}
