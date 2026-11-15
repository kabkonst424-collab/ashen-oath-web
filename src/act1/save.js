import {VERSION,SCHEMA,validate,snapshot,upgradeCombatState,upgradeLootState,upgradeMapState,upgradeCampaignState} from './model.js?v=companion-120';
import {CONTENT_VERSION} from './content.js?v=campaign-v1';
import {parseSaveJSON} from '../strict-json.js?v=0.16.0-demo';

// Act I deliberately has its own database. The 0.2.0 save is never opened here.
export const DB_NAME='author-forge-ashen-oath-act1';
const MAX_BYTES=2*1024*1024;
export class SaveConflictError extends Error{constructor(message){super(message);this.name='SaveConflictError';this.code='SAVE_CONFLICT';}}
export function canonical(value){if(value===null||typeof value!=='object')return JSON.stringify(value);if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';return '{'+Object.keys(value).sort().map(key=>JSON.stringify(key)+':'+canonical(value[key])).join(',')+'}';}
async function checksum(value){const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(canonical(value)));return [...new Uint8Array(hash)].map(value=>value.toString(16).padStart(2,'0')).join('');}
function migratePayload(payload){
 validate(payload);upgradeMapState(payload);upgradeCombatState(payload);upgradeLootState(payload);upgradeCampaignState(payload);validate(payload);
 return payload;
}
export async function envelope(state,revision=0){if(!Number.isSafeInteger(revision)||revision<0)throw Error('Неверная ревизия сохранения');const payload=migratePayload(snapshot(state));const data={schemaVersion:SCHEMA,contentVersion:CONTENT_VERSION||1,buildVersion:VERSION,revision,savedAt:new Date().toISOString(),payload};return {...data,checksum:await checksum(data)};}
export async function verify(file){
 if(!file||Array.isArray(file)||Object.keys(file).sort().join(',')!=='buildVersion,checksum,contentVersion,payload,revision,savedAt,schemaVersion'||file.schemaVersion!==SCHEMA||file.contentVersion!==(CONTENT_VERSION||1)||typeof file.checksum!=='string'||!/^[a-f0-9]{64}$/.test(file.checksum)||!Number.isSafeInteger(file.revision)||file.revision<0||typeof file.buildVersion!=='string'||file.buildVersion.length>80||typeof file.savedAt!=='string'||file.savedAt.length>40||!Number.isFinite(Date.parse(file.savedAt)))throw Error('Неподдерживаемая версия или метаданные сохранения первого акта');
 const {checksum:stored,...data}=file;if(await checksum(data)!==stored)throw Error('Контрольная сумма не совпала. Файл повреждён.');validate(data.payload);return migratePayload(snapshot(data.payload));
}

