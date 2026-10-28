/* Glyphlings data: types, species, moves, items, gear */
'use strict';
GL.TYPES = ['ember', 'tide', 'leaf', 'stone', 'volt', 'gale'];
GL.TYPE_COLOR = { ember: '#FF6B3D', tide: '#2EB8D6', leaf: '#6BD45B', stone: '#C7A27A', volt: '#FFE14D', gale: '#B8E3FF', normal: '#E6DCC8' };
GL.TYPE_DARK = { ember: '#C23B22', tide: '#1F6FA8', leaf: '#2E8B57', stone: '#7E5E46', volt: '#E0A100', gale: '#6FA8DC', normal: '#8a7f6b' };
// attacker -> defender multiplier (DESIGN.md §4.1)
GL.CHART = {
  ember: { ember: 1, tide: .5, leaf: 2, stone: .5, volt: 1, gale: 2 },
  tide: { ember: 2, tide: 1, leaf: .5, stone: 2, volt: .5, gale: 1 },
  leaf: { ember: .5, tide: 2, leaf: 1, stone: 2, volt: 1, gale: .5 },
  stone: { ember: 2, tide: .5, leaf: .5, stone: 1, volt: 2, gale: 1 },
  volt: { ember: 1, tide: 2, leaf: 1, stone: .5, volt: 1, gale: 2 },
  gale: { ember: .5, tide: 1, leaf: 2, stone: 1, volt: 2, gale: 1 },
};
GL.typeMult = (atk, def) => (atk === 'normal' || !GL.CHART[atk]) ? 1 : GL.CHART[atk][def];
GL.cap = s => s.charAt(0).toUpperCase() + s.slice(1);

GL.MOVES = {
  tackle: { name: 'Tackle', type: 'normal', power: 8, energy: 0, desc: 'A sturdy bump.' },
  scratch: { name: 'Scratch', type: 'normal', power: 8, energy: 0, desc: 'Quick stubby-claw swipe.' },
  peck: { name: 'Peck', type: 'normal', power: 8, energy: 0, desc: 'A tiny beak tap.' },
  bonk: { name: 'Bonk', type: 'normal', power: 8, energy: 0, desc: 'Headfirst bonk!' },
  ember_toss: { name: 'Ember Toss', type: 'ember', power: 13, energy: 1, desc: 'Flicks a warm spark.' },
  bubble_pop: { name: 'Bubble Pop', type: 'tide', power: 13, energy: 1, desc: 'Pops a bubble on the foe.' },
  leaf_flick: { name: 'Leaf Flick', type: 'leaf', power: 13, energy: 1, desc: 'Flings a sharp leaf.' },
  pebble_toss: { name: 'Pebble Toss', type: 'stone', power: 13, energy: 1, desc: 'Lobs a round pebble.' },
  spark: { name: 'Spark', type: 'volt', power: 13, energy: 1, desc: 'A crackly little zap.' },
  gust: { name: 'Gust', type: 'gale', power: 13, energy: 1, desc: 'A swirl of wind.' },
  dig_in: { name: 'Dig In', type: 'stone', power: 16, energy: 2, desc: 'Digs up rocks and throws them.' },
  static_splash: { name: 'Static Splash', type: 'volt', power: 16, energy: 2, desc: 'Fizzy, zappy water.' },
  breeze_roll: { name: 'Breeze Roll', type: 'gale', power: 16, energy: 2, desc: 'Rolls in on a breeze.' },
  gust_zip: { name: 'Gust Zip', type: 'gale', power: 16, energy: 2, desc: 'Zips past on a gust.' },
  moss_bop: { name: 'Moss Bop', type: 'leaf', power: 16, energy: 2, desc: 'A mossy cap bop.' },
  leaf_slice: { name: 'Leaf Slice', type: 'leaf', power: 16, energy: 2, desc: 'Origami-sharp wing fold.' },
  pebble_kick: { name: 'Pebble Kick', type: 'stone', power: 16, energy: 2, desc: 'Kicks a pebble hard.' },
  spark_feather: { name: 'Spark Feather', type: 'volt', power: 16, energy: 2, desc: 'A crackling feather dart.' },
  // signatures (3 energy)
  plus_flare: { name: 'Plus Flare', type: 'ember', power: 18, energy: 3, sig: true, special: 'plus', desc: '+2 power for each answer in your streak.' },
  bubble_divide: { name: 'Bubble Divide', type: 'tide', power: 11, energy: 3, sig: true, special: 'hits2', desc: 'Splits into 2 hits.' },
  seed_roll: { name: 'Seed Roll', type: 'leaf', power: 18, energy: 3, sig: true, special: 'seedroll', desc: 'With a 3+ streak it rolls twice.' },
  static_count: { name: 'Static Count', type: 'volt', power: 9, energy: 3, sig: true, special: 'hits13', desc: 'Hits 1 to 3 times.' },
  dice_drop: { name: 'Dice Drop', type: 'stone', power: 0, energy: 3, sig: true, special: 'dice', desc: 'Damage = dice roll × 4.' },
  updraft: { name: 'Updraft', type: 'gale', power: 20, energy: 3, sig: true, desc: 'A rising rush of wind.' },
  tally_hop: { name: 'Tally Hop', type: 'leaf', power: 7, energy: 3, sig: true, special: 'hits24', desc: 'Hops 2 to 4 times.' },
  solve_for_hoo: { name: 'Solve for Hoo', type: 'gale', power: 16, energy: 3, sig: true, special: 'hoo', desc: 'Your next correct answer is a Critical.' },
  carry_blaze: { name: 'Carry Blaze', type: 'ember', power: 22, energy: 3, sig: true, special: 'carry', desc: 'Extra damage carries to next turn.' },
  riptide_remainder: { name: 'Riptide Remainder', type: 'tide', power: 20, energy: 3, sig: true, special: 'whirl', desc: 'A whirlpool keeps swirling for 2 turns.' },
  thorn_fraction: { name: 'Thorn Fraction', type: 'leaf', power: 32, energy: 3, sig: true, special: 'fraction', desc: '½, ¼ and ⅛ pieces: 3 hits!' },
};

