// Native controls keep their own Space/arrow behavior; only world navigation
// consumes arrows while exploration actually owns input.
export function ownsMovementKey(event,{running,paused,modal,mode,locked}){
 const native=event.target?.closest?.('button,a,input,textarea,select,summary,[role="button"],[contenteditable="true"]');
 return !!running&&!paused&&!modal&&!locked&&mode==='explore'&&!native&&['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.code);
}
export function ignoreGameShortcut(event){
 return !!(event.defaultPrevented||event.isComposing||event.ctrlKey||event.metaKey||event.altKey||event.target?.isContentEditable||event.target?.closest?.('input,textarea,select,[contenteditable]'));
}
export function canStartInventoryDrag(event,touchDrag=false){return event.button===0&&event.isPrimary!==false&&(event.pointerType!=='touch'||touchDrag);}
export function worldTapStart(event){return event.button===0&&event.isPrimary!==false?{pointer:event.pointerId,x:event.clientX,y:event.clientY,time:event.timeStamp}:null;}
export function worldTapComplete(tap,event){return !!tap&&event.isPrimary!==false&&event.pointerId===tap.pointer&&Math.hypot(event.clientX-tap.x,event.clientY-tap.y)<=12&&(!Number.isFinite(event.timeStamp-tap.time)||event.timeStamp-tap.time<=700);}
export function canBattleShortcut(event,{running,paused,modal,mode,locked}){return !!running&&!paused&&!modal&&!locked&&mode==='battle'&&!event.repeat&&!ignoreGameShortcut(event)&&!(['Enter','Space'].includes(event.code)&&event.target?.closest?.('button,a,summary,[role="button"]'));}
