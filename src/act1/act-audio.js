import {CampaignAudio,resolveCampaignAudio} from './campaign-audio.js?v=campaign-v1';

const EPSILON = .0001;
const LOOK_AHEAD = .42;
const EFFECT_LIMIT = 46;
const REGIONS = {
  monastery:'ruins', village:'hearth', briarwood:'woodland', quarry:'ruins',
  fen:'marsh', archive:'ruins', sunfields:'woodland', fortress:'ruins', abbey:'ruins',
};
const LANDSCAPE = {
  monastery:[.035,420,'drip'], village:[.037,900,'birds'], briarwood:[.051,930,'birds'],
  quarry:[.064,470,'wind'], fen:[.049,650,'frog'], archive:[.026,350,'drip'],
  sunfields:[.060,810,'birds'], fortress:[.075,550,'wind'], abbey:[.029,390,'drip'],
};
const STEPS = {
  stone:[1720,1.05,106,.077], soil:[740,.68,89,.11], wood:[1160,.85,143,.10], mud:[520,.78,79,.14],
  snow:[1950,1.22,86,.17],
};
const FOLEY = ['boot-a','boot-b','boot-c','boot-d','steel','latch','chest-hinge','smith','coins'];
const FOLEY_ROOT = new URL('../../assets/act1/audio/',import.meta.url);

// Original melodies. A note is [beat in the bar, scale degree, beats of sustain].
const OATH = [
  [[0,4,1.55],[1.75,5,.42],[2.25,7,1.55]],
  [[0,6,1.35],[1.5,4,.5],[2.25,2,1.25]],
  [[.25,3,1.5],[2,4,.55],[2.75,5,.9]],
  [[0,2,1.6],[2,1,.62],[3,0,.7]],
  [[.5,4,1.05],[1.75,6,.55],[2.5,9,1.25]],
  [[0,8,1.35],[1.5,7,.5],[2.25,4,1.35]],
  [[0,5,.75],[1,3,1],[2.25,1,1.4]],
  [[0,0,2.9]],
];
const PATH = [
  [[.5,2,.7],[1.5,4,1.1],[2.8,2,.8]],
  [[0,3,1.25],[1.55,4,.58],[2.5,6,1.2]],
  [[.5,7,.6],[1.35,8,.8],[2.65,6,1.1]],
  [[0,4,1.8],[2.3,5,.5],[3,4,.62]],
  [[0,2,.75],[1,0,.68],[2,3,1.55]],
  [[0,4,1.55],[1.75,6,.7],[2.75,7,1.02]],
  [[.4,8,1.17],[1.8,5,.55],[2.7,3,1.01]],
  [[0,2,1.1],[1.3,0,2.2]],
];
const MIST = [
  [[.2,2,1.55],[2.35,1,1.15]],
  [[.7,3,1.5],[2.6,5,.88]],
  [[0,4,2.05],[2.8,2,.7]],
  [],
  [[.4,5,1.2],[2.25,6,1.4]],
  [[.15,4,1.85],[2.5,3,.93]],
  [[0,1,1.4],[2,4,1.55]],
  [[0,0,2.8]],
];
const CLASH = [
  [[0,4,.75],[1,4,.38],[1.5,5,.42],[2.25,7,1]],
  [[0,6,.72],[1.25,4,.78],[2.75,3,.66]],
  [[.25,3,.9],[1.5,2,.38],[2,4,.58],[3.25,5,.48]],
  [[0,1,.85],[1,4,.7],[2.4,2,.96]],
  [[.25,2,.7],[1.2,4,.85],[2.5,9,1.25]],
  [[0,8,.6],[.9,7,.75],[2,4,.68],[3.25,6,.5]],
  [[.25,5,1.05],[1.6,3,.78],[2.7,1,.72]],
  [[0,0,.82],[1.35,4,.42],[2.25,0,1.5]],
];
const WARDEN = [
  [[0,0,1.4],[2,1,.46],[2.75,4,.86]],
  [[0,5,.83],[1.45,3,.85],[2.85,2,.8]],
  [[0,1,1.14],[1.55,4,.58],[2.45,6,1.22]],
  [[0,4,1.55],[1.95,1,.55],[2.7,0,.75]],
  [[0,8,1.12],[1.5,7,.67],[2.4,6,1.2]],
  [[0,5,1.15],[1.65,3,.7],[2.7,4,1.04]],
  [[0,2,1.25],[1.5,1,.65],[2.55,4,1.2]],
  [[0,0,2.85]],
];
const MINOR = [0,2,3,5,7,8,10];
const DORIAN = [0,2,3,5,7,9,10];
const DARK = [0,1,3,5,7,8,10];
const SCORE = {
  menu:{tempo:74,root:50,scale:MINOR,lead:OATH,harmony:[0,5,3,0,0,2,3,0],voice:'flute',bed:true},
  hearth:{tempo:81,root:55,scale:DORIAN,lead:PATH,harmony:[0,3,2,6,0,3,6,0],voice:'dulcimer'},
  woodland:{tempo:69,root:52,scale:DORIAN,lead:PATH,harmony:[0,3,2,6,0,3,6,0],voice:'flute',bed:true},
  marsh:{tempo:56,root:48,scale:MINOR,lead:MIST,harmony:[0,3,5,0,5,3,4,0],voice:'flute',bed:true},
  ruins:{tempo:63,root:47,scale:DARK,lead:MIST,harmony:[0,3,1,0,5,3,6,0],voice:'dulcimer',bed:true},
  battle:{tempo:108,root:50,scale:MINOR,lead:CLASH,harmony:[0,5,3,4,0,2,3,0],voice:'lute',drums:true},
  boss:{tempo:98,root:45,scale:DARK,lead:WARDEN,harmony:[0,5,1,0,5,3,1,0],voice:'horn',drums:true,bed:true},
  complete:{tempo:64,root:55,scale:DORIAN,lead:OATH,harmony:[0,3,3,0,2,3,4,0],voice:'flute',bed:true},
};

