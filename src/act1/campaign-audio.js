// The naming here is shared with assets/campaign/audio/manifest.json.
const AUDIO_ROOT = new URL('../../assets/campaign/audio/', import.meta.url);
const REGIONS = {
  coast:        { family: 'salt',   bed: 'env_surf',    level: .35, air: .037, filter: 860 },
  reef:         { family: 'salt',   bed: 'env_reef',    level: .36, air: .052, filter: 340 },
  snow:         { family: 'winter', bed: 'env_wind',    level: .32, air: .052, filter: 830 },
  crystal:      { family: 'winter', bed: 'env_reef',    level: .18, air: .028, filter: 445 },
  slag:         { family: 'iron',   bed: 'env_wind',    level: .23, air: .067, filter: 470 },
  forge:        { family: 'iron',   bed: 'env_forge',   level: .30, air: .026, filter: 565 },
  orchard:      { family: 'glass',  bed: 'env_orchard', level: .29, air: .023, filter: 890 },
  glass:        { family: 'glass',  bed: 'env_wind',    level: .14, air: .029, filter: 560 },
  moor:         { family: 'oath',   bed: 'env_wind',    level: .41, air: .063, filter: 1040 },
  amphitheatre: { family: 'oath',   bed: 'env_wind',    level: .19, air: .023, filter: 325 },
};
const STORY = new Set(['act2_arrival','act3_arrival','act4_arrival','act5_arrival','act6_arrival','final_return','final_council']);
const EFFECTS = new Map([
  ['ice','sfx_shatter'], ['lightning','sfx_thunder'], ['thunder','sfx_thunder'],
  ['heroHit','sfx_impact'], ['ward','sfx_ward'], ['block','sfx_ward'],
  ['chapter','sfx_relic'], ['relic','sfx_relic'], ['finale','sfx_relic'], ['repair','sfx_forge'],
]);
const EFFECT_FILES=new Set(EFFECTS.values());
const MAX_DECODED_BYTES = 38 * 1024 * 1024;

export function resolveCampaignAudio({ mode, biome, story, boss }) {
  if (mode === 'menu') return null;
  const region = Object.hasOwn(REGIONS,biome) ? REGIONS[biome] : null;
  const explicitStory = (mode === 'comic' || mode === 'complete') && STORY.has(story) ? story : null;
  if (!region && !explicitStory) return null;
  const music = explicitStory ?? (mode === 'battle' ? region.family + (boss ? '_boss' : '_battle') :
    mode === 'complete' ? 'final_council' : biome);
  const bed = ['explore','dialogue'].includes(mode) ? region?.bed ?? null : null;
  return {
    music, bed, level: bed ? region.level * (mode === 'dialogue' ? .55 : 1) : 0,
    air: (region?.air ?? .023) * (mode === 'battle' ? .38 : mode === 'comic' ? .22 : 1),
    filter: region?.filter ?? 560,
  };
}

function stop(bus, now, duration) {
  if (!bus) return;
  const gain = bus.node.gain;
  gain.cancelScheduledValues(now);
  gain.setTargetAtTime(.0001,now,duration/5);
  bus.source.stop(now+duration);
}

/** A bounded cache of decoded recordings. Game states request two layers at most.
 * A delayed file may fill the cache but can take over a bus only while still selected. */
export class CampaignAudio {
  constructor(owner) {
    this.owner=owner;
    this.buffers=new Map();
    this.pending=new Map();
    this.failed=new Set();
    this.desired=null;
    this.score=null;
    this.ambience=null;
  }

  async buffer(key) {
    if (this.buffers.has(key)) {
      const sound=this.buffers.get(key);
      this.buffers.delete(key);
      this.buffers.set(key,sound);
      return sound;
    }
    if (this.pending.has(key)) return this.pending.get(key);
    if (this.failed.has(key)) return null;
    const decode=async()=>{
      const url=new URL(key+'.ogg',AUDIO_ROOT);
      url.searchParams.set('v','campaign-v1');
      try {
        const response=await fetch(url,{signal:AbortSignal.timeout(7500)});
        if (!response.ok) throw new Error('Audio '+response.status);
        const buffer=await this.owner.context.decodeAudioData(await response.arrayBuffer());
        this.buffers.set(key,buffer);
        this.prune();
        return buffer;
      } catch {
        this.failed.add(key);
        return null;
      }
    };
    const promise=decode().finally(()=>this.pending.delete(key));
    this.pending.set(key,promise);
    return promise;
  }

