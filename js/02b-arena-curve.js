/* The 15-level curve every arena runs on, the barrier-drone roster addition,
   and the first-clear reward attached to each level.

   An arena used to be three to six levels long and its difficulty came out
   of one formula reading G.levelIdx. It is fifteen levels long now, split
   into four tiers with four different jobs:

     LEARN     1-4    teach one specific trick per level, and turn the
                      arena's signature hazard on ONE PIECE AT A TIME
                      instead of all at once
     BUILD     5-9    meet the rest of the roster, one new body per level,
                      hazard fully on, no new idea — this is the gym
     MASTER   10-14   a hand-designed puzzle each, built out of that arena's
                      own real mechanics, meant to beat you once
     RECKONING  15    the arena boss, and the hardest fight in the game

   Difficulty is no longer implied by the level's index. Every level carries
   an explicit `dt` (the difficulty tier the spawn maths reads) and `bud`
   (its base wave budget), so the curve is a table you can read and move
   rather than a slope you have to solve for. See CALIBRATION below for what
   the numbers are anchored to. */

/* ---------------- the barrier drone ------------------------------------
   The room used to be the obstacle: every level cut a fixed set of solid
   boxes out of its floor (the LAYOUTS table in 11-branch-physics.js), and
   those boxes were the cover, the broken sightlines and the chokepoints.
   The main arenas don't do that any more — they are open floor now, and
   the cover walks in with the wave.

   One enemy, four skins. It projects a standing wall segment that other
   enemies and your shots have to go around, and that wall stands until the
   drone dies or its timer runs out. Same tactical job as the old geometry,
   except the player can delete it by choosing to. Terminus is not in this
   list on purpose: its room geometry IS the clock, and was never on the
   chopping block. */
Object.assign(EN, {
  pylon: { hp: 132, sp: 54, r: 17, dmg: 18, cost: 4, wt: 2.2, score: 58, shards: 3, col: "143,200,255",
    label: "Pylon", note: "Plants a hard-light panel across the floor and hides the room behind it. The panel is not the target — it is." },
  pane: { hp: 124, sp: 58, r: 17, dmg: 18, cost: 4, wt: 2.1, score: 58, shards: 3, col: "196,236,255",
    label: "Pane", note: "Stands a sheet of the branch's own unfallen glass on end. It looks like the scenery, and it blocks like a wall." },
  shimmer: { hp: 128, sp: 56, r: 17, dmg: 20, cost: 4, wt: 2.1, score: 60, shards: 3, col: "255,196,132",
    label: "Shimmer", note: "Hangs a curtain of heat haze that your pulses will not cross. It moves the chokepoints while the room is breathing." },
  bulkhead: { hp: 140, sp: 50, r: 18, dmg: 18, cost: 4, wt: 2.4, score: 60, shards: 3, col: "110,190,225",
    label: "Bulkhead", note: "Holds a standing wall of pressurised water. The current goes around it, and so does everything the current is carrying." },
});
/* which skin each arena's drone wears */
const ARENA_DRONE = { ch09: "pylon", glassfall: "pane", emberwake: "shimmer", nulltide: "bulkhead", terminus: null };

/* ---------------- hazard staging ---------------------------------------
   Every arena's signature hazard is more than one moving part bundled into
   one `mech` blurb — Emberwake's heat gauge and its breathing room and its
   floor spurts are three separate systems. Tier 1 turns them on one at a
   time, which is what makes levels 1-4 teach instead of just being easier.

   A level's `stage` object says which parts are live and how hard. Anything
   a level doesn't mention falls back to STAGE_FULL, so survival, the attract
   loop and any level authored without a stage all behave exactly as they
   always have. Read it with levelStage(). */
const STAGE_FULL = {
  /* glassfall */ floor: 1, floorRate: 1, discs: 1, discRate: 1,
  /* emberwake */ heat: 1, heatDecay: 1, wave: 1, waveIn: 1, waveStr: 1, waveCalm: 1, waveHold: 1,
  spurts: 1, spurtRate: 1, spurtStill: 1, corona: 1,
  /* nulltide  */ current: 1, currentStr: 1, rewind: 1, rewindEvery: 1,
  /* terminus  */ clock: 1, hands: 3, toll: 1, behind: 1, entropy: 1,
};
function levelStage() {
  if (G.survival || G.attract) return STAGE_FULL;
  const L = curLevel();
  return (L && L.stage) || STAGE_FULL;
}
/* one knob, with STAGE_FULL's value as the default — so a stage object only
   ever has to name the things it actually changes */
function stageOf(k) {
  const s = levelStage();
  return s[k] !== undefined ? s[k] : STAGE_FULL[k];
}

/* ---------------- CALIBRATION ------------------------------------------
   Tuned against what the game did BEFORE this rework, not from zero. The
   old difficulty tier was `G.loop * 6 + G.levelIdx + (G.wave - 1) * .3` and
   the old wave budget was `12 + tier * 3.8 + n * 3.4`. Those two numbers are
   what every reference point below is quoted in:

     today's level 2, wave 2      tier 1.3   budget 23.7   <- the old opening
     today's hardest ordinary
       content (ch09 level 5,
       wave 4)                    tier 4.9   budget 44.2
     today's boss level           tier 5.9   + the boss

   The four tiers are aimed at those marks:

     LEARN      lands a little ABOVE today's level-2 wave-2 — the old
                opening was too soft and this tier is the new floor
     BUILD      lands around today's hardest ordinary content — what used
                to be the peak becomes the gym
     MASTER     lands around today's boss level — today's finale becomes
                tomorrow's mid-tier puzzle
     RECKONING  lands well past any boss in the game today, on both the
                difficulty tier and a direct multiplier on the boss itself
                (bossMul), because a finale that reads as easy is the one
                complaint this rework exists to answer */
