/* Glyphlings core: namespace, helpers, assets, audio, save, input */
'use strict';
const GL = window.GL = window.GL || {};

/* ---------- helpers ---------- */
GL.rand = (a, b) => a + Math.random() * (b - a);
GL.randi = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
GL.pick = arr => arr[Math.floor(Math.random() * arr.length)];
GL.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
GL.sleep = ms => new Promise(r => setTimeout(r, ms));
GL.today = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
GL.shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
GL.weighted = list => { // [[item, weight], ...]
  let t = 0; for (const [, w] of list) t += w;
  let r = Math.random() * t;
  for (const [it, w] of list) { if ((r -= w) <= 0) return it; }
  return list[list.length - 1][0];
};
GL.h = function (tag, attrs, ...kids) {
  const el = document.createElement(tag);
  if (attrs) for (const k in attrs) {
    const v = attrs[k];
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on') && typeof v === 'function') {
      const ev = k.slice(2);
      if (ev === 'tap') GL.onTap(el, v); else el.addEventListener(ev, v);
    }
    else if (k === 'html') el.innerHTML = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat(Infinity)) {
    if (kid == null || kid === false) continue;
    el.appendChild(typeof kid === 'string' || typeof kid === 'number' ? document.createTextNode(String(kid)) : kid);
  }
  return el;
};
// fast, reliable tap for touch + mouse (no 300ms delay, no ghost clicks)
GL.onTap = function (el, fn) {
  el.addEventListener('click', e => {
    if (el.disabled || el.classList.contains('disabled')) return;
    GL.audio.unlock(); fn(e);
  });
};
GL.esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ---------- assets ---------- */
GL.A = 'assets/';
GL.images = {};
GL.img = name => GL.images[name];
GL.loadImages = function (list, onProgress) {
  let done = 0;
  return Promise.all(list.map(p => new Promise(res => {
    const im = new Image();
    im.onload = im.onerror = () => { done++; onProgress && onProgress(done / list.length); res(); };
    im.src = GL.A + p;
    GL.images[p.replace(/\.(png|jpg)$/, '')] = im;
  })));
};
GL.ASSET_LIST = (() => {
  const L = [];
  const mons = ['kindlekit', 'splishnar', 'sproutgolin', 'zappip', 'pebblit', 'kitewing', 'tallybun', 'owlgebra'];
  for (const m of mons) for (const v of ['front', 'back', 'icon']) L.push(`monsters/${m}_${v}.png`);
  for (const c of ['npc_professor', 'npc_rival', 'npc_villager_a', 'npc_villager_b', 'npc_warden_mira',
    'player_body_deep', 'player_body_light', 'player_body_medium', 'player_body_tan',
    'player_hair_1', 'player_hair_2', 'player_hair_3', 'player_hair_4',
    'player_hat_beanie', 'player_hat_cap', 'player_hat_explorer',
    'player_jacket_blue', 'player_jacket_green', 'player_jacket_red',
    'player_portrait_base', 'portrait_professor', 'portrait_rival', 'portrait_warden_mira']) L.push(`characters/${c}.png`);
  for (const t of ['tileset_meadow', 'tileset_town', 'interior_basic']) L.push(`tiles/${t}.png`);
  L.push('battle/bg_battle_meadow.jpg', 'battle/bg_battle_hall.jpg', 'battle/platform_shadow.png', 'battle/prism_throw.png', 'battle/prism_shake.png', 'battle/prism_break.png');
  for (const f of ['confetti', 'crit', 'ember', 'gale', 'heal', 'leaf', 'levelup', 'normal_hit', 'stone', 'tide', 'volt']) L.push(`fx/fx_${f}.png`);
  for (const u of ['streak_flame', 'power_ring', 'menu_icons', 'dpad', 'energy_pip_on', 'energy_pip_off']) L.push(`ui/${u}.png`);
  for (const k of ['bg_sky_far', 'bg_sky_mid', 'bg_sky_near', 'kitewing_fly', 'number_gate', 'ring_back', 'ring_front', 'storm_cloud', 'arcade_cabinet_kitewing']) L.push(`arcade/kitewing/${k}.png`);
  L.push('brand/logo.png');
  return L;
})();

