# Tuning reference

Every number the knockback / dash / arena rework introduced, where it lives,
and what moving it does. Grouped so you can balance one system without
reading the others.

Nothing here is derived from anything else unless the table says so — the
constants are all independent knobs on purpose.

---

## 1 · Player knockback

`js/08-run-and-player.js`

Two rules changed. **Only projectiles shove you** — a shot, a shell, a thrown
orb, a deflected pulse. Contact with a body, burning ground, a Warden's leash
tearing, a hazard line and the room's own hazards all still hurt and none of
them move you. There is exactly one call site that passes the projectile flag
(the `G.hostiles` collision in `js/09-enemies-and-render.js`), so the rule is
enforced in one place rather than per-enemy. **And the shove scales with the
hit**, on a power curve rather than the old clamped linear ramp.

```
mag = KB_PLAYER_BASE * clamp( (damage / KB_PLAYER_REF) ^ KB_PLAYER_EXP,
                              KB_PLAYER_MIN, KB_PLAYER_MAX )
```

| Constant | Value | Effect |
|---|---|---|
| `KB_PLAYER_BASE` | `260` px/s | the shove a reference-sized hit gives. Scales the whole curve. |
| `KB_PLAYER_REF` | `26` dmg | the hit that gets exactly `BASE`. Raise it to make everything shove less. |
| `KB_PLAYER_EXP` | `1.35` | curve sharpness. `1.0` = linear; higher widens the gap between a graze and a shell. |
| `KB_PLAYER_MIN` | `.16` | floor, so a chip hit still registers |
| `KB_PLAYER_MAX` | `2.1` | ceiling, so nothing throws you across the room |
| `PLAYER_KB_DECAY` | `.03` /s | how fast you shrug it off. Total travel ≈ `mag × 0.285`. |
| `KNOCKBACK_PLAYER_BLOCK` | `90` px/s | shove from a hit the deflector eats |
| `KB_DASH_KEEP` | `.12` | fraction of a live shove that survives a dash or a swap |

What the curve produces (measured, px/s):

| damage | 6 | 11 | 18 | 26 | 34 | 42 | 60 |
|---|---|---|---|---|---|---|---|
| shove | 42 | 81 | 158 | **260** | 374 | 497 | 546 (capped) |
| travel px | 12 | 23 | 45 | 74 | 107 | 142 | 156 |

A Revenant's cleave (42) throws you **6.1×** as far as a Facet's ray (11).
The curve saturates around 42 damage — raise `KB_PLAYER_MAX` if you want the
heaviest hits to keep separating.

---

## 2 · Enemy weight

`js/01-engine-core.js` — `EN[type].wt`

Weight does exactly one thing: divide the distance a shove moves the body.
`1.0` is the reference. It is deliberately **not** tied to health or radius,
so a Mirror is as tough as a Warden and gets kicked around like chaff.

| band | wt | who |
|---|---|---|
| chaff | `.35` – `.7` | mote `.35`, cinder `.55`, rime `.6`, bloom / undine `.7` |
| light | `.75` – `.95` | mirror `.75`, husk / filament `.8`, facet / vestige `.85`, dart / fathom `.9`, needle `.95` |
| standard | `1.0` – `1.4` | weaver / mimic / coda `1.0`, spore / ignis `1.1`, zenith `1.25`, revenant `1.4` |
| heavy | `1.5` – `2.2` | caustic / sounding `1.5`, hexer `1.6`, nullc `1.7`, kelvin `1.8`, prism `1.9`, corona / howitzer `2.0`, epilogue `2.2` |
| anchored | `2.4` – `3.6` | warden `2.4`, bulwark `2.6`, silica `2.8`, broodmother `3.0`, colossus `3.2`, helion `3.4`, trench `3.6` |
| bosses | `9` – `12` | omega `9`, all others `12` (and non-omega bosses ignore shoves entirely) |

An `armoured` elite multiplies its own weight by `1.5`.

Measured travel from one 60px shove: mote **171px**, husk 75, weaver 60,
howitzer 30, trench **17**.

---

## 3 · The enemy shove animation

`js/09-enemies-and-render.js`

The old version was a velocity with exponential decay, which integrates to a
long smooth glide — a hit body *slid*. It is now a displacement tween with an
authored shape: a hard punch out on a quartic ease-out that overshoots the
resting distance, then a cosine ease back onto it.

