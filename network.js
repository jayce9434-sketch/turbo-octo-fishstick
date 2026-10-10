window.MP = (()=>{
  const peers=new Map();
  let role='solo', peer=null, hostConn=null, roomCode='', selfId='', status='Not connected';
  let localName=(localStorage.getItem('bugbreakUsername')||'BugKeeper').slice(0,16);
  let onPlayerState=()=>{},onAction=()=>{},onSnapshot=()=>{},onControl=()=>{},onRoster=()=>{},onStatus=()=>{},lastRoster=[];
  const ALPH='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const makeCode=()=>Array.from({length:4},()=>ALPH[Math.floor(Math.random()*ALPH.length)]).join('');
  const cleanCode=v=>(v||'').toUpperCase().replace(/[^A-Z2-9]/g,'').slice(0,4);
  const setStatus=v=>{status=v;onStatus(v);updateUI()};
  const send=(conn,obj)=>{if(conn&&conn.open)try{conn.send(obj)}catch{}};
  const closePeer=()=>{for(const p of peers.values())try{p.conn?.close()}catch{}peers.clear();try{hostConn?.close()}catch{}hostConn=null;try{peer?.destroy()}catch{}peer=null;roomCode='';selfId='';};
  function broadcastRoster(){
    if(role!=='host')return;
    const data=[{id:'host',name:localName},...Array.from(peers.entries()).filter(([,p])=>p.conn?.open).map(([id,p])=>({id,name:p.name||'Friend'}))];
    lastRoster=data;for(const p of peers.values())send(p.conn,{t:'roster',data});onRoster(data);updateUI(data)
  }
  function handleData(conn,id,isHost,m){
    if(!m||typeof m!=='object')return;
    if(m.t==='hello'&&isHost){const p=peers.get(id);if(p)p.name=(m.name||'Friend').slice(0,16);broadcastRoster()}
    else if(m.t==='welcome'&&!isHost){selfId=m.id||peer?.id||''; if(Array.isArray(m.roster)){lastRoster=m.roster;onRoster(lastRoster)} updateUI()}
    else if(m.t==='player'&&isHost)onPlayerState(id,m.data||{});
    else if(m.t==='action'&&isHost)onAction(id,m.action,m.data||{});
    else if(m.t==='snapshot'&&!isHost)onSnapshot(m.data||{});
    else if(m.t==='control'&&!isHost)onControl(m.event,m.data||{});
    else if(m.t==='roster'){lastRoster=m.data||[];onRoster(lastRoster);updateUI(lastRoster)}
    else if(m.t==='full'&&!isHost){setStatus('Room is full');setTimeout(disconnect,800)}
  }
  function wireHostConnection(conn){
    const id=conn.peer;
    if(peers.size>=2){conn.on('open',()=>{send(conn,{t:'full'});setTimeout(()=>conn.close(),180)});return}
    peers.set(id,{conn,name:(conn.metadata?.name||'Friend').slice(0,16)});
    conn.on('open',()=>{setStatus('Room open · friend connected');send(conn,{t:'welcome',id,roster:[{id:'host',name:localName},...Array.from(peers.entries()).map(([pid,p])=>({id:pid,name:p.name||'Friend'}))]});send(conn,{t:'hello',name:localName});if(window.BUGBREAK_GAME?.isRunning?.())send(conn,{t:'control',event:'startRun',data:{lateJoin:true}});broadcastRoster()});
    conn.on('data',m=>handleData(conn,id,true,m));
    conn.on('close',()=>{peers.delete(id);broadcastRoster();setStatus(peers.size?'Room open · friend connected':'Room open · waiting for friends')});
    conn.on('error',()=>{peers.delete(id);broadcastRoster()})
  }
  function wireGuestConnection(conn){
    hostConn=conn;
    conn.on('open',()=>{selfId=peer?.id||conn.peer;setStatus('Connected to host');send(conn,{t:'hello',name:localName});updateUI()});
    conn.on('data',m=>handleData(conn,conn.peer,false,m));
    conn.on('close',()=>{setStatus('Host disconnected');role='solo';roomCode='';updateUI()});
    conn.on('error',()=>setStatus('Connection problem'))
  }
  function requirePeerJS(){if(typeof window.Peer!=='function')throw new Error('Online room service could not load. Check internet and reload.')}
  async function hostRoom(){
    requirePeerJS();disconnect(false);role='host';setStatus('Creating room…');
    return new Promise((resolve,reject)=>{
      let attempts=0;
      const tryCode=()=>{
        attempts++;const code=makeCode();roomCode=code;
        peer=new Peer(code,{debug:0});
        const fail=err=>{
          if(err?.type==='unavailable-id'&&attempts<8){try{peer.destroy()}catch{};peer=null;return tryCode()}
          role='solo';roomCode='';setStatus('Could not create room');reject(err||new Error('Room creation failed'))
        };
        peer.on('open',id=>{selfId=id;roomCode=id.toUpperCase();setStatus('Room open · waiting for friends');lastRoster=[{id:'host',name:localName}];onRoster(lastRoster);updateUI();resolve(roomCode)});
        peer.on('connection',wireHostConnection);
        peer.on('disconnected',()=>setStatus('Room service disconnected'));
        peer.on('error',fail)
      };tryCode()
    })
  }
  async function joinRoom(code){
    requirePeerJS();const target=cleanCode(code);if(target.length!==4)throw new Error('Room codes are exactly 4 characters');
    disconnect(false);role='guest';roomCode=target;setStatus('Joining '+target+'…');
    return new Promise((resolve,reject)=>{
      let finished=false;peer=new Peer(undefined,{debug:0});
      const timer=setTimeout(()=>{if(!finished){finished=true;setStatus('Room not found or blocked');try{peer.destroy()}catch{};role='solo';reject(new Error('Could not reach that room'))}},9000);
      peer.on('open',id=>{selfId=id;const conn=peer.connect(target,{reliable:true,metadata:{name:localName}});wireGuestConnection(conn);conn.on('open',()=>{if(finished)return;finished=true;clearTimeout(timer);resolve(true)})});
      peer.on('error',err=>{if(finished)return;finished=true;clearTimeout(timer);role='solo';setStatus(err?.type==='peer-unavailable'?'Room not found':'Could not join room');reject(err)})
    })
  }
  function disconnect(showStatus=true){closePeer();role='solo';lastRoster=[{id:'solo',name:localName}];onRoster(lastRoster);if(showStatus)setStatus('Not connected');else updateUI()}
  function connectedCount(){if(role==='host')return 1+Array.from(peers.values()).filter(p=>p.conn?.open).length;if(role==='guest')return hostConn?.open?(lastRoster.length||2):1;return 1}
  function isConnected(){return role==='host'?peer?.open===true:role==='guest'?hostConn?.open===true:false}
  function sendPlayer(data){if(role==='guest')send(hostConn,{t:'player',data})}
  function sendAction(action,data){if(role==='guest')send(hostConn,{t:'action',action,data})}
  function broadcastSnapshot(data){if(role!=='host')return;for(const p of peers.values())send(p.conn,{t:'snapshot',data})}
  function broadcastControl(event,data={}){if(role!=='host')return;for(const p of peers.values())send(p.conn,{t:'control',event,data})}
  function setUsername(v){localName=(v||'BugKeeper').trim().slice(0,16)||'BugKeeper';localStorage.setItem('bugbreakUsername',localName);broadcastRoster();updateUI();return localName}
  function getUsername(){return localName}
  function bind(o={}){onPlayerState=o.onPlayerState||onPlayerState;onAction=o.onAction||onAction;onSnapshot=o.onSnapshot||onSnapshot;onControl=o.onControl||onControl;onRoster=o.onRoster||onRoster;onStatus=o.onStatus||onStatus}
  function updateUI(){
    const badge=document.getElementById('netBadge'),st=document.getElementById('multiStatus'),rt=document.getElementById('rosterText'),cd=document.getElementById('roomCodeDisplay'),roster=document.getElementById('roomRoster'),startBtn=document.getElementById('startSharedBtn'),guestWait=document.getElementById('guestWaitText');
    const count=Math.min(3,connectedCount());
    if(badge){badge.textContent=role==='solo'?'SOLO':role==='host'?`HOST ${count}/3`:(isConnected()?`ROOM ${roomCode}`:'JOINING');badge.classList.toggle('connected',role!=='solo'&&isConnected())}
    if(st)st.textContent=status;if(rt)rt.textContent=`${count} / 3 players`;if(cd)cd.textContent=role==='host'&&roomCode?roomCode:'----';if(startBtn){startBtn.hidden=role!=='host';startBtn.disabled=role!=='host'||!isConnected();startBtn.textContent=window.BUGBREAK_GAME?.isRunning?.()?'EXPEDITION IN PROGRESS':'START SHARED EXPEDITION'}if(guestWait){guestWait.hidden=!(role==='guest'&&isConnected());guestWait.textContent=window.BUGBREAK_GAME?.isRunning?.()?'Joining the host expedition…':'Connected! Waiting for the host to start the expedition…'}
    const r=role==='guest'&&lastRoster.length?lastRoster:role==='host'?[{id:'host',name:localName},...Array.from(peers.entries()).filter(([,p])=>p.conn?.open).map(([id,p])=>({id,name:p.name||'Friend'}))]:[{id:'solo',name:localName}];
    if(roster)roster.innerHTML=r.slice(0,3).map((x,i)=>`<div><b>${i===0&&role==='host'?'HOST':i===0&&role==='solo'?'YOU':i===0&&role==='guest'?'HOST':`PLAYER ${i+1}`}</b><span>${String(x.name||'Friend').replace(/[<>]/g,'')}</span></div>`).join('')+Array.from({length:Math.max(0,3-r.length)},()=>'<div class="empty"><b>OPEN</b><span>Waiting for player</span></div>').join('')
  }
  async function copyText(v){try{await navigator.clipboard.writeText(v);return true}catch{return false}}
  function setupUI(){
    const ui=window.UI;if(!ui)return;const input=document.getElementById('usernameInput');if(input){input.value=localName;input.addEventListener('change',()=>setUsername(input.value));input.addEventListener('blur',()=>setUsername(input.value))}
    document.getElementById('multiBtn')?.addEventListener('click',()=>{window.SFX?.click();ui.show('multiplayer');updateUI()});
    document.getElementById('multiClose')?.addEventListener('click',()=>{window.SFX?.click();ui.show('menu')});
    document.getElementById('hostRoomBtn')?.addEventListener('click',async()=>{try{const code=await hostRoom();ui.toast('Room '+code+' created — send that code to your friends')}catch(e){ui.toast(e.message||'Could not create room')}});
    document.getElementById('copyRoomBtn')?.addEventListener('click',async()=>{if(role!=='host'||!roomCode)return ui.toast('Create a room first');await copyText(roomCode);ui.toast('Room code copied: '+roomCode)});
    const codeInput=document.getElementById('roomCodeInput');if(codeInput)codeInput.addEventListener('input',()=>{codeInput.value=cleanCode(codeInput.value)});
    document.getElementById('joinRoomBtn')?.addEventListener('click',async()=>{try{await joinRoom(codeInput?.value||'');ui.toast('Joined room '+roomCode+' — waiting for the host to start')}catch(e){ui.toast(e.message||'Could not join room')}});
    document.getElementById('disconnectBtn')?.addEventListener('click',()=>{disconnect();ui.toast('Disconnected')});
    document.getElementById('startSharedBtn')?.addEventListener('click',()=>{if(role!=='host'||!isConnected())return ui.toast('Create a room first');if(window.BUGBREAK_GAME?.isRunning?.())return ui.toast('The shared expedition is already running');window.BUGBREAK_GAME?.startSharedRun?.()});
    updateUI()
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setupUI,{once:true});else setupUI();
  return {bind,hostRoom,joinRoom,disconnect,sendPlayer,sendAction,broadcastSnapshot,broadcastControl,setUsername,getUsername,isConnected,connectedCount,get role(){return role},get status(){return status},get selfId(){return selfId},get roomCode(){return roomCode},updateUI};
})();
