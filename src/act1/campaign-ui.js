import { STARTERS } from './campaign-starters.js?v=campaign-140';

import {itemStatLine} from './ui-feedback.js?v=campaign-170';

export const RELEASE = '1.8.0';
const portraits = new Set(STARTERS.map(hero => hero.id));

const LOADING_TIPS = {
  1: [
    'Проверяйте журнал: кнопка «Карта цели» открывает область выбранного задания.',
    'Инициатива определяет порядок ходов. Сверьтесь с очередью перед выбором цели.',
    'Лагерь восстанавливает силы отряда. Дойдите до него, если закончились зелья.',
  ],
  2: [
    'В бою выберите умение и цель, чтобы увидеть диапазон урона перед подтверждением.',
    'Боковые тропы ведут к необязательным дозорам. Победа даёт опыт каждому герою.',
  ],
  3: [
    'Следите за подготовкой тяжёлой атаки. Некоторые умения могут сорвать её до хода врага.',
    'Защита смягчает удар, а барьер поглощает часть урона. Их можно совмещать.',
  ],
  4: [
    'Осматривайте снаряжение после боёв. Кузнец или верстак помогут восстановить прочность.',
    'Подготовьте запас маны перед боем. Боевые умения показывают расход MP.',
  ],
  5: [
    'Раскол ослабляет броню. Наложите его раньше, чтобы следующие атаки нанесли больше урона.',
    'Руны меняют действие конкретных умений. Смотрите их описание в дереве навыков.',
  ],
  6: [
    'Если враг сменил фазу, заново проверьте его намерение и очередь ходов.',
    'Лечение помогает живым. Для павшего спутника нужна «Искра возвращения» или «Соль пробуждения».',
  ],
};

export function areaLoadingPresentation(area, comics, visit = 0) {
  const tips = LOADING_TIPS[area?.act] || LOADING_TIPS[1];
  const illustration = comics[area?.entryComic]?.illustration;
  return {
    title: area?.title || 'Пепельная клятва',
    tip: tips[visit % tips.length],
    illustration: illustration || 'assets/campaign/cover.webp',
    cover: !illustration,
  };
}

export function campaignPortrait(id) {
  const safe = portraits.has(id) || typeof id === 'string' && /^c[2-6]_npc_[ab]$/.test(id);
  return safe ? `assets/campaign/portraits/${id}.webp?v=campaign-v1` : null;
}

export function renderStarterSelection(body, { el, text, button, partyDefs, itemDefs, skills, portrait, selected, select, begin, cancel, hasSave }) {
  const cards = el('div', 'campaign-starter-grid');
  for (const entry of STARTERS) {
    const hero = partyDefs[entry.id], { hp, mp, atk, def, speed } = hero.stats;
    const armed = Object.values(hero.startingGear).map(id => itemDefs[id]?.name).filter(Boolean).join(' · ');
    const skillsLine = hero.skills.filter(id => (skills[id]?.level || 1) === 1).map(id => skills[id].name).join(' · ');
    const active = selected === hero.id;
    const pick = button('Выбрать · ' + hero.name, () => select(hero.id), { width: 235, primary: active, focusKey: 'starter:' + hero.id });
    pick.setAttribute('aria-pressed', String(active));
    const card = el('article', 'campaign-starter-card' + (active ? ' selected' : ''),
      portrait(hero.portrait, 'campaign-starter-portrait'), text(hero.name, 245, 25, '#f4d285', true),
      text(entry.focus, 245, 17, '#a8d6c7', true), text(entry.origin, 245, 14),
      text(`${hp} HP · ${mp} MP · ${atk} атака · ${def} защита · ${speed} инициатива`, 245, 13),
      text(armed, 245, 13, '#d6b980'), text(skillsLine, 245, 14), pick);
    cards.append(card);
  }
  body.append(cards);
  if (hasSave) body.append(text('Новая история заменит текущее прохождение. Копию можно сохранить через меню «Сохранения и восстановление».', 760, 14, '#d4b396'));
  body.append(el('div', 'campaign-actions',
    button('Назад', cancel, { width: 130, focusKey: 'starter:back' }),
    button('Начать · ' + partyDefs[selected].name, () => begin(selected), { width: 260, primary: true, focusKey: 'starter:start' })));
}

