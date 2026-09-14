/* The ability system: the twelve pilot abilities the Echo Lab sells, the loadout
   the player carries three of, and the special-grade mutations survival rolls
   onto its enemies. */
/* =====================================================================
   PILOT ABILITIES
   =====================================================================
   The shop no longer sells stat levels — the hull starts maxed (see BASELINE
   in 01-engine-core.js). What it sells is this: twelve abilities, of which
   you carry THREE. Three slots out of twelve is the whole design. It is not
   enough room to take everything that sounds good, so the question stops
   being "what is strongest" and becomes "what do these three do to each
   other".

   They are grouped into three families, and the families are deliberately
   incomplete on their own:

     IMPACT   reads the shove system — weight, distance, walls. Every one of
              them turns knockback from a visual into a damage source, so
              they want each other and they want the arena geometry.
     BRAND    a mark economy. The generator, two payoffs and a sustain
              engine — but four abilities and three slots, so a "pure brand"
              build has to give one of them up.
     TEMPO    time. These are the glue: each one makes one of the other two
              families fire more often, so a two-plus-one split is usually
              stronger than three of a kind.

   Some worked pairings, none of which are written down anywhere in game:
     Gravity Well + Piledriver   pull a pack into a wall and let the wall
                                 do the damage
     Brand + Detonate            the obvious one
     Brand + Conduit             the patient one: no button, more total
     Counterweight + Piledriver  you stop being pushed and start pushing
     Second Trigger + Brand      every trigger pull stacks twice
     Stutter + anything slow     Gravity Well and Detonate both have a wind-up
     Overclock + Harvest         kills feed the rate that feeds the kills
     Shrapnel + Gravity Well     a clustered pack kills itself

   `kind` is "passive" or "active". Actives are bound to the number keys 1-3
   by SLOT, so the loadout order is also the keybinding — which is why the
   shop lets you drop an ability into a specific slot rather than just owning
   it. */
const ABIL = [
  /* ---- IMPACT ------------------------------------------------------- */
  {
    id: "piledriver", fam: "Impact", kind: "passive", name: "Piledriver", cost: 0,
    tag: "shove · wall",
    desc: "A body you shove into a wall takes the whole shove as damage and is stunned. The lighter it is, the further it flies, and the harder it lands.",
    synergy: "Everything that shoves. Gravity Well gives it the wall.",
  },
  {
    id: "well", fam: "Impact", kind: "active", name: "Gravity Well", cost: 900,
    tag: "1.8s pull", cd: 9,
    desc: "Drops a well where you stand that drags everything toward it for 1.8 seconds, then collapses. It does no damage on its own — it arranges.",
    synergy: "Piledriver, Detonate, Shrapnel. It is a setup tool with no payoff of its own.",
  },
  {
    id: "counterweight", fam: "Impact", kind: "passive", name: "Counterweight", cost: 1100,
    tag: "no knockback",
    desc: "Projectiles stop moving you. The shove they would have applied is banked instead, and your next dash spends the whole bank as a shockwave.",
    synergy: "Piledriver. Stand in the fire, bank it, and hand it back.",
  },
  {
    id: "shrapnel", fam: "Impact", kind: "passive", name: "Shrapnel", cost: 800,
    tag: "on kill",
    desc: "Anything killed while it is still being shoved comes apart along the shove, throwing its own mass out as fragments that damage whatever they cross.",
    synergy: "Gravity Well for the cluster, Overclock for the kill rate.",
  },
  /* ---- BRAND -------------------------------------------------------- */
  {
    id: "brand", fam: "Brand", kind: "passive", name: "Phase Brand", cost: 700,
    tag: "5 stacks",
    desc: "Your pulses leave a brand, up to five deep. A branded body takes 7% more damage per stack. The brand fades in six seconds if you stop feeding it.",
    synergy: "The generator the whole family runs on. Second Trigger feeds it twice per trigger pull.",
  },
  {
    id: "conduit", fam: "Brand", kind: "passive", name: "Conduit", cost: 1000,
    tag: "arc",
    desc: "Branded bodies are wired to each other. Every six tenths of a second, each one arcs damage to the nearest other branded body, scaled by the deeper of the two brands.",
    synergy: "Phase Brand. Wants a crowd, so it wants Gravity Well.",
  },
  {
    id: "detonate", fam: "Brand", kind: "active", name: "Detonate", cost: 1200,
    tag: "consume", cd: 7,
    desc: "Every brand on the field goes off at once, for damage multiplied by its own depth, and is spent. Five stacks is not five times one stack — it is considerably more.",
    synergy: "Phase Brand to build it, Gravity Well to gather it, Stutter to have time to do both.",
  },
  {
    id: "harvest", fam: "Brand", kind: "passive", name: "Harvest", cost: 900,
    tag: "sustain",
    desc: "A branded body that dies gives its brand back to you: a charge of ammunition and a point of integrity per stack.",
    synergy: "Conduit kills quietly and constantly, which is exactly what this wants.",
  },
  /* ---- TEMPO -------------------------------------------------------- */
  {
    id: "stutter", fam: "Tempo", kind: "active", name: "Stutter Field", cost: 1100,
    tag: "3.5s", cd: 10,
    desc: "A field where the room runs at about a third speed. Bodies and the things they have already fired both crawl. You do not.",
    synergy: "Any ability with a wind-up, and any room with a chokepoint.",
  },
  {
    id: "secondtrigger", fam: "Tempo", kind: "passive", name: "Second Trigger", cost: 1000,
    tag: "echo shot",
    desc: "Every shot you fire is fired again a third of a second later, from wherever you were standing when you pulled the trigger, at two thirds damage.",
    synergy: "Phase Brand — two stacks a pull. And it rewards moving after you shoot, which is the rest of the game's advice anyway.",
  },
  {
    id: "rewind", fam: "Tempo", kind: "active", name: "Rewind Step", cost: 1000,
    tag: "1.6s back", cd: 8,
    desc: "Snap back to where you were a second and a half ago, with half a second of grace and a full magazine. The room does not come with you.",
    synergy: "An escape that is not the dash, so it frees the dash up to be a weapon.",
  },
  {
    id: "overclock", fam: "Tempo", kind: "passive", name: "Overclock", cost: 800,
    tag: "10 stacks",
    desc: "Kills stack up. Each stack is 4% more rate of fire and 2% more speed, up to ten, and they bleed off four seconds after the last one.",
    synergy: "Anything that kills in bulk. Shrapnel and Conduit both keep this pinned.",
  },
];
const ABIL_FAMS = ["Impact", "Brand", "Tempo"];
const abilOf = (id) => ABIL.find((a) => a.id === id);
const ABIL_SLOTS = 3;