// base stats at level 1; learnset: [moveId, level]
GL.SPECIES = {
  kindlekit: { name: 'Kindlekit', type: 'ember', art: 'kindlekit', rarity: 'uncommon', base: { hp: 24, atk: 13, def: 10, spd: 11 }, xp: 22,
    learn: [['scratch', 1], ['ember_toss', 1], ['dig_in', 6], ['plus_flare', 8]], evo: { level: 12, to: 'blazebadger' },
    desc: 'A brave badger cub. The + stripe glows brighter every time it adds things up.', height: '0.4 m', weight: '6.5 kg',
    fact: 'Its tail flame burns 1 minute longer for every 10 steps it walks. How long after 70 steps?' },
  blazebadger: { name: 'Blazebadger', type: 'ember', art: 'kindlekit', evolved: true, tint: '#E2481F', rarity: 'rare', base: { hp: 30, atk: 16, def: 12, spd: 12 }, xp: 40,
    learn: [['scratch', 1], ['ember_toss', 1], ['dig_in', 6], ['plus_flare', 8], ['carry_blaze', 12]],
    desc: 'Stands tall now. The + stripe runs down its back like a glowing seam.', height: '0.9 m', weight: '24.5 kg', fact: 'It can carry 4 friends at once. How many in 3 trips?' },
  splishnar: { name: 'Splishnar', type: 'tide', art: 'splishnar', rarity: 'uncommon', base: { hp: 26, atk: 11, def: 11, spd: 9 }, xp: 22,
    learn: [['tackle', 1], ['bubble_pop', 1], ['static_splash', 6], ['bubble_divide', 8]], evo: { level: 12, to: 'tidetusk' },
    desc: 'A giggly baby narwhal that hops on little flipper feet. Its tusk has a ÷ pattern.', height: '0.5 m', weight: '8.2 kg',
    fact: 'It blows 24 bubbles and shares them with 6 friends. How many each?' },
  tidetusk: { name: 'Tidetusk', type: 'tide', art: 'splishnar', evolved: true, tint: '#1F4FA8', rarity: 'rare', base: { hp: 33, atk: 14, def: 13, spd: 10 }, xp: 40,
    learn: [['tackle', 1], ['bubble_pop', 1], ['static_splash', 6], ['bubble_divide', 8], ['riptide_remainder', 12]],
    desc: 'Sleek and cool-headed, with a long spiral tusk and cape-like fins.', height: '1.3 m', weight: '41.0 kg', fact: 'It swims 9 km every hour. How far in 6 hours?' },
  sproutgolin: { name: 'Sproutgolin', type: 'leaf', art: 'sproutgolin', rarity: 'uncommon', base: { hp: 25, atk: 11, def: 12, spd: 8 }, xp: 22,
    learn: [['tackle', 1], ['leaf_flick', 1], ['breeze_roll', 6], ['seed_roll', 8]], evo: { level: 12, to: 'bramblegolin' },
    desc: 'A shy pangolin with leaf scales. It curls into a ball when nervous.', height: '0.4 m', weight: '5.9 kg',
    fact: 'It has 8 rows of 7 leaf scales. How many scales?' },
  bramblegolin: { name: 'Bramblegolin', type: 'leaf', art: 'sproutgolin', evolved: true, tint: '#1E6B3A', rarity: 'rare', base: { hp: 32, atk: 14, def: 15, spd: 9 }, xp: 40,
    learn: [['tackle', 1], ['leaf_flick', 1], ['breeze_roll', 6], ['seed_roll', 8], ['thorn_fraction', 12]],
    desc: 'Loyal and steady. Thorn-tipped scales and a flower bud on its tail.', height: '1.0 m', weight: '30.2 kg', fact: 'Its bud opens 1/4 more each day. How many days to bloom?' },
  zappip: { name: 'Zappip', type: 'volt', art: 'zappip', rarity: 'common', base: { hp: 20, atk: 12, def: 9, spd: 13 }, xp: 18,
    learn: [['tackle', 1], ['spark', 1], ['gust_zip', 5], ['static_count', 7]],
    desc: 'A chatty firefly with a battery belly: + on one end, − on the other.', height: '0.2 m', weight: '0.3 kg', fact: 'It blinks 3 times a second. How many blinks in 12 seconds?' },
  pebblit: { name: 'Pebblit', type: 'stone', art: 'pebblit', rarity: 'common', base: { hp: 24, atk: 11, def: 13, spd: 6 }, xp: 18,
    learn: [['bonk', 1], ['pebble_toss', 1], ['moss_bop', 5], ['dice_drop', 7]],
    desc: 'A sleepy, stubborn pebble with dice pips on its belly.', height: '0.3 m', weight: '12.0 kg', fact: 'Two Pebblits show 3 pips and 5 pips. Multiply them!' },
  kitewing: { name: 'Kitewing', type: 'gale', art: 'kitewing', rarity: 'uncommon', base: { hp: 21, atk: 12, def: 9, spd: 14 }, xp: 20,
    learn: [['peck', 1], ['gust', 1], ['leaf_slice', 5], ['updraft', 7]],
    desc: 'An origami kite-bird that loves to race the wind.', height: '0.6 m', weight: '0.9 kg', fact: 'Its ribbon has 3 bows. How many bows on 9 Kitewings?' },
  tallybun: { name: 'Tallybun', type: 'leaf', art: 'tallybun', rarity: 'common', base: { hp: 22, atk: 12, def: 10, spd: 12 }, xp: 18,
    learn: [['tackle', 1], ['leaf_flick', 1], ['pebble_kick', 5], ['tally_hop', 7]],
    desc: 'A speedy bunny that counts everything out loud. Tally marks on its ears.', height: '0.4 m', weight: '2.4 kg', fact: 'Each ear tip shows 5 tallies. How many on 6 ears?' },
  owlgebra: { name: 'Owlgebra', type: 'gale', art: 'owlgebra', rarity: 'rare', base: { hp: 25, atk: 13, def: 12, spd: 11 }, xp: 30,
    learn: [['peck', 1], ['gust', 1], ['spark_feather', 5], ['solve_for_hoo', 7]],
    desc: 'A wise, slightly smug owl. Its ear tufts cross like an ×.', height: '0.5 m', weight: '1.8 kg', fact: 'It solves 7 puzzles each night. How many in 8 nights?' },
};
GL.JOURNAL_ORDER = ['kindlekit', 'blazebadger', 'splishnar', 'tidetusk', 'sproutgolin', 'bramblegolin', 'zappip', 'pebblit', 'kitewing', 'tallybun', 'owlgebra'];
GL.STARTERS = ['kindlekit', 'splishnar', 'sproutgolin'];