export function renderCompanionBar(body, { el, button, portrait, party, partyDefs, heroId, surface, select, switchView, unspent = {} }) {
  const tabs = el('div', 'companion-tabs');
  tabs.role = 'group';
  tabs.ariaLabel = 'Выбор героя';
  for (const hero of party) {
    const def = partyDefs[hero.id];
    const tab = button(def.name, () => select(hero.id), {
      small: true, width: 82, focusKey: `${surface}-hero:${hero.id}`,
      ariaLabel: `${def.name} · уровень ${hero.level}${hero.hp ? '' : ' · павший'}${unspent[hero.id] ? ' · свободные очки '+unspent[hero.id] : ''}`,
    });
    tab.classList.add('companion-tab');
    tab.prepend(portrait(def.portrait, 'companion-thumb'));
    if (unspent[hero.id]) {
      const marker = el('span', 'development-ready');
      marker.setAttribute('aria-hidden', 'true');
      tab.append(marker);
    }
    tab.setAttribute('aria-pressed', String(hero.id === heroId));
    tabs.append(tab);
  }
  const switcher = button(surface === 'inventory' ? 'Навыки ↗' : 'Сумка ↗', switchView,
    { small: true, width: 96, focusKey: 'switch-companion-view' });
  switcher.classList.add('companion-switch');
  body.append(el('div', 'companion-bar', tabs, switcher));
}

const TIERS = ['I', 'II', 'III', 'IV', 'V', 'VI'];
const BRANCH_TONES = ['ember', 'azure', 'verdant', 'violet'];
const BRANCH_ICONS = ['attack', 'defend', 'heal', 'arcane'];
const SCOPE_LABEL = {
  enemy: 'Один враг', allEnemies: 'Все враги', self: 'На себя', ally: 'Один спутник', allAllies: 'Весь отряд',
};

function abilityArt(el, icon, tone) {
  return el('span', `ability-art tone-${tone}`, el('span', `combat-icon combat-icon-${icon}`));
}

function renderAttributes(body, {el, text, button, info, heroId, train, refund, reset, canEdit}) {
  const rows = el('div', 'attribute-grid');
  for (const entry of info.entries) {
    const add = button('+', () => train(entry.id), {small: true, width: 42, disabled: !entry.available,
      ariaLabel: `Повысить: ${entry.name}${entry.reason ? ' · '+entry.reason : ''}`, focusKey: `train:${heroId}:${entry.id}`});
    const undo = entry.rank ? button('−', () => refund(entry.id), {small: true, width: 42, disabled: !canEdit,
      ariaLabel: `Вернуть одно очко: ${entry.name}`, focusKey: `refund-attribute:${heroId}:${entry.id}`}) : null;
    rows.append(el('div', 'attribute-row', abilityArt(el, entry.icon, 'azure'),
      el('div', 'attribute-copy', text(entry.name, 210, 16, '#efd599', true),
        text('За очко: '+itemStatLine(entry), 250, 14), text(`Ранг ${entry.rank} / ${entry.max}`, 160, 13, '#8ed2c1')), el('div', 'attribute-controls', add, undo)));
  }
  body.append(rows);
  const footer = el('div', 'talent-footer');
  if (info.nextPointLevel) footer.append(text(`Следующее очко на уровне ${info.nextPointLevel}`, 360, 13));
  if (info.spent) footer.append(button('Вернуть очки характеристик', reset, {small: true, width: 285,
    disabled: !canEdit, focusKey: `reset-attributes:${heroId}`}));
  if (footer.childElementCount) body.append(footer);
}

