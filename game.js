(()=>{
const canvas=document.getElementById('game'),ctx=canvas.getContext('2d');
const W=1280,H=720,TAU=Math.PI*2,MAX_WAVE=BUGBREAK_DATA.maxWave||50;
let last=performance.now(),running=false,paused=false,selectedBug='ant',state=null,save=loadSave(),settings=loadSettings();
const keys={},touchMove={x:0,y:0};
const demo=new URLSearchParams(location.search).get('demo');

function defaultUpgrades(){return Object.fromEntries(BUGBREAK_DATA.permanent.map(u=>[u.id,0]))}
function loadSettings(){let x={};try{x=JSON.parse(localStorage.getItem('bugbreakSettings')||'{}')}catch{}return{master:100,music:100,sfx:100,normalMusic:true,shake:true,...x}}
function saveSettings(){try{localStorage.setItem('bugbreakSettings',JSON.stringify(settings))}catch{};SFX.setMasterPercent(settings.master);SFX.setMusicPercent(settings.music);SFX.setSfxPercent(settings.sfx);SFX.setNormalEnabled(settings.normalMusic)}
function loadSave(){
  let raw={};try{raw=JSON.parse(localStorage.getItem('bugbreakSave')||'{}')}catch{}
  const today=new Date().toLocaleDateString('en-CA');
  const s={bestWave:0,gems:0,upgrades:defaultUpgrades(),v2Gift:false,v3Gift:false,v4Gift:false,v5Gift:false,dailyDate:'',...raw};
  s.upgrades={...defaultUpgrades(),...(raw.upgrades||{})};
  if(!s.v2Gift){s.gems=(s.gems||0)+18;s.v2Gift=true;s.justGifted=true}
  if(!s.v3Gift){s.gems=(s.gems||0)+10;s.v3Gift=true;s.justV3Gift=true}
  if(!s.v4Gift){s.gems=(s.gems||0)+14;s.v4Gift=true;s.justV4Gift=true}
  if(!s.v5Gift){s.gems=(s.gems||0)+12;s.v5Gift=true;s.justV5Gift=true}
  s.dailyClaimedToday=s.dailyDate===today;
  return s
}
function persist(){try{const out={...save,justGifted:false,justV3Gift:false,justV4Gift:false,justV5Gift:false};delete out.dailyClaimedToday;localStorage.setItem('bugbreakSave',JSON.stringify(out))}catch{}UI.updateMenu(save)}
function rand(a,b){return a+Math.random()*(b-a)}function dist(a,b){return Math.hypot(a.x-b.x,a.y-b.y)}function clamp(v,a,b){return Math.max(a,Math.min(b,v))}function norm(x,y){const d=Math.hypot(x,y)||1;return{x:x/d,y:y/d}}function lerp(a,b,t){return a+(b-a)*t}

const deco=[];for(let i=0;i<190;i++)deco.push({x:rand(0,W),y:rand(0,H),r:rand(3,19),t:Math.random(),rot:rand(0,TAU),h:rand(0,1)});
const stones=[];for(let i=0;i<28;i++)stones.push({x:rand(0,W),y:rand(0,H),rx:rand(8,34),ry:rand(5,18),rot:rand(0,TAU),v:rand(.5,1)});
const fireflies=[];for(let i=0;i<16;i++)fireflies.push({x:rand(0,W),y:rand(0,H),p:rand(0,TAU),s:rand(.25,.7)});

function setupMenuBg(){state=null;running=false;paused=false;SFX.stopMusic();UI.setHud(false);UI.show('menu');UI.updateMenu(save);UI.renderBugSelect(save,selectedBug,id=>{selectedBug=id;rerenderSelect()})}
function rerenderSelect(){UI.renderBugSelect(save,selectedBug,id=>{selectedBug=id;rerenderSelect()})}
function basePlayer(){
  const b=BUGBREAK_DATA.bugs[selectedBug],u=save.upgrades;
  const hp=b.hp*(1+.09*(u.shell||0)),dashCd=Math.max(1.05,2.0*(1-.06*(u.dash||0)));
  return{x:W*.52,y:H*.55,r:20,angle:0,hp,maxHp:hp,speed:b.speed*(1+.04*(u.legs||0)),damage:b.damage*(1+.08*(u.fangs||0)),attackRate:b.attackRate,attackCd:0,attackRange:88,dashPower:b.dash,dashCooldown:dashCd,dashCd:0,dashTime:0,level:1,xp:0,nextXp:55,crit:.05+.02*(u.crit||0),killHeal:0,nestRegen:1.5*(u.workers||0),nestDR:b.nestGuard||0,lifesteal:b.lifesteal||0,pickupRadius:85+24*(u.magnet||0),repairAmount:82+18*(u.repair||0),repairCost:12,abilityCooldown:Math.max(6.5,13*(1-.07*(u.ability||0))),selfRegen:0,bossDamage:1,gemEvery:0,blockEvery:0,hitCounter:0,id:selectedBug,color:b.color,accent:b.accent}
}
function contractReward(){return 2+Math.floor((state?.wave||1)/15)+Math.floor((save.upgrades.bounty||0)/2)}
function makeContract(previous=''){
  const w=state?.wave||1, choices=[
    {type:'kills',icon:'⚔️',label:`Defeat ${14+Math.min(16,w)} predators`,goal:14+Math.min(16,w)},
    {type:'crumbs',icon:'🍞',label:`Earn ${55+Math.min(95,w*3)} crumbs`,goal:55+Math.min(95,w*3)},
    {type:'combo',icon:'🔥',label:`Reach a x${8+Math.min(12,Math.floor(w/4))} combo`,goal:8+Math.min(12,Math.floor(w/4))},
    {type:'waves',icon:'🌿',label:'Clear 3 waves',goal:3}
  ].filter(x=>x.type!==previous);
  const c=choices[Math.floor(Math.random()*choices.length)];return {...c,progress:0,reward:contractReward(),done:false}
}
function contractProgress(type,amount=1,absolute=false){
  const c=state?.contract;if(!c||c.done||c.type!==type)return;c.progress=absolute?Math.max(c.progress,amount):c.progress+amount;if(c.progress>=c.goal){c.done=true;state.runGems+=c.reward;SFX.gem();UI.reward(`✅ Contract complete · +${c.reward} gems`);const prev=c.type;setTimeout(()=>{if(state&&running){state.contract=makeContract(prev);UI.toast('📋 New colony contract!')}},1300)}
}
function setupWaveEvent(){
  const s=state;s.eventType='';s.eventLabel=s.biome.name;s.eventBonus=0;if(s.boss||s.wave<4||s.wave%4!==0)return;
  const pool=['feast','fireflies','ambush','aphid','rush'];const ev=pool[Math.floor(Math.random()*pool.length)];s.eventType=ev;
  if(ev==='feast'){s.eventLabel='🍞 QUEEN\'S FEAST · 2× CRUMBS';UI.toast('Random event: Queen’s Feast! Double crumbs this wave')}
  if(ev==='fireflies'){s.eventLabel='✨ FIREFLY FESTIVAL · GEM LUCK';UI.toast('Random event: Firefly Festival! Gem drops boosted')}
  if(ev==='ambush'){s.eventLabel='⚠️ PREDATOR AMBUSH · +2 💎';s.eventBonus=2;UI.toast('Random event: Predator Ambush! Harder wave, bonus gems')}
  if(ev==='aphid'){s.eventLabel='🌟 GOLDEN APHID HUNT';UI.toast('RARE EVENT: Catch the Golden Aphid!')}
  if(ev==='rush'){s.eventLabel='⚡ SUGAR RUSH · SPEED UP';UI.toast('Random event: Sugar Rush! Everything moves faster')}
}
function useAbility(){
  if(!running||paused||!state||state.abilityCd>0)return;const s=state,p=s.player;s.abilityCd=p.abilityCooldown;SFX.level();shockwave(p.x,p.y,'#d99cff');
  if(MP.role==='guest'&&MP.isConnected())MP.sendAction('special',{x:p.x,y:p.y,id:p.id,damage:p.damage});
  if(p.id==='ant'){s.rallyTimer=6;UI.reward('🐜 RALLY · +55% damage for 6s')}
  else if(p.id==='termite'){s.fortifyTimer=7;s.nest.hp=Math.min(s.nest.maxHp,s.nest.hp+150);UI.reward('🪵 FORTIFY · nest armored + repaired')}
  else if(p.id==='ladybug'){s.shieldTimer=6;p.hp=Math.min(p.maxHp,p.hp+70);s.nest.hp=Math.min(s.nest.maxHp,s.nest.hp+90);UI.reward('🐞 SHELL SHIELD · heavy damage reduction')}
  else if(p.id==='fly'){s.hyperTimer=6;UI.reward('🪰 HYPERBUZZ · extreme speed + bite rate')}
  else if(p.id==='mosquito'){s.bloodTimer=7;UI.reward('🦟 BLOOD FRENZY · damage + lifesteal')}
  else if(p.id==='bumblebee'){s.rallyTimer=5;s.nest.hp=Math.min(s.nest.maxHp,s.nest.hp+125);p.hp=Math.min(p.maxHp,p.hp+40);UI.reward('🐝 POLLEN BURST · heal + team damage boost')}
  else if(p.id==='stagbeetle'){for(const e of s.enemies)if(dist(p,e)<185)e.hp-=p.damage*2.25;p.dashTime=.26;shockwave(p.x,p.y,'#ffb574');UI.reward('🪲 HORN CHARGE · massive close-range hit')}
}
function offerRelic(after){
  paused=true;SFX.stopBoss();const opts=[...BUGBREAK_DATA.relics].sort(()=>Math.random()-.5).slice(0,3);UI.renderRelics(opts,r=>{r.apply(state.player,state);state.relics.push(r.id);UI.hideAll();paused=false;UI.toast(`${r.icon} ${r.name} equipped`);after()});UI.show('relic')
}
function newRun(){
  SFX.init();const today=new Date().toLocaleDateString('en-CA');if(save.dailyDate!==today){save.dailyDate=today;save.dailyClaimedToday=true;save.gems+=4;persist();UI.toast('🌱 Daily colony bonus: +4 gems')}
  const p=basePlayer(),nestMax=820*(1+.14*(save.upgrades.nest||0));
  state={time:0,wave:1,crumbs:0,runGems:0,kills:0,player:p,nest:{x:W/2,y:H/2,r:62,hp:nestMax,maxHp:nestMax},enemies:[],drops:[],particles:[],slashes:[],shockwaves:[],shake:0,startedWave:false,boss:false,bossName:'',regenClock:0,repairCd:0,bossSpawnClock:0,abilityCd:0,rallyTimer:0,fortifyTimer:0,shieldTimer:0,hyperTimer:0,bloodTimer:0,frenzyTimer:0,combo:0,comboTimer:0,bestCombo:0,eventType:'',eventLabel:'',eventBonus:0,relics:[],biome:BUGBREAK_DATA.biomes[0],contract:null,remotePlayers:{},netPlayers:[],netClock:0,waitingForHost:false,selfRespawnId:0};
  state.contract=makeContract();running=true;paused=false;UI.hideAll();UI.setHud(true);
  if(MP.role==='guest'&&MP.isConnected()){state.waitingForHost=true;state.eventLabel='🌐 WAITING FOR HOST';SFX.startNormal(0);UI.toast('Connected · waiting for the host yard snapshot')}
  else{spawnWave();UI.toast(MP.role==='host'&&MP.isConnected()?'🌐 Shared Yard started · friends can fight with you':'New expedition · art pass, elites, relics & contracts are active')}
}
function waveBoss(){return BUGBREAK_DATA.bosses[state.wave]||null}
function spawnWave(){
  const s=state;s.enemies=[];s.startedWave=true;const boss=waveBoss();s.boss=!!boss;s.bossName=boss?.name||'';s.bossSpawnClock=0;s.biome=BUGBREAK_DATA.biomes[Math.min(4,Math.floor((s.wave-1)/10))];setupWaveEvent();
  if(boss){s.eventLabel=`👑 ${s.biome.name} · BOSS`;UI.bossBanner(true,boss.name);SFX.boss();SFX.startBoss(boss.music||0);setTimeout(()=>UI.bossBanner(false,boss.name),2300);spawnEnemy(boss.type,1,true)}
  else{
    SFX.startNormal(Math.min(4,Math.floor((s.wave-1)/10)));const coop=MP.role==='host'?MP.connectedCount():1;let count=Math.min(32,3+Math.floor(s.wave*.60)+(coop-1)*2);if(s.eventType==='ambush')count+=7;for(let i=0;i<count;i++)spawnEnemy(pickEnemyType(s.wave));if(s.eventType==='aphid')spawnEnemy('aphid');
  }
}
function pickEnemyType(w){const r=Math.random();if(w<3)return'spider';if(w<7)return r<.62?'spider':'beetle';if(w<14)return r<.42?'spider':r<.73?'beetle':'centipede';if(w<20)return r<.30?'spider':r<.56?'beetle':r<.80?'centipede':'roach';return r<.24?'spider':r<.45?'beetle':r<.66?'centipede':r<.84?'roach':'wasp'}
function spawnPoint(){const edge=Math.floor(Math.random()*4);if(edge===0)return{x:rand(-20,W+20),y:-45};if(edge===1)return{x:W+45,y:rand(-20,H+20)};if(edge===2)return{x:rand(-20,W+20),y:H+45};return{x:-45,y:rand(-20,H+20)}}
function spawnEnemy(type='spider',amount=1,isBoss=false){for(let k=0;k<amount;k++){
  const pos=spawnPoint(),w=state.wave,coop=MP.role==='host'?MP.connectedCount():1,hpScale=(1+w*.065+Math.max(0,w-28)*.012)*(1+.16*(coop-1)),dmgScale=1+w*.038;let base={r:18,speed:68+w*.55,hp:38*hpScale,damage:5.4*dmgScale,xp:15,crumbs:3};
  if(type==='beetle')base={r:23,speed:53+w*.44,hp:82*hpScale,damage:7.1*dmgScale,xp:24,crumbs:5};
  if(type==='centipede')base={r:17,speed:104+w*.65,hp:52*hpScale,damage:6.5*dmgScale,xp:22,crumbs:4};
  if(type==='roach')base={r:24,speed:78+w*.52,hp:112*hpScale,damage:8.1*dmgScale,xp:30,crumbs:6};
  if(type==='wasp')base={r:19,speed:126+w*.72,hp:61*hpScale,damage:7.4*dmgScale,xp:28,crumbs:5};
  if(type==='aphid')base={r:18,speed:165,hp:95*hpScale,damage:0,xp:90,crumbs:25};
  if(state.eventType==='feast'&&!isBoss)base.crumbs*=2;
  let elite=false;
  if(!isBoss&&type!=='aphid'&&w>=10){const eliteChance=Math.min(.22,.04+Math.max(0,w-10)*.004); if(Math.random()<eliteChance){elite=true;base.r+=3;base.speed*=1.08;base.hp*=1.85;base.damage*=1.28;base.xp=Math.round(base.xp*1.8);base.crumbs+=4}}
  if(isBoss){
    const mult={mantis:1,hornet:.9,wolfspider:1.12,stag:1.35,scorpion:1.2,empress:1.72}[type]||1,bhp=(430+w*31)*mult*(1+.24*(coop-1));
    base={r:type==='empress'?52:45,speed:74+w*.35,hp:bhp,damage:(9.5+w*.31)*(type==='stag'?1.1:1),xp:210+w*6,crumbs:45+Math.floor(w*1.5)}
  }
  state.enemies.push({x:pos.x,y:pos.y,vx:0,vy:0,angle:0,hitFlash:0,attackCd:rand(.1,.6),type,r:base.r,speed:base.speed,hp:base.hp,maxHp:base.hp,damage:base.damage,xp:base.xp,crumbs:base.crumbs,boss:isBoss,elite,phase:rand(0,TAU),spawnClock:0,color:isBoss?waveBoss()?.color:null,treasure:type==='aphid',life:type==='aphid'?16:999})
}}
function drop(x,y,kind='crumb',value=1){state.drops.push({x,y,kind,value,r:kind==='gem'?10:7,life:14,spin:rand(0,TAU)})}
function particles(x,y,color,count=7,spd=130){for(let i=0;i<count;i++){const a=rand(0,TAU),v=rand(spd*.25,spd);state.particles.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:rand(.28,.7),max:.7,r:rand(2,5),color})}}
function shockwave(x,y,color='#dfff8e'){state.shockwaves.push({x,y,r:8,life:.45,max:.45,color})}
function bite(){
  if(!running||paused||!state||state.player.attackCd>0)return;const p=state.player;p.attackCd=p.attackRate;SFX.bite();state.slashes.push({x:p.x,y:p.y,a:p.angle,life:.14,max:.14});if(MP.role==='guest'&&MP.isConnected()){MP.sendAction('bite',{x:p.x,y:p.y,angle:p.angle,damage:p.damage,range:p.attackRange,id:p.id});return}let hit=false,totalHeal=0;
  for(const e of state.enemies){const d=dist(p,e);if(d<p.attackRange+e.r){const ang=Math.atan2(e.y-p.y,e.x-p.x),dif=Math.atan2(Math.sin(ang-p.angle),Math.cos(ang-p.angle));if(Math.abs(dif)<.82){const crit=Math.random()<p.crit,abilityMult=(state.rallyTimer>0?1.55:1)*(state.bloodTimer>0?1.28:1)*(state.frenzyTimer>0?1.22:1),dmg=p.damage*(crit?1.85:1)*abilityMult*(e.boss?(p.bossDamage||1):1),dealt=Math.max(0,Math.min(e.hp,dmg));e.hp-=dmg;e.hitFlash=.09;const n=norm(e.x-p.x,e.y-p.y);e.x+=n.x*(e.boss?7:14);e.y+=n.y*(e.boss?7:14);particles(e.x,e.y,crit?'#fff2a6':'#f7d6b0',crit?9:5,crit?145:100);totalHeal+=dealt*p.lifesteal;hit=true}}
  }
  if(state.bloodTimer>0)totalHeal+=Math.max(0,state.player.damage*.30);if(totalHeal>0)p.hp=Math.min(p.maxHp,p.hp+totalHeal);if(hit)state.shake=Math.max(state.shake,3)
}
function dash(){if(!running||paused||!state||state.player.dashCd>0)return;const p=state.player;p.dashCd=p.dashCooldown;p.dashTime=.18;SFX.dash();if(MP.role==='guest'&&MP.isConnected())MP.sendAction('dash',{x:p.x,y:p.y,angle:p.angle,id:p.id});for(let i=0;i<12;i++)particles(p.x+rand(-9,9),p.y+rand(-9,9),'#a9f5ff',1,42);if(p.dashShock){for(const e of state.enemies)if(dist(p,e)<105)e.hp-=p.damage*.65;shockwave(p.x,p.y,'#7cecff')}}
function repairNest(){if(!running||paused||!state)return;const s=state,p=s.player,n=s.nest;if(MP.role==='guest'&&MP.isConnected()){if(s.repairCd>0)return;MP.sendAction('repair',{id:p.id});s.repairCd=5;UI.toast('Repair request sent to host');return}if(s.repairCd>0){UI.toast(`Repair recharging: ${s.repairCd.toFixed(1)}s`);return}const cost=p.repairCost||12;if(s.crumbs<cost){UI.toast(`Need ${cost} crumbs to repair`);return}if(n.hp>=n.maxHp-1){UI.toast('Nest is already healthy');return}s.crumbs-=cost;s.repairCd=5;const bonus=p.id==='ladybug'?1.25:1,amt=p.repairAmount*bonus;n.hp=Math.min(n.maxHp,n.hp+amt);SFX.repair();shockwave(n.x,n.y,'#ffd56b');particles(n.x,n.y,'#ffd56b',18,120);UI.reward(`🛠️ Nest repaired +${Math.round(amt)} HP`)}
function levelCheck(){const p=state.player;if(p.xp>=p.nextXp){p.xp-=p.nextXp;p.level++;p.nextXp=Math.round(p.nextXp*1.28);paused=true;SFX.level();const opts=[...BUGBREAK_DATA.mutations].sort(()=>Math.random()-.5).slice(0,3);UI.renderMutations(opts,m=>{m.apply(p);UI.hideAll();paused=false;levelCheck()});UI.show('levelup')}}
function enemyDeath(e){
  const s=state,p=s.player;if(e.escaped){UI.toast('🌟 Golden Aphid escaped!');particles(e.x,e.y,'#fff3a0',12,120);return}s.kills++;s.crumbs+=e.crumbs;p.xp+=e.xp;if(p.killHeal)p.hp=Math.min(p.maxHp,p.hp+p.killHeal);contractProgress('kills',1);contractProgress('crumbs',e.crumbs);
  s.combo=(s.comboTimer>0?s.combo+1:1);s.comboTimer=3.4;s.bestCombo=Math.max(s.bestCombo,s.combo);contractProgress('combo',s.combo,true);
  if(s.combo===10){s.frenzyTimer=6;UI.reward('🔥 x10 COMBO · FRENZY! +22% damage')}
  if(s.combo===20||s.combo===30){s.runGems++;SFX.gem();UI.reward(`🔥 x${s.combo} COMBO · +1 gem!`)}
  if(p.gemEvery&&s.kills%p.gemEvery===0){s.runGems++;SFX.gem();UI.reward('🍞 Crumb Core produced +1 gem')}
  for(let i=0;i<Math.min(8,e.crumbs);i++)drop(e.x+rand(-16,16),e.y+rand(-16,16),'crumb');
  if(e.treasure){s.runGems+=3;UI.reward('🌟 Golden Aphid caught! +3 gems');for(let i=0;i<3;i++)drop(e.x+rand(-20,20),e.y+rand(-20,20),'gem')}
  else if(e.boss){const g=2+Math.floor(s.wave/10);s.runGems+=g;UI.reward(`💎 Boss defeated! +${g} gems`)}
  else{let chance=.08+.015*(save.upgrades.luck||0)+(s.wave<=5?.045:0);if(s.eventType==='fireflies')chance*=2.5;if(Math.random()<chance)drop(e.x,e.y,'gem')}
  particles(e.x,e.y,e.boss?'#ffd76c':e.treasure?'#fff3a0':'#c38a64',e.boss?36:e.treasure?24:12,e.boss?280:155);if(e.boss||e.treasure)shockwave(e.x,e.y,e.treasure?'#fff3a0':'#ffcf67');SFX.hit();levelCheck()
}
function clearWaveRewards(){
  const s=state,p=s.player,n=s.nest,boss=s.boss;p.hp=Math.min(p.maxHp,p.hp+p.maxHp*.27);n.hp=Math.min(n.maxHp,n.hp+n.maxHp*.13+22);let g=s.eventBonus||0;if(s.wave<=5)g+=1;else if(s.wave%3===0)g+=1;if(boss)g+=1;if(g){s.runGems+=g;SFX.gem()}else SFX.waveClear();contractProgress('waves',1);
  save.bestWave=Math.max(save.bestWave,s.wave);persist();rerenderSelect();UI.reward(`Wave ${s.wave} clear · ${s.biome.name}${g?` · 💎 +${g}`:''}`)
}
function nextWave(){const wasBoss=state.boss;clearWaveRewards();if(state.wave>=MAX_WAVE){winRun();return}const advance=()=>{if(!running||!state)return;state.wave++;state.startedWave=false;const start=()=>{if(!running||!state)return;if(paused){setTimeout(start,220);return}spawnWave();UI.toast(`${state.biome.name} · Wave ${state.wave} / ${MAX_WAVE}`)};setTimeout(start,700)};if(wasBoss)offerRelic(advance);else setTimeout(advance,650)}
function statMarkup(s){return`<div><span>Wave reached</span><b>${s.wave}/${MAX_WAVE}</b></div><div><span>Predators defeated</span><b>${s.kills}</b></div><div><span>Crumbs gathered</span><b>${s.crumbs}</b></div><div><span>Gems banked</span><b>+${s.runGems}</b></div><div><span>Best combo</span><b>x${s.bestCombo||0}</b></div><div><span>Relics found</span><b>${s.relics?.length||0}</b></div>`}
function endRun(){if(!running)return;if(MP.role==='host'&&MP.isConnected())MP.broadcastControl('gameover',{wave:state.wave,runGems:state.runGems,kills:state.kills,crumbs:state.crumbs,bestCombo:state.bestCombo,relics:state.relics});running=false;paused=false;SFX.stopBoss();save.gems+=state.runGems;save.bestWave=Math.max(save.bestWave,Math.min(MAX_WAVE,state.wave-1));persist();UI.setHud(false);SFX.death();UI.$('#runStats').innerHTML=statMarkup(state);UI.show('gameover')}
function winRun(){if(!running)return;if(MP.role==='host'&&MP.isConnected())MP.broadcastControl('victory',{wave:MAX_WAVE,runGems:state.runGems,kills:state.kills,crumbs:state.crumbs,bestCombo:state.bestCombo,relics:state.relics});running=false;paused=false;SFX.stopBoss();save.gems+=state.runGems;save.bestWave=MAX_WAVE;persist();UI.setHud(false);SFX.victory();UI.$('#victoryStats').innerHTML=statMarkup(state);UI.show('victory')}

