/* The Trophy Road: per-level save state, the trophy formula, the two reward
   tracks, and the queries the map screen and the run loop ask.

   The point of all of this is one question — "why play a level instead of
   survival mode?" — and one answer: survival is a score you beat and then
   lose, and this is permanent progress plus real, distinct rewards. A level
   remembers your best attempt forever, a first clear pays out something you
   keep, and the trophies you bank replaying a level you have already beaten
   push an arena ladder that pays out again. None of it gates anything: the
   only thing that unlocks a level is clearing the one before it. */

/* ---------------- save schema ------------------------------------------
   SAVE.tl[id] used to be { entered, cleared, best } — three numbers for a
   whole arena. Those three stay exactly as they were (every existing call
   site still reads them), and a per-level array is added alongside:

     cleared    1 once this level has ever been beaten
     attempts   how many times it has been entered
     trophies   BEST EVER trophy result, never the most recent one
     bestPct    best completion fraction, for levels not yet cleared
     mut        1 once it has been cleared with a mutation switched on
     paid       1 once its first-clear reward has been granted

   Repaired on boot the same way the arena-level fields already were, so a
   save from before this existed upgrades in place rather than being
   migrated destructively. */
SAVE.tl = SAVE.tl || {};
SAVE.secrets = SAVE.secrets || {};
SAVE.lore = SAVE.lore || {};
SAVE.admin = SAVE.admin || 0;
SAVE.trophiesTotal = SAVE.trophiesTotal || 0;

function blankLevelRec() { return { cleared: 0, attempts: 0, trophies: 0, bestPct: 0, mut: 0, paid: 0 }; }
function repairTrophyRoad() {
  TIMELINES.forEach((t) => {
    const st = SAVE.tl[t.id] = Object.assign({ entered: 0, cleared: 0, best: 0, ladder: 0 }, SAVE.tl[t.id] || {});
    if (!Array.isArray(st.levels)) st.levels = [];
    /* grow to fifteen without clobbering anything already there */
    for (let i = 0; i < LEVELS_PER_ARENA; i++)
      st.levels[i] = Object.assign(blankLevelRec(), st.levels[i] || {});
    st.levels.length = LEVELS_PER_ARENA;
    /* ---- migration (plan §10) ------------------------------------------
       An arena that was already cleared under the old three-to-six-level
       structure has no per-level record at all, and showing that player a
       road of fifteen locked nodes would read as their progress being
       deleted. So: anyone holding `cleared` on an arena gets every level in
       it marked cleared, with the trophies a full-clear, no-bonus attempt
       would have paid. They start at baseline trophies rather than at zero,
       and the ladder below picks up from there.

       Deliberately NOT marked `paid`: the first-clear rewards are new, and
       a returning player should collect them rather than have them silently
       written off. They are granted on the next clear of each level. */
    if (st.cleared) {
      for (let i = 0; i < LEVELS_PER_ARENA; i++) {
        const r = st.levels[i];
        if (!r.cleared) {
          r.cleared = 1;
          r.bestPct = 1;
          r.trophies = Math.max(r.trophies, levelBaseTrophies(t.id, i));
        }
      }
    }
  });
  SAVE.tl.ch09.entered = 1;
  recomputeTrophies();
  persist();
}

/* ---------------- the trophy formula -----------------------------------
   A level's BASE value depends only on where it sits in the whole 75-level
   sequence: ten times its position. Chamber 09's first level is worth 10,
   Emberwake's twelfth (global position 42) is worth 420, Terminus's boss
   (75) is worth 750. There is no separate multiplier table to keep in sync
   — the number that already orders the levels is the trophy scale.

   How much of that you actually bank on an attempt:

     base  x  how much of the level you finished  x  (1 + bonuses)

   Finishing is 1.0. Dying partway is the wave you died on over the wave
   count, so a failed attempt still banks something — which is what makes
   replaying to improve worth doing before you have ever beaten the level.

   The three bonuses stack and only apply to an attempt you actually
   finished: +15% untouched, +10% under the level's par time, +25% with a
   mutation switched on. All three is +50%. */
const TROPHY_PER_POS = 10;
const TROPHY_NOHIT = .15;
const TROPHY_FAST = .10;
const TROPHY_MUT = .25;

function levelBaseTrophies(arenaId, idx) { return globalLevelPos(arenaId, idx) * TROPHY_PER_POS; }
/* what a level is worth at its theoretical best — what the map shows as the
   ceiling you are chasing on a level you have already beaten */