const DT_LEARN = [1.6, 2.2, 2.8, 3.4];
const DT_BUILD = [4.2, 4.8, 5.4, 6.0, 6.6];
const DT_MASTER = [7.5, 8.2, 8.9, 9.6, 10.4];
const DT_BOSS = 13;
const BUD_LEARN = [14, 15, 16.5, 18];
const BUD_BUILD = [20, 21.5, 23, 24.5, 26];
const BUD_MASTER = [26, 27.5, 29, 30.5, 32];
const BUD_BOSS = 30;
/* target clear times for the +10% "fast" trophy bonus, per tier */
const PAR_LEARN = 55, PAR_BUILD = 78, PAR_MASTER = 96, PAR_BOSS = 155;

const LEVELS_PER_ARENA = 15;
const TIER_OF = (i) => (i < 4 ? 1 : i < 9 ? 2 : i < 14 ? 3 : 4);
const TIER_NAME = ["", "Learn", "Build", "Master", "Reckoning"];
/* where each tier starts, for the seams the map screen draws between them */
const TIER_STARTS = [0, 4, 9, 14];

/* ---------------- first-clear rewards ----------------------------------
   Two tracks, so replaying has something to chase after the first clear has
   already paid out (see the trophy ladder in 02c-trophy-road.js).

   This is the FIRST-CLEAR track: a fixed, one-time grant the first time a
   level is beaten. Every level pays shards, scaled by how deep it sits in
   the 75-level sequence. Five levels per arena — 3, 6, 9, 12 and 15 — also
   pay a named unlock, which is how the entire ability catalogue and the
   entire cosmetic catalogue become earnable by playing rather than only by
   grinding shards for them. The tier seams (4, 9, 14) pay an archive entry,
   so the lore arrives on the same beat the difficulty steps up.

   A reward is { shards, cosmetic, ability, lore } and any field may be
   omitted. grantReward() in 02c-trophy-road.js is the only thing that reads
   it, and it is also the single place a future gacha "double this" hook
   would multiply — which is why nothing else in the codebase grants a
   first-clear reward directly. */
const ARENA_UNLOCKS = {
  ch09: {
    2: { ability: "piledriver" }, 5: { cosmetic: "trail_matrix" }, 8: { ability: "overclock" },
    11: { cosmetic: "skin_wire" }, 14: { ability: "brand" },
    3: { lore: "ch1" }, 13: { lore: "ch3" },
  },
  glassfall: {
    2: { ability: "shrapnel" }, 5: { cosmetic: "boom_pixel" }, 8: { ability: "stutter" },
    11: { cosmetic: "trail_glitch" }, 14: { ability: "rewind" },
    3: { lore: "gl1" }, 13: { lore: "gl2" },
  },
  emberwake: {
    2: { ability: "well" }, 5: { cosmetic: "boom_rings" }, 8: { ability: "secondtrigger" },
    11: { cosmetic: "pal_solar" }, 14: { ability: "detonate" },
    3: { lore: "em1" }, 13: { lore: "em2" },
  },
  nulltide: {
    2: { ability: "conduit" }, 5: { cosmetic: "skin_static" }, 8: { ability: "harvest" },
    11: { cosmetic: "pal_synthwave" }, 14: { ability: "counterweight" },
    3: { lore: "nt1" }, 13: { lore: "nt2" },
  },
  terminus: {
    2: { cosmetic: "trail_rainbow" }, 5: { cosmetic: "skin_neon" }, 8: { cosmetic: "boom_glyph" },
    11: { cosmetic: "pal_gameboy" }, 14: { lore: "tm3" },
    3: { lore: "tm1" }, 13: { lore: "tm2" },
  },
};
/* shards scale with the level's position in the whole 75-level sequence, so
   a Terminus level pays roughly fifteen times what Chamber 09's first does */
function rewardFor(arenaId, idx) {
  const pos = globalLevelPos(arenaId, idx);
  const r = { shards: 60 + pos * 14 };
  const extra = (ARENA_UNLOCKS[arenaId] || {})[idx];
  if (extra) Object.assign(r, extra);
  return r;
}

/* ---------------- tier 1 + 2: the templated nine -----------------------
   These nine come out of a curve rather than being authored one by one, so
   the whole loop can be tested end to end without waiting on 30 hand-made
   levels. What varies is the roster (one new body per level through the
   Build tier), the wave count, and — through tier 1 only — which parts of
   the arena's hazard are switched on.

   `pal` is the level's audio/backdrop palette, taken from the arena's own
   authored levels so the templated nine still sound and look like the place
   they are in rather than like a spreadsheet. */