const TIMBRES = {
  flute:[1,.08,.26,.025,.076,.022,.032,.009],
  strings:[1,.61,.39,.20,.16,.084,.068,.045],
  horn:[1,.65,.28,.21,.112,.051,.026,.016],
};
const PLUCKS = {
  lute:{root:220, seconds:1.65, damping:2.55, harmonics:[.68,.43,.21,.16,.11,.073,.055,.027,.014,.010]},
  dulcimer:{root:261.626, seconds:2.35, damping:1.77, harmonics:[.49,.40,.29,.21,.13,.098,.072,.054,.035,.028,.012]},
};
const number = (value,fallback) => Number.isFinite(value) ? value : fallback;
const unit = (value,fallback) => Math.min(1, Math.max(0,number(value,fallback)));
const hertz = midi => 440 * 2 ** ((midi - 69) / 12);
const midiDegree = (score,degree) => score.root + score.scale[((degree % 7) + 7) % 7] + 12 * Math.floor(degree / 7);
const isPluck = kind => Object.hasOwn(PLUCKS,kind);

function target(param,value,time,transition=.055) {
  param.cancelScheduledValues(time);
  param.setTargetAtTime(value,time,transition);
}

function randomStream(seed) {
  return () => {
    seed = (Math.imul(seed,1664525) + 1013904223) >>> 0;
    return seed / 0x100000000;
  };
}

function createNoise(context) {
  const length = context.sampleRate * 3;
  const buffer = context.createBuffer(1,length,context.sampleRate), data = buffer.getChannelData(0);
  const random = randomStream(47291);
  for (let i=0;i<length;i++) data[i]=random()*2-1;
  return buffer;
}

function createRoom(context) {
  const length = Math.ceil(context.sampleRate * .88);
  const impulse = context.createBuffer(2,length,context.sampleRate);
  const random = randomStream(34618);
  for (let channel=0;channel<impulse.numberOfChannels;channel++) {
    const data = impulse.getChannelData(channel);
    let low=0;
    for (let i=0;i<length;i++) {
      low += (random()*2-1-low)*.22;
      const t=i/length;
      data[i]=low*Math.min(1,t*24)*(1-t)**4;
    }
  }
  const convolver = context.createConvolver();
  convolver.buffer = impulse;
  return convolver;
}

