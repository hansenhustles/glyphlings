/* Overworld: tile map rendering, movement, NPCs, triggers, encounters, HUD, d-pad */
'use strict';
(function () {
  const h = GL.h;
  const DIRS = { down: [0, 1, 0], left: [-1, 0, 1], right: [1, 0, 2], up: [0, -1, 3] };
  const DIRNAME = ['down', 'left', 'right', 'up'];
  const W = GL.World = { map: null, p: null, stepsSinceEnc: 0, anim: 0, flash: 0, busy: false, bang: null };

  /* ---------- player sprite composite ---------- */
  GL.buildPlayerSheet = function (look) {
    look = look || GL.S.player;
    const c = document.createElement('canvas'); c.width = 288; c.height = 384;
    const x = c.getContext('2d');
    const body = GL.img('characters/player_body_' + look.skin);
    const jacket = GL.img('characters/player_jacket_' + look.jacket);
    const hair = GL.img('characters/player_hair_' + look.hair);
    const hat = look.hat ? GL.img('characters/player_hat_' + look.hat) : null;
    if (body) x.drawImage(body, 0, 0);
    if (jacket) x.drawImage(jacket, 0, 0);
    if (hair) {
      const hc = document.createElement('canvas'); hc.width = 288; hc.height = 384; const hx = hc.getContext('2d');
      hx.drawImage(hair, 0, 0);
      hx.globalCompositeOperation = 'multiply'; hx.fillStyle = GL.HAIR_COLORS[look.hairColor] || '#6B4226'; hx.fillRect(0, 0, 288, 384);
      hx.globalCompositeOperation = 'destination-in'; hx.drawImage(hair, 0, 0);
      x.drawImage(hc, 0, 0);
    }
    if (hat) x.drawImage(hat, 0, 0); // hats are pre-coloured: never tint
    return c;
  };
  W.refreshLook = () => { W.sheet = GL.buildPlayerSheet(); };

  /* ---------- enter a map ---------- */
  W.enter = function (mapId, x, y, dir) {
    const m = GL.MAPS[mapId]; W.map = m;
    W.p = { x, y, px: x, py: y, dir: dir == null ? 0 : dir, moving: false, t: 0, fx: x, fy: y, step: 0 };
    GL.S.pos = { map: mapId, x, y, dir: W.p.dir };
    if (!W.sheet) W.refreshLook();
    for (const n of m.npcs) { n.cx = n.x; n.cy = n.y; if (n.dir0 == null) n.dir0 = n.dir; }
    W.stepsSinceEnc = 0;
    GL.setScene('world');
    GL.HUD.show(); GL.HUD.update();
    const nm = GL.$('#area-name'); if (nm) { nm.textContent = m.name; nm.classList.remove('pop'); void nm.offsetWidth; nm.classList.add('pop'); }
    GL.save();
  };

  /* ---------- collision ---------- */
  function npcAt(x, y) { return W.map.npcs.find(n => n.cx === x && n.cy === y && !n.hidden); }
  function blocked(x, y) {
    const m = W.map;
    if (x < 0 || y < 0 || x >= m.w || y >= m.h) return true;
    if (m.solid[y][x]) return true;
    return !!npcAt(x, y);
  }

  /* ---------- per-frame ---------- */
  W.update = function (dt) {
    W.anim += dt;
    const p = W.p; if (!p) return;
    if (p.moving) {
      p.t += dt / 0.16;
      if (p.t >= 1) { p.moving = false; p.px = p.x; p.py = p.y; arrive(); }
      else { p.px = p.fx + (p.x - p.fx) * p.t; p.py = p.fy + (p.y - p.fy) * p.t; }
    }
    if (W.flash > 0) W.flash -= dt;
    if (GL.uiBusy > 0 || W.busy || GL.scene !== 'world') { GL.input.clear(); return; }
    if (!p.moving) {
      if (GL.input.consumeA()) { interact(); return; }
      if (GL.input.consumeB()) { GL.Menus.main(); return; }
      const d = GL.input.current();
      if (d) tryMove(d);
    }
    // idle NPC turning
    for (const n of W.map.npcs) if (n.wander) { n._t = (n._t || 0) + dt; if (n._t > 2.5) { n._t = 0; n.dir = GL.randi(0, 3); } }
  };

  function tryMove(dname) {
    const p = W.p, [dx, dy, di] = DIRS[dname];
    const turned = p.dir !== di; p.dir = di;
    const nx = p.x + dx, ny = p.y + dy;
    const trig = W.map.triggers[nx + ',' + ny];
    if (blocked(nx, ny)) {
      if (trig && trig.type === 'door') { GL.sfx('door'); runTrigger(trig); return; }
      if (!turned && !p._bumpT || (p._bumpT && performance.now() - p._bumpT > 300)) { GL.sfx('bump'); p._bumpT = performance.now(); }
      return;
    }
    p.fx = p.x; p.fy = p.y; p.x = nx; p.y = ny; p.moving = true; p.t = 0; p.step++;
  }

  function arrive() {
    const p = W.p, m = W.map;
    GL.S.pos = { map: m.id, x: p.x, y: p.y, dir: p.dir };
    for (const e of m.exits) if (p.x >= e.x && p.x < e.x + e.w && p.y >= e.y && p.y < e.y + e.h) {
      const nd = e.dir === 'up' ? 3 : 0;
      W.transition(() => W.enter(e.to, e.tx + (p.x - e.x) * (e.w > 1 ? 1 : 0), e.ty, nd));
      return;
    }
    const trig = m.triggers[p.x + ',' + p.y];
    if (trig && trig.step) { runTrigger(trig); return; }
    if (checkTrainers()) return;
    if (m.grass[p.y][p.x]) {
      W.stepsSinceEnc++;
      const force = GL.debugForceEnc; GL.debugForceEnc = false;
      if (force || (W.stepsSinceEnc >= 6 && Math.random() < 0.1) || (W.stepsSinceEnc >= 4 && !GL.S.flags.firstWild)) {
        W.stepsSinceEnc = 0; startWild(m.grass[p.y][p.x]);
      }
    }
  }

  W.transition = function (fn) {
    const f = GL.$('#fade'); f.classList.add('on'); W.busy = true;
    setTimeout(() => { fn(); setTimeout(() => { f.classList.remove('on'); W.busy = false; }, 60); }, 260);
  };

  function startWild(zone, forcedSpecies, forcedLevel) {
    const enc = W.map.encounters && W.map.encounters[zone] || GL.MAPS.meadow.encounters.south;
    let sp = forcedSpecies || GL.weighted(enc.table);
    if (sp === '__starter') { const others = GL.STARTERS.filter(s => s !== GL.S.flags.starter); sp = GL.pick(others); }
    const lv = forcedLevel || GL.randi(enc.lv[0], enc.lv[1]);
    GL.S.flags.firstWild = true;
    W.busy = true; W.flash = 0.6; GL.sfx('encounter');
    setTimeout(() => { W.busy = false; GL.Battle.start({ kind: 'wild', enemies: [GL.makeMon(sp, lv)], bg: W.map.battleBg || 'battle/bg_battle_meadow' }); }, 600);
  }
  W.startWild = startWild;

  function facingCell() { const p = W.p, d = DIRS[DIRNAME[p.dir]]; return [p.x + d[0], p.y + d[1]]; }
  function interact() {
    const [fx, fy] = facingCell();
    const n = npcAt(fx, fy);
    if (n) { n.dir = [3, 2, 1, 0][W.p.dir]; GL.sfx('tap'); W.talk(n); return; }
    const trig = W.map.triggers[fx + ',' + fy] || W.map.triggers[W.p.x + ',' + W.p.y];
    if (trig) runTrigger(trig);
  }

  function checkTrainers() {
    const p = W.p;
    for (const n of W.map.npcs) {
      if (!n.trainer || GL.S.trainers[n.trainer] || n.hidden) continue;
      const [dx, dy] = DIRS[DIRNAME[n.dir]];
      for (let i = 1; i <= (n.sight || 3); i++) {
        const x = n.cx + dx * i, y = n.cy + dy * i;
        if (x < 0 || y < 0 || x >= W.map.w || y >= W.map.h || W.map.solid[y][x]) break;
        if (x === p.x && y === p.y) {
          W.busy = true; W.bang = { npc: n, t: 0 }; GL.sfx('encounter');
          setTimeout(() => { W.bang = null; W.busy = false; p.dir = [3, 2, 1, 0][n.dir]; W.talk(n); }, 700);
          return true;
        }
      }
    }
    return false;
  }

  /* ---------- talking & triggers ---------- */
  W.talk = async function (n) {
    const S = GL.S, o = { name: n.name, portrait: n.portrait, sheet: n.portrait ? null : n.sheet };
    const say = lines => GL.dialog(lines, o);
    switch (n.talk) {
      case 'professor': {
        const caught = Object.keys(S.journal.caught).length;
        if (caught >= 5 && !S.flags.profReward) {
          S.flags.profReward = true; S.bag.super_prism += 3; S.coins += 100; GL.HUD.update();
          await say([`Remarkable! ${caught} different Glyphlings in your Field Journal!`, 'Take these 3 Super Prisms and 100 coins. Capturing needs one fewer correct answer with them.']);
          GL.sfx('coin'); return;
        }
        const tips = [
          'Every move needs a correct answer. Answer fast for a Critical hit!',
          'Strong against weak: Ember beats Leaf and Gale. Tide beats Ember and Stone. Leaf beats Tide and Stone.',
          'To catch a Glyphling, get it below half health, then use a Glyph Prism and answer a streak of questions!',
          `You have caught ${caught} kind${caught === 1 ? '' : 's'} of Glyphling. Bring me 5 and I'll have a gift for you.`,
          'Get 3 answers in a row to start a streak. Streaks power up your moves!',
          'At level 12, your partner can evolve. You will need to pass a Proof Spark test!'];
        const i = await GL.choice('Hello, ' + S.player.name + '! What would you like to know?', ['A battle tip', 'Type matchups', 'Goodbye'], { name: n.name, cancel: false });
        if (i === 0) await say([GL.pick(tips)]);
        if (i === 1) GL.Menus.typeChart();
        return;
      }
      case 'clerk': return say(['Hi! I\'m Pip from Tally Mart.', GL.pick(['Glyph Prisms are 20 coins each. Win battles to earn coins!', 'The Arcade turns correct answers into Tokens. Tokens play Kitewing Glide!', 'The Threadsmith sells hats and jackets. Looking sharp helps you think sharp!'])]);
      case 'lin': {
        if (S.flags.linDone) return say(['My Tallybun is so happy in the garden. Thank you, Ranger!']);
        if (!S.flags.linQuest) {
          S.flags.linQuest = true;
          return say(['Oh, a Ranger! My garden needs a helper.', 'Could you catch a Tallybun for me? They hop around the tall grass.', 'Come back when you have one!']);
        }
        if (S.journal.caught.tallybun) {
          S.flags.linDone = true; S.bag.berry_tonic += 3; S.coins += 60; GL.HUD.update(); GL.sfx('coin');
          return say(['You caught a Tallybun! It can visit my garden any time.', 'Here: 3 Berry Tonics and 60 coins!']);
        }
        return say(['Tallybuns love the tall grass south of the creek. Good luck!']);
      }
      case 'mira': {
        if (S.badges.includes('meadow')) return say(GL.TRAINERS.mira.after);
        await say(GL.TRAINERS.mira.intro);
        const ok = await GL.choice('Are you ready for the Proof Hall challenge?', ['I\'m ready!', 'Not yet'], { name: n.name, cancel: false });
        if (ok !== 0) return say(['Train in the North Meadow, then come back.']);
        return GL.Battle.startTrainer('mira');
      }
      default:
        if (n.trainer) {
          if (S.trainers[n.trainer]) return say(GL.TRAINERS[n.trainer].after);
          await say(GL.TRAINERS[n.trainer].intro);
          return GL.Battle.startTrainer(n.trainer);
        }
    }
  };

  async function runTrigger(t) {
    const S = GL.S;
    switch (t.type) {
      case 'sign': return GL.dialog(t.text);
      case 'door': return door(t.kind);
      case 'berry': {
        if (S.flags.berryDay === GL.today()) return GL.dialog('The berry bush is empty. It will grow more berries tomorrow!');
        S.flags.berryDay = GL.today(); GL.healTeam(); GL.sfx('heal');
        return GL.dialog(['You picked a handful of sumberries.', 'Your whole team is fully healed! 🍓']);
      }
      case 'shimmer': {
        if (S.flags.shimmerDay === GL.today()) return;
        S.flags.shimmerDay = GL.today();
        await GL.dialog('The grass shimmers… something wise is watching you!');
        return startWild('north', 'owlgebra', 8);
      }
      case 'chest': {
        if (S.flags['chest_' + t.id]) return GL.dialog('The chest is empty.');
        await GL.dialog(['A chest with a number lock! It says:', t.q.text]);
        const q = Object.assign({ kind: 'fact', ringMs: 20000, fastMs: 6000, how: GL.Q.how(t.q.op, t.q.a, t.q.b), hint: GL.Q.hint(t.q.op, t.q.a, t.q.b) }, t.q);
        const r = await GL.askQuestion(q, { title: 'Number Lock', timer: false, noRecord: true });
        if (!r.correct) return GL.dialog('Click! The lock stays shut. Try again any time.');
        S.flags['chest_' + t.id] = true; S.coins += 50; S.bag.super_prism += 1; GL.HUD.update(); GL.sfx('coin');
        return GL.dialog('The lock pops open! You found 50 coins and a Super Prism!');
      }
    }
  }
  W.runTrigger = runTrigger;

  async function door(kind) {
    const S = GL.S;
    if (kind === 'hall') return W.transition(() => W.enter('hall', 5, 8, 3));
    if (kind === 'lab') return W.talk(W.map.npcs.find(n => n.id === 'professor') || { name: 'Professor Abacus', talk: 'professor' });
    if (kind === 'mart') return GL.Menus.shop();
    if (kind === 'threadsmith') return GL.Menus.gear();
    if (kind === 'arcade') return GL.Arcade.menu();
    if (kind === 'center') {
      S.lastCenter = { map: 'town', x: 16, y: 5 };
      const i = await GL.choice('Welcome to the Glyph Center!', ['Heal my team', 'Team & Garden', 'Save game', 'Leave'], { name: 'Glyph Center', cancel: false });
      if (i === 0) { GL.healTeam(); GL.sfx('heal'); await GL.dialog(['♪ Ding-ding-ding! ♪', 'Your Glyphlings are fully healed!']); GL.save(); }
      if (i === 1) GL.Menus.team({ garden: true });
      if (i === 2) { GL.save(true); GL.toast('💾 Game saved!'); }
      return;
    }
    if (kind === 'home') {
      const i = await GL.choice('Home sweet home.', ['Rest in bed (heal + save)', 'Mirror (change look)', 'Leave'], { name: 'Home', cancel: false });
      if (i === 0) { GL.healTeam(); GL.sfx('heal'); W.flash = 0; await GL.dialog(['Zzz… You feel refreshed!', 'Team healed and game saved.']); GL.save(true); }
      if (i === 1) GL.Menus.creator({ edit: true });
    }
  }

  /* ---------- draw ---------- */
  W.tileSize = (w, hh) => GL.clamp(Math.floor(Math.min(w, hh) / 10.5), 44, 76);
  function drawTile(ctx, sheet, name, dx, dy, T, wTiles, hTiles) {
    const t = GL_TILES[sheet][name]; if (!t) return;
    const im = GL.img('tiles/' + sheet); if (!im) return;
    ctx.drawImage(im, t.x * 96, t.y * 96, t.w * 96, t.h * 96, dx, dy, (wTiles || t.w) * T + 0.6, (hTiles || t.h) * T + 0.6);
  }
  W.draw = function (ctx, w, hh) {
    const m = W.map, p = W.p; if (!m || !p) return;
    const T = W.tileSize(w, hh); W.T = T;
    const dpr = GL.dpr;
    let ox = w / 2 - (p.px + 0.5) * T, oy = hh / 2 - (p.py + 0.5) * T;
    const mw = m.w * T, mh = m.h * T;
    ox = mw <= w ? (w - mw) / 2 : GL.clamp(ox, w - mw, 0);
    oy = mh <= hh ? (hh - mh) / 2 : GL.clamp(oy, hh - mh, 0);
    ox = Math.round(ox * dpr) / dpr; oy = Math.round(oy * dpr) / dpr;
    ctx.fillStyle = m.bg; ctx.fillRect(0, 0, w, hh);
    const x0 = Math.max(0, Math.floor(-ox / T) - 1), y0 = Math.max(0, Math.floor(-oy / T) - 1);
    const x1 = Math.min(m.w - 1, Math.ceil((w - ox) / T) + 1), y1 = Math.min(m.h - 1, Math.ceil((hh - oy) / T) + 1);
    const wf = Math.floor(W.anim / 0.7) % 2;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const g = m.ground[y][x]; if (!g) continue;
      let name = g[1];
      if (name === 'water_center_f0' && wf) name = 'water_center_f1';
      drawTile(ctx, g[0], name, ox + x * T, oy + y * T, T);
    }
    const objTile = ob => {
      if (ob.anim) return ob.anim[Math.floor(W.anim / 0.5) % ob.anim.length];
      if (ob.id === 'berry') return GL.S.flags.berryDay === GL.today() ? 'berry_bush_empty' : 'berry_bush_full';
      if (ob.id && ob.id.startsWith('chest')) return GL.S.flags['chest_' + ob.id] ? 'chest_open' : ob.tile;
      return ob.tile;
    };
    const vis = ob => ob.x + ob.w >= x0 && ob.x <= x1 && ob.y + ob.h >= y0 && ob.y <= y1;
    for (const ob of m.objects) if (ob.flat && vis(ob)) {
      if (ob.id === 'shimmer' && GL.S.flags.shimmerDay === GL.today()) continue;
      drawTile(ctx, ob.sheet, objTile(ob), ox + ob.x * T, oy + ob.y * T, T);
    }
    // depth-sorted entities
    const ents = [];
    for (const ob of m.objects) if (!ob.flat && vis(ob)) ents.push({ k: ob.y + ob.h, f: () => drawTile(ctx, ob.sheet, objTile(ob), ox + ob.x * T, oy + ob.y * T, T) });
    for (const n of m.npcs) if (!n.hidden) ents.push({ k: n.cy + 1.01, f: () => drawNPC(ctx, n, ox, oy, T) });
    ents.push({ k: p.py + 1.02, f: () => drawPlayer(ctx, ox, oy, T) });
    ents.sort((a, b) => a.k - b.k);
    for (const e of ents) e.f();
    // trainer "!" bubble
    if (W.bang) {
      const n = W.bang.npc, bx = ox + (n.cx + 0.5) * T, by = oy + n.cy * T - T * 0.25;
      ctx.fillStyle = '#fff'; ctx.strokeStyle = '#2B2140'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(bx, by, T * 0.26, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#C23B22'; ctx.font = `700 ${Math.round(T * 0.38)}px Fredoka, system-ui`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('!', bx, by + 1);
    }
    if (W.flash > 0) { ctx.fillStyle = `rgba(255,255,255,${(Math.sin(W.flash * 30) * 0.5 + 0.5) * 0.85})`; ctx.fillRect(0, 0, w, hh); }
  };
  function grassOver(ctx, x, y, ox, oy, T) {
    const m = W.map; if (!m.grass[y] || !m.grass[y][x]) return;
    const g = m.ground[y][x], t = GL_TILES[g[0]][g[1]], im = GL.img('tiles/' + g[0]);
    ctx.drawImage(im, t.x * 96, t.y * 96 + 52, 96, 44, ox + x * T, oy + y * T + T * 52 / 96, T, T * 44 / 96);
  }
  function drawNPC(ctx, n, ox, oy, T) {
    const im = GL.img('characters/' + n.sheet); if (!im) return;
    const s = T * 1.15;
    ctx.drawImage(im, n.dir * 96, 0, 96, 96, ox + n.cx * T + (T - s) / 2, oy + n.cy * T + T - s, s, s);
    grassOver(ctx, n.cx, n.cy, ox, oy, T);
  }
  function drawPlayer(ctx, ox, oy, T) {
    const p = W.p; if (!W.sheet) return;
    let col = 1;
    if (p.moving) col = p.t < 0.5 ? (p.step % 2 ? 0 : 2) : 1;
    const sw = T * 1.0, sh = sw * 4 / 3;
    const dx = ox + p.px * T + (T - sw) / 2, dy = oy + p.py * T + T - sh + T * 0.04;
    ctx.drawImage(W.sheet, col * 96, p.dir * 128, 96, 128, dx, dy, sw, sh);
    // tall grass over the lower half (use the destination tile while walking into it)
    const gx = Math.round(p.px), gy = Math.round(p.py);
    grassOver(ctx, gx, gy, ox, oy, T);
  }

  /* ---------- HUD + touch controls ---------- */
  GL.HUD = {
    build() {
      const hud = GL.$('#hud'); hud.innerHTML = '';
      const icons = GL.A + 'ui/menu_icons.png';
      hud.append(
        h('div', { class: 'hud-top' },
          h('div', { id: 'area-name', class: 'chip area' }, ''),
          h('div', { class: 'hud-right' },
            h('div', { class: 'chip', id: 'hud-coins' }), h('div', { class: 'chip', id: 'hud-tokens' }),
            h('button', { class: 'btn btn-icon', id: 'menu-btn', 'aria-label': 'Menu', ontap: () => { GL.sfx('tap'); GL.Menus.main(); } }, h('span', { class: 'mi', style: { backgroundImage: `url(${icons})`, backgroundPosition: '0 0' } })),
            GL.debugMode ? h('button', { class: 'btn btn-icon', id: 'debug-btn', ontap: () => GL.debugPanel() }, '🐞') : null)),
        h('div', { class: 'team-strip', id: 'team-strip' }),
        h('div', { class: 'touch-ctrls', id: 'touch-ctrls' },
          (() => {
            const pad = h('div', { class: 'dpad', id: 'dpad' }, h('img', { src: GL.A + 'ui/dpad.png', alt: '', draggable: 'false' }));
            const setDir = e => {
              const r = pad.getBoundingClientRect(), dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
              if (Math.hypot(dx, dy) < r.width * 0.08) { GL.input.touchDir = null; return; }
              GL.input.touchDir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
              pad.dataset.dir = GL.input.touchDir;
            };
            pad.addEventListener('pointerdown', e => { e.preventDefault(); pad.setPointerCapture && pad.setPointerCapture(e.pointerId); setDir(e); });
            pad.addEventListener('pointermove', e => { if (e.buttons || e.pointerType === 'touch') { if (GL.input.touchDir !== null || e.pressure > 0) setDir(e); } });
            const end = () => { GL.input.touchDir = null; pad.dataset.dir = ''; };
            pad.addEventListener('pointerup', end); pad.addEventListener('pointercancel', end); pad.addEventListener('lostpointercapture', end);
            return pad;
          })(),
          h('div', { class: 'ab' },
            (() => { const b = h('button', { class: 'abtn bbtn', 'aria-label': 'B / Menu' }, h('img', { src: GL.A + 'ui/btn_b.png', alt: 'B' })); b.addEventListener('pointerdown', e => { e.preventDefault(); GL.input.bPressed = true; }); return b; })(),
            (() => { const b = h('button', { class: 'abtn abtn-a', 'aria-label': 'A / Talk' }, h('img', { src: GL.A + 'ui/btn_a.png', alt: 'A' })); b.addEventListener('pointerdown', e => { e.preventDefault(); GL.input.aPressed = true; }); return b; })())));
    },
    show() { GL.$('#hud').classList.add('show'); },
    hide() { GL.$('#hud').classList.remove('show'); },
    update() {
      const S = GL.S; if (!S) return;
      const c = GL.$('#hud-coins'); if (!c) return;
      c.innerHTML = ''; c.append(GL.coinEl(S.coins));
      const t = GL.$('#hud-tokens'); t.innerHTML = ''; t.append(GL.tokenEl(S.tokens));
      const strip = GL.$('#team-strip'); strip.innerHTML = '';
      for (const m of S.team) {
        const st = GL.statsOf(m);
        strip.append(h('div', { class: 'ts-mon' + (m.hp <= 0 ? ' fainted' : '') }, GL.monIconEl(m.species, 36), GL.hpBar(m.hp, st.maxhp)));
      }
      if (S.badges.includes('meadow')) strip.append(h('img', { class: 'ts-badge', src: GL.A + 'icons/badge_meadow.png', alt: 'Meadow Badge' }));
    },
  };
})();