function observeTransaction(tx,resolve,reject,value=()=>undefined,error=()=>tx.error){
 let settled=false,timeoutError;
 const finish=(callback,result)=>{if(settled)return;settled=true;clearTimeout(timer);callback(result);};
 const timer=setTimeout(()=>{timeoutError=Object.assign(Error('Хранилище не завершило операцию за 30 секунд. Экспортируйте прогресс и повторите сохранение.'),{code:'SAVE_TRANSACTION_TIMEOUT'});try{tx.abort();}catch{}finish(reject,timeoutError);},30000);
 tx.oncomplete=()=>{let result;try{result=value();}catch(reason){finish(reject,reason);return;}finish(resolve,result);};
 tx.onabort=()=>finish(reject,timeoutError||error()||Error('Операция хранилища прервана'));tx.onerror=()=>{};
}
export class Saves{
 constructor(onStatus=()=>{},dbName=DB_NAME){this.revision=0;this.db=null;this.onStatus=onStatus;this.readOnly=false;this.dbName=dbName;this.queue=Promise.resolve();this.recoverySignature=null;this.corrupt=false;this.connectionEpoch=0;}
 async open(){if(this.db)return this;if(this.opening)return this.opening;const pending=this.openConnection(this.connectionEpoch).finally(()=>{if(this.opening===pending)this.opening=null;});this.opening=pending;return pending;}
 async openConnection(epoch){const database=await new Promise((resolve,reject)=>{let settled=false;const timer=setTimeout(()=>fail(Object.assign(Error('Хранилище не ответило за 30 секунд. Повторите открытие.'),{code:'SAVE_OPEN_TIMEOUT'})),30000),fail=error=>{if(settled)return;settled=true;clearTimeout(timer);reject(error);};let request;try{request=indexedDB.open(this.dbName,1);}catch(error){fail(error);return;}request.onupgradeneeded=()=>{if(settled){request.transaction?.abort();return;}if(!request.result.objectStoreNames.contains('slots'))request.result.createObjectStore('slots');};request.onsuccess=()=>{if(settled){request.result.close();return;}settled=true;clearTimeout(timer);resolve(request.result);};request.onerror=()=>fail(request.error||Error('Хранилище недоступно'));request.onblocked=()=>fail(Error('Закройте другую вкладку игры, чтобы открыть хранилище'));});if(epoch!==this.connectionEpoch){database.close();throw new DOMException('Storage open cancelled','AbortError');}this.db=database;const opened=this.db;this.readOnly=false;opened.onclose=()=>{if(this.db!==opened)return;this.db=null;this.readOnly=true;this.onStatus('error','Подключение к сохранениям потеряно. Экспортируйте прогресс и повторите открытие хранилища.');};opened.onversionchange=()=>{if(this.db!==opened)return;this.readOnly=true;this.db=null;opened.close();this.onStatus('error','Хранилище обновлено другой вкладкой. Экспортируйте прогресс и перезагрузите игру.');};return this;}
 ensureOpen(){if(!this.db)throw Error('Сначала откройте хранилище');}
 read(key){this.ensureOpen();return new Promise((resolve,reject)=>{const tx=this.db.transaction('slots','readonly'),request=tx.objectStore('slots').get(key);let value;request.onsuccess=()=>{value=request.result;};observeTransaction(tx,resolve,reject,()=>value,()=>tx.error||Error('Не удалось прочитать сохранение'));});}
 async load(){
  this.ensureOpen();const records=await new Promise((resolve,reject)=>{const tx=this.db.transaction('slots','readonly'),store=tx.objectStore('slots'),out={};for(const key of ['current','backup1','backup2']){const request=store.get(key);request.onsuccess=()=>{out[key]=request.result;};}observeTransaction(tx,resolve,reject,()=>out,()=>tx.error||Error('Не удалось прочитать сохранение'));});
  const current=records.current;
  if(current===undefined&&!records.backup1&&!records.backup2){this.revision=0;this.recoverySignature=null;this.corrupt=false;return null;}
  let original;try{const payload=await verify(current);this.revision=current.revision;this.recoverySignature=null;this.corrupt=false;return payload;}catch(error){original=error;}
  for(const key of ['backup1','backup2']){const backup=records[key];if(!backup)continue;try{const payload=await verify(backup);this.revision=Number.isSafeInteger(current?.revision)&&current.revision>=0?current.revision:backup.revision;this.recoverySignature=canonical(current??null);this.corrupt=false;this.onStatus('backup','Повреждённая запись восстановлена из резервной копии.');return payload;}catch{}}
  this.corrupt=true;original.code='SAVE_CORRUPT';throw original;
 }
 async write(state){const payload=snapshot(state);validate(payload);const run=()=>this.writeNow(payload);const operation=this.queue.then(run,run);this.queue=operation.catch(()=>{});return operation;}
 async writeNow(state){this.ensureOpen();if(this.corrupt)throw Object.assign(Error('Сначала восстановите повреждённое хранилище'),{code:'SAVE_CORRUPT'});if(this.readOnly)throw Error('Эта вкладка не может записывать прогресс');this.onStatus('saving','Сохраняется…');try{const expected=this.revision,recovery=this.recoverySignature,data=await envelope(state,expected+1);await new Promise((resolve,reject)=>{let tx;try{tx=this.db.transaction('slots','readwrite',{durability:'strict'});}catch{tx=this.db.transaction('slots','readwrite');}const store=tx.objectStore('slots'),request=store.get('current');let reason;request.onsuccess=()=>{const old=request.result,match=recovery?canonical(old??null)===recovery:(old?.revision||0)===expected;if(!match){reason=new SaveConflictError('Прогресс изменён в другой вкладке. Загрузите свежую запись или экспортируйте текущий отряд.');tx.abort();return;}const previous=store.get('backup1');previous.onsuccess=()=>{if(!recovery){if(previous.result)store.put(previous.result,'backup2');if(old)store.put(old,'backup1');}store.put(data,'current');};};observeTransaction(tx,resolve,reject,()=>undefined,()=>reason||tx.error||Error('Запись прервана'));});this.revision=data.revision;this.recoverySignature=null;this.onStatus('saved','Сохранено');return data;}catch(error){this.onStatus('error',error.message);throw error;}}
 async rawSlots(){
  this.ensureOpen();return new Promise((resolve,reject)=>{const tx=this.db.transaction('slots','readonly'),store=tx.objectStore('slots'),records={};for(const key of ['current','backup1','backup2']){const request=store.get(key);request.onsuccess=()=>{records[key]=request.result;};}observeTransaction(tx,resolve,reject,()=>records,()=>tx.error||Error('Не удалось прочитать записи для восстановления'));});
 }
 async recover(state){const payload=snapshot(state);validate(payload);const operation=this.queue.then(()=>this.recoverNow(payload),()=>this.recoverNow(payload));this.queue=operation.catch(()=>{});return operation;}
 async recoverNow(state){
  this.ensureOpen();if(this.readOnly)throw Error('Эта вкладка не может записывать прогресс');
  const records=await this.rawSlots(),keys=['current','backup1','backup2'];
  if(keys.every(key=>records[key]===undefined)){this.corrupt=false;return this.writeNow(state);}
  for(const key of keys){if(!records[key])continue;let valid=false;try{await verify(records[key]);valid=true;}catch{}if(valid)throw new SaveConflictError('Найдено исправное сохранение. Загрузите свежую запись перед заменой.');}
  const fingerprints=Object.fromEntries(keys.map(key=>[key,canonical(records[key]??null)])),data=await envelope(state,this.revision+1),savedAt=new Date().toISOString();
  this.onStatus('saving','Восстанавливается…');
  try{await new Promise((resolve,reject)=>{const tx=this.db.transaction('slots','readwrite'),store=tx.objectStore('slots'),actual={};let remaining=keys.length,reason;
   for(const key of keys){const request=store.get(key);request.onsuccess=()=>{actual[key]=request.result;if(--remaining)return;if(keys.some(name=>canonical(actual[name]??null)!==fingerprints[name])){reason=new SaveConflictError('Записи изменились в другой вкладке. Повторно откройте сохранение.');tx.abort();return;}store.put({kind:'pre-recovery',savedAt,records},'quarantine:'+savedAt+':'+data.checksum.slice(0,12));store.put(data,'current');};}
   observeTransaction(tx,resolve,reject,()=>undefined,()=>reason||tx.error||Error('Восстановление прервано'));
  });this.revision=data.revision;this.recoverySignature=null;this.corrupt=false;this.onStatus('saved','Сохранение восстановлено; прежние записи сохранены отдельно');return data;
  }catch(error){this.onStatus('error',error.message);throw error;}
 }
 async exportRaw(){const data={kind:'ashen-act1-raw-recovery',exportedAt:new Date().toISOString(),records:await this.rawSlots()},blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),anchor=document.createElement('a');anchor.href=url;anchor.download='ashen-oath-raw-recovery-'+new Date().toISOString().slice(0,10)+'.json';try{anchor.click();}finally{setTimeout(()=>URL.revokeObjectURL(url),1000);}return data;}
 async export(state){const data=await envelope(state,this.revision),blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),anchor=document.createElement('a');anchor.href=url;anchor.download='ashen-oath-act1-'+new Date().toISOString().slice(0,10)+'.rpgsave.json';try{anchor.click();}finally{setTimeout(()=>URL.revokeObjectURL(url),1000);}return data;}
 async import(file){if(!file||typeof file.text!=='function'||!Number.isFinite(file.size)||file.size<1||file.size>MAX_BYTES)throw Error('Нужен файл сохранения размером до 2 МиБ');const source=await file.text();if(new TextEncoder().encode(source).length>MAX_BYTES)throw Error('Размер файла превышает 2 МиБ');const record=parseSaveJSON(source);return clonePayload(await verify(record));}
 close(){this.connectionEpoch++;this.opening=null;const database=this.db;this.db=null;this.readOnly=true;database?.close();}
}
const clonePayload=value=>structuredClone(value);
