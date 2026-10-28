/* Boot, canvas/DPR, scene loop, autosave, debug hooks */
'use strict';
(function () {
  const h = GL.h;
  const canvas = GL.$('#game'), ctx = canvas.getContext('2d');
  GL.ctx = ctx; GL.dpr = 1; GL.vw = 0; GL.vh = 0;
  function resize() {
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    const w = window.innerWidth, hh = window.innerHeight;
    GL.dpr = dpr; GL.vw = w; GL.vh = hh;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(hh * dpr);
    canvas.style.width = w + 'px'; canvas.style.height = hh + 'px';
    GL.Battle.layout && GL.Battle.active && GL.Battle.layout(w, hh);
    document.documentElement.classList.toggle('portrait', hh > w);
    document.documentElement.classList.toggle('short', hh < 520);
  }
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', () => setTimeout(resize, 200));
  resize();

  GL.scene = 'boot';
  GL.setScene = name => { GL.scene = name; document.body.dataset.scene = name; };

  /* title backdrop: slow pan over the title art */
  const titleBg = new Image(); titleBg.src = GL.A + 'brand/title_bg.jpg';
  function drawTitle(t, w, hh) {
    ctx.fillStyle = '#7CCF5A'; ctx.fillRect(0, 0, w, hh);
    if (titleBg.complete && titleBg.naturalWidth) {
      const s = Math.max(w / titleBg.naturalWidth, hh / titleBg.naturalHeight) * 1.08;
      const dw = titleBg.naturalWidth * s, dh = titleBg.naturalHeight * s;
      const ox = (w - dw) / 2 + Math.sin(t * 0.12) * (dw - w) * 0.04, oy = (hh - dh) / 2;
      ctx.drawImage(titleBg, ox, oy, dw, dh);
    }
  }

  let last = performance.now(), T = 0;
  function frame(now) {
    const dt = Math.min(0.1, (now - last) / 1000); last = now; T += dt;
    const w = GL.vw, hh = GL.vh;
    ctx.setTransform(GL.dpr, 0, 0, GL.dpr, 0, 0);
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    try {
      if (GL.scene === 'world') { GL.World.update(dt); GL.World.draw(ctx, w, hh); }
      else if (GL.scene === 'battle') { GL.Battle.update(dt); GL.Battle.draw(ctx, w, hh); }
      else if (GL.scene === 'glide') { GL.Arcade.update(dt); GL.Arcade.draw(ctx, w, hh); }
      else drawTitle(T, w, hh);
    } catch (e) { console.error(e); }
    requestAnimationFrame(frame);
  }

  GL.startGame = function () {
    const S = GL.S;
    GL.Q.ensure(S);
    if (!GL.$('#hud').childElementCount) GL.HUD.build();
    GL.World.sheet = null;
    const p = S.pos || { map: 'town', x: 7, y: 6, dir: 0 };
    GL.World.enter(GL.MAPS[p.map] ? p.map : 'town', p.x, p.y, p.dir);
    const d = GL.today(); S.play.days[d] = (S.play.days[d] || 0);
  };

  /* autosave + play-time */
  setInterval(() => { if (GL.S && GL.scene !== 'title' && GL.scene !== 'boot') { const d = GL.today(); GL.S.play.days[d] = (GL.S.play.days[d] || 0) + 30; GL.save(); } }, 30000);
  const flush = () => { if (GL.S && GL.S.team && GL.S.team.length) GL.save(); };
  document.addEventListener('visibilitychange', () => { if (document.hidden) flush(); });
  window.addEventListener('pagehide', flush);

  /* first tap unlocks Web Audio (iOS) */
  const unlock = () => GL.audio.unlock();
  window.addEventListener('pointerdown', unlock, { capture: true });
  window.addEventListener('keydown', unlock, { capture: true });

  /* ---------- debug (?debug=1) ---------- */
  const qs = new URLSearchParams(location.search);
  GL.debugMode = qs.get('debug') === '1';
  if (qs.get('fast') === '1') GL.fastBattle = true;
  GL.debug = {
    forceEncounter() { GL.debugForceEnc = true; },
    wild(sp = 'zappip', lv = 4) { return GL.World.startWild('south', sp, lv); },
    give(item, n = 5) { if (item === 'coins') GL.S.coins += n; else if (item === 'tokens') GL.S.tokens += n; else GL.S.bag[item] = (GL.S.bag[item] || 0) + n; GL.HUD.update(); },
    setLevel(n, i = 0) { const m = GL.S.team[i]; m.level = n; m.xp = 0; GL.healMon(m); GL.HUD.update(); },
    xp(n, i = 0) { GL.S.team[i].xp += n; },
    warp(map, x, y) { GL.World.enter(map, x, y, 0); },
    heal() { GL.healTeam(); GL.HUD.update(); },
  };
  GL.debugPanel = function () {
    const md = GL.modal('Debug', h('div', { class: 'settings' },
      GL.btn('Next step = encounter', () => { GL.debug.forceEncounter(); md.close(); }),
      GL.btn('+200 coins, +5 tokens', () => { GL.debug.give('coins', 200); GL.debug.give('tokens', 5); }),
      GL.btn('+5 prisms', () => GL.debug.give('prism', 5)),
      GL.btn('Lead to Lv 11', () => GL.debug.setLevel(11)),
      GL.btn('Warp: Proof Hall', () => { md.close(); GL.debug.warp('hall', 5, 8); }),
      GL.btn('Warp: Meadows', () => { md.close(); GL.debug.warp('meadow', 20, 27); })));
  };

  /* ---------- boot ---------- */
  requestAnimationFrame(frame);
  const bar = GL.$('#load-fill');
  (document.fonts && document.fonts.load ? Promise.all([document.fonts.load('600 20px Fredoka'), document.fonts.load('700 20px Fredoka')]).catch(() => { }) : Promise.resolve())
    .then(() => GL.loadImages(GL.ASSET_LIST, f => { if (bar) bar.style.width = Math.round(f * 100) + '%'; }))
    .then(() => {
      const ld = GL.$('#loading'); ld && ld.classList.add('done'); setTimeout(() => ld && ld.remove(), 500);
      GL.Menus.title();
      if (qs.get('autostart') === '1') { const s = GL.loadSave(); if (s) { GL.S = s; GL.$('#screen').classList.remove('show'); GL.$('#screen').innerHTML = ''; GL.startGame(); } }
    });

  if ('serviceWorker' in navigator && location.protocol.startsWith('http') && false) navigator.serviceWorker.register('sw.js');
})();
