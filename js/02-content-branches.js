/* Content tables: the five branch/timeline definitions, archive lore entries, secrets, boss registry, the shop, cosmetics and run-core (draft) definitions. */
/* ---------------- branch definitions ---------------------------------- */
/* Level shape is identical to Chamber 09 so every downstream system —
   waves, music, backdrops, level cards — works without knowing which
   branch it is standing in. */
const TIMELINES = [
  {
    id: "ch09", name: "Chamber 09", code: "BRANCH 00 · θ", unlockedBy: null,
    blurb: "The baseline. Six rooms, one purge, one seal welded from the outside.",
    mech: { name: "Baseline", desc: "No branch physics. Just you, the room, and the lines it draws on the floor before it hits you." },
    accent: "111,242,255",
    levels: null, /* filled with CH09_LEVELS below */
    roster: ["husk", "dart", "bloom", "colossus", "weaver", "spore", "bulwark", "needle", "mimic", "mirror", "warden", "revenant", "howitzer", "hexer", "broodmother"],
    boss: "paradox",
  },
  {
    id: "glassfall", name: "Glassfall", code: "BRANCH 02 · δ", unlockedBy: "ch09",
    blurb: "A branch that was interrupted mid-second and never got the rest of it. Everything in here is still falling.",
    mech: { name: "Stasis bloom", desc: "Cold discs open across the floor. Inside one, the whole world runs at a third speed — you included — but your pulses hit twice as hard and anything that dies in there shatters into its neighbours." },
    accent: "168,232,255",
    roster: ["facet", "prism", "rime", "silica", "kelvin"],
    boss: "stillhour",
    levels: [
      { name: "Fracture Line", hook: "The first thing you notice is that the dust isn't falling. Then a piece of it turns to look at you.",
        waves: 4, types: ["facet", "rime"], intro: ["facet", "rime"], env: "glass",
        key: 2, mode: "lydian", prog: [0, 4, 2, -3], voice: 0,
        dark: ["#0e2436", "#040a12"], light: ["#f2fbff", "#d8e9f4"], accent: "168,232,255" },
      { name: "The Cut Hall", hook: "Glass that throws your own light back at you, and a carrier planting pillars while you argue with it.",
        waves: 4, types: ["facet", "prism", "rime", "silica"], intro: ["prism", "silica"], env: "glass",
        key: 4, mode: "lydian", prog: [0, 2, 4, -1], voice: 1,
        dark: ["#12283c", "#050c16"], light: ["#eef8ff", "#d2e4f2"], accent: "214,246,255" },
      { name: "Eleven Fifty-Nine", hook: "The orrery has been holding this minute open for a very long time. It would like the minute back.",
        waves: 3, boss: true, types: ["facet", "prism", "rime", "silica", "kelvin"], intro: ["kelvin", "stillhour"], env: "glass",
        key: 0, mode: "lydian", prog: [0, 6, 4, -2], voice: 2,
        dark: ["#0a1e30", "#03080f"], light: ["#f6fcff", "#dbeaf6"], accent: "186,238,255" },
    ],
  },
  {
    id: "emberwake", name: "Emberwake", code: "BRANCH 05 · ρ", unlockedBy: "glassfall",
    blurb: "A branch that ran itself forward too fast and burned everything downstream to do it. The noon here has lasted four hundred years.",
    mech: { name: "Heat", desc: "Your gun runs a heat gauge. Hold the trigger and it climbs; jam it and you're empty for a beat. Dashing vents it instantly. A corona sweep crosses the room on a slow rotation and lights whatever it touches." },
    accent: "255,182,96",
    roster: ["filament", "corona", "cinder", "helion", "ignis"],
    boss: "perihelion",
    levels: [
      { name: "The Long Noon", hook: "No shade, no evening, and a gun that only tolerates so much enthusiasm.",
        waves: 4, types: ["cinder", "filament"], intro: ["cinder", "filament"], env: "ember",
        key: 5, mode: "phrygian", prog: [0, 1, -4, -5], voice: 0,
        dark: ["#33150a", "#0f0503"], light: ["#fff4e6", "#f0dcc2"], accent: "255,206,120" },
      { name: "Vent Row", hook: "Plated things with one soft face, and something that fires faster the hotter you get.",
        waves: 4, types: ["cinder", "filament", "corona", "helion", "ignis"], intro: ["corona", "helion", "ignis"], env: "ember",
        key: 3, mode: "phrygian", prog: [0, -2, 1, -5], voice: 1,
        dark: ["#3a1b08", "#120703"], light: ["#fff1de", "#eed6b6"], accent: "255,166,72" },
      { name: "Closest Approach", hook: "The engine at the middle of this branch is finally falling into itself, and it would like company.",
        waves: 3, boss: true, types: ["cinder", "corona", "helion", "ignis", "filament"], intro: ["perihelion"], env: "ember",
        key: 7, mode: "phrygian", prog: [0, 1, -3, -7], voice: 2,
        dark: ["#41180a", "#160604"], light: ["#fff2e2", "#f2d8ba"], accent: "255,176,84" },
    ],
  },
  {
    id: "nulltide", name: "Nulltide", code: "BRANCH 11 · ψ", unlockedBy: "emberwake",
    blurb: "The Concordance didn't delete this branch. It filed it. Everything that ever happened here is still down there, wet and indexed.",
    mech: { name: "Undertow", desc: "A current runs the room and pushes everything in it. Every so often the tide rewinds: enemies snap back to where they stood two seconds ago. Your own wake stays solid through it — stand in it and the rewind carries you too." },
    accent: "104,232,222",
    roster: ["fathom", "undine", "caustic", "trench", "sounding"],
    boss: "drownedindex",
    levels: [
      { name: "The Shelf", hook: "Shallow water again, five branches later. It remembers you, which is the problem.",
        waves: 4, types: ["fathom", "undine"], intro: ["fathom", "undine"], env: "abyss",
        key: -2, mode: "dorian", prog: [0, -3, 2, -5], voice: 0,
        dark: ["#052a30", "#010e12"], light: ["#ecfcfb", "#cfe8e6"], accent: "104,232,222" },
      { name: "Pressure Deck", hook: "Lenses walking their bright spot across the floor, and something heavy moving under it.",
        waves: 4, types: ["fathom", "undine", "caustic", "trench", "sounding"], intro: ["caustic", "trench", "sounding"], env: "abyss",
        key: 0, mode: "dorian", prog: [0, 2, -3, -5], voice: 1,
        dark: ["#04222e", "#010a10"], light: ["#eaf9ff", "#cbe2ee"], accent: "126,246,196" },
      { name: "The Stacks", hook: "It has a copy of everything you have killed since you woke up. It has been sorting them by how you did it.",
        waves: 3, boss: true, types: ["fathom", "undine", "caustic", "sounding", "trench"], intro: ["drownedindex"], env: "abyss",
        key: -4, mode: "dorian", prog: [0, -5, -3, -7], voice: 2,
        dark: ["#031c28", "#01070d"], light: ["#e9fbff", "#c9e0ec"], accent: "96,222,232" },
    ],
  },
  {
    id: "terminus", name: "Terminus", code: "BRANCH ∞ · Ω", unlockedBy: "nulltide",
    blurb: "Not a branch. The end of all of them, kept on a loop one second long so the Concordance always has somewhere to put you.",
    mech: { name: "Entropy clock", desc: "A clock runs down for the whole chamber. Kills put seconds back on it. At zero the room starts taking integrity out of you directly, and it never stops taking it. Colour drains as it runs low." },
    accent: "232,206,150",
    roster: ["vestige", "coda", "nullc", "epilogue", "zenith"],
    boss: "omega",
    levels: [
      { name: "The Repeat", hook: "You have been in this room. The wireframes walking toward you have been in it longer.",
        waves: 4, types: ["vestige", "coda"], intro: ["vestige", "coda"], env: "terminus",
        key: 0, mode: "aeolian", prog: [0, -3, -5, -3], voice: 0,
        dark: ["#1a1a1e", "#08080a"], light: ["#f6f5f2", "#dedcd6"], accent: "196,196,204" },
      { name: "Last Draft", hook: "One of them is holding your build. It has had considerably more practice with it than you have.",
        waves: 4, types: ["vestige", "coda", "nullc", "epilogue", "zenith"], intro: ["nullc", "epilogue", "zenith"], env: "terminus",
        key: -3, mode: "aeolian", prog: [0, -2, -5, -7], voice: 1,
        dark: ["#1e1c1a", "#0a0908"], light: ["#f8f6f1", "#e0dcd3"], accent: "232,206,150" },
      { name: "One Second Behind", hook: "There is one hull left in the archive that is older than yours. It has been waiting the entire time.",
        waves: 3, boss: true, types: ["vestige", "coda", "nullc", "zenith", "epilogue"], intro: ["omega"], env: "terminus",
        key: 0, mode: "aeolian", prog: [0, -5, -7, -8], voice: 2,
        dark: ["#221f1a", "#0b0a08"], light: ["#fbf8f1", "#e6e0d4"], accent: "255,222,150" },
    ],
  },
];
const tlOf = (id) => TIMELINES.find((t) => t.id === id) || TIMELINES[0];
let TL = TIMELINES[0];