function curveLevel(A, i, o) {
  const tier = TIER_OF(i);
  const pal = A.pal[i % A.pal.length];
  const dt = tier === 1 ? DT_LEARN[i] : tier === 2 ? DT_BUILD[i - 4] : DT_MASTER[i - 9];
  const bud = tier === 1 ? BUD_LEARN[i] : tier === 2 ? BUD_BUILD[i - 4] : BUD_MASTER[i - 9];
  const par = tier === 1 ? PAR_LEARN : tier === 2 ? PAR_BUILD : PAR_MASTER;
  return Object.assign({
    tier, dt, bud, par,
    env: A.env, waves: tier === 1 ? 3 : 4,
    waveTemplates: A.templates,
    key: pal.key, mode: pal.mode, prog: pal.prog, voice: pal.voice,
    dark: pal.dark, light: pal.light, accent: pal.accent,
    reward: rewardFor(A.id, i),
  }, o);
}

/* ---------------- the arena definitions --------------------------------
   Everything the curve needs that is specific to one arena: which two
   bodies lead, which three fill out the Build tier, how the hazard comes on
   through the Learn tier, and the five hand-authored Master levels.

   The Master five are the tier this whole rework was really about — one
   distinct idea each, built from that arena's own mechanics, meant to be
   genuinely hard to read the first time. They are commented individually
   because the design intent is not recoverable from the data. */