function remoteBite(peerId,d={}){if(!state||!running)return;const r=state.remotePlayers?.[peerId];if(!r)return;const range=Math.min(140,Number(d.range)||88),teamScale=1+Math.min(.95,state.wave*.022),damage=Math.min(160,(Number(d.damage)||26)*teamScale),ang=Number(d.angle)||0;state.slashes.push({x:r.x,y:r.y,a:ang,life:.14,max:.14});for(const e of state.enemies){const dd=Math.hypot(e.x-r.x,e.y-r.y);if(dd<range+e.r){const a=Math.atan2(e.y-r.y,e.x-r.x),dif=Math.atan2(Math.sin(a-ang),Math.cos(a-ang));if(Math.abs(dif)<.9){e.hp-=damage*.9;e.hitFlash=.09;particles(e.x,e.y,'#d8f3ff',5,100)}}}}
function remoteSpecial(peerId,d={}){if(!state||!running)return;const r=state.remotePlayers?.[peerId];if(!r)return;shockwave(r.x,r.y,'#c98cff');for(const e of state.enemies)if(Math.hypot(e.x-r.x,e.y-r.y)<165)e.hp-=Math.min(180,(Number(d.damage)||26)*(1+Math.min(.95,state.wave*.022)))*.80;particles(r.x,r.y,'#d8b7ff',14,140)}
function makeSnapshot(final=''){const s=state;if(!s)return null;return{final,wave:s.wave,crumbs:s.crumbs,runGems:s.runGems,kills:s.kills,bestCombo:s.bestCombo,relics:s.relics||[],boss:s.boss,bossName:s.bossName,eventLabel:s.eventLabel,biomeIndex:Math.max(0,BUGBREAK_DATA.biomes.indexOf(s.biome)),nest:{x:s.nest.x,y:s.nest.y,r:s.nest.r,hp:s.nest.hp,maxHp:s.nest.maxHp},enemies:s.enemies.map(e=>({x:e.x,y:e.y,angle:e.angle,type:e.type,r:e.r,hp:e.hp,maxHp:e.maxHp,boss:e.boss,elite:e.elite,color:e.color,treasure:e.treasure,hitFlash:e.hitFlash||0})),players:[{id:'host',name:MP.getUsername(),x:s.player.x,y:s.player.y,angle:s.player.angle,bug:s.player.id,level:s.player.level,hp:s.player.hp,maxHp:s.player.maxHp,respawnId:0},...Object.entries(s.remotePlayers||{}).map(([id,r])=>({id,name:r.name||'Friend',x:r.x,y:r.y,angle:r.angle||0,bug:r.id||'ant',level:r.level||1,hp:r.hp??r.maxHp??100,maxHp:r.maxHp||100,respawnId:r.respawnId||0}))]}}
function finishGuestRun(kind,s){if(!running)return;running=false;paused=false;SFX.stopMusic();save.gems+=s.runGems||0;save.bestWave=Math.max(save.bestWave,kind==='victory'?MAX_WAVE:Math.min(MAX_WAVE,(s.wave||1)-1));persist();UI.setHud(false);if(kind==='victory'){SFX.victory();UI.$('#victoryStats').innerHTML=statMarkup(s);UI.show('victory')}else{SFX.death();UI.$('#runStats').innerHTML=statMarkup(s);UI.show('gameover')}}
function applySnapshot(a){if(!state||MP.role!=='guest')return;const s=state,p=s.player;s.waitingForHost=false;s.wave=a.wave||s.wave;s.crumbs=a.crumbs||0;s.runGems=a.runGems||0;s.kills=a.kills||0;s.bestCombo=a.bestCombo||0;s.relics=a.relics||[];s.boss=!!a.boss;s.bossName=a.bossName||'';s.eventLabel=a.eventLabel||'';s.biome=BUGBREAK_DATA.biomes[a.biomeIndex||0]||BUGBREAK_DATA.biomes[0];if(a.nest)s.nest={...s.nest,...a.nest};s.enemies=(a.enemies||[]).map(e=>({...e,phase:0,spawnClock:0,attackCd:0,life:999}));const self=(a.players||[]).find(r=>r.id===MP.selfId);if(self){p.hp=clamp(Number(self.hp)||1,0,p.maxHp);if(self.respawnId!==s.selfRespawnId){s.selfRespawnId=self.respawnId||0;p.x=self.x;p.y=self.y;p.hp=Math.max(1,Number(self.hp)||p.maxHp*.65);UI.toast('🌿 You regrew at the nest')}}s.netPlayers=(a.players||[]).filter(r=>r.id!==MP.selfId);if(a.final){finishGuestRun(a.final,s);return}if(s.boss)SFX.startBoss((BUGBREAK_DATA.bosses[s.wave]?.music)||0);else SFX.startNormal(Math.min(4,Math.floor((s.wave-1)/10)));p.level=Math.max(p.level,1+Math.floor((s.wave-1)/3))}
MP.bind({
  onPlayerState(id,d){if(!state||!running||MP.role!=='host')return;const prev=state.remotePlayers[id]||{},bug=BUGBREAK_DATA.bugs[d.id]||BUGBREAK_DATA.bugs.ant,maxHp=prev.maxHp||clamp(Number(d.maxHp)||bug.hp,60,600),hp=prev.hp==null?maxHp:prev.hp;state.remotePlayers[id]={...prev,...d,name:(d.name||prev.name||'Friend').slice(0,16),maxHp,hp,r:20,respawnId:prev.respawnId||0,last:performance.now()}},
  onAction(id,action,d){if(!state||!running||MP.role!=='host')return;if(action==='bite')remoteBite(id,d);else if(action==='dash'){const r=state.remotePlayers?.[id];if(r)particles(r.x,r.y,'#a9f5ff',10,80)}else if(action==='special')remoteSpecial(id,d);else if(action==='repair'&&state.crumbs>=12){state.crumbs-=12;state.nest.hp=Math.min(state.nest.maxHp,state.nest.hp+95);shockwave(state.nest.x,state.nest.y,'#ffd56b')}},
  onSnapshot:applySnapshot,
  onControl(event,d){
    if(MP.role!=='guest')return;
    if(event==='startRun'){
      if(!running||!state)newRun();
      UI.hideAll();UI.setHud(true);
      if(state){state.waitingForHost=true;state.eventLabel=d?.lateJoin?'🌐 JOINING HOST RUN':'🌐 SHARED EXPEDITION STARTING'}
      UI.toast(d?.lateJoin?'🌐 Joining the expedition already in progress…':'🌐 Host started the shared expedition!');
      return
    }
    if(!state)return;
    for(const k of ['wave','runGems','kills','crumbs','bestCombo'])if(d[k]!=null)state[k]=d[k];
    if(Array.isArray(d.relics))state.relics=d.relics;
    if(event==='victory'||event==='gameover')finishGuestRun(event==='victory'?'victory':'gameover',state)
  }
});