/* ---------------- the archive: lore ------------------------------------ */
/* Each entry unlocks on a condition the player will hit by playing.
   Locked entries render redacted so the shape of the story is visible
   before the story is. */
const LORE = [
  { id: "con1", sec: "The Concordance", title: "What the facility is for",
    need: () => true,
    body: "The Concordance is not a laboratory and has never claimed to be one. It is a pruning service. When a causal branch develops a contradiction it cannot metabolise, the branch is severed, wound down and filed. The entropy purge is the winding-down. It is quiet, it is thorough, and it has never once been appealed successfully." },
  { id: "con2", sec: "The Concordance", title: "The appeal",
    need: () => (SAVE.tl.ch09 && SAVE.tl.ch09.cleared) || false,
    body: "There is one recorded appeal. It was filed from inside a chamber, by the subject of the purge, three seconds before the purge reached it. The appeal consisted of a single line: I AM THE CONTRADICTION, PRUNE ME AND YOU PRUNE THE RECORD OF THE PRUNING. The Concordance denied it and then, for reasons no document explains, built Chamber 09." },
  { id: "ch1", sec: "Chamber 09", title: "Quantum Stress Chamber 09",
    need: () => true,
    body: "Nine is not the ninth of anything. The number is a file prefix. Chamber 09 is a splice head: a room that can be tuned to any recorded branch and run at speed, with a live subject inside to see what the branch does when something refuses to follow its script." },
  { id: "ch2", sec: "Chamber 09", title: "The weld",
    need: () => SAVE.secrets.seal,
    body: "Every diagnostic says the seal was welded from the outside. It was not. The bead runs the wrong way, the spatter is on the inner face, and the tool was a cutting torch held by something with a hand. Somebody sealed themselves in here on purpose, and then made sure the log said otherwise." },
  { id: "ch3", sec: "Chamber 09", title: "+1.041 seconds",
    need: () => true,
    body: "The temporal buffer holds CHRONO-01 one second and forty-one milliseconds ahead of the local frame. The figure is not a design target. It is the exact interval between the appeal being filed and the appeal being denied, and it has been reused as a constant in every chamber since, by people who no longer know what it measured." },
  { id: "gl1", sec: "Glassfall", title: "The instant that refused",
    need: () => SAVE.tl.glassfall && SAVE.tl.glassfall.entered,
    body: "Branch 02·δ did not end. It was interrupted at 11:59:59 and the rest of the second was never delivered. Everything inside is still mid-fall, still mid-decision, still expecting the next instant to arrive. The inhabitants are not frozen. They are waiting, and they have gotten very good at it." },
  { id: "gl2", sec: "Glassfall", title: "Why it is made of glass",
    need: () => SAVE.tl.glassfall && SAVE.tl.glassfall.cleared,
    body: "It is not glass. A branch held open past its own end stops being able to absorb light, so light passes through it, and it looks like glass to anything that has to look at it from the outside. The Still Hour is not a machine either. It is the shape a decision takes when it is never allowed to resolve." },
  { id: "em1", sec: "Emberwake", title: "The spent future",
    need: () => SAVE.tl.emberwake && SAVE.tl.emberwake.entered,
    body: "Branch 05·ρ discovered it could borrow causal weight from its own downstream and repay it later. It ran three hundred years of progress in eleven, and then the invoice came due all at once as heat. The noon here is not sunlight. It is every evening the branch never got to have, arriving simultaneously." },
  { id: "em2", sec: "Emberwake", title: "Perihelion",
    need: () => SAVE.tl.emberwake && SAVE.tl.emberwake.cleared,
    body: "The star engine at the centre was built to pay the debt back. It works. It has been working for four hundred years, one collapse at a time, and each collapse returns roughly nine minutes of the borrowed future. At current rates the branch clears its balance in one hundred and six thousand years, at which point there will be nothing left in it to enjoy the solvency." },
  { id: "nt1", sec: "Nulltide", title: "Filed, not deleted",
    need: () => SAVE.tl.nulltide && SAVE.tl.nulltide.entered,
    body: "The Concordance does not delete. Deletion leaves an edge, and edges are contradictions. Branch 11·ψ was submerged instead: every event in it flooded, indexed and stored at pressure. Nothing that happened here has stopped happening. It has only stopped being reachable from anywhere that matters." },
  { id: "nt2", sec: "Nulltide", title: "The Index reads back",
    need: () => SAVE.tl.nulltide && SAVE.tl.nulltide.cleared,
    body: "The Drowned Index does not summon. It retrieves. Every enemy it throws at you is a real record of something you personally killed, pulled from your own run and replayed at pressure. This is why it gets harder the better you have been doing. It is also why it can only ever throw your own work at you, and why it has never once produced something you had not already beaten." },
  { id: "tm1", sec: "Terminus", title: "The last second",
    need: () => SAVE.tl.terminus && SAVE.tl.terminus.entered,
    body: "Terminus is one second long. It is the final second of every branch the Concordance ever pruned, laid over itself until the layers stopped being distinguishable, and then looped. It is the only place in the archive where the purge has already finished, which makes it the only place the purge cannot reach." },
  { id: "tm2", sec: "Terminus", title: "CHRONO-00",
    need: () => SAVE.secrets.mercy || (SAVE.tl.terminus && SAVE.tl.terminus.entered),
    body: "There was a pilot before you. Same hull, same buffer, same one second and forty-one milliseconds. CHRONO-00 filed the appeal, was denied, welded the chamber shut from the inside and walked into the purge rather than let it be run on anyone else. The Concordance recorded this as a hardware failure and built CHRONO-01 the following morning." },
  { id: "tm3", sec: "Terminus", title: "What OMEGA-00 wants",
    need: () => SAVE.tl.terminus && SAVE.tl.terminus.cleared,
    body: "It is not trying to kill you. It is trying to lose to you, correctly, in front of a working recorder, because a pilot who beats the previous pilot is a pilot the Concordance has to file a report about — and a report is a record, and a record of the pruning is exactly the contradiction the appeal was built around. OMEGA-00 has been waiting one second long for someone good enough to make the paperwork unavoidable." },
  { id: "cr1", sec: "The CHRONO series", title: "Hull notes",
    need: () => true,
    body: "The hull is a frame, a buffer and a gun, in that order of importance. The buffer is the expensive part: it holds the pilot slightly out of the local frame so that the pilot's decisions arrive before the room's do. Everything the pilot experiences as skill is, technically, an accounting error in their favour." },
  { id: "cr2", sec: "The CHRONO series", title: "On decoys",
    need: () => true,
    body: "An echo is not a hologram. It is the last few seconds of the pilot, held open and allowed to keep going. It fights because the pilot was fighting. It dies because the pilot was already going to stop existing at the end of those seconds anyway. Some pilots find this comforting and some find it unbearable, and the Concordance has stopped asking which." },
  { id: "cr3", sec: "The CHRONO series", title: "The true reading",
    need: () => SAVE.secrets.zero,
    body: "Final entry, unsealed. There is no CHRONO-01. There is one pilot, one hull and one buffer, restarted every time the purge catches up, and the number on the side is a count of restarts. You have beaten the version of yourself that got closest last time. The number on your hull went up while you were reading this." },
];