| Constant | Value | Effect |
|---|---|---|
| `SHOVE_DUR` | `.19` s | the whole window. Shorter = snappier, and stacks harder under sustained fire. |
| `SHOVE_PUNCH` | `.34` | fraction of the window spent going out. Lower = more violent. |
| `SHOVE_OVERSHOOT` | `1.14` | peak travel as a multiple of resting travel. This is the "recoil" read. |
| `SHOVE_MIN_DIST` | `1.4` px | below this the shove is dropped rather than played |
| `SHOVE_MAX_DIST` | `220` px | ceiling on one shove |
| `SHOVE_STRETCH_NORM` | `90` px | travel that deforms the sprite to `KB_STRETCH_MAX` (`.2`, in `05-branch-art.js`) |

Measured: **113%** of total travel is delivered by the end of the punch
phase, then it settles back — which is exactly the shape a shove should have.

Shove magnitudes, in px of travel for a weight-1.0 body (`08-run-and-player.js`):

| Constant | Value | Source |
|---|---|---|
| `SHOVE_PULSE` | `15` | one connecting pulse, scaled `×clamp(dmg/11, .5, 2.2)` so damage cores shove harder |
| `SHOVE_DASH_THROUGH` | `74` | dashing through a body |
| `SHOVE_DASH_SHOCK` | `96` | the Shockdash core |
| `SHOVE_SWAP_WAVE` | `88` | the Displacement wave module, at both ends |
| `SHOVE_SPORE_SCATTER` | `58` | motes thrown clear of the spore |
| `CONTACT_SEPARATION` | `150` px/s | bodies pushing apart. Collision, not knockback — never touches `p.kb`. |

---

## 4 · Dash

`js/08-run-and-player.js`

**Direction now comes from movement input, not the aim.** Aim and fire are
automatic, so the aim points at whatever is nearest — which is the thing you
are usually dashing *away* from. The gun keeps pointing where it was; the
stick decides where you go. Standing still, it falls back to the heading you
had if it is fresher than `DASH_DIR_MEMORY`, and to the aim only if you have
genuinely been stationary (so the deliberate dash-through-a-body play stays).

**The escape window** is what separates it from a fast walk. At base speed you
cannot outrun a 340px/s projectile; inside this window you can.

| Constant | Value | Effect |
|---|---|---|
| `DASH_SPEED` | `1180` px/s | launch speed |
| `DASH_TIME` | `.17` s | launch duration (≈ 200px of travel) |
| `DASH_EXIT_IFRAME` | `.16` s | **grace after the dash ends.** Total i-frame `.33s`, ~2× the dash itself. This is the main dial for how forgiving the escape is. |
| `DASH_SURGE_TIME` | `.42` s | speed-burst window after landing |
| `DASH_SURGE_MUL` | `1.5` | move speed inside it (510 px/s vs 340 base) |
| `DASH_EXIT_SPEED` | `1.18` | hand-off speed as a multiple of burst speed, so the launch doesn't dump you on the spot. Peak measured **1.69× base**. |
| `DASH_DIR_MEMORY` | `.35` s | how stale a heading may be and still steer a dash |
| `DASH_INPUT_BUFFER` | `.12` s | unchanged |
| dash cooldown | `.85 × dashCdMul` | unchanged |

**Nulltide's dash interactions are untouched.** With a decoy on the field the
button is still a Time-Swap and nothing else; the dash still lays the wake the
undertow reads; the rewind still carries you if you are standing in your own
wake (`slack water`); and `swapFree` / `swapWave` behave as before. The only
change on that path is that a swap now re-checks the room at the far end (the
decoy may have been standing on a Glassfall pane that has since dropped).

**Dash vs knockback.** A dash zeroes all but `KB_DASH_KEEP` of a live shove —
the dash is the escape, so it wins the argument instead of being bent by it.
Without that, a shove landing one frame before the press curved the dash back
into the hazard you were dashing out of. And because the i-frame covers the
whole launch plus the landing, a new shove cannot land mid-dash at all.

---

## 5 · Arena geometry

`js/11-branch-physics.js`

The old model described a room as "the set of places you may stand" and
snapped you to the nearest legal point. That is where both feel-bugs came
from: at a seam between two of its rects the nearest-point search flipped and
popped you sideways, and every clamp killed your whole velocity instead of the
part driving into the wall.