/* ---- save plumbing ---------------------------------------------------- */
function abilSave() {
  if (!SAVE.abilities) SAVE.abilities = { owned: {}, slots: [] };
  const s = SAVE.abilities;
  if (!s.owned) s.owned = {};
  if (!Array.isArray(s.slots)) s.slots = [];
  s.slots.length = ABIL_SLOTS;
  /* Piledriver is free and starts owned and equipped, so a first run has
     something to think about rather than three empty slots */
  s.owned.piledriver = 1;
  if (!s.slots.some((x) => x === "piledriver") && !s.slots[0]) s.slots[0] = "piledriver";
  for (let i = 0; i < ABIL_SLOTS; i++) if (s.slots[i] && !abilOf(s.slots[i])) s.slots[i] = null;
  return s;
}
const abilOwned = (id) => !!abilSave().owned[id];
function abilSlotOf(id) { return abilSave().slots.indexOf(id); }
/* Dropping an ability into a slot: if it is already in another slot the two
   trade places, so re-ordering a loadout never silently drops one. */
function abilEquip(id, slot) {
  const s = abilSave();
  if (slot < 0 || slot >= ABIL_SLOTS) return;
  const was = s.slots.indexOf(id);
  const evicted = s.slots[slot] || null;
  s.slots[slot] = id;
  if (was >= 0 && was !== slot) s.slots[was] = evicted;
  persist();
}
function abilUnequip(slot) { const s = abilSave(); s.slots[slot] = null; persist(); }
function equippedAbilities() { return abilSave().slots.map((id) => (id ? abilOf(id) : null)); }
function hasAbil(id) { return !!(G.abil && G.abil.has[id]); }

/* ---- run state -------------------------------------------------------- */
/* One flat object rather than per-ability closures: every ability's state
   lives here, the hooks below read it by name, and clearing a run is one
   assignment. */
function abilReset() {
  const slots = abilSave().slots;
  const has = {};
  slots.forEach((id) => { if (id) has[id] = 1; });
  G.abil = {
    slots, has,
    cd: [0, 0, 0],
    wells: [],        /* Gravity Well */
    bank: 0,          /* Counterweight — banked shove magnitude */
    fields: [],       /* Stutter Field */
    queue: [],        /* Second Trigger — shots waiting to go off again */
    oc: 0, ocT: 0,    /* Overclock stacks and decay */
    conduitT: 0,
  };
}

/* ---- tuning ----------------------------------------------------------- */
/* damage per px of shove the wall refused. A dash-through (74px on a
   weight-1 body) into a wall lands about 190; a pulse shove barely
   qualifies; a Trench at weight 3.6 gets a third of the travel and so a
   third of the damage. Strong on purpose — it needs a wall AND a big
   shove — but not so strong that Piledriver alone is a build. */
const PILE_WALL_DMG = 1.7;
const PILE_MIN_TRAVEL = 18;   /* shove travel below this doesn't count as an impact */
const PILE_STUN = .9;         /* seconds a piledriven body is stunned */
const WELL_R = 230;           /* gravity well radius */
const WELL_PULL = 330;        /* px/s of pull at the rim */
const WELL_LIFE = 1.8;
const CW_BANK_MAX = 1400;     /* ceiling on banked shove */
const CW_DMG = .085;          /* damage per unit of bank released */
const CW_SHOVE = .16;         /* px of shove per unit of bank released */
const SHRAP_N = 7;            /* fragments from a shrapnel kill */
const SHRAP_DMG = 16;
const BRAND_MAX = 5;
const BRAND_LIFE = 6;
const BRAND_AMP = .07;        /* extra damage taken, per stack */
const CONDUIT_EVERY = .6;
const CONDUIT_DMG = 13;       /* per arc, per stack of the deeper brand */
const CONDUIT_RANGE = 300;
const DET_DMG = 26;           /* detonation damage per stack, plus the square term */
const DET_R = 120;
const HARVEST_HP = 1;         /* integrity per stack */
const STUTTER_R = 170;
const STUTTER_LIFE = 3.5;
const STUTTER_RATE = .35;     /* how fast the room runs inside it */
const ST_DELAY = .32;         /* Second Trigger: delay on the repeat */
const ST_DMG = .66;           /* ...and its damage, as a fraction */
const REWIND_BACK = 1.6;      /* seconds Rewind Step goes back */
const REWIND_IFRAME = .5;
const OC_MAX = 10;
const OC_RATE = .04;          /* fire rate per stack */
const OC_SPEED = .02;         /* move speed per stack */
const OC_DECAY = 4;           /* seconds after the last kill before stacks bleed */