const ARENA_CURVE = {

  /* =================== CHAMBER 09 ==================================== */
  /* The one arena with no signature hazard, which changes both ends of the
     curve. Its Learn tier teaches the universal skill instead — the dash's
     actual shape — and its Master tier is allowed to be purely "the hardest
     enemy combinations" rather than a hazard puzzle. */
  ch09: {
    id: "ch09", env: "motes", templates: ["pincer", "swarmElite"],
    lead: ["husk", "dart"],
    build: [["bloom", "spore"], ["colossus", "bulwark"], ["weaver", "needle"],
            ["pylon", "howitzer"], ["mimic", "mirror", "hexer"]],
    pal: [
      { key: 0, mode: "aeolian", prog: [0, -3, -5, -3], voice: 0, dark: ["#101a36", "#050914"], light: ["#f6f9ff", "#dde6f6"], accent: "111,242,255" },
      { key: 3, mode: "dorian", prog: [0, 2, -3, -5], voice: 1, dark: ["#2a1c12", "#0d0806"], light: ["#fdf6ec", "#eadfcd"], accent: "255,168,92" },
      { key: -2, mode: "pent", prog: [0, -5, 2, -3], voice: 2, dark: ["#0c2a1e", "#04120c"], light: ["#eefaf1", "#d3e9d9"], accent: "126,240,168" },
      { key: 5, mode: "phrygian", prog: [0, 1, -4, -5], voice: 0, dark: ["#2b0f2a", "#100510"], light: ["#fdf0fb", "#e8d6ea"], accent: "255,122,217" },
      { key: 7, mode: "lydian", prog: [0, 4, 2, -3], voice: 1, dark: ["#161436", "#070613"], light: ["#f4f2ff", "#dedbf3"], accent: "176,125,255" },
    ],
    /* no branch physics to stage, so the Learn tier stages the DASH: each
       level is built so one property of it is the answer. */
    learn: [
      { name: "Cold Boot", hook: "Two kinds of trouble and nothing else in the room. Walk, shoot, and find out what the frame does.",
        types: ["husk"], intro: ["husk"], envIntro: "Nothing in this room is faster than you are." },
      { name: "Steering", hook: "The dash goes where you are steering, not where you are pointing. The gun keeps facing what it was shooting.",
        types: ["husk", "dart"], intro: ["dart"], envIntro: "Dash across the lunge, not away from it." },
      { name: "The Grace Window", hook: "Darts lunge twice. The dash stays invulnerable past the end of the launch, which is longer than it looks.",
        types: ["husk", "dart"], intro: [], waveTemplates: ["pincer", "surround"] },
      { name: "Burst Speed", hook: "Something comes out of the dash faster than it went in. The room is about to need that.",
        types: ["husk", "dart", "bloom"], intro: ["bloom"], waveTemplates: ["surround", "swarmElite"] },
    ],
    master: [
      /* 10 — two leash mechanics at once. Warden drags you back inside its
         ring; Revenant blinks to where you are ABOUT to be. The leash tells
         you where you have to stand and the blink punishes standing there,
         so the level is a fight about which rule to break. */
      { name: "The Long Leash", hook: "One of them decides where you are allowed to stand. The other one has already been there.",
        types: ["warden", "revenant", "husk"], intro: ["warden"], waveTemplates: ["surround", "pincer"] },
      /* 11 — both bodies in this room read your movement: Mimic replays the
         path you walked a second and a half ago, Mirror holds the exact
         opposite of your position. Moving predictably is the only thing
         that loses. */
      { name: "Reflection Test", hook: "Everything in here has been watching how you move. Two of them have finished taking notes.",
        types: ["mimic", "mirror", "dart"], intro: [], waveTemplates: ["pincer", "surround"] },
      /* 12 — nothing walks to you. Howitzers drop shells on ground you are
         heading for and leave it burning; Hexers rotate three beams through
         the whole room. The floor becomes the threat and the enemies are
         just the reason it moves. */
      { name: "Counterbattery", hook: "None of them are coming. They have decided the floor can do it.",
        types: ["howitzer", "hexer", "needle"], intro: [], waveTemplates: ["surround", "surround"] },
      /* 13 — the division room. Broodmother never stops laying, Spore
         splits into three, Bloom's death hurts its own neighbours. Killing
         the wrong thing first is how this level ends. Chaos, not a puzzle
         — deliberately the opposite flavour from 10-12. */
      { name: "The Nursery", hook: "Everything in this room gets bigger when it dies. Choose carefully which part of it you do first.",
        types: ["broodmother", "spore", "bloom", "mote"], intro: [], waveTemplates: ["swarmElite", "surround"] },
      /* 14 — the payoff level for the barrier drone, and the preview of
         what the boss room is about to ask. Pylons put the cover back into
         a room that has not had any, and everything heavy in the roster is
         standing behind it. */
      { name: "Hard Light", hook: "The room has been empty for thirteen levels. Something just decided to build walls in it.",
        types: ["pylon", "colossus", "bulwark", "revenant"], intro: ["pylon"], waveTemplates: ["pincer", "surround"] },
    ],
  },

  /* =================== GLASSFALL ===================================== */
  glassfall: {
    id: "glassfall", env: "glass", templates: ["pincer", "swarmElite"],
    lead: ["facet", "rime"],
    build: [["prism"], ["silica"], ["kelvin"], ["pane"], []],
    pal: [
      { key: 2, mode: "lydian", prog: [0, 4, 2, -3], voice: 0, dark: ["#0e2436", "#040a12"], light: ["#f2fbff", "#d8e9f4"], accent: "168,232,255" },
      { key: 4, mode: "lydian", prog: [0, 2, 4, -1], voice: 1, dark: ["#12283c", "#050c16"], light: ["#eef8ff", "#d2e4f2"], accent: "214,246,255" },
      { key: 0, mode: "lydian", prog: [0, 6, 4, -2], voice: 2, dark: ["#0a1e30", "#03080f"], light: ["#f6fcff", "#dbeaf6"], accent: "186,238,255" },
    ],
    /* the floor before the discs, and the discs as a hazard before the
       discs as a tool */
    learn: [
      { name: "Fracture Line", hook: "The dust isn't falling. Then a piece of it turns to look at you.",
        types: ["facet"], intro: ["facet"], stage: { floor: 0, discs: 0 },
        envIntro: "The floor is still holding. It will not be." },
      { name: "Underfoot", hook: "Panes start dropping through the floor. The room you finish in is not the room you started in.",
        types: ["facet", "rime"], intro: ["rime"], stage: { floor: 1, floorRate: 1.9, discs: 0 },
        envIntro: "Panes crack before they drop. The crack is the warning." },
      { name: "Cold Open", hook: "Discs of stopped time open across whatever floor is left. Inside one, everything runs at a third speed — you included.",
        types: ["facet", "rime"], intro: [], stage: { floor: 1, floorRate: 1.5, discs: 1, discRate: 1.4 },
        envIntro: "Do not walk into a disc to escape something." },
      { name: "Leverage", hook: "Your pulses hit twice as hard inside a disc, and anything that dies in there shatters into its neighbours.",
        types: ["facet", "rime", "prism"], intro: ["prism"], stage: { floor: 1, floorRate: 1.2, discs: 1, discRate: 1.2 },
        waveTemplates: ["surround", "pincer"], envIntro: "Now walk into one on purpose." },
    ],
    master: [
      /* 10 — the keystone panes (the ones under chokepoints that never
         break, GLASS_FLOOR_MIN) are the only ground guaranteed to still be
         there in a minute. Silica plants its beam pillars, and the pillars'
         crossing beams cover exactly that ground. The floor tells you where
         to stand and the pillars tell you not to. */
      { name: "Keystone", hook: "Some of this floor is never going to fall. Something has worked out which parts, and put a pillar on each one.",
        types: ["silica", "facet", "rime"], intro: ["silica"], stage: { floorRate: .62, discRate: .7 },
        waveTemplates: ["surround", "pincer"] },
      /* 11 — a Kelvin's ring of cold is the damage and the middle is safe
         until it closes. Standing in a stasis disc runs YOU at a third
         speed too, so you cannot simply walk out — but your pulses hit
         twice as hard in there, so the ring is survivable if you out-damage
         it rather than out-run it. The level's whole idea is that the disc
         is a tool with a real cost, not a hazard. */
      { name: "Cold Reading", hook: "The ring is the damage and the middle is safe, right up until the middle stops being the middle.",
        types: ["kelvin", "rime", "facet"], intro: ["kelvin"], stage: { discRate: 1.8, floorRate: .8 },
        waveTemplates: ["surround", "surround"] },
      /* 12 — Prisms throw your pulses back off the lit face, so the answer
         is normally to walk to the dark side. Here the floor is dropping
         fast enough that the walk around is not always available, and the
         other answer — dash straight through the column — is the one the
         level is actually teaching. */
      { name: "Total Internal", hook: "Shoot the dark side. Assuming there is still a floor between you and the dark side.",
        types: ["prism", "facet", "rime"], intro: [], stage: { floorRate: .5, discs: 1, discRate: .6 },
        waveTemplates: ["pincer", "surround"] },
      /* 13 — no puzzle. The floor goes at its maximum rate to the minimum
         it is allowed to reach, the full roster is in the room, and the
         wave template is the swarm. Manage chaos; do not solve anything. */
      { name: "The Thin Ice", hook: "Half this room is going to be gone in ninety seconds and none of it is going to wait for you.",
        types: ["facet", "prism", "rime", "silica", "kelvin"], intro: [], stage: { floorRate: .34, discRate: 1.5 },
        waveTemplates: ["swarmElite", "swarmElite"] },
      /* 14 — the barrier drone's payoff here, and the nastiest version of
         it in the game: a Pane's projected wall is made of the same glass
         as the scenery, so the one piece of cover in the room is the one
         piece of the room that is not falling. */
      { name: "Pane and Counterpane", hook: "It stands a sheet of glass on end. That sheet is now the only part of this floor you can trust.",
        types: ["pane", "silica", "kelvin", "prism"], intro: ["pane"], stage: { floorRate: .55 },
        waveTemplates: ["surround", "pincer"] },
    ],
  },

  /* =================== EMBERWAKE ===================================== */
  emberwake: {
    id: "emberwake", env: "ember", templates: ["swarmElite", "pincer"],
    lead: ["cinder", "filament"],
    build: [["corona"], ["helion"], ["ignis"], ["shimmer"], []],
    pal: [
      { key: 5, mode: "phrygian", prog: [0, 1, -4, -5], voice: 0, dark: ["#33150a", "#0f0503"], light: ["#fff4e6", "#f0dcc2"], accent: "255,206,120" },
      { key: 3, mode: "phrygian", prog: [0, -2, 1, -5], voice: 1, dark: ["#3a1b08", "#120703"], light: ["#fff1de", "#eed6b6"], accent: "255,166,72" },
      { key: 7, mode: "phrygian", prog: [0, 1, -3, -7], voice: 2, dark: ["#41180a", "#160604"], light: ["#fff2e2", "#f2d8ba"], accent: "255,176,84" },
    ],
    /* the worked example from the plan: heat, then the outward push, then
       the full breath — and the closing level is the two tricks together */
    learn: [
      { name: "First Vent", hook: "No shade, no evening, and nothing in the room but the two things that live here.",
        types: ["cinder"], intro: ["cinder"], stage: { heat: 0, wave: 0, spurts: 0, corona: 0 },
        envIntro: "A plain shooting gallery. Get comfortable in the room." },
      { name: "Cold Start", hook: "The gun runs a heat gauge now. Hold the trigger too long and it jams — and dashing vents it instantly.",
        types: ["cinder", "filament"], intro: ["filament"], stage: { heat: 1, wave: 0, spurts: 0, corona: 1 },
        envIntro: "The dash is not only for dodging. It is your vent." },
      { name: "First Breath", hook: "Every so often the room breathes out, hard, toward the rim. That is all it does for now.",
        types: ["cinder", "filament"], intro: [], stage: { heat: 1, wave: 1, waveIn: 0, waveStr: .55, spurts: 0, corona: 1 },
        envIntro: "Stand off the rim, or time a dash across the push." },
      { name: "Give and Take", hook: "Out, then back in. And riding the push cooks your gun faster, which is the part that catches people.",
        types: ["cinder", "filament", "corona"], intro: ["corona"], stage: { heat: 1, wave: 1, waveStr: .7, spurts: 1, spurtRate: .6, corona: 1 },
        waveTemplates: ["surround", "swarmElite"], envIntro: "Vent during the push instead of fighting it." },
    ],
    master: [
      /* 10 — Filament pairs string a burning wire between the two of them,
         and they are placed where the heatwave's inward pull drags you. The
         safe path from the breath and the safe path around the wire are not
         the same path, and the level does not let you have both. */
      { name: "Vent Row Reprise", hook: "The wire is strung exactly where the room is about to pull you. Pick which rule you are breaking.",
        types: ["filament", "cinder"], intro: [], stage: { waveStr: 1.25, spurtRate: .8 },
        waveTemplates: ["pincer", "pincer"] },
      /* 11 — the breath's pause phase runs long, and floor spurts hunt
         anything standing still (SPURT_STILL — they already tighten and
         re-target on a stationary target). This level punishes camping, on
         purpose, and nothing else. */
      { name: "The Long Hold", hook: "The room holds its breath for a very long time. The floor uses the gap to find out where you stopped.",
        types: ["ignis", "cinder", "filament"], intro: [], stage: { waveHold: 3.4, waveCalm: 1.5, spurtRate: 1.7, spurtStill: .45 },
        waveTemplates: ["surround", "swarmElite"] },
      /* 12 — Helions fire faster the hotter your gun runs, and an Ignis is
         laying spurts underneath them. Only survivable if you spend dashes
         venting heat rather than saving them all for dodging, so the
         mobility tool becomes a resource decision. Heat bleeds off slower
         here so you cannot simply wait it out. */
      { name: "Helion's Choice", hook: "Both of them read your heat gauge. Your escape button is also your cooling system. Choose.",
        types: ["helion", "ignis"], intro: [], stage: { heatDecay: .45, spurtRate: 1.2 },
        waveTemplates: ["pincer", "surround"] },
      /* 13 — the whole breath cycle on a much shorter timer, so the calm
         windows barely exist, layered with the swarm template. A chaos
         test, the opposite flavour from 10-12 on purpose. */
      { name: "Cross Currents", hook: "The calm between breaths has stopped being long enough to be a plan.",
        types: ["cinder", "filament", "corona", "helion", "ignis"], intro: [], stage: { waveCalm: .38, waveStr: 1.1 },
        waveTemplates: ["swarmElite", "swarmElite"] },
      /* 14 — the barrier drone's payoff, and the preview of the boss room:
         Shimmers move the chokepoints while the room is still breathing, so
         cover that was safe one breath ago is in the push lane on the next. */
      { name: "The Narrows", hook: "It hangs a curtain of haze your pulses will not cross, and then the room breathes and moves it.",
        types: ["shimmer", "helion", "corona", "ignis"], intro: ["shimmer"], stage: { waveStr: 1.15 },
        waveTemplates: ["surround", "pincer"] },
    ],
  },

  /* =================== NULLTIDE ====================================== */
  nulltide: {
    id: "nulltide", env: "abyss", templates: ["pincer", "surround"],
    lead: ["fathom", "undine"],
    build: [["caustic"], ["sounding"], ["trench"], ["bulkhead"], []],
    pal: [
      { key: -2, mode: "dorian", prog: [0, -3, 2, -5], voice: 0, dark: ["#052a30", "#010e12"], light: ["#ecfcfb", "#cfe8e6"], accent: "104,232,222" },
      { key: 0, mode: "dorian", prog: [0, 2, -3, -5], voice: 1, dark: ["#04222e", "#010a10"], light: ["#eaf9ff", "#cbe2ee"], accent: "126,246,196" },
      { key: -4, mode: "dorian", prog: [0, -5, -3, -7], voice: 2, dark: ["#031c28", "#01070d"], light: ["#e9fbff", "#c9e0ec"], accent: "96,222,232" },
    ],
    /* the current, then the rewind, then the fact that your own wake is the
       one thing down here the rewind respects */
    learn: [
      { name: "The Shelf", hook: "Shallow water again, five branches later. It remembers you, which is the problem.",
        types: ["fathom"], intro: ["fathom"], stage: { current: 1, currentStr: .5, rewind: 0 },
        envIntro: "There is a current. Everything loose is in it, including you." },
      { name: "Set and Drift", hook: "The current turns as it runs, so the direction it was pushing you a moment ago is not the direction it is pushing you now.",
        types: ["fathom", "undine"], intro: ["undine"], stage: { current: 1, currentStr: .85, rewind: 0 },
        envIntro: "Lead a target with the drift, not across it." },
      { name: "Slack", hook: "Every so often the tide rewinds and everything in the room snaps back to where it stood two seconds ago.",
        types: ["fathom", "undine"], intro: [], stage: { current: 1, rewind: 1, rewindEvery: 1.6 },
        envIntro: "The rewind is announced. That is the only warning you get." },
      { name: "Wake", hook: "Your own wake stays solid through the rewind. Stand in it and the tide carries you with it instead of past you.",
        types: ["fathom", "undine", "caustic"], intro: ["caustic"], stage: { current: 1, rewind: 1, rewindEvery: 1.2 },
        waveTemplates: ["surround", "pincer"], envIntro: "Lay a path before you need one." },
    ],
    master: [
      /* 10 — the wake stops being a side effect and becomes a route you lay
         on purpose. Trenches submerge and surface where you were standing;
         the rewind comes often enough that the only reliable escape is a
         wake trail you drew before you needed it. */
      { name: "Slack Water", hook: "It surfaces where you were standing. The only way not to be there is to have already drawn somewhere else.",
        types: ["trench", "fathom", "undine"], intro: ["trench"], stage: { rewindEvery: .62, currentStr: 1.15 },
        waveTemplates: ["surround", "pincer"] },
      /* 11 — Caustics walk a lens's focal point across the floor and only
         the bright spot burns, which is ordinarily easy to step out of. The
         current here is strong enough that "step out of it" is not a step
         you fully control, so the answer is to fight the drift rather than
         the lens. */
      { name: "The Focal Plane", hook: "Only the bright spot burns. The room has opinions about where you are standing.",
        types: ["caustic", "undine", "fathom"], intro: [], stage: { currentStr: 1.9, rewindEvery: 1.1 },
        waveTemplates: ["pincer", "surround"] },
      /* 12 — Soundings drop charges on a count and the tide arranges them,
         so they detonate together rather than in the order they were laid.
         A frequent rewind re-arranges the field mid-count, which means the
         pattern you read is never the pattern that goes off. */
      { name: "Depth Array", hook: "It lays them in order. The tide does not keep them in order. They go off together anyway.",
        types: ["sounding", "caustic", "fathom"], intro: [], stage: { rewindEvery: .55 },
        waveTemplates: ["surround", "surround"] },
      /* 13 — the chaos test. Everything in the roster, the current at full
         strength, and the rewind often enough that the room resets its own
         geometry faster than you can finish reading it. */
      { name: "Full Fathom", hook: "Everything filed in this branch is in the room and the tide keeps putting it back.",
        types: ["fathom", "undine", "caustic", "trench", "sounding"], intro: [], stage: { rewindEvery: .5, currentStr: 1.4 },
        waveTemplates: ["swarmElite", "swarmElite"] },
      /* 14 — the barrier drone's payoff. A Bulkhead's wall stops the
         current as well as the shots, so the room acquires still water on
         one side of it — which is the only place the drift stops fighting
         your aim, and also the place everything else is heading for. */
      { name: "The Bulkheads", hook: "The wall stops the current too. Everything in the room has noticed that, including you.",
        types: ["bulkhead", "trench", "sounding", "caustic"], intro: ["bulkhead"], stage: { currentStr: 1.3, rewindEvery: .8 },
        waveTemplates: ["pincer", "surround"] },
    ],
  },

  /* =================== TERMINUS ====================================== */
  /* The one arena that keeps its real room geometry (see LAYOUTS) and gets
     no barrier drone: the walls here ARE the clock, and the clock is the
     branch. Its Learn tier stages the clock instead. */
  terminus: {
    id: "terminus", env: "terminus", templates: ["surround", "pincer"],
    lead: ["vestige", "coda"],
    build: [["nullc"], ["epilogue"], ["zenith"], [], []],
    pal: [
      { key: 0, mode: "aeolian", prog: [0, -3, -5, -3], voice: 0, dark: ["#1a1a1e", "#08080a"], light: ["#f6f5f2", "#dedcd6"], accent: "196,196,204" },
      { key: -3, mode: "aeolian", prog: [0, -2, -5, -7], voice: 1, dark: ["#1e1c1a", "#0a0908"], light: ["#f8f6f1", "#e0dcd3"], accent: "232,206,150" },
      { key: 0, mode: "aeolian", prog: [0, -5, -7, -8], voice: 2, dark: ["#221f1a", "#0b0a08"], light: ["#fbf8f1", "#e6e0d4"], accent: "255,222,150" },
    ],
    learn: [
      { name: "The Repeat", hook: "You have been in this room. The wireframes walking toward you have been in it longer.",
        types: ["vestige"], intro: ["vestige"], stage: { clock: 0, toll: 0, behind: 0, entropy: 0 },
        envIntro: "The floor is a dial. Nothing is turning on it yet." },
      { name: "One Hand", hook: "The hand on the dial is real, it is moving, and standing in the sweep costs you.",
        types: ["vestige", "coda"], intro: ["coda"], stage: { clock: 1, hands: 1, toll: 0, behind: 0, entropy: 0 },
        envIntro: "Stay out of the sweep. That is the whole lesson." },
      { name: "The Hour Turns", hook: "Every time the hand passes twelve the room tolls and gets permanently worse. It does not toll back.",
        types: ["vestige", "coda"], intro: [], stage: { clock: 1, hands: 2, toll: 1, behind: 0, entropy: 1 },
        envIntro: "Kills put seconds back on the entropy clock." },
      { name: "Understudy", hook: "It keeps a copy of you one second back, walking your route and firing your shots. Dash through it to stall it.",
        types: ["vestige", "coda", "nullc"], intro: ["nullc"], stage: { clock: 1, hands: 2, toll: 1, behind: 1, entropy: 1 },
        waveTemplates: ["pincer", "surround"], envIntro: "It is you. It is not on your side." },
    ],
    master: [
      /* 10 — two hands, deliberately out of phase, so the gap that was safe
         on the first sweep is the gap the second one is closing. */
      { name: "The Second Hand", hook: "There are two of them now and they do not agree about where the safe wedge is.",
        types: ["coda", "vestige"], intro: [], stage: { hands: 2, toll: 1 },
        waveTemplates: ["surround", "surround"] },
      /* 11 — Epilogue writes one line across the floor and the line is what
         kills you when it finishes. Several at once, with the entropy clock
         draining fast, so reading them early is the only way to have time. */
      { name: "Dictation", hook: "Three of them are writing at once. When a line finishes, the line is what kills you. Read early.",
        types: ["epilogue", "coda"], intro: ["epilogue"], stage: { hands: 2, toll: 1 },
        waveTemplates: ["surround", "pincer"] },
      /* 12 — Null swallows your pulses and hands them back with your name
         on them. In a room this full, the thing that kills you is almost
         always something you fired. */
      { name: "Null Set", hook: "It eats your pulses and gives them back. Everything that hits you in here, you paid for.",
        types: ["nullc", "vestige", "coda"], intro: [], stage: { hands: 3, toll: 1 },
        waveTemplates: ["pincer", "surround"] },
      /* 13 — the chorus. Codas count three and fire on four; several of
         them resolving on the same beat is the chaos test, and it is also
         where the Chorus secret lives. */
      { name: "Stretto", hook: "They all count the same four beats. Nothing is stopping several of them from finishing together.",
        types: ["coda", "vestige", "epilogue", "nullc"], intro: [], stage: { hands: 3, toll: 1 },
        waveTemplates: ["swarmElite", "swarmElite"] },
      /* 14 — Zenith is wearing your build. Three of them, plus the second
         behind, which is also wearing your build. The whole level is the
         game asking whether your loadout is actually good or just familiar. */
      { name: "Full Draft", hook: "Whatever you drafted, it drafted too, and it has had considerably more practice with it.",
        types: ["zenith", "nullc", "epilogue"], intro: ["zenith"], stage: { hands: 3, toll: 1 },
        waveTemplates: ["pincer", "surround"] },
    ],
  },
};

