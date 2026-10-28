/* Arcade: Token Booth (answers -> tokens) and Kitewing Glide (tokens -> coins) */
'use strict';
(function () {
  const h = GL.h;
  const A = GL.Arcade = {};

  A.menu = function () {
    const S = GL.S; const today = GL.today();
    if (S.arcade.boothDay !== today) { S.arcade.boothDay = today; S.arcade.boothCount = 0; }
    const left = 3 - S.arcade.boothCount;
    const md = GL.modal('Tallyton Arcade', h('div', { class: 'arcade-menu' },
      h('img', { class: 'cabinet', src: GL.A + 'arcade/kitewing/arcade_cabinet_kitewing.png', alt: 'Kitewing Glide cabinet' }),
      h('div', { class: 'arcade-side' },
        h('div', { class: 'wallet' }, GL.tokenEl(S.tokens), GL.coinEl(S.coins)),
        h('button', { class: 'btn btn-blue big', disabled: S.tokens < 1, ontap: () => { GL.sfx('tap'); md.close(); A.glide(); } }, '🪁 Play Kitewing Glide', h('small', null, 'Costs 1 token')),
        h('button', { class: 'btn btn-green big', disabled: left <= 0, ontap: () => { GL.sfx('tap'); md.close(); A.booth(); } }, '🎟️ Token Booth Sprint', h('small', null, left > 0 ? `60 seconds · ${left} left today` : 'Come back tomorrow!')),
        h('p', { class: 'small' }, `Best Glide score: ${S.arcade.best}. Every 4 correct answers in the booth = 1 token (max 5 per sprint). You also earn a token for every 5 correct answers in battle!`),
        S.tokens < 1 ? h('p', { class: 'small warn' }, 'No tokens yet: try the Token Booth first!') : null)));
  };

  /* ---------- Token Booth ---------- */
  A.booth = async function () {
    const S = GL.S;
    S.arcade.boothCount++;
    const mount = h('div', { class: 'booth-q' });
    const bar = h('div', { class: 'booth-bar' }, h('div', { class: 'booth-fill' }));
    const score = h('div', { class: 'booth-score' }, '0 correct · 0 tokens');
    const md = GL.modal('Token Booth Sprint', h('div', { class: 'booth' }, bar, score, mount), { noClose: true, cls: 'modal-q' });
    const t0 = performance.now(), DUR = 60000; let ok = 0, tokens = 0, over = false;
    GL.noTokenProgress = true;
    const tick = () => { const f = Math.max(0, 1 - (performance.now() - t0) / DUR); bar.firstChild.style.width = f * 100 + '%'; if (f <= 0) over = true; if (!over) requestAnimationFrame(tick); };
    tick();
    while (!over) {
      const q = GL.Q.next({ noWord: true });
      const r = await Promise.race([GL.askQuestion(q, { mount, timer: false, allowHint: false, wrongDelay: 1300 }), new Promise(res => { const iv = setInterval(() => { if (over) { clearInterval(iv); res(null); } }, 100); })]);
      if (!r) break;
      if (r.correct) { ok++; if (ok % 4 === 0 && tokens < 5) { tokens++; GL.sfx('coin'); } }
      score.textContent = `${ok} correct · ${tokens} token${tokens === 1 ? '' : 's'}`;
    }
    GL.noTokenProgress = false;
    S.tokens += tokens; GL.save(); GL.HUD.update();
    md.close();
    await GL.dialog([`Time! You answered ${ok} correctly and earned ${tokens} token${tokens === 1 ? '' : 's'}. 🎟️`], { name: 'Token Booth' });
  };

  /* ---------- Kitewing Glide ---------- */
  const G = A.G = {};
  A.glide = function () {
    const S = GL.S;
    if (S.tokens < 1) return GL.toast('You need a token!');
    S.tokens--; S.arcade.plays++; GL.HUD.update(); GL.save();
    Object.assign(G, { running: false, over: false, t: 0, y: 0.45, vy: 0, scroll: 0, speed: 0.32, rings: [], clouds: [], gates: null, hearts: 3, score: 0, mult: 1, ringsSince: 0, nextSpawn: 0.8, inv: 0, q: null, flapT: 0, pops: [], started: false });
    GL.HUD.hide();
    const ui = GL.$('#glide-ui'); ui.innerHTML = ''; ui.classList.add('show');
    ui.append(
      h('div', { class: 'g-top' }, h('div', { class: 'chip', id: 'g-score' }), h('div', { class: 'chip', id: 'g-hearts' }), h('div', { class: 'chip', id: 'g-mult' }),
        h('button', { class: 'btn btn-icon', 'aria-label': 'Quit', ontap: () => endGlide(true) }, '✕')),
      h('div', { class: 'g-question', id: 'g-q' }),
      h('div', { class: 'g-help', id: 'g-help' }, 'Tap (or press Space) to flap! Fly through rings. Dodge storm clouds. Every 10 rings, fly through the gate with the right answer!'));
    ui.addEventListener('pointerdown', flap);
    G.offKey = GL.input.onKey(e => { if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') { flap(e); return true; } if (e.code === 'Escape') { endGlide(true); return true; } return false; });
    hud();
    GL.setScene('glide');
  };
  function flap(e) {
    if (e && e.target && e.target.closest && e.target.closest('button')) return;
    if (G.over) return;
    if (!G.started) { G.started = true; G.running = true; const hp = GL.$('#g-help'); hp && hp.classList.add('hide'); }
    G.vy = -0.62; G.flapT = 0.25; GL.sfx('flap');
  }
  function hud() {
    const s = GL.$('#g-score'); if (!s) return;
    s.textContent = `⭕ ${G.score}`;
    GL.$('#g-hearts').textContent = '❤️'.repeat(G.hearts) + '🖤'.repeat(3 - G.hearts);
    GL.$('#g-mult').textContent = `×${G.mult}`; GL.$('#g-mult').classList.toggle('hot', G.mult > 1);
  }
  function spawnGates() {
    const q = GL.Q.next({ noWord: true, quick: true });
    const wrong = new Set();
    while (wrong.size < 2) { const d = GL.pick([-1, 1, -2, 2, q.op === 'm' ? q.a : 1, q.op === 'm' ? -q.b : 2, 10, -10]); const v = q.answer + d; if (v >= 0 && v !== q.answer) wrong.add(v); }
    const opts = GL.shuffle([q.answer, ...wrong]);
    G.q = q; G.qT0 = performance.now();
    G.gates = { x: 1.25, opts, hit: false };
    const el = GL.$('#g-q'); el.innerHTML = ''; el.append(h('div', { class: 'g-qtext' }, q.text)); el.classList.add('show');
    if (GL.S.settings.readAloud) GL.speak(q.text);
  }
  function lose(reason) {
    if (G.inv > 0) return;
    G.hearts--; G.inv = 1.4; G.mult = 1; GL.sfx('hit'); hud();
    if (G.hearts <= 0) endGlide(false);
  }
  async function endGlide(quit) {
    if (G.over) return; G.over = true; G.running = false;
    const ui = GL.$('#glide-ui'); ui.removeEventListener('pointerdown', flap); G.offKey && G.offKey();
    const S = GL.S, coins = Math.min(60, G.score), best = G.score > S.arcade.best;
    if (best) S.arcade.best = G.score;
    S.coins += coins; GL.save(); GL.sfx(coins ? 'coin' : 'tap');
    await GL.sleep(quit ? 0 : 500);
    const md = GL.modal('Glide over!', h('div', { class: 'ceremony' },
      h('div', { class: 'big-num' }, '⭕ ' + G.score),
      best && G.score > 0 ? h('p', { class: 'tag sup' }, '🏆 New best score!') : h('p', null, `Best: ${S.arcade.best}`),
      h('p', null, 'You earned ', GL.coinEl(coins), ' coins!'),
      h('div', { class: 'row' }, S.tokens > 0 ? GL.btn('Play again (1 🎟️)', () => { md.close(); A.glide(); }, 'btn-blue') : null, GL.btn('Done', () => { md.close(); exit(); }, 'btn-green'))), { onClose: () => { if (GL.scene === 'glide') exit(); } });
    function exit() { ui.classList.remove('show'); ui.innerHTML = ''; GL.setScene('world'); GL.HUD.show(); GL.HUD.update(); }
  }
  A.update = function (dt) {
    if (!G.running) { G.t += dt; return; }
    dt = Math.min(dt, 0.05);
    G.t += dt; G.inv = Math.max(0, G.inv - dt); G.flapT = Math.max(0, G.flapT - dt);
    G.vy += 1.75 * dt; G.vy = Math.min(G.vy, 1.1);
    G.y += G.vy * dt;
    if (G.y < 0.06) { G.y = 0.06; G.vy = 0; }
    if (G.y > 0.94) { G.y = 0.85; G.vy = -0.6; lose('floor'); }
    G.speed = Math.min(0.55, 0.32 + G.t * 0.004);
    const dx = G.speed * dt;
    G.scroll += dx;
    // spawning (paused while a gate is on screen)
    if (!G.gates) {
      G.nextSpawn -= dt;
      if (G.nextSpawn <= 0) {
        if (G.ringsSince >= 10) { G.ringsSince = 0; spawnGates(); }
        else {
          G.rings.push({ x: 1.15, y: GL.rand(0.18, 0.82), hit: false });
          if (Math.random() < Math.min(0.65, 0.25 + G.t * 0.01)) G.clouds.push({ x: 1.15 + GL.rand(0.25, 0.4), y: GL.rand(0.12, 0.88), s: GL.rand(0.8, 1.15) });
        }
        G.nextSpawn = GL.rand(0.9, 1.4);
      }
    }
    const kx = 0.25;
    for (const r of G.rings) {
      r.x -= dx;
      if (!r.hit && Math.abs(r.x - kx) < 0.03 && Math.abs(r.y - G.y) < 0.085) {
        r.hit = true; G.score += G.mult; G.ringsSince++; GL.sfx('ring'); G.pops.push({ x: kx, y: G.y, t: 0, text: '+' + G.mult }); hud();
      }
    }
    for (const c of G.clouds) {
      c.x -= dx;
      if (!c.hit && Math.abs(c.x - kx) < 0.06 * c.s && Math.abs(c.y - G.y) < 0.08 * c.s) { c.hit = true; lose('cloud'); }
    }
    G.rings = G.rings.filter(r => r.x > -0.2); G.clouds = G.clouds.filter(c => c.x > -0.3);
    if (G.gates) {
      const g = G.gates; g.x -= dx;
      if (!g.hit && g.x <= kx) {
        g.hit = true;
        const lane = G.y < 1 / 3 ? 0 : G.y < 2 / 3 ? 1 : 2, val = g.opts[lane], correct = val === G.q.answer;
        GL.Q.record(G.q, correct, performance.now() - G.qT0, false);
        const el = GL.$('#g-q');
        if (correct) { G.mult = Math.min(3, G.mult * 2 > 3 ? 3 : G.mult * 2); G.score += 3; GL.sfx('correct'); el.innerHTML = `<div class="g-qtext ok">✔ ${G.q.full} · multiplier ×${G.mult}!</div>`; }
        else { G.mult = 1; GL.sfx('wrong'); el.innerHTML = `<div class="g-qtext bad">${G.q.full}</div>`; }
        hud();
        setTimeout(() => el.classList.remove('show'), 1600);
      }
      if (g.x < -0.3) G.gates = null;
    }
    G.pops = G.pops.filter(p => (p.t += dt) < 0.8);
  };
  function drawLayer(ctx, im, w, hh, off) {
    if (!im || !im.naturalWidth) return;
    const s = hh / im.naturalHeight, tw = im.naturalWidth * s;
    let x = -((off * w) % tw); if (x > 0) x -= tw;
    for (; x < w; x += tw) ctx.drawImage(im, x, 0, tw + 1, hh);
  }
  A.draw = function (ctx, w, hh) {
    ctx.fillStyle = '#8fd3ff'; ctx.fillRect(0, 0, w, hh);
    drawLayer(ctx, GL.img('arcade/kitewing/bg_sky_far'), w, hh, G.scroll * 0.15);
    drawLayer(ctx, GL.img('arcade/kitewing/bg_sky_mid'), w, hh, G.scroll * 0.4);
    drawLayer(ctx, GL.img('arcade/kitewing/bg_sky_near'), w, hh, G.scroll * 0.8);
    const R = Math.min(hh * 0.17, w * 0.2);
    const rb = GL.img('arcade/kitewing/ring_back'), rf = GL.img('arcade/kitewing/ring_front');
    for (const r of G.rings) if (!r.hit || true) { ctx.globalAlpha = r.hit ? 0.35 : 1; rb && ctx.drawImage(rb, r.x * w - R / 2, r.y * hh - R / 2, R, R); ctx.globalAlpha = 1; }
    // gates
    if (G.gates) {
      const gi = GL.img('arcade/kitewing/number_gate'), gh = hh / 3, gw = gh / 2;
      G.gates.opts.forEach((v, i) => {
        const x = G.gates.x * w - gw / 2, y = i * gh;
        gi && ctx.drawImage(gi, x, y, gw, gh);
        ctx.font = `700 ${Math.round(gh * 0.2)}px Fredoka, ui-rounded, system-ui`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.lineWidth = 6; ctx.strokeStyle = '#2B2140'; ctx.strokeText(String(v), x + gw / 2, y + gh / 2); ctx.fillStyle = '#FFE14D'; ctx.fillText(String(v), x + gw / 2, y + gh / 2);
      });
    }
    // kite
    const kf = GL.img('arcade/kitewing/kitewing_fly'), ks = Math.min(hh * 0.16, w * 0.2);
    const frame = Math.floor(G.t * (G.flapT > 0 ? 16 : 8)) % 4;
    ctx.save(); ctx.translate(0.25 * w, G.y * hh); ctx.rotate(GL.clamp(G.vy * 0.5, -0.4, 0.5));
    if (G.inv > 0 && Math.floor(G.inv * 10) % 2) ctx.globalAlpha = 0.4;
    kf && ctx.drawImage(kf, frame * 192, 0, 192, 192, -ks / 2, -ks / 2, ks, ks);
    ctx.restore();
    for (const r of G.rings) { ctx.globalAlpha = r.hit ? 0.35 : 1; rf && ctx.drawImage(rf, r.x * w - R / 2, r.y * hh - R / 2, R, R); ctx.globalAlpha = 1; }
    const cl = GL.img('arcade/kitewing/storm_cloud');
    for (const c of G.clouds) { const s = Math.min(hh * 0.2, w * 0.22) * c.s; cl && ctx.drawImage(cl, c.x * w - s / 2, c.y * hh - s / 2, s, s); }
    for (const p of G.pops) { ctx.globalAlpha = 1 - p.t / 0.8; ctx.font = `700 ${Math.round(hh * 0.05)}px Fredoka, system-ui`; ctx.fillStyle = '#fff'; ctx.strokeStyle = '#2B2140'; ctx.lineWidth = 5; ctx.textAlign = 'center'; ctx.strokeText(p.text, p.x * w + 30, p.y * hh - 30 - p.t * 40); ctx.fillText(p.text, p.x * w + 30, p.y * hh - 30 - p.t * 40); ctx.globalAlpha = 1; }
  };
})();