GL.ITEMS = {
  prism: { name: 'Glyph Prism', icon: 'icons/item_prism', price: 20, desc: 'Start a capture. Enemy must be under half HP.', battle: true },
  super_prism: { name: 'Super Prism', icon: 'icons/item_super_prism', price: 60, desc: 'Capture needs 1 fewer correct answer.', battle: true },
  berry_tonic: { name: 'Berry Tonic', icon: 'icons/item_berry_tonic', price: 15, desc: 'Heals 30 HP.', battle: true, field: true },
  energy_drop: { name: 'Energy Drop', icon: 'icons/item_energy_drop', price: 25, desc: '+2 energy in battle.', battle: true },
  revive_feather: { name: 'Revive Feather', icon: 'icons/item_revive_feather', price: 80, desc: 'Revives a fainted Glyphling at half HP.', battle: true, field: true },
  hint_lens: { name: 'Hint Lens', icon: 'icons/item_hint_lens', price: 10, desc: 'Shows a hint on one question.' },
};
GL.SHOP_ITEMS = ['prism', 'super_prism', 'berry_tonic', 'energy_drop', 'revive_feather', 'hint_lens'];
GL.GEAR = {
  hats: [{ id: 'cap', name: 'Ranger Cap', price: 60 }, { id: 'beanie', name: 'Cozy Beanie', price: 80 }, { id: 'explorer', name: 'Explorer Hat', price: 120 }],
  jackets: [{ id: 'red', name: 'Red Ranger Jacket', price: 100 }, { id: 'blue', name: 'Blue Ranger Jacket', price: 100 }, { id: 'green', name: 'Green Ranger Jacket', price: 100 }],
};
GL.SKINS = ['light', 'medium', 'tan', 'deep'];
GL.SKIN_SWATCH = { light: '#FCE0C8', medium: '#E7B48F', tan: '#C68C5E', deep: '#7D4D30' };
GL.HAIR_COLORS = ['#6B4226', '#2B2140', '#F2C94C', '#C8553D', '#E8E4F0', '#5AA0E6', '#FF8FC7', '#6BD45B'];
GL.HAIR_NAMES = ['Spiky', 'Curly', 'Ponytail', 'Buzz'];
GL.FUN_NAMES = ['Ollie Bolt', 'Captain Carry', 'Max Multiply', 'Ace Divider', 'Zoom Zero', 'Nova Nine', 'Rex Remainder', 'Sky Sum', 'Pixel Prime', 'Turbo Twelve'];