function update(dt){
  if(!state||!running||paused)return;const s=state,p=s.player,n=s.nest;s.time+=dt;s.repairCd=Math.max(0,s.repairCd-dt);s.abilityCd=Math.max(0,s.abilityCd-dt);for(const k of ['rallyTimer','fortifyTimer','shieldTimer','hyperTimer','bloodTimer','frenzyTimer'])s[k]=Math.max(0,(s[k]||0)-dt);s.comboTimer=Math.max(0,s.comboTimer-dt);if(s.comboTimer<=0)s.combo=0;p.attackCd=Math.max(0,p.attackCd-dt*(s.hyperTimer>0?2.15:1));p.dashCd=Math.max(0,p.dashCd-dt);p.dashTime=Math.max(0,p.dashTime-dt);
  let mx=(keys.ArrowRight||keys.KeyD?1:0)-(keys.ArrowLeft||keys.KeyA?1:0)+touchMove.x,my=(keys.ArrowDown||keys.KeyS?1:0)-(keys.ArrowUp||keys.KeyW?1:0)+touchMove.y;if(mx||my){const q=norm(mx,my);mx=q.x;my=q.y;p.angle=Math.atan2(my,mx)}
  const sp=(p.dashTime>0?p.dashPower:p.speed)*(s.hyperTimer>0?1.45:1)*(s.eventType==='rush'?1.13:1);p.x=clamp(p.x+mx*sp*dt,24,W-24);p.y=clamp(p.y+my*sp*dt,24,H-24);if(keys.Space||keys.KeyJ)bite();if(keys.ShiftLeft||keys.ShiftRight||keys.KeyK)dash();if(keys.KeyR){keys.KeyR=false;repairNest()}if(keys.KeyE||keys.KeyL){keys.KeyE=false;keys.KeyL=false;useAbility()}
  if(MP.role==='guest'&&MP.isConnected()){s.netClock=(s.netClock||0)+dt;if(s.netClock>=.05){s.netClock=0;MP.sendPlayer({name:MP.getUsername(),x:p.x,y:p.y,angle:p.angle,id:p.id,level:p.level,damage:p.damage,range:p.attackRange,maxHp:p.maxHp})}for(const z of s.particles){z.life-=dt;z.x+=z.vx*dt;z.y+=z.vy*dt;z.vx*=.94;z.vy*=.94}s.particles=s.particles.filter(z=>z.life>0);for(const a of s.slashes)a.life-=dt;s.slashes=s.slashes.filter(a=>a.life>0);for(const q of s.shockwaves){q.life-=dt;q.r+=220*dt}s.shockwaves=s.shockwaves.filter(q=>q.life>0);s.shake*=.84;UI.updateHud(s);return}
  s.regenClock+=dt;if(s.regenClock>=1){s.regenClock-=1;const regen=p.nestRegen+(p.id==='ladybug'?1.25:0);if(regen)n.hp=Math.min(n.maxHp,n.hp+regen);if(p.selfRegen)p.hp=Math.min(p.maxHp,p.hp+p.selfRegen)}
  for(const e of s.enemies){
    e.hitFlash=Math.max(0,e.hitFlash-dt);e.attackCd=Math.max(0,e.attackCd-dt);e.phase+=dt;e.spawnClock+=dt;e.life-=dt;if(e.treasure&&e.life<=0){e.escaped=true;e.hp=0;continue}let target=p,targetKind='host',near=dist(e,p);if(MP.role==='host'){for(const r of Object.values(s.remotePlayers||{})){if(!r||r.hp<=0)continue;const rd=Math.hypot(e.x-r.x,e.y-r.y);if(rd<near){near=rd;target=r;targetKind='remote'}}}if(near>=225){target=n;targetKind='nest'}let q=e.treasure?norm(e.x-p.x,e.y-p.y):norm(target.x-e.x,target.y-e.y);e.angle=Math.atan2(q.y,q.x);let es=e.speed*(s.eventType==='rush'?1.08:1); if(e.elite) es*=1.04;
    if(e.boss){if(Math.sin(e.phase*1.32)>.91)es*=1.52;if(e.hp<e.maxHp*.38)es*=1.12;if(state.wave>=20&&e.spawnClock>8.2&&s.enemies.length<7){e.spawnClock=0;spawnEnemy(state.wave>=35?'wasp':'spider',state.wave>=40?2:1);UI.toast(`${state.bossName} called reinforcements!`)}}
    if(e.type==='wasp'||e.type==='hornet')e.y+=Math.sin(e.phase*5)*10*dt;e.x+=q.x*es*dt;e.y+=q.y*es*dt;const hitD=e.r+(targetKind==='nest'?n.r:20);
    if(!e.treasure&&dist(e,target)<hitD&&e.attackCd<=0){e.attackCd=e.boss?.82:(e.type==='wasp'?1.2:1.08);let dmg=e.damage*(e.boss&&e.hp<e.maxHp*.38?1.12:1)*(e.elite?1.1:1);if(targetKind==='nest'){dmg*=Math.max(.38,1-p.nestDR);if(s.fortifyTimer>0)dmg*=.34;if(s.shieldTimer>0)dmg*=.52}else if(targetKind==='host'){if(s.shieldTimer>0)dmg*=.45;if(p.blockEvery&&++p.hitCounter%p.blockEvery===0){dmg=0;UI.toast('💠 Prism Shell blocked the hit!')}}target.hp-=dmg;if(targetKind==='remote'&&target.hp<=0){target.hp=Math.max(1,(target.maxHp||120)*.65);target.x=n.x+rand(-65,65);target.y=n.y+rand(-65,65);target.respawnId=(target.respawnId||0)+1;UI.toast(`🌿 ${target.name||'Friend'} was knocked out and regrew`)}if(targetKind==='host'){SFX.hit();s.shake=Math.max(s.shake,5)}else s.shake=Math.max(s.shake,2);particles(target.x,target.y,targetKind==='host'?'#ff8874':targetKind==='remote'?'#c9b5ff':'#8be7d2',6,90)}
  }
  const dead=s.enemies.filter(e=>e.hp<=0);dead.forEach(enemyDeath);s.enemies=s.enemies.filter(e=>e.hp>0);
  for(const d of s.drops){d.life-=dt;d.spin+=dt*5;if(dist(d,p)<p.pickupRadius){const q=norm(p.x-d.x,p.y-d.y);d.x+=q.x*390*dt;d.y+=q.y*390*dt}if(dist(d,p)<p.r+d.r+5){d.life=0;if(d.kind==='gem'){s.runGems+=d.value||1;SFX.gem()}else SFX.pickup()}}
  s.drops=s.drops.filter(d=>d.life>0);for(const z of s.particles){z.life-=dt;z.x+=z.vx*dt;z.y+=z.vy*dt;z.vx*=.94;z.vy*=.94}s.particles=s.particles.filter(z=>z.life>0);for(const a of s.slashes)a.life-=dt;s.slashes=s.slashes.filter(a=>a.life>0);for(const q of s.shockwaves){q.life-=dt;q.r+=220*dt}s.shockwaves=s.shockwaves.filter(q=>q.life>0);s.shake*=.84;
  if(MP.role==='host'){for(const [id,r] of Object.entries(s.remotePlayers||{}))if(performance.now()-(r.last||0)>5000)delete s.remotePlayers[id]}
  if(MP.role==='host'&&MP.isConnected()){s.netClock=(s.netClock||0)+dt;if(s.netClock>=.09){s.netClock=0;MP.broadcastSnapshot(makeSnapshot())}}
  if(p.hp<=0||n.hp<=0)endRun();else if(s.startedWave&&s.enemies.length===0){s.startedWave=false;nextWave()}UI.updateHud(s)
}