/* ---------------- building the fifteen ---------------------------------- */
/* The roster the Build tier has accumulated by level i: the two leads, plus
   every group introduced at or before this level. */
function buildRoster(A, i) {
  const out = A.lead.slice();
  for (let k = 0; k <= i - 4 && k < A.build.length; k++)
    for (const t of A.build[k]) if (out.indexOf(t) < 0) out.push(t);
  return out;
}
function buildArenaLevels(arenaId, bossLevel) {
  const A = ARENA_CURVE[arenaId];
  const out = [];
  /* --- LEARN: 1-4 --- */
  A.learn.forEach((L, i) => out.push(curveLevel(A, i, L)));
  /* --- BUILD: 5-9 --- */
  for (let i = 4; i < 9; i++) {
    const group = A.build[i - 4] || [];
    const types = buildRoster(A, i);
    out.push(curveLevel(A, i, {
      name: BUILD_NAMES[arenaId][i - 4],
      hook: BUILD_HOOKS[arenaId][i - 4],
      types, intro: group,
      /* the last two Build levels mix the full roster at rising density
         rather than adding anything new — the gym, not the exam */
      waveTemplates: i >= 7 ? ["swarmElite", "surround", "pincer"] : A.templates,
    }));
  }
  /* --- MASTER: 10-14 --- */
  A.master.forEach((L, i) => out.push(curveLevel(A, 9 + i, L)));
  /* --- RECKONING: 15 --- */
  out.push(Object.assign({}, bossLevel, {
    tier: 4, dt: DT_BOSS, bud: BUD_BOSS, par: PAR_BOSS,
    /* the finale is the hardest fight in the game by a clear margin: the
       difficulty tier above puts its ordinary bodies past anything else in
       the arena, and this multiplier is applied to the boss itself on top
       (see spawnEnemy). Bosses read as too easy today for what they are. */
    bossMul: 1.55,
    reward: rewardFor(arenaId, 14),
    waves: 4,
  }));
  return out;
}
/* Build-tier names and hooks. Deliberately plain: this tier's job is
   repetition, and dressing it up as five more revelations would be lying
   about what it is for. */