/* ---------- monster instances ---------- */
GL.statsOf = function (m) {
  const sp = GL.SPECIES[m.species], L = m.level, b = sp.base;
  return {
    maxhp: Math.floor(b.hp * (1 + (L - 1) * 0.13)) + 4,
    atk: Math.floor(b.atk * (1 + (L - 1) * 0.11)),
    def: Math.floor(b.def * (1 + (L - 1) * 0.11)),
    spd: Math.floor(b.spd * (1 + (L - 1) * 0.11)),
  };
};
GL.xpNeed = L => 12 + L * 8;
GL.movesFor = (species, level) => GL.SPECIES[species].learn.filter(([, l]) => l <= level).map(([id]) => id).slice(-4);
GL.makeMon = function (species, level) {
  const m = { uid: GL.S ? GL.S.uid++ : Math.floor(Math.random() * 1e9), species, level, xp: 0, hp: 1 };
  m.moves = GL.movesFor(species, level);
  m.hp = GL.statsOf(m).maxhp;
  return m;
};
GL.monName = m => GL.SPECIES[m.species].name;
GL.healMon = m => { m.hp = GL.statsOf(m).maxhp; };
GL.healTeam = () => { for (const m of GL.S.team) GL.healMon(m); };
GL.markSeen = sp => { GL.S.journal.seen[sp] = true; };
GL.markCaught = sp => { GL.S.journal.seen[sp] = true; GL.S.journal.caught[sp] = true; };
GL.TEAM_MAX = 6;
GL.addToCollection = function (m) {
  GL.markCaught(m.species);
  if (GL.S.team.length < GL.TEAM_MAX) { GL.S.team.push(m); return 'team'; }
  GL.S.garden.push(m); return 'garden';
};

/* evolved sprites: tinted + recoloured version of the base art (stub until stage-2 art exists) */
GL._tintCache = {};
GL.monImg = function (species, view) {
  const sp = GL.SPECIES[species];
  const base = GL.img(`monsters/${sp.art}_${view}`);
  if (!sp.evolved || !base || !base.complete || !base.naturalWidth) return base;
  const key = species + view;
  if (GL._tintCache[key]) return GL._tintCache[key];
  const c = document.createElement('canvas'); c.width = base.naturalWidth; c.height = base.naturalHeight;
  const x = c.getContext('2d');
  x.drawImage(base, 0, 0);
  x.globalCompositeOperation = 'source-atop'; x.globalAlpha = 0.38; x.fillStyle = sp.tint; x.fillRect(0, 0, c.width, c.height);
  x.globalAlpha = 1; x.globalCompositeOperation = 'destination-over';
  const g = x.createRadialGradient(c.width / 2, c.height * 0.55, 4, c.width / 2, c.height * 0.55, c.width * 0.5);
  g.addColorStop(0, 'rgba(255,225,77,0.55)'); g.addColorStop(1, 'rgba(255,225,77,0)');
  x.fillStyle = g; x.fillRect(0, 0, c.width, c.height);
  GL._tintCache[key] = c; return c;
};
GL.monIconEl = function (species, size = 48) {
  const sp = GL.SPECIES[species];
  const el = GL.h('img', { class: 'mon-icon' + (sp.evolved ? ' evolved' : ''), src: GL.A + `monsters/${sp.art}_icon.png`, width: size, height: size, alt: sp.name, draggable: 'false' });
  if (sp.evolved) el.style.filter = 'saturate(1.3) hue-rotate(-8deg) drop-shadow(0 0 4px #FFC93C)';
  return el;
};