function levelMaxTrophies(arenaId, idx) {
  return Math.round(levelBaseTrophies(arenaId, idx) * (1 + TROPHY_NOHIT + TROPHY_FAST + TROPHY_MUT));
}
/* a is { cleared, pct, noHit, fast, mutation } */
function attemptTrophies(arenaId, idx, a) {
  const base = levelBaseTrophies(arenaId, idx);
  const pct = a.cleared ? 1 : clamp(a.pct || 0, 0, 1);
  let bonus = 1;
  if (a.cleared) {
    if (a.noHit) bonus += TROPHY_NOHIT;
    if (a.fast) bonus += TROPHY_FAST;
    if (a.mutation) bonus += TROPHY_MUT;
  }
  return Math.round(base * pct * bonus);
}
/* which bonuses an attempt actually earned, for the results screen to list */
function trophyBreakdown(arenaId, idx, a) {
  const out = [];
  if (a.cleared) {
    if (a.noHit) out.push({ label: "untouched", pct: TROPHY_NOHIT });
    if (a.fast) out.push({ label: "under par", pct: TROPHY_FAST });
    if (a.mutation) out.push({ label: "mutation", pct: TROPHY_MUT });
  }
  return out;
}

function levelRec(arenaId, idx) {
  const st = SAVE.tl[arenaId];
  if (!st || !st.levels || !st.levels[idx]) return blankLevelRec();
  return st.levels[idx];
}
function arenaTrophies(arenaId) {
  const st = SAVE.tl[arenaId];
  if (!st || !st.levels) return 0;
  let n = 0;
  for (const r of st.levels) n += r.trophies || 0;
  return n;
}
function recomputeTrophies() {
  let n = 0;
  for (const t of TIMELINES) n += arenaTrophies(t.id);
  SAVE.trophiesTotal = n;
  return n;
}

/* ---------------- unlocks ----------------------------------------------
   Strictly sequential, and that is the whole rule. Beat level N to open
   N+1; beat level 15 to open the next arena. Trophies gate nothing — they
   only pay. */
function arenaUnlocked(arenaId) {
  if (SAVE.admin) return true;
  const t = tlOf(arenaId);
  if (!t.unlockedBy) return true;
  return !!(SAVE.tl[t.unlockedBy] && SAVE.tl[t.unlockedBy].cleared);
}
function levelUnlocked(arenaId, idx) {
  if (SAVE.admin) return true;
  if (!arenaUnlocked(arenaId)) return false;
  if (idx <= 0) return true;
  return !!levelRec(arenaId, idx - 1).cleared;
}
/* the level the road wants you in next: the first unlocked one you have not
   cleared, or the boss if you have cleared everything */
function nextOpenLevel(arenaId) {
  for (let i = 0; i < LEVELS_PER_ARENA; i++)
    if (levelUnlocked(arenaId, i) && !levelRec(arenaId, i).cleared) return i;
  return LEVELS_PER_ARENA - 1;
}
function arenaClearedCount(arenaId) {
  const st = SAVE.tl[arenaId];
  if (!st || !st.levels) return 0;
  return st.levels.reduce((n, r) => n + (r.cleared ? 1 : 0), 0);
}

/* ---------------- the arena reward ladder ------------------------------
   The second reward track, and the answer to "why replay a level I have
   already cleared." Keyed off the trophies banked in ONE arena, not the
   global total, so each arena has its own climb and an early arena stays
   worth returning to once you are good enough to bank near-perfect runs in
   it.

   Thresholds are a fraction of what that arena could theoretically pay if
   every level in it were run perfectly (the sum of levelMaxTrophies across
   its fifteen). Expressed that way rather than as flat numbers because the
   arenas are worth wildly different amounts — Chamber 09's fifteen cap out
   around 1,800 and Terminus's around 9,600 — so a flat "every 1,000" would
   be four rungs in one arena and ten in another.

   Five rungs at 25/40/55/70/85% of perfect. The last one is deliberately
   not 100%: a ladder whose top rung requires a flawless mutation run of all
   fifteen levels is a ladder nobody finishes. */