/* ---- brands ----------------------------------------------------------- */
function brandEnemy(e, n) {
  if (!e || e.dead) return;
  e.brand = Math.min(BRAND_MAX, (e.brand || 0) + (n || 1));
  e.brandT = BRAND_LIFE;
}
/* read by damageEnemy: a branded body takes more from everything, not just
   from the ability that branded it */
function brandAmp(e) {
  return e.brand > 0 ? 1 + e.brand * BRAND_AMP : 1;
}
function clearBrand(e) { e.brand = 0; e.brandT = 0; }

/* ---- the hooks -------------------------------------------------------- */
/* Called once per frame, before the enemies move. */
function abilTick(dt) {
  const A = G.abil, p = G.player;
  if (!A || !p) return;
  for (let i = 0; i < ABIL_SLOTS; i++) A.cd[i] = Math.max(0, A.cd[i] - dt);

  /* Overclock bleeds off if you stop killing */
  if (A.oc > 0) {
    A.ocT -= dt;
    if (A.ocT <= 0) { A.oc--; A.ocT = .45; }
  }

  /* Gravity Well */
  for (let i = A.wells.length - 1; i >= 0; i--) {
    const w = A.wells[i];
    w.life -= dt;
    if (w.life <= 0) {
      /* the collapse: a last hard tug inward, so the pack is tightest at the
         moment the well ends — which is the moment you want to detonate */
      ring(w.x, w.y, TH.echo, WELL_R, 10, .35, 3);
      burst(w.x, w.y, 18, TH.echo, 1.1);
      Audio_.swap();
      A.wells.splice(i, 1);
      continue;
    }
    const f = clamp(w.life / WELL_LIFE, 0, 1);
    for (const e of G.enemies) {
      if (e.dead || BOSSES[e.type]) continue;
      const dx = w.x - e.x, dy = w.y - e.y, d = Math.hypot(dx, dy);
      if (d > WELL_R || d < 4) continue;
      const pull = WELL_PULL * (1 - d / WELL_R) / Math.max(.4, enWeight(e) * .6);
      e.x += (dx / d) * pull * dt; e.y += (dy / d) * pull * dt;
      if (!BOSSES[e.type]) arenaPush(e);
    }
    for (const h of G.hostiles) {
      const dx = w.x - h.x, dy = w.y - h.y, d = Math.hypot(dx, dy);
      if (d > WELL_R || d < 4) continue;
      h.vx += (dx / d) * 160 * dt; h.vy += (dy / d) * 160 * dt;
    }
    if (chance(dt * 26)) {
      const a = rnd(TAU);
      part(w.x + Math.cos(a) * WELL_R, w.y + Math.sin(a) * WELL_R,
        { col: TH.echo, a: a + Math.PI, s: rnd(180, 90), life: .5, size: rnd(1, 2.4) });
    }
    w.f = f;
  }

  /* Stutter fields */
  for (let i = A.fields.length - 1; i >= 0; i--) {
    const f = A.fields[i];
    f.life -= dt;
    if (f.life <= 0) { ring(f.x, f.y, TH.core, STUTTER_R, STUTTER_R * .2, .4, 2.4); A.fields.splice(i, 1); }
  }
  /* the projectiles already in the air crawl too, which is the half that
     makes it a defensive tool rather than a damage one */
  if (A.fields.length) {
    for (const h of G.hostiles) {
      if (!stutterAt(h.x, h.y)) continue;
      h.x -= h.vx * dt * (1 - STUTTER_RATE);
      h.y -= h.vy * dt * (1 - STUTTER_RATE);
    }
  }

  /* Conduit */
  if (A.has.conduit) {
    A.conduitT -= dt;
    if (A.conduitT <= 0) {
      A.conduitT = CONDUIT_EVERY;
      const marked = G.enemies.filter((e) => !e.dead && e.brand > 0);
      for (const e of marked) {
        let best = null, bd = CONDUIT_RANGE;
        for (const o of marked) {
          if (o === e || o.dead) continue;
          const d = dist(o, e);
          if (d < bd) { bd = d; best = o; }
        }
        if (!best) continue;
        beam(e.x, e.y, best.x, best.y, TH.echo, .18);
        damageEnemy(best, CONDUIT_DMG * Math.max(e.brand, best.brand) * G.mods.dmgMul,
          { noCrit: true, spark: chance(.25) });
      }
      if (marked.length > 1) Audio_.rateOk("conduit", .18) && Audio_.tone({ type: "sine", freq: 880, to: 1320, dur: .09, gain: .03 });
    }
  }

  /* Second Trigger — shots fired again from where you stood */
  for (let i = A.queue.length - 1; i >= 0; i--) {
    const q = A.queue[i];
    q.t -= dt;
    if (q.t > 0) continue;
    A.queue.splice(i, 1);
    G.bullets.push({ x: q.x, y: q.y, vx: Math.cos(q.a) * 980, vy: Math.sin(q.a) * 980,
      dmg: q.dmg, r: 3.1, life: 1.1, pierce: G.mods.pierce, hits: [], second: 1 });
    ghost(q.x, q.y, q.a, TH.echo, { r: 11, life: .2, a: .3 });
    Audio_.rateOk("st", .05) && Audio_.shoot(1.35);
  }
}
function stutterAt(x, y) {
  const A = G.abil;
  if (!A || !A.fields.length) return 0;
  for (const f of A.fields) if (Math.hypot(x - f.x, y - f.y) < STUTTER_R) return 1;
  return 0;
}
/* the rate the room runs at here — folded into the enemy update's dt */
function abilSlowAt(x, y) { return stutterAt(x, y) ? STUTTER_RATE : 1; }