export function renderTalentTree(body, { el, text, button, info, skills, attributes, definitions, skillIcon,
  view, focus, selectView, selectNode, canEdit, learn, refundTalent, reset, resetChoice, train, refundAttribute, resetAttributes }) {
  const branch = info.branches.find(b => b.id === view) || info.branches[0];
  const showSkills = view === 'abilities', showAttributes = view === 'attributes';
  const tabs = el('div', 'talent-tabs');
  tabs.role = 'group';
  tabs.ariaLabel = 'Развитие героя';
  const extraTabs = [{id: 'abilities', name: 'Боевые умения'}, {id: 'attributes', name: 'Характеристики'}];
  for (const [index, entry] of [...info.branches, ...extraTabs].entries()) {
    const currentView = showSkills || showAttributes ? view : branch.id;
    const tab = button(entry.name, () => selectView(entry.id), {small: true, width: 214,
      combatIcon: BRANCH_ICONS[index % BRANCH_ICONS.length], focusKey: `talent-view:${info.heroId}:${entry.id}`});
    tab.dataset.tone = BRANCH_TONES[index % BRANCH_TONES.length];
    tab.setAttribute('aria-pressed', String(entry.id === currentView));
    tabs.append(tab);
  }
  const points = showAttributes ? attributes.points : info.points;
  const total = showAttributes ? attributes.total : info.totalPoints;
  body.append(el('header', 'workbench-heading', text(showAttributes ? 'Характеристики' : 'Дерево навыков', 330, 23, '#efd599', true),
    el('div', 'talent-points', text(`Очки ${points} / ${total}`, 142, 15, '#8ed2c1', true))), tabs);
  if (showAttributes) {
    renderAttributes(body, {el, text, button, info: attributes, heroId: info.heroId, train, refund: refundAttribute, reset: resetAttributes, canEdit});
    return;
  }

  if (showSkills) {
    const current = skills.find(skill => skill.id === focus) || skills[0];
    const cards = el('div', 'ability-grid');
    for (const skill of skills) {
      const status = skill.unlocked ? `${skill.cost} MP${skill.runeId ? ' · Руна' : ''}` : (skill.requiresTalent ? 'Специализация' : `Уровень ${skill.unlockLevel}`);
      const tile = button(skill.name, () => selectNode(skill.id), { small: true, width: 186,
        ariaLabel: `${skill.name} · ${status}`, focusKey: `ability:${info.heroId}:${skill.id}` });
      tile.classList.add('ability-tile');
      tile.dataset.state = skill.unlocked ? 'learned' : 'locked';
      tile.setAttribute('aria-pressed', String(current?.id === skill.id));
      tile.prepend(abilityArt(el, skillIcon(skill), 'violet'));
      tile.append(text(status, 120, 13, '#8ed2c1'));
      cards.append(tile);
    }
    body.append(cards);
    if (current) {
      const def = definitions[current.id];
      const linkedId = current.runeId || current.requiresTalent;
      const linked = info.branches.find(branch => branch.nodes.some(node => linkedId ? node.id === linkedId : node.skillId === current.id));
      const talent = linked?.nodes.find(node => linkedId ? node.id === linkedId : node.skillId === current.id);
      body.append(el('section', 'talent-inspector', text(current.name, 410, 19, '#efd599', true),
        text(current.unlocked ? `${current.cost} MP · ${SCOPE_LABEL[current.target] || 'Боевое умение'}` : current.reason,
          440, 14, '#8ed2c1'),
        text(def?.description || '', 655, 16),
        current.unlocked && ['damage', 'break'].includes(current.kind)
          ? text(`Мощность ×${def?.power ?? 1}. В бою виден прогноз по цели.`, 560, 14) : null,
        talent && button(talent.grantsSkill ? 'К специализации' : 'К руне', () => selectView(linked.id, talent.id),
          {small: true, width: 160, focusKey: `linked-talent:${info.heroId}:${current.id}`,
            ariaLabel: 'Открыть талант «'+talent.name+'»'})));
    }
    return;
  }

  const branchIndex = info.branches.indexOf(branch);
  const tone = BRANCH_TONES[branchIndex];
  const current = branch.nodes.find(node => node.id === focus) || branch.nodes.find(node => node.available) || branch.nodes[0];
  const fork = branch.id === 'specialization';
  const cards = el('ol', 'talent-route'+(fork?' specialization-route':''));
  if (fork) body.append(text('Из двух итоговых талантов можно изучить один.', 470, 14));
  cards.ariaLabel = branch.name;
  for (const [index, node] of branch.nodes.entries()) {
    const state = node.learned ? 'learned' : node.available ? 'available' : 'locked';
    const status = node.learned ? 'Изучено' : node.available ? 'Доступно' : `Уровень ${node.level} · Закрыто`;
    const tier = node.alternative ? 2 : index + 1;
    const tile = button(node.name, () => selectNode(node.id), { small: true, width: 168,
      ariaLabel: `${node.name} · ступень ${tier} · ${node.reason || status}`,
      focusKey: `talent-node:${info.heroId}:${node.id}` });
    const art = abilityArt(el, node.passive ? BRANCH_ICONS[branchIndex] : skillIcon(definitions[node.skillId] || {}), tone);
    tile.classList.add('ability-tile');
    tile.setAttribute('aria-pressed', String(current.id === node.id));
    tile.prepend(art);
    tile.append(text(status, 150, 12, '#8ed2c1'));
    const frame = el('li', 'talent-step', el('div', 'talent-tier', text(TIERS[tier - 1] || tier, 40, 14, '#efd599', true)), tile);
    frame.dataset.state = state;
    if (canEdit && node.available) {
      const add = button('+', () => learn(node.id), { small: true, width: 40,
        focusKey: `talent:${info.heroId}:${node.id}`, ariaLabel: `Изучить ${node.name} · ${node.cost} очко` });
      add.classList.add('talent-add');
      frame.append(add);
    }
    cards.append(frame);
  }
  const type = current.passive ? 'Пассивный талант' : current.grantsSkill ?
    `Боевое умение · ${definitions[current.skillId].mp} MP` : `Руна · ${definitions[current.skillId]?.name || 'Боевое умение'}`;
  body.append(cards, el('section', 'talent-inspector',
    text(current.name, 470, 19, '#efd599', true), text(type, 470, 14, '#8ed2c1'),
    text(current.description, 655, 16),
    current.stats && text(itemStatLine({stats:current.stats}), 655, 14, '#8ed2c1'),
    text(current.reason || `Уровень ${current.level} · Цена ${current.cost} очко`, 655, 14, '#8ed2c1'),
    current.learned && !current.alternative && button('Вернуть одно очко', () => refundTalent(current.id),
      {small: true, width: 234, disabled: !canEdit || !current.refundable,
        hint: !current.refundable ? 'Сначала верните очки зависимых талантов' : null,
        focusKey: `refund-talent:${info.heroId}:${current.id}`, ariaLabel: 'Вернуть очко таланта «'+current.name+'»'})));
  const footer = el('div', 'talent-footer');
  if (info.nextPointLevel) footer.append(text(`Следующее очко на уровне ${info.nextPointLevel}`, 360, 13));
  if (fork && branch.nodes.some(node => node.alternative && node.learned)) {
    footer.append(button('Сменить специализацию', resetChoice, {small: true, width: 234,
      disabled: !canEdit, focusKey: `reset-specialization:${info.heroId}`}));
  }
  if (info.spent) footer.append(button('Вернуть очки талантов', reset, { small: true, width: 234,
    disabled: !canEdit, focusKey: `reset:${info.heroId}` }));
  if (footer.childElementCount) body.append(footer);
}

export function renderCampaignComic(body, { comic, page, el, text, button, finish, previous, next }) {
  const pages = comic.panels;
  const panel = pages[page];
  const image = new Image();
  image.src = `${panel.illustration || comic.illustration}?v=campaign-v1`;
  image.alt = comic.title;
  image.className = 'campaign-comic-art';
  image.decoding = 'async';
  const copy = el('div', 'campaign-comic-copy', text(comic.title, 730, 25, '#efcf8c', true));
  if (panel.speaker) copy.append(text(panel.speaker, 730, 17, '#acd3c1', true));
  copy.append(text(panel.text, 730, 19), text(`${page + 1} / ${pages.length}`, 730, 12, '#bdac8c'));
  const actions = el('div', 'campaign-actions');
  if (page) actions.append(button('Назад', previous, { small: true, width: 140, focusKey: 'comic:previous' }));
  actions.append(button(page + 1 < pages.length ? 'Далее' : 'Продолжить', page + 1 < pages.length ? next : finish,
    { primary: true, width: 230, focusKey: 'comic:next' }));
  if (page + 1 < pages.length) actions.append(button('Пропустить', finish, { small: true, width: 175, focusKey: 'comic:skip' }));
  body.append(el('div', 'campaign-comic', image, copy), actions);
}
