/* ==========================================================
   galaxy.js — Galaxia de corazones con un agujero negro "físico"
   - Los corazones ORBITAN (gravedad suavizada + integrador Verlet), nunca caen.
   - Lente gravitacional: lo que pasa por detrás del agujero se curva por encima.
   - Disco de acreción con polvo kepleriano y brillo Doppler (un lado más claro).
   - Tocar el centro frena el tiempo y lanza una onda gravitacional.
   - Arrastrar: gira la cámara (horizontal) e inclina el disco (vertical).
   ========================================================== */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var cv = $('cv'), ctx = cv.getContext('2d'), card = $('card');
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var TAU = Math.PI * 2;

  var MSGS = [
    'Eres un universo entero, Sheyla.', 'Tu sonrisa vuelve todo más suave.',
    'Mereces calma, abrazos y muchos perritos.', 'Eres querida, más de lo que imaginas.',
    'Hay estrellas que brillan porque tú existes.', 'Respira. Aquí todo está bien.',
    'Tu ternura es tu superpoder.', 'Eres tan dulce como un moño rosa.',
    'Eres hermosa por dentro y por fuera.', 'Te mereces todo lo bonito.',
    'Gracias por ser como eres.', 'Un perrito, un moño y un corazón: eso eres tú.'
  ];
  var COLORS = ['255,150,190', '230,170,230', '255,190,205', '190,160,255'];

  /* ---------- estado ---------- */
  var W, H, cx, cy, R, BH, GM, EPS2;
  var hearts = [], dust = [], stars = [], sparks = [], ripples = [];
  var cam = { rot: 0, spin: 0, tilt: 0.5 };
  var time = { scale: 1, target: 1, slowUntil: 0, last: 0 };
  var drag = { on: false, moved: false, x: 0, y: 0 };
  var started = false, msgIndex = 0, msgTimer = null;
  var P = { x: 0, y: 0, z: 0, s: 1 };           // proyección reutilizable

  /* ---------- tamaño y construcción ---------- */
  function resize() {
    var d = devicePixelRatio || 1;
    W = cv.clientWidth; H = cv.clientHeight;
    cv.width = W * d; cv.height = H * d;
    ctx.setTransform(d, 0, 0, d, 0, 0);
    cx = W / 2; cy = H * 0.47;
    R = Math.min(W * 0.5, H * 0.4);
    BH = R * 0.15;                               // radio del horizonte de sucesos
    EPS2 = BH * BH * 0.5;                        // suavizado de la gravedad
    var w = TAU / 16;                            // periodo de 16 s a 3·BH
    GM = w * w * Math.pow(BH * 3, 3);
  }

  function circularSpeed(r) {                    // velocidad circular con gravedad suavizada
    return Math.sqrt(GM * r * r / Math.pow(r * r + EPS2, 1.5));
  }

  function makeHeart(r0, a0, f, size, alpha, msg, phase) {
    var vc = circularSpeed(r0) * f;
    return {
      x: Math.cos(a0) * r0, y: Math.sin(a0) * r0,
      vx: -Math.sin(a0) * vc, vy: Math.cos(a0) * vc,   // todos giran en el mismo sentido
      ax: 0, ay: 0, s: size, al: alpha, msg: msg || null, ph: phase,
      c: COLORS[(Math.random() * COLORS.length) | 0], trail: [], sx: 0, sy: 0
    };
  }

  function build() {
    hearts = []; dust = []; stars = [];
    var rMin = BH * 2.4, i;
    for (i = 0; i < 240; i++) {                  // corazones del brazo espiral
      var r0 = rMin + Math.pow(Math.random(), 0.75) * (R * 0.9 - rMin);
      var a0 = (i % 3) * 2.094 + (r0 / R) * 4 + (Math.random() - 0.5) * 0.7;
      var h = makeHeart(r0, a0, 0.92 + Math.random() * 0.12,
        3 + Math.random() * 7 * (1 - r0 / R * 0.4), 0.18 + Math.random() * 0.4, null, Math.random() * 6);
      gravity(h); hearts.push(h);
    }
    for (i = 0; i < MSGS.length; i++) {          // corazones con mensaje (órbitas casi circulares)
      var rm = BH * 3 + (R * 0.85 - BH * 3) * (i / MSGS.length);
      var hm = makeHeart(rm, i * 2.4, 1, 15, 0.85, MSGS[i], i);
      gravity(hm); hearts.push(hm);
    }
    for (i = 0; i < 170; i++) {                  // polvo del disco, órbitas circulares exactas
      var rd = BH * 1.5 + Math.random() * BH * 2;
      dust.push({ r: rd, a: Math.random() * TAU, w: circularSpeed(rd) / rd,
                  s: 0.8 + Math.random() * 1.6, al: 0.15 + Math.random() * 0.3, c: COLORS[(Math.random() * 4) | 0] });
    }
    for (i = 0; i < 140; i++) stars.push({ x: Math.random(), y: Math.random(), z: Math.random(), p: Math.random() * 6 });
  }

  /* ---------- física ---------- */
  function gravity(h) {                          // a = -GM·r / (r² + ε²)^(3/2)
    var s = h.x * h.x + h.y * h.y + EPS2;
    var k = GM / (s * Math.sqrt(s));
    h.ax = -h.x * k; h.ay = -h.y * k;
  }

  function stepHeart(h, dt) {                    // integrador velocity-Verlet
    h.x += h.vx * dt + 0.5 * h.ax * dt * dt;
    h.y += h.vy * dt + 0.5 * h.ay * dt * dt;
    var oax = h.ax, oay = h.ay;
    gravity(h);
    h.vx += 0.5 * (oax + h.ax) * dt;
    h.vy += 0.5 * (oay + h.ay) * dt;
    guard(h);
  }

  function guard(h) {                            // redes de seguridad: nunca cae ni escapa
    var r = Math.hypot(h.x, h.y), rin = BH * 1.5, rout = R * 1.5;
    if (r < rin || r > rout) {
      var nx = h.x / r, ny = h.y / r, target = r < rin ? rin : rout;
      h.x = nx * target; h.y = ny * target;
      var vr = h.vx * nx + h.vy * ny;            // refleja la velocidad radial
      if ((r < rin && vr < 0) || (r > rout && vr > 0)) { h.vx -= 2 * vr * nx; h.vy -= 2 * vr * ny; }
    }
  }

  function stepDust(d, dt) { d.a += d.w * dt; }

  function update(now) {
    var dt = Math.min(0.033, (now - time.last) / 1000 || 0.016);
    time.last = now;
    if (time.slowUntil && now > time.slowUntil) { time.target = 1; time.slowUntil = 0; }
    time.scale += (time.target - time.scale) * 0.05;
    var sdt = reduce ? 0 : dt * time.scale, i, sub;
    for (sub = 0; sub < 2; sub++) {
      for (i = 0; i < hearts.length; i++) stepHeart(hearts[i], sdt / 2);
      for (i = 0; i < dust.length; i++) stepDust(dust[i], sdt / 2);
    }
    cam.spin *= 0.95;
    cam.rot += cam.spin + (reduce ? 0 : 0.0002);
    for (i = ripples.length - 1; i >= 0; i--) {
      ripples[i].r += 2.4 * (0.4 + time.scale); ripples[i].a -= 0.007;
      if (ripples[i].a <= 0) ripples.splice(i, 1);
    }
    for (i = sparks.length - 1; i >= 0; i--) {
      var sp = sparks[i]; sp.x += sp.vx; sp.y += sp.vy; sp.l -= 0.014;
      if (sp.l <= 0) sparks.splice(i, 1);
    }
    if (!reduce && Math.random() < 0.006) sparks.push({ x: Math.random() * W, y: Math.random() * H * 0.35, vx: 3, vy: 1.6, l: 1 });
  }

  /* ---------- proyección con lente gravitacional ---------- */
  function project(px, py) {
    var c = Math.cos(cam.rot), s = Math.sin(cam.rot);
    var X = px * c - py * s, Y = px * s + py * c;     // rotación de cámara
    var sx = X, sy = Y * cam.tilt;
    if (Y < 0) {                                       // detrás del agujero: la luz se curva
      var d = Math.hypot(sx, sy), dx = d > 1e-3 ? sx / d : 0, dy = d > 1e-3 ? sy / d : -1;
      var k = 0.9 * BH * BH / (d + 0.5 * BH);
      sx += dx * k; sy += dy * k;
    }
    P.x = cx + sx; P.y = cy + sy; P.z = Y; P.s = 1 + Y / (R * 5);
  }

  /* ---------- dibujo ---------- */
  function heartPath(x, y, s, fill) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s / 16, s / 16); ctx.fillStyle = fill;
    ctx.beginPath(); ctx.moveTo(0, 7);
    ctx.bezierCurveTo(-19, -6, -8, -19, 0, -8); ctx.bezierCurveTo(8, -19, 19, -6, 0, 7);
    ctx.fill(); ctx.restore();
  }

  function drawStars(now) {
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i], x = (((s.x * W + cam.rot * 40 * s.z) % W) + W) % W;   // paralaje con la cámara
      ctx.fillStyle = 'rgba(255,230,245,' + (0.15 + 0.35 * Math.abs(Math.sin(now / 1500 + s.p))) * s.z + ')';
      ctx.fillRect(x, s.y * H, 1 + s.z * 1.2, 1 + s.z * 1.2);
    }
  }

  function drawRings(back) {                       // anillos del disco, brillo Doppler a la derecha
    for (var k = 0; k < 7; k++) {
      var rx = BH * (1.5 + k * 0.42), ry = rx * cam.tilt, a = 0.14 - k * 0.017;
      var col = k % 2 ? '200,150,255' : '255,140,185';
      var g = ctx.createLinearGradient(cx - rx, 0, cx + rx, 0);
      g.addColorStop(0, 'rgba(' + col + ',' + a * 0.45 + ')');
      g.addColorStop(1, 'rgba(' + col + ',' + a * 1.5 + ')');
      ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, back ? Math.PI : 0, back ? TAU : Math.PI);
      ctx.lineWidth = BH * 0.34; ctx.strokeStyle = g; ctx.stroke();
    }
  }

  function drawDust(back) {
    for (var i = 0; i < dust.length; i++) {
      var d = dust[i]; project(Math.cos(d.a) * d.r, Math.sin(d.a) * d.r);
      if ((P.z < 0) !== back) continue;
      ctx.fillStyle = 'rgba(' + d.c + ',' + d.al * (back ? 0.7 : 1) + ')';
      ctx.beginPath(); ctx.arc(P.x, P.y, d.s * P.s, 0, TAU); ctx.fill();
    }
  }

  function drawHearts(back, now) {
    var c = Math.cos(cam.rot), s = Math.sin(cam.rot);
    for (var i = 0; i < hearts.length; i++) {
      var h = hearts[i]; project(h.x, h.y);
      if ((P.z < 0) !== back) continue;
      h.sx = P.x; h.sy = P.y;
      var r = Math.hypot(h.x, h.y) + 1, vX = h.vx * c - h.vy * s;
      var beam = 1 + 0.28 * Math.max(-1, Math.min(1, vX / Math.sqrt(GM / r)));   // efecto Doppler suave
      var pulse = 0.8 + 0.2 * Math.sin(now / 900 + h.ph);
      var al = Math.min(0.95, h.al * (h.msg ? 1 : pulse) * beam * (back ? 0.8 : 1));
      if (h.msg) {                                  // estela corta + halo suave
        if (!back || h.trail.length === 0) { h.trail.push(P.x, P.y); if (h.trail.length > 24) h.trail.splice(0, 2); }
        for (var t = 0; t < h.trail.length; t += 2) {
          ctx.fillStyle = 'rgba(255,175,205,' + (t / h.trail.length) * 0.18 + ')';
          ctx.beginPath(); ctx.arc(h.trail[t], h.trail[t + 1], 1.8, 0, TAU); ctx.fill();
        }
        var g = ctx.createRadialGradient(P.x, P.y, 0, P.x, P.y, h.s * 1.8);
        g.addColorStop(0, 'rgba(255,170,205,.22)'); g.addColorStop(1, 'rgba(255,170,205,0)');
        ctx.fillStyle = g; ctx.fillRect(P.x - h.s * 2, P.y - h.s * 2, h.s * 4, h.s * 4);
      }
      heartPath(P.x, P.y, h.s * P.s * (h.msg ? pulse : 1), 'rgba(' + h.c + ',' + al + ')');
    }
  }

  function drawBlackHole() {
    var g = ctx.createRadialGradient(cx, cy, BH, cx, cy, BH * 1.7);   // sombra suave alrededor
    g.addColorStop(0, 'rgba(0,0,0,.55)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, BH * 1.7, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(cx, cy, BH, 0, TAU); ctx.fillStyle = '#030107'; ctx.fill();
    // halo lenteado: la parte trasera del disco aparece arriba y abajo del horizonte
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(cx, cy, BH * 1.22, 0, TAU); ctx.lineWidth = BH * 0.16; ctx.strokeStyle = 'rgba(255,150,200,.08)'; ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, BH * 1.22, Math.PI * 1.1, Math.PI * 1.9); ctx.lineWidth = BH * 0.1; ctx.strokeStyle = 'rgba(255,170,215,.2)'; ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, BH * 1.22, Math.PI * 0.15, Math.PI * 0.85); ctx.lineWidth = BH * 0.06; ctx.strokeStyle = 'rgba(200,150,255,.12)'; ctx.stroke();
    // anillo de fotones: más claro del lado que se acerca
    var pg = ctx.createLinearGradient(cx - BH, 0, cx + BH, 0);
    pg.addColorStop(0, 'rgba(255,170,205,.25)'); pg.addColorStop(1, 'rgba(255,200,225,.6)');
    ctx.beginPath(); ctx.arc(cx, cy, BH * 1.04, 0, TAU); ctx.lineWidth = 2; ctx.strokeStyle = pg; ctx.stroke();
  }

  function drawRipples() {
    for (var i = 0; i < ripples.length; i++) {
      ctx.beginPath(); ctx.ellipse(cx, cy, ripples[i].r, ripples[i].r * cam.tilt, 0, 0, TAU);
      ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,170,215,' + ripples[i].a * 0.5 + ')'; ctx.stroke();
    }
  }

  function drawSparks() {
    for (var i = 0; i < sparks.length; i++) heartPath(sparks[i].x, sparks[i].y, 9, 'rgba(255,200,225,' + sparks[i].l * 0.6 + ')');
  }

  function frame(now) {
    update(now);
    ctx.clearRect(0, 0, W, H);
    drawStars(now);
    drawRings(true); drawDust(true); drawHearts(true, now);     // lo que está detrás
    drawBlackHole();
    drawRings(false); drawDust(false); drawHearts(false, now);  // lo que está delante
    drawRipples(); drawSparks();
    requestAnimationFrame(frame);
  }

  /* ---------- mensajes ---------- */
  function show(text) {
    card.style.opacity = 0; clearTimeout(show.t);
    show.t = setTimeout(function () { card.textContent = text; card.style.opacity = 1; }, 500);
  }
  function autoMessage() { show(MSGS[msgIndex++ % MSGS.length]); }

  /* ---------- interacción ---------- */
  function tapHole(now) {
    ripples.push({ r: BH * 1.1, a: 1 });
    time.target = 0.12; time.slowUntil = performance.now() + 3200;     // el tiempo se frena
    show('El tiempo se detiene cuando estás aquí 🖤💗');
  }

  cv.addEventListener('pointerdown', function (e) {
    drag.on = true; drag.moved = false; drag.x = e.clientX; drag.y = e.clientY;
    cv.setPointerCapture(e.pointerId); cv.style.cursor = 'grabbing';
  });
  cv.addEventListener('pointermove', function (e) {
    if (!drag.on) return;
    var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true;
    cam.spin += dx * 0.0004;
    cam.tilt = Math.max(0.3, Math.min(0.75, cam.tilt + dy * 0.002));
    drag.x = e.clientX; drag.y = e.clientY;
  });
  cv.addEventListener('pointerup', function (e) {
    drag.on = false; cv.style.cursor = 'grab';
    if (drag.moved) return;
    if (Math.hypot(e.clientX - cx, e.clientY - cy) < BH * 1.6) { tapHole(); return; }
    var best = null, bd = 48;
    hearts.forEach(function (h) {
      if (!h.msg) return;
      var d = Math.hypot(h.sx - e.clientX, h.sy - e.clientY);
      if (d < bd) { bd = d; best = h; }
    });
    if (best) show(best.msg);
    else for (var i = 0; i < 5; i++) sparks.push({
      x: e.clientX + (Math.random() - 0.5) * 30, y: e.clientY + (Math.random() - 0.5) * 30,
      vx: (Math.random() - 0.5) * 1.2, vy: -0.5 - Math.random(), l: 0.9 });
  });

  /* ---------- arranque ---------- */
  window.Galaxy = {
    start: function () {
      if (started) return; started = true;
      resize(); build();
      addEventListener('resize', function () { resize(); build(); });
      time.last = performance.now();
      requestAnimationFrame(frame);
      setTimeout(autoMessage, 1800); msgTimer = setInterval(autoMessage, 7500);
    }
  };
})();