/* A pulse connected. */
function abilOnHit(e, b, dmg) {
  const A = G.abil;
  if (!A) return;
  if (A.has.brand && !b.second) brandEnemy(e, 1);
  else if (A.has.brand && b.second) brandEnemy(e, 1);
}
/* A shot left the barrel. */
function abilOnFire(x, y, a, dmg) {
  const A = G.abil;
  if (!A || !A.has.secondtrigger) return;
  if (A.queue.length > 24) return;
  A.queue.push({ x, y, a, dmg: dmg * ST_DMG, t: ST_DELAY });
}
/* Something died. */
function abilOnKill(e) {
  const A = G.abil;
  if (!A) return;
  if (A.has.overclock) { A.oc = Math.min(OC_MAX, A.oc + 1); A.ocT = OC_DECAY; }
  if (A.has.harvest && e.brand > 0) {
    const p = G.player;
    p.ammo = Math.min(p.ammoMax, p.ammo + e.brand);
    healPlayer(HARVEST_HP * e.brand);
    ring(e.x, e.y, TH.shard, 4, 40, .3, 2);
  }
  if (A.has.shrapnel && e.sh) {
    /* it comes apart along the way it was going */
    const base = e.sh.ang;
    for (let i = 0; i < SHRAP_N; i++) {
      const a = base + rnd(-.7, .7);
      G.bullets.push({ x: e.x, y: e.y, vx: Math.cos(a) * rnd(880, 520), vy: Math.sin(a) * rnd(880, 520),
        dmg: SHRAP_DMG * G.mods.dmgMul, r: 2.6, life: .5, pierce: 1, hits: [], second: 1 });
    }
    directionalBurst(e.x, e.y, 10, ecol(EN[e.type].col), 1.4, base, { life: .35 });
  }
}
/* A projectile wanted to shove you. Returns true if Counterweight ate it. */
function abilEatKnockback(mag) {
  const A = G.abil;
  if (!A || !A.has.counterweight) return false;
  A.bank = Math.min(CW_BANK_MAX, A.bank + mag);
  const p = G.player;
  ring(p.x, p.y, TH.shard, 6, 34, .22, 2);
  return true;
}
/* You dashed. */
function abilOnDash(p) {
  const A = G.abil;
  if (!A) return;
  if (A.has.counterweight && A.bank > 60) {
    const n = A.bank;
    A.bank = 0;
    const R = 120 + Math.min(150, n * .12);
    ring(p.x, p.y, TH.shard, 12, R, .4, 4);
    shock(p.x, p.y, { r0: 14, r1: R, life: .34, col: TH.shard, w: 5 });
    flash(.1, TH.shard); shake(.3); Audio_.surge();
    text(p.x, p.y - 40, "counterweight", TH.shard, 15);
    for (const e of G.enemies.slice()) {
      if (dist(e, p) > R) continue;
      const a = Math.atan2(e.y - p.y, e.x - p.x);
      damageEnemy(e, n * CW_DMG * G.mods.dmgMul, { noCrit: true, ang: a });
      shoveEnemy(e, a, n * CW_SHOVE);
    }
  }
}
/* A body finished being shoved. Piledriver decides here whether it landed
   against something — which is why this fires when the shove ENDS rather
   than when it starts. */
function abilOnShoveEnd(e, travelled, blocked, ang) {
  const A = G.abil;
  if (!A || !A.has.piledriver || !blocked || e.dead) return;
  if (travelled < PILE_MIN_TRAVEL) return;
  const dmg = travelled * PILE_WALL_DMG * G.mods.dmgMul;
  e.stun = Math.max(e.stun || 0, PILE_STUN);
  damageEnemy(e, dmg, { noCrit: true, ang: ang + Math.PI });
  shock(e.x, e.y, { r0: e.r, r1: e.r * 4, life: .26, col: TH.shard, w: 4, ang: ang + Math.PI, arc: 2.4 });
  directionalBurst(e.x, e.y, 12, TH.shard, 1.5, ang + Math.PI, { life: .4 });
  text(e.x, e.y - e.r - 16, Math.round(dmg), TH.shard, 14);
  hitStop(HITSTOP_LIGHT); shake(.22);
  Audio_.rateOk("pile", .06) && Audio_.boom();
}
/* Slot 1-3 pressed. */
function abilUse(slot) {
  const A = G.abil, p = G.player;
  if (!A || !p || G.mode !== "play") return;
  const a = abilOf(A.slots[slot]);
  if (!a || a.kind !== "active") return;
  if (A.cd[slot] > 0) { Audio_.ui(false); return; }
  A.cd[slot] = a.cd;
  if (a.id === "well") {
    A.wells.push({ x: p.x, y: p.y, life: WELL_LIFE, f: 1 });
    ring(p.x, p.y, TH.echo, 10, WELL_R, .5, 3);
    Audio_.echo(); text(p.x, p.y - 36, "well", TH.echo, 15);
  } else if (a.id === "detonate") {
    const marked = G.enemies.filter((e) => !e.dead && e.brand > 0);
    if (!marked.length) { A.cd[slot] = 1; Audio_.ui(false); return; }
    for (const e of marked) {
      const n = e.brand;
      /* the square term is the point: five stacks is not five ones */
      const dmg = DET_DMG * n * (1 + n * .35) * G.mods.dmgMul;
      clearBrand(e);
      ring(e.x, e.y, TH.echo, 6, DET_R, .34, 3);
      explode(e.x, e.y, DET_R, 0, TH.echo, 1);
      damageEnemy(e, dmg, { noCrit: true });
    }
    flash(.14, TH.echo); shake(.34); Audio_.boom();
    text(p.x, p.y - 40, marked.length + " detonated", TH.echo, 16);
  } else if (a.id === "stutter") {
    A.fields.push({ x: p.x, y: p.y, life: STUTTER_LIFE, max: STUTTER_LIFE });
    ring(p.x, p.y, TH.core, 10, STUTTER_R, .5, 3);
    Audio_.coldRing(); text(p.x, p.y - 36, "stutter", TH.core, 15);
  } else if (a.id === "rewind") {
    const back = Math.min(p.hist.length - 1, Math.round(REWIND_BACK * 60));
    const node = p.hist[Math.max(0, p.hist.length - 1 - back)];
    if (!node) { A.cd[slot] = 1; return; }
    for (let i = 0; i <= 8; i++) {
      const f = i / 8;
      ghost(lerp(p.x, node.x, f), lerp(p.y, node.y, f), p.aim, TH.core,
        { r: p.r, life: .2 + f * .2, a: .4 });
    }
    p.x = node.x; p.y = node.y;
    p.vx *= .2; p.vy *= .2; p.kb.x *= .1; p.kb.y *= .1;
    p.ported = 1; playerBounds(p);
    p.iframe = Math.max(p.iframe, REWIND_IFRAME);
    p.ammo = p.ammoMax;
    ring(p.x, p.y, TH.core, 8, 110, .45, 3);
    flash(.08, TH.core); Audio_.swap();
    text(p.x, p.y - 36, "rewind", TH.core, 15);
  }
}
/* multipliers the player's own maths reads each frame */
function abilRateMul() {
  const A = G.abil;
  return A && A.has.overclock ? 1 + A.oc * OC_RATE : 1;
}
function abilSpeedMul() {
  const A = G.abil;
  return A && A.has.overclock ? 1 + A.oc * OC_SPEED : 1;
}

