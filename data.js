window.BUGBREAK_DATA = {
  maxWave: 50,
  bugs: {
    ant: {name:'Ant', icon:'🐜', speed:255, hp:125, damage:28, attackRate:.34, dash:520, color:'#a84d3e', accent:'#ff9b6f', desc:'Balanced • Rally ability', ability:'RALLY'},
    termite: {name:'Termite', icon:'🪵', speed:225, hp:175, damage:36, attackRate:.46, dash:455, color:'#ead7ae', accent:'#b9784f', desc:'Tank • Fortify nest', unlockWave:2, ability:'FORTIFY'},
    ladybug: {name:'Ladybug', icon:'🐞', speed:240, hp:155, damage:25, attackRate:.36, dash:500, color:'#d94343', accent:'#171717', desc:'Guardian • Shell shield', unlockWave:3, nestGuard:.28, ability:'SHELL'},
    fly: {name:'Fly', icon:'🪰', speed:315, hp:105, damage:23, attackRate:.25, dash:650, color:'#405f66', accent:'#b34e4f', desc:'Speedster • Hyperbuzz', unlockWave:5, ability:'HYPERBUZZ'},
    mosquito: {name:'Mosquito', icon:'🦟', speed:295, hp:112, damage:24, attackRate:.29, dash:610, color:'#735a48', accent:'#c95f5f', desc:'Vampire • Blood frenzy', unlockWave:8, lifesteal:.12, ability:'BLOOD FRENZY'},
    bumblebee: {name:'Bumblebee', icon:'🐝', speed:265, hp:142, damage:31, attackRate:.32, dash:560, color:'#e4b63e', accent:'#26221c', desc:'Support • Pollen burst', unlockWave:12, ability:'POLLEN BURST'},
    stagbeetle: {name:'Stag Beetle', icon:'🪲', speed:215, hp:215, damage:45, attackRate:.52, dash:455, color:'#4d2d28', accent:'#c98558', desc:'Bruiser • Horn charge', unlockWave:18, ability:'HORN CHARGE'}
  },
  permanent: [
    {id:'shell',name:'Reinforced Shell',icon:'🛡️',desc:'+9% starting max HP per rank.',base:4,max:8},
    {id:'fangs',name:'Serrated Mandibles',icon:'🦷',desc:'+8% bite damage per rank.',base:4,max:8},
    {id:'legs',name:'Spring Legs',icon:'⚡',desc:'+4% movement speed per rank.',base:3,max:8},
    {id:'nest',name:'Resin Nest',icon:'🏠',desc:'+14% nest health per rank.',base:4,max:8},
    {id:'workers',name:'Worker Crew',icon:'🛠️',desc:'Nest regenerates +1.5 HP/sec per rank.',base:5,max:7},
    {id:'magnet',name:'Crumb Magnet',icon:'🧲',desc:'+24 pickup radius per rank.',base:3,max:6},
    {id:'luck',name:'Shiny Instinct',icon:'💎',desc:'+1.5% gem drop chance per rank.',base:5,max:7},
    {id:'dash',name:'Wingbeat Burst',icon:'💨',desc:'Dash cooldown -6% per rank.',base:4,max:7},
    {id:'repair',name:'Resin Patches',icon:'🩹',desc:'Emergency repair restores +18 nest HP per rank.',base:4,max:6},
    {id:'crit',name:'Hunter Eyes',icon:'✨',desc:'+2% critical chance per rank.',base:5,max:6},
    {id:'ability',name:'Instinct Core',icon:'⚙️',desc:'Active ability cooldown -7% per rank.',base:6,max:6},
    {id:'bounty',name:'Forager Map',icon:'🗺️',desc:'Contracts pay +1 gem every 2 ranks.',base:5,max:6}
  ],
  mutations: [
    {id:'damage',icon:'🦷',name:'Razor Bite',desc:'+20% bite damage.',apply:p=>p.damage*=1.20},
    {id:'speed',icon:'⚡',name:'Leg Day',desc:'+11% movement speed.',apply:p=>p.speed*=1.11},
    {id:'hp',icon:'❤️',name:'Chitin Plates',desc:'+34 max HP and heal 34.',apply:p=>{p.maxHp+=34;p.hp=Math.min(p.maxHp,p.hp+34)}},
    {id:'rate',icon:'💥',name:'Snap Jaws',desc:'Bite 12% faster.',apply:p=>p.attackRate*=.88},
    {id:'dash',icon:'💨',name:'Rocket Abdomen',desc:'Dash farther and recharge 15% faster.',apply:p=>{p.dashPower*=1.12;p.dashCooldown*=.85}},
    {id:'heal',icon:'🍯',name:'Honey Reserve',desc:'Heal 6 HP after every kill.',apply:p=>p.killHeal=(p.killHeal||0)+6},
    {id:'arc',icon:'⚔️',name:'Wide Mandibles',desc:'Bite reaches 20% farther.',apply:p=>p.attackRange*=1.20},
    {id:'crit',icon:'✨',name:'Predator Instinct',desc:'+11% critical hit chance.',apply:p=>p.crit=Math.min(.65,(p.crit||.05)+.11)},
    {id:'nestheal',icon:'🧪',name:'Worker Repair Crew',desc:'Nest repairs +2 HP/sec.',apply:p=>p.nestRegen=(p.nestRegen||0)+2},
    {id:'guard',icon:'🧱',name:'Resin Armor',desc:'Nest takes 13% less damage.',apply:p=>p.nestDR=Math.min(.55,(p.nestDR||0)+.13)},
    {id:'magnet',icon:'🧲',name:'Hungry Colony',desc:'Pickup radius +55.',apply:p=>p.pickupRadius+=55},
    {id:'leech',icon:'🩸',name:'Hemolymph Feast',desc:'Bites heal 5% of damage dealt.',apply:p=>p.lifesteal=Math.min(.35,(p.lifesteal||0)+.05)}
  ],
  relics: [
    {id:'royalJelly',icon:'🍯',name:'Royal Jelly',desc:'+35% damage, -10% max HP.',apply:(p,s)=>{p.damage*=1.35;p.maxHp*=.90;p.hp=Math.min(p.hp,p.maxHp)}},
    {id:'amber',icon:'🟠',name:'Ancient Amber',desc:'+18% speed and bite speed.',apply:p=>{p.speed*=1.18;p.attackRate*=.82}},
    {id:'resin',icon:'🧱',name:'Living Resin',desc:'Nest +220 max HP and instantly repairs 220.',apply:(p,s)=>{s.nest.maxHp+=220;s.nest.hp=Math.min(s.nest.maxHp,s.nest.hp+220)}},
    {id:'moonwing',icon:'🌙',name:'Moonwing',desc:'Dash recharges 30% faster and deals a shockwave.',apply:p=>{p.dashCooldown*=.70;p.dashShock=true}},
    {id:'spore',icon:'🍄',name:'Spore Heart',desc:'Heal 2 HP/sec and +20% lifesteal effectiveness.',apply:p=>{p.selfRegen=(p.selfRegen||0)+2;p.lifesteal=Math.min(.45,p.lifesteal+.08)}},
    {id:'crown',icon:'👑',name:'Predator Crown',desc:'Bosses take +45% damage from your bites.',apply:p=>p.bossDamage=(p.bossDamage||1)*1.45},
    {id:'crumbcore',icon:'🍞',name:'Crumb Core',desc:'Every 8th kill drops a gem.',apply:p=>p.gemEvery=8},
    {id:'mirror',icon:'💠',name:'Prism Shell',desc:'Every 6th hit against you is completely blocked.',apply:p=>p.blockEvery=6},
    {id:'queen',icon:'🐜',name:'Queen Signal',desc:'Nest regeneration +5 HP/sec and repair costs 8 crumbs.',apply:p=>{p.nestRegen+=5;p.repairCost=8}}
  ],
  biomes: [
    {name:'Clover Meadow',sky:'#335d32',edge:'#0b261b',accent:'#c8ff69'},
    {name:'Flower Bed',sky:'#664836',edge:'#241b19',accent:'#ff9dc2'},
    {name:'Night Garden',sky:'#20344b',edge:'#091521',accent:'#7cecff'},
    {name:'Compost Yard',sky:'#5b5430',edge:'#211d10',accent:'#ffd56b'},
    {name:'Porch Raid',sky:'#495461',edge:'#151a1f',accent:'#d8e5ff'}
  ],
  bosses: {
    5:{type:'mantis',name:'Garden Mantis',color:'#84a64d',music:0},10:{type:'hornet',name:'Red Hornet',color:'#d96c34',music:1},15:{type:'mantis',name:'Feral Mantis',color:'#758c39',music:0},20:{type:'wolfspider',name:'Wolf Spider',color:'#6d493a',music:2},25:{type:'hornet',name:'Royal Hornet',color:'#d79b38',music:1},30:{type:'stag',name:'Stag Beetle',color:'#492d28',music:3},35:{type:'mantis',name:'Emerald Reaper',color:'#4c8d55',music:0},40:{type:'scorpion',name:'Bark Scorpion',color:'#9d7c4d',music:4},45:{type:'wolfspider',name:'Night Wolf',color:'#4f3844',music:2},50:{type:'empress',name:'BACKYARD EMPRESS',color:'#b75945',music:5}
  }
};
