// Authored level data. Progress is derived from the existing schema-1 state.
export const LEVEL={
  id:'ashen-oath-01',
  title:'Путь трёх печатей',
  interactionRadius:3.4,
  spawn:{x:0,z:14},
  zones:[
    {id:'arrival',name:'Южные ворота',minZ:10,maxZ:18,color:'#718e80'},
    {id:'dawn',name:'Двор рассвета',minZ:-1,maxZ:10,color:'#c8ac68'},
    {id:'ember',name:'Галерея углей',minZ:-19,maxZ:-1,color:'#bc7959'},
    {id:'sun',name:'Преддверие солнца',minZ:-36.3,maxZ:-19,color:'#7b9d9c'},
    {id:'gate',name:'Врата судьи',minZ:-39,maxZ:-36.3,color:'#b9a077'},
    {id:'sanctum',name:'Святилище последнего рассвета',minZ:-57,maxZ:-39,color:'#c1a06b'}
  ],
  shrines:[
    {id:'dawn',x:-10,z:3,name:'Печать рассвета',guards:['e0','e1','e3'],lesson:'Ближний бой: ударьте клинком и блокируйте ответные удары.'},
    {id:'ember',x:9,z:-13,name:'Печать углей',guards:['e5','e6'],lesson:'Дальний бой: уходите с линии снаряда и сближайтесь рывком.'},
    {id:'sun',x:-7,z:-29,name:'Печать солнца',guards:['e8','e9','e10'],lesson:'Тяжёлый страж: переждите замах, затем ответьте ударом или волной.'}
  ],
  chest:{id:'chest',name:'Сундук солнечного ордена',x:12,z:-7},
  boss:{id:'e12',name:'Верховный судья солнца',x:0,z:-48},
  exit:{id:'exit',name:'Выход из монастыря',x:0,z:-54},
  // Only idle enemies wait for these approach lines. Existing chasing enemies
  // keep their normal behaviour; no extra collision or navigation is introduced.
  encounters:[
    {id:'dawn-watch',enemyIds:['e0','e1','e3'],maxHeroZ:10},
    {id:'crossing',enemyIds:['e2','e4'],maxHeroZ:-1},
    {id:'ember-watch',enemyIds:['e5','e6'],maxHeroZ:-5},
    {id:'sun-approach',enemyIds:['e7','e8','e9'],maxHeroZ:-18},
    {id:'sun-watch',enemyIds:['e10','e11'],maxHeroZ:-24}
  ]
};