/* ---- drawing ---------------------------------------------------------- */
/* under the fight */
function abilPaint() {
  const A = G.abil;
  if (!A) return;
  for (const w of A.wells) {
    const f = clamp(w.life / WELL_LIFE, 0, 1);
    const g = ctx.createRadialGradient(w.x, w.y, 4, w.x, w.y, WELL_R);
    g.addColorStop(0, "rgba(" + TH.echo + ",.30)");
    g.addColorStop(.5, "rgba(" + TH.echo + ",.07)");
    g.addColorStop(1, "rgba(" + TH.echo + ",0)");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(w.x, w.y, WELL_R, 0, TAU); ctx.fill();
    ctx.strokeStyle = "rgba(" + TH.echo + ",.5)"; ctx.lineWidth = 2;
    ctx.setLineDash([10, 12]); ctx.lineDashOffset = G.time * 70;
    ctx.beginPath(); ctx.arc(w.x, w.y, WELL_R * (.25 + f * .75), 0, TAU); ctx.stroke();
    ctx.setLineDash([]);
    for (let i = 0; i < 4; i++) {
      const a = G.time * 2.4 + (i / 4) * TAU;
      ctx.strokeStyle = "rgba(" + TH.echo + ",.35)"; ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(w.x, w.y, WELL_R * .55, a, a + .8);
      ctx.stroke();
    }
  }
  for (const f of A.fields) {
    const k = clamp(f.life / f.max, 0, 1);
    ctx.fillStyle = "rgba(" + TH.core + "," + (.06 + k * .05) + ")";
    ctx.beginPath(); ctx.arc(f.x, f.y, STUTTER_R, 0, TAU); ctx.fill();
    ctx.strokeStyle = "rgba(" + TH.core + "," + (.3 + k * .3) + ")"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(f.x, f.y, STUTTER_R, 0, TAU); ctx.stroke();
    /* a second hand that stutters rather than sweeps, so the name reads */
    const step = Math.floor(G.time * 4) / 4;
    ctx.strokeStyle = "rgba(" + TH.core + ",.5)"; ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.moveTo(f.x, f.y);
    ctx.lineTo(f.x + Math.cos(step * 2) * STUTTER_R * .8, f.y + Math.sin(step * 2) * STUTTER_R * .8);
    ctx.stroke();
  }
}
/* the brand pips, drawn with the bodies that carry them */
function drawBrand(e) {
  if (!e.brand) return;
  const n = e.brand, r = e.r + 11;
  ctx.save();
  ctx.strokeStyle = "rgba(" + TH.echo + ",.9)";
  ctx.lineWidth = 2.6;
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (i / BRAND_MAX) * TAU;
    ctx.beginPath();
    ctx.arc(e.x, e.y, r, a - .16, a + .16);
    ctx.stroke();
  }
  ctx.globalAlpha = .25 + Math.sin(G.time * 7) * .12;
  ctx.strokeStyle = "rgb(" + TH.echo + ")"; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.arc(e.x, e.y, r, 0, TAU); ctx.stroke();
  ctx.restore();
}
/* the loadout readout, bottom-right in world space */
function abilOver() {
  const A = G.abil;
  if (!A) return;
  if (A.has.counterweight && A.bank > 40) {
    const p = G.player, f = clamp(A.bank / CW_BANK_MAX, 0, 1);
    ctx.save();
    ctx.translate(p.x, p.y - 40);
    ctx.fillStyle = "rgba(0,0,0,.35)";
    rrect(-22, -3, 44, 6, 3); ctx.fill();
    ctx.fillStyle = "rgb(" + TH.shard + ")";
    rrect(-21, -2, 42 * f, 4, 2); ctx.fill();
    ctx.restore();
  }
  if (A.has.overclock && A.oc > 0) {
    const p = G.player;
    ctx.save();
    ctx.font = "700 11px " + MONO; ctx.textAlign = "center";
    ctx.fillStyle = "rgba(" + TH.shard + ",.9)";
    ctx.fillText("x" + A.oc, p.x, p.y + 46);
    ctx.textAlign = "left";
    ctx.restore();
  }
}

