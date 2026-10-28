/* Map data for Tallyton, Sumberry Meadows and the Proof Hall, built procedurally from tile names */
'use strict';
GL.MAPS = {};
(function () {
  const T = GL_TILES;
  function grid(w, h, v) { return Array.from({ length: h }, () => Array(w).fill(v)); }

  function Map(id, w, h, opts) {
    const m = Object.assign({ id, w, h, ground: grid(w, h, null), solid: grid(w, h, false), grass: grid(w, h, false),
      objects: [], npcs: [], triggers: {}, water: grid(w, h, false), exits: [] }, opts);
    m.set = (x, y, sheet, tile) => { if (x >= 0 && y >= 0 && x < w && y < h) m.ground[y][x] = [sheet, tile]; };
    m.obj = (sheet, tile, x, y, o = {}) => {
      const t = T[sheet][tile]; const ob = Object.assign({ sheet, tile, x, y, w: t.w, h: t.h }, o);
      m.objects.push(ob);
      const solidRows = o.solidRows == null ? t.h : o.solidRows;
      if (o.solid !== false) for (let yy = y + t.h - solidRows; yy < y + t.h; yy++) for (let xx = x; xx < x + t.w; xx++) if (yy >= 0 && yy < h && xx >= 0 && xx < w) m.solid[yy][xx] = true;
      return ob;
    };
    m.trig = (x, y, t) => { m.triggers[x + ',' + y] = t; };
    return m;
  }
  // autotile a boolean mask; prefix = 'path' | 'water' | 'cobble'
  function autotile(m, mask, sheet, prefix, centerFn) {
    const at = (x, y) => x < 0 || y < 0 || x >= m.w || y >= m.h ? true : mask[y][x];
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
      if (!mask[y][x]) continue;
      const n = !at(x, y - 1), s = !at(x, y + 1), w = !at(x - 1, y), e = !at(x + 1, y);
      let t;
      if (n && w) t = 'outer_nw'; else if (n && e) t = 'outer_ne'; else if (s && w) t = 'outer_sw'; else if (s && e) t = 'outer_se';
      else if (n) t = 'edge_n'; else if (s) t = 'edge_s'; else if (w) t = 'edge_w'; else if (e) t = 'edge_e';
      else if (!at(x - 1, y - 1)) t = 'inner_nw'; else if (!at(x + 1, y - 1)) t = 'inner_ne';
      else if (!at(x - 1, y + 1)) t = 'inner_sw'; else if (!at(x + 1, y + 1)) t = 'inner_se';
      else t = centerFn ? centerFn(x, y) : 'center';
      m.ground[y][x] = [sheet, prefix + '_' + t];
    }
  }
  function rect(mask, x0, y0, x1, y1) { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (mask[y] && x < mask[y].length) mask[y][x] = true; }
  function hash(x, y) { let n = x * 374761393 + y * 668265263; n = (n ^ (n >> 13)) * 1274126177; return ((n ^ (n >> 16)) >>> 0) / 4294967296; }
  function grassFill(m) {
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
      const r = hash(x, y);
      m.ground[y][x] = ['tileset_meadow', r < 0.07 ? 'flowers_a' : r < 0.12 ? 'flowers_b' : r < 0.55 ? 'grass_a' : 'grass_b'];
    }
  }
  function borderTrees(m, gaps) {
    const isGap = (side, x) => (gaps[side] || []).some(([a, b]) => x >= a && x <= b);
    for (let x = 0; x < m.w; x += 2) {
      if (!isGap('n', x)) m.obj('tileset_meadow', 'tree', x, 0, { solidRows: 2 });
      if (!isGap('s', x)) m.obj('tileset_meadow', 'tree', x, m.h - 2, { solidRows: 2 });
    }
    for (let y = 2; y < m.h - 2; y += 2) {
      if (!isGap('w', y)) m.obj('tileset_meadow', 'tree', 0, y, { solidRows: 2 });
      if (!isGap('e', y)) m.obj('tileset_meadow', 'tree', m.w - 2, y, { solidRows: 2 });
    }
  }

  /* ================= TALLYTON ================= */
  {
    const m = Map('town', 24, 18, { name: 'Tallyton', music: 'town', bg: '#7ccf5a' });
    grassFill(m);
    const cob = grid(m.w, m.h, false);
    rect(cob, 2, 5, 21, 7);   // main street
    rect(cob, 12, 0, 13, 13); // north road to meadows
    rect(cob, 2, 12, 21, 13); // south street
    rect(cob, 3, 8, 6, 8); rect(cob, 9, 8, 11, 8); // aprons to arcade / threadsmith
    autotile(m, cob, 'tileset_town', 'cobble');
    borderTrees(m, { n: [[12, 13]] });
    // buildings (doors are the middle bottom cells)
    const B = (tile, x, y, door, kind, label) => {
      const ob = m.obj('tileset_town', tile, x, y); ob.label = label;
      for (const dx of door) m.trig(x + dx, y + T.tileset_town[tile].h - 1, { type: 'door', kind, label });
    };
    B('lab', 2, 2, [1, 2], 'lab', 'Abacus Lab');
    B('house_red', 7, 2, [1], 'home', 'Home');
    B('glyph_center', 15, 2, [1, 2], 'center', 'Glyph Center');
    B('tally_mart', 19, 2, [1], 'mart', 'Tally Mart');
    B('arcade', 3, 9, [1, 2], 'arcade', 'Arcade');
    B('house_blue', 9, 9, [1], 'threadsmith', 'Threadsmith');
    m.obj('tileset_town', 'fountain_f0', 16, 9, { anim: ['fountain_f0', 'fountain_f1'] });
    m.obj('tileset_town', 'quest_board', 19, 10); m.trig(19, 10, { type: 'sign', text: ['📋 QUEST BOARD', 'Farmer Lin (Sumberry Meadows): "Please catch a Tallybun for my garden!"', 'Professor Abacus: "Catch 5 different Glyphlings and visit my Lab."', 'Proof Hall: "Warden Mira accepts challengers at the north-east end of the Meadows."'] });
    m.obj('tileset_town', 'lamp_post', 11, 3, { solidRows: 1 }); m.obj('tileset_town', 'lamp_post', 14, 3, { solidRows: 1 });
    m.obj('tileset_town', 'lamp_post', 7, 10, { solidRows: 1 }); m.obj('tileset_town', 'lamp_post', 14, 10, { solidRows: 1 });
    m.obj('tileset_town', 'flower_box', 20, 8); m.obj('tileset_town', 'barrel', 21, 8); m.obj('tileset_town', 'crate', 18, 8);
    m.obj('tileset_meadow', 'bush', 2, 14); m.obj('tileset_meadow', 'bush', 21, 14); m.obj('tileset_meadow', 'sign', 14, 1);
    m.trig(14, 1, { type: 'sign', text: ['↑ Sumberry Meadows', 'Wild Glyphlings live in the tall grass. Bring Glyph Prisms!'] });
    m.npcs.push({ id: 'professor', sheet: 'npc_professor', x: 6, y: 6, dir: 0, name: 'Professor Abacus', portrait: 'portrait_professor', talk: 'professor' });
    m.npcs.push({ id: 'clerk', sheet: 'npc_villager_b', x: 18, y: 13, dir: 0, name: 'Pip', talk: 'clerk', wander: true });
    m.exits.push({ x: 12, y: 0, w: 2, h: 1, dir: 'up', to: 'meadow', tx: 20, ty: 28 });
    m.spawn = { x: 4, y: 6 };
    m.center = { map: 'town', x: 16, y: 5 };
    GL.MAPS.town = m;
  }

  /* ================= SUMBERRY MEADOWS ================= */
  {
    const m = Map('meadow', 40, 30, { name: 'Sumberry Meadows', music: 'meadow', bg: '#7ccf5a' });
    grassFill(m);
    const water = grid(m.w, m.h, false);
    rect(water, 2, 11, 37, 13);
    const path = grid(m.w, m.h, false);
    rect(path, 20, 6, 21, 29);   // main north-south
    rect(path, 20, 6, 34, 7);    // to Proof Hall
    rect(path, 8, 18, 21, 19);   // to windmill
    rect(path, 33, 5, 33, 5);
    for (let y = 11; y <= 13; y++) for (const x of [20, 21]) water[y][x] = true;
    autotile(m, path, 'tileset_meadow', 'path');
    autotile(m, water, 'tileset_meadow', 'water', () => 'center_f0');
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) if (water[y][x]) { m.water[y][x] = true; if (!(x >= 20 && x <= 21)) m.solid[y][x] = true; }
    for (let y = 11; y <= 13; y++) for (const x of [20, 21]) m.obj('tileset_meadow', 'bridge_v', x, y, { solid: false, flat: true });
    // tall grass
    const tg = (x0, y0, x1, y1, zone) => {
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (!path[y][x] && !water[y][x]) {
        m.ground[y][x] = ['tileset_meadow', (x + y) % 2 ? 'tall_grass_a' : 'tall_grass_b']; m.grass[y][x] = zone;
      }
    };
    tg(4, 21, 15, 26, 'south'); tg(25, 19, 35, 24, 'south'); tg(9, 15, 15, 16, 'south');
    tg(3, 3, 15, 8, 'north'); tg(23, 8, 30, 9, 'north');
    borderTrees(m, { s: [[20, 21]] });
    m.obj('tileset_town', 'proof_hall', 31, 2); m.trig(33, 5, { type: 'door', kind: 'hall', label: 'Proof Hall' });
    m.obj('tileset_meadow', 'windmill', 4, 14, { solidRows: 2 });
    for (let x = 3; x <= 7; x++) m.obj('tileset_meadow', 'fence_h', x, 18);
    m.obj('tileset_meadow', 'berry_bush_full', 24, 26, { id: 'berry', anim: null }); m.trig(24, 26, { type: 'berry' });
    m.obj('tileset_meadow', 'sign', 22, 27); m.trig(22, 27, { type: 'sign', text: ['SUMBERRY MEADOWS', '↑ Proof Hall (Warden Mira)   ← Windmill', 'Tip: the berry bush next to me heals your team!'] });
    m.obj('tileset_meadow', 'sign', 22, 14); m.trig(22, 14, { type: 'sign', text: ['North Meadow: stronger Glyphlings (Lv 6–9).', 'Some say a wise owl hides where the grass shimmers…'] });
    m.obj('tileset_meadow', 'chest_locked', 36, 16, { id: 'chest1' }); m.trig(36, 16, { type: 'chest', id: 'chest1', q: { op: 'm', a: 7, b: 9, text: '7 × ? = 63', answer: 9 } });
    m.obj('tileset_meadow', 'chest_closed', 3, 27, { id: 'chest2' }); m.trig(3, 27, { type: 'chest', id: 'chest2', q: { op: 'd', a: 8, b: 6, text: '48 ÷ 6 = ?', answer: 8 } });
    m.obj('tileset_meadow', 'sparkle_f0', 9, 4, { solid: false, flat: true, anim: ['sparkle_f0', 'sparkle_f1'], id: 'shimmer' });
    m.trig(9, 4, { type: 'shimmer', step: true });
    m.obj('tileset_meadow', 'cave', 34, 25, { id: 'cave' }); m.trig(34, 26, { type: 'sign', text: ['The Echo Caves are sealed by a glowing number lock.', '(Coming in a future update!)'] }); m.trig(35, 26, m.triggers['34,26']);
    // decorations
    [[17, 22], [18, 25], [6, 10], [30, 15], [32, 17], [10, 28 - 1], [27, 27]].forEach(([x, y], i) => m.obj('tileset_meadow', i % 2 ? 'rock_small' : 'bush', x, y));
    m.obj('tileset_meadow', 'rock_large', 16, 4); m.obj('tileset_meadow', 'rock_large', 28, 16);
    m.obj('tileset_meadow', 'tree', 25, 14, { solidRows: 1 }); m.obj('tileset_meadow', 'tree', 12, 9 - 0, { solidRows: 1 });
    m.obj('tileset_meadow', 'tree', 2, 19, { solidRows: 1 }); m.obj('tileset_meadow', 'tree', 36, 21, { solidRows: 1 });
    // NPCs
    m.npcs.push({ id: 'lin', sheet: 'npc_villager_a', x: 9, y: 17, dir: 0, name: 'Farmer Lin', talk: 'lin' });
    m.npcs.push({ id: 'remy', sheet: 'npc_rival', x: 23, y: 16, dir: 1, name: 'Ranger Remy', portrait: 'portrait_rival', talk: 'remy', trainer: 'remy', sight: 3 });
    m.npcs.push({ id: 'tess', sheet: 'npc_villager_b', x: 25, y: 4, dir: 0, name: 'Ranger Tess', talk: 'tess', trainer: 'tess', sight: 3 });
    m.npcs.push({ id: 'bo', sheet: 'npc_villager_a', x: 17, y: 20, dir: 2, name: 'Ranger Bo', talk: 'bo', trainer: 'bo', sight: 3 });
    m.exits.push({ x: 20, y: 29, w: 2, h: 1, dir: 'down', to: 'town', tx: 12, ty: 1 });
    m.encounters = {
      south: { lv: [3, 5], table: [['zappip', 30], ['pebblit', 30], ['tallybun', 30], ['kitewing', 10]] },
      north: { lv: [6, 9], table: [['zappip', 22], ['pebblit', 22], ['tallybun', 22], ['kitewing', 20], ['owlgebra', 5], ['__starter', 6]] },
    };
    GL.MAPS.meadow = m;
  }

  /* ================= PROOF HALL (interior) ================= */
  {
    const m = Map('hall', 11, 10, { name: 'Proof Hall', music: 'hall', bg: '#2B2140', interior: true, battleBg: 'battle/bg_battle_hall' });
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) m.ground[y][x] = ['interior_basic', (x + y) % 2 ? 'floor_wood' : 'floor_wood_b'];
    for (let x = 0; x < m.w; x++) { m.ground[0][x] = ['interior_basic', 'wall_top']; m.ground[1][x] = ['interior_basic', 'wall']; m.solid[0][x] = m.solid[1][x] = true; }
    for (let y = 0; y < m.h; y++) { m.solid[y][0] = m.solid[y][m.w - 1] = true; }
    for (let y = 2; y < m.h; y++) { m.ground[y][0] = ['interior_basic', 'wall']; m.ground[y][m.w - 1] = ['interior_basic', 'wall']; }
    m.obj('interior_basic', 'rug', 4, 5, { solid: false, flat: true }); m.obj('interior_basic', 'rug', 5, 5, { solid: false, flat: true });
    m.obj('interior_basic', 'shelf', 1, 1); m.obj('interior_basic', 'shelf', 2, 1); m.obj('interior_basic', 'shelf', 8, 1); m.obj('interior_basic', 'shelf', 9, 1);
    m.obj('interior_basic', 'computer', 1, 6); m.trig(1, 6, { type: 'sign', text: ['PROOF HALL RULES', '1. Every move is a math answer.', '2. At half health, Mira\'s Proof Phase makes questions a step harder!', '3. Win to earn the Meadow Badge.'] });
    m.npcs.push({ id: 'mira', sheet: 'npc_warden_mira', x: 5, y: 3, dir: 0, name: 'Warden Mira', portrait: 'portrait_warden_mira', talk: 'mira' });
    for (let x = 1; x < m.w - 1; x++) m.solid[m.h - 1][x] = x !== 5;
    m.exits.push({ x: 5, y: 9, w: 1, h: 1, dir: 'down', to: 'meadow', tx: 33, ty: 6 });
    m.spawn = { x: 5, y: 8 };
    GL.MAPS.hall = m;
  }

  /* ================= TRAINERS ================= */
  GL.TRAINERS = {
    remy: { name: 'Ranger Remy', sheet: 'npc_rival', portrait: 'portrait_rival', team: [['zappip', 5], ['kitewing', 6]], coins: 40,
      intro: ['Hey! You picked up a Glyphling too? Let\'s see how fast your brain is!'], win: ['Whoa, you answered quicker than me! Next time I\'m practising my 7s…'], after: ['I\'m training my 7s. 7, 14, 21, 28…'] },
    tess: { name: 'Ranger Tess', sheet: 'npc_villager_b', team: [['pebblit', 7], ['tallybun', 7]], coins: 50,
      intro: ['North Meadow ranger here! My Glyphlings are tough as stones.'], win: ['Your multiplication is solid as a rock!'], after: ['Warden Mira is just past me. Her Proof Phase makes questions harder at half health!'] },
    bo: { name: 'Ranger Bo', sheet: 'npc_villager_a', team: [['tallybun', 5]], coins: 30,
      intro: ['Halt! Rangers always battle when our eyes meet!'], win: ['You count faster than a Tallybun hops!'], after: ['Tip: Leaf types are strong against Tide and Stone.'] },
    mira: { name: 'Warden Mira', sheet: 'npc_warden_mira', portrait: 'portrait_warden_mira', team: [['tallybun', 9], ['kitewing', 10]], coins: 200, boss: true, bg: 'battle/bg_battle_hall',
      intro: ['Welcome to the Proof Hall, young Ranger.', 'Here, every answer must be proven. Show me strong facts and a steady streak!'],
      win: ['Splendid! You have proven yourself.', 'Take the Meadow Badge, a Star Shard, and 200 coins.'], after: ['Keep practising. A true Ranger knows every fact from 0 to 12!'] },
  };
})();
