// Pure presentation selectors: never mutate model state or invent inventory objects.
export function windowBagView(bag,defs,category='all',query='') {
  const term=String(query).trim().toLocaleLowerCase('ru-RU');
  return bag.map((item,index)=>({item,index})).filter(({item})=>{
    if(!item)return category==='all'&&!term;
    const def=defs[item.defId]||{},kind=def.kind;
    const match=category==='all'||category==='equipment'&&['weapon','armor','charm'].includes(kind)||category==='supplies'&&kind==='consumable'||category==='trophy'&&kind==='material'||category==='quest'&&['quest','key'].includes(kind);
    return match&&(!term||String(def.name||'').toLocaleLowerCase('ru-RU').includes(term));
  });
}
export function windowValidSelection(state,selected){
  if(!selected||selected.revision!==state.revision)return false;
  const from=selected.from,item=from?.kind==='bag'?state.bag[from.index]:state.gear[from?.heroId]?.[from?.slot];
  return !!item&&item.uid===selected.uid;
}
export function windowQuantity(value,max){return max<1?0:Math.min(Math.max(1,Math.trunc(Number(value)||1)),Math.trunc(max));}
export function windowOwnership(state,defId){
  return {bag:state.bag.reduce((sum,item)=>sum+(item?.defId===defId?item.qty:0),0),wearers:Object.entries(state.gear).flatMap(([heroId,slots])=>Object.entries(slots).filter(([,item])=>item?.defId===defId).map(([slot])=>({heroId,slot})))};
}

export function windowQuestView(quests,filter='active',trackedId=null){return quests.filter(q=>q.known&&(filter==='all'||filter==='completed'?filter==='all'||q.complete:!q.complete)).sort((a,b)=>Number(b.id===trackedId&&!b.complete)-Number(a.id===trackedId&&!a.complete));}