  prune() {
    const size=buffer=>buffer.length*buffer.numberOfChannels*4;
    let decoded=0;
    for (const buffer of this.buffers.values()) decoded+=size(buffer);
    for (const [key,buffer] of this.buffers) {
      if (decoded<=MAX_DECODED_BYTES) break;
      if (key===this.desired?.music||key===this.desired?.bed||EFFECT_FILES.has(key)||key.startsWith('env_boot_snow_')) continue;
      this.buffers.delete(key);
      decoded-=size(buffer);
    }
  }

  select(profile) {
    this.desired=profile;
    this.chooseAmbience(profile?.bed,profile?.level);
    if (!profile) {
      this.retireScore();
      return;
    }
    if (this.score?.key===profile.music || !this.owner.playing || this.owner.mix.music===0) return;
    const key=profile.music;
    this.buffer(key).then(buffer=>{
      if (!buffer || !this.owner.playing || this.owner.mix.music===0 || this.desired?.music!==key || this.score?.key===key) return;
      const now=this.owner.context.currentTime;
      const duration=this.owner.scene.mode==='battle' ? .49 : 1.1;
      this.retireScore(duration);
      this.owner.useRecordedScore();
      this.score=this.loop(key,buffer,this.owner.scoreLevel,1.32,duration,0);
    });
  }

  retireScore(fade=.55) {
    if (!this.score) return;
    stop(this.score,this.owner.context.currentTime,fade);
    this.score=null;
  }

  chooseAmbience(key,level=0) {
    if (this.ambience && this.ambience.key===key) {
      this.ambience.node.gain.setTargetAtTime(level,this.owner.context.currentTime,.25);
      return;
    }
    if (this.ambience) {
      stop(this.ambience,this.owner.context.currentTime,1.22);
      this.ambience=null;
    }
    if (!key || this.owner.mix.ambience===0 || !this.owner.playing) return;
    this.buffer(key).then(buffer=>{
      if (!buffer || !this.owner.playing || this.owner.mix.ambience===0 || this.desired?.bed!==key || this.ambience?.key===key) return;
      this.ambience=this.loop(key,buffer,this.owner.ambience,this.desired.level,1.25,.47);
    });
  }

  loop(key,buffer,output,level,fade,offset) {
    const context=this.owner.context, now=context.currentTime;
    const source=context.createBufferSource(), node=context.createGain();
    source.buffer=buffer;
    source.loop=true;
    node.gain.setValueAtTime(.0001,now);
    node.gain.setTargetAtTime(level,now,fade/5);
    source.connect(node).connect(output);
    source.onended=()=>{
      source.disconnect();
      node.disconnect();
    };
    source.start(now,offset);
    return {key,source,node};
  }

  prepareEffects() {
    if (this.effectsPrepared||this.owner.mix.sfx===0 || !this.desired) return;
    this.effectsPrepared=true;
    for(const key of EFFECT_FILES) this.buffer(key);
  }

  prepareSteps(surface) {
    if (surface!=='snow' || this.snowPrepared || !this.desired || this.owner.mix.sfx===0) return;
    this.snowPrepared=true;
    for(let i=1;i<=4;i++)this.buffer('env_boot_snow_'+i);
  }

  snowFootstep(time) {
    if (!this.desired) return false;
    this.prepareSteps('snow');
    this.lastSnow=(this.lastSnow??0)+1+Math.floor(this.owner.random()*3);
    return this.playBuffer('env_boot_snow_'+(this.lastSnow%4+1),time,.29,{rate:.91+this.owner.random()*.18,pan:this.lastSnow%2?.12:-.12});
  }

  playEffect(kind,time) {
    if (!this.desired) return false;
    this.prepareEffects();
    const key=EFFECTS.get(kind);
    return key ? this.playBuffer(key,time,kind==='chapter'?.33:.45,{rate:.95+this.owner.random()*.085}) : false;
  }

  playBuffer(key,time,level,{rate=1,pan=0}={}) {
    const buffer=this.buffers.get(key);
    if (!buffer) return false;
    const source=this.owner.context.createBufferSource();
    source.buffer=buffer;
    source.playbackRate.value=rate;
    source.start(time);
    this.owner.voice(source,this.owner.sfx,time,buffer.duration/rate,level,{attack:.004,release:.11,pan});
    return true;
  }
}
