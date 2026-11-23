import type { Peer, DataConnection } from 'peerjs';
import { VersusMatch, VS_RULES, type Player, type PoolMode } from './versus.ts';
import { validSpin, type Spin, type PhysicsEvent } from './physics.ts';
import { getTableDesign } from './tables.ts';
import { AUDIBLE_IMPACT_SPEED, validTableImpact, type TableImpact } from './audio.ts';
const el=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as T;
const cleanName=(name:unknown)=>typeof name==='string'?name.trim().slice(0,20)||'Rune wanderer':'Rune wanderer';
const protocol=2;
const roomId=(code:string)=>`velvet-runes-v${protocol}-${code}`;
type RuleAction={type:'call-eight';pocket:number}|{type:'push-out'}|{type:'push-choice';passBack:boolean};
interface OnlineHooks {change:()=>void;table:(id:string,locked:boolean)=>void;tableId:()=>string;events:(events:PhysicsEvent[])=>void;impact:(impact:TableImpact)=>void;shot:(power:number)=>void;exit:()=>void;}

/** Invite-only WebRTC. The host owns physics, rules and turn validation. */
export class OnlineGame {
  active=false;connected=false;isHost=false;player:Player=0;match:VersusMatch|null=null;
  peer:Peer|null=null;connection:DataConnection|null=null;names:[string,string]=['Host','Challenger'];code='';
  pending=false;private timer=0;private sentAt=0;private hostReady=false;private guestReady=false;private generation=0;
  private hooks:OnlineHooks;
  constructor(hooks:OnlineHooks){
    this.hooks=hooks;
    el('online-create').addEventListener('click',()=>void this.create());el('online-join').addEventListener('click',()=>void this.join());
    el('online-leave').addEventListener('click',()=>{this.leave();this.hooks.exit();});
    el('online-rematch').addEventListener('click',()=>this.requestRematch());
    el('online-copy').addEventListener('click',()=>{
      const url=new URL(location.href);url.searchParams.set('room',this.code);
      void navigator.clipboard.writeText(url.href).then(()=>this.status('Invite link copied. Send it to one friend.')).catch(()=>this.status(`Send your friend this room code: ${this.code}`));
    });
    el<HTMLSelectElement>('online-rules').addEventListener('change',()=>this.describeRules());this.describeRules();
    const room=new URLSearchParams(location.search).get('room');if(room&&/^[A-Z2-9]{8}$/i.test(room))el<HTMLInputElement>('online-code').value=room.toUpperCase();
    window.addEventListener('beforeunload',()=>this.closePeer());
  }
  get canShoot(){return this.active&&this.connected&&!this.pending&&this.match?.turn===this.player&&!!this.match?.canShoot;}
  get canPlace(){return this.active&&this.connected&&!this.pending&&this.match?.turn===this.player&&!!this.match?.ballInHand&&!this.match.inShot;}
  get canChooseRule(){return this.active&&this.connected&&!this.pending&&this.match?.turn===this.player&&this.match.winner===null&&!this.match.inShot;}
  get mode(){return el<HTMLSelectElement>('online-rules').value==='9-ball'?'9-ball':'8-ball';}
  describeRules(){el('online-rule-description').textContent=VS_RULES[this.mode];}
  enter(){this.active=true;el('online-panel').classList.remove('hidden');this.hooks.change();}
  status(message:string){el('online-status').textContent=message;}
  busy(value:boolean){for(const id of ['online-create','online-join','online-rules','online-name'])el<HTMLButtonElement>(id).disabled=value;}
  closePeer(){clearTimeout(this.timer);this.generation++;this.connected=false;this.pending=false;this.connection?.close();this.peer?.destroy();this.connection=null;this.peer=null;}
  leave(){this.closePeer();this.active=false;this.match=null;this.code='';this.busy(false);this.hooks.table(this.hooks.tableId(),false);el('online-panel').classList.add('hidden');el('room-invite').classList.add('hidden');el('duel-players').classList.add('hidden');el('online-rematch').classList.add('hidden');this.status('Create a room, or join a friend using their code.');this.hooks.change();}
  async makePeer(id?:string){
    this.closePeer();this.match=null;this.enter();this.busy(true);this.status('Opening the duel portal…');const generation=this.generation;
    try{
      const {default:Peer}=await import('peerjs');if(generation!==this.generation)return null;
      const peer=id?new Peer(id,{debug:0}):new Peer({debug:0});this.peer=peer;
      peer.on('error',error=>{if(generation!==this.generation)return;const messages:Record<string,string>={'peer-unavailable':'Room not found. Check the code and ask the host to keep the room open.','unavailable-id':'Room code collision. Create a new room.','network':'Signaling connection failed. Check your network and retry.','webrtc':'A direct connection could not be established. Try another network.'};this.fail(messages[error.type]??'The connection failed. Leave and try creating or joining again.');});
      peer.on('disconnected',()=>{if(generation===this.generation&&!this.connected)this.fail('Signaling disconnected. Please create or join again.');});
      this.timer=window.setTimeout(()=>{if(generation===this.generation&&!peer.open)this.fail('Signaling timed out. Check your connection and try again.');},18000);
      return {peer,generation};
    }catch{this.fail('Could not load online play. Check your connection and retry.');return null;}
  }
  async create(){
    const bytes=crypto.getRandomValues(new Uint8Array(8)),alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';this.code=Array.from(bytes,b=>alphabet[b%alphabet.length]).join('');
    const code=this.code;this.isHost=true;this.player=0;this.names=[cleanName(el<HTMLInputElement>('online-name').value),'Challenger'];
    const setup=await this.makePeer(roomId(code));if(!setup)return;const {peer,generation}=setup;
    peer.on('open',()=>{if(generation!==this.generation)return;clearTimeout(this.timer);this.code=code;el('room-code').textContent=code;el('room-invite').classList.remove('hidden');this.status(`Room ready · ${this.mode}. Share the invite code. Waiting for one opponent.`);});
    peer.on('connection',connection=>{
      if(generation!==this.generation||this.connection){connection.on('open',()=>{connection.send({v:protocol,type:'full'});connection.close();});return;}
      this.attach(connection,generation);
    });
  }
  async join(){
    const code=el<HTMLInputElement>('online-code').value.trim().toUpperCase();if(!/^[A-Z2-9]{8}$/.test(code)){this.status('Enter the 8-character room code from your friend.');return;}
    this.isHost=false;this.player=1;this.names=['Host',cleanName(el<HTMLInputElement>('online-name').value)];
    const setup=await this.makePeer();if(!setup)return;const {peer,generation}=setup;this.code=code;
    peer.on('open',()=>{if(generation!==this.generation)return;clearTimeout(this.timer);this.status('Finding your opponent…');this.attach(peer.connect(roomId(code),{reliable:true,serialization:'json'}),generation);});
  }
  attach(connection:DataConnection,generation:number){
    this.connection=connection;
    this.timer=window.setTimeout(()=>{if(generation===this.generation&&!this.connected)this.fail('Joining timed out. The room may be closed or the network may block WebRTC. Try again on another network.');},22000);
    connection.on('open',()=>{if(generation!==this.generation)return;if(!this.isHost)this.send({type:'hello',name:this.names[1]});});
    connection.on('data',data=>{if(generation!==this.generation)return;try{if(JSON.stringify(data).length>14000)return;this.receive(data);}catch{this.fail('Invalid connection data. Please rejoin.');}});
    connection.on('close',()=>{if(generation!==this.generation)return;this.connected=false;this.pending=false;this.status('Opponent disconnected. The match is frozen. Leave online to start another room.');this.busy(false);this.hooks.change();});
    connection.on('error',()=>{if(generation===this.generation)this.fail('The peer connection failed. Leave and create or join again.');});
  }
  send(data:Record<string,unknown>){if(this.connection?.open)this.connection.send({v:protocol,...data});}
  receive(value:unknown){
    if(!value||typeof value!=='object')return;const data=value as Record<string,unknown>;if(data.v!==protocol)return;
    if(data.type==='full'){this.fail('That room already has two players. Ask for a new invite.');return;}
    if(this.isHost){
      if(data.type==='hello'&&!this.connected){this.names[1]=cleanName(data.name);this.connected=true;clearTimeout(this.timer);this.match=new VersusMatch(this.mode);this.hostReady=this.guestReady=false;this.sendState();this.refresh();return;}
      if(!this.connected||!this.match)return;
      if(data.type==='shoot'&&data.sequence===this.match.shots&&typeof data.angle==='number'&&typeof data.power==='number'){
        if(this.match.shoot(1,data.angle,data.power,data.spin)){this.hooks.shot(data.power);this.send({type:'shot',power:data.power,spin:data.spin??{x:0,y:0}});}this.sendState();
      }
      if(data.type==='place'&&typeof data.x==='number'&&typeof data.y==='number'){this.match.placeCue(1,data.x,data.y);this.sendState();}
      if(data.type==='call-eight'||data.type==='push-out'||data.type==='push-choice'){
        if(data.sequence===this.match.shots)this.applyRule(1,data);
        this.sendState();
      }
      if(data.type==='rematch'&&this.match.winner!==null){this.guestReady=true;this.tryRematch();}
    }else{
      if(data.type==='state'&&(data.mode==='8-ball'||data.mode==='9-ball')){
        const next=this.match??new VersusMatch(data.mode);const previous=next.balls.filter(b=>b.active).map(b=>b.id);
        if(!next.applySnapshot(data.match))return;
        this.match=next;this.connected=true;this.pending=false;clearTimeout(this.timer);
        if(Array.isArray(data.names)&&data.names.length===2)this.names=[cleanName(data.names[0]),cleanName(data.names[1])];
        if(typeof data.table==='string'&&getTableDesign(data.table).id===data.table)this.hooks.table(data.table,true);
        el<HTMLSelectElement>('online-rules').value=data.mode;this.describeRules();
        const pots=next.balls.filter(b=>!b.active&&previous.includes(b.id)).map(b=>({type:'pot' as const,ball:b,speed:300}));
        if(data.tableAudio!==true)for(const pot of pots)this.hooks.impact(pot);
        this.hooks.events(pots);
        this.refresh();
      }
      if(data.type==='shot'&&typeof data.power==='number'&&Number.isFinite(data.power)&&data.power>=.1&&data.power<=1)this.hooks.shot(data.power);
      if(this.connected&&data.type==='impacts'&&Array.isArray(data.impacts)&&data.impacts.length<=3&&data.impacts.every(validTableImpact)){
        for(const impact of data.impacts)this.hooks.impact(impact);
      }
    }
  }
  refresh(){
    const match=this.match;if(!match)return;el('duel-players').classList.remove('hidden');
    for(const player of [0,1] as const){const field=el(player===0?'player-host':'player-guest');field.textContent=`${this.names[player]}${player===this.player?' · You':''}`;const small=document.createElement('small');small.textContent=match.mode==='8-ball'?(match.groups[player]??'Open table')+(match.groups[player]?` · ${match.groupRemaining(player)} left`:''):`Target: ${match.lowest===Infinity?'—':match.lowest}`;field.append(small);field.classList.toggle('active',match.turn===player&&match.winner===null);}
    this.status(match.winner===null?`${this.names[match.turn]}'s turn. ${match.reason}`:`${this.names[match.winner]} wins! ${match.reason}`);
    const rematch=el<HTMLButtonElement>('online-rematch');rematch.classList.toggle('hidden',match.winner===null);if(match.winner===null)rematch.disabled=false;
    this.hooks.change();
  }
  fail(message:string){this.closePeer();this.busy(false);this.status(message);this.hooks.change();}
  sendState(){if(!this.match)return;this.send({type:'state',mode:this.match.mode,match:this.match.snapshot(),names:this.names,table:this.hooks.tableId(),tableAudio:true});this.sentAt=performance.now();this.refresh();}
  tick(dt:number){
    if(!this.active||!this.connected||!this.isHost||!this.match)return [];
    const wasMoving=this.match.inShot,events=this.match.tick(dt);
    if(events.length){
      const impacts:TableImpact[]=[];
      for(const type of ['pot','rail','collision'] as const){
        const speed=events.reduce((max,e)=>e.type===type?Math.max(max,e.speed):max,-1);
        if(speed>=(type==='pot'?0:AUDIBLE_IMPACT_SPEED))impacts.push({type,speed});
      }
      if(impacts.length)this.send({type:'impacts',impacts});
    }
    if((wasMoving&&!this.match.inShot)||performance.now()-this.sentAt>(this.match.inShot?70:1800))this.sendState();return events;
  }
  shoot(angle:number,power:number,spin:Spin={x:0,y:0}){
    if(!this.canShoot||!this.match||!validSpin(spin))return false;
    if(this.isHost){if(!this.match.shoot(0,angle,power,spin))return false;this.send({type:'shot',power,spin});this.sendState();}
    else{this.pending=true;this.send({type:'shoot',angle,power,spin,sequence:this.match.shots});}
    return true;
  }
  place(x:number,y:number){if(!this.canPlace||!this.match)return false;if(this.isHost){const placed=this.match.placeCue(0,x,y);if(placed)this.sendState();return placed;}this.pending=true;this.send({type:'place',x,y});return true;}
  private applyRule(player:Player,action:Record<string,unknown>){
    if(!this.match)return false;
    if(action.type==='call-eight')return this.match.callEightPocket(player,action.pocket);
    if(action.type==='push-out')return this.match.declarePushOut(player);
    if(action.type==='push-choice')return this.match.choosePushOut(player,action.passBack);
    return false;
  }
  rule(action:RuleAction){
    if(!this.canChooseRule||!this.match)return false;
    if(this.isHost){
      if(!this.applyRule(0,action))return false;
      this.sendState();
    }else{
      this.pending=true;this.send({...action,sequence:this.match.shots});
    }
    return true;
  }
  tableChanged(){if(this.isHost&&this.connected)this.sendState();}
  tryRematch(){if(this.hostReady&&this.guestReady&&this.match){this.match=new VersusMatch(this.match.mode);this.hostReady=this.guestReady=false;this.sendState();}else this.status('Rematch requested. Waiting for the other player.');}
  requestRematch(){if(!this.connected||!this.match||this.match.winner===null)return;if(this.isHost){this.hostReady=true;this.tryRematch();}else this.send({type:'rematch'});el<HTMLButtonElement>('online-rematch').disabled=true;this.status('Rematch requested. Waiting for your opponent.');}
}