/* ---------- audio (Web Audio, synthesized, unlocked on first tap) ---------- */
GL.audio = (() => {
  let ctx = null, master = null;
  const A = {
    unlocked: false,
    unlock() {
      try {
        if (!ctx) {
          const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
          ctx = new AC(); master = ctx.createGain(); master.connect(ctx.destination);
          // iOS: play a silent buffer inside the gesture
          const b = ctx.createBuffer(1, 1, 22050), s = ctx.createBufferSource(); s.buffer = b; s.connect(master); s.start(0);
        }
        if (ctx.state === 'suspended') ctx.resume();
        A.unlocked = true; A.setVolume();
      } catch (e) { /* ignore */ }
    },
    setVolume() { if (master) master.gain.value = (GL.S && GL.S.settings && GL.S.settings.sound === false) ? 0 : ((GL.S && GL.S.settings && GL.S.settings.volume != null) ? GL.S.settings.volume : 0.6); },
    tone(freq, dur, opt = {}) {
      if (!ctx || !A.unlocked) return;
      const t = ctx.currentTime + (opt.delay || 0);
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = opt.type || 'square'; o.frequency.setValueAtTime(freq, t);
      if (opt.to) o.frequency.exponentialRampToValueAtTime(opt.to, t + dur);
      const v = opt.vol == null ? 0.18 : opt.vol;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.05);
    },
    noise(dur, opt = {}) {
      if (!ctx || !A.unlocked) return;
      const t = ctx.currentTime + (opt.delay || 0);
      const n = Math.floor(ctx.sampleRate * dur), b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
      const s = ctx.createBufferSource(); s.buffer = b;
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = opt.freq || 1800;
      const g = ctx.createGain(); g.gain.value = opt.vol || 0.25;
      s.connect(f); f.connect(g); g.connect(master); s.start(t);
    },
    play(name) {
      const T = A.tone.bind(A);
      switch (name) {
        case 'tap': T(660, 0.05, { type: 'triangle', vol: 0.12 }); break;
        case 'key': T(880, 0.04, { type: 'triangle', vol: 0.1 }); break;
        case 'correct': T(660, 0.09, { type: 'triangle' }); T(990, 0.14, { type: 'triangle', delay: 0.08 }); break;
        case 'wrong': T(220, 0.18, { type: 'sawtooth', vol: 0.12, to: 150 }); break;
        case 'hit': A.noise(0.15, { freq: 1200, vol: 0.3 }); T(180, 0.1, { type: 'square', vol: 0.1, to: 90 }); break;
        case 'crit': A.noise(0.25, { freq: 2600, vol: 0.35 }); T(880, 0.08, { delay: 0.02 }); T(1320, 0.15, { delay: 0.1 }); break;
        case 'miss': T(400, 0.15, { type: 'sine', to: 200, vol: 0.12 }); break;
        case 'block': T(300, 0.06, { type: 'square', vol: 0.12 }); T(500, 0.1, { type: 'square', vol: 0.1, delay: 0.05 }); break;
        case 'levelup': [523, 659, 784, 1047].forEach((f, i) => T(f, 0.14, { type: 'square', delay: i * 0.09, vol: 0.12 })); break;
        case 'coin': T(988, 0.06, { type: 'square', vol: 0.1 }); T(1319, 0.2, { type: 'square', vol: 0.1, delay: 0.06 }); break;
        case 'heal': [523, 784, 659, 1047].forEach((f, i) => T(f, 0.18, { type: 'sine', delay: i * 0.12, vol: 0.15 })); break;
        case 'shake': T(300, 0.08, { type: 'triangle', vol: 0.15 }); T(250, 0.08, { type: 'triangle', vol: 0.15, delay: 0.1 }); break;
        case 'caught': [784, 988, 1175, 1568].forEach((f, i) => T(f, 0.16, { type: 'triangle', delay: i * 0.1 })); break;
        case 'break': A.noise(0.3, { freq: 3000, vol: 0.3 }); break;
        case 'throw': T(400, 0.3, { type: 'sine', to: 1200, vol: 0.1 }); break;
        case 'encounter': [392, 523, 392, 659].forEach((f, i) => T(f, 0.1, { type: 'square', delay: i * 0.08, vol: 0.1 })); break;
        case 'faint': T(440, 0.5, { type: 'sawtooth', to: 80, vol: 0.12 }); break;
        case 'flap': T(500, 0.06, { type: 'sine', to: 800, vol: 0.08 }); break;
        case 'ring': T(1047, 0.08, { type: 'triangle', vol: 0.12 }); T(1568, 0.12, { type: 'triangle', vol: 0.1, delay: 0.05 }); break;
        case 'bump': T(110, 0.06, { type: 'square', vol: 0.08 }); break;
        case 'door': T(330, 0.08, { type: 'triangle', vol: 0.12 }); T(494, 0.1, { type: 'triangle', vol: 0.12, delay: 0.07 }); break;
        case 'save': [659, 784, 988].forEach((f, i) => T(f, 0.12, { type: 'triangle', delay: i * 0.1 })); break;
        case 'win': [523, 659, 784, 659, 784, 1047].forEach((f, i) => T(f, 0.16, { type: 'square', delay: i * 0.12, vol: 0.1 })); break;
        case 'evolve': for (let i = 0; i < 8; i++) T(300 + i * 90, 0.12, { type: 'sine', delay: i * 0.1, vol: 0.12 }); break;
        case 'talk': T(520 + Math.random() * 120, 0.03, { type: 'triangle', vol: 0.05 }); break;
      }
    }
  };
  const unlockOnce = () => { A.unlock(); };
  window.addEventListener('touchend', unlockOnce, { passive: true });
  window.addEventListener('pointerdown', unlockOnce, { passive: true });
  window.addEventListener('keydown', unlockOnce);
  return A;
})();
GL.sfx = n => GL.audio.play(n);

