(function(){
var $=function(i){return document.getElementById(i)};
var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
var EM=['💗','💖','💕','🎀','🐾','🩷','💓'];
var scenes=[$('s1'),$('s2'),$('s3'),$('s4')],cur=0,GOAL=[12,10,15],cnt=[0,0,0],bt={};

/* ---------- utilidades ---------- */
for(var i=0;i<14;i++){var b=document.createElement('span');b.className='bg';b.textContent=EM[i%4];
  b.style.left=Math.random()*96+'%';b.style.fontSize=(14+Math.random()*26)+'px';
  b.style.animationDuration=(12+Math.random()*14)+'s';b.style.animationDelay=(-Math.random()*20)+'s';
  scenes[i%3].appendChild(b)}
function burst(x,y,k){for(var i=0;i<k;i++){var h=document.createElement('span');h.className='pop';
  h.textContent=EM[Math.random()*EM.length|0];var a=Math.random()*6.28,d=50+Math.random()*120;
  h.style.left=x+'px';h.style.top=y+'px';h.style.setProperty('--x',Math.cos(a)*d+'px');
  h.style.setProperty('--y',(Math.sin(a)*d-50)+'px');h.style.setProperty('--r',(Math.random()*80-40)+'deg');
  h.style.fontSize=(16+Math.random()*22)+'px';document.body.appendChild(h);setTimeout(function(e){e.remove()},1500,h)}}
function say(id,t){var el=$(id);el.textContent=t;el.classList.add('on');clearTimeout(bt[id]);bt[id]=setTimeout(function(){el.classList.remove('on')},1800)}
function mid(el){var r=el.getBoundingClientRect();return[r.left+r.width/2,r.top+r.height/2]}
function wiggle(el){el.classList.remove('pet');void el.getBoundingClientRect().width;el.classList.add('pet')}
function tick(i){cnt[i]++;var s=scenes[i];s.querySelector('.bar i').style.width=Math.min(100,cnt[i]/GOAL[i]*100)+'%';
  var c=s.querySelector('.count');
  if(cnt[i]<GOAL[i]){if(i!=1||cnt[i]>0)c.textContent='💗 '+cnt[i]+' / '+GOAL[i]}
  else{c.textContent=['Está feliz contigo, Sheyla 🥹','A Michi le encantas 💕','¡Eres rapidísima! 🎉'][i];s.querySelector('.next').classList.add('show')}}
function go(i){scenes[cur].classList.remove('on');cur=i;scenes[i].classList.add('on');
  document.querySelectorAll('#dots i').forEach(function(d,k){d.classList.toggle('a',k==i)});
  document.body.classList.toggle('dark',i==3);if(i==3&&window.Galaxy)Galaxy.start()}
document.querySelectorAll('.next').forEach(function(b,i){b.addEventListener('click',function(){go(i+1)})});
scenes[0].addEventListener('click',function(e){if(e.target==scenes[0])burst(e.clientX,e.clientY,4)});

/* ---------- ETAPA 1: perrito ---------- */
var dog=$('dog'),talks=['¡Guau! 💗','Te quiero mucho 🐾','Eres mi persona favorita','¿Jugamos? 🎾','Sheyla es la mejor ✨','*mueve la colita*'];
var acts={
  pet:function(e){var c=mid(dog);burst(e&&e.clientX||c[0],e&&e.clientY||c[1],9);wiggle(dog);say('bubble','Mmm, qué rico 😊')},
  treat:function(){var c=mid(dog),f=document.createElement('div');f.id='fly';f.textContent='🦴';
    f.style.left=(c[0]+120)+'px';f.style.top=(c[1]-110)+'px';f.style.transition='all .7s ease-in';document.body.appendChild(f);
    requestAnimationFrame(function(){f.style.left=c[0]+'px';f.style.top=(c[1]+10)+'px';f.style.transform='scale(.4)'});
    setTimeout(function(){f.remove();dog.classList.add('chew');burst(c[0],c[1],7);say('bubble','¡Ñam ñam! 🦴');
      setTimeout(function(){dog.classList.remove('chew')},1100)},720)},
  ball:function(){var c=mid(dog),f=document.createElement('div');f.id='fly';f.textContent='🎾';
    f.style.left=(c[0]-130)+'px';f.style.top=(c[1]+60)+'px';f.style.transition='left 1.1s linear,top 1.1s cubic-bezier(.3,-1.2,.6,1)';
    document.body.appendChild(f);requestAnimationFrame(function(){f.style.left=(c[0]+130)+'px';f.style.top=(c[1]+60)+'px'});
    setTimeout(function(){wiggle(dog);say('bubble','¡La atrapé! 🎾')},550);setTimeout(function(){f.remove();burst(c[0],c[1],6)},1150)},
  talk:function(){var c=mid(dog);say('bubble',talks[Math.random()*talks.length|0]);burst(c[0],c[1]-60,5);wiggle(dog)}};
dog.addEventListener('click',function(e){acts.pet(e);tick(0)});
dog.addEventListener('keydown',function(e){if(e.key=='Enter'||e.key==' '){e.preventDefault();acts.pet();tick(0)}});
document.querySelectorAll('.acts button').forEach(function(b){b.addEventListener('click',function(){acts[b.dataset.a]();tick(0)})});
addEventListener('pointermove',function(e){var c=mid(dog),dx=e.clientX-c[0],dy=e.clientY-c[1],d=Math.hypot(dx,dy)||1,k=Math.min(4,d/40);
  $('eyes').style.transform='translate('+dx/d*k+'px,'+dy/d*k+'px)'});
setInterval(function(){dog.classList.add('blink');setTimeout(function(){dog.classList.remove('blink')},140)},3200);

/* ---------- ETAPA 2: gatita con moño ---------- */
var cat=$('cat'),ks=$('kstage'),meows=['Miau 💗','Prrr… 😻','¡Miau miau! 🎀','Qué linda eres ✨'],nst=0;
ks.addEventListener('click',function(e){
  if(e.target.closest('#cat')){var c=mid(cat);burst(e.clientX,e.clientY,8);wiggle(cat);say('bubble2',meows[Math.random()*meows.length|0])}
  else if(nst<14){nst++;var r=ks.getBoundingClientRect(),s=document.createElement('span');s.className='stk';s.textContent=['🎀','💗','🌸'][nst%3];
    s.style.left=(e.clientX-r.left-13)+'px';s.style.top=(e.clientY-r.top-13)+'px';ks.appendChild(s)}
  tick(1)});
cat.addEventListener('keydown',function(e){if(e.key=='Enter'||e.key==' '){e.preventDefault();wiggle(cat);say('bubble2','Miau 💗');tick(1)}});
document.querySelectorAll('.swatches button').forEach(function(b){b.addEventListener('click',function(e){e.stopPropagation();
  document.documentElement.style.setProperty('--bow',b.dataset.c);wiggle(cat);tick(1)})});

/* ---------- ETAPA 3: atrapar corazones ---------- */
var fe=['💗','💖','🎀','🐾','💕','🐶','🐱'];
setInterval(function(){if(cur!=2)return;var b=document.createElement('button');b.className='fall';b.textContent=fe[Math.random()*fe.length|0];
  b.setAttribute('aria-label','Atrapar');b.style.left=Math.random()*(innerWidth-56)+'px';b.style.animationDuration=(5+Math.random()*3)+'s';
  b.addEventListener('click',function(e){burst(e.clientX,e.clientY,5);b.remove();tick(2)});
  b.addEventListener('animationend',function(){b.remove()});scenes[2].appendChild(b)},650);

/* ---------- Decoraciones de los bordes ---------- */
['l','r'].forEach(function(side){
  var g=document.querySelector('.gar.'+side),set=['💗','🎀','🐾','💕','🌸'];
  for(var i=0;i<8;i++){var el=document.createElement('span');el.textContent=set[(i+(side=='r'?2:0))%set.length];
    el.style.animationDelay=(-i*.6)+'s';g.appendChild(el)}
});
})();