function createPluck(context,kind) {
  const {root,seconds,damping,harmonics} = PLUCKS[kind], rate=24000;
  const count = Math.ceil(rate*seconds), wave=context.createBuffer(1,count,rate), sample=wave.getChannelData(0);
  const random = randomStream(6791), metal = kind==='dulcimer';
  let scrape=0, peak=.001;
  for(let i=0;i<count;i++){
    const t=i/rate;
    let value=0;
    for (const [j,gain] of harmonics.entries()){
      const harmonic = j+1, phase = Math.PI*2*root*harmonic*t;
      const ring = Math.sin(phase*(1+j*j*(metal?.00019:.000042)));
      const paired = Math.sin(phase*(metal?1.0037:1.0016)+.23+j*.28);
      value += (ring + paired*(metal?.4:.20))*gain*Math.exp(-t*damping*(1+j*.47));
    }
    scrape += (random()*2-1-scrape)*.38;
    sample[i] = (value + .13*scrape*Math.exp(-t*98))*Math.min(1,t*950)*Math.min(1,(seconds-t)*17);
    peak = Math.max(peak,Math.abs(sample[i]));
  }
  for(let i=0;i<count;i++)sample[i]/=peak;
  return wave;
}

export class Audio {
  constructor() {
    this.volume=.3;
    this.mix={music:.8,sfx:.92,ambience:.72};
    this.context=null;
    this.playing=false;
    this.scene={mode:'menu',areaId:'',biome:'',story:'',boss:false};
    this.waterProximity=0;
    this.effects=new Set();
    this.waves=new Map();
    this.samples=new Map();
    this.foley=new Map();
    this.random=randomStream(81029);
    this.lastStep=-Infinity;
    this.lastEffect=new Map();
    this.campaign=new CampaignAudio(this);
  }