/* ---------------- secrets ---------------------------------------------- */
/* Nothing here is announced. Each one is a thing the game does in front of
   you many times before it means anything. */
const SECRETS = [
  { id: "seal", name: "The Weld", hint: "Every chamber has one tile that was cut, not cast. It is not marked. It does not move between runs.",
    reveal: "You stood on the seam and stopped shooting long enough to look at it. The bead runs inward." },
  { id: "observer", name: "Observer Protocol", hint: "The gun is optional. The chamber has never actually required you to use it.",
    reveal: "One full wave, no pulses fired. The purge log has no entry for what killed them." },
  { id: "mercy", name: "Mercy", hint: "One of them walks a route it was taught somewhere else. Given long enough, it remembers there was a reason to stop.",
    reveal: "A Vestige stood down. It was a Husk once, in a chamber with your number on the door." },
  { id: "constant", name: "The Constant", hint: "A number appears in the boot log, on the hull, and in one document nobody reads. It can be entered.",
    reveal: "1041. The interval between an appeal being filed and an appeal being denied." },
  { id: "orrery", name: "Eleven Fifty-Nine", hint: "The orrery keeps a hand. It passes the top of the hour exactly twice per phase.",
    reveal: "You went through the hand at twelve. The minute finally moved." },
  { id: "chorus", name: "Chorus", hint: "They all count the same four beats. Nothing stops several of them from finishing together.",
    reveal: "Three Codas resolved on the same beat. Something in the archive filed it as music." },
  { id: "wake", name: "Slack Water", hint: "The tide takes back everything it can find. Your own wake is the one thing down here that belongs to you.",
    reveal: "The rewind found you inside your own wake and carried you with it instead of past you." },
  { id: "zero", name: "Zero", hint: "The last phase of the last fight. It is one second ahead of you. You do not have to let it touch you.",
    reveal: "Untouched through the final phase. The report will have to be filed." },
];
const secretOf = (id) => SECRETS.find((s) => s.id === id);
function unlockSecret(id) {
  if (SAVE.secrets[id]) return;
  SAVE.secrets[id] = 1; persist();
  const s = secretOf(id);
  toast("Secret found · " + s.name, "var(--shard)");
  Audio_.secretFx();
  flash(.1, TH.shard);
  if (G.player) text(G.player.x, G.player.y - 60, s.name.toUpperCase(), TH.shard, 18);
}