function rr(x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r)}
function ellipse(x,y,rx,ry,fill){ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,TAU);if(fill)ctx.fill()}
function bugOutline(color='rgba(20,12,10,.45)',w=2){ctx.strokeStyle=color;ctx.lineWidth=w;ctx.lineJoin='round';ctx.lineCap='round'}
function drawStem(x,y,h,bend=0,col='rgba(88,130,66,.34)'){ctx.strokeStyle=col;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x,y);ctx.quadraticCurveTo(x+bend,y-h*.45,x,y-h);ctx.stroke()}
function drawMap(t){
  const bio=state?.biome||BUGBREAK_DATA.biomes[0], idx=BUGBREAK_DATA.biomes.indexOf(bio), evening=idx===2||idx===4;
  const g=ctx.createLinearGradient(0,0,0,H);
  g.addColorStop(0,bio.sky); g.addColorStop(.55,bio.sky); g.addColorStop(1,bio.edge); ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
  const haze=ctx.createRadialGradient(W*.52,H*.48,40,W*.5,H*.45,840); haze.addColorStop(0,'rgba(255,255,255,.08)'); haze.addColorStop(1,'rgba(0,0,0,0)'); ctx.fillStyle=haze; ctx.fillRect(0,0,W,H);
  ctx.save(); ctx.fillStyle='rgba(56,37,27,.78)'; for(let x=-12;x<W+40;x+=64){rr(x,-10,58,74,8);ctx.fill();ctx.fillStyle='rgba(153,109,69,.20)';ctx.fillRect(x+9,4,5,55);ctx.fillStyle='rgba(56,37,27,.78)'} ctx.fillStyle='rgba(30,20,16,.38)';ctx.fillRect(0,50,W,15); ctx.restore();
  ctx.save(); const pg=ctx.createRadialGradient(180,155,10,180,155,136); pg.addColorStop(0,'rgba(122,215,206,.58)'); pg.addColorStop(1,'rgba(20,89,95,.48)'); ctx.fillStyle=pg; ctx.beginPath(); ctx.ellipse(164,162,148,94,-.15,0,TAU); ctx.fill(); ctx.strokeStyle='rgba(182,238,227,.2)'; ctx.lineWidth=5; ctx.stroke(); for(let i=0;i<6;i++){ctx.fillStyle='rgba(82,136,72,.72)';ctx.beginPath();ctx.ellipse(92+i*38,148+Math.sin(i)*18,11+i%2*5,8+i%2*3,0,0,TAU);ctx.fill()} ctx.restore();
  ctx.save(); ctx.globalAlpha=.34; ctx.strokeStyle='#9c7549'; ctx.lineWidth=86; ctx.lineCap='round'; ctx.beginPath(); ctx.moveTo(-70,H*.79); ctx.bezierCurveTo(W*.18,H*.72,W*.28,H*.32,W*.5,H*.56); ctx.bezierCurveTo(W*.72,H*.76,W*.84,H*.30,W+70,H*.39); ctx.stroke(); ctx.globalAlpha=.11; ctx.strokeStyle='#f0d3a1'; ctx.lineWidth=3; ctx.setLineDash([4,14]); ctx.stroke(); ctx.setLineDash([]); ctx.restore();
  for(const d of deco){ if(d.y<72) continue; ctx.save(); ctx.translate(d.x,d.y); ctx.rotate(d.rot); if(d.t<.46){ ctx.strokeStyle=`rgba(${68+Math.floor(d.h*40)},${138+Math.floor(d.h*55)},${66+Math.floor(d.h*18)},${.25+d.t*.28})`; ctx.lineWidth=1.6; ctx.beginPath(); ctx.moveTo(0,d.r*.9); ctx.quadraticCurveTo(5,-d.r*.1,0,-d.r); ctx.moveTo(1,d.r*.5); ctx.quadraticCurveTo(8,-d.r*.18,7,-d.r*.66); ctx.stroke(); } else if(d.t<.72){ ctx.fillStyle='rgba(75,124,62,.46)'; ctx.beginPath(); ctx.ellipse(-4,0,8,3,-.6,0,TAU); ctx.ellipse(5,-2,8,3,.45,0,TAU); ctx.fill(); } else if(d.t<.86){ ctx.fillStyle='rgba(177,111,62,.28)'; ctx.beginPath(); ctx.ellipse(0,0,d.r*.68,d.r*.26,0,0,TAU); ctx.fill(); } else { const cols=['rgba(255,214,97,.78)','rgba(255,145,188,.72)','rgba(203,231,255,.72)','rgba(255,173,105,.68)']; ctx.fillStyle=cols[Math.floor(d.h*cols.length)%cols.length]; for(let a=0;a<TAU;a+=TAU/6){ ctx.beginPath(); ctx.ellipse(Math.cos(a)*4,Math.sin(a)*4,3.2,2.5,0,0,TAU); ctx.fill() } ctx.fillStyle='rgba(255,240,128,.84)'; ctx.beginPath(); ctx.arc(0,0,2.3,0,TAU); ctx.fill(); } ctx.restore(); }
  for(const s of stones){ ctx.save(); ctx.translate(s.x,s.y); ctx.rotate(s.rot); const sg=ctx.createLinearGradient(-s.rx,-s.ry,s.rx,s.ry); sg.addColorStop(0,`rgba(154,165,143,${.18*s.v})`); sg.addColorStop(1,`rgba(51,74,58,${.34*s.v})`); ctx.fillStyle=sg; ctx.shadowColor='rgba(0,0,0,.18)'; ctx.shadowBlur=6; ctx.beginPath(); ctx.ellipse(0,0,s.rx,s.ry,0,0,TAU); ctx.fill(); ctx.restore(); }
  ctx.save(); ctx.translate(1060,575); ctx.rotate(-.22); ctx.shadowColor='rgba(0,0,0,.3)'; ctx.shadowBlur=14; ctx.fillStyle='#4a2f21'; rr(-124,-33,248,66,28); ctx.fill(); const lg=ctx.createLinearGradient(0,-30,0,30); lg.addColorStop(0,'#7b5236'); lg.addColorStop(1,'#4c2f21'); ctx.fillStyle=lg; rr(-116,-26,224,52,23); ctx.fill(); ctx.fillStyle='rgba(35,21,14,.36)'; for(let i=-88;i<94;i+=29)ctx.fillRect(i,-24,4,48); ctx.fillStyle='#b57b46'; ctx.beginPath(); ctx.ellipse(110,0,26,29,0,0,TAU); ctx.fill(); ctx.strokeStyle='#6b452a'; ctx.lineWidth=3; ctx.beginPath(); ctx.arc(110,0,16,0,TAU); ctx.stroke(); ctx.restore();
  for(const [x,y,s] of [[180,578,1],[226,598,.7],[1130,168,.9],[1190,535,.8]]){ ctx.save(); ctx.translate(x,y); ctx.scale(s,s); ctx.fillStyle='#dbcfa1'; rr(-5,-2,10,25,4); ctx.fill(); ctx.fillStyle='#bd5f48'; ctx.beginPath(); ctx.ellipse(0,0,23,11,0,Math.PI,TAU); ctx.fill(); ctx.fillStyle='rgba(255,237,192,.7)'; for(const px of [-8,4,10]){ctx.beginPath();ctx.arc(px,-4,2,0,TAU);ctx.fill()} ctx.restore(); }
  ctx.save(); ctx.translate(916,128); ctx.rotate(.35); ctx.fillStyle='#84542f'; ctx.beginPath(); ctx.ellipse(0,8,17,22,0,0,TAU); ctx.fill(); ctx.fillStyle='#4d3925'; ctx.beginPath(); ctx.ellipse(0,-5,19,9,0,0,TAU); ctx.fill(); ctx.fillRect(-2,-18,4,11); ctx.restore();
  for(let i=0;i<7;i++) drawStem(250+i*115,H-16,90+Math.sin(i+t*.2)*18,(i%2?16:-12));
  // biome-specific scenery so each 10-wave zone feels like a new place
  if(idx===0){for(const [x,y,sc] of [[330,180,1],[390,610,.8],[760,155,.9],[1010,360,.75]]){ctx.save();ctx.translate(x,y);ctx.scale(sc,sc);ctx.fillStyle='rgba(83,158,72,.72)';for(let a=0;a<TAU;a+=TAU/4){ctx.save();ctx.rotate(a);ctx.beginPath();ctx.ellipse(9,0,12,8,-.35,0,TAU);ctx.fill();ctx.restore()}ctx.fillStyle='rgba(198,255,153,.35)';ctx.beginPath();ctx.arc(0,0,4,0,TAU);ctx.fill();ctx.restore()}}
  if(idx===1){for(const [x,y,c,sc] of [[330,145,'#ff8db5',1.2],[880,160,'#ffd35e',1],[1120,330,'#9cc7ff',1.1],[330,560,'#f19aff',.9]]){ctx.save();ctx.translate(x,y);ctx.scale(sc,sc);ctx.shadowColor=c;ctx.shadowBlur=9;ctx.fillStyle=c;for(let a=0;a<TAU;a+=TAU/7){ctx.beginPath();ctx.ellipse(Math.cos(a)*16,Math.sin(a)*16,11,6,a,0,TAU);ctx.fill()}ctx.shadowBlur=0;ctx.fillStyle='#ffe78c';ctx.beginPath();ctx.arc(0,0,7,0,TAU);ctx.fill();ctx.restore()}for(let i=0;i<18;i++){ctx.fillStyle=`rgba(255,${130+i*4},190,.16)`;ctx.beginPath();ctx.ellipse(250+(i*61)%850,90+(i*83)%540,5,2,(i*.7)%TAU,0,TAU);ctx.fill()}}
  if(idx===2){const moon=ctx.createRadialGradient(1080,118,5,1080,118,110);moon.addColorStop(0,'rgba(215,240,255,.32)');moon.addColorStop(1,'rgba(160,200,255,0)');ctx.fillStyle=moon;ctx.fillRect(950,0,260,250);for(let i=0;i<32;i++){const x=(i*173)%W,y=82+(i*97)%520;ctx.fillStyle=`rgba(185,225,255,${.05+(i%4)*.025})`;ctx.beginPath();ctx.arc(x,y,1.2+(i%3)*.7,0,TAU);ctx.fill()}for(const [x,y] of [[420,220],[845,510],[1040,270]]){ctx.strokeStyle='rgba(151,216,255,.26)';ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y,22,0,TAU);ctx.stroke();ctx.beginPath();ctx.arc(x,y,13,0,TAU);ctx.stroke()}}
  if(idx===3){for(const [x,y,r,c] of [[350,180,55,'#70512e'],[920,520,72,'#594329'],[1110,250,48,'#806139']]){ctx.fillStyle=c;for(let i=0;i<8;i++){ctx.save();ctx.translate(x+Math.cos(i)*r*.38,y+Math.sin(i*1.7)*r*.25);ctx.rotate(i*.8);ctx.beginPath();ctx.ellipse(0,0,r*.55,r*.17,0,0,TAU);ctx.fill();ctx.restore()}}ctx.save();ctx.translate(720,150);ctx.rotate(.4);ctx.fillStyle='#b8a15a';ctx.beginPath();ctx.ellipse(0,0,24,16,0,0,TAU);ctx.fill();ctx.fillStyle='#6f5b31';ctx.beginPath();ctx.arc(-8,0,8,0,TAU);ctx.arc(9,0,8,0,TAU);ctx.fill();ctx.restore()}
  if(idx===4){ctx.save();ctx.globalAlpha=.34;ctx.fillStyle='#6f7780';for(let y=500;y<H+50;y+=54){ctx.fillRect(0,y,W,49);ctx.fillStyle='rgba(255,255,255,.055)';ctx.fillRect(0,y, W,2);ctx.fillStyle='#6f7780'}ctx.restore();const lamp=ctx.createRadialGradient(1050,150,10,1050,150,190);lamp.addColorStop(0,'rgba(255,205,104,.32)');lamp.addColorStop(1,'rgba(255,205,104,0)');ctx.fillStyle=lamp;ctx.fillRect(850,0,400,360);ctx.fillStyle='#332b25';rr(1027,82,46,76,9);ctx.fill();ctx.fillStyle='rgba(255,218,126,.75)';rr(1035,95,30,42,6);ctx.fill()}
  if(evening){ ctx.fillStyle='rgba(91,124,173,.10)'; ctx.fillRect(0,0,W,H) }
  for(const f of fireflies){ const a=.18+.22*(.5+.5*Math.sin(t*2*f.s+f.p)); ctx.fillStyle=`rgba(214,255,104,${a})`; ctx.shadowColor='rgba(214,255,104,.8)'; ctx.shadowBlur=10; ctx.beginPath(); ctx.arc(f.x+Math.sin(t*f.s+f.p)*18,f.y+Math.cos(t*f.s*.7+f.p)*12,1.7,0,TAU); ctx.fill(); ctx.shadowBlur=0 }
}
function bodyShadow(x,y,rx=25,ry=13){ctx.save();ctx.globalAlpha=.24;ctx.fillStyle='#000';ctx.beginPath();ctx.ellipse(x+4,y+8,rx,ry,0,0,TAU);ctx.fill();ctx.restore()}
function drawNest(n){ctx.save();ctx.translate(n.x,n.y);const pulse=1+Math.sin(performance.now()/470)*.018;ctx.scale(pulse,pulse);ctx.shadowColor='rgba(0,0,0,.32)';ctx.shadowBlur=18;for(let i=0;i<5;i++){const ng=ctx.createLinearGradient(0,-35,0,35);ng.addColorStop(0,`rgba(111,78,46,${.38+i*.07})`);ng.addColorStop(1,`rgba(43,29,20,${.46+i*.06})`);ctx.fillStyle=ng;ctx.beginPath();ctx.ellipse(0,13-i*7,86-i*12,39-i*4,0,0,TAU);ctx.fill()}ctx.shadowBlur=0;ctx.fillStyle='#20150f';ctx.beginPath();ctx.ellipse(0,-5,33,19,0,0,TAU);ctx.fill();ctx.strokeStyle='rgba(125,255,193,.32)';ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,0,69,0,TAU);ctx.stroke();for(let i=0;i<4;i++){const a=performance.now()/900+i*TAU/4;ctx.fillStyle='rgba(218,183,126,.7)';ctx.beginPath();ctx.arc(Math.cos(a)*53,Math.sin(a)*25,3,0,TAU);ctx.fill()}ctx.restore()}
function localLegs(col='#241d18',wide=false){ctx.strokeStyle=col;ctx.lineWidth=wide?3:2;ctx.lineCap='round';for(const sy of[-1,1])for(let i=-1;i<=1;i++){ctx.beginPath();ctx.moveTo(i*8,sy*6);ctx.lineTo(i*9+3,sy*(15+Math.abs(i)*2));ctx.lineTo(i*12+8,sy*(21+Math.abs(i)*3));ctx.stroke()}}
function bugShine(x,y,w,h,rot=-.25,a=.28){ctx.save();ctx.rotate(rot);ctx.fillStyle=`rgba(255,255,255,${a})`;ctx.beginPath();ctx.ellipse(x,y,w,h,0,0,TAU);ctx.fill();ctx.restore()}
function drawAnt(p){bodyShadow(p.x,p.y,29,14);ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.angle);localLegs('#40261f',true);const g=ctx.createLinearGradient(-34,-12,34,14);g.addColorStop(0,'#5b2b27');g.addColorStop(.55,p.color);g.addColorStop(1,'#de835d');ctx.fillStyle=g;bugOutline();for(const [x,rx,ry] of [[-20,15,12],[-1,11,10],[23,13,12]]){ctx.beginPath();ctx.ellipse(x,0,rx,ry,0,0,TAU);ctx.fill();ctx.stroke()} ctx.strokeStyle='#61352b';ctx.lineWidth=2.6; for(const sy of[-1,1]){ctx.beginPath();ctx.moveTo(27,sy*6);ctx.quadraticCurveTo(39,sy*16,48,sy*12);ctx.stroke();ctx.beginPath();ctx.moveTo(18,sy*9);ctx.lineTo(26,sy*17);ctx.stroke()} ctx.fillStyle='#1a1310';ctx.beginPath();ctx.arc(25,-5,2.3,0,TAU);ctx.arc(25,5,2.3,0,TAU);ctx.fill(); bugShine(-18,-5,8,2.5,-.25,.35); ctx.restore()}
function drawTermite(p){bodyShadow(p.x,p.y,33,15);ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.angle);localLegs('#7b583c',true);const g=ctx.createLinearGradient(-36,-11,36,11);g.addColorStop(0,'#d8c69d');g.addColorStop(.55,'#f1e2bd');g.addColorStop(1,'#bf936b');ctx.fillStyle=g;bugOutline('rgba(96,64,42,.55)',1.8);for(const [x,rx,ry]of[[-19,16,13],[2,13,12],[24,15,14]]){ctx.beginPath();ctx.ellipse(x,0,rx,ry,0,0,TAU);ctx.fill();ctx.stroke()} ctx.fillStyle='#9c6242';ctx.shadowColor='rgba(122,68,41,.38)';ctx.shadowBlur=6;for(const sy of[-1,1]){ctx.beginPath();ctx.moveTo(30,sy*7);ctx.quadraticCurveTo(60,sy*24,50,sy*2);ctx.quadraticCurveTo(44,sy*8,30,0);ctx.closePath();ctx.fill()}ctx.shadowBlur=0;ctx.fillStyle='#1f1610';ctx.beginPath();ctx.arc(27,-4,1.7,0,TAU);ctx.arc(27,4,1.7,0,TAU);ctx.fill();bugShine(-20,-4,8,2.8,-.2,.26);ctx.restore()}
function drawLadybug(p){bodyShadow(p.x,p.y,31,17);ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.angle);localLegs('#191414',true);ctx.fillStyle='#131416';ctx.beginPath();ctx.ellipse(-16,0,12,11,0,0,TAU);ctx.fill();const g=ctx.createLinearGradient(-9,-18,27,18);g.addColorStop(0,'#ff7568');g.addColorStop(1,'#901523');ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(10,0,27,19,0,0,TAU);ctx.fill();bugOutline('rgba(34,20,22,.7)',2.2);ctx.beginPath();ctx.moveTo(9,-18);ctx.lineTo(9,18);ctx.stroke();ctx.fillStyle='#181818';for(const [x,y,r]of[[-1,-8,4.3],[-1,8,3.4],[18,-9,3.6],[20,8,4],[9,0,3]]){ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fill()} bugShine(0,-11,10,3.2,-.2,.30); ctx.fillStyle='#ecf4e8';ctx.beginPath();ctx.arc(-21,-4,1.9,0,TAU);ctx.arc(-21,4,1.9,0,TAU);ctx.fill();ctx.restore()}
function drawFly(p){bodyShadow(p.x,p.y,29,15);ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.angle);ctx.globalAlpha=.5;ctx.fillStyle='#d5fbff';ctx.strokeStyle='rgba(110,171,184,.48)';for(const sy of[-1,1]){ctx.beginPath();ctx.ellipse(-3,sy*15,23,9,sy*.42,0,TAU);ctx.fill();ctx.stroke()}ctx.globalAlpha=1;localLegs('#1b2b2d');const g=ctx.createLinearGradient(-25,-10,25,10);g.addColorStop(0,'#24353a');g.addColorStop(1,'#748b88');ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(-13,0,16,12,0,0,TAU);ctx.ellipse(9,0,15,14,0,0,TAU);ctx.fill();ctx.fillStyle='#c9565e';ctx.shadowColor='#eb6b73';ctx.shadowBlur=7;ctx.beginPath();ctx.arc(17,-5,5.4,0,TAU);ctx.arc(17,5,5.4,0,TAU);ctx.fill();ctx.shadowBlur=0;bugShine(-11,-4,6,2.3,-.25,.23);ctx.restore()}
function drawMosquito(p){bodyShadow(p.x,p.y,30,12);ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.angle);ctx.strokeStyle='#4d4036';ctx.lineWidth=1.7;for(const sy of[-1,1])for(let i=-1;i<=1;i++){ctx.beginPath();ctx.moveTo(i*5,sy*3);ctx.lineTo(i*7-4,sy*(15+i*2));ctx.lineTo(i*12-10,sy*(26+i*3));ctx.stroke()}ctx.globalAlpha=.46;ctx.fillStyle='#ddfaf2';for(const sy of[-1,1]){ctx.beginPath();ctx.ellipse(-6,sy*12,23,6,sy*.25,0,TAU);ctx.fill()}ctx.globalAlpha=1;ctx.fillStyle='#725d49';ctx.beginPath();ctx.ellipse(-13,0,18,7,0,0,TAU);ctx.ellipse(7,0,10,8,0,0,TAU);ctx.arc(21,0,8,0,TAU);ctx.fill();ctx.strokeStyle='#9a7559';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(28,0);ctx.lineTo(54,0);ctx.stroke();ctx.fillStyle='#be5961';ctx.beginPath();ctx.arc(22,-3,2.6,0,TAU);ctx.arc(22,3,2.6,0,TAU);ctx.fill();bugShine(-14,-2,6,2.2,-.1,.18);ctx.restore()}
function drawBumblebee(p){bodyShadow(p.x,p.y,31,16);ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.angle);localLegs('#33281f',true);ctx.globalAlpha=.44;ctx.fillStyle='#e1f6ff';ctx.strokeStyle='rgba(124,168,177,.5)';for(const sy of[-1,1]){ctx.beginPath();ctx.ellipse(-4,sy*16,24,9,sy*.38,0,TAU);ctx.fill();ctx.stroke()}ctx.globalAlpha=1;const g=ctx.createLinearGradient(-28,-12,25,12);g.addColorStop(0,'#f0c74b');g.addColorStop(.5,'#d69d22');g.addColorStop(1,'#7e5720');ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(-8,0,24,15,0,0,TAU);ctx.arc(18,0,13,0,TAU);ctx.fill();ctx.fillStyle='#28221b';for(const x of[-17,-2,11])ctx.fillRect(x,-13,7,26);ctx.fillStyle='#513423';ctx.beginPath();ctx.moveTo(-31,0);ctx.lineTo(-43,-4);ctx.lineTo(-42,4);ctx.closePath();ctx.fill();ctx.fillStyle='#1d1612';ctx.beginPath();ctx.arc(23,-5,2.5,0,TAU);ctx.arc(23,5,2.5,0,TAU);ctx.fill();bugShine(-14,-7,8,2.5,-.2,.24);ctx.restore()}
function drawStagPlayer(p){bodyShadow(p.x,p.y,35,18);ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.angle);localLegs('#2b1918',true);const g=ctx.createLinearGradient(-36,-15,35,15);g.addColorStop(0,'#2c1c1b');g.addColorStop(.55,'#57322c');g.addColorStop(1,'#9d5b42');ctx.fillStyle=g;bugOutline('rgba(20,10,10,.65)',2);ctx.beginPath();ctx.ellipse(-13,0,27,19,0,0,TAU);ctx.arc(22,0,16,0,TAU);ctx.fill();ctx.stroke();ctx.strokeStyle='#3a201c';ctx.lineWidth=5;for(const sy of[-1,1]){ctx.beginPath();ctx.moveTo(31,sy*6);ctx.quadraticCurveTo(56,sy*25,63,sy*6);ctx.quadraticCurveTo(51,sy*14,42,0);ctx.stroke();ctx.beginPath();ctx.moveTo(50,sy*14);ctx.lineTo(58,sy*23);ctx.stroke()}ctx.fillStyle='#d69a65';ctx.beginPath();ctx.arc(27,-4,1.8,0,TAU);ctx.arc(27,4,1.8,0,TAU);ctx.fill();bugShine(-17,-8,9,2.8,-.25,.18);ctx.restore()}
function drawPlayer(p){if(p.id==='termite')drawTermite(p);else if(p.id==='ladybug')drawLadybug(p);else if(p.id==='fly')drawFly(p);else if(p.id==='mosquito')drawMosquito(p);else if(p.id==='bumblebee')drawBumblebee(p);else if(p.id==='stagbeetle')drawStagPlayer(p);else drawAnt(p);if(p.dashTime>0){ctx.strokeStyle='rgba(123,239,255,.55)';ctx.lineWidth=3;ctx.beginPath();ctx.arc(p.x,p.y,p.r+12,0,TAU);ctx.stroke()}}
function enemyShadow(e){bodyShadow(e.x,e.y,e.r*1.15,e.r*.55)}
function drawRemotePlayer(r){if(!r)return;const p={x:r.x,y:r.y,angle:r.angle||0,id:r.bug||r.id||'ant',color:BUGBREAK_DATA.bugs[r.bug||r.id]?.color||'#a84d3e'};drawPlayer(p);ctx.save();ctx.textAlign='center';ctx.font='900 12px system-ui';ctx.lineWidth=4;ctx.strokeStyle='rgba(0,0,0,.65)';ctx.strokeText((r.name||'Friend').slice(0,16),r.x,r.y-31);ctx.fillStyle='#e8fbff';ctx.fillText((r.name||'Friend').slice(0,16),r.x,r.y-31);ctx.restore()}
function drawBossBody(e){
  const hit=e.hitFlash>0, base=hit?'#fff':e.color||'#6b803a';
  ctx.save();
  if(e.type==='wolfspider'){
    for(const sy of[-1,1])for(let i=0;i<4;i++){
      const ax=-15+i*11, y1=sy*(10+i*2), x2=-39+i*14, y2=sy*(27+i*5), x3=-55+i*18, y3=sy*(38+i*7);
      ctx.strokeStyle=hit?'#fff':'#4b312c';ctx.lineWidth=6-i*.45;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(ax,y1);ctx.lineTo(x2,y2);ctx.lineTo(x3,y3);ctx.stroke();
      ctx.fillStyle=hit?'#fff':'#765044';ctx.beginPath();ctx.arc(x2,y2,3.4,0,TAU);ctx.fill();
      ctx.strokeStyle='rgba(24,13,14,.65)';ctx.lineWidth=1;for(let h=0;h<3;h++){const hx=x2+(x3-x2)*(.35+h*.18),hy=y2+(y3-y2)*(.35+h*.18);ctx.beginPath();ctx.moveTo(hx,hy);ctx.lineTo(hx+3,hy+sy*5);ctx.stroke()}
    }
    const ab=ctx.createRadialGradient(-17,-8,3,-10,0,32);ab.addColorStop(0,hit?'#fff':'#8b6755');ab.addColorStop(.5,hit?'#fff':'#654739');ab.addColorStop(1,hit?'#fff':'#382720');ctx.fillStyle=ab;bugOutline('#2b1c19',2.4);ctx.beginPath();ctx.ellipse(-15,0,28,23,0,0,TAU);ctx.fill();ctx.stroke();
    ctx.fillStyle=hit?'#fff':'#5c3f35';ctx.beginPath();ctx.ellipse(18,0,24,21,0,0,TAU);ctx.fill();ctx.stroke();
    ctx.strokeStyle='rgba(25,15,13,.62)';ctx.lineWidth=3;for(let x=-28;x<0;x+=8){ctx.beginPath();ctx.moveTo(x,-11);ctx.lineTo(x+7,0);ctx.lineTo(x,11);ctx.stroke()}
    ctx.fillStyle='#ff765e';for(const [x,y,r] of [[31,-8,2.8],[32,8,2.8],[25,-12,2],[25,12,2],[35,-3,1.7],[35,3,1.7],[27,-4,1.5],[27,4,1.5]]){ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fill()}
    ctx.fillStyle=hit?'#fff':'#251614';ctx.beginPath();ctx.moveTo(39,-6);ctx.lineTo(51,-14);ctx.lineTo(46,-1);ctx.closePath();ctx.fill();ctx.beginPath();ctx.moveTo(39,6);ctx.lineTo(51,14);ctx.lineTo(46,1);ctx.closePath();ctx.fill();bugShine(-21,-11,10,3,-.15,.14);
  } else if(e.type==='hornet'){
    ctx.globalAlpha=.48;ctx.fillStyle='#d9f7f3';ctx.strokeStyle='rgba(113,166,174,.55)';ctx.lineWidth=2;for(const sy of[-1,1]){ctx.beginPath();ctx.ellipse(-7,sy*25,34,11,sy*.22,0,TAU);ctx.fill();ctx.stroke()}ctx.globalAlpha=1;
    ctx.strokeStyle='#493428';ctx.lineWidth=4;for(const sy of[-1,1])for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(-2+i*12,sy*10);ctx.lineTo(-10+i*13,sy*(27+i*2));ctx.lineTo(2+i*13,sy*(35+i*3));ctx.stroke()}
    const hg=ctx.createLinearGradient(-44,-20,40,20);hg.addColorStop(0,hit?'#fff':'#d48b24');hg.addColorStop(.55,hit?'#fff':'#ba5d24');hg.addColorStop(1,hit?'#fff':'#8b3a25');ctx.fillStyle=hg;bugOutline('#39251d',2.5);ctx.beginPath();ctx.ellipse(-19,0,29,20,0,0,TAU);ctx.ellipse(16,0,25,22,0,0,TAU);ctx.fill();ctx.stroke();
    ctx.fillStyle='#2a241d';for(let x=-35;x<2;x+=12){ctx.save();ctx.translate(x,0);ctx.rotate(.08);ctx.fillRect(-3,-18,7,36);ctx.restore()}
    ctx.fillStyle='#b93c3c';ctx.beginPath();ctx.ellipse(31,-8,5,7,0,0,TAU);ctx.ellipse(31,8,5,7,0,0,TAU);ctx.fill();ctx.fillStyle='#ffe782';ctx.beginPath();ctx.arc(31,-8,1.6,0,TAU);ctx.arc(31,8,1.6,0,TAU);ctx.fill();
    ctx.fillStyle='#3b271e';ctx.beginPath();ctx.moveTo(-46,0);ctx.lineTo(-65,-5);ctx.lineTo(-61,5);ctx.closePath();ctx.fill();bugShine(-22,-10,11,3,-.15,.2);
  } else if(e.type==='empress'){
    ctx.globalAlpha=.42;ctx.fillStyle='#dcfbff';ctx.strokeStyle='rgba(115,172,184,.55)';ctx.lineWidth=2;for(const sy of[-1,1])for(const ox of[-11,6]){ctx.beginPath();ctx.ellipse(ox,sy*(24+(ox+12)*.4),31,9,sy*.26,0,TAU);ctx.fill();ctx.stroke()}ctx.globalAlpha=1;
    ctx.strokeStyle='#4a2a22';ctx.lineWidth=5;for(const sy of[-1,1])for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(-5+i*15,sy*11);ctx.lineTo(-14+i*15,sy*(31+i*2));ctx.lineTo(3+i*15,sy*(40+i*3));ctx.stroke()}
    const qg=ctx.createLinearGradient(-50,-25,45,25);qg.addColorStop(0,hit?'#fff':'#5d2628');qg.addColorStop(.46,hit?'#fff':'#b84f40');qg.addColorStop(.72,hit?'#fff':'#e0a33b');qg.addColorStop(1,hit?'#fff':'#7b2d2d');ctx.fillStyle=qg;bugOutline('#321b18',3);ctx.beginPath();ctx.ellipse(-20,0,33,23,0,0,TAU);ctx.ellipse(19,0,28,26,0,0,TAU);ctx.fill();ctx.stroke();
    ctx.fillStyle='#251d18';for(let x=-38;x<2;x+=13)ctx.fillRect(x,-20,7,40);
    ctx.fillStyle='#f4c75a';for(const x of[3,13,23]){ctx.beginPath();ctx.moveTo(x,-24);ctx.lineTo(x+6,-41);ctx.lineTo(x+11,-22);ctx.closePath();ctx.fill()}
    ctx.fillStyle='#8ff7a5';ctx.shadowColor='#8ff7a5';ctx.shadowBlur=8;ctx.beginPath();ctx.ellipse(35,-9,5,7,0,0,TAU);ctx.ellipse(35,9,5,7,0,0,TAU);ctx.fill();ctx.shadowBlur=0;
    ctx.fillStyle='#3a201c';ctx.beginPath();ctx.moveTo(-51,0);ctx.lineTo(-72,-7);ctx.lineTo(-67,7);ctx.closePath();ctx.fill();bugShine(-21,-11,13,3,-.18,.22);
  } else if(e.type==='stag'){
    ctx.strokeStyle=hit?'#fff':'#38211d';ctx.lineWidth=4;for(const sy of[-1,1])for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(-14+i*14,sy*10);ctx.lineTo(-21+i*16,sy*(29+i*2));ctx.lineTo(-6+i*18,sy*(38+i*3));ctx.stroke()}
    const sg=ctx.createRadialGradient(-15,-9,4,-6,0,42);sg.addColorStop(0,hit?'#fff':'#8f5a43');sg.addColorStop(.45,hit?'#fff':'#54312a');sg.addColorStop(1,hit?'#fff':'#281917');ctx.fillStyle=sg;bugOutline('#241515',2.8);ctx.beginPath();ctx.ellipse(-13,0,35,25,0,0,TAU);ctx.arc(26,0,20,0,TAU);ctx.fill();ctx.stroke();
    ctx.strokeStyle=hit?'#fff':'#39211c';ctx.lineWidth=7;ctx.lineCap='round';for(const sy of[-1,1]){ctx.beginPath();ctx.moveTo(36,sy*8);ctx.quadraticCurveTo(67,sy*31,76,sy*8);ctx.quadraticCurveTo(61,sy*18,48,0);ctx.stroke();ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(62,sy*20);ctx.lineTo(69,sy*30);ctx.stroke();ctx.lineWidth=7}
    ctx.fillStyle='#e9a36d';ctx.beginPath();ctx.arc(31,-6,2.4,0,TAU);ctx.arc(31,6,2.4,0,TAU);ctx.fill();bugShine(-19,-11,12,3,-.2,.18);
  } else if(e.type==='scorpion'){
    ctx.strokeStyle=hit?'#fff':'#6f5737';ctx.lineWidth=5;for(const sy of[-1,1])for(let i=0;i<4;i++){ctx.beginPath();ctx.moveTo(-18+i*12,sy*7);ctx.lineTo(-34+i*14,sy*(22+i*2));ctx.lineTo(-24+i*16,sy*(34+i*3));ctx.stroke()}
    const cg=ctx.createLinearGradient(-44,-18,42,18);cg.addColorStop(0,hit?'#fff':'#745b39');cg.addColorStop(.5,hit?'#fff':'#a78550');cg.addColorStop(1,hit?'#fff':'#5b442c');ctx.fillStyle=cg;bugOutline('#42311f',2.4);for(let i=-2;i<=2;i++){ctx.beginPath();ctx.ellipse(i*12,0,14,17,0,0,TAU);ctx.fill();ctx.stroke()}
    const tail=[[-35,-5],[-48,-17],[-58,-33],[-57,-49],[-47,-61]];ctx.strokeStyle=hit?'#fff':'#765c38';ctx.lineWidth=9;ctx.beginPath();ctx.moveTo(-28,0);for(const [x,y] of tail)ctx.lineTo(x,y);ctx.stroke();ctx.fillStyle=hit?'#fff':'#8d6b3e';for(const [x,y] of tail){ctx.beginPath();ctx.arc(x,y,6,0,TAU);ctx.fill()}
    ctx.fillStyle='#302219';ctx.beginPath();ctx.moveTo(-47,-66);ctx.lineTo(-31,-74);ctx.lineTo(-37,-56);ctx.closePath();ctx.fill();
    ctx.strokeStyle=hit?'#fff':'#765c38';ctx.lineWidth=7;for(const sy of[-1,1]){ctx.beginPath();ctx.moveTo(29,sy*8);ctx.lineTo(49,sy*24);ctx.stroke();ctx.fillStyle=hit?'#fff':'#97774b';ctx.beginPath();ctx.ellipse(58,sy*24,11,7,0,0,TAU);ctx.fill();ctx.beginPath();ctx.moveTo(61,sy*24);ctx.lineTo(74,sy*15);ctx.lineTo(68,sy*27);ctx.closePath();ctx.fill()}bugShine(-5,-9,9,2.5,-.15,.14);
  } else {
    const mg=ctx.createLinearGradient(-42,-20,45,20);mg.addColorStop(0,hit?'#fff':'#526f35');mg.addColorStop(.5,hit?'#fff':base);mg.addColorStop(1,hit?'#fff':'#a3bd58');ctx.fillStyle=mg;bugOutline('#243019',2.5);ctx.beginPath();ctx.ellipse(-23,0,27,16,0,0,TAU);ctx.fill();ctx.stroke();ctx.beginPath();ctx.ellipse(4,0,18,13,0,0,TAU);ctx.fill();ctx.stroke();ctx.beginPath();ctx.moveTo(15,-14);ctx.lineTo(38,-18);ctx.lineTo(47,0);ctx.lineTo(38,18);ctx.lineTo(15,14);ctx.closePath();ctx.fill();ctx.stroke();
    ctx.strokeStyle=hit?'#fff':'#718d41';ctx.lineWidth=6;for(const sy of[-1,1]){ctx.beginPath();ctx.moveTo(-9,sy*9);ctx.lineTo(-31,sy*29);ctx.lineTo(-50,sy*20);ctx.stroke()}
    ctx.strokeStyle=hit?'#fff':'#91ae4e';ctx.lineWidth=8;for(const sy of[-1,1]){ctx.beginPath();ctx.moveTo(11,sy*10);ctx.lineTo(35,sy*38);ctx.lineTo(63,sy*16);ctx.stroke();ctx.strokeStyle='#d2e879';ctx.lineWidth=2;for(let j=0;j<4;j++){const x=42+j*5,y=sy*(32-j*4);ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+4,y-sy*7);ctx.stroke()}ctx.strokeStyle=hit?'#fff':'#91ae4e';ctx.lineWidth=8}
    ctx.fillStyle='#9cff7d';ctx.shadowColor='#9cff7d';ctx.shadowBlur=8;ctx.beginPath();ctx.ellipse(39,-8,4,6,0,0,TAU);ctx.ellipse(39,8,4,6,0,0,TAU);ctx.fill();ctx.shadowBlur=0;bugShine(-25,-7,10,2.5,-.2,.18);
  }
  ctx.restore();
}
function drawEnemy(e){enemyShadow(e);if(e.boss){ctx.save();const ag=ctx.createRadialGradient(e.x,e.y,8,e.x,e.y,e.r*2.2);ag.addColorStop(0,'rgba(255,102,79,.14)');ag.addColorStop(1,'rgba(255,90,70,0)');ctx.fillStyle=ag;ctx.beginPath();ctx.arc(e.x,e.y,e.r*2.2,0,TAU);ctx.fill();ctx.restore()}ctx.save();ctx.translate(e.x,e.y);ctx.rotate(e.angle); if(e.elite&&!e.boss){ctx.shadowColor='rgba(255,212,92,.7)';ctx.shadowBlur=14} if(e.boss)drawBossBody(e); else if(e.type==='aphid'){ctx.shadowColor='#ffe36a';ctx.shadowBlur=18;ctx.fillStyle=e.hitFlash?'#fff':'#f7d95c';ctx.beginPath();ctx.ellipse(-8,0,14,10,0,0,TAU);ctx.ellipse(10,0,12,9,0,0,TAU);ctx.fill();ctx.shadowBlur=0;ctx.strokeStyle='#654f1b';ctx.lineWidth=2;for(const sy of[-1,1]){ctx.beginPath();ctx.moveTo(10,sy*4);ctx.lineTo(25,sy*13);ctx.stroke()} } else if(e.type==='spider'){ const grad=ctx.createLinearGradient(-24,-16,28,16); grad.addColorStop(0,e.hitFlash?'#fff':'#3c2d34'); grad.addColorStop(1,e.hitFlash?'#fff':'#181115'); ctx.fillStyle=grad; for(const sy of[-1,1])for(let i=0;i<4;i++){ctx.strokeStyle='#24181d';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-5+i*4,sy*5);ctx.lineTo(-20+i*7,sy*(14+i*3));ctx.lineTo(-29+i*9,sy*(18+i*4));ctx.stroke()} ctx.beginPath(); ctx.arc(-8,0,10,0,TAU); ctx.arc(8,0,12,0,TAU); ctx.fill(); ctx.fillStyle='#e7664f'; ctx.beginPath(); ctx.arc(13,-4,2,0,TAU); ctx.arc(13,4,2,0,TAU); ctx.fill() }
  else if(e.type==='beetle'){const bg=ctx.createLinearGradient(-23,-18,23,18);bg.addColorStop(0,e.hitFlash?'#fff':'#4b7766');bg.addColorStop(1,e.hitFlash?'#fff':'#132722');ctx.fillStyle=bg;ctx.beginPath();ctx.ellipse(0,0,24,18,0,0,TAU);ctx.fill();ctx.strokeStyle='#87b39c';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-3,-17);ctx.lineTo(-3,17);ctx.stroke();ctx.fillStyle='#14231f';ctx.beginPath();ctx.arc(20,0,8,0,TAU);ctx.fill();bugShine(-8,-6,6,2.3,-.4,.22)}
  else if(e.type==='centipede'){ctx.strokeStyle='#4b2e24';ctx.lineWidth=2;for(let i=-24;i<=24;i+=8){ctx.beginPath();ctx.moveTo(i,-4);ctx.lineTo(i-2,-14);ctx.moveTo(i,4);ctx.lineTo(i-2,14);ctx.stroke()}for(let i=-24;i<=24;i+=9){ctx.fillStyle=e.hitFlash?'#fff':'#ac5b39';ctx.beginPath();ctx.arc(i,0,7,0,TAU);ctx.fill()} }
  else if(e.type==='roach'){ctx.fillStyle=e.hitFlash?'#fff':'#7a513d';ctx.beginPath();ctx.ellipse(0,0,27,17,0,0,TAU);ctx.fill();ctx.strokeStyle='#38271f';ctx.lineWidth=2;for(const sy of[-1,1]){ctx.beginPath();ctx.moveTo(-13,sy*9);ctx.lineTo(-20,sy*24);ctx.moveTo(0,sy*10);ctx.lineTo(3,sy*25);ctx.moveTo(13,sy*8);ctx.lineTo(22,sy*20);ctx.stroke()}ctx.beginPath();ctx.moveTo(22,-5);ctx.quadraticCurveTo(40,-18,45,-12);ctx.moveTo(22,5);ctx.quadraticCurveTo(40,18,45,12);ctx.stroke();bugShine(-7,-5,7,2.1,-.25,.17)}
  else{ctx.globalAlpha=.42;ctx.fillStyle='#d7f6ef';for(const sy of[-1,1]){ctx.beginPath();ctx.ellipse(-5,sy*13,18,7,sy*.35,0,TAU);ctx.fill()}ctx.globalAlpha=1;ctx.fillStyle=e.hitFlash?'#fff':'#b78038';ctx.beginPath();ctx.ellipse(-8,0,18,11,0,0,TAU);ctx.arc(12,0,11,0,TAU);ctx.fill();ctx.fillStyle='#28231c';ctx.fillRect(-10,-10,6,20);ctx.fillRect(2,-10,5,20)}
  ctx.restore();
  if(e.elite&&!e.boss){ctx.save();ctx.fillStyle='rgba(255,212,92,.92)';ctx.font='800 12px system-ui';ctx.textAlign='center';ctx.fillText('ELITE',e.x,e.y-e.r-26);ctx.restore()}
  if(e.boss||e.hp<e.maxHp||e.elite){const w=e.boss?128:e.elite?54:40;ctx.fillStyle='rgba(0,0,0,.48)';ctx.fillRect(e.x-w/2,e.y-e.r-21,w,6);ctx.fillStyle=e.boss?'#ff866f':e.elite?'#ffd56b':'#d9ef78';ctx.fillRect(e.x-w/2,e.y-e.r-21,w*clamp(e.hp/e.maxHp,0,1),6);if(e.boss){ctx.fillStyle='rgba(255,255,255,.75)';ctx.font='700 10px system-ui';ctx.textAlign='center';ctx.fillText(state.bossName,e.x,e.y-e.r-28)}}
}
function drawDrops(){for(const d of state.drops){ctx.save();ctx.translate(d.x,d.y);ctx.rotate(d.spin);if(d.kind==='gem'){ctx.shadowBlur=16;ctx.shadowColor='#78f4ff';const gg=ctx.createLinearGradient(-8,-10,8,10);gg.addColorStop(0,'#d7feff');gg.addColorStop(.45,'#6feaff');gg.addColorStop(1,'#2baec9');ctx.fillStyle=gg;ctx.beginPath();ctx.moveTo(0,-11);ctx.lineTo(9,0);ctx.lineTo(0,11);ctx.lineTo(-9,0);ctx.closePath();ctx.fill()}else{ctx.fillStyle='#ebca78';rr(-6,-5,12,10,3);ctx.fill();ctx.fillStyle='#a98242';ctx.fillRect(-4,-3,3,3);ctx.fillRect(1,1,2,2)}ctx.restore()}}
function render(){ctx.save();let sx=0,sy=0;if(state&&state.shake&&settings.shake){sx=rand(-state.shake,state.shake);sy=rand(-state.shake,state.shake)}ctx.translate(sx,sy);drawMap(performance.now()/1000);if(state){drawNest(state.nest);drawDrops();for(const e of state.enemies)drawEnemy(e);const remotes=MP.role==='host'?Object.values(state.remotePlayers||{}):(state.netPlayers||[]);for(const r of remotes)drawRemotePlayer(r);drawPlayer(state.player);ctx.save();ctx.textAlign='center';ctx.font='900 12px system-ui';ctx.lineWidth=4;ctx.strokeStyle='rgba(0,0,0,.65)';ctx.strokeText(MP.getUsername(),state.player.x,state.player.y-31);ctx.fillStyle='#dfffaa';ctx.fillText(MP.getUsername(),state.player.x,state.player.y-31);ctx.restore();for(const a of state.slashes){ctx.save();ctx.globalAlpha=a.life/a.max;ctx.strokeStyle='#efffae';ctx.shadowColor='#dfff81';ctx.shadowBlur=8;ctx.lineWidth=8;ctx.lineCap='round';ctx.beginPath();ctx.arc(a.x,a.y,58,a.a-.72,a.a+.72);ctx.stroke();ctx.restore()}for(const q of state.shockwaves){ctx.save();ctx.globalAlpha=q.life/q.max;ctx.strokeStyle=q.color;ctx.lineWidth=4;ctx.beginPath();ctx.arc(q.x,q.y,q.r,0,TAU);ctx.stroke();ctx.restore()}for(const p of state.particles){ctx.globalAlpha=clamp(p.life/p.max,0,1);ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,TAU);ctx.fill()}ctx.globalAlpha=1}else{const t=performance.now()/1000;drawLadybug({x:W*.77+Math.sin(t*.65)*30,y:H*.45+Math.cos(t*.8)*15,angle:-2.7+Math.sin(t*.45)*.2});drawTermite({x:W*.83+Math.sin(t*.5)*18,y:H*.68+Math.cos(t*.6)*12,angle:-2.45,color:'#ead7ae'});drawMosquito({x:W*.17+Math.sin(t*.75)*28,y:H*.34+Math.cos(t*.9)*18,angle:.35})}ctx.restore()}
function loop(now){const dt=Math.min(.033,(now-last)/1000);last=now;update(dt);render();requestAnimationFrame(loop)}requestAnimationFrame(loop);