The model now is one convex floor with **solid boxes** cut out of it. Boxes
may be rotated. Corners are rounded, so a glancing approach deflects instead
of wedging. Collision resolves along the shortest exit and removes only the
component of motion pointing into the wall — that is what makes walls slide.

| Constant | Value | Effect |
|---|---|---|
| `WALL_T` / `WALL_T_HEAVY` | `26` / `38` px | wall thickness |
| `CHOKE_TIGHT` | `84` px | ~3 body widths. Commit or don't. |
| `CHOKE_MID` | `124` px | a door you can back out of |
| `CHOKE_OPEN` | `170` px | wide enough to fight inside |
| `MOVE_SUBSTEP` | `9` px | collision substep (`08-run-and-player.js`) |
| `FLOOR_MIN` | `.87` | the tightest a breathing floor may close |
| `WALL_MAX_R` | `.86` | furthest out a wall in a disc room may reach |
| `TIDE_INSET_MAX` | `96` px | deepest Nulltide's rim closes |

Openings are sized in **pixels**, never fractions, so a chokepoint stays a
chokepoint on a phone and on a 32" monitor.

`FLOOR_MIN` / `WALL_MAX_R` are a **contract, not decoration.** If a shrinking
rim can close inside a wall, the shell pushes you into the wall, the wall
pushes you back past the rim, and you oscillate — permanently stuck. Keeping
walls inside `WALL_MAX_R` and floors outside `FLOOR_MIN` means the rim always
closes onto open floor. **If you move a wall outward in a disc room, check it
against `WALL_MAX_R`** (the harness asserts this).

---

## 6 · Glassfall — the falling floor

| Constant | Value | Effect |
|---|---|---|
| `GLASS_PANE` | `92` px | target pane size (≈13×8 grid at 1280×800) |
| `GLASS_FIRST` | `12` s | into a level before the first pane cracks |
| `GLASS_EVERY` | `6.4` s | gap between shatter events at the start |
| `GLASS_ACCEL` | `.84` | the gap multiplies by this after each event |
| `GLASS_EVERY_MIN` | `2.6` s | tightest the gap gets (reached at ~event 6, ≈50s in) |
| `GLASS_WARN` | `1.5` s | cracking time before a pane drops |
| `GLASS_PER_EVENT` | `2` | panes started per event |
| `GLASS_FLOOR_MIN` | `.46` | fraction of panes that can never be taken |

Measured: **23% of the floor gone after 50s** of play, heading toward the 54%
cap over a full level.

Three guarantees, and they are why this is pressure rather than a lottery:
a pane never starts cracking under you or on a pane you are touching; a pane
may only drop if the panes left over stay **one connected piece of floor**
(flood-filled per candidate); and the **outer ring never drops** — it is the
walkway, and it is the one place a hole would fight the room's own edge on the
same axis. Panes holding a wall up or sitting in a chokepoint are keystone too,
so the room can't shatter a doorway out from under you.

---

## 7 · Emberwake — heatwave and flame spurts

The room breathes: quiet → telegraph → hard push **outward** (toward the rim,
where the floor ends) → a beat → a longer pull **inward** (toward the corona
sweep). Both halves are dangerous for opposite reasons, so neither "hug the
rim" nor "sit in the middle" survives. Each cycle rolls its own quiet length
and its own strength, so it never becomes something you can count along with.

| Constant | Value | Effect |
|---|---|---|
| `HEATWAVE_CALM_MIN/MAX` | `3.2` / `6.4` s | quiet between breaths (rolled per cycle) |
| `HEATWAVE_WARN` | `.85` s | telegraph |
| `HEATWAVE_OUT` | `1.15` s | outward push |
| `HEATWAVE_HOLD` | `.34` s | beat at full extension |
| `HEATWAVE_IN` | `1.40` s | inward pull — the longer, meaner half |
| `HEATWAVE_OUT_V` | `300` px/s | peak outward force (vs 340 base move speed) |
| `HEATWAVE_IN_V` | `250` px/s | peak inward force |
| `HEATWAVE_STR_MIN/MAX` | `.78` / `1.24` | per-cycle strength roll |
| `HEATWAVE_HEAT` | `.22` /s | heat the outward half adds to your gun |