TIMELINES[0].levels = CH09_LEVELS;
const BOSSES = { paradox: 1, stillhour: 1, perihelion: 1, drownedindex: 1, omega: 1 };


/* ---------------- content: shop -------------------------------------- */
const SHOP = [
  { cat: "Chassis", id: "hp", name: "Reinforced hull", desc: "Raises maximum integrity by 15.", max: 5, cost: (l) => 60 + l * 70 },
  { cat: "Chassis", id: "regen", name: "Nanoweave", desc: "Slowly repairs you the whole time you're alive.", max: 4, cost: (l) => 130 + l * 130 },
  { cat: "Chassis", id: "shield", name: "Deflector cell", desc: "Eats one hit outright, then rebuilds after eleven seconds.", max: 2, cost: (l) => 300 + l * 400 },
  { cat: "Chassis", id: "dashCd", name: "Vent array", desc: "Dash comes back 13% sooner.", max: 3, cost: (l) => 150 + l * 160 },
  { cat: "Weapon", id: "pulse", name: "Pulse amplifier", desc: "Adds 10% pulse damage.", max: 5, cost: (l) => 70 + l * 80 },
  { cat: "Weapon", id: "rate", name: "Cycle regulator", desc: "Fires 7% faster.", max: 5, cost: (l) => 70 + l * 80 },
  { cat: "Weapon", id: "dashDmg", name: "Kinetic edge", desc: "Dashing through something hurts it 35% more.", max: 3, cost: (l) => 160 + l * 170 },
  { cat: "Weapon", id: "crit", name: "Fracture optics", desc: "Adds a 6% chance for a pulse to hit three times as hard.", max: 3, cost: (l) => 200 + l * 200 },
  { cat: "Echo", id: "echoCharge", name: "Twin buffer", desc: "Carry a second echo charge.", max: 2, cost: (l) => 400 + l * 500 },
  { cat: "Echo", id: "echoLife", name: "Persistence", desc: "Echoes stay 25% longer.", max: 3, cost: (l) => 140 + l * 150 },
  { cat: "Echo", id: "echoDmg", name: "Resonance", desc: "Echoes hit 30% harder.", max: 3, cost: (l) => 160 + l * 170 },
  { cat: "Echo", id: "collect", name: "Collector field", desc: "Pulls shards from further out and makes each one worth more.", max: 4, cost: (l) => 120 + l * 140 },
  { cat: "Modules", id: "swapWave", name: "Displacement wave", tag: "Time-Swap", max: 2,
    desc: "A Time-Swap tears open both ends of the trade: damage and a hard shove where you were and where you land.", cost: (l) => 240 + l * 320 },
  { cat: "Modules", id: "swapFree", name: "Phase capacitor", tag: "Time-Swap", max: 1,
    desc: "Swapping stops spending dash charges and runs on its own two-second cycle instead.", cost: () => 720 },
  { cat: "Modules", id: "decoyGuard", name: "Decoy plating", tag: "Decoys", max: 2,
    desc: "Decoys hold together 60% longer under fire and pull attention harder than you do.", cost: (l) => 220 + l * 240 },
  { cat: "Modules", id: "traceRead", name: "Trace reader", tag: "Hazard lines", max: 1,
    desc: "Reads purge intent early: telegraphs appear sooner, draw brighter, and hit you for a quarter less.", cost: () => 380 },
  { cat: "Modules", id: "brake", name: "Chrono brake", tag: "Hazard lines", max: 1,
    desc: "When a hazard line locks onto you, the chamber crawls for a third of a second. Use it.", cost: () => 640 },
  { cat: "Modules", id: "salvage", name: "Entropy salvage", tag: "Hazard lines", max: 2,
    desc: "Anything killed standing in a live hazard line coughs up an extra shard.", cost: (l) => 200 + l * 220 },
];
const SHOP_CATS = ["Chassis", "Weapon", "Echo", "Modules"];