/* =====================================================================
   SPECIAL GRADE — the survival mutations
   =====================================================================
   Survival has no boss any more. What it has instead is a chance, rolled on
   every single spawn, that the body that walks in is a SPECIAL GRADE: the
   same enemy, wearing a gold corona you cannot miss, with every stat raised
   and one ability that the base version does not have.

   Every enemy in the game has a mutation — all thirty-six of them, from the
   Mote up. They are built from a shared set of primitives (`fx` below)
   because that is the only way thirty-six of them can be reliable rather
   than thirty-six separate piles of special cases, but each one is tuned and
   named for the body it belongs to, so a Special Grade Bulwark and a Special
   Grade Weaver are not the same fight with a different colour.

   The primitives:
     revive n    once, at n of max health, it comes back to n and speeds up
     regen n     heals n of max health per second
     ward n      takes n less damage while above half health
     haste n     up to n faster the lower its health goes
     rate n      acts and fires n faster
     volley n    every shot it fires becomes n shots in a spread
     split t,n   on death, n of type t
     burst r,d   on death, an explosion
     rot r,dps   on death, ground that keeps burning
     blink n     every n seconds it steps toward you
     summon t,n  calls a lesser body every n seconds
     aura r,n    everything friendly inside r takes n less damage
     chill n     touching it slows you for n seconds
     reflect n   n of every pulse comes back as a shot
     drag n      it pulls you toward it, constantly
   ===================================================================== */
const MUT_HP = 3.2;       /* health multiplier on top of everything else */
const MUT_DMG = 1.5;
const MUT_SPEED = 1.16;
const MUT_R = 1.18;       /* it is physically bigger, so it reads at a glance */
const MUT_WEIGHT = 1.7;   /* and heavier, so it shrugs off shoves */
const MUT_SHARDS = 5;     /* worth killing */
const MUT_SCORE = 6;
const MUT_BASE_CHANCE = .045;   /* at survival wave 1 */
const MUT_PER_WAVE = .0065;     /* ...climbing per wave */
const MUT_MAX_CHANCE = .24;

const MUT = {
  /* ---- Chamber 09 ---- */
  husk:        { name: "Second Wind",    fx: { revive: .45, haste: .4 } },
  dart:        { name: "Third Lunge",    fx: { rate: 1.5, rot: [44, 24] } },
  bloom:       { name: "Chain Bloom",    fx: { burst: [210, 36], split: ["bloom", 2] } },
  colossus:    { name: "Aftershock",     fx: { burst: [240, 30], ward: .35 } },
  weaver:      { name: "Loomwork",       fx: { volley: 3, rate: 1.25 } },
  spore:       { name: "Bloomburst",     fx: { split: ["mote", 6], rot: [70, 20] } },
  mote:        { name: "Swarm Link",     fx: { aura: [130, .3], rate: 1.3 } },
  bulwark:     { name: "Full Shell",     fx: { ward: .5, reflect: .5 } },
  needle:      { name: "Throughline",    fx: { rate: 1.45, volley: 2 } },
  mimic:       { name: "Perfect Copy",   fx: { rate: 1.5, blink: 3.2 } },
  mirror:      { name: "Refraction",     fx: { volley: 3, rate: 1.2 } },
  warden:      { name: "Double Leash",   fx: { drag: 90, ward: .3 } },
  revenant:    { name: "Afterimage",     fx: { blink: 1.6, rate: 1.35 } },
  howitzer:    { name: "Cluster Shell",  fx: { volley: 3, rot: [80, 26] } },
  hexer:       { name: "Fourth Beam",    fx: { rate: 1.5, ward: .25 } },
  broodmother: { name: "Hatchery",       fx: { summon: ["mote", 1.6], regen: .04 } },
  /* ---- Glassfall ---- */
  facet:       { name: "Prismatic",      fx: { volley: 3, rate: 1.3 } },
  prism:       { name: "Total Internal", fx: { reflect: .75, ward: .4 } },
  rime:        { name: "Deep Freeze",    fx: { chill: 1.1, haste: .5 } },
  silica:      { name: "Quarry",         fx: { rate: 1.6, regen: .03 } },
  kelvin:      { name: "Absolute",       fx: { rate: 1.5, chill: .8 } },
  /* ---- Emberwake ---- */
  filament:    { name: "Live Wire",      fx: { rot: [56, 30], haste: .45 } },
  corona:      { name: "Solar Flare",    fx: { volley: 3, burst: [220, 26] } },
  cinder:      { name: "Ignition",       fx: { rot: [96, 34], rate: 1.4 } },
  helion:      { name: "Overdrive",      fx: { ward: .4, volley: 2, rate: 1.2 } },
  ignis:       { name: "Runaway",        fx: { rate: 1.7, haste: .35 } },
  /* ---- Nulltide ---- */
  fathom:      { name: "Echo Ping",      fx: { volley: 2, rate: 1.4 } },
  undine:      { name: "Riptide",        fx: { drag: 70, haste: .5 } },
  caustic:     { name: "Focal Burst",    fx: { burst: [200, 30], rate: 1.3 } },
  trench:      { name: "Breach",         fx: { ward: .4, blink: 3.4, burst: [200, 28] } },
  sounding:    { name: "Depth Array",    fx: { volley: 3, rate: 1.35 } },
  /* ---- Terminus ---- */
  vestige:     { name: "Recursion",      fx: { revive: .5, rate: 1.25 } },
  coda:        { name: "Stretto",        fx: { rate: 1.9 } },
  nullc:       { name: "Null Field",     fx: { aura: [170, .35], reflect: .6 } },
  epilogue:    { name: "Footnote",       fx: { volley: 2, rate: 1.4, rot: [70, 22] } },
  zenith:      { name: "Full Draft",     fx: { rate: 1.4, ward: .3, haste: .4 } },
};
const mutOf = (type) => MUT[type] || null;
/* Bosses are excluded because survival no longer has any, and because a
   Special Grade boss would be a different feature. */