function startSharedRun(){
  if(MP.role!=='host'||!MP.isConnected()){UI.toast('Create a multiplayer room first');return}
  if(running){UI.toast('Shared expedition already running');return}
  newRun();
  MP.broadcastControl('startRun',{wave:1});
  MP.updateUI();
  UI.toast(`🌐 Shared expedition started · ${MP.connectedCount()}/3 players`);
}
window.BUGBREAK_GAME={startSharedRun,isRunning:()=>!!running&&!!state};
function startRunSmart(){
  if(MP.role==='guest'&&MP.isConnected()){UI.toast('Only the host can start or restart the shared expedition');UI.show('multiplayer');MP.updateUI();return}
  if(MP.role==='host'&&MP.isConnected()){startSharedRun();return}
  newRun()
}

// UI wiring
UI.$('#playBtn').onclick=()=>{SFX.click();startRunSmart()};UI.$('#shopBtn').onclick=()=>{SFX.click();UI.renderShop(save,buyUpgrade);UI.show('shop')};UI.$('[data-close="shop"]').onclick=()=>{SFX.click();UI.show('menu')};
function buyUpgrade(u,cost){const rank=save.upgrades[u.id]||0;if(rank>=u.max||save.gems<cost)return;save.gems-=cost;save.upgrades[u.id]=rank+1;persist();SFX.gem();UI.renderShop(save,buyUpgrade);UI.toast(`${u.name} upgraded`)}
UI.$('#pauseBtn').onclick=()=>{if(!running)return;paused=true;SFX.stopMusic();UI.show('pause')};UI.$('#resumeBtn').onclick=()=>{SFX.click();UI.hideAll();paused=false;if(state?.boss)SFX.startBoss(waveBoss()?.music||0);else if(state)SFX.startNormal(Math.min(4,Math.floor((state.wave-1)/10)))};UI.$('#quitBtn').onclick=()=>{SFX.click();running=false;state=null;SFX.stopMusic();UI.setHud(false);setupMenuBg();rerenderSelect()};
UI.$('#againBtn').onclick=()=>{SFX.click();startRunSmart()};UI.$('#menuBtn').onclick=()=>{SFX.click();state=null;setupMenuBg();rerenderSelect()};UI.$('#victoryAgainBtn').onclick=()=>{SFX.click();startRunSmart()};UI.$('#victoryMenuBtn').onclick=()=>{SFX.click();state=null;setupMenuBg();rerenderSelect()};
UI.$('#resetBtn').onclick=()=>{if(confirm('Erase BUGBREAK save data? A fresh save gets the starter/update gems again.')){localStorage.removeItem('bugbreakSave');save=loadSave();selectedBug='ant';setupSettingsUI();persist();setupMenuBg();rerenderSelect();UI.toast('Fresh colony ready')}};
window.addEventListener('keydown',e=>{keys[e.code]=true;if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();if(e.code==='Escape'&&running){paused=!paused;if(paused){SFX.stopMusic();UI.show('pause')}else{UI.hideAll();if(state?.boss)SFX.startBoss(waveBoss()?.music||0);else if(state)SFX.startNormal(Math.min(4,Math.floor((state.wave-1)/10)))}}});window.addEventListener('keyup',e=>keys[e.code]=false);
UI.$('#biteBtn').onpointerdown=e=>{e.preventDefault();bite()};UI.$('#dashBtn').onpointerdown=e=>{e.preventDefault();dash()};UI.$('#repairBtn').onpointerdown=e=>{e.preventDefault();repairNest()};UI.$('#specialBtn').onpointerdown=e=>{e.preventDefault();useAbility()};
const base=UI.$('#stickBase'),knob=UI.$('#stickKnob');let stickId=null;function stick(e){const r=base.getBoundingClientRect(),x=e.clientX-(r.left+r.width/2),y=e.clientY-(r.top+r.height/2),m=Math.min(42,Math.hypot(x,y)),a=Math.atan2(y,x);touchMove.x=Math.cos(a)*(m/42);touchMove.y=Math.sin(a)*(m/42);knob.style.transform=`translate(${touchMove.x*34}px,${touchMove.y*34}px)`}base.onpointerdown=e=>{stickId=e.pointerId;base.setPointerCapture(stickId);stick(e)};base.onpointermove=e=>{if(e.pointerId===stickId)stick(e)};function stopStick(e){if(e.pointerId===stickId){stickId=null;touchMove.x=touchMove.y=0;knob.style.transform=''}}base.onpointerup=stopStick;base.onpointercancel=stopStick;
document.addEventListener('visibilitychange',()=>{if(document.hidden&&running&&!paused){paused=true;SFX.stopMusic();UI.show('pause')}});