const LADDER_MARKS = [.25, .40, .55, .70, .85];
function arenaPerfectTrophies(arenaId) {
  let n = 0;
  for (let i = 0; i < LEVELS_PER_ARENA; i++) n += levelMaxTrophies(arenaId, i);
  return n;
}
/* what each rung pays, per arena. Shards scale with the arena's own depth,
   so a Terminus rung is worth roughly what a Terminus level is. */
const LADDER_REWARDS = {
  ch09: [{ shards: 400 }, { cosmetic: "trail_rainbow" }, { shards: 900 }, { cosmetic: "boom_rings" }, { ability: "shrapnel" }],
  glassfall: [{ shards: 800 }, { cosmetic: "skin_wire" }, { shards: 1600 }, { cosmetic: "boom_pixel" }, { ability: "conduit" }],
  emberwake: [{ shards: 1300 }, { cosmetic: "pal_solar" }, { shards: 2400 }, { cosmetic: "trail_glitch" }, { ability: "harvest" }],
  nulltide: [{ shards: 1900 }, { cosmetic: "skin_static" }, { shards: 3400 }, { cosmetic: "pal_synthwave" }, { ability: "counterweight" }],
  terminus: [{ shards: 2600 }, { cosmetic: "skin_neon" }, { shards: 4600 }, { cosmetic: "boom_glyph" }, { cosmetic: "pal_gameboy" }],
};
function ladderThresholds(arenaId) {
  const perfect = arenaPerfectTrophies(arenaId);
  return LADDER_MARKS.map((m) => Math.round(perfect * m / 50) * 50);
}
/* how many rungs the arena's banked trophies have earned */
function ladderTierEarned(arenaId) {
  const have = arenaTrophies(arenaId), marks = ladderThresholds(arenaId);
  let n = 0;
  for (const m of marks) if (have >= m) n++;
  return n;
}
/* pays out every rung crossed since the last time this ran, and returns
   them so the results screen can announce them */
function claimLadder(arenaId) {
  const st = SAVE.tl[arenaId];
  if (!st) return [];
  const earned = ladderTierEarned(arenaId);
  const out = [];
  while ((st.ladder || 0) < earned) {
    const i = st.ladder || 0;
    st.ladder = i + 1;
    const r = (LADDER_REWARDS[arenaId] || [])[i];
    if (r) { grantReward(r, "Ladder " + (i + 1)); out.push(r); }
  }
  return out;
}

/* ---------------- granting ---------------------------------------------
   THE one place a reward is handed over, for either track. Everything else
   — first clears, ladder rungs, and any future source — routes through
   here, which is what keeps the eventual gacha "double this reward" hook a
   one-line change in one function instead of a scatter of grant sites.

   `mul` is that hook point. Nothing passes it today. */
function grantReward(r, why, mul) {
  if (!r) return null;
  const k = mul && mul > 0 ? mul : 1;
  const got = [];
  if (r.shards) {
    const n = Math.round(r.shards * k);
    SAVE.shards += n;
    got.push({ kind: "shards", n, label: fmt(n) + " shards" });
  }
  if (r.cosmetic && !SAVE.cosmetics.owned[r.cosmetic]) {
    SAVE.cosmetics.owned[r.cosmetic] = 1;
    const c = cosmOf(r.cosmetic);
    got.push({ kind: "cosmetic", id: r.cosmetic, label: c ? c.name : r.cosmetic });
  }
  if (r.ability && typeof abilSave === "function" && !abilSave().owned[r.ability]) {
    abilSave().owned[r.ability] = 1;
    const a = abilOf(r.ability);
    got.push({ kind: "ability", id: r.ability, label: a ? a.name : r.ability });
  }
  if (r.lore && !SAVE.lore[r.lore]) {
    SAVE.lore[r.lore] = 1;
    const l = LORE.find((x) => x.id === r.lore);
    got.push({ kind: "lore", id: r.lore, label: l ? l.title : r.lore });
  }
  if (got.length) { syncCosmetics(); persist(); }
  return got.length ? { why: why || "", items: got } : null;
}

/* ---------------- recording an attempt ---------------------------------
   Called once at the end of every story-level attempt, cleared or not. It
   is the only writer of the per-level record, so "best ever, never the most
   recent" is enforced in one place and cannot be got wrong somewhere else.

   Returns everything the results screen needs to show, including whether
   the attempt actually improved on the record — because banking 210 on a
   level you have already banked 630 on should read as "no change", not as a
   win and not as a loss. You can never lose trophies here. */