function mutChance() {
  if (!G.survival) return 0;
  return clamp(MUT_BASE_CHANCE + (G.wave || 1) * MUT_PER_WAVE, 0, MUT_MAX_CHANCE);
}
/* Turns a freshly spawned body into a Special Grade. Called from spawnEnemy,
   so everything downstream — the AI, the art, the shove maths — sees a normal
   enemy that simply has bigger numbers and an `e.mut` on it. */
function makeSpecial(e) {
  const m = mutOf(e.type);
  if (!m || BOSSES[e.type]) return false;
  e.mut = m;
  e.mutT = 0;
  e.hp *= MUT_HP; e.maxHp *= MUT_HP;
  e.dmg *= MUT_DMG;
  e.sp *= MUT_SPEED;
  e.r *= MUT_R;
  const fx = m.fx;
  if (fx.rate) e.rateMul = (e.rateMul || 1) * fx.rate;
  if (fx.revive) e.mutRevive = 1;
  banner("Special grade", EN[e.type].label.toLowerCase() + " · " + m.name.toLowerCase());
  ring(e.x, e.y, "255,214,138", 10, 150, .7, 4);
  burst(e.x, e.y, 26, "255,214,138", 1.4);
  flash(.13, "255,214,138");
  Audio_.secretFx();
  return true;
}
/* the weight multiplier the shove maths reads */
function mutWeight(e) { return e.mut ? MUT_WEIGHT : 1; }

/* ---- the primitives, ticked ------------------------------------------- */
function mutTick(e, dt) {
  const m = e.mut;
  if (!m) return;
  const fx = m.fx, p = G.player;
  e.mutT += dt;
  if (fx.regen && e.hp < e.maxHp) e.hp = Math.min(e.maxHp, e.hp + e.maxHp * fx.regen * dt);
  if (fx.summon) {
    e.mutSummonT = (e.mutSummonT || fx.summon[1]) - dt;
    if (e.mutSummonT <= 0 && G.enemies.length < 60) {
      e.mutSummonT = fx.summon[1];
      const a = rnd(TAU);
      const s = spawnEnemy(fx.summon[0], e.x + Math.cos(a) * (e.r + 14), e.y + Math.sin(a) * (e.r + 14));
      shoveEnemy(s, a, 40);
      ring(e.x, e.y, "255,214,138", 6, e.r * 2.2, .3, 2);
    }
  }
  if (fx.blink) {
    e.mutBlinkT = (e.mutBlinkT || fx.blink) - dt;
    if (e.mutBlinkT <= 0) {
      e.mutBlinkT = fx.blink;
      const a = Math.atan2(p.y - e.y, p.x - e.x);
      const step = Math.min(190, dist(e, p) - (e.r + p.r + 30));
      if (step > 30) {
        ghost(e.x, e.y, a, "255,214,138", { r: e.r, life: .3, a: .5, grow: .2 });
        e.x += Math.cos(a) * step; e.y += Math.sin(a) * step;
        arenaPush(e); keepOnScreen(e);
        burst(e.x, e.y, 10, "255,214,138", 1);
      }
    }
  }
  if (fx.drag) {
    const d = dist(e, p);
    if (d > e.r + p.r + 6 && d < 460) {
      const a = Math.atan2(e.y - p.y, e.x - p.x);
      p.env.x += Math.cos(a) * fx.drag; p.env.y += Math.sin(a) * fx.drag;
    }
  }
  if (fx.chill && dist(e, p) < e.r + p.r + 8) {
    p.chill = Math.max(p.chill || 0, fx.chill);
  }
}
/* damage taken, after everything else has had its say */
function mutResist(e, d) {
  const m = e.mut;
  if (!m) return d;
  const fx = m.fx;
  if (fx.ward && e.hp > e.maxHp * .5) d *= (1 - fx.ward);
  if (fx.aura) {
    /* the ward is shared: anything friendly standing close to it is harder
       to kill too, which is what makes a Special Grade Mote a problem */
  }
  return d;
}
/* the shared ward, read by damageEnemy for EVERY body */
function mutAuraResist(e) {
  if (!G.enemies.length) return 1;
  let best = 1;
  for (const o of G.enemies) {
    if (o === e || o.dead || !o.mut || !o.mut.fx.aura) continue;
    const [r, n] = o.mut.fx.aura;
    if (dist(o, e) < r) best = Math.min(best, 1 - n);
  }
  return best;
}
/* a pulse connecting: reflect sends part of it back */
function mutOnPulse(e, b) {
  const m = e.mut;
  if (!m || !m.fx.reflect || !chance(m.fx.reflect)) return;
  const back = Math.atan2(b.vy, b.vx) + Math.PI + rnd(-.3, .3);
  G.hostiles.push({ x: e.x, y: e.y, vx: Math.cos(back) * 460 * HOSTILE_SPEED_MUL,
    vy: Math.sin(back) * 460 * HOSTILE_SPEED_MUL, r: 5.5, dmg: b.dmg * .8, life: 2.4,
    col: "255,214,138", spin: 0, split: 0 });
  Audio_.rateOk("mref", .1) && Audio_.deflect();
}
/* every shot a Special Grade fires, widened into a volley */
function mutOnShoot(e, h, ang) {
  const m = e.mut;
  if (!m || !m.fx.volley || !h) return;
  const n = m.fx.volley;
  const spread = .16;
  for (let i = 1; i < n; i++) {
    const k = i % 2 ? Math.ceil(i / 2) : -Math.ceil(i / 2);
    const a = ang + k * spread;
    const sp = Math.hypot(h.vx, h.vy);
    G.hostiles.push({ x: h.x, y: h.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      r: h.r, dmg: h.dmg, life: h.life, col: "255,214,138", spin: 0, split: h.split });
  }
}
/* it died — or did it */
function mutOnDeath(e) {
  const m = e.mut;
  if (!m) return false;
  const fx = m.fx;
  if (fx.revive && e.mutRevive) {
    /* it gets up once */
    e.mutRevive = 0;
    e.hp = e.maxHp * fx.revive;
    e.dead = false;
    e.sp *= 1 + (fx.haste || .3);
    e.iframeT = .3;
    ring(e.x, e.y, "255,214,138", 8, 140, .6, 4);
    burst(e.x, e.y, 26, "255,214,138", 1.5);
    text(e.x, e.y - e.r - 20, m.name.toUpperCase(), "255,214,138", 15);
    flash(.1, "255,214,138"); Audio_.secretFx();
    return true;
  }
  if (fx.burst) explode(e.x, e.y, fx.burst[0], fx.burst[1], "255,214,138", 1);
  if (fx.rot) zone(e.x, e.y, fx.rot[0], 4.5, fx.rot[1], "255,214,138");
  if (fx.split) {
    const [t, n] = fx.split;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + rnd(.5);
      const s = spawnEnemy(t, e.x + Math.cos(a) * (e.r + 10), e.y + Math.sin(a) * (e.r + 10));
      shoveEnemy(s, a, 70);
    }
  }
  return false;
}
/* haste is read as a speed multiplier each frame rather than applied once,
   so it ramps smoothly as the body is worn down */
