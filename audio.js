window.SFX = (()=>{
  let ctx, masterBus, musicBus, sfxBus, limiter;
  let master=1, music=1, sfx=1, normalEnabled=true;
  let currentKey='', currentTrack=null;
  const tracks=new Map();
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  function init(){
    if(ctx)return;
    ctx=new (window.AudioContext||window.webkitAudioContext)();
    masterBus=ctx.createGain(); musicBus=ctx.createGain(); sfxBus=ctx.createGain(); limiter=ctx.createDynamicsCompressor();
    limiter.threshold.value=-5; limiter.knee.value=4; limiter.ratio.value=18; limiter.attack.value=.002; limiter.release.value=.16;
    musicBus.connect(masterBus); sfxBus.connect(masterBus); masterBus.connect(limiter); limiter.connect(ctx.destination); applyLevels();
  }
  function ensure(){init(); if(ctx.state==='suspended')ctx.resume()}
  function applyLevels(){if(!ctx)return; masterBus.gain.value=Math.max(0,master); musicBus.gain.value=Math.max(0,music*.27); sfxBus.gain.value=Math.max(0,sfx*.24)}
  function setMasterPercent(v){master=clamp(Number(v)||0,0,2000)/100;applyLevels()}
  function setMusicPercent(v){music=clamp(Number(v)||0,0,2000)/100;applyLevels()}
  function setSfxPercent(v){sfx=clamp(Number(v)||0,0,2000)/100;applyLevels()}
  function setNormalEnabled(v){normalEnabled=!!v;if(!normalEnabled&&currentKey.startsWith('normal'))stopMusic()}
  function env(bus,vol,t,dur,attack=.008){const g=ctx.createGain();g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(Math.max(.0001,vol),t+attack);g.gain.exponentialRampToValueAtTime(.0001,t+dur);g.connect(bus);return g}
  function osc(freq,dur,{type='sine',vol=.12,when=0,slide=0,cut=0}={}){
    ensure();const t=ctx.currentTime+when,o=ctx.createOscillator(),g=env(sfxBus,vol,t,dur,.006);o.type=type;o.frequency.setValueAtTime(freq,t);if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(25,freq+slide),t+dur*.92);let last=o;if(cut){const f=ctx.createBiquadFilter();f.type='lowpass';f.frequency.value=cut;last.connect(f);last=f}last.connect(g);o.start(t);o.stop(t+dur+.03)
  }
  function getTrack(kind,index){
    ensure(); const count=kind==='boss'?6:5, n=((index%count)+count)%count, key=`${kind}-${n+1}`;
    if(tracks.has(key))return tracks.get(key);
    const audio=new Audio(`${key}.mp3`); audio.loop=true; audio.preload='auto'; audio.crossOrigin='anonymous'; audio.playsInline=true;
    let gain=null, source=null, direct=false;
    try{source=ctx.createMediaElementSource(audio);gain=ctx.createGain();gain.gain.value=0;source.connect(gain);gain.connect(musicBus)}catch{direct=true;audio.volume=Math.min(1,music*.24*master)}
    const obj={key,audio,gain,source,direct}; tracks.set(key,obj); return obj;
  }
  function updateDirectVolumes(){for(const t of tracks.values())if(t.direct)t.audio.volume=Math.min(1,music*.24*master)}
  function startTrack(kind,index){
    if(kind==='normal'&&!normalEnabled)return stopMusic(); ensure(); updateDirectVolumes();
    const next=getTrack(kind,index); if(currentKey===next.key&&!next.audio.paused)return;
    const prev=currentTrack; currentTrack=next; currentKey=next.key; next.audio.currentTime=0;
    if(next.gain){const now=ctx.currentTime;next.gain.gain.cancelScheduledValues(now);next.gain.gain.setValueAtTime(0,now);next.gain.gain.linearRampToValueAtTime(1,now+.28)}
    next.audio.play().catch(()=>{});
    if(prev&&prev!==next){if(prev.gain){const now=ctx.currentTime;prev.gain.gain.cancelScheduledValues(now);prev.gain.gain.setValueAtTime(Math.max(.0001,prev.gain.gain.value||1),now);prev.gain.gain.linearRampToValueAtTime(.0001,now+.25)}setTimeout(()=>{try{prev.audio.pause();prev.audio.currentTime=0}catch{}},300)}
  }
  function startBoss(track=0){startTrack('boss',track)}
  function startNormal(track=0){startTrack('normal',track)}
  function stopMusic(){const p=currentTrack;currentTrack=null;currentKey='';if(!p)return;if(p.gain&&ctx){const now=ctx.currentTime;p.gain.gain.cancelScheduledValues(now);p.gain.gain.setValueAtTime(Math.max(.0001,p.gain.gain.value||1),now);p.gain.gain.linearRampToValueAtTime(.0001,now+.22);setTimeout(()=>{try{p.audio.pause();p.audio.currentTime=0}catch{}},260)}else{try{p.audio.pause();p.audio.currentTime=0}catch{}}}
  return {
    init,ensure,startBoss,startNormal,stopBoss:stopMusic,stopMusic,setNormalEnabled,setMasterPercent(v){setMasterPercent(v);updateDirectVolumes()},setMusicPercent(v){setMusicPercent(v);updateDirectVolumes()},setSfxPercent,
    bite(){osc(185,.05,{type:'square',vol:.29,slide:-55})},dash(){osc(220,.11,{type:'sawtooth',vol:.20,slide:480})},
    hit(){osc(82,.08,{type:'square',vol:.22,slide:-22})},pickup(){osc(690,.055,{vol:.11,slide:230})},
    level(){osc(430,.13,{type:'triangle',vol:.2,slide:460});setTimeout(()=>osc(730,.16,{type:'triangle',vol:.17,slide:400}),75)},
    boss(){osc(92,.32,{type:'sawtooth',vol:.28,slide:-25});setTimeout(()=>osc(138,.24,{type:'square',vol:.16,slide:-34}),110)},
    click(){osc(510,.03,{vol:.10,slide:55})},death(){stopMusic();osc(160,.45,{type:'sawtooth',vol:.22,slide:-110})},
    gem(){osc(1050,.09,{vol:.16,slide:390});setTimeout(()=>osc(1450,.08,{vol:.10,slide:250}),55)},
    repair(){osc(360,.1,{type:'triangle',vol:.16,slide:260});setTimeout(()=>osc(620,.11,{type:'triangle',vol:.12,slide:180}),65)},
    waveClear(){osc(520,.09,{type:'triangle',vol:.13,slide:120});setTimeout(()=>osc(690,.11,{type:'triangle',vol:.12,slide:170}),70)},
    victory(){stopMusic();[392,523.25,659.25,783.99].forEach((n,i)=>setTimeout(()=>osc(n,.45,{type:'triangle',vol:.22,slide:70}),i*115))}
  }
})();
