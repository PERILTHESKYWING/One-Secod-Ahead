# One Second Ahead

A single-player top-down arena shooter. You are CHRONO-01, sealed in Chamber 09
while the Concordance runs its entropy purge. Dash through trouble, drop a decoy
to take the hit meant for you, and swap places with it when the room closes in.

No build step, no dependencies, no external assets — every sprite, background and
sound effect is drawn or synthesized at runtime by plain HTML/CSS/JS.

## Running it

Any static file server works, since the game is loaded via `<script src>` tags
(not JS modules) and browsers block `file://` fetches for those:

```bash
python3 -m http.server 8080
# then open http://localhost:8080/index.html
```

Or use the VS Code "Live Server" extension, `npx serve`, etc. Progress, settings
and cosmetics are saved to the browser's `localStorage`.

## Controls

`WASD` move · aim/fire are automatic · `Space` dash (or swap places with your
decoy) · `E` summon an echo/decoy · `T` toggle day/night theme · `Esc` pause.

The dash goes where you are **steering**, not where you are pointing — the gun
keeps facing whatever it was shooting, so you can dash out of a squeeze while
still firing into it. It carries invulnerability past the end of the launch and
a short speed burst after it, which is what makes it an escape rather than a
fast walk.

## Project layout

This game started as one ~9,800-line HTML file and has been split into sections
purely for editability — there's no bundler, so **load order in `index.html`
still matters**: every file shares one global scope, and later files reference
functions/constants defined by earlier ones.

```
index.html              Page shell: markup for every screen (home, HUD, shop,
                         archive, settings, results, etc.) and the <script> tags
                         that load the JS below, in order.
css/
  style.css             All visual styling — themes, HUD, panels, screens.
js/
  01-engine-core.js      Math/DOM helpers, the save system, theme + color
                          palettes, the audio engine, base level & enemy tables.
  02-content-branches.js Content tables: the five branch/timeline definitions,
                          archive lore, secrets, bosses, the shop, cosmetics
                          and run-core (draft) definitions.
  03-render-toolkit.js   Canvas setup and the shared low-level drawing toolkit
                          (gradients, shadows, limbs, eyes, plates, chains...).
  04-enemy-art.js        Procedural art for every base-game (Chamber 09) enemy.
  05-branch-art.js       Procedural art for enemies/hero unique to the four
                          filed timelines, plus the drawEnemy dispatcher.
  06-player-render.js    Player and echo (decoy) rendering: hero body, motion
                          trails, decoy visuals.
  07-game-state-fx.js    The live run-state object (G), the particle/ring/
                          shake FX system, afterimages/debris, telegraphs.
  08-run-and-player.js   Run setup, level/wave progression, survival mode,
                          damage resolution, player controls (fire, dash,
                          time-swap, echo summon, movement).
  09-enemies-and-render.js Enemy AI update loop, boss behaviour, projectile/
                          pickup updates, the main world/HUD render pass.
  10-branch-ai.js         Branch-specific enemy AI (the TLAI table).
  11-branch-physics.js    The arena geometry engine (solid boxes, collision,
                          line-of-sight), the twelve room layouts, and the
                          branch room physics: Glassfall's shattering floor,
                          Emberwake's heatwaves and flame spurts, Nulltide's
                          undertow, the Terminus clock and the second behind.
  12-hud-and-screens.js   HUD widgets, screen routing, the Echo Lab shop UI,
                          settings panel, the boot terminal sequence.
  13-cinematic.js         The "Cold Open" intro cinematic.
  14-branch-shell.js      Timeline select screen, the Archive, the operator
                          console, input handling, run flow, menus, main loop.
  15-branch-wiring.js     Secret detection, the hidden seal, branch completion.
```

### Editing tips

- Gameplay tuning (enemy stats, level pacing, shop prices) lives in
  `js/01-engine-core.js` and `js/02-content-branches.js` — no rendering code
  to wade through.
- Visual changes to an enemy or the player go in `js/04-enemy-art.js`,
  `js/05-branch-art.js` or `js/06-player-render.js` depending on which
  character you're touching.
- New branch/timeline mechanics touch three places: content in
  `js/02-content-branches.js`, its AI in `js/10-branch-ai.js`, and its room
  physics in `js/11-branch-physics.js`.
- Room shapes are authored in the `LAYOUTS` table in `js/11-branch-physics.js`
  as rounded (optionally rotated) solid boxes cut out of the branch's floor.
  Two rules there are load-bearing rather than stylistic: openings are sized in
  pixels so a chokepoint stays one at any window size, and in a branch whose
  floor shrinks no wall may reach past `WALL_MAX_R` — if a closing rim can shut
  inside a wall, you end up stuck between the two.
- `docs/TUNING.md` is the reference for every knockback, dash, arena and
  branch-mechanic constant: what it does, what moving it changes, and the
  measured numbers each curve actually produces.
- Everything is global (no imports/exports), so a function or constant is
  visible to every file loaded after it in `index.html`. If you add a new
  file, add its `<script>` tag in the right position.