function mutSpeedMul(e) {
  const m = e.mut;
  if (!m || !m.fx.haste) return 1;
  return 1 + m.fx.haste * (1 - clamp(e.hp / e.maxHp, 0, 1));
}

/* ---- the gold ---------------------------------------------------------
   A Special Grade has to be unmistakable from across the room and at a
   glance, because the correct response to one is usually "deal with that
   first". Three layers: a wide corona that pulses, a hard rotating ring,
   and a name plate. */
function specialAura(e) {
  const t = G.time, r = e.r;
  ctx.save();
  const g = ctx.createRadialGradient(0, 0, r * .6, 0, 0, r * 3.1);
  g.addColorStop(0, "rgba(255,214,138,.5)");
  g.addColorStop(.45, "rgba(255,190,80,.22)");
  g.addColorStop(1, "rgba(255,170,60,0)");
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(0, 0, r * 3.1, 0, TAU); ctx.fill();
  ctx.rotate(t * 1.1);
  ctx.strokeStyle = "rgba(255,226,160,.95)"; ctx.lineWidth = 2.6;
  polyPath(r * 1.7 + Math.sin(t * 3.4) * 2, 6, 0, .9); ctx.stroke();
  ctx.rotate(-t * 2.2);
  ctx.strokeStyle = "rgba(255,246,214,.6)"; ctx.lineWidth = 1.4;
  polyPath(r * 2.15, 3, 0, .9); ctx.stroke();
  ctx.restore();
  ctx.save();
  ctx.globalAlpha = .5 + Math.sin(t * 5) * .25;
  ctx.strokeStyle = "rgb(255,214,138)"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(0, 0, r * 1.34, 0, TAU); ctx.stroke();
  ctx.restore();
}
/* the plate, drawn in world space with the health bar rather than inside the
   body's own transform, so a squashed or spinning body doesn't drag it */
function drawSpecialPlate(e) {
  if (!e.mut) return;
  ctx.save();
  ctx.font = "700 10px " + MONO;
  ctx.textAlign = "center";
  const label = e.mut.name.toUpperCase();
  const w = ctx.measureText(label).width + 14;
  const y = e.y - e.r - 26;
  ctx.fillStyle = "rgba(0,0,0,.45)";
  rrect(e.x - w / 2, y - 10, w, 14, 7); ctx.fill();
  ctx.strokeStyle = "rgba(255,214,138,.8)"; ctx.lineWidth = 1;
  rrect(e.x - w / 2, y - 10, w, 14, 7); ctx.stroke();
  ctx.fillStyle = "rgb(255,226,160)";
  ctx.fillText(label, e.x, y);
  ctx.textAlign = "left";
  ctx.restore();
}

/* ---- last, because it needs everything ---------------------------------
   The Trophy Road's arena ladders are brought up to date here rather than
   in 02c-trophy-road.js: a ladder rung can grant an ability, and ABIL/
   abilSave() are defined in this file, which loads last. A save migrated
   from before the road existed arrives with a full arena's worth of
   baseline trophies and has genuinely earned its first rungs. */
claimAllLadders();