  makeContext() {
    const Context = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!Context) return;
    const context = this.context = new Context({latencyHint:'interactive'});
    this.master = context.createGain();
    this.music = context.createGain();
    this.sfx = context.createGain();
    this.ambience = context.createGain();
    this.scoreLevel = context.createGain();
    this.roomSend=context.createGain();
    this.roomSend.gain.value=.145;
    const compressor=context.createDynamicsCompressor();
    compressor.threshold.value=-11;
    compressor.knee.value=12;
    compressor.ratio.value=5;
    compressor.attack.value=.004;
    compressor.release.value=.18;
    const room=createRoom(context);
    this.master.connect(compressor).connect(context.destination);
    this.scoreLevel.connect(this.music);
    this.music.connect(this.master);
    this.music.connect(room).connect(this.roomSend).connect(this.master);
    this.sfx.connect(this.master);
    this.ambience.connect(this.master);
    this.master.gain.value=this.volume*.9;
    this.music.gain.value=this.mix.music;
    this.sfx.gain.value=this.mix.sfx;
    this.ambience.gain.value=this.mix.ambience;
    this.noise=createNoise(context);
    this.air = this.createBed('air');
    this.water = this.createBed('water');
  }

  async start() {
    if (!this.context) this.makeContext();
    if (!this.context || this.context.state==='closed') return;
    this.playing=true;
    if (this.context.state!=='running') await this.context.resume();
    if (!this.playing || this.context.state!=='running') return;
    this.applyScene();
    this.pump();
    this.timer ??= globalThis.setInterval(() => this.pump(),95);
  }

  pause() {
    this.playing=false;
    if (this.timer!=null) globalThis.clearInterval(this.timer);
    this.timer=null;
    for (const voice of this.effects) {
      voice.source.stop();
      voice.release();
    }
    this.lastEffect.clear();
    this.lastStep=-Infinity;
    if (this.context && this.context.state!=='closed') return this.context.suspend().catch(()=>{});
  }

  setVolume(value) {
    this.volume=unit(value,.3);
    if (this.context) target(this.master.gain,this.volume*.9,this.context.currentTime);
  }

  setMix({music,sfx,ambience}={}) {
    for (const [key, value] of Object.entries({music,sfx,ambience})) {
      const next=unit(value,this.mix[key]);
      if (next===this.mix[key]) continue;
      this.mix[key]=next;
      if (this.context) target(this[key].gain,this.mix[key],this.context.currentTime);
    }
    if (this.playing) this.wakeCampaignMix();
  }

  setScene({mode='menu',areaId='',biome='',story='',boss=false}={}) {
    if (this.scene.mode===mode && this.scene.areaId===areaId && this.scene.biome===biome &&
        this.scene.story===story && this.scene.boss===boss) return;
    this.scene={mode,areaId,biome,story,boss};
    if (this.playing) this.applyScene();
  }

  setWaterProximity(amount=0) {
    const next=unit(amount,0);
    if (Math.abs(next-this.waterProximity)<.025 && (next!==0 || this.waterProximity===0)) return;
    this.waterProximity=next;
    if (this.context) target(this.water.gain,this.waterAmount(),this.context.currentTime,.24);
  }

  waterAmount() {
    return ['explore','dialogue'].includes(this.scene.mode) ? .26*this.waterProximity : 0;
  }

  createBed(kind) {
    const context=this.context, time=context.currentTime, source=context.createBufferSource();
    source.buffer=this.noise;
    source.loop=true;
    source.playbackRate.value=kind==='water'?.84:.62;
    const high=this.filter('highpass',kind==='water'?280:92,.53);
    const low=this.filter('lowpass',kind==='water'?2150:710,.60);
    const sway=context.createGain(), gain=context.createGain(), mod=this.context.createOscillator(), depth=context.createGain();
    sway.gain.value=.82;
    gain.gain.value=0;
    mod.frequency.value=kind==='water'?.26:.095;
    depth.gain.value=kind==='water'?.13:.14;
    mod.connect(depth).connect(sway.gain);
    source.connect(high).connect(low).connect(sway).connect(gain).connect(this.ambience);
    source.start(time,kind==='water'?1.12:0.23);
    mod.start(time);
    return {gain:gain.gain, low:low.frequency};
  }

  applyScene() {
    const {mode,areaId,boss}=this.scene, now=this.context.currentTime;
    const profile=resolveCampaignAudio(this.scene);
    const key = mode==='menu' ? 'menu' : mode==='complete' || (mode==='comic' && !profile) ? 'complete' :
      mode==='battle' ? (boss?'boss':'battle') : (REGIONS[areaId]||'ruins');
    if (mode!=='menu') this.prepareFoley();
    this.setScoreLevel(now);
    const [air,hz] = LANDSCAPE[areaId]||[.019,700];
    const airLevel=mode==='battle' ? air*.32 : mode==='menu' ? .013 : air;
    target(this.air.gain,profile?.air??airLevel,now,.35);
    target(this.air.low,profile?.filter??hz,now,.22);
    target(this.water.gain,this.waterAmount(),now,.23);
    if (profile) this.campaign.desired=profile;
    else this.campaign.select(null);
    this.wakeCampaignMix();
    if (profile && this.campaign.score) return;
    if (this.track?.key===key) return;
    const old=this.track;
    if (old) this.retireTrack(old,now);
    const bus=this.context.createGain();
    bus.gain.value=EPSILON;
    bus.gain.setTargetAtTime(1,now,.23);
    bus.connect(this.scoreLevel);
    this.track={key,bus,voices:new Set(),bar:0,next:now+.035};
    this.nextDetail=now+5+this.random()*4;
    this.pump();
  }

  wakeCampaignMix() {
    if (!this.campaign.desired) return;
    this.campaign.select(this.campaign.desired);
    this.campaign.prepareEffects();
    if (this.scene.biome==='snow'||this.scene.biome==='crystal') this.campaign.prepareSteps('snow');
  }

  useRecordedScore() {
    if (!this.track) return;
    const track=this.track;
    this.track=null;
    this.retireTrack(track,this.context.currentTime);
  }

  retireTrack(track,time) {
    target(track.bus.gain,EPSILON,time,.17);
    for (const voice of track.voices) voice.source.stop(time+.85);
    if (!track.voices.size) track.bus.disconnect();
  }

  pump() {
    if (!this.playing || this.context?.state!=='running') return;
    const now = this.context.currentTime, track=this.track;
    if (track) {
      if (track.next < now-.2) track.next=now+.04;
      if (track.next <= now + LOOK_AHEAD) {
        const score=SCORE[track.key], beat=60/score.tempo;
        this.scheduleBar(track,score,Math.max(track.next,now+.012),beat);
        track.next+=beat*4;
      }
    }
    if (this.nextDetail<=now && this.scene.mode==='explore') {
      const detail=LANDSCAPE[this.scene.areaId]?.[2];
      if (detail) this.sceneDetail(detail,now+.03);
      this.nextDetail=now+8+this.random()*10;
    }
  }

  scheduleBar(track,score,time,beat) {
    const offset=track.bar++;
    const index=offset%score.harmony.length, cycle=Math.floor(offset/score.harmony.length)%4;
    const tonic=score.harmony[index], root=midiDegree(score,tonic), pool=track.voices;
    const note=(voice,degree,at,span,level,pan=0) => {
      const hz=hertz(midiDegree(score,degree));
      this.note(voice,hz,time+at*beat,span*beat,level,track.bus,{pan,pool});
    };
    if (score.bed) {
      this.note('strings',hertz(root-12),time,beat*3.9,.071,track.bus,{pan:-.17,pool});
      note('strings',tonic+4,0,3.75,.042,.18);
    }
    const pattern=score.drums ? [[0,-7],[.74,0],[1.5,4],[2,0],[2.74,2],[3.5,4]] :
      [[0,-7],[.86,4],[1.51,2],[2.26,7],[3.28,4]];
    for (const [i,[at,step]] of pattern.entries()) {
      if (!score.drums && (track.key==='marsh'||track.key==='ruins') && (i===3 || i===4)) continue;
      const voice=track.key==='hearth'?'dulcimer':'lute';
      note(voice,tonic+step,at,1.45,(i===0?.132:i===3?.095:.113)*(score.drums?1.15:1),i%2===0?-.18:.28);
    }
    const melody=score.lead[index];
    for (const [at,degree,span] of melody) {
      const variation=cycle===2 && index%3===1 && at>=2 ? -2 : 0;
      const register=track.key==='boss'?0:7;
      note(score.voice,degree+register+variation,at,span,score.drums?.13:.169,.1);
      if(cycle===3 && index%2===0 && at<1)note('lute',degree+register+2,at+.08,span*.7,.064,-.3);
    }
    if (score.drums) {
      const at=(beatOffset)=>time+beatOffset*beat, heavy=track.key==='boss';
      for (const beatOffset of heavy?[0,1.5,2.5,3.3]:[0,1.5,2.75]) {
        this.drum(track.bus,at(beatOffset),heavy?.23:.165,heavy?63:80,pool);
      }
      for (const beatOffset of [1,3.5]) {
        this.burst(track.bus,at(beatOffset),.108,heavy?.20:.17,{frequency:heavy?1500:2350,Q:.68,pool});
      }
      if (heavy && index%2===0) note('horn',tonic+6,2.25,1.4,.11,-.18);
    } else if (index%4===3 && ['ruins','marsh','complete'].includes(track.key)) {
      note('dulcimer',tonic+14,2,1.7,.067,.28);
    }
  }

  filter(type,frequency,Q=.75) {
    const filter=this.context.createBiquadFilter();
    filter.type=type;
    filter.frequency.value=frequency;
    filter.Q.value=Q;
    return filter;
  }

  prepareFoley() {
    if (this.foleyPromise) return this.foleyPromise;
    const context=this.context;
    this.foleyPromise=Promise.allSettled(FOLEY.map(async key=>{
      const url=new URL(key+'.ogg',FOLEY_ROOT);
      url.searchParams.set('v','forged-019');
      const res=await fetch(url,{signal:AbortSignal.timeout(6500)});
      if (!res.ok) return;
      const buffer=await context.decodeAudioData(await res.arrayBuffer());
      this.foley.set(key,buffer);
    }));
    return this.foleyPromise;
  }

  playFoley(key,time,level,{rate=1,frequency,pan=0}={}) {
    const buffer=this.foley.get(key);
    if (!buffer) return false;
    const source=this.context.createBufferSource();
    const filter=frequency ? this.filter('lowpass',frequency,.74) : null;
    source.buffer=buffer;
    source.playbackRate.value=rate;
    source.start(time);
    this.voice(source,this.sfx,time,buffer.duration/rate,level,{attack:.008,release:.065,pan,filter});
    return true;
  }

  voice(source,bus,time,duration,level,{attack=.008,release=.16,pan=0,filter=null,pool=this.effects}={}) {
    if (pool===this.effects) while (pool.size>=EFFECT_LIMIT) {
      const first=pool.values().next().value;
      first.source.stop();
      first.release();
    }
    const context=this.context, volume=context.createGain();
    const a=Math.min(attack,duration*.45), decay=Math.min(release,duration*.52);
    volume.gain.setValueAtTime(EPSILON,time);
    volume.gain.exponentialRampToValueAtTime(Math.max(EPSILON*1.1,level),time+a);
    volume.gain.setValueAtTime(Math.max(EPSILON*1.1,level),time+Math.max(a,duration-decay));
    volume.gain.exponentialRampToValueAtTime(EPSILON,time+duration);
    const stereo=pan && context.createStereoPanner ? context.createStereoPanner() : null;
    if (stereo) {
      stereo.pan.value=pan;
      volume.connect(stereo).connect(bus);
    } else volume.connect(bus);
    if (filter) source.connect(filter).connect(volume);
    else source.connect(volume);
    const voice={source};
    voice.release=()=>{
      pool.delete(voice);
      source.disconnect();
      volume.disconnect();
      filter?.disconnect();
      stereo?.disconnect();
      if (bus!==this.sfx && bus!==this.ambience && !pool.size && this.track?.bus!==bus) bus.disconnect();
    };
    source.onended=voice.release;
    pool.add(voice);
    source.stop(time+duration+.012);
    return voice;
  }

  tone(bus,time,duration,hz,end,level,{type='sine',pool,attack,release,pan}={}) {
    const osc=this.context.createOscillator();
    osc.type=type;
    osc.frequency.setValueAtTime(hz,time);
    if (end!==hz) osc.frequency.exponentialRampToValueAtTime(end,time+duration*.88);
    osc.start(time);
    this.voice(osc,bus,time,duration,level,{pool,attack,release,pan});
  }

  note(kind,hz,time,duration,level,bus,{pan=0,pool}={}) {
    if (isPluck(kind)) {
      if (!this.samples.has(kind)) this.samples.set(kind,createPluck(this.context,kind));
      const node=this.context.createBufferSource();
      node.buffer=this.samples.get(kind);
      node.playbackRate.value=hz/PLUCKS[kind].root;
      const cutoff=Math.min(node.buffer.duration/node.playbackRate.value,duration);
      node.start(time);
      this.voice(node,bus,time,Math.max(.035,cutoff),level,{attack:.006,release:Math.min(.21,cutoff*.6),pan,pool});
      return;
    }
    if (!this.waves.has(kind)) {
      const harmonics=TIMBRES[kind];
      this.waves.set(kind,this.context.createPeriodicWave(new Float32Array(harmonics.length+1),Float32Array.from([0,...harmonics])));
    }
    const osc=this.context.createOscillator();
    osc.setPeriodicWave(this.waves.get(kind));
    osc.frequency.value=hz;
    osc.detune.setValueAtTime(kind==='strings'?-6:-2,time);
    osc.detune.linearRampToValueAtTime(kind==='strings'?-2:3,time+Math.min(.24,duration*.35));
    osc.start(time);
    const softness=kind==='strings'?.22:kind==='horn'?.075:.12;
    this.voice(osc,bus,time,duration,level,{attack:softness,release:kind==='strings'?.7:.2,pan,pool});
    if (kind==='flute' && duration>.25) this.burst(bus,time,Math.min(.26,duration*.7),level*.20,{frequency:1300,Q:.64,attack:.06,pan,pool});
  }

  burst(bus,time,duration,level,{frequency=900,end,Q=.75,type='bandpass',pan=0,pool,attack=.013,release}={}) {
    const noise=this.context.createBufferSource(), filter=this.filter(type,frequency,Q);
    noise.buffer=this.noise;
    if (end) filter.frequency.exponentialRampToValueAtTime(end,time+duration*.9);
    noise.start(time,this.random()*Math.max(0,this.noise.duration-duration-.04));
    this.voice(noise,bus,time,duration,level,{filter,pan,pool,attack,release:release??duration*.77});
  }

  drum(bus,time,level,hz,pool) {
    this.tone(bus,time,.23,hz,hz*.53,level,{pool,release:.21});
    this.burst(bus,time,.09,level*.52,{frequency:1280,end:510,Q:.6,pool});
  }

  chime(sequence,time,{spacing=.09,level=.18,timbre='dulcimer',duration=.55}={}) {
    for (const [i,pitch] of sequence.entries()) {
      this.note(timbre,hertz(pitch),time+i*spacing,duration,level*(1-i*.075),this.sfx,
        {pan:i%2===0?-.13:.13});
    }
  }

  sceneDetail(kind,t) {
    if (this.volume<=0 || this.mix.ambience<=0) return;
    const bus=this.ambience, pan=this.random()*.8-.4;
    if (kind==='birds') {
      const hz=1080+this.random()*380;
      this.tone(bus,t,.16,hz,hz*1.45,.017,{pan});
      this.tone(bus,t+.18,.23,hz*1.26,hz*.96,.018,{pan});
    } else if (kind==='frog') {
      for (const offset of [0,.22,.57]) this.tone(bus,t+offset,.16,179,106,.024,{type:'triangle',pan});
    } else if (kind==='drip') {
      this.tone(bus,t,.12,890,585,.02,{pan});
      this.tone(bus,t+.06,.37,468,415,.012,{pan});
    } else this.burst(bus,t,1.05,.093,{frequency:390,end:670,Q:.68,attack:.24,pan});
  }

  active() {
    return this.playing && this.context?.state==='running' && this.volume>0 && this.mix.sfx>0;
  }

  footstep(surface='stone') {
    if (!this.active()) return;
    const t=this.context.currentTime;
    if (t-this.lastStep<.145) return;
    this.lastStep=t;
    if (surface==='snow' && this.campaign.snowFootstep(t)) return;
    const [frequency,q,pitch,duration]=STEPS[surface]||STEPS.stone;
    const change=.87+this.random()*.26;
    const level=surface==='wood'?.095:.118;
    const sample=FOLEY[(this.lastBoot=1+(this.lastBoot??0)+Math.floor(this.random()*3))%4];
    const grounded=this.playFoley(sample,t,.21,{rate:change*(surface==='mud'?.86:1),
      frequency:frequency*2.2,pan:this.lastBoot%2?.13:-.13});
    this.burst(this.sfx,t,duration,level*(grounded?.56:1),{frequency:frequency*change,end:frequency*.58,Q:q});
    this.tone(this.sfx,t,.075,pitch*change,pitch*.62,grounded?.052:.079,{type:surface==='wood'?'triangle':'sine'});
    if (surface==='wood') this.tone(this.sfx,t+.016,.075,423*change,287,.026,{type:'triangle'});
  }

  play(kind) {
    if (!this.active()) return;
    const t=this.context.currentTime;
    if (t-(this.lastEffect.get(kind)??-Infinity)<.075) return;
    this.lastEffect.set(kind,t);
    if (this.campaign.playEffect(kind,t)) return;
    const bus=this.sfx;
    const tone=(duration,hz,end,level,options)=>this.tone(bus,t,duration,hz,end,level,options);
    const burst=(duration,level,options)=>this.burst(bus,t,duration,level,options);
    switch (kind) {
      case 'slash':
        this.playFoley('steel',t,.17,{rate:.96+this.random()*.19,frequency:5200});
        burst(.18,.37,{frequency:830,end:2760,Q:.84,attack:.037});
        tone(.17,583,280,.075,{type:'triangle'});
        break;
      case 'dash':
        burst(.21,.23,{frequency:1280,end:385,Q:.83,attack:.046});
        break;
      case 'hit':
        this.drum(bus,t,.25,134);
        burst(.105,.20,{frequency:2890,end:870,Q:1.25});
        break;
      case 'heroHit':
        this.drum(bus,t,.31,90);
        tone(.23,145,64,.103,{type:'triangle'});
        break;
      case 'block':
      case 'break':
        this.drum(bus,t,.16,132);
        burst(.19,.29,{frequency:2780,end:1330,Q:.76});
        tone(.32,kind==='block'?1151:790,610,.14,{type:'triangle'});
        break;
      case 'kill':
        this.drum(bus,t,.195,99);
        burst(.24,.21,{frequency:985,end:395,Q:.72});
        break;
      case 'fire':
        burst(.43,.46,{frequency:1300,end:266,Q:.69,attack:.045});
        this.drum(bus,t+.06,.28,85);
        this.burst(bus,t+.13,.22,.29,{frequency:2440,end:430,Q:.64});
        break;
      case 'ice':
        burst(.19,.32,{frequency:3390,end:2150,Q:1.25});
        this.chime([85,90,78],t,{spacing:.035,level:.14,duration:.43});
        break;
      case 'lightning':
      case 'thunder':
        burst(.143,.54,{frequency:2640,end:1710,Q:.62,attack:.003});
        tone(.21,961,86,.18,{type:'triangle',attack:.006});
        this.drum(bus,t+.027,.18,74);
        break;
      case 'enemyCast':
        burst(.39,.25,{frequency:875,end:311,Q:1.24,attack:.057});
        tone(.40,213,101,.16,{type:'triangle',attack:.07});
        break;
      case 'nova':
        tone(.50,296,817,.15,{type:'triangle',attack:.09});
        this.chime([62,69,76],t+.06,{level:.11});
        break;
      case 'weakness':
        this.chime([70,66,63],t,{spacing:.078,level:.13,duration:.32});
        break;
      case 'heal':
        this.chime([64,69,74],t,{spacing:.087,level:.17,timbre:'flute',duration:.40});
        break;
      case 'revive':
        this.chime([57,64,69,74,81],t,{spacing:.104,level:.18,duration:.68});
        break;
      case 'chapter':
      case 'relic':
      case 'finale':
        this.chime([62,69,74,77,81],t,{spacing:.116,level:.168,timbre:'lute',duration:.74});
        break;
      case 'ward':
        this.chime([53,60,65,69],t,{spacing:.083,level:.144,timbre:'horn'});
        break;
      case 'victory':
        this.chime([62,66,69,74,78],t,{spacing:.126,level:.23,timbre:'horn',duration:.74});
        this.musicDuck(t,.42,1.12);
        break;
      case 'level':
        this.chime([62,69,73,76],t,{spacing:.092,level:.18});
        break;
      case 'recruit':
        this.chime([55,62,67,71],t,{spacing:.123,level:.175,timbre:'lute'});
        break;
      case 'loot':
        this.chime([76,81,83],t,{spacing:.059,level:.175,duration:.38});
        break;
      case 'chest':
        this.playFoley('latch',t,.31,{frequency:4900});
        this.playFoley('chest-hinge',t+.09,.24,{rate:.92,frequency:2200});
        burst(.24,.26,{frequency:1230,end:367,Q:.76,attack:.02});
        this.tone(bus,t+.052,.13,289,133,.15,{type:'triangle'});
        this.chime([64,71,76,81],t+.19,{spacing:.077,level:.16});
        break;
      case 'repair':
        for (const [offset,pitch] of [[0,952],[.135,1170],[.29,1450]]) {
          this.playFoley('smith',t+offset,.31,{rate:pitch/1140,frequency:5100});
          this.tone(bus,t+offset,.27,pitch,pitch*.95,.105,{type:'triangle'});
          this.burst(bus,t+offset,.095,.145,{frequency:2450,end:1750,Q:.92});
        }
        break;
      case 'coin':
        this.playFoley('coins',t,.32,{frequency:6800});
        this.chime([84,87,91],t,{spacing:.04,level:.117,duration:.28});
        break;
      case 'river':
        burst(.35,.24,{frequency:1140,end:650,Q:.61,attack:.055});
        break;
      case 'seal':
        tone(.062,563,334,.054,{type:'triangle',attack:.005});
        break;
    }
  }

  musicDuck(time,depth,recovery) {
    this.duck={depth,until:time+recovery};
    this.setScoreLevel(time);
  }

  setScoreLevel(time) {
    const rest=this.scene.mode==='dialogue'?.48:this.scene.mode==='comic'?.79:1;
    const gain=this.scoreLevel.gain, duck=this.duck;
    if (duck?.until>time) {
      target(gain,duck.depth*rest,time,.07);
      gain.setTargetAtTime(rest,duck.until,.25);
    } else target(gain,rest,time,.14);
  }
}