Full cycle ≈ **7–10s**. Force follows a half-sine within each half so it
arrives and leaves smoothly. It runs through the player's `env` channel, not
knockback: it stops when the room stops, and walls cancel it rather than
letting it bank up behind them.

Flame spurts are random **until you stop moving**:

| Constant | Value | Effect |
|---|---|---|
| `SPURT_EVERY_MIN/MAX` | `.9` / `2.2` s | gap between jets |
| `SPURT_WARN` | `.62` s | telegraph |
| `SPURT_R` | `46` px | radius |
| `SPURT_DPS` | `40` | damage per second standing in one |
| `SPURT_LIFE` | `1.3` s | burn duration |
| `SPURT_STILL` | `.8` s | standing still before they start hunting you |
| `SPURT_STILL_SPEED` | `70` px/s | what counts as standing still |
| `SPURT_SPREAD` | `64` px | landing spread, tightening to `.18×` after ~3s planted |

---

## 8 · Terminus — the clock, and the second behind

The floor is a dial and the **minute hand is a real hazard** sweeping the whole
room, so the time is something you physically stay out of the way of. One
revolution per `TERM_HOUR`; reaching twelve **tolls**, the room escalates
permanently, and the hour hand advances so the tier is readable off the dial
with no HUD.

| Constant | Value | Effect |
|---|---|---|
| `TERM_HOUR` | `26` s | seconds per hour — one sweep, and the time between tolls |
| `TERM_TIERS` | `4` | escalation steps before it stops getting worse |
| `TERM_HAND_DMG` | `22` /s | standing in the sweep |
| `TERM_HAND_ENEMY_DMG` | `34` /s | it is not on anybody's side |
| `TERM_HAND_W` | `23` px | half-width of the hand |
| `TERM_TOLL_ENTROPY` | `7` s | taken off the entropy clock per toll |
| `TERM_TOLL_SPAWN` | `2` | bodies pulled in per toll (`+2` from toll 3) |
| `TERM_SPEED_PER_TIER` | `.16` | extra hand speed per tier |
| `TERM_DRAIN_PER_TIER` | `.22` | extra entropy drain per tier |

Escalation ladder: **toll 1** faster hand + faster drain · **toll 2** a second
hand, opposite · **toll 3** faster again, more bodies per toll · **toll 4** a
third hand at 120°, drain roughly doubled. Each toll also fires three
concentric rings out of the spindle (`24` damage each).

Because the hand speeds up, tolls come **sooner** each time: ~26s, then ~22s,
~19s, ~17s. Two tolls land inside the first minute of a level.

**Harder overall:** `TIMELINES.terminus.diff = 1.28` — every body carries 28%
more health and a third of that as extra speed (`spawnEnemy`). Starting
entropy dropped from `60` to `52` (this is branch-wide, in `resetBranchState`).

**The second behind** — the new signature mechanic. The branch keeps a copy of
you and plays it back late: it walks the exact path you walked, fires the shots
you fired, and cannot be killed.

| Constant | Value | Effect |
|---|---|---|
| `BEHIND_DELAY` | `1.15` s | how far behind it runs |
| `BEHIND_START` | `10` s | into a level before it wakes |
| `BEHIND_DPS` | `30` | contact damage per second |
| `BEHIND_SHOT_DMG` | `10` | a replayed shot |
| `BEHIND_SHOT_SPD` | `470` px/s | |
| `BEHIND_STUN` | `1.7` s | a dash through it stalls it |
| `BEHIND_SAMPLE` | `.05` s | path resolution |

It never needs to path around anything (it is on ground you already stood on)
so it cannot get stuck in geometry and cannot be cheesed by cover. It punishes
**repetition** — a loop, a corner you keep retreating to — and is harmless if
you break your own pattern. While stunned it stops consuming the trail, so it
falls *further* behind: the stun buys real distance, not just a pause. That is
the reworked dash's use here.

---

## 9 · Where the layouts live

`LAYOUTS` in `js/11-branch-physics.js` — twelve rooms, three per branch, held
to four rules (cover that breaks a real sightline, at least one chokepoint,
no two the same shape reskinned, and boss rooms keep the middle clear).

Each layout returns `{ boxes, gates }`. `gates` are the chokepoints, and they
are load-bearing data, not annotation: the Glassfall floor reads them to refuse
to shatter a doorway away.