/* ---------- speech (read-aloud) ---------- */
GL.speak = function (text) {
  try {
    if (!window.speechSynthesis) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text.replace(/×/g, ' times ').replace(/÷/g, ' divided by ').replace(/\?/g, ' what'));
    u.rate = 0.95; speechSynthesis.speak(u);
  } catch (e) { }
};

/* ---------- save ---------- */
GL.SAVE_KEY = 'glyphlings.save.v1';
GL.defaultSettings = () => ({ sound: true, volume: 0.6, timer: true, block: true, readAloud: false, maxTier: 5, focus: 'mixed', showMath: true });
GL.save = function (manual) {
  if (!GL.S) return false;
  try {
    GL.S.savedAt = Date.now();
    localStorage.setItem(GL.SAVE_KEY, JSON.stringify(GL.S));
    if (manual) GL.sfx('save');
    return true;
  } catch (e) { console.warn('save failed', e); return false; }
};
GL.loadSave = function () {
  try {
    const raw = localStorage.getItem(GL.SAVE_KEY); if (!raw) return null;
    const s = JSON.parse(raw); if (!s || !s.v) return null;
    return GL.migrate(s);
  } catch (e) { console.warn('load failed', e); return null; }
};
GL.migrate = function (s) {
  s.settings = Object.assign(GL.defaultSettings(), s.settings || {});
  s.bag = Object.assign({ prism: 0, super_prism: 0, berry_tonic: 0, energy_drop: 0, revive_feather: 0, hint_lens: 0 }, s.bag || {});
  s.flags = s.flags || {}; s.journal = s.journal || { seen: {}, caught: {} };
  s.arcade = Object.assign({ best: 0, boothDay: '', boothCount: 0, plays: 0 }, s.arcade || {});
  s.play = s.play || { days: {} }; s.stats = Object.assign({ battles: 0, wins: 0, captures: 0, correct: 0 }, s.stats || {});
  s.garden = s.garden || []; s.badges = s.badges || []; s.gear = Object.assign({ hats: [], jackets: [] }, s.gear || {});
  s.trainers = s.trainers || {};
  if (GL.Q) GL.Q.ensure(s);
  return s;
};
GL.newSave = function () {
  const s = {
    v: 1, created: Date.now(), uid: 1,
    player: { name: 'Oliver', skin: 'light', hair: 1, hairColor: 0, jacket: 'red', hat: null },
    team: [], garden: [], bag: { prism: 5, super_prism: 0, berry_tonic: 3, energy_drop: 1, revive_feather: 0, hint_lens: 2 },
    coins: 50, tokens: 3, shards: 0, badges: [], journal: { seen: {}, caught: {} },
    pos: { map: 'town', x: 7, y: 6, dir: 0 }, flags: {}, gear: { hats: [], jackets: [] },
    stats: {}, arcade: {}, play: { days: {} }, settings: GL.defaultSettings(), trainers: {}
  };
  return GL.migrate(s);
};
GL.exportCode = () => btoa(unescape(encodeURIComponent(JSON.stringify(GL.S))));
GL.importCode = code => { const s = JSON.parse(decodeURIComponent(escape(atob(code.trim())))); if (!s.v) throw new Error('bad code'); GL.S = GL.migrate(s); GL.save(); };

/* ---------- input ---------- */
GL.input = (() => {
  const I = { dir: null, held: {}, aPressed: false, bPressed: false, touchDir: null, listeners: [] };
  const keyDir = { ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right' };
  I.order = [];
  window.addEventListener('keydown', e => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
    for (const fn of I.listeners.slice().reverse()) if (fn(e) === true) { e.preventDefault(); return; }
    const d = keyDir[e.code];
    if (d) { if (!I.order.includes(d)) I.order.push(d); if (!e.repeat) { I.tapDir = d; I.downAt = performance.now(); } e.preventDefault(); }
    if (e.code === 'Enter' || e.code === 'Space') { I.aPressed = true; e.preventDefault(); }
    if (e.code === 'Escape' || e.code === 'Backspace') { I.bPressed = true; }
  });
  window.addEventListener('keyup', e => { const d = keyDir[e.code]; if (d) { I.order = I.order.filter(x => x !== d); if (performance.now() - (I.downAt || 0) > 120) I.tapDir = null; } });
  window.addEventListener('blur', () => { I.order = []; I.touchDir = null; });
  I.current = () => { const d = I.touchDir || I.order[I.order.length - 1] || I.tapDir || null; I.tapDir = null; return d; };
  I.consumeA = () => { const a = I.aPressed; I.aPressed = false; return a; };
  I.consumeB = () => { const b = I.bPressed; I.bPressed = false; return b; };
  I.clear = () => { I.aPressed = I.bPressed = false; I.tapDir = null; };
  I.onKey = fn => { I.listeners.push(fn); return () => { I.listeners = I.listeners.filter(f => f !== fn); }; };
  return I;
})();

/* ---------- iOS niceties ---------- */
document.addEventListener('gesturestart', e => e.preventDefault());
document.addEventListener('dblclick', e => e.preventDefault(), { passive: false });
// double-tap zoom is disabled with CSS touch-action: manipulation (keeps fast repeated taps working)