const BUILD_NAMES = {
  ch09: ["Spore Field", "Iron Garden", "The Long Range", "Hard Points", "Mirror Line"],
  glassfall: ["The Cut Hall", "Carrier", "Absolute", "Standing Glass", "Fracture Pattern"],
  emberwake: ["Ring Count", "Vent Row", "Runaway", "Haze", "The Long Noon"],
  nulltide: ["Pressure Deck", "The Count", "Deep Water", "Watertight", "The Shelf Again"],
  terminus: ["Null", "Last Draft", "The Practised Hand", "Repetition", "Coda"],
};
const BUILD_HOOKS = {
  ch09: [
    "Everything in this room divides when it dies. Give it room, or don't kill it yet.",
    "Heavier things grow here. The plated ones are only armoured at the front.",
    "They stopped walking to you. Now they reach, and standing still is the mistake.",
    "Something in here builds cover, and everything behind it is glad of it.",
    "All of it at once, at a density the first nine levels were getting you ready for.",
  ],
  glassfall: [
    "Glass that throws your own light back at you. Shoot the dark side, or dash the column.",
    "A carrier hull, planting pillars while you argue with it.",
    "It drops a ring of absolute cold and closes it. The ring is the damage.",
    "One of them stands a pane on end and the room stops being one room.",
    "Everything this branch has, on a floor that is going anyway.",
  ],
  emberwake: [
    "A ringed disc breathing heat outward on a steady count. Walk between the rings, not through them.",
    "Plated on every face except the vent. It charges, then opens a cone from the front.",
    "It reads your heat gauge. The hotter your gun runs, the faster it fires back.",
    "Something here hangs haze your pulses will not cross, and the room keeps moving it.",
    "The whole forge floor, everything on it, and four hundred years of noon.",
  ],
  nulltide: [
    "Lenses walking their bright spot across the floor, and something heavy moving under it.",
    "It drops charges on a count and lets the tide arrange them. They detonate together.",
    "It submerges, crosses the room underneath, and surfaces where you were standing.",
    "One of them holds a wall of water up. The current goes around it now.",
    "Everything the branch has indexed, played back at pressure.",
  ],
  terminus: [
    "A hole cut in the world. It swallows your pulses and gives them back with your name on them.",
    "It writes one line across the floor. When the line finishes, the line is what kills you.",
    "One of them is holding your build. It has had more practice with it than you have.",
    "The same second, again, with everything in it that the second contains.",
    "All five of them, on a dial that has stopped pretending it is going to slow down.",
  ],
};