/* ---------------- content: procedural cosmetics ----------------------- */
const COSM_GROUPS = [
  { key: "trail", label: "Trails", head: "Motion trails", note: "Drawn behind CHRONO-01 in real time.", col: "var(--signal)" },
  { key: "skin", label: "Decoys", head: "Decoy skins", note: "How your echo renders while it fights for you.", col: "var(--echo)" },
  { key: "palette", label: "Palettes", head: "Palette themes", note: "Recolours the whole chamber. Press T to cycle what you own.", col: "var(--chrono)" },
  { key: "boom", label: "Blasts", head: "Explosion patterns", note: "The shape everything makes when it stops existing.", col: "var(--threat)" },
];
const COSM = [
  { id: "trail_std", g: "trail", name: "Standard wake", cost: 0, desc: "The stock exhaust ribbon. Quiet, readable, free." },
  { id: "trail_matrix", g: "trail", name: "Matrix rain", cost: 240, desc: "Leaks raw chamber code out of the engine, one glyph per frame." },
  { id: "trail_rainbow", g: "trail", name: "Spectrum ribbon", cost: 280, desc: "Hue cycles along the ribbon so your last second is a colour wheel." },
  { id: "trail_glitch", g: "trail", name: "Glitch afterimage", cost: 340, desc: "Stamps torn copies of the hull behind you with the channels split." },
  { id: "skin_std", g: "skin", name: "Standard echo", cost: 0, desc: "A translucent copy of the hull with a life ring around it." },
  { id: "skin_wire", g: "skin", name: "Wireframe phantom", cost: 260, desc: "Nothing but edges and vertices, spinning slowly out of phase." },
  { id: "skin_static", g: "skin", name: "Static cloud", cost: 300, desc: "A boiling cloud of noise that resolves into a ship when it fires." },
  { id: "skin_neon", g: "skin", name: "Neon silhouette", cost: 340, desc: "Solid black body inside a hard neon halo. Reads across the room." },
  { id: "pal_dark", g: "palette", name: "Chamber standard", cost: 0, desc: "Cold cyan on void. The chamber as the facility built it." },
  { id: "pal_light", g: "palette", name: "Daylight", cost: 0, desc: "Lights up. Same arena, far calmer, easier on tired eyes." },
  { id: "pal_synthwave", g: "palette", name: "Synthwave '84", cost: 420, desc: "Magenta grid, cyan hull, heavy bloom. The chamber on a bad VHS." },
  { id: "pal_gameboy", g: "palette", name: "GameBoy green", cost: 420, desc: "Four shades of green and nothing else. Everything gets remapped." },
  { id: "pal_solar", g: "palette", name: "Solar flare", cost: 420, desc: "Ember orange over near-black. Reads like the room is on fire." },
  { id: "boom_std", g: "boom", name: "Standard burst", cost: 0, desc: "Round shrapnel and a single expanding ring." },
  { id: "boom_rings", g: "boom", name: "Shockwave rings", cost: 260, desc: "Three staggered rings punching outward instead of debris." },
  { id: "boom_pixel", g: "boom", name: "Pixel shatter", cost: 260, desc: "The body breaks into square pixels that fall out of the grid." },
  { id: "boom_glyph", g: "boom", name: "Glyph scatter", cost: 320, desc: "Scatters the character set of whatever just died." },
];
const cosmOf = (id) => COSM.find((c) => c.id === id);

