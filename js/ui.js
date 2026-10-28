/* DOM UI: dialog, choices, toasts, modals, numpad question widget */
'use strict';
(function () {
  const h = GL.h;
  GL.$ = sel => document.querySelector(sel);
  GL.layer = () => GL.$('#ui');
  GL.uiBusy = 0; // >0 while a modal/dialog is open (freezes overworld input)

  GL.toast = function (msg, ms = 2400) {
    const box = GL.$('#toasts'); if (!box) return;
    const last = box.lastElementChild; if (last && last.textContent === String(msg) && !last.classList.contains('out')) return;
    while (box.children.length >= 3) box.firstElementChild.remove();
    const t = h('div', { class: 'toast' }, msg); box.appendChild(t);
    setTimeout(() => t.classList.add('out'), ms); setTimeout(() => t.remove(), ms + 400);
  };

  /* Dialog: lines = string | string[]; opts {name, portrait, sheet} */
  GL.dialog = function (lines, opts = {}) {
    if (typeof lines === 'string') lines = [lines];
    GL.uiBusy++;
    return new Promise(resolve => {
      let i = 0, typing = null, full = '';
      const textEl = h('div', { class: 'dlg-text' });
      const port = opts.portrait ? h('div', { class: 'dlg-portrait' }, h('img', { src: GL.A + 'characters/' + opts.portrait + '.png', alt: '' })) :
        opts.sheet ? h('div', { class: 'dlg-portrait sheet', style: { backgroundImage: `url(${GL.A}characters/${opts.sheet}.png)` } }) :
        opts.mon ? h('div', { class: 'dlg-portrait' }, GL.monIconEl(opts.mon, 80)) : null;
      const box = h('div', { class: 'dialog' + (port ? ' has-portrait' : '') },
        port, h('div', { class: 'dlg-body' }, opts.name ? h('div', { class: 'dlg-name' }, opts.name) : null, textEl),
        h('img', { class: 'dlg-next', src: GL.A + 'ui/dialog_next.png', alt: '' }));
      const wrap = h('div', { class: 'dialog-wrap' }, box);
      GL.layer().appendChild(wrap);
      const show = () => {
        full = lines[i]; let n = 0; textEl.textContent = '';
        clearInterval(typing);
        typing = setInterval(() => { n += 2; textEl.textContent = full.slice(0, n); if (n % 6 === 0) GL.sfx('talk'); if (n >= full.length) { clearInterval(typing); typing = null; } }, 22);
      };
      const adv = () => {
        if (typing) { clearInterval(typing); typing = null; textEl.textContent = full; return; }
        i++;
        if (i >= lines.length) { off(); wrap.remove(); GL.uiBusy--; GL.input.clear(); resolve(); return; }
        GL.sfx('tap'); show();
      };
      wrap.addEventListener('click', adv);
      const off = GL.input.onKey(e => { if (['Enter', 'Space', 'KeyZ', 'KeyX', 'Escape'].includes(e.code)) { adv(); return true; } });
      show();
    });
  };

  /* Choice: returns index (or -1 if cancelled and cancel allowed) */
  GL.choice = function (prompt, options, opts = {}) {
    GL.uiBusy++;
    return new Promise(resolve => {
      const done = i => { off(); wrap.remove(); GL.uiBusy--; GL.input.clear(); resolve(i); };
      const list = h('div', { class: 'choice-list' }, options.map((o, i) => h('button', { class: 'btn choice-btn' + (o.cls ? ' ' + o.cls : ''), ontap: () => { GL.sfx('tap'); done(i); }, disabled: o.disabled }, o.label || o)));
      const wrap = h('div', { class: 'choice-wrap' },
        h('div', { class: 'panel choice-panel' }, opts.name ? h('div', { class: 'dlg-name' }, opts.name) : null,
          prompt ? h('div', { class: 'choice-prompt' }, prompt) : null, list,
          opts.cancel !== false ? h('button', { class: 'btn btn-ghost', ontap: () => done(-1) }, 'Never mind') : null));
      GL.layer().appendChild(wrap);
      let focus = 0; const btns = list.querySelectorAll('button'); btns[0] && btns[0].classList.add('kfocus');
      const off = GL.input.onKey(e => {
        if (e.code === 'ArrowDown' || e.code === 'KeyS') { btns[focus].classList.remove('kfocus'); focus = (focus + 1) % btns.length; btns[focus].classList.add('kfocus'); return true; }
        if (e.code === 'ArrowUp' || e.code === 'KeyW') { btns[focus].classList.remove('kfocus'); focus = (focus + btns.length - 1) % btns.length; btns[focus].classList.add('kfocus'); return true; }
        if (e.code === 'Enter' || e.code === 'Space') { if (!btns[focus].disabled) done(focus); return true; }
        if (e.code === 'Escape' && opts.cancel !== false) { done(-1); return true; }
        return true;
      });
    });
  };

  /* Modal panel. Returns {el, close, body}. */
  GL.modal = function (title, body, opts = {}) {
    GL.uiBusy++;
    let closed = false;
    const close = () => { if (closed) return; closed = true; off(); wrap.remove(); GL.uiBusy--; GL.input.clear(); opts.onClose && opts.onClose(); };
    const bodyEl = h('div', { class: 'modal-body' }, body);
    const panel = h('div', { class: 'panel modal' + (opts.cls ? ' ' + opts.cls : '') },
      h('div', { class: 'modal-head' }, h('div', { class: 'modal-title' }, title),
        opts.noClose ? null : h('button', { class: 'btn btn-close', 'aria-label': 'Close', ontap: () => { GL.sfx('tap'); close(); } }, '✕')),
      bodyEl);
    const wrap = h('div', { class: 'modal-wrap' }, panel);
    GL.layer().appendChild(wrap);
    const off = GL.input.onKey(e => { if (e.code === 'Escape' && !opts.noClose) { close(); return true; } if (opts.keys) return opts.keys(e); return false; });
    return { el: wrap, body: bodyEl, close, set(content) { bodyEl.innerHTML = ''; bodyEl.appendChild(content); } };
  };
  GL.confirm = async function (msg, yes = 'Yes', no = 'No') { return (await GL.choice(msg, [yes, no], { cancel: false })) === 0; };

  /* ============== Question widget ==============
     GL.askQuestion(q, {mount, title, timer:true, ringMs, block:false, label, allowHint})
     resolves {correct, ms, value, usedHint, fast, slow} */
  GL.askQuestion = function (q, opts = {}) {
    return new Promise(resolve => {
      const S = GL.S, set = S.settings;
      const ringMs = opts.ringMs || q.ringMs || 8000;
      const fastMs = opts.fastMs || q.fastMs || 3000;
      const useTimer = set.timer !== false && opts.timer !== false;
      let val = '', done = false, usedHint = false, t0 = performance.now(), raf = 0;
      const display = h('div', { class: 'q-answer' }, '\u00a0');
      const ringArc = useTimer ? (() => {
        const ns = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(ns, 'svg'); svg.setAttribute('viewBox', '0 0 100 100'); svg.setAttribute('class', 'q-ring-svg');
        const bgc = document.createElementNS(ns, 'circle'); bgc.setAttribute('cx', 50); bgc.setAttribute('cy', 50); bgc.setAttribute('r', 42); bgc.setAttribute('class', 'ring-bg');
        const c = document.createElementNS(ns, 'circle'); c.setAttribute('cx', 50); c.setAttribute('cy', 50); c.setAttribute('r', 42); c.setAttribute('class', 'ring-fg');
        c.setAttribute('stroke-dasharray', String(2 * Math.PI * 42)); svg.append(bgc, c); return { svg, c };
      })() : null;
      const ring = useTimer ? h('div', { class: 'q-ring' }, h('img', { src: GL.A + 'ui/power_ring.png', alt: '' }), ringArc.svg, h('div', { class: 'q-ring-label' }, '⚡')) : null;
      const hintEl = h('div', { class: 'q-hint' + (q.scaffold ? ' show' : '') }, q.scaffold ? '💡 ' + q.hint : '');
      const readBtn = h('button', { class: 'btn btn-mini', 'aria-label': 'Read aloud', ontap: () => GL.speak(q.text) }, '🔊');
      const hintBtn = (opts.allowHint !== false && !q.scaffold) ? h('button', { class: 'btn btn-mini', ontap: () => {
        if (usedHint) return;
        if ((S.bag.hint_lens || 0) <= 0) { GL.toast('No Hint Lenses left. Buy them at Tally Mart!'); return; }
        S.bag.hint_lens--; usedHint = true; hintEl.textContent = '💡 ' + q.hint; hintEl.classList.add('show'); hintBtn.textContent = '💡 ' + S.bag.hint_lens;
      } }, '💡 ' + (S.bag.hint_lens || 0)) : null;
      const bubble = h('div', { class: 'q-bubble' + (q.kind === 'word' ? ' word' : '') + (opts.block ? ' block' : '') },
        opts.label ? h('div', { class: 'q-label' }, opts.label) : null,
        h('div', { class: 'q-text' }, q.text),
        hintEl,
        h('div', { class: 'q-tail' }));
      const keys = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '⌫', '0', '✓'];
      const pad = h('div', { class: 'numpad' }, keys.map(k => {
        const b = h('button', { class: 'key' + (k === '✓' ? ' key-go' : k === '⌫' ? ' key-del' : ''), 'data-k': k }, k);
        b.addEventListener('pointerdown', e => { e.preventDefault(); GL.audio.unlock(); press(k); b.classList.add('down'); });
        const up = () => b.classList.remove('down'); b.addEventListener('pointerup', up); b.addEventListener('pointerleave', up); b.addEventListener('pointercancel', up);
        return b;
      }));
      const row = h('div', { class: 'q-row' }, ring, display, h('div', { class: 'q-tools' }, readBtn, hintBtn));
      const root = h('div', { class: 'question' + (opts.block ? ' is-block' : '') }, bubble, row, pad);
      const mount = opts.mount || (() => { const w = h('div', { class: 'q-overlay' }, h('div', { class: 'panel q-overlay-panel' }, opts.title ? h('div', { class: 'modal-title' }, opts.title) : null, root)); GL.layer().appendChild(w); return w; })();
      if (opts.mount) { opts.mount.innerHTML = ''; opts.mount.appendChild(root); } else { GL.uiBusy++; }
      root.dataset.answer = q.answer; // used by automated tests
      if (set.readAloud) GL.speak(q.text);
      function render() { display.textContent = val || '\u00a0'; display.classList.toggle('empty', !val); }
      function press(k) {
        if (done) return;
        if (k === '⌫') { val = val.slice(0, -1); GL.sfx('key'); }
        else if (k === '✓') { if (val !== '') submit(); return; }
        else if (val.length < 3) { val = (val === '0' ? '' : val) + k; GL.sfx('key'); }
        render();
        // auto-submit once the number of digits matches the answer
        if (val.length >= String(q.answer).length && opts.autoSubmit !== false) setTimeout(() => { if (!done && val.length >= String(q.answer).length) submit(); }, 140);
      }
      function submit() {
        if (done) return; done = true; cancelAnimationFrame(raf); off();
        const ms = performance.now() - t0, value = parseInt(val, 10), correct = value === q.answer;
        if (!opts.noRecord && q.key) GL.Q.record(q, correct, ms, usedHint || q.scaffold);
        root.classList.add(correct ? 'right' : 'wrong');
        display.textContent = val; GL.sfx(correct ? 'correct' : 'wrong');
        if (!correct) { bubble.querySelector('.q-text').innerHTML = `<s>${GL.esc(val)}</s> → <b>${q.answer}</b>`; hintEl.textContent = q.how || ''; hintEl.classList.add('show'); }
        const res = { correct, ms, value, usedHint, fast: correct && ms <= fastMs, slow: useTimer && ms > ringMs, q };
        setTimeout(() => { if (!opts.mount) { mount.remove(); GL.uiBusy--; } resolve(res); }, correct ? 380 : (opts.wrongDelay || 1700));
      }
      const off = GL.input.onKey(e => {
        if (/^Digit\d$|^Numpad\d$/.test(e.code)) { press(e.code.slice(-1)); return true; }
        if (e.code === 'Backspace') { press('⌫'); return true; }
        if (e.code === 'Enter' || e.code === 'NumpadEnter') { press('✓'); return true; }
        return false;
      });
      function tick() {
        if (done) return;
        const el = performance.now() - t0;
        if (ringArc) {
          const f = Math.max(0, 1 - el / ringMs); const L = 2 * Math.PI * 42;
          ringArc.c.setAttribute('stroke-dashoffset', String(L * (1 - f)));
          ring.classList.toggle('fast', el <= fastMs); ring.classList.toggle('empty', f <= 0);
        }
        raf = requestAnimationFrame(tick);
      }
      render(); tick();
    });
  };

  /* small helpers for building UI */
  GL.btn = (label, fn, cls = '') => h('button', { class: 'btn ' + cls, ontap: () => { GL.sfx('tap'); fn(); } }, label);
  GL.coinEl = n => h('span', { class: 'cur' }, h('img', { src: GL.A + 'icons/coin.png', alt: 'coins' }), String(n));
  GL.tokenEl = n => h('span', { class: 'cur' }, h('img', { src: GL.A + 'icons/token.png', alt: 'tokens' }), String(n));
  GL.typeBadge = t => h('span', { class: 'type-badge', style: { background: GL.TYPE_COLOR[t] || '#ccc' } }, GL.TYPES.includes(t) ? h('img', { src: GL.A + `icons/type_${t}.png`, alt: '' }) : null, GL.cap(t));
  GL.hpBar = (hp, max) => { const f = Math.max(0, hp / max); return h('div', { class: 'hpbar' }, h('div', { class: 'hpfill ' + (f > .5 ? 'hi' : f > .2 ? 'mid' : 'lo'), style: { width: (f * 100) + '%' } })); };
})();