function recordAttempt(arenaId, idx, a) {
  const st = SAVE.tl[arenaId];
  if (!st) return null;
  const rec = st.levels[idx] || (st.levels[idx] = blankLevelRec());
  rec.attempts++;
  const gained = attemptTrophies(arenaId, idx, a);
  const prev = rec.trophies || 0;
  const improved = gained > prev;
  if (improved) rec.trophies = gained;
  rec.bestPct = Math.max(rec.bestPct || 0, a.cleared ? 1 : clamp(a.pct || 0, 0, 1));

  const firstClear = a.cleared && !rec.cleared;
  if (a.cleared) rec.cleared = 1;
  if (a.cleared && a.mutation) rec.mut = 1;

  /* first-clear reward. `paid` rather than `cleared` is the gate, so a save
     migrated from before the road existed still collects. */
  let paid = null;
  const L = tlOf(arenaId).levels[idx];
  if (a.cleared && !rec.paid && L && L.reward) {
    rec.paid = 1;
    paid = grantReward(L.reward, "First clear");
  }
  recomputeTrophies();
  /* the arena's own clear flag, which is what opens the NEXT arena */
  if (a.cleared && idx === LEVELS_PER_ARENA - 1 && !st.cleared) st.cleared = 1;
  const rungs = claimLadder(arenaId);
  persist();
  return {
    gained, prev, improved, best: rec.trophies, firstClear, paid, rungs,
    bonuses: trophyBreakdown(arenaId, idx, a),
    unlockedNext: a.cleared && idx + 1 < LEVELS_PER_ARENA && !levelRec(arenaId, idx + 1).cleared,
  };
}

/* Every arena's ladder, brought up to whatever its trophies have already
   earned. Run once at startup rather than inside repairTrophyRoad(), because
   a ladder rung can pay out an ABILITY and the ability catalogue lives in a
   file that loads after this one — a migrated player would silently lose the
   grant. The call site is the bottom of 16-abilities.js, by which point
   everything a reward can hand over exists. */
function claimAllLadders() {
  TIMELINES.forEach((t) => claimLadder(t.id));
  persist();
}

repairTrophyRoad();

/* ---------------- the mutation replay ----------------------------------
   The replay button, and the answer to "why would anyone replay level 3
   once they have outgrown it."

   Rather than a settings toggle, it sits on any level you have already
   cleared once, on the map. Switching it on rolls the SPECIAL GRADE
   mutations survival already uses (the MUT table in 16-abilities.js) onto
   this level's bodies — a gold-coronaed version of an ordinary enemy with
   raised stats and an ability its plain version does not have. It is
   genuinely harder, which is what makes it honest that it pays the +25%
   trophy bonus rather than being free money.

   It reuses survival's system wholesale instead of needing a new one: all
   that is added here is a per-level roll chance, because survival's own
   climbs with the wave number and a level only ever has three or four. */
const MUT_REPLAY_BASE = .16;    /* roll chance per body on a mutation replay */
const MUT_REPLAY_PER_TIER = .05; /* ...climbing with the level's tier */
function mutationAvailable(arenaId, idx) {
  return !!levelRec(arenaId, idx).cleared;
}
/* the chance spawnEnemy rolls against while a mutation replay is running */
function mutReplayChance() {
  if (!G.mutation || G.survival) return 0;
  const L = curLevel();
  return clamp(MUT_REPLAY_BASE + ((L && L.tier) || 1) * MUT_REPLAY_PER_TIER, 0, .45);
}
/* announced once when the level card goes up, so the player is told what
   they opted into rather than discovering it mid-wave */
function applyLevelMutation() {
  banner("Mutation replay", "special grades active · +25% trophies");
}

/* ---------------- entering a level -------------------------------------
   The single entry point the map screen, the results screen and the
   operator console all use, so "start a level" means exactly one thing.
   Everything a story attempt needs to be discrete is set here and nowhere
   else. */
function enterLevel(arenaId, idx, mutation) {
  if (!levelUnlocked(arenaId, idx)) { Audio_.deny(); return false; }
  setTimeline(arenaId);
  G.mutation = mutation && mutationAvailable(arenaId, idx) ? 1 : 0;
  /* `attempts` is counted by recordAttempt(), which runs on the way OUT —
     counting it here as well double-counted every attempt, and an attempt
     abandoned to the main menu should not count at all */
  startPlay("play", idx);
  return true;
}