function setupSettingsUI(){
  const master=UI.$('#masterVol'),music=UI.$('#musicVol'),sfx=UI.$('#sfxVol'),normal=UI.$('#normalMusicToggle'),shake=UI.$('#shakeToggle');
  const sync=()=>{if(master){master.value=settings.master;UI.$('#masterOut').textContent=settings.master+'%'}if(music){music.value=settings.music;UI.$('#musicOut').textContent=settings.music+'%'}if(sfx){sfx.value=settings.sfx;UI.$('#sfxOut').textContent=settings.sfx+'%'}if(normal)normal.checked=!!settings.normalMusic;if(shake)shake.checked=!!settings.shake};
  const bindSlider=(el,key,out)=>el?.addEventListener('input',()=>{settings[key]=Number(el.value);UI.$(out).textContent=el.value+'%';saveSettings()});
  bindSlider(master,'master','#masterOut');bindSlider(music,'music','#musicOut');bindSlider(sfx,'sfx','#sfxOut');
  normal?.addEventListener('change',()=>{settings.normalMusic=normal.checked;saveSettings();if(running&&!paused&&!state?.boss){if(settings.normalMusic)SFX.startNormal(Math.min(4,Math.floor((state.wave-1)/10)));else SFX.stopMusic()}});
  shake?.addEventListener('change',()=>{settings.shake=shake.checked;saveSettings()});
  UI.$('#settingsBtn').onclick=()=>{SFX.click();sync();UI.show('settings')};UI.$('#pauseSettingsBtn').onclick=()=>{SFX.click();sync();UI.show('settings')};UI.$('#settingsClose').onclick=()=>{SFX.click();UI.show(running&&paused?'pause':'menu')};sync();saveSettings();
}

