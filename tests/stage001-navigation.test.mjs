import assert from 'node:assert/strict';
import test from 'node:test';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';

const source=process.env.ASHEN_NAV_BASELINE_ROOT
  ? pathToFileURL(resolve(process.env.ASHEN_NAV_BASELINE_ROOT,'src/act1/navigation.js')).href
  : new URL('../src/act1/navigation.js',import.meta.url).href;
const {createNavigationService}=await import(source);

function fixture(){
 const state={runId:'qa-nav',areaId:'qa',mode:'explore',position:{x:-5.4,z:0},flags:{},claimed:[],defeated:[]};
 const target={id:'goal',kind:'inspect',areaId:'qa',label:'Цель',x:5,z:0,ready:true};
 const quest=()=>({id:'quest',known:true,available:true,complete:false,title:'Путь',target:{...target}});
 const model={currentObjective:quest,questProgress:quest,questList:()=>[quest()],nearby:()=>[]};
 const areas=[{id:'qa',title:'Область',bounds:{x:0,z:0,rx:8,rz:8},nodes:[target]}];
 const walkable=(_id,x,z)=>Math.abs(x)<=8&&Math.abs(z)<=8&&(state.flags.bridgeOpen||Math.abs(x)>=1);
 return {state,target,service:createNavigationService({areas,quests:[],walkable,model})};
}

test('A009: unchanged unreachable target performs one search in 100 updates',()=>{
 const {state,service}=fixture(),before=JSON.stringify(state);
 for(let i=0;i<100;i++)assert.equal(service.update(state).route.status,'unreachable');
 assert.equal(service.metrics.routeComputations,1);
 assert.equal(service.metrics.routeCacheHits,99);
 assert.equal(JSON.stringify(state),before);
});

test('A009: movement inside the same grid cell invalidates a failed route',()=>{
 const {state,service}=fixture();service.update(state);
 state.position.x=-5.1;service.update(state);
 assert.equal(service.metrics.routeComputations,2);
});

test('A009: changed quest target and run invalidate a failed route',()=>{
 const {state,target,service}=fixture();service.update(state);
 target.z=2;service.update(state);
 target.id='other';service.update(state);
 state.runId='new-run';service.update(state);
 assert.equal(service.metrics.routeComputations,4);
});

test('A009: opening the bridge recomputes a previously unreachable route',()=>{
 const {state,service}=fixture();assert.equal(service.update(state).route.status,'unreachable');
 state.flags.bridgeOpen=true;
 const route=service.update(state).route;
 assert.equal(route.status,'ready');
 assert.deepEqual({x:route.points[0].x,z:route.points[0].z},state.position);
 assert.deepEqual(route.points.at(-1),{x:5,z:0});
 assert.equal(service.metrics.routeComputations,2);
 service.update(state);assert.equal(service.metrics.routeCacheHits,1);
});

test('A009: reward and encounter conditions invalidate a failed route',()=>{
 const {state,service}=fixture();service.update(state);
 state.claimed.push('node:chest');service.update(state);
 state.defeated.push('encounter');service.update(state);
 assert.equal(service.metrics.routeComputations,3);
});
