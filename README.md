# Glyphlings: Legends of Numeria

A math creature-collecting adventure for 5th graders. Explore Numeria, battle and befriend wild
Glyphlings, and power every attack, catch, and arcade game with math answers.
Original characters and art; no Pokémon or Prodigy assets.

## Play
- Static site, no build step. Open `index.html` through any web server, e.g.
  `python3 -m http.server 8123` then visit http://localhost:8123/
- Works on iPhone, iPad (portrait or landscape) and desktop browsers (Safari, Chrome).
- On iPhone/iPad: Share → **Add to Home Screen** for a full-screen app icon.
- Controls: touch d-pad + A/B buttons, or arrow keys/WASD + Enter/Space (A) and Esc (B/menu).
  Answers use the on-screen number pad or the keyboard.
- Progress auto-saves to the browser's `localStorage` (key `glyphlings.save.v1`) every 30 s, after
  battles, and when the tab is hidden. Saves are per device/browser. Parents can copy/import a save
  code from the dashboard's Settings tab.

## What's in the first playable (MVP)
- Title screen, avatar creator (skin, hair, hair color, jacket, name).
- Professor Abacus intro and a starter pick: Kindlekit (Ember), Splishnar (Tide), Sproutgolin (Leaf).
- **Tallyton** hub (Lab, Glyph Center heal/team swap, Tally Mart, Threadsmith, Arcade, Home, Quest Board)
  and **Sumberry Meadows** (tall grass, creek, 3 Rangers, Farmer Lin's Tallybun side quest).
- 8 Glyphlings + 3 starter evolutions, field journal with seen/caught entries.
- Battles: moves with energy cost, type chart, speed and streak bonuses, block questions, items,
  capture with a Glyph Prism streak challenge, XP and levels.
- Evolution at Lv 12 after a "Proof Spark" test (4 of 5 correct).
- **Warden Mira** in the Meadow Proof Hall (2 Glyphlings, harder "Proof Phase" at half HP) awards the
  Meadow Badge, a Star Shard and 200 coins.
- Math engine: × and ÷ facts 0–12, adaptive tiers, missing-factor and simple word problems.
  **No-repeat deck:** a fact isn't asked again until every fact in the deck has been answered
  correctly; missed facts come back two questions later.
- Arcade: Token Booth (60-second sprint, 1 token per 4 correct, 3 per day) and **Kitewing Glide**
  (tap to flap through rings, dodge storm clouds, every 10 rings fly through the gate with the right answer).
  Tokens also come from every 5 correct answers in battle.
- **Grown-ups area** behind a math gate (e.g. `7 × 8 + 15`): overview stats, facts heat map, weak spots,
  recent answers, settings (timer ring, block questions, read-aloud, sound, max difficulty, ×/÷ focus),
  save backup, reset.

## Not yet / placeholders
- Evolved forms reuse the base art with a color tint (no stage-2 art yet).
- Only Region 1. Later regions (decimals, multi-digit, fractions, geometry, order of operations) are in DESIGN.md.
- One arcade game; sound effects are synthesized; no music yet.

## Files
- `index.html`, `css/style.css`, `js/*.js` (core, data, questions, maps, ui, overworld, battle, arcade, menus, main)
- `assets/` art by the Graphic Designer bot (monsters, characters, tiles, battle, fx, ui, icons, arcade, brand, fonts)

## Debug
- `?debug=1` enables a debug panel; `?fast=1` speeds up battle animations (used by the headless test).
