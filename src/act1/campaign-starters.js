export const STARTERS = Object.freeze([
  { id: 'alar', focus: 'Свет и защита', origin: 'Служил при монастыре и провожал людей к колоколу. Когда помощь стала повинностью, вернулся найти записи тех, кому обещал защиту.' },
  { id: 'myrt', focus: 'Инициатива и уязвимости', origin: 'Водил караваны между заставами. После исчезновения сестры нашёл её имя у сборщиков. След её записи ведёт в монастырь.' },
  { id: 'elian', focus: 'Стихии и барьеры', origin: 'Рассчитывал печати для лечения. Когда ими стали удерживать чужие воспоминания, принёс в монастырь чертёж, по которому можно остановить звон.' },
]);

const skill = (id, name, level, mp, target, kind, power, description, element = 'physical', heroEffects = {}) =>
  ({ id, name, level, mp, target, kind, power, description, element, heroEffects });

export function addStartingHeroes(party, skills, items) {
  const [alar, myrt, elian] = STARTERS;
  Object.assign(party.find(hero => hero.id === 'alar'), { bio: alar.origin, portrait: alar.id });
  party.push(
    { id: myrt.id, name: 'Мирт', role: 'Следопыт соляных трактов', portrait: myrt.id, bio: myrt.origin,
      stats: { hp: 143, mp: 35, atk: 26, def: 14, speed: 21 },
      skills: ['trail_mark','brush_guard','briar_shot','trail_breath','crossfire','fox_step'],
      startingGear: { weapon: 'tracker_bow', armor: 'tracker_leather' } },
    { id: elian.id, name: 'Элиан', role: 'Чародей резонанса', portrait: elian.id, bio: elian.origin,
      stats: { hp: 139, mp: 58, atk: 24, def: 13, speed: 16 },
      skills: ['salt_bolt','frost_mirror','ward_circuit','pale_mend','echo_burst','counterseal'],
      startingGear: { weapon: 'resonance_staff', armor: 'scribe_coat' } },
  );
  Object.assign(skills, Object.fromEntries([
    skill('trail_mark','Метка охотника',1,4,'enemy','damage',1.42,'Стрела с расколом брони. Следующие удары отряда получают преимущество.','physical',{ fracture:true }),
    skill('brush_guard','Защита из зарослей',1,4,'self','guard',.54,'Следопыт укрывается и отвечает на физическую атаку.','physical',{ counter:true }),
    skill('briar_shot','Терновый наконечник',3,6,'enemy','damage',1.19,'Рваная рана наносит урон в начале двух ходов цели.','physical',{ bleed:true, burn:{ base:6, scale:.14, turns:2 } }),
    skill('trail_breath','Тихий привал',4,0,'self','guard',.42,'Мирт переводит дыхание. Восстанавливает 13 единиц маны и смягчает ответный удар.','physical',{ restoreSelfMana:13 }),
    skill('crossfire','Перекрёстный залп',6,10,'allEnemies','damage',.90,'Три стрелы расходятся веером. Поражает каждого противника.'),
    skill('fox_step','Лисий шаг',8,8,'enemy','break',1.36,'Удар сбивает подготовку тяжёлой атаки.'),
    skill('salt_bolt','Соляной разряд',1,4,'enemy','damage',1.55,'Молния через соляной проводник. Сильнее против уязвимых к разряду целей.','lightning'),
    skill('frost_mirror','Зеркало инея',1,5,'enemy','damage',1.38,'Осколок льда повреждает цель и ослабляет её ответную атаку.','ice',{ chill:{ percent:24 } }),
    skill('ward_circuit','Охранительный контур',3,8,'allAllies','guard',.39,'Снижает входящий урон всему живому отряду до следующего действия.','light'),
    skill('pale_mend','Бледная нить',4,8,'ally','heal',.46,'Адресное лечение. Дополнительное восстановление для тяжелораненого.','light',{ triage:{ threshold:.35, bonus:12 } }),
    skill('echo_burst','Расходящееся эхо',6,11,'allEnemies','damage',.89,'Кольцо жара достигает всех противников.','fire'),
    skill('counterseal','Ответная печать',8,8,'enemy','damage',1.41,'Нарушает следующий магический приём врага. Враг может ответить обычной атакой.','light',{ disrupt:true }),
  ].map(definition => [definition.id, definition])));
  Object.assign(items, {
    tracker_bow: { id:'tracker_bow', name:'Лук соляной тропы', kind:'weapon', slot:'weapon', price:49, stats:{ atk:6, initiative:2 }, icon:3 },
    tracker_leather: { id:'tracker_leather', name:'Кожанка проводника', kind:'armor', slot:'armor', price:39, stats:{ def:3, hp:9 } },
    resonance_staff: { id:'resonance_staff', name:'Посох мерного звона', kind:'weapon', slot:'weapon', price:52, stats:{ atk:7, mp:4 }, icon:2 },
    scribe_coat: { id:'scribe_coat', name:'Кафтан резонатора', kind:'armor', slot:'armor', price:44, stats:{ def:4, hp:9, mp:5 } },
  });
}
