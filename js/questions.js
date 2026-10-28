/* Adaptive math engine: no-repeat deck, Brain Meter tiers, mastery, missed-fact boost */
'use strict';
GL.Q = (() => {
  const Q = {};
  const ALL = [];
  for (let a = 0; a <= 12; a++) for (let b = 0; b <= 12; b++) ALL.push(`m:${a}:${b}`);
  for (let b = 1; b <= 12; b++) for (let a = 0; a <= 12; a++) ALL.push(`d:${a}:${b}`); // (a*b) ÷ b = a
  Q.ALL = ALL;
  Q.parse = key => { const [op, a, b] = key.split(':'); return { op, a: +a, b: +b }; };
  function mulTier(a, b) {
    const h = Math.max(a, b), l = Math.min(a, b);
    if (l <= 1 || h <= 2) return 1;
    if (h <= 5 || l === 2 || a === 10 || b === 10) return 2;
    if (l <= 5) return 3;
    if (h <= 9) return 4;
    return 5;
  }
  Q.tierOf = key => {
    const { op, a, b } = Q.parse(key);
    if (op === 'm') return mulTier(a, b);
    if (b === 1 || a <= 1) return 1;
    return Math.min(5, mulTier(a, b) + 1);
  };
  Q.ensure = function (S) {
    const M = S.math = S.math || {};
    M.deck = M.deck || GL.shuffle(ALL.slice());
    M.cycle = M.cycle || 1;
    M.tier = M.tier || 2;
    M.right = M.right || 0; M.wrong = M.wrong || 0;
    M.facts = M.facts || {};       // key -> {n, ok, miss, ms, last, streak}
    M.mastery = M.mastery || {};   // skill -> 0..100
    M.starDays = M.starDays || {}; // skill -> [dates]
    M.due = M.due || [];           // missed-fact boost [{key, wait}]
    M.log = M.log || [];           // recent answers
    M.days = M.days || {};         // date -> {n, ok, ms}
    M.tokenProgress = M.tokenProgress || 0;
    M.scaffold = !!M.scaffold;
    return M;
  };
  const M = () => GL.S.math;
  Q.skillsOf = key => {
    const { op, a, b } = Q.parse(key);
    if (op === 'm') return a === b ? [`mul.${a}`] : [`mul.${a}`, `mul.${b}`];
    return [`div.${b}`];
  };
  Q.inDeck = key => M().deck.includes(key);

  function pickKey(opts) {
    const m = M();
    if (!m.deck.length) { m.deck = GL.shuffle(ALL.slice()); m.cycle++; GL.toast && GL.toast('🌟 You answered every fact! New deck shuffled.'); }
    const focus = GL.S.settings.focus;
    const okOp = k => focus === 'mul' ? k[0] === 'm' : focus === 'div' ? k[0] === 'd' : true;
    let tier = GL.clamp(m.tier + (opts.tierDelta || 0), 1, Math.max(1, GL.S.settings.maxTier + (opts.tierDelta > 0 ? 1 : 0)));
    tier = Math.min(tier, 5);
    // 1) missed-fact boost (still in deck = not yet answered correctly)
    m.due.forEach(d => d.wait--);
    const dueIdx = m.due.findIndex(d => d.wait <= 0 && m.deck.includes(d.key) && okOp(d.key));
    if (dueIdx >= 0 && !opts.hard) { const k = m.due[dueIdx].key; m.due.splice(dueIdx, 1); return k; }
    m.due = m.due.filter(d => m.deck.includes(d.key)).slice(-20);
    let pool = m.deck.filter(okOp);
    if (!pool.length) pool = m.deck.slice();
    if (opts.hard) {
      const hard = pool.filter(k => Q.tierOf(k) >= Math.max(3, tier));
      if (hard.length) return GL.pick(hard);
    }
    // 10% weak spots
    if (Math.random() < 0.1) {
      const weak = pool.filter(k => (m.facts[k] && m.facts[k].miss > 0));
      if (weak.length) return GL.pick(weak);
    }
    // prefer op mix 55/45
    const wantOp = focus === 'mixed' ? (Math.random() < 0.55 ? 'm' : 'd') : null;
    let p2 = wantOp ? pool.filter(k => k[0] === wantOp) : pool;
    if (!p2.length) p2 = pool;
    const at = p2.filter(k => Q.tierOf(k) === tier), below = p2.filter(k => Q.tierOf(k) < tier && Q.tierOf(k) >= tier - 2);
    if (at.length || below.length) {
      const choice = (at.length && (Math.random() < 0.75 || !below.length)) ? at : below;
      return GL.pick(choice);
    }
    const under = p2.filter(k => Q.tierOf(k) <= tier);
    if (under.length) return GL.pick(under);
    // nothing easy left: take the easiest remaining
    let best = null, bt = 9;
    for (const k of p2) { const t = Q.tierOf(k); if (t < bt) { bt = t; best = []; } if (t === bt) best.push(k); }
    return GL.pick(best);
  }

  const WORD_M = [
    (a, b) => `Tallybun hops ${a} times in each of ${b} meadows. How many hops in all?`,
    (a, b) => `There are ${a} rows of berry bushes with ${b} bushes in each row. How many bushes?`,
    (a, b) => `Each Zappip blinks ${b} times. How many blinks do ${a} Zappips make?`,
    (a, b) => `Mira's team trains ${b} minutes a day for ${a} days. How many minutes?`,
    (a, b) => `A Pebblit stack has ${a} layers of ${b} pebbles. How many pebbles?`,
  ];
  const WORD_D = [
    (c, b) => `${c} sumberries are shared equally by ${b} Glyphlings. How many does each get?`,
    (c, b) => `Kitewing flies ${c} meters in ${b} equal glides. How long is each glide?`,
    (c, b) => `${c} Glyph Prisms are packed into boxes of ${b}. How many boxes?`,
    (c, b) => `Professor Abacus puts ${c} beads on ${b} rods equally. How many beads per rod?`,
  ];
  Q.how = function (op, a, b) {
    if (op === 'd') {
      const c = a * b;
      if (b === 1) return `${c} ÷ 1 = ${c}: dividing by 1 changes nothing.`;
      if (a === 0) return `0 ÷ ${b} = 0: nothing shared is still nothing.`;
      return `Think ${b} × ? = ${c}. Since ${b} × ${a} = ${c}, the answer is ${a}.`;
    }
    const p = a * b, x = Math.max(a, b), y = Math.min(a, b);
    if (y === 0) return `Anything × 0 = 0.`;
    if (y === 1) return `Anything × 1 stays the same: ${x}.`;
    if (y === 2) return `× 2 means double: ${x} + ${x} = ${p}.`;
    if (y === 10) return `× 10: put a zero on the end → ${p}.`;
    if (y === 5 || x === 5) { const o = y === 5 ? x : y; return `× 5 is half of × 10: ${o} × 10 = ${o * 10}, half is ${p}.`; }
    if (y === 9 || x === 9) { const o = y === 9 ? x : y; return `× 9 = × 10 minus one: ${o * 10} − ${o} = ${p}.`; }
    if (x === 11 && y <= 9) return `11 × ${y}: write ${y} twice → ${p}.`;
    if (y % 2 === 0) return `${x} × ${y / 2} = ${x * y / 2}, doubled is ${p}.`;
    if (x % 2 === 0) return `${y} × ${x / 2} = ${y * x / 2}, doubled is ${p}.`;
    return `${x} × ${y - 1} = ${x * (y - 1)}, plus one more ${x} = ${p}.`;
  };
  Q.hint = function (op, a, b) {
    if (op === 'd') {
      const c = a * b;
      return `Count by ${b}s up to ${c}: ${Array.from({ length: Math.min(a, 6) }, (_, i) => b * (i + 1)).join(', ')}${a > 6 ? ', …' : ''}`;
    }
    const x = Math.max(a, b), y = Math.min(a, b);
    if (y <= 1) return y === 0 ? 'Zero groups of anything is 0.' : 'One group: the number stays the same.';
    if (y % 2 === 0 && y > 2) return `Try ${x} × ${y / 2} first, then double it.`;
    return `Skip-count by ${x}: ${Array.from({ length: Math.min(y, 5) }, (_, i) => x * (i + 1)).join(', ')}${y > 5 ? ', …' : ''}`;
  };

  /** opts: {context, tierDelta, hard, noWord, quick} */
  Q.next = function (opts = {}) {
    const key = pickKey(opts);
    const { op, a, b } = Q.parse(key);
    const tier = Q.tierOf(key);
    const q = { key, op, a, b, tier, kind: 'fact' };
    const mTier = M().tier;
    if (op === 'm') {
      q.answer = a * b; q.text = `${a} × ${b} = ?`;
      if (!opts.noWord && !opts.quick && mTier >= 3 && Math.random() < 0.14) { q.kind = 'word'; q.text = GL.pick(WORD_M)(a, b); q.short = `${a} × ${b}`; }
    } else {
      const c = a * b; q.answer = a;
      q.text = `${c} ÷ ${b} = ?`;
      if (!opts.quick && mTier >= 3 && Math.random() < 0.25) { q.kind = 'missing'; q.text = `${b} × ? = ${c}`; }
      else if (!opts.noWord && !opts.quick && mTier >= 3 && Math.random() < 0.14) { q.kind = 'word'; q.text = GL.pick(WORD_D)(c, b); q.short = `${c} ÷ ${b}`; }
    }
    q.full = op === 'm' ? `${a} × ${b} = ${a * b}` : `${a * b} ÷ ${b} = ${a}`;
    q.how = Q.how(op, a, b); q.hint = Q.hint(op, a, b);
    q.fastMs = q.kind === 'word' ? 10000 : 3000;
    q.ringMs = q.kind === 'word' ? 22000 : 8000;
    q.scaffold = !!M().scaffold;
    return q;
  };

  Q.record = function (q, correct, ms, usedHint) {
    const m = M(), d = GL.today();
    const f = m.facts[q.key] = m.facts[q.key] || { n: 0, ok: 0, miss: 0, ms: 0, streak: 0 };
    f.n++; f.ms += Math.min(ms, 30000); f.last = correct ? 1 : 0; f.t = Date.now();
    if (correct) { f.ok++; f.streak++; if (ms < 4000) f.fast = (f.fast || 0) + 1; } else { f.miss++; f.streak = 0; }
    if (correct) m.deck = m.deck.filter(k => k !== q.key); // no-repeat deck
    else if (!m.due.some(x => x.key === q.key)) m.due.push({ key: q.key, wait: 2 });
    const delta = !correct ? -5 : usedHint ? 1 : ms <= q.fastMs ? 6 : 4;
    const skills = Q.skillsOf(q.key); if (q.kind === 'word') skills.push('word'); if (q.kind === 'missing') skills.push('missing');
    for (const s of skills) {
      m.mastery[s] = GL.clamp((m.mastery[s] == null ? 30 : m.mastery[s]) + delta, 0, 100);
      if (m.mastery[s] >= 85) { const sd = m.starDays[s] = m.starDays[s] || []; if (!sd.includes(d)) sd.push(d); }
    }
    // Brain Meter
    if (correct) { m.right++; m.wrong = 0; m.scaffold = false; if (m.right >= 3) { m.right = 0; if (m.tier < GL.S.settings.maxTier) m.tier++; } }
    else { m.wrong++; m.right = 0; if (m.wrong >= 2) { m.wrong = 0; m.tier = Math.max(1, m.tier - 1); m.scaffold = true; } }
    const day = m.days[d] = m.days[d] || { n: 0, ok: 0, ms: 0 }; day.n++; if (correct) day.ok++; day.ms += Math.min(ms, 30000);
    m.log.unshift({ q: q.kind === 'word' ? q.short : q.text.replace(' = ?', ''), a: q.answer, ok: correct ? 1 : 0, ms: Math.round(ms), t: Date.now() });
    if (m.log.length > 50) m.log.length = 50;
    if (correct) {
      GL.S.stats.correct++;
      if (!GL.noTokenProgress) m.tokenProgress++;
      if (m.tokenProgress >= 5) { m.tokenProgress = 0; GL.S.tokens++; GL.toast && GL.toast('🎟️ +1 Arcade Token for 5 correct answers!'); }
    }
  };

  Q.factMastered = key => { const f = M().facts[key]; return !!f && f.last === 1 && (f.ok >= 2 || (f.fast && !f.miss)); };
  Q.summary = function () {
    const m = M();
    let answered = 0, mastered = 0;
    for (const k of ALL) { const f = m.facts[k]; if (f && f.ok) answered++; if (Q.factMastered(k)) mastered++; }
    const weak = Object.entries(m.facts).filter(([, f]) => f.miss > 0)
      .map(([k, f]) => ({ k, f, rate: f.miss / f.n })).sort((x, y) => y.rate - x.rate || y.f.miss - x.f.miss).slice(0, 10);
    return { total: ALL.length, answered, mastered, weak, remaining: m.deck.length, cycle: m.cycle, tier: m.tier };
  };
  Q.label = key => { const { op, a, b } = Q.parse(key); return op === 'm' ? `${a} × ${b}` : `${a * b} ÷ ${b}`; };
  return Q;
})();
