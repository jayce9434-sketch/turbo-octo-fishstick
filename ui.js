window.UI = (()=>{
  const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];

  function bugPortrait(id){
    const common='<defs><filter id="s"><feDropShadow dx="0" dy="2" stdDeviation="1.5" flood-opacity=".45"/></filter></defs>';
    const wrap=x=>`<svg viewBox="0 0 64 64" aria-hidden="true">${common}<g filter="url(#s)">${x}</g></svg>`;
    if(id==='ant')return wrap('<g fill="#a84d3e" stroke="#40211d" stroke-width="2"><ellipse cx="17" cy="32" rx="10" ry="8"/><ellipse cx="33" cy="32" rx="7" ry="7"/><ellipse cx="47" cy="32" rx="9" ry="8"/></g><g stroke="#5a3028" stroke-width="2" stroke-linecap="round"><path d="M27 28L18 18M28 36L18 46M38 28L46 17M38 36L47 47M50 28Q59 20 61 24M50 36Q59 44 61 40"/></g><circle cx="51" cy="29" r="2" fill="#111"/>');
    if(id==='termite')return wrap('<g fill="#ead8ad" stroke="#8d684b" stroke-width="2"><ellipse cx="17" cy="32" rx="11" ry="8"/><ellipse cx="34" cy="32" rx="9" ry="8"/><ellipse cx="49" cy="32" rx="10" ry="9"/></g><g fill="#a76a45"><path d="M54 29Q64 18 61 31Q59 36 54 33Z"/><path d="M54 35Q64 46 61 33Q59 28 54 31Z"/></g><g stroke="#755039" stroke-width="2"><path d="M23 27L14 19M24 37L14 45M38 27L31 18M38 37L31 46"/></g>');
    if(id==='ladybug')return wrap('<ellipse cx="34" cy="32" rx="22" ry="16" fill="#c92e39" stroke="#35191b" stroke-width="2"/><path d="M34 17V47" stroke="#241416" stroke-width="3"/><circle cx="13" cy="32" r="9" fill="#171719"/><g fill="#171719"><circle cx="25" cy="25" r="4"/><circle cx="25" cy="39" r="4"/><circle cx="43" cy="24" r="4"/><circle cx="44" cy="40" r="4"/></g><path d="M20 23L10 16M20 41L10 48M46 22L56 15M46 42L57 49" stroke="#171719" stroke-width="2"/>');
    if(id==='fly')return wrap('<g fill="#d9f8ff" fill-opacity=".65" stroke="#7295a0"><ellipse cx="28" cy="18" rx="18" ry="7" transform="rotate(-18 28 18)"/><ellipse cx="28" cy="46" rx="18" ry="7" transform="rotate(18 28 46)"/></g><ellipse cx="28" cy="32" rx="15" ry="10" fill="#435f62"/><circle cx="46" cy="32" r="10" fill="#556f70"/><g fill="#c04f58"><circle cx="49" cy="27" r="5"/><circle cx="49" cy="37" r="5"/></g><path d="M24 28L12 20M24 36L12 44M34 27L31 15M34 37L31 49" stroke="#243436" stroke-width="2"/>');
    if(id==='mosquito')return wrap('<g stroke="#6d5845" stroke-width="2" stroke-linecap="round"><path d="M30 29L14 13M30 35L14 51M38 28L46 12M38 36L46 52M50 32H63"/></g><g fill="#d9f7f0" fill-opacity=".55"><ellipse cx="29" cy="18" rx="16" ry="5" transform="rotate(-20 29 18)"/><ellipse cx="29" cy="46" rx="16" ry="5" transform="rotate(20 29 46)"/></g><ellipse cx="27" cy="32" rx="16" ry="6" fill="#705a47"/><circle cx="46" cy="32" r="8" fill="#705a47"/><circle cx="49" cy="29" r="2" fill="#bd5860"/>');
    if(id==='bumblebee')return wrap('<g fill="#e9f7ff" fill-opacity=".55" stroke="#779aa6"><ellipse cx="28" cy="18" rx="17" ry="7" transform="rotate(-18 28 18)"/><ellipse cx="28" cy="46" rx="17" ry="7" transform="rotate(18 28 46)"/></g><ellipse cx="31" cy="32" rx="22" ry="14" fill="#e1ad34" stroke="#4a351f" stroke-width="2"/><g fill="#2b251e"><rect x="18" y="19" width="6" height="26"/><rect x="32" y="19" width="6" height="26"/><circle cx="51" cy="32" r="9"/></g><path d="M9 32L2 28L2 36Z" fill="#4a351f"/>');
    return wrap('<ellipse cx="29" cy="32" rx="22" ry="15" fill="#4d2d28" stroke="#241514" stroke-width="2"/><circle cx="49" cy="32" r="11" fill="#62372e"/><g stroke="#38201b" stroke-width="5" fill="none" stroke-linecap="round"><path d="M55 27Q64 14 62 29Q60 34 54 32"/><path d="M55 37Q64 50 62 35Q60 30 54 32"/></g><g stroke="#3b2420" stroke-width="2"><path d="M22 25L12 16M22 39L12 48M37 25L31 14M37 39L31 50"/></g>');
  }

  const screens=['menu','shop','levelup','relic','pause','gameover','victory','settings','multiplayer'];let toastTimer,rewardTimer;
  function show(name){screens.forEach(x=>$('#'+x)?.classList.toggle('active',x===name))}
  function hideAll(){screens.forEach(x=>$('#'+x)?.classList.remove('active'))}
  function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),1900)}
  function reward(msg){const t=$('#waveReward');t.textContent=msg;t.classList.add('show');clearTimeout(rewardTimer);rewardTimer=setTimeout(()=>t.classList.remove('show'),1900)}
  function renderBugSelect(save,selected,onSelect){
    const wrap=$('#bugSelect');wrap.innerHTML='';Object.entries(BUGBREAK_DATA.bugs).forEach(([id,b])=>{
      const locked=b.unlockWave&&save.bestWave<b.unlockWave,el=document.createElement('button');el.className='bug-option'+(selected===id?' selected':'')+(locked?' locked':'');
      el.innerHTML=`<span class="bug-portrait">${bugPortrait(id)}</span><div><b>${b.name}</b><small>${locked?`Reach wave ${b.unlockWave}`:b.desc}</small></div>${locked?'<span class="tag">LOCKED</span>':'<span class="ready">READY</span>'}`;
      el.onclick=()=>{SFX.click();if(locked){toast(`Reach wave ${b.unlockWave} to unlock ${b.name}`);return}onSelect(id)};wrap.appendChild(el)
    })
  }
  function renderShop(save,onBuy){
    $('#shopGems').textContent=save.gems;const g=$('#upgradeGrid');g.innerHTML='';BUGBREAK_DATA.permanent.forEach(u=>{
      const rank=save.upgrades[u.id]||0,cost=Math.round(u.base*Math.pow(1.32,rank)),maxed=rank>=u.max,el=document.createElement('div');el.className='upgrade'+(maxed?' maxed':'');
      el.innerHTML=`<div class="upgrade-icon">${u.icon}</div><div class="upgrade-copy"><h4>${u.name}</h4><p>${u.desc}</p><div class="pips">${Array.from({length:u.max},(_,i)=>`<i class="${i<rank?'on':''}"></i>`).join('')}</div></div><div class="upgrade-buy"><span>Rank ${rank}/${u.max}</span><button ${maxed||save.gems<cost?'disabled':''}>${maxed?'MAX':`💎 ${cost}`}</button></div>`;
      el.querySelector('button').onclick=()=>onBuy(u,cost);g.appendChild(el)
    })
  }
  function renderMutations(options,onPick){const c=$('#cards');c.innerHTML='';options.forEach(m=>{const b=document.createElement('button');b.className='mut-card';b.innerHTML=`<span class="icon">${m.icon}</span><h4>${m.name}</h4><p>${m.desc}</p><span class="choose">CHOOSE →</span>`;b.onclick=()=>{SFX.click();onPick(m)};c.appendChild(b)})}
  function renderRelics(options,onPick){const c=$('#relicCards');c.innerHTML='';options.forEach(m=>{const b=document.createElement('button');b.className='mut-card relic-card';b.innerHTML=`<span class="icon">${m.icon}</span><h4>${m.name}</h4><p>${m.desc}</p><span class="choose">TAKE RELIC →</span>`;b.onclick=()=>{SFX.gem();onPick(m)};c.appendChild(b)})}
  function updateMenu(save){$('#bestWave').textContent=Math.min(50,save.bestWave||0);$('#menuGems').textContent=save.gems||0;const d=$('#dailyCard');if(d)d.innerHTML=save.dailyClaimedToday?'🌱 Daily colony bonus claimed · come back tomorrow':'🌱 Daily colony bonus ready: <b>+4 gems</b> when you start'}
  function updateHud(state){
    const p=state.player,n=state.nest;$('#hpBar').style.width=`${Math.max(0,p.hp/p.maxHp*100)}%`;$('#hpText').textContent=`${Math.ceil(p.hp)}/${Math.ceil(p.maxHp)}`;$('#nestBar').style.width=`${Math.max(0,n.hp/n.maxHp*100)}%`;$('#nestText').textContent=`${Math.ceil(n.hp)}/${Math.ceil(n.maxHp)}`;$('#waveText').textContent=state.wave;$('#enemyCount').textContent=state.boss&&state.enemies.length?state.bossName:`${state.enemies.length} left`;$('#crumbsText').textContent=state.crumbs;$('#gemsText').textContent=state.runGems;$('#levelText').textContent=p.level;$('#xpBar').style.width=`${Math.min(100,p.xp/p.nextXp*100)}%`;
    const rb=$('#repairBtn'),cost=p.repairCost||12;if(rb){const ready=state.repairCd<=0&&state.crumbs>=cost&&n.hp<n.maxHp;rb.classList.toggle('not-ready',!ready);rb.innerHTML=state.repairCd>0?`REPAIR<br><small>${state.repairCd.toFixed(1)}s</small>`:`REPAIR<br><small>${cost} 🍞</small>`}
    const sb=$('#specialBtn');if(sb){const ready=state.abilityCd<=0;sb.classList.toggle('not-ready',!ready);sb.innerHTML=ready?`${BUGBREAK_DATA.bugs[p.id].ability}<br><small>E</small>`:`SPECIAL<br><small>${state.abilityCd.toFixed(1)}s</small>`}
    const combo=$('#comboHud');if(combo){$('#comboText').textContent=`x${state.combo||0}`;combo.classList.toggle('hot',(state.combo||0)>=5)}
    const ep=$('#eventPill');if(ep)ep.textContent=state.eventLabel||`${state.biome?.name||'Clover Meadow'}`;
    const ch=$('#contractHud');if(ch&&state.contract){const c=state.contract;ch.innerHTML=`<b>${c.icon} CONTRACT</b><br>${c.label}<br><span>${Math.min(c.progress,c.goal)}/${c.goal} · ${c.done?'COMPLETE':`+${c.reward} 💎`}</span>`}
  }
  function setHud(on){$('#hud').classList.toggle('hidden',!on);$('#mobileControls').classList.toggle('hidden',!on)}
  function bossBanner(on,name='APEX PREDATOR'){if(name)$('#bossName').textContent=name.toUpperCase();$('#bossBanner').classList.toggle('show',on)}
  return {$,$$,show,hideAll,toast,reward,renderBugSelect,renderShop,renderMutations,renderRelics,updateMenu,updateHud,setHud,bossBanner}
})();
