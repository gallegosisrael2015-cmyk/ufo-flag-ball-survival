const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });
app.use(express.static(path.join(__dirname, 'public')));
app.get('/health', (_,res)=>res.send('ok'));

const FLAGS=['🇺🇸','🇬🇧','🇨🇦','🇧🇷','🇩🇪','🇫🇷','🇯🇵','🇮🇳','🇲🇽','🇦🇺','🇮🇹','🇪🇸','🇵🇹','🇳🇱','🇧🇪','🇨🇭','🇸🇪','🇳🇴','🇫🇮','🇩🇰','🇵🇱','🇺🇦','🇹🇷','🇬🇷','🇰🇷','🇨🇳','🇹🇭','🇻🇳','🇵🇭','🇮🇩','🇳🇿','🇦🇷','🇨🇱','🇨🇴','🇵🇪','🇿🇦','🇪🇬','🇳🇬','🇸🇦','🇮🇱'];
const rooms = new Map();
const rand=(a,b)=>a+Math.random()*(b-a);
const code=()=>Math.random().toString(36).slice(2,8).toUpperCase();
function makeBall(id,flag,player=false){const a=rand(0,Math.PI*2);return{id,flag,player,alive:true,x:rand(40,760),y:rand(65,465),vx:Math.cos(a)*rand(100,165),vy:Math.sin(a)*rand(100,165),r:player?17:16,ax:Math.cos(a),ay:Math.sin(a),roam:rand(.5,2),input:{x:0,y:0}};}
function freshRoom(roomCode,host){const r={code:roomCode,host,players:new Map(),balls:[],ufos:[],status:'lobby',elapsed:0,last:Date.now(),winner:null};rooms.set(roomCode,r);return r;}
function snapshot(r){return{status:r.status,elapsed:r.elapsed,players:r.players.size,balls:r.balls.map(b=>({id:b.id,flag:b.flag,player:b.player,alive:b.alive,x:b.x,y:b.y,r:b.r})),ufos:r.ufos.map(u=>({x:u.x,y:u.y,target:u.target})),alive:r.balls.filter(b=>b.alive).length,dead:r.balls.filter(b=>!b.alive).length,winner:r.winner};}
function broadcast(r){io.to(r.code).emit('state',snapshot(r));}
function start(r){r.elapsed=0;r.winner=null;r.status='playing';r.balls=[];let idx=0;for(const p of r.players.values()){p.flag=FLAGS[idx++%FLAGS.length];const b=makeBall(p.id,p.flag,true);r.balls.push(b);p.ball=b;}
let bot=0;while(r.balls.length<40){let f=FLAGS[idx++%FLAGS.length];r.balls.push(makeBall('bot'+bot++,f,false));}
r.ufos=[{x:rand(120,680),y:rand(65,150),target:null,beam:0,wait:1,chase:0}];r.last=Date.now();broadcast(r);}
io.on('connection',socket=>{
 socket.on('createRoom',()=>{let c;do{c=code()}while(rooms.has(c));const r=freshRoom(c,socket.id);r.players.set(socket.id,{id:socket.id,flag:null,ball:null});socket.join(c);socket.data.room=c;socket.emit('room',{code:c,playerId:socket.id});broadcast(r);});
 socket.on('joinRoom',c=>{c=String(c||'').trim().toUpperCase();const r=rooms.get(c);if(!r){socket.emit('errorMessage','Room not found. Check the code.');return;}if(r.status==='playing'){socket.emit('errorMessage','That game has already started. Create or join a lobby.');return;}if(r.players.size>=40){socket.emit('errorMessage','That room is full.');return;}r.players.set(socket.id,{id:socket.id,flag:null,ball:null});socket.join(c);socket.data.room=c;socket.emit('joined',{code:c,playerId:socket.id});broadcast(r);});
 socket.on('input',v=>{const r=rooms.get(socket.data.room);if(!r||r.status!=='playing')return;const b=r.balls.find(x=>x.id===socket.id&&x.alive);if(!b)return;let x=Number(v?.x)||0,y=Number(v?.y)||0,d=Math.hypot(x,y);if(d>1){x/=d;y/=d;}b.input={x,y};});
 socket.on('startGame',()=>{const r=rooms.get(socket.data.room);if(!r)return;if(r.host!==socket.id){socket.emit('errorMessage','Only the room creator can start the game.');return;}if(r.players.size<1)return;start(r);});
 socket.on('disconnect',()=>{const c=socket.data.room,r=rooms.get(c);if(!r)return;r.players.delete(socket.id);r.balls=r.balls.filter(b=>b.id!==socket.id);if(r.host===socket.id){const next=r.players.keys().next().value;r.host=next||null;}if(!r.players.size){rooms.delete(c);return;}broadcast(r);});
});
setInterval(()=>{for(const r of rooms.values()){if(r.status!=='playing')continue;const now=Date.now(),dt=Math.min(.05,(now-r.last)/1000);r.last=now;r.elapsed+=dt;
 for(const b of r.balls){if(!b.alive)continue;if(b.player){b.vx+=b.input.x*900*dt;b.vy+=b.input.y*700*dt;}else{b.roam-=dt;if(b.roam<=0){b.roam=rand(.7,2);const a=Math.atan2(b.ay,b.ax)+rand(-1.7,1.7);b.ax=Math.cos(a);b.ay=Math.sin(a);}b.vx+=b.ax*270*dt;b.vy+=b.ay*270*dt;}
 b.vx*=Math.pow(.91,dt*60);b.vy*=Math.pow(.91,dt*60);let s=Math.hypot(b.vx,b.vy);if(s>315){b.vx*=315/s;b.vy*=315/s;}b.x+=b.vx*dt;b.y+=b.vy*dt;
 if(b.x<b.r){b.x=b.r;b.vx=Math.abs(b.vx)*.9;}if(b.x>800-b.r){b.x=800-b.r;b.vx=-Math.abs(b.vx)*.9;}if(b.y<40+b.r){b.y=40+b.r;b.vy=Math.abs(b.vy)*.9;}if(b.y>510-b.r){b.y=510-b.r;b.vy=-Math.abs(b.vy)*.9;}}
 for(const u of r.ufos){if(!u.target||!r.balls.some(b=>b.id===u.target&&b.alive)){const nearest=r.balls.filter(b=>b.alive).sort((a,b)=>Math.hypot(a.x-u.x,a.y-u.y)-Math.hypot(b.x-u.x,b.y-u.y))[0];u.target=nearest?.id||null;u.beam=0;u.wait=.5;u.chase=0;}
 if(u.wait>0){u.wait-=dt;continue;}const t=r.balls.find(b=>b.id===u.target&&b.alive);if(!t)continue;if(t.player){u.chase+=dt;if(u.chase>=15){const other=r.balls.filter(b=>b.alive&&!b.player).sort((a,b)=>Math.hypot(a.x-u.x,a.y-u.y)-Math.hypot(b.x-u.x,b.y-u.y))[0];u.target=other?.id||null;u.chase=0;u.beam=0;u.wait=.7;continue;}}else u.chase=0;
 u.x+=(t.x-u.x)*Math.min(1,dt*.8);u.y+=(t.y-95-u.y)*Math.min(1,dt*.8);u.beam+=dt;if(Math.hypot(t.x-u.x,t.y-(u.y+65))<46&&u.beam>1.5){t.alive=false;u.target=null;u.wait=1.2;u.beam=0;u.chase=0;}}
 const alive=r.balls.filter(b=>b.alive);if(alive.length<=1){r.status='finished';r.winner=alive[0]?.id||null;}broadcast(r);
}},50);
const PORT=process.env.PORT||3000;server.listen(PORT,()=>console.log(`UFO multiplayer server listening on ${PORT}`));
