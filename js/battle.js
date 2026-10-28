/* Turn-based battle: every action is a math question */
'use strict';
(function () {
  const h = GL.h;
  const B = GL.Battle = { active: false };
  const ENERGY_MAX = 5;

  /* ---------- setup ---------- */
  B.startTrainer = function (id) {
    const tr = GL.TRAINERS[id];
    const enemies = tr.team.map(([sp, lv]) => GL.makeMon(sp, lv));
    return B.start({ kind: 'trainer', trainer: id, enemies, bg: tr.bg || 'battle/bg_battle_meadow' });
  };
  B.start = function (opts) {
    const S = GL.S;
    if (!S.team.some(m => m.hp > 0)) { GL.healTeam(); }
    Object.assign(B, {
      active: true, kind: opts.kind, trainer: opts.trainer, enemies: opts.enemies, ei: 0, bg: opts.bg,
      me: S.team.findIndex(m => m.hp > 0), energy: 2, streak: 0, best: 0, correct: 0, answered: 0,
      hoo: false, carry: 0, whirl: 0, proof: false, fx: [], pops: [], t: 0, turn: 0, busy: true,
      shake: { e: 0, p: 0 }, flashE: 0, flashP: 0, enemyScale: 1, playerAlpha: 1, enemyAlpha: 1, prism: null, enemyIn: 0, playerIn: 0,
      participants: new Set(), result: null,
    });
    B.participants.add(S.team[B.me].uid);
    for (const e of B.enemies) GL.markSeen(e.species);
    S.stats.battles++;
    GL.HUD.hide();
    buildDOM();
    GL.setScene('battle');
    return new Promise(res => { B._resolve = res; intro(); });
  };
  const S = () => GL.S;
  const mine = () => S().team[B.me];
  const foe = () => B.enemies[B.ei];

  /* ---------- DOM ---------- */
  function buildDOM() {
    const root = GL.$('#battle-ui'); root.innerHTML = ''; root.classList.add('show');
    root.append(
      h('div', { class: 'b-hud b-hud-enemy', id: 'b-enemy' }),
      h('div', { class: 'b-hud b-hud-player', id: 'b-player' }),
      h('div', { class: 'b-streak', id: 'b-streak' }),
      h('div', { class: 'b-panel panel', id: 'b-panel' },
        h('div', { class: 'b-msg', id: 'b-msg' }),
        h('div', { class: 'b-actions', id: 'b-actions' }),
        h('div', { class: 'b-q', id: 'b-q' })));
    root.querySelector('#b-msg').addEventListener('click', () => { if (B._skip) B._skip(); });
    hud();
  }
  function hud() {
    const e = foe(), m = mine(); if (!e || !m) return;
    const es = GL.statsOf(e), ms = GL.statsOf(m);
    const eb = GL.$('#b-enemy'); eb.innerHTML = '';
    eb.append(h('div', { class: 'b-name' }, GL.monName(e), h('span', { class: 'b-lv' }, 'Lv ' + e.level), S().journal.caught[e.species] ? h('img', { class: 'b-caught', src: GL.A + 'icons/item_prism.png', alt: 'caught', title: 'Already caught' }) : null),
      h('div', { class: 'b-row' }, GL.typeBadge(GL.SPECIES[e.species].type), hpFrame(e.hp, es.maxhp)),
      B.kind === 'trainer' ? h('div', { class: 'b-balls' }, B.enemies.map((x, i) => h('span', { class: 'b-ball' + (x.hp <= 0 ? ' out' : '') }))) : '');
    const pb = GL.$('#b-player'); pb.innerHTML = '';
    const need = GL.xpNeed(m.level);
    pb.append(h('div', { class: 'b-name' }, GL.monName(m), h('span', { class: 'b-lv' }, 'Lv ' + m.level)),
      h('div', { class: 'b-row' }, GL.typeBadge(GL.SPECIES[m.species].type), hpFrame(m.hp, ms.maxhp)),
      h('div', { class: 'b-row b-sub' }, h('span', { class: 'b-hpnum' }, `${Math.max(0, m.hp)} / ${ms.maxhp}`),
        h('div', { class: 'energy' }, Array.from({ length: ENERGY_MAX }, (_, i) => h('img', { src: GL.A + `ui/energy_pip_${i < B.energy ? 'on' : 'off'}.png`, alt: '' })))),
      h('div', { class: 'xpbar' }, h('div', { class: 'xpfill', style: { width: Math.min(100, m.xp / need * 100) + '%' } })));
    const st = GL.$('#b-streak'); st.innerHTML = '';
    if (B.streak >= 2) st.append(h('div', { class: 'flame', style: { backgroundImage: `url(${GL.A}ui/streak_flame.png)`, backgroundPosition: `-${Math.min(3, Math.floor(B.streak / 3)) * 100}% 0` } }), h('span', null, '×' + B.streak));
    st.classList.toggle('show', B.streak >= 2);
  }
  function hpFrame(hp, max) {
    const f = Math.max(0, hp / max);
    return h('div', { class: 'hpframe' }, h('img', { src: GL.A + 'ui/hpbar_frame.png', alt: '' }),
      h('div', { class: 'hpframe-fill ' + (f > .5 ? 'hi' : f > .2 ? 'mid' : 'lo'), style: { width: `calc(${f * 100}% * 0.79)` } }));
  }
  function setPane(mode) { const p = GL.$('#b-panel'); if (p) p.dataset.mode = mode; }
  function say(text, ms = 1300) {
    setPane('msg');
    const el = GL.$('#b-msg'); el.innerHTML = ''; el.append(h('div', { class: 'b-msg-text', html: text }), h('img', { class: 'dlg-next', src: GL.A + 'ui/dialog_next.png', alt: '' }));
    return new Promise(res => {
      let done = false;
      const fin = () => { if (done) return; done = true; B._skip = null; off(); res(); };
      const off = GL.input.onKey(e => { if (e.code === 'Enter' || e.code === 'Space') { if (performance.now() - t0 > 250) fin(); return true; } });
      const t0 = performance.now();
      B._skip = () => { if (performance.now() - t0 > 250) fin(); };
      setTimeout(fin, ms * (GL.fastBattle ? 0.2 : 1));
    });
  }
  B.say = say;

  /* ---------- flow ---------- */
  async function intro() {
    GL.sfx('encounter');
    B.enemyIn = 0; B.playerIn = 0;
    await GL.sleep(300);
    const e = foe();
    if (B.kind === 'trainer') { const tr = GL.TRAINERS[B.trainer]; await say(`<b>${tr.name}</b> wants to battle!`); await say(`${tr.name} sends out <b>${GL.monName(e)}</b>!`, 1000); }
    else await say(`A wild <b>${GL.monName(e)}</b> appeared!`, 1200);
    await say(`Go, <b>${GL.monName(mine())}</b>! Answer questions to make your moves.`, 1100);
    menu();
  }

  function menu() {
    B.busy = false; hud(); setPane('actions');
    const a = GL.$('#b-actions'); a.innerHTML = '';
    const capOk = B.kind === 'wild';
    const act = (label, cls, fn, icon, dis) => h('button', { class: 'btn b-act ' + cls, disabled: dis, ontap: () => { if (B.busy) return; GL.sfx('tap'); fn(); } }, icon ? h('span', { class: 'b-act-ico' }, icon) : null, label);
    a.append(
      act('Fight', 'btn-red', moveMenu, '⚔️'),
      act('Prism', 'btn-blue', capture, h('img', { src: GL.A + 'icons/item_prism.png', alt: '' }), !capOk),
      act('Bag', 'btn-green', bagMenu, '🎒'),
      act('Swap', '', () => swapMenu(false), '🔄'),
      act('Run', 'btn-ghost', run, '🏃'));
    B._keys && B._keys(); B._keys = GL.input.onKey(e => {
      const map = { Digit1: 0, Digit2: 1, Digit3: 2, Digit4: 3, Digit5: 4 };
      if (GL.$('#b-panel').dataset.mode === 'actions' && map[e.code] != null) { const b = a.children[map[e.code]]; b && !b.disabled && b.click(); return true; }
      return false;
    });
  }
  function stopKeys() { B._keys && B._keys(); B._keys = null; }

  function moveMenu() {
    stopKeys();
    const m = mine(), e = foe(), a = GL.$('#b-actions'); a.innerHTML = '';
    const et = GL.SPECIES[e.species].type;
    for (const id of m.moves) {
      const mv = GL.MOVES[id], mult = GL.typeMult(mv.type, et), afford = B.energy >= mv.energy;
      a.append(h('button', { class: 'btn b-move', disabled: !afford, style: { '--tc': GL.TYPE_COLOR[mv.type], '--td': GL.TYPE_DARK[mv.type] }, ontap: () => { if (B.busy) return; GL.sfx('tap'); doMove(id); } },
        h('span', { class: 'mv-name' }, mv.name, mult > 1 ? h('span', { class: 'eff up' }, '▲') : mult < 1 ? h('span', { class: 'eff down' }, '▼') : null),
        h('span', { class: 'mv-meta' }, GL.cap(mv.type), ' · ', mv.energy ? '⚡'.repeat(mv.energy) : 'free')));
    }
    a.append(h('button', { class: 'btn btn-ghost b-back', ontap: () => { GL.sfx('tap'); menu(); } }, '← Back'));
    setPane('actions');
  }

  /* ask a question inside the battle panel */
  async function ask(opts = {}) {
    setPane('question');
    const q = GL.Q.next({ tierDelta: (B.proof ? 1 : 0) + (opts.tierDelta || 0), hard: opts.hard, quick: opts.quick, noWord: opts.noWord });
    if (opts.ringMs) { q.ringMs = opts.ringMs; q.fastMs = Math.min(q.fastMs, opts.ringMs * 0.6); }
    const r = await GL.askQuestion(q, { mount: GL.$('#b-q'), label: opts.label, block: opts.block, wrongDelay: 2000 });
    B.answered++;
    return r;
  }

  function streakMult() { return B.streak >= 8 ? 1.5 : B.streak >= 5 ? 1.35 : B.streak >= 3 ? 1.2 : 1; }
  function addStreak() {
    B.streak++; B.best = Math.max(B.best, B.streak); B.correct++;
    let gain = 1; if ([3, 5, 8].includes(B.streak)) gain++;
    B.energy = Math.min(ENERGY_MAX, B.energy + gain);
    if ([3, 5, 8].includes(B.streak)) GL.toast(`🔥 ${B.streak} in a row! Streak power ×${streakMult()}`);
  }
  function calc(att, def, power, type, mult) {
    const a = GL.statsOf(att), d = GL.statsOf(def);
    const tm = GL.typeMult(type, GL.SPECIES[def.species].type);
    return { dmg: Math.max(1, Math.round(power * (a.atk / d.def) * tm * mult * GL.rand(0.9, 1.1) * 0.62)), tm };
  }

  async function doMove(id) {
    B.busy = true; stopKeys();
    const mv = GL.MOVES[id], m = mine(), e = foe();
    B.energy -= mv.energy; B.turn++; hud();
    const enemyFirst = GL.statsOf(e).spd > GL.statsOf(m).spd;
    if (enemyFirst) {
      await say(`${GL.monName(e)} is faster and moves first!`, 900);
      if (await enemyAttack(true)) return;
    }
    const r = await ask({ label: `${mv.name}${mv.energy ? ' · ' + '⚡'.repeat(mv.energy) : ''}` });
    if (r.correct) {
      addStreak();
      const crit = r.fast || B.hoo; B.hoo = false;
      let mult = streakMult() * (crit ? 1.5 : r.slow ? 0.75 : 1);
      await playerHit(mv, mult, crit, r);
      if (foe().hp <= 0) return enemyFainted();
      if (!enemyFirst && await enemyAttack(true)) return;
    } else {
      B.streak = 0; hud();
      GL.sfx('miss');
      await say(`<b>${GL.monName(m)}</b>'s ${mv.name} missed! <span class="howline">${r.q.full}. ${r.q.how}</span>`, 2600);
      if (!enemyFirst && await enemyAttack(false)) return;
    }
    await endOfTurn();
  }

  async function playerHit(mv, mult, crit, r) {
    const m = mine(), e = foe(); let powers = [mv.power], note = '';
    switch (mv.special) {
      case 'plus': powers = [mv.power + 2 * B.streak]; note = `${mv.power} + 2 × ${B.streak} streak = ${powers[0]} power`; break;
      case 'hits2': powers = [mv.power, mv.power]; note = 'The bubble divides into 2 hits!'; break;
      case 'seedroll': powers = B.streak >= 3 ? [mv.power, mv.power] : [mv.power]; note = B.streak >= 3 ? 'Streak bonus: it rolls twice!' : ''; break;
      case 'hits13': { const n = GL.randi(1, 3); powers = Array(n).fill(mv.power); note = `${n} × ${mv.power} = ${n * mv.power} power!`; break; }
      case 'hits24': { const n = GL.randi(2, 4); powers = Array(n).fill(mv.power); note = `${n} hops × ${mv.power} = ${n * mv.power} power!`; break; }
      case 'dice': { const d = GL.randi(1, 6); powers = [d * 4]; note = `🎲 Rolled ${d}: ${d} × 4 = ${d * 4} power!`; break; }
      case 'hoo': note = 'Owlgebra solved for x… your next correct answer will be a Critical!'; break;
      case 'fraction': powers = [20, 10, 5]; note = '½ of 40 = 20, ¼ = 10, ⅛ = 5. Three thorny hits!'; break;
      case 'whirl': note = 'A whirlpool forms! It will keep swirling for 2 turns.'; break;
    }
    if (B.carry) { powers[0] += B.carry; note = (note ? note + ' ' : '') + `+${B.carry} carried over!`; B.carry = 0; }
    let total = 0, tm = 1;
    for (let i = 0; i < powers.length; i++) {
      const c = calc(m, e, powers[i], mv.type, mult); tm = c.tm; total += c.dmg;
      e.hp = Math.max(0, e.hp - c.dmg);
      hitFx('e', mv.type, c.dmg, crit, c.tm);
      hud(); await GL.sleep(powers.length > 1 ? 380 : 450);
      if (e.hp <= 0) break;
    }
    if (mv.special === 'hoo') B.hoo = true;
    if (mv.special === 'carry') B.carry = 8;
    if (mv.special === 'whirl') B.whirl = 2;
    let text = `<b>${GL.monName(m)}</b> used ${mv.name}!`;
    if (crit) text += ` <span class="tag crit">CRITICAL!${r.fast ? ' Lightning-fast answer!' : ''}</span>`;
    else if (r.slow) text += ` <span class="tag">Slow answer: weaker hit.</span>`;
    if (B.streak >= 3) text += ` <span class="tag streak">🔥×${streakMult()}</span>`;
    if (tm > 1) text += ` <span class="tag sup">Super effective! ×2</span>`;
    if (tm < 1) text += ` <span class="tag weak">Not very effective… ×½</span>`;
    await say(text, 1300);
    if (note) await say(note, 1500);
    if (tm > 1 && S().settings.showMath) await say(`Type bonus: ${Math.round(total / 2)} × 2 = ${Math.round(total / 2) * 2} damage!`, 1100);
    // Proof phase for bosses
    if (B.kind === 'trainer' && GL.TRAINERS[B.trainer].boss && !B.proof && e.hp > 0 && e.hp < GL.statsOf(e).maxhp / 2) {
      B.proof = true;
      await say(`<b>Warden Mira:</b> Impressive! Now, <b>Proof Phase</b>: my questions get one step harder!`, 2200);
    }
  }

  /* enemy attacks. block=true lets the player answer a quick block question. returns true if battle flow was taken over (faint) */
  async function enemyAttack(block) {
    const e = foe(), m = mine();
    if (!e || e.hp <= 0 || !m) return false;
    const pool = e.moves.filter(id => GL.MOVES[id].energy <= 2 || B.turn > 2);
    const mvid = GL.pick(pool), mv = GL.MOVES[mvid];
    let power = mv.power || 16; if (mv.special === 'dice') power = GL.randi(1, 6) * 4; if (/hits/.test(mv.special || '')) power = mv.power * 2;
    await say(`${B.kind === 'wild' ? 'The wild ' : 'Foe '}<b>${GL.monName(e)}</b> uses ${mv.name}!`, 900);
    let blocked = false;
    if (block && S().settings.block !== false) {
      const r = await ask({ tierDelta: -1, quick: true, noWord: true, ringMs: 5000, block: true, label: '🛡️ Quick! Block it!' });
      if (r.correct && !r.slow) { blocked = true; addStreak(); GL.sfx('block'); }
      else if (r.correct) { addStreak(); }
      else { B.streak = 0; }
    }
    const c = calc(e, m, power, mv.type, 0.85 * (blocked ? 0.5 : 1));
    m.hp = Math.max(0, m.hp - c.dmg);
    hitFx('p', mv.type, c.dmg, false, c.tm);
    hud();
    await say(blocked ? `🛡️ Blocked! Only ${c.dmg} damage.` : `${GL.monName(m)} took ${c.dmg} damage.${c.tm > 1 ? ' Super effective!' : ''}`, 1000);
    if (m.hp <= 0) { await myFainted(); return true; }
    return false;
  }

  async function endOfTurn() {
    const e = foe();
    if (B.whirl > 0 && e && e.hp > 0) {
      B.whirl--; const d = 4 + Math.floor(mine().level / 3);
      e.hp = Math.max(0, e.hp - d); hitFx('e', 'tide', d); hud();
      await say(`The whirlpool swirls: ${d} damage!`, 900);
      if (e.hp <= 0) return enemyFainted();
    }
    menu();
  }

  function hitFx(who, type, dmg, crit, tm) {
    const fxName = type === 'normal' ? 'normal_hit' : type;
    B.fx.push({ who, img: 'fx/fx_' + fxName, t: 0, dur: 0.5 });
    if (crit) B.fx.push({ who, img: 'fx/fx_crit', t: 0, dur: 0.5 });
    B.pops.push({ who, text: (crit ? '💥' : '') + '-' + dmg, t: 0, color: tm > 1 ? '#FFE14D' : '#fff' });
    if (who === 'e') { B.shake.e = 0.35; B.flashE = 0.3; } else { B.shake.p = 0.35; B.flashP = 0.3; }
    GL.sfx(crit ? 'crit' : 'hit');
  }

  /* ---------- outcomes ---------- */
  async function enemyFainted() {
    const e = foe();
    GL.sfx('faint'); B.enemyAlpha = 1;
    await tween(500, f => B.enemyAlpha = 1 - f);
    await say(`${B.kind === 'wild' ? 'The wild ' : 'Foe '}<b>${GL.monName(e)}</b> fainted!`, 1100);
    await giveXP(e);
    if (B.kind === 'trainer' && B.ei < B.enemies.length - 1) {
      B.ei++; GL.markSeen(foe().species); B.enemyAlpha = 1; B.proof = B.proof && true;
      await say(`${GL.TRAINERS[B.trainer].name} sends out <b>${GL.monName(foe())}</b>!`, 1100);
      return menu();
    }
    return win();
  }
  async function giveXP(e, scale = 1) {
    const base = Math.round((20 + 6 * e.level) * (B.kind === 'trainer' ? 1.5 : 1) * scale);
    const team = S().team;
    for (const m of team) {
      if (m.hp <= 0) continue;
      const active = m === mine();
      const gain = active ? base : Math.round(base * 0.5);
      if (active) await say(`<b>${GL.monName(m)}</b> gained ${gain} XP!`, 900);
      m.xp += gain;
      while (m.xp >= GL.xpNeed(m.level) && m.level < 50) {
        m.xp -= GL.xpNeed(m.level);
        const before = GL.statsOf(m); m.level++;
        const after = GL.statsOf(m); m.hp = Math.min(after.maxhp, m.hp + (after.maxhp - before.maxhp));
        const oldMoves = m.moves.slice(); m.moves = GL.movesFor(m.species, m.level);
        if (active) { B.fx.push({ who: 'p', img: 'fx/fx_levelup', t: 0, dur: 0.8 }); GL.sfx('levelup'); }
        hud();
        await say(`⭐ <b>${GL.monName(m)}</b> grew to <b>Level ${m.level}</b>!`, active ? 1500 : 900);
        for (const mv of m.moves) if (!oldMoves.includes(mv)) await say(`${GL.monName(m)} learned <b>${GL.MOVES[mv].name}</b>! (${GL.MOVES[mv].desc})`, 1700);
      }
    }
    hud();
  }
  async function win() {
    const s = S(); let coins = 0;
    s.stats.wins++;
    if (B.kind === 'wild') { coins = 5 + 2 * foe().level; }
    else {
      const tr = GL.TRAINERS[B.trainer]; coins = tr.coins; s.trainers[B.trainer] = true;
      await GL.dialog(tr.win, { name: tr.name, portrait: tr.portrait, sheet: tr.portrait ? null : tr.sheet });
      if (B.trainer === 'mira' && !s.badges.includes('meadow')) {
        s.badges.push('meadow'); s.shards++;
        B.fx.push({ who: 'e', img: 'fx/fx_confetti', t: 0, dur: 1.2 }); GL.sfx('win');
        await badgeCeremony();
      }
    }
    s.coins += coins; GL.sfx('coin');
    await say(`You won! +${coins} coins${B.best >= 3 ? ` · best streak ${B.best}` : ''}.`, 1300);
    finish('win');
  }
  function badgeCeremony() {
    return new Promise(res => {
      const md = GL.modal('Meadow Badge!', h('div', { class: 'ceremony' },
        h('img', { class: 'badge-big', src: GL.A + 'icons/badge_meadow.png', alt: 'Meadow Badge' }),
        h('p', null, 'You earned the Meadow Badge, a Star Shard ✨ and 200 coins!'),
        h('p', { class: 'small' }, 'More regions and wardens are coming in future updates.'),
        GL.btn('Awesome!', () => md.close(), 'btn-green big')), { onClose: res });
    });
  }
  async function myFainted() {
    const m = mine();
    GL.sfx('faint'); await tween(400, f => B.playerAlpha = 1 - f);
    await say(`<b>${GL.monName(m)}</b> is too tired to keep going!`, 1200);
    B.streak = 0;
    if (S().team.some(x => x.hp > 0)) { B.playerAlpha = 1; return swapMenu(true); }
    await say('All your Glyphlings are tired… You hurry back to the Glyph Center.', 1800);
    GL.healTeam();
    finish('lose');
  }
  async function run() {
    if (B.kind !== 'wild') { B.busy = true; await say('You can\'t run from a Ranger battle!', 1200); return menu(); }
    B.busy = true; stopKeys(); GL.sfx('flap');
    await say('You got away safely!', 900);
    finish('run');
  }

  /* ---------- bag / swap ---------- */
  function bagMenu() {
    stopKeys();
    const a = GL.$('#b-actions'); a.innerHTML = ''; const s = S();
    for (const id of ['berry_tonic', 'energy_drop', 'revive_feather']) {
      const it = GL.ITEMS[id], n = s.bag[id] || 0;
      a.append(h('button', { class: 'btn b-item', disabled: n <= 0, ontap: () => { if (!B.busy) useItem(id); } }, h('img', { src: GL.A + it.icon + '.png', alt: '' }), h('span', null, it.name), h('span', { class: 'cnt' }, '×' + n)));
    }
    a.append(h('button', { class: 'btn btn-ghost b-back', ontap: () => { GL.sfx('tap'); menu(); } }, '← Back'));
  }
  async function useItem(id) {
    const s = S(), m = mine(); B.busy = true;
    if (id === 'berry_tonic') {
      const st = GL.statsOf(m); if (m.hp >= st.maxhp) { await say('Already at full health!', 900); return menu(); }
      s.bag[id]--; m.hp = Math.min(st.maxhp, m.hp + 30); GL.sfx('heal'); B.fx.push({ who: 'p', img: 'fx/fx_heal', t: 0, dur: 0.7 }); hud();
      await say(`${GL.monName(m)} recovered health!`, 1000);
    } else if (id === 'energy_drop') {
      if (B.energy >= ENERGY_MAX) { await say('Energy is already full!', 900); return menu(); }
      s.bag[id]--; B.energy = Math.min(ENERGY_MAX, B.energy + 2); GL.sfx('heal'); hud();
      await say('+2 energy! ⚡⚡', 900);
    } else if (id === 'revive_feather') {
      const f = s.team.find(x => x.hp <= 0); if (!f) { await say('Nobody needs reviving.', 900); return menu(); }
      s.bag[id]--; f.hp = Math.floor(GL.statsOf(f).maxhp / 2); GL.sfx('heal');
      await say(`${GL.monName(f)} was revived!`, 1000);
    }
    if (await enemyAttack(true)) return;
    endOfTurn();
  }
  function swapMenu(forced) {
    stopKeys(); setPane('actions');
    const a = GL.$('#b-actions'); a.innerHTML = ''; const s = S();
    s.team.forEach((m, i) => {
      const st = GL.statsOf(m);
      a.append(h('button', { class: 'btn b-swap', disabled: m.hp <= 0 || i === B.me, ontap: () => { if (!B._swapping) doSwap(i, forced); } },
        GL.monIconEl(m.species, 40), h('span', { class: 'sw-name' }, GL.monName(m), h('small', null, ' Lv' + m.level)), GL.hpBar(m.hp, st.maxhp)));
    });
    if (!forced) a.append(h('button', { class: 'btn btn-ghost b-back', ontap: () => { GL.sfx('tap'); menu(); } }, '← Back'));
    B.busy = false;
  }
  async function doSwap(i, forced) {
    B._swapping = true; B.busy = true; GL.sfx('tap');
    B.me = i; B.participants.add(mine().uid); B.playerAlpha = 1;
    await tween(250, f => B.playerIn = f);
    hud(); await say(`Go, <b>${GL.monName(mine())}</b>!`, 900);
    B._swapping = false;
    if (!forced) { if (await enemyAttack(true)) return; return endOfTurn(); }
    menu();
  }

  /* ---------- capture ---------- */
  async function capture() {
    const s = S(), e = foe(), st = GL.statsOf(e);
    if (B.kind !== 'wild') return;
    B.busy = true; stopKeys();
    if ((s.bag.prism || 0) + (s.bag.super_prism || 0) <= 0) { await say('You\'re out of Glyph Prisms! Buy more at Tally Mart.', 1500); return menu(); }
    if (e.hp >= st.maxhp / 2) { await say(`${GL.monName(e)} is too strong to catch. Get its health <b>below half</b> first!`, 1800); return menu(); }
    if (s.team.length >= GL.TEAM_MAX) GL.toast('Team is full: a new catch goes to the Garden.');
    let prism = 'prism';
    if (s.bag.super_prism > 0 && s.bag.prism > 0) {
      const c = await GL.choice('Which prism?', [`Glyph Prism (×${s.bag.prism})`, `Super Prism (×${s.bag.super_prism}) · 1 fewer answer`], { cancel: true });
      if (c < 0) return menu(); prism = c === 1 ? 'super_prism' : 'prism';
    } else if (!s.bag.prism) prism = 'super_prism';
    const rar = GL.SPECIES[e.species].rarity;
    const red = (e.hp < st.maxhp * 0.2 ? 1 : 0) + (prism === 'super_prism' ? 1 : 0);
    const nStreak = Math.max(1, ({ common: 3, uncommon: 4, rare: 5 }[rar] || 4) - red);
    const nHard = Math.max(1, ({ common: 1, uncommon: 1, rare: 2 }[rar] || 1) - (prism === 'super_prism' && rar === 'rare' ? 1 : 0));
    const ch = await GL.choice(`Capture challenge for ${GL.monName(e)} (${rar}):`, [
      { label: `🔥 Streak: ${nStreak} correct in a row` },
      { label: `🧠 Brain Buster: ${nHard} hard question${nHard > 1 ? 's' : ''}` }], { cancel: true });
    if (ch < 0) return menu();
    s.bag[prism]--;
    // throw animation
    GL.sfx('throw');
    B.prism = { phase: 'throw', t: 0, frame: 0 };
    await tween(600, f => { B.prism.t = f; });
    B.prism.phase = 'absorb'; await tween(350, f => B.enemyScale = 1 - f);
    B.prism.phase = 'sit'; B.prism.frame = 0;
    const need = ch === 0 ? nStreak : nHard;
    let ok = 0;
    for (let i = 0; i < need; i++) {
      const r = await ask({ hard: ch === 1, label: ch === 0 ? `🔥 Capture streak ${i + 1} / ${need}` : `🧠 Brain Buster ${i + 1} / ${need}`, tierDelta: ch === 1 ? 1 : 0, ringMs: ch === 1 ? 14000 : undefined, noWord: true });
      if (!r.correct) { B.streak = 0; break; }
      addStreak(); ok++;
      B.prism.phase = 'shake'; B.prism.t = 0; GL.sfx('shake');
      setPane('msg'); GL.$('#b-msg').innerHTML = `<div class="b-msg-text">The prism shakes… ${'✨'.repeat(ok)}</div>`;
      await tween(500, f => B.prism.t = f);
      B.prism.phase = 'sit';
    }
    if (ok >= need) {
      B.prism.phase = 'caught'; GL.sfx('caught');
      B.fx.push({ who: 'e', img: 'fx/fx_confetti', t: 0, dur: 1.2 });
      e.hp = Math.max(1, e.hp);
      const where = GL.addToCollection(e); s.stats.captures++;
      await say(`🎉 Gotcha! <b>${GL.monName(e)}</b> was caught!`, 1800);
      if (!s.flags['caught_' + e.species]) { s.flags['caught_' + e.species] = true; await say(`${GL.monName(e)}'s data was added to your Field Journal.`, 1300); }
      if (where === 'garden') await say(`Your team is full, so ${GL.monName(e)} went to the Garden at the Glyph Center.`, 1600);
      await giveXP(e, 0.8);
      B.result = 'caught';
      s.coins += 5; finish('caught');
    } else {
      B.prism.phase = 'break'; B.prism.t = 0; GL.sfx('break');
      await tween(450, f => B.prism.t = f);
      B.prism = null; await tween(300, f => B.enemyScale = f);
      await say(`Oh no! ${GL.monName(e)} broke free!`, 1300);
      if (await enemyAttack(false)) return;
      endOfTurn();
    }
  }

  /* ---------- end ---------- */
  async function finish(result) {
    stopKeys();
    B.active = false; B.result = result;
    GL.$('#battle-ui').classList.remove('show');
    GL.$('#battle-ui').innerHTML = '';
    const s = S();
    if (result === 'lose') {
      const c = s.lastCenter || { map: 'town', x: 16, y: 5 };
      GL.World.enter(c.map, c.x, c.y, 0);
    } else {
      GL.setScene('world'); GL.HUD.show(); GL.HUD.update();
    }
    GL.save();
    await B.checkEvolution();
    if (B._resolve) { const r = B._resolve; B._resolve = null; r(result); }
  }

  /* ---------- evolution (Proof Spark) ---------- */
  B.checkEvolution = async function () {
    const s = S();
    for (const m of s.team) {
      const sp = GL.SPECIES[m.species];
      if (!sp.evo || m.level < sp.evo.level) continue;
      const to = GL.SPECIES[sp.evo.to];
      await GL.dialog([`What's this? <${sp.name}> is glowing with a Proof Spark!`.replace(/[<>]/g, ''), 'To evolve, prove your skills: get 4 of 5 questions right!'], { mon: m.species, name: sp.name });
      const go = await GL.choice(`Take the Proof Spark test for ${sp.name}?`, ['Let\'s evolve!', 'Not now'], { cancel: false });
      if (go !== 0) { GL.toast('You can try again after your next battle.'); continue; }
      let ok = 0;
      for (let i = 0; i < 5; i++) {
        const q = GL.Q.next({ noWord: true });
        const r = await GL.askQuestion(q, { title: `✨ Proof Spark ${i + 1} / 5 · ${ok} correct` });
        if (r.correct) ok++;
        if (ok >= 4 || (5 - i - 1) + ok < 4) break;
      }
      if (ok < 4) { await GL.dialog([`The spark fades… (${ok} of 5). ${sp.name} will try again after your next battle.`]); continue; }
      await evolveAnim(m, sp, to);
    }
  };
  function evolveAnim(m, sp, to) {
    return new Promise(res => {
      GL.sfx('evolve');
      const cv = h('canvas', { class: 'evo-canvas', width: 384, height: 384 });
      const msg = h('p', null, `${sp.name} is evolving!`);
      const md = GL.modal('Evolution!', h('div', { class: 'ceremony' }, cv, msg), { noClose: true });
      const ctx = cv.getContext('2d'); const t0 = performance.now();
      const before = GL.statsOf(m);
      const oldSpecies = m.species;
      const draw = () => {
        const t = (performance.now() - t0) / 1000;
        ctx.clearRect(0, 0, 384, 384);
        const phase = Math.min(1, t / 2.8);
        const showNew = t > 2.8 || (t > 1 && Math.sin(t * (4 + t * 6)) > 0);
        const img = GL.monImg(showNew ? sp.evo.to : oldSpecies, 'front');
        const sc = showNew ? 1.15 : 1;
        ctx.save(); ctx.translate(192, 200);
        const g = ctx.createRadialGradient(0, 0, 10, 0, 0, 180); g.addColorStop(0, `rgba(255,225,77,${0.2 + phase * 0.6})`); g.addColorStop(1, 'rgba(255,225,77,0)');
        ctx.fillStyle = g; ctx.fillRect(-192, -200, 384, 384);
        if (img) ctx.drawImage(img, -96 * sc * 1.4, -96 * sc * 1.4, 192 * sc * 1.4, 192 * sc * 1.4);
        ctx.restore();
        if (t < 3.6) requestAnimationFrame(draw);
        else {
          m.species = sp.evo.to; m.moves = GL.movesFor(m.species, m.level);
          const after = GL.statsOf(m); m.hp = Math.min(after.maxhp, m.hp + (after.maxhp - before.maxhp));
          GL.markCaught(m.species); GL.sfx('win'); GL.save();
          msg.textContent = `Congratulations! ${sp.name} evolved into ${to.name}!`;
          const newMoves = m.moves.filter(x => GL.MOVES[x].sig && !GL.SPECIES[oldSpecies].learn.some(([id]) => id === x));
          if (newMoves.length) msg.textContent += ` It learned ${GL.MOVES[newMoves[0]].name}!`;
          md.body.querySelector('.ceremony').append(GL.btn('Amazing!', () => { md.close(); res(); }, 'btn-green big'));
        }
      };
      draw();
    });
  }

  /* ---------- canvas rendering ---------- */
  function tween(ms, fn) {
    if (GL.fastBattle) ms *= 0.2;
    return new Promise(res => { const t0 = performance.now(); const step = () => { const f = Math.min(1, (performance.now() - t0) / ms); fn(f); if (f < 1) requestAnimationFrame(step); else res(); }; step(); });
  }
  B.layout = function (w, hh) {
    const portrait = hh > w * 1.05;
    const panelH = portrait ? hh * 0.56 : hh * 0.44;
    const sceneH = hh - panelH;
    const es = Math.min(w * (portrait ? 0.42 : 0.24), sceneH * 0.62);
    const ps = Math.min(w * (portrait ? 0.48 : 0.28), sceneH * 0.72);
    return { portrait, sceneH, ex: w * (portrait ? 0.7 : 0.7), ey: sceneH * (portrait ? 0.42 : 0.42), es, px: w * (portrait ? 0.28 : 0.27), py: sceneH * (portrait ? 0.86 : 0.84), ps };
  };
  B.update = function (dt) {
    B.t += dt;
    for (const k of ['e', 'p']) B.shake[k] = Math.max(0, B.shake[k] - dt);
    B.flashE = Math.max(0, B.flashE - dt); B.flashP = Math.max(0, B.flashP - dt);
    B.enemyIn = Math.min(1, B.enemyIn + dt * 2.5); B.playerIn = Math.min(1, B.playerIn + dt * 2.5);
    B.fx = B.fx.filter(f => (f.t += dt) < f.dur);
    B.pops = B.pops.filter(p => (p.t += dt) < 1.1);
  };
  function drawCover(ctx, im, w, hh) {
    if (!im || !im.naturalWidth) { ctx.fillStyle = '#9fe08a'; ctx.fillRect(0, 0, w, hh); return; }
    const s = Math.max(w / im.naturalWidth, hh / im.naturalHeight);
    const dw = im.naturalWidth * s, dh = im.naturalHeight * s;
    ctx.drawImage(im, (w - dw) / 2, (hh - dh) / 2 - (hh * 0.06), dw, dh);
  }
  B.draw = function (ctx, w, hh) {
    const L = B.layout(w, hh);
    drawCover(ctx, GL.img(B.bg || 'battle/bg_battle_meadow'), w, L.sceneH / 0.62);
    const shadow = GL.img('battle/platform_shadow');
    const e = foe(), m = mine();
    // enemy
    if (e) {
      const bob = Math.sin(B.t * 2.2) * L.es * 0.02, sx = B.shake.e > 0 ? Math.sin(B.shake.e * 60) * 8 : 0;
      const slide = (1 - easeOut(B.enemyIn)) * w * 0.5;
      if (shadow) ctx.drawImage(shadow, L.ex - L.es * 0.55 + slide, L.ey + L.es * 0.36, L.es * 1.1, L.es * 0.28);
      const im = GL.monImg(e.species, 'front'), sc = GL.SPECIES[e.species].evolved ? 1.15 : 1;
      const sz = L.es * sc * B.enemyScale;
      ctx.save(); ctx.globalAlpha = B.enemyAlpha * (B.flashE > 0 && Math.floor(B.flashE * 20) % 2 ? 0.35 : 1);
      if (im && sz > 1) ctx.drawImage(im, L.ex - sz / 2 + sx + slide, L.ey - sz / 2 + bob + (L.es - sz) * 0.4, sz, sz);
      ctx.restore();
    }
    // player back sprite
    if (m) {
      const bob = Math.sin(B.t * 2.2 + 1) * L.ps * 0.015, sx = B.shake.p > 0 ? Math.sin(B.shake.p * 60) * 8 : 0;
      const slide = (1 - easeOut(B.playerIn)) * -w * 0.5;
      if (shadow) ctx.drawImage(shadow, L.px - L.ps * 0.5 + slide, L.py - L.ps * 0.08, L.ps, L.ps * 0.26);
      const im = GL.monImg(m.species, 'back'), sc = GL.SPECIES[m.species].evolved ? 1.15 : 1, sz = L.ps * sc;
      ctx.save(); ctx.globalAlpha = B.playerAlpha * (B.flashP > 0 && Math.floor(B.flashP * 20) % 2 ? 0.35 : 1);
      if (im) ctx.drawImage(im, L.px - sz / 2 + sx + slide, L.py - sz * 0.92 + bob, sz, sz);
      ctx.restore();
    }
    // prism
    if (B.prism) {
      const P = B.prism;
      if (P.phase === 'throw') {
        const im = GL.img('battle/prism_throw'), f = Math.min(5, Math.floor(P.t * 6));
        const x = L.px + (L.ex - L.px) * P.t, y = L.py - L.ps * 0.6 + (L.ey - (L.py - L.ps * 0.6)) * P.t - Math.sin(P.t * Math.PI) * L.sceneH * 0.3;
        const s = L.es * 0.45; if (im) ctx.drawImage(im, f * 96, 0, 96, 96, x - s / 2, y - s / 2, s, s);
      } else {
        const sheet = P.phase === 'break' ? 'battle/prism_break' : 'battle/prism_shake';
        const im = GL.img(sheet); let f = 0;
        if (P.phase === 'shake') f = Math.min(3, Math.floor(P.t * 4)); else if (P.phase === 'break') f = Math.min(3, Math.floor(P.t * 4)); else if (P.phase === 'caught') f = 0;
        const s = L.es * 0.55; const y = L.ey + L.es * 0.2 - s / 2;
        if (im) ctx.drawImage(im, f * 192, 0, 192, 192, L.ex - s / 2, y, s, s);
        if (P.phase === 'caught') { ctx.fillStyle = 'rgba(255,225,77,0.35)'; ctx.beginPath(); ctx.arc(L.ex, y + s / 2, s * (0.7 + Math.sin(B.t * 6) * 0.08), 0, 7); ctx.fill(); }
      }
    }
    // fx
    for (const f of B.fx) {
      const im = GL.img(f.img); if (!im) continue;
      const fr = Math.min(3, Math.floor(f.t / f.dur * 4));
      const cx = f.who === 'e' ? L.ex : L.px, cy = f.who === 'e' ? L.ey : L.py - L.ps * 0.45, s = (f.who === 'e' ? L.es : L.ps) * (f.img.includes('confetti') ? 1.8 : 1);
      ctx.drawImage(im, fr * 192, 0, 192, 192, cx - s / 2, cy - s / 2, s, s);
    }
    // damage popups
    for (const p of B.pops) {
      const cx = p.who === 'e' ? L.ex : L.px, cy = (p.who === 'e' ? L.ey - L.es * 0.4 : L.py - L.ps * 0.9) - p.t * 40;
      ctx.save(); ctx.globalAlpha = Math.min(1, (1.1 - p.t) * 3);
      ctx.font = `700 ${Math.round(Math.max(26, L.es * 0.17))}px Fredoka, ui-rounded, system-ui`; ctx.textAlign = 'center';
      ctx.lineWidth = 6; ctx.strokeStyle = '#2B2140'; ctx.strokeText(p.text, cx, cy); ctx.fillStyle = p.color; ctx.fillText(p.text, cx, cy);
      ctx.restore();
    }
  };
  const easeOut = t => 1 - Math.pow(1 - t, 3);
})();