/* ---------------- content: run cores ---------------------------------- */
const TIERS = { common: { name: "Core", w: 1 }, rare: { name: "Rare core", w: .55 }, prime: { name: "Prime core", w: .22 } };
const CORES = [
  { id: "split", tier: "common", name: "Split beam", desc: "One extra pulse per shot, each a little weaker.", max: 3, apply: (m) => { m.multishot++; m.dmgMul *= .88; } },
  { id: "hard", tier: "common", name: "Hardpoint", desc: "Pulses hit 20% harder.", max: 4, apply: (m) => { m.dmgMul *= 1.2; } },
  { id: "clock", tier: "common", name: "Overclock", desc: "You fire 18% faster.", max: 4, apply: (m) => { m.rateMul *= 1.18; } },
  { id: "phase", tier: "common", name: "Phase step", desc: "Dash recharges 25% sooner.", max: 3, apply: (m) => { m.dashCdMul *= .75; } },
  { id: "persist", tier: "common", name: "Persistence", desc: "Echoes stay half again as long.", max: 3, apply: (m) => { m.echoLifeMul *= 1.5; } },
  { id: "plating", tier: "common", name: "Reactive plating", desc: "Anything that touches you takes 14 back.", max: 3, apply: (m) => { m.thorns += 14; } },
  { id: "prospect", tier: "common", name: "Prospector rig", desc: "Everything drops 35% more shards.", max: 3, apply: (m) => { m.shardMul *= 1.35; } },
  { id: "wake", tier: "common", name: "Kinetic wake", desc: "Your dash leaves a burning trail behind it.", max: 2, apply: (m) => { m.dashBurn++; } },
  { id: "pierce", tier: "rare", name: "Piercer", desc: "Pulses pass through one more body.", max: 3, apply: (m) => { m.pierce++; } },
  { id: "seeker", tier: "rare", name: "Seeker rounds", desc: "Pulses steer toward whatever is closest.", max: 2, apply: (m) => { m.homing++; } },
  { id: "shock", tier: "rare", name: "Shockdash", desc: "Dashing lets off a shockwave that damages and shoves.", max: 3, apply: (m) => { m.dashShock++; } },
  { id: "collapse", tier: "rare", name: "Collapse", desc: "Echoes detonate when they run out.", max: 3, apply: (m) => { m.echoBoom++; } },
  { id: "reson", tier: "rare", name: "Resonance", desc: "Echoes fire twice as often.", max: 2, apply: (m) => { m.echoRate *= 2; } },
  { id: "siphon", tier: "rare", name: "Siphon", desc: "Five percent of the damage you deal comes back as integrity.", max: 3, apply: (m) => { m.lifesteal += .05; } },
  { id: "critm", tier: "rare", name: "Crit matrix", desc: "Adds a 15% chance for a pulse to triple its damage.", max: 3, apply: (m) => { m.crit += .15; } },
  { id: "volatile", tier: "prime", name: "Volatile rounds", desc: "Pulses burst on impact and catch everything nearby.", max: 2, apply: (m) => { m.explosive++; } },
  { id: "twin", tier: "prime", name: "Twin echo", desc: "Every summon produces two echoes instead of one.", max: 1, apply: (m) => { m.echoTwin++; } },
  { id: "chain", tier: "prime", name: "Chain arc", desc: "A kill throws lightning into two more bodies.", max: 2, apply: (m) => { m.chain++; } },
  { id: "exec", tier: "prime", name: "Executioner", desc: "Anything below a fifth of its health simply stops.", max: 1, apply: (m) => { m.execute = .18; } },
  { id: "wind", tier: "prime", name: "Second wind", desc: "Once per run, a killing blow leaves you at 35 instead.", max: 1, apply: (m) => { m.secondWind++; } },
];

