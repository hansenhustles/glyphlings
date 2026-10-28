/* Screens & menus: title, avatar creator, starter pick, pause menu, team, bag, journal, map, shops, parent dashboard */
'use strict';
(function () {
  const h = GL.h;
  const M = GL.Menus = {};
  const screen = () => GL.$('#screen');
  function showScreen(el) { const s = screen(); s.innerHTML = ''; s.appendChild(el); s.classList.add('show'); }
  function hideScreen() { const s = screen(); s.classList.remove('show'); s.innerHTML = ''; }

  /* ---------- Title ---------- */
  M.title = function () {
    GL.setScene('title'); GL.HUD.hide();
    const save = GL.loadSave();
    const el = h('div', { class: 'title-screen' },
      h('img', { class: 'title-logo', src: GL.A + 'brand/logo.png', alt: 'Glyphlings: Legends of Numeria' }),
      h('div', { class: 'title-btns' },
        save ? h('button', { class: 'btn btn-green big', id: 'btn-continue', ontap: () => { GL.sfx('tap'); GL.S = save; hideScreen(); GL.startGame(); } },
          '▶ Continue', h('small', null, `${save.player.name} · ${Object.keys(save.journal.caught).length} caught · ${save.badges.length} badge${save.badges.length === 1 ? '' : 's'}`)) : null,
        h('button', { class: 'btn ' + (save ? '' : 'btn-green ') + 'big', id: 'btn-new', ontap: async () => {
          GL.sfx('tap');
          if (save && !(await GL.confirm('Start a new adventure? This replaces your saved game.', 'Start new', 'Keep my save'))) return;
          GL.S = GL.newSave(); M.creator({});
        } }, '✨ New Adventure'),
        h('button', { class: 'btn btn-ghost', id: 'btn-parent', ontap: () => { GL.sfx('tap'); M.parentGate(); } }, '👪 Grown-ups')),
      h('div', { class: 'title-foot' }, 'Tap to play · works offline · v0.1'));
    showScreen(el);
  };

  /* ---------- Avatar creator ---------- */
  M.creator = function (opts = {}) {
    const S = GL.S, look = Object.assign({}, S.player);
    const edit = !!opts.edit;
    const cv = h('canvas', { class: 'avatar-canvas', width: 288, height: 384 });
    let dir = 0, frame = 1, t = 0, raf;
    const sheetOf = () => GL.buildPlayerSheet(look);
    let sheet = sheetOf();
    const redraw = () => { sheet = sheetOf(); };
    const loop = () => {
      t++; if (t % 24 === 0) frame = (frame + 1) % 3;
      const x = cv.getContext('2d'); x.clearRect(0, 0, 288, 384); x.imageSmoothingQuality = 'high';
      x.drawImage(sheet, (frame === 1 ? 1 : frame === 0 ? 0 : 2) * 96, dir * 128, 96, 128, 0, 0, 288, 384);
      raf = requestAnimationFrame(loop);
    };
    const swatches = (items, cur, onPick, render) => h('div', { class: 'swatches' }, items.map((it, i) => {
      const b = h('button', { class: 'swatch' + (cur() === it ? ' on' : ''), 'aria-label': String(it), ontap: () => { GL.sfx('tap'); onPick(it); b.parentNode.querySelectorAll('.swatch').forEach(s => s.classList.remove('on')); b.classList.add('on'); redraw(); } }, render(it, i));
      return b;
    }));
    const owned = (kind, id) => !edit || kind === 'jackets' && (id === S.player.jacket || S.gear.jackets.includes(id)) || kind === 'hats' && (id === null || S.gear.hats.includes(id) || id === S.player.hat);
    const nameIn = h('input', { class: 'name-input', type: 'text', maxlength: 14, value: look.name, 'aria-label': 'Name', autocomplete: 'off', autocapitalize: 'words', spellcheck: 'false' });
    nameIn.addEventListener('input', () => { look.name = nameIn.value.replace(/[^\w \-']/g, '').slice(0, 14); });
    const jackets = edit ? ['red', 'blue', 'green'].filter(j => owned('jackets', j)) : ['red', 'blue', 'green'];
    const hats = edit ? [null, 'cap', 'beanie', 'explorer'].filter(x => owned('hats', x)) : [null, 'cap', 'beanie', 'explorer'];
    const el = h('div', { class: 'creator' },
      h('div', { class: 'creator-preview panel' }, cv,
        h('div', { class: 'row' }, h('button', { class: 'btn btn-mini', 'aria-label': 'Turn left', ontap: () => { dir = [1, 3, 0, 2][dir]; } }, '⟲'),
          h('button', { class: 'btn btn-mini', 'aria-label': 'Turn right', ontap: () => { dir = [2, 0, 3, 1][dir]; } }, '⟳'))),
      h('div', { class: 'creator-opts panel' },
        h('h2', null, edit ? 'Mirror' : 'Create your Ranger'),
        h('label', null, 'Name'), h('div', { class: 'row' }, nameIn, h('button', { class: 'btn btn-mini', ontap: () => { look.name = GL.pick(GL.FUN_NAMES).slice(0, 14); nameIn.value = look.name; } }, '🎲')),
        h('label', null, 'Skin'), swatches(GL.SKINS, () => look.skin, v => look.skin = v, v => h('span', { class: 'dot', style: { background: GL.SKIN_SWATCH[v] } })),
        h('label', null, 'Hair style'), swatches([1, 2, 3, 4], () => look.hair, v => look.hair = v, v => h('span', { class: 'txt' }, GL.HAIR_NAMES[v - 1])),
        h('label', null, 'Hair colour'), swatches([0, 1, 2, 3, 4, 5, 6, 7], () => look.hairColor, v => look.hairColor = v, v => h('span', { class: 'dot', style: { background: GL.HAIR_COLORS[v] } })),
        h('label', null, 'Jacket'), swatches(jackets, () => look.jacket, v => look.jacket = v, v => h('span', { class: 'dot', style: { background: { red: '#E04A3A', blue: '#3A7BE0', green: '#3FAE5A' }[v] } })),
        h('label', null, 'Hat'), swatches(hats, () => look.hat, v => look.hat = v, v => h('span', { class: 'txt' }, v ? GL.cap(v) : 'None')),
        edit ? h('p', { class: 'small' }, 'Buy more hats and jackets at the Threadsmith!') : null,
        h('div', { class: 'row end' },
          edit ? GL.btn('Cancel', () => { cancelAnimationFrame(raf); hideScreen(); GL.uiBusy--; }, 'btn-ghost') : GL.btn('← Back', () => { cancelAnimationFrame(raf); M.title(); }, 'btn-ghost'),
          h('button', { class: 'btn btn-green big', id: 'btn-creator-done', ontap: () => {
            GL.sfx('tap'); look.name = (look.name || '').trim() || 'Ranger';
            cancelAnimationFrame(raf);
            if (!edit && !S.gear.jackets.includes(look.jacket)) S.gear.jackets.push(look.jacket);
            if (!edit && look.hat && !S.gear.hats.includes(look.hat)) S.gear.hats.push(look.hat);
            S.player = look; GL.World.refreshLook && GL.World.refreshLook();
            if (edit) { hideScreen(); GL.uiBusy--; GL.save(); return; }
            M.professorIntro();
          } }, edit ? 'Looks great!' : 'Next →'))));
    if (edit) GL.uiBusy++;
    showScreen(el); loop();
  };

  /* ---------- Professor intro + starter ---------- */
  M.professorIntro = async function () {
    hideScreen();
    GL.setScene('title');
    const S = GL.S, o = { name: 'Professor Abacus', portrait: 'portrait_professor' };
    await GL.dialog([`Welcome to Numeria, ${S.player.name}! I'm Professor Abacus.`,
      'Glyphlings are creatures made of living numbers. They grow stronger when YOU solve math!',
      'In battle, every move needs a correct answer. Fast answers hit harder, and streaks power you up.',
      'Every Ranger needs a partner. Choose one!'], o);
    M.starter();
  };
  M.starter = function () {
    const S = GL.S;
    const cards = GL.STARTERS.map(id => {
      const sp = GL.SPECIES[id];
      return h('button', { class: 'starter-card panel t-' + sp.type, id: 'starter-' + id, ontap: async () => {
        GL.sfx('tap');
        const ok = await GL.confirm(`Choose ${sp.name}, the ${GL.cap(sp.type)} Glyphling?`, `Yes, ${sp.name}!`, 'Look again');
        if (!ok) return;
        const m = GL.makeMon(id, 5); S.team = [m]; GL.markCaught(id); S.flags.starter = id;
        hideScreen(); GL.sfx('caught');
        await GL.dialog([`${sp.name} is so happy to meet you!`, 'Here are 5 Glyph Prisms, 3 Berry Tonics and 2 Hint Lenses.', 'Tall grass to the north is full of wild Glyphlings. Weaken one below half health, then use a Prism!', 'When you are ready, Warden Mira waits in the Proof Hall. Good luck!'], { name: 'Professor Abacus', portrait: 'portrait_professor' });
        GL.startGame(true);
      } },
        h('img', { class: 'starter-img', src: GL.A + `monsters/${id}_front.png`, alt: sp.name }),
        h('div', { class: 'starter-name' }, sp.name), GL.typeBadge(sp.type), h('p', { class: 'small' }, sp.desc));
    });
    showScreen(h('div', { class: 'starter-screen' }, h('h2', { class: 'screen-title' }, 'Choose your partner!'), h('div', { class: 'starter-cards' }, cards)));
  };

  /* ---------- Pause menu ---------- */
  M.main = function () {
    if (GL.uiBusy > 0) return;
    const icons = GL.A + 'ui/menu_icons.png';
    const item = (i, label, fn, id) => h('button', { class: 'btn menu-item', id, ontap: () => { GL.sfx('tap'); md.close(); fn(); } }, h('span', { class: 'mi', style: { backgroundImage: `url(${icons})`, backgroundPosition: `${i * 20}% 0`, backgroundSize: '600% 100%' } }), label);
    const S = GL.S;
    const md = GL.modal(S.player.name + "'s Menu", h('div', { class: 'menu-grid' },
      item(0, 'Team', () => M.team({}), 'm-team'), item(1, 'Bag', () => M.bag(), 'm-bag'), item(2, 'Journal', () => M.journal(), 'm-journal'),
      item(3, 'Map', () => M.map(), 'm-map'), item(4, 'Save', () => { GL.save(true); GL.toast('💾 Game saved!'); }, 'm-save'), item(5, 'Settings', () => M.settings(), 'm-settings')),
      { cls: 'modal-menu' });
    md.body.append(h('div', { class: 'menu-foot' }, GL.coinEl(S.coins), GL.tokenEl(S.tokens), h('span', { class: 'cur' }, h('img', { src: GL.A + 'icons/star_shard.png', alt: '' }), String(S.shards)),
      S.badges.includes('meadow') ? h('img', { class: 'badge-sm', src: GL.A + 'icons/badge_meadow.png', alt: 'Meadow Badge' }) : null));
  };

  /* ---------- Team / garden ---------- */
  M.team = function (opts = {}) {
    const S = GL.S;
    const render = () => {
      const list = h('div', { class: 'team-list' }, S.team.map((m, i) => monCard(m, i)));
      const wrap = h('div', null, list);
      if (opts.garden) {
        wrap.append(h('h3', null, `Garden (${S.garden.length})`), S.garden.length ? h('div', { class: 'garden-list' }, S.garden.map((m, i) => h('button', { class: 'btn garden-mon', ontap: () => {
          if (S.team.length < GL.TEAM_MAX) { S.team.push(S.garden.splice(i, 1)[0]); GL.healMon(S.team[S.team.length - 1]); }
          else GL.toast('Team is full. Move someone to the Garden first.');
          md.set(render()); GL.HUD.update();
        } }, GL.monIconEl(m.species, 48), h('span', null, GL.monName(m) + ' Lv' + m.level)))) : h('p', { class: 'small' }, 'Extra Glyphlings you catch live here.'));
      }
      return wrap;
    };
    const monCard = (m, i) => {
      const st = GL.statsOf(m), sp = GL.SPECIES[m.species];
      return h('div', { class: 'mon-card panel' + (m.hp <= 0 ? ' fainted' : '') },
        GL.monIconEl(m.species, 64),
        h('div', { class: 'mc-main' },
          h('div', { class: 'mc-name' }, GL.monName(m), h('span', { class: 'b-lv' }, ' Lv ' + m.level), i === 0 ? h('span', { class: 'lead' }, 'Lead') : null),
          h('div', { class: 'row' }, GL.typeBadge(sp.type), GL.hpBar(m.hp, st.maxhp), h('span', { class: 'small' }, `${m.hp}/${st.maxhp}`)),
          h('div', { class: 'small' }, `XP ${m.xp}/${GL.xpNeed(m.level)} · ATK ${st.atk} · DEF ${st.def} · SPD ${st.spd}`),
          h('div', { class: 'mc-moves' }, m.moves.map(id => h('span', { class: 'mv-chip', style: { background: GL.TYPE_COLOR[GL.MOVES[id].type] } }, GL.MOVES[id].name))),
          sp.evo ? h('div', { class: 'small' }, m.level >= sp.evo.level ? '✨ Ready to evolve after the next battle!' : `Evolves at Lv ${sp.evo.level} (Proof Spark)`) : null),
        h('div', { class: 'mc-btns' },
          i > 0 ? GL.btn('Lead', () => { S.team.unshift(S.team.splice(i, 1)[0]); md.set(render()); GL.HUD.update(); }, 'btn-mini') : null,
          (S.bag.berry_tonic > 0 && m.hp > 0 && m.hp < st.maxhp) ? GL.btn('🍓 Tonic', () => { S.bag.berry_tonic--; m.hp = Math.min(st.maxhp, m.hp + 30); GL.sfx('heal'); md.set(render()); GL.HUD.update(); }, 'btn-mini') : null,
          (S.bag.revive_feather > 0 && m.hp <= 0) ? GL.btn('🪶 Revive', () => { S.bag.revive_feather--; m.hp = Math.floor(st.maxhp / 2); GL.sfx('heal'); md.set(render()); GL.HUD.update(); }, 'btn-mini') : null,
          opts.garden && S.team.length > 1 ? GL.btn('→ Garden', () => { S.garden.push(S.team.splice(i, 1)[0]); md.set(render()); GL.HUD.update(); }, 'btn-mini') : null));
    };
    const md = GL.modal(opts.garden ? 'Team & Garden' : `Team (${S.team.length}/${GL.TEAM_MAX})`, render(), { cls: 'modal-wide' });
  };

  /* ---------- Bag ---------- */
  M.bag = function () {
    const S = GL.S;
    const md = GL.modal('Bag', h('div', { class: 'bag-list' }, Object.keys(GL.ITEMS).map(id => {
      const it = GL.ITEMS[id];
      return h('div', { class: 'bag-row' }, h('img', { src: GL.A + it.icon + '.png', alt: '' }), h('div', { class: 'grow' }, h('b', null, it.name), h('div', { class: 'small' }, it.desc)), h('span', { class: 'cnt' }, '×' + (S.bag[id] || 0)));
    }), h('div', { class: 'bag-row' }, h('img', { src: GL.A + 'icons/star_shard.png', alt: '' }), h('div', { class: 'grow' }, h('b', null, 'Star Shards'), h('div', { class: 'small' }, 'Rare reward from Wardens. Keep them safe!')), h('span', { class: 'cnt' }, '×' + S.shards))));
  };

  /* ---------- Journal ---------- */
  M.journal = function () {
    const S = GL.S, J = S.journal;
    const n = Object.keys(J.caught).length;
    const grid = h('div', { class: 'journal-grid' }, GL.JOURNAL_ORDER.map((id, i) => {
      const sp = GL.SPECIES[id], seen = J.seen[id], caught = J.caught[id];
      return h('button', { class: 'btn journal-cell' + (caught ? ' caught' : seen ? ' seen' : ''), ontap: () => { if (seen) detail(id); } },
        h('span', { class: 'jn' }, '#' + String(i + 1).padStart(2, '0')),
        seen ? GL.monIconEl(id, 56) : h('span', { class: 'unknown' }, '?'),
        h('span', { class: 'jname' }, seen ? sp.name : '???'), caught ? h('img', { class: 'jc', src: GL.A + 'icons/item_prism.png', alt: 'caught' }) : null);
    }));
    const md = GL.modal(`Field Journal · ${n} caught`, grid, { cls: 'modal-wide' });
    function detail(id) {
      const sp = GL.SPECIES[id], caught = J.caught[id];
      const im = h('img', { class: 'jd-img', src: GL.A + `monsters/${sp.art}_front.png`, alt: sp.name, style: sp.evolved ? { filter: 'saturate(1.4) hue-rotate(-8deg) drop-shadow(0 0 10px #FFC93C)', transform: 'scale(1.1)' } : null });
      GL.modal(sp.name, h('div', { class: 'jdetail' }, im, h('div', null, GL.typeBadge(sp.type), h('span', { class: 'small' }, ' ' + GL.cap(sp.rarity)),
        h('p', null, caught ? sp.desc : 'Seen in the wild. Catch one to learn more!'),
        caught ? h('p', { class: 'small' }, `Height ${sp.height} · Weight ${sp.weight}`) : null,
        caught ? h('p', { class: 'fact' }, '🧮 Number fact: ' + sp.fact) : null,
        sp.evolved ? h('p', { class: 'small' }, '(Evolved-form artwork coming soon.)') : null)));
    }
  };

  /* ---------- Map ---------- */
  M.map = function () {
    const cv = h('canvas', { class: 'map-canvas' });
    const m = GL.World.map, S = GL.S;
    const md = GL.modal('Map: ' + m.name, h('div', { class: 'map-wrap' }, cv, h('p', { class: 'small' }, 'Tallyton ⇄ Sumberry Meadows (north). Proof Hall is in the north-east of the Meadows.')), { cls: 'modal-wide' });
    const sc = 10, dpr = GL.dpr; cv.width = m.w * sc * dpr; cv.height = m.h * sc * dpr; cv.style.width = m.w * sc + 'px'; cv.style.maxWidth = '100%';
    const x = cv.getContext('2d'); x.scale(dpr, dpr);
    for (let yy = 0; yy < m.h; yy++) for (let xx = 0; xx < m.w; xx++) {
      const g = m.ground[yy][xx][1];
      x.fillStyle = m.water[yy][xx] ? '#2EB8D6' : m.grass[yy][xx] ? '#2E8B57' : /path|cobble/.test(g) ? '#E8C98A' : /floor/.test(g) ? '#C7A27A' : /wall/.test(g) ? '#6B4E8C' : '#7CCF5A';
      x.fillRect(xx * sc, yy * sc, sc, sc);
    }
    for (const ob of m.objects) { if (ob.flat) continue; x.fillStyle = /tree|bush/.test(ob.tile) ? '#1F6B3A' : /house|lab|center|mart|arcade|hall/.test(ob.tile) ? '#C8553D' : '#8a7f6b'; x.fillRect(ob.x * sc, ob.y * sc, ob.w * sc, ob.h * sc); }
    for (const n of m.npcs) { x.fillStyle = n.trainer && !S.trainers[n.trainer] ? '#FF6B3D' : '#FFE14D'; x.beginPath(); x.arc((n.cx + .5) * sc, (n.cy + .5) * sc, sc * 0.45, 0, 7); x.fill(); }
    x.fillStyle = '#fff'; x.strokeStyle = '#2B2140'; x.lineWidth = 2; x.beginPath(); x.arc((GL.World.p.x + .5) * sc, (GL.World.p.y + .5) * sc, sc * 0.6, 0, 7); x.fill(); x.stroke();
  };

  /* ---------- Type chart ---------- */
  M.typeChart = function () {
    const T = GL.TYPES;
    const table = h('table', { class: 'type-table' },
      h('tr', null, h('th', null, 'ATK → DEF'), T.map(t => h('th', null, h('img', { src: GL.A + `icons/type_${t}.png`, alt: t, title: t })))),
      T.map(a => h('tr', null, h('th', null, GL.typeBadge(a)), T.map(d => { const v = GL.CHART[a][d]; return h('td', { class: v > 1 ? 'sup' : v < 1 ? 'weak' : '' }, v > 1 ? '×2' : v < 1 ? '×½' : ''); }))));
    GL.modal('Type Matchups', h('div', null, table, h('p', { class: 'small' }, '▲ on a move button means super effective (×2). ▼ means not very effective (×½).')), { cls: 'modal-wide' });
  };

  /* ---------- Settings (kid-facing) ---------- */
  M.settings = function () {
    const S = GL.S, st = S.settings;
    const tog = (key, label) => { const b = h('button', { class: 'btn toggle' + (st[key] ? ' on' : ''), ontap: () => { st[key] = !st[key]; b.classList.toggle('on', st[key]); b.lastChild.textContent = st[key] ? 'On' : 'Off'; GL.audio.setVolume(); GL.save(); } }, label + ': ', h('b', null, st[key] ? 'On' : 'Off')); return b; };
    const md = GL.modal('Settings', h('div', { class: 'settings' },
      tog('sound', '🔊 Sound'), tog('readAloud', '🗣️ Read questions aloud'),
      h('button', { class: 'btn', ontap: () => { md.close(); M.creator({ edit: true }); } }, '🪞 Change my look'),
      h('button', { class: 'btn', ontap: () => { md.close(); M.typeChart(); } }, '📊 Type chart'),
      h('button', { class: 'btn btn-ghost', ontap: () => { md.close(); M.parentGate(); } }, '👪 Grown-ups area'),
      h('button', { class: 'btn btn-ghost', ontap: async () => { md.close(); GL.save(true); M.title(); } }, '🏠 Save & go to title')));
  };

  /* ---------- Shops ---------- */
  M.shop = function () {
    const S = GL.S;
    const render = () => h('div', { class: 'shop' },
      h('div', { class: 'wallet' }, GL.coinEl(S.coins)),
      GL.SHOP_ITEMS.map(id => {
        const it = GL.ITEMS[id];
        return h('div', { class: 'shop-row' }, h('img', { src: GL.A + it.icon + '.png', alt: '' }),
          h('div', { class: 'grow' }, h('b', null, it.name), h('div', { class: 'small' }, it.desc + ` (you have ${S.bag[id] || 0})`)),
          h('button', { class: 'btn btn-green buy', 'data-item': id, disabled: S.coins < it.price, ontap: () => buy(id) }, GL.coinEl(it.price)));
      }));
    const buy = async id => {
      const it = GL.ITEMS[id]; if (S.coins < it.price) return;
      S.coins -= it.price; S.bag[id] = (S.bag[id] || 0) + 1; GL.sfx('coin'); GL.HUD.update(); md.set(render()); GL.save();
    };
    const md = GL.modal('Tally Mart', render(), { cls: 'modal-wide' });
  };
  M.gear = function () {
    const S = GL.S;
    const render = () => h('div', { class: 'shop' },
      h('div', { class: 'wallet' }, GL.coinEl(S.coins)),
      h('p', { class: 'small' }, 'The Threadsmith stitches Ranger gear. Wear it from the mirror at Home, or right here.'),
      [['hats', GL.GEAR.hats], ['jackets', GL.GEAR.jackets]].map(([kind, list]) => list.map(g => {
        const own = S.gear[kind].includes(g.id), wearing = kind === 'hats' ? S.player.hat === g.id : S.player.jacket === g.id;
        const preview = Object.assign({}, S.player, kind === 'hats' ? { hat: g.id } : { jacket: g.id });
        const cv = GL.buildPlayerSheet(preview); const c2 = h('canvas', { class: 'gear-prev', width: 96, height: 128 }); c2.getContext('2d').drawImage(cv, 96, 0, 96, 128, 0, 0, 96, 128);
        return h('div', { class: 'shop-row' }, c2, h('div', { class: 'grow' }, h('b', null, g.name), h('div', { class: 'small' }, own ? (wearing ? 'Wearing' : 'Owned') : '')),
          own ? (wearing ? (kind === 'hats' ? GL.btn('Take off', () => { S.player.hat = null; GL.World.refreshLook(); md.set(render()); }, 'btn-mini') : h('span', { class: 'small' }, '✔'))
            : GL.btn('Wear', () => { if (kind === 'hats') S.player.hat = g.id; else S.player.jacket = g.id; GL.World.refreshLook(); GL.save(); md.set(render()); }, 'btn-mini'))
            : h('button', { class: 'btn btn-green buy', disabled: S.coins < g.price, ontap: () => { S.coins -= g.price; S.gear[kind].push(g.id); GL.sfx('coin'); GL.HUD.update(); GL.save(); md.set(render()); } }, GL.coinEl(g.price)));
      })));
    const md = GL.modal('Threadsmith', render(), { cls: 'modal-wide' });
  };

  /* ---------- Parent gate + dashboard ---------- */
  M.parentGate = async function () {
    const a = GL.randi(6, 9), b = GL.randi(6, 9), c = GL.randi(11, 29);
    const ans = a * b + c;
    const input = h('input', { class: 'name-input', type: 'text', inputmode: 'numeric', pattern: '[0-9]*', 'aria-label': 'Answer', id: 'gate-input', autocomplete: 'off' });
    const err = h('p', { class: 'small warn' }, '');
    const md = GL.modal('Grown-ups only', h('div', { class: 'gate' },
      h('p', null, 'Please solve to continue:'), h('div', { class: 'gate-q' }, `${a} × ${b} + ${c} = ?`), input, err,
      h('button', { class: 'btn btn-green big', id: 'gate-go', ontap: () => {
        if (parseInt(input.value, 10) === ans) { md.close(); M.dashboard(); } else { err.textContent = 'Not quite. Try again.'; input.value = ''; }
      } }, 'Enter')));
    md.el.dataset.answer = ans;
    setTimeout(() => input.focus(), 50);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') md.body.querySelector('#gate-go').click(); });
  };
  M.dashboard = function () {
    const S = GL.S || GL.loadSave();
    if (!S) { GL.modal('Parent Dashboard', h('p', null, 'No save yet. Start an adventure first!')); return; }
    if (!GL.S) GL.S = S;
    const Mth = S.math, sum = GL.Q.summary();
    const days = Object.entries(Mth.days).sort().slice(-7);
    const totalN = Object.values(Mth.days).reduce((a, d) => a + d.n, 0), totalOk = Object.values(Mth.days).reduce((a, d) => a + d.ok, 0);
    const acc = totalN ? Math.round(totalOk / totalN * 100) : 0;
    const avgMs = totalN ? Object.values(Mth.days).reduce((a, d) => a + d.ms, 0) / totalN : 0;
    const tabs = ['Overview', 'Facts map', 'Weak spots', 'Recent', 'Settings'];
    let tab = 0;
    const body = h('div', { class: 'dash-body' });
    const tabBar = h('div', { class: 'tabs' }, tabs.map((t, i) => h('button', { class: 'btn tab' + (i === 0 ? ' on' : ''), ontap: () => { tab = i; tabBar.querySelectorAll('.tab').forEach((b, j) => b.classList.toggle('on', j === i)); draw(); } }, t)));
    const md = GL.modal('Parent Dashboard', h('div', { class: 'dash' }, tabBar, body), { cls: 'modal-wide modal-dash' });
    function stat(label, value, sub) { return h('div', { class: 'stat panel' }, h('div', { class: 'stat-v' }, value), h('div', { class: 'stat-l' }, label), sub ? h('div', { class: 'small' }, sub) : null); }
    function skillBar(sk, label) {
      const v = Mth.mastery[sk]; const stars = (Mth.starDays[sk] || []).length >= 2;
      return h('div', { class: 'skill' }, h('span', { class: 'sk-l' }, label), h('div', { class: 'sk-bar' }, h('div', { class: 'sk-fill', style: { width: (v || 0) + '%', background: v == null ? '#ddd' : v >= 85 ? '#2E8B57' : v >= 60 ? '#6BD45B' : v >= 35 ? '#FFC93C' : '#FF6B3D' } })), h('span', { class: 'sk-v' }, v == null ? '–' : Math.round(v) + (stars ? ' ⭐' : '')));
    }
    function draw() {
      body.innerHTML = '';
      if (tab === 0) {
        body.append(h('div', { class: 'stats' },
          stat('Facts mastered', `${sum.mastered} / ${sum.total}`, 'correct on last try and correct twice (or fast)'),
          stat('Accuracy', acc + '%', `${totalOk} of ${totalN} answers`),
          stat('Avg time', (avgMs / 1000).toFixed(1) + 's', 'per question'),
          stat('Current level', 'Tier ' + sum.tier, ['', 'Easy (×0,1,2)', '×2,5,10', '×3,4,5', '×6–9', '×11,12'][sum.tier]),
          stat('Deck progress', `${sum.total - sum.remaining} / ${sum.total}`, `Cycle ${sum.cycle}: no fact repeats until all are answered correctly`),
          stat('Play', `${S.stats.battles} battles`, `${S.stats.captures} catches · ${S.badges.length} badge`)),
          h('h3', null, 'Last 7 days'),
          days.length ? h('div', { class: 'days' }, days.map(([d, v]) => h('div', { class: 'day' }, h('div', { class: 'day-bar', style: { height: Math.min(100, v.n * 2) + 'px' } }, h('div', { class: 'day-ok', style: { height: (v.ok / v.n * 100) + '%' } })), h('span', null, d.slice(5)), h('span', { class: 'small' }, v.n + 'q')))) : h('p', { class: 'small' }, 'No answers yet.'),
          h('h3', null, 'Multiplication mastery'), h('div', { class: 'skills' }, Array.from({ length: 13 }, (_, i) => skillBar('mul.' + i, '×' + i))),
          h('h3', null, 'Division mastery'), h('div', { class: 'skills' }, Array.from({ length: 12 }, (_, i) => skillBar('div.' + (i + 1), '÷' + (i + 1)))),
          h('div', { class: 'skills' }, skillBar('word', 'Word'), skillBar('missing', 'Missing #')));
      } else if (tab === 1) {
        const tbl = (op) => h('table', { class: 'heat' },
          h('tr', null, h('th', null, op === 'm' ? '×' : '÷'), Array.from({ length: 13 }, (_, b) => op === 'd' && b === 0 ? null : h('th', null, String(b)))),
          Array.from({ length: 13 }, (_, a) => h('tr', null, h('th', null, String(a)), Array.from({ length: 13 }, (_, b) => {
            if (op === 'd' && b === 0) return null;
            const k = `${op}:${a}:${b}`, f = Mth.facts[k];
            let cls = 'n'; if (f) cls = GL.Q.factMastered(k) ? 'g' : f.miss > f.ok ? 'r' : f.ok ? 'y' : 'r';
            return h('td', { class: cls, title: GL.Q.label(k) + (f ? ` · ${f.ok}/${f.n} correct` : ' · not tried') });
          }))));
        body.append(h('p', { class: 'small' }, '🟩 mastered · 🟨 learning · 🟥 needs practice · ⬜ not tried yet'),
          h('h3', null, 'Multiplication (row × column)'), tbl('m'),
          h('h3', null, 'Division (rows = answer, columns = divisor; e.g. row 7, col 8 = 56 ÷ 8)'), tbl('d'));
      } else if (tab === 2) {
        body.append(sum.weak.length ? h('table', { class: 'list' }, h('tr', null, h('th', null, 'Fact'), h('th', null, 'Misses'), h('th', null, 'Tries'), h('th', null, 'Avg time'), h('th', null, 'Tip')),
          sum.weak.map(w => { const { op, a, b } = GL.Q.parse(w.k); return h('tr', null, h('td', null, h('b', null, GL.Q.label(w.k))), h('td', null, String(w.f.miss)), h('td', null, String(w.f.n)), h('td', null, (w.f.ms / w.f.n / 1000).toFixed(1) + 's'), h('td', { class: 'small' }, GL.Q.how(op, a, b))); }))
          : h('p', null, 'No weak spots yet. 🎉'),
          h('p', { class: 'small' }, 'Missed facts come back 2 questions later (while they are still in the deck) and appear a bit more often until answered correctly.'));
      } else if (tab === 3) {
        body.append(Mth.log.length ? h('table', { class: 'list' }, h('tr', null, h('th', null, 'Question'), h('th', null, 'Answer'), h('th', null, ''), h('th', null, 'Time')),
          Mth.log.map(l => h('tr', { class: l.ok ? '' : 'bad' }, h('td', null, l.q), h('td', null, String(l.a)), h('td', null, l.ok ? '✅' : '❌'), h('td', null, (l.ms / 1000).toFixed(1) + 's')))) : h('p', null, 'No answers yet.'));
      } else {
        const st = S.settings;
        const tog = (key, label, help) => h('div', { class: 'set-row' }, h('div', { class: 'grow' }, h('b', null, label), h('div', { class: 'small' }, help)),
          (() => { const b = h('button', { class: 'btn toggle' + (st[key] ? ' on' : ''), ontap: () => { st[key] = !st[key]; b.classList.toggle('on', st[key]); b.textContent = st[key] ? 'On' : 'Off'; GL.audio.setVolume(); GL.save(); } }, st[key] ? 'On' : 'Off'); return b; })());
        const sel = (key, label, options, help) => h('div', { class: 'set-row' }, h('div', { class: 'grow' }, h('b', null, label), h('div', { class: 'small' }, help)),
          (() => { const s = h('select', { class: 'sel' }, options.map(([v, l]) => h('option', { value: v, selected: String(st[key]) === String(v) }, l))); s.addEventListener('change', () => { st[key] = isNaN(+s.value) ? s.value : +s.value; if (key === 'maxTier') S.math.tier = Math.min(S.math.tier, st.maxTier); GL.save(); }); return s; })());
        const code = h('textarea', { class: 'code', rows: 3, placeholder: 'Paste a save code here to import' });
        body.append(
          tog('timer', 'Power-ring timer', 'Shows the countdown ring. Answers are never cut off; fast answers just hit harder.'),
          tog('block', 'Block questions', 'A quick (easier) question when the enemy attacks to halve the damage.'),
          tog('readAloud', 'Read questions aloud', 'Uses the device voice (great for word problems).'),
          tog('sound', 'Sound effects', ''),
          sel('maxTier', 'Highest difficulty', [[1, 'Tier 1: ×0, ×1, ×2'], [2, 'Tier 2: up to ×5 and ×10'], [3, 'Tier 3: ×3–×5 with bigger numbers'], [4, 'Tier 4: ×6–×9'], [5, 'Tier 5: everything to 12 × 12']], 'Questions adapt automatically up to this level.'),
          sel('focus', 'Practice focus', [['mixed', 'Mixed × and ÷'], ['mul', 'Multiplication only'], ['div', 'Division only']], ''),
          h('h3', null, 'Backup'),
          h('div', { class: 'row' }, GL.btn('Copy save code', () => { code.value = GL.exportCode(); code.select(); try { navigator.clipboard && navigator.clipboard.writeText(code.value); GL.toast('Save code copied'); } catch (e) { } }),
            GL.btn('Import code', async () => { try { GL.importCode(code.value); GL.toast('Save imported! Reloading…'); setTimeout(() => location.reload(), 800); } catch (e) { GL.toast('That code didn\'t work.'); } })),
          code,
          h('h3', null, 'Danger zone'),
          GL.btn('Reset math progress', async () => { if (await GL.confirm('Reset all math stats and the fact deck?', 'Reset', 'Cancel')) { S.math = null; GL.Q.ensure(S); GL.save(); draw(); } }, 'btn-red'),
          GL.btn('Delete saved game', async () => { if (await GL.confirm('Delete the whole saved game? This cannot be undone.', 'Delete', 'Cancel')) { localStorage.removeItem(GL.SAVE_KEY); location.reload(); } }, 'btn-red'));
      }
    }
    draw();
  };
})();