function demoState(kind){
  save=JSON.parse(JSON.stringify(save));save.bestWave=Math.max(save.bestWave,16);save.gems=Math.max(save.gems,74);save.upgrades={...defaultUpgrades(),shell:3,fangs:3,legs:2,nest:3,workers:2,magnet:2,luck:2,dash:1,repair:2,crit:1};UI.updateMenu(save);
  if(kind==='shop'){UI.renderShop(save,buyUpgrade);UI.show('shop');return}if(kind==='settings'){UI.show('settings');return}if(kind==='multiplayer'){UI.show('multiplayer');return}if(kind==='menu'){setupMenuBg();rerenderSelect();return}
  if(kind==='relic'){selectedBug='ant';newRun();paused=true;UI.renderRelics(BUGBREAK_DATA.relics.slice(0,3),()=>{});UI.show('relic');return}
  selectedBug=kind==='boss'?'termite':kind==='mosquito'?'mosquito':'ladybug';newRun();
  if(kind==='boss'){state.wave=20;state.enemies=[];spawnWave();state.player.level=9;state.player.damage*=2.1;state.player.x=520;state.player.y=410;state.runGems=14;state.crumbs=151;const e=state.enemies[0];e.x=900;e.y=365;e.hp=e.maxHp*.68;UI.bossBanner(true,state.bossName)}
  else if(kind==='battle'||kind==='event'){state.wave=8;state.enemies=[];state.biome=BUGBREAK_DATA.biomes[0];state.eventType=kind==='event'?'aphid':'ambush';state.eventLabel=kind==='event'?'🌟 GOLDEN APHID HUNT':'⚠️ PREDATOR AMBUSH · +2 💎';for(let i=0;i<10;i++)spawnEnemy(['spider','beetle','centipede'][i%3]);if(kind==='event')spawnEnemy('aphid');state.player.level=6;state.player.damage*=1.65;state.player.x=575;state.player.y=390;state.crumbs=96;state.runGems=8;const pos=[[790,340],[860,465],[410,315],[955,265],[355,520],[755,560],[1060,420],[460,575],[1020,545],[330,405],[760,210]];state.enemies.forEach((e,i)=>{e.x=pos[i][0];e.y=pos[i][1]})}
  else{state.wave=32;state.biome=BUGBREAK_DATA.biomes[3];state.enemies=[];for(let i=0;i<8;i++)spawnEnemy(i%3===0?'wasp':i%2?'centipede':'beetle');state.player.level=12;state.player.damage*=2.1;state.player.x=620;state.player.y=335;state.crumbs=128;state.runGems=18;state.eventLabel='🍄 COMPOST YARD · EXPEDITION';const pos=[[790,285],[885,395],[730,530],[455,250],[1040,465],[390,480],[980,205],[510,565]];state.enemies.forEach((e,i)=>{e.x=pos[i][0];e.y=pos[i][1]})}
  paused=true;UI.hideAll();UI.setHud(true);UI.updateHud(state)
}

setupSettingsUI();persist();setupMenuBg();rerenderSelect();if(!demo){if(save.justV5Gift)setTimeout(()=>UI.toast('🎁 Shared Yard update gift: +12 gems!'),350);else if(save.justV4Gift)setTimeout(()=>UI.toast('🎁 Art & Mayhem update gift: +14 gems!'),350);else if(save.justGifted||save.justV3Gift)setTimeout(()=>UI.toast('🎁 Update bonus added to your colony!'),350)}if(demo)setTimeout(()=>demoState(demo),120)
})();