/* ---------------- installing the curve ----------------------------------
   Each arena's authored `levels` array shrinks to one thing — its boss
   level, which tier 4 keeps basically unchanged — and the other fourteen
   come from the curve above. Done here, at load time, so every downstream
   system (waves, music, backdrops, level cards, the map) sees a plain
   fifteen-entry array and never learns that nine of them were generated. */
function globalLevelPos(arenaId, idx) {
  const a = TIMELINES.findIndex((t) => t.id === arenaId);
  return (a < 0 ? 0 : a) * LEVELS_PER_ARENA + idx + 1;
}
TIMELINES.forEach((t) => {
  const authored = t.levels || CH09_LEVELS;
  const boss = authored.find((L) => L.boss) || authored[authored.length - 1];
  const built = buildArenaLevels(t.id, boss);
  /* Chamber 09's array is CH09_LEVELS itself, which is a const other files
     hold a direct reference to (survivalTypes reads it). Replace its
     CONTENTS rather than the binding, so every existing reference keeps
     pointing at the right thing. */
  if (t.levels === CH09_LEVELS) { CH09_LEVELS.length = 0; built.forEach((L) => CH09_LEVELS.push(L)); }
  else t.levels = built;
  /* the drone joins the arena's bestiary roster so the map's silhouette
     strip and the archive both know about it */
  const drone = ARENA_DRONE[t.id];
  if (drone && t.roster.indexOf(drone) < 0) t.roster.push(drone);
});
LEVELS = CH09_LEVELS;
