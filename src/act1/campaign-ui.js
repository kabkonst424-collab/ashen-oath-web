import { STARTERS } from './campaign-starters.js?v=campaign-v1';

export const RELEASE = '1.1.0';
const portraits = new Set(STARTERS.map(hero => hero.id));

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

export function renderTalentBranches(body, { el, text, button, info, canEdit, learn, reset }) {
  if (!info) return;
  const branches = el('div', 'campaign-talents-grid');
  for (const branch of info.branches) {
    const panel = el('section', 'campaign-talent-branch', text(branch.name, 350, 18, '#e6c980', true));
    for (const node of branch.nodes) {
      const status = node.learned ? 'Изучено' : node.available ? `${node.cost} очк. · уровень ${node.level}` : node.reason || 'Уровень ' + node.level;
      const learnButton = button(node.learned ? 'Изучено' : 'Изучить', () => learn(node.id), {
        small: true, width: 135, disabled: !canEdit || !node.available || node.learned,
        focusKey: `talent:${info.heroId}:${node.id}`, ariaLabel: (node.learned ? 'Изучено: ' : 'Изучить ') + node.name,
      });
      panel.append(el('article', 'campaign-talent' + (node.learned ? ' learned' : ''),
        text(node.name, 320, 16, '#efd599', true), text(node.description, 320, 13),
        text(status, 320, 12, node.learned ? '#a9dac3' : '#cebc92'), learnButton));
    }
    branches.append(panel);
  }
  body.append(text(`Доступно ${info.points} из ${info.totalPoints} очк.`, 710, 15, '#b8dcc8'), branches);
  body.append(button('Вернуть очки талантов', reset, { small: true, width: 260, disabled: !canEdit || !info.spent,
    focusKey: `reset:${info.heroId}` }));
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
