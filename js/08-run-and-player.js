/* Run setup, level/wave progression, survival mode, damage resolution, and player controls (fire, dash, time-swap, echo summon, movement). */
/* ---------------- run setup -------------------------------------------- */
function baseMods() {
  return {
    dmgMul: 1 + lvlOf("pulse") * .10, rateMul: 1 + lvlOf("rate") * .07,
    multishot: 0, pierce: 0, homing: 0, explosive: 0,
    crit: lvlOf("crit") * .06, critMul: 3,
    dashCdMul: Math.pow(.87, lvlOf("dashCd")), dashDmgMul: 1 + lvlOf("dashDmg") * .35,
    dashShock: 0, dashBurn: 0,
    echoLifeMul: 1 + lvlOf("echoLife") * .25, echoDmgMul: 1 + lvlOf("echoDmg") * .30,
    echoTwin: 0, echoBoom: 0, echoRate: 1,
    lifesteal: 0, thorns: 0, chain: 0, execute: 0, secondWind: 0,
    magnetMul: 1 + lvlOf("collect") * .3, shardMul: 1 + lvlOf("collect") * .15,
    hpMul: 1, speedMul: 1,
    swapWave: lvlOf("swapWave"), swapFree: lvlOf("swapFree"), decoyGuard: lvlOf("decoyGuard"),
    traceRead: lvlOf("traceRead"), brake: lvlOf("brake"), salvage: lvlOf("salvage"),
  };
}
function makePlayer() {
  const maxHp = Math.round((100 + lvlOf("hp") * 15) * G.mods.hpMul);
  return {
    x: W / 2, y: H * .6, vx: 0, vy: 0, r: 13, aim: -Math.PI / 2,
    hp: maxHp, maxHp, fireCd: 0, hurtFlash: 0, iframe: 0,
    dashMax: 1, dash: 1, dashCd: 0, dashing: 0, dashHits: null,
    echoMax: 1 + lvlOf("echoCharge"), echo: 1 + lvlOf("echoCharge"), echoCd: 0,
    surge: 0, surgeActive: 0,
    shieldMax: lvlOf("shield"), shield: lvlOf("shield"), shieldCd: 0,
    hist: [], regen: lvlOf("regen") * .5, windUsed: false,
    recallCd: 0, swapFlash: 0,
  };
}
function clearWorld() {
  G.enemies = []; G.bullets = []; G.hostiles = []; G.pickups = []; G.echoes = []; G.lasers = []; G.traces = [];
  G.parts = []; G.rings = []; G.texts = []; G.zones = []; G.beams = []; G.portals = []; G.queue = [];
  G.ghosts = []; G.shocks = []; G.debris = []; G.corpses = [];
  G.boss = null; G.trauma = 0; G.freeze = 0;
  G.stasis = []; G.chill = []; G.pillars = []; G.charges = []; G.omegaEchoes = [];
  G.wake = []; G.snap = []; G.safeWedge = null;
}
function newRun(survival) {
  G.mode = "play"; G.attract = false; G.paused = false; G.drafting = false; G.carding = false;
  G.survival = !!survival; G.elites = 0;
  G.chroma = 0; G.slowmo = 0; G.deathT = 0;
  G.mods = baseMods(); G.cores = {};
  G.score = 0; G.kills = 0; G.shards = 0; G.combo = 0; G.comboTimer = 0; G.runTime = 0;
  G.levelIdx = 0; G.loop = 0; G.wave = 0; G.breather = 0; G.draftIn = 0;
  clearWorld();
  resetBranchState();
  G.player = makePlayer();
  makeDust();
  startLevel(0);
}
function installCore(core, silent) {
  const have = G.cores[core.id] || 0;
  if (have >= core.max) return false;
  G.cores[core.id] = have + 1;
  core.apply(G.mods);
  if (G.player) {
    const nm = Math.round((100 + lvlOf("hp") * 15) * G.mods.hpMul);
    const ratio = G.player.hp / G.player.maxHp;
    G.player.maxHp = nm; G.player.hp = Math.min(nm, Math.round(nm * ratio));
  }
  if (!silent) { toast(core.name + " installed", "var(--echo)"); Audio_.confirm(); }
  return true;
}
function makeDust() {
  G.dust = [];
  for (let i = 0; i < 46; i++) G.dust.push({ x: rnd(W), y: rnd(H), z: rnd(1, .3), s: rnd(2.2, .6), a: rnd(TAU) });
}

/* ---------------- levels + waves --------------------------------------- */
function startLevel(idx) {
  G.levelIdx = idx;
  G.wave = 0; G.breather = 0; G.waveClearing = false;
  backdropDirty = true;
  const L = curLevel();
  Audio_.setPalette(L);
  Audio_.target = .3;
  clearWorld();
  showLevelCard(L);
}
function beginLevelWaves() { clearTimeout(hookTimer); G.cardIn = 0; G.carding = false; $("#levelCard").classList.remove("on"); startWave(1); }
function startWave(n) {
  const L = curLevel();
  G.wave = n; G.waveClearing = false;
  if (G.survival) { startSurvivalWave(n); return; }
  const tier = G.loop * 6 + G.levelIdx;
  const isBoss = L.boss && n === L.waves;
  const budget = Math.round(6 + tier * 3.4 + n * 2.4 + G.loop * 7);
  G.queue = [];
  if (isBoss) {
    G.queue.push({ type: TL.boss, t: 1 });
    const add = TL.roster[0];
    for (let i = 0; i < 5; i++) G.queue.push({ type: add, t: 2.4 + i * .6 });
  } else {
    let spent = 0, t = 0;
    const types = L.types;
    const eliteOdds = clamp((tier - 1) * .035, 0, .3);
    while (spent < budget) {
      const type = pick(types);
      const c = EN[type].cost;
      if (spent + c > budget + 2) break;
      const el = c >= 2 && chance(eliteOdds);
      spent += c * (el ? 2 : 1);
      G.queue.push({ type, t, elite: el });
      t += rnd(.14, .55);
      if (chance(.2)) t += rnd(.4, 1.1);
    }
  }
  Audio_.waveIn();
  updateWaveDots();
  if (isBoss) banner(EN[TL.boss].label, TL.code.toLowerCase());
  else if (n === 1) banner(L.name, L.hook.split(".")[0].toLowerCase());
  else banner("Wave " + n, "of " + L.waves);
}
/* ---- survival: one chamber, no end, everything gets worse ------------- */
const SURV_UNLOCK = [
  { w: 1, t: ["husk", "dart"] },
  { w: 3, t: ["bloom"] },
  { w: 5, t: ["bulwark", "spore"] },
  { w: 7, t: ["weaver", "colossus"] },
  { w: 9, t: ["needle", "howitzer"] },
  { w: 12, t: ["mimic", "broodmother"] },
  { w: 15, t: ["mirror", "hexer"] },
  { w: 18, t: ["revenant", "warden"] },
];
function survivalTypes(w) {
  const out = [];
  for (const g of SURV_UNLOCK) if (w >= g.w) for (const t of g.t) out.push(t);
  return out;
}
function survivalNewAt(w) {
  const g = SURV_UNLOCK.find((x) => x.w === w);
  return g ? g.t : null;
}
function startSurvivalWave(n) {
  const idx = ((n - 1) / 4 | 0) % LEVELS.length;
  if (idx !== G.levelIdx) { G.levelIdx = idx; backdropDirty = true; Audio_.setPalette(curLevel()); }
  const types = survivalTypes(n);
  const isBoss = n % 10 === 0;
  const budget = Math.round(6 + n * 3.4);
  const eliteOdds = clamp((n - 4) * .038, 0, .42);
  G.queue = [];
  if (isBoss) {
    G.queue.push({ type: "paradox", t: 1.2 });
    for (let i = 0; i < 4 + (n / 10 | 0); i++) G.queue.push({ type: pick(types), t: 3 + i * .7 });
  }
  let spent = 0, t = isBoss ? 6 : 0;
  const cap = isBoss ? budget * .5 : budget;
  while (spent < cap) {
    const type = pick(types);
    const c = EN[type].cost;
    if (spent + c > cap + 2) break;
    const el = c >= 2 && chance(eliteOdds);
    spent += c * (el ? 2 : 1);
    G.queue.push({ type, t, elite: el });
    t += rnd(.1, .46);
    if (chance(.18)) t += rnd(.3, .9);
  }
  Audio_.waveIn();
  updateWaveDots();
  const fresh = survivalNewAt(n);
  if (isBoss) banner("Paradox", "wave " + n + " · it came itself");
  else if (fresh) banner("Wave " + n, "new arrival: " + fresh.map((x) => EN[x].label.toLowerCase()).join(" and "));
  else banner("Wave " + n, n < 6 ? "hold the chamber" : n < 14 ? "it is getting crowded" : "no more excuses");
}
function edgePoint() {
  const e = rint(0, 3), pad = 52;
  if (e === 0) return { x: rnd(W - pad, pad), y: pad };
  if (e === 1) return { x: W - pad, y: rnd(H - pad, pad) };
  if (e === 2) return { x: rnd(W - pad, pad), y: H - pad };
  return { x: pad, y: rnd(H - pad, pad) };
}
function spawnEnemy(type, x, y, elite) {
  const d = EN[type];
  const tier = tierNow();
  const hpMul = (1 + tier * .17 + G.loop * .5) * (elite ? 2.4 : 1);
  const spMul = Math.min(1.65, 1 + tier * .024) * (elite ? 1.16 : 1);
  const e = {
    type, x, y, vx: 0, vy: 0, r: d.r, hp: d.hp * hpMul, maxHp: d.hp * hpMul,
    sp: d.sp * spMul, dmg: d.dmg, ang: rnd(TAU), wob: rnd(TAU), hit: 0, state: 0,
    timer: rnd(.4, 1.6), born: 0, kb: { x: 0, y: 0 }, blink: 1, blinkT: rnd(3, 1),
    face: rnd(TAU), deflect: 0, fuse: 0, lockAng: 0, pop: 0, tether: 0, birth: 0, burst: 0,
    elite: !!elite, mod: "",
  };
  if (elite) {
    e.r = d.r * 1.16; e.dmg = d.dmg * 1.35;
    e.mod = pick(["armoured", "frenzied", "volatile"]);
    if (e.mod === "frenzied") { e.sp *= 1.45; e.rateMul = 1.6; }
    if (e.mod === "armoured") { e.sp *= .85; e.armour = .55; }
    G.elites++;
  }
  if (BOSSES[type]) { e.phase = 0; e.spin = 0; e.timer = 2.4; e.pending = null; G.boss = e; e.handAng = -Math.PI / 2; }
  if (type === "zenith") e.cores = null;
  if (type === "vestige") { e.peace = 0; e.calm = 0; }
  if (type === "sounding") e.load = 0;
  if (type === "trench") e.sub = 0;
  if (type === "mimic") e.delay = rint(70, 110);
  G.enemies.push(e);
  if (!SAVE.seen[type]) { SAVE.seen[type] = 1; persist(); }
  return e;
}
function tickWaves(dt) {
  if (G.carding) { G.cardIn -= dt; if (G.cardIn <= 0) beginLevelWaves(); return; }
  if (G.drafting) return;
  if (G.draftIn > 0) { G.draftIn -= dt; if (G.draftIn <= 0) { G.draftIn = 0; openDraft(); } return; }
  if (G.breather > 0) {
    G.breather -= dt;
    if (G.breather <= 0) startWave(G.wave + 1);
    return;
  }
  for (let i = G.queue.length - 1; i >= 0; i--) {
    G.queue[i].t -= dt;
    if (G.queue[i].t <= 0) {
      const p = edgePoint();
      G.portals.push({ x: p.x, y: p.y, t: 0, type: G.queue[i].type, elite: G.queue[i].elite });
      G.queue.splice(i, 1);
    }
  }
  for (let i = G.portals.length - 1; i >= 0; i--) {
    const p = G.portals[i]; p.t += dt;
    if (p.t >= .55) {
      spawnEnemy(p.type, p.x, p.y, p.elite);
      ring(p.x, p.y, ecol(EN[p.type].col), 6, 52, .4, 2.2);
      burst(p.x, p.y, 8, ecol(EN[p.type].col), .8, { life: .35 });
      G.portals.splice(i, 1);
    }
  }
  if (!G.waveClearing && !G.queue.length && !G.portals.length && !G.enemies.length) {
    G.waveClearing = true;
    const L = curLevel();
    healPlayer(G.player.maxHp * (G.survival ? .13 : .1));
    if (G.survival) {
      G.score += 140 * G.wave;
      text(W / 2, H * .42, "wave " + G.wave + " held", TH.core, 20);
      Audio_.confirm();
      SAVE.bestWave = Math.max(SAVE.bestWave, G.wave); persist();
      if (G.wave % 3 === 0) G.draftIn = 1.0; else G.breather = 2.3;
      updateWaveDots();
      return;
    }
    if (G.shotsThisWave === 0 && G.kills > 0) unlockSecret("observer");
    G.shotsThisWave = 0;
    if (G.wave >= L.waves) {
      G.score += 250 * (G.levelIdx + 1 + G.loop * 6);
      text(W / 2, H * .42, "level cleared", TH.core, 22);
      Audio_.confirm();
      G.draftIn = 1.1;
    } else {
      G.breather = 2.6;
      text(W / 2, H * .42, "wave cleared", TH.core, 18);
      Audio_.confirm();
    }
    updateWaveDots();
  }
}
function nextLevel() {
  if (G.survival) { G.breather = 1.5; return; }
  let idx = G.levelIdx + 1;
  if (idx >= LEVELS.length) {
    markBranchCleared();
    if (TL.id !== "ch09") { branchVictory(); return; }
    idx = 0; G.loop++;
  }
  SAVE.bestLevel = Math.max(SAVE.bestLevel, G.loop * LEVELS.length + G.levelIdx + 1);
  persist();
  startLevel(idx);
}

/* ---------------- damage ----------------------------------------------- */
function damageEnemy(e, dmg, opt) {
  opt = opt || {};
  if (e.dead) return;
  const m = G.mods;
  let d = dmg, crit = false;
  if (typeof admOneShot !== "undefined" && admOneShot && !BOSSES[e.type]) d = e.hp + 1;
  if (BRANCHFN.dmgAt) d *= BRANCHFN.dmgAt(e.x, e.y);
  if (!opt.noCrit && m.crit > 0 && chance(m.crit)) { d *= m.critMul; crit = true; }
  if (G.player && G.player.surgeActive > 0) d *= 1.5;
  if (e.armour) d *= (1 - e.armour);
  e.hp -= d; e.hit = .12;
  if (m.execute && e.type !== "paradox" && e.hp > 0 && e.hp / e.maxHp < m.execute) e.hp = 0;
  if (m.lifesteal > 0) healPlayer(Math.min(d, 40) * m.lifesteal);
  if (crit) critFx(e, d);
  if (opt.spark !== false) burst(opt.x == null ? e.x : opt.x, opt.y == null ? e.y : opt.y, crit ? 9 : 4, crit ? TH.shard : ecol(EN[e.type].col), crit ? 1.3 : .7, { life: .3, size: rnd(1, 2.4) });
  if (e.hp <= 0) killEnemy(e);
}
function killEnemy(e) {
  if (e.dead) return;
  e.dead = true;
  const m = G.mods, d = EN[e.type], col = ecol(d.col);
  corpse(e, col);
  debris(e.x, e.y, clamp(Math.round(e.r * .55), 3, 14), col, e.r > 18 ? 1.3 : .85, { size: e.r / 14 });
  shock(e.x, e.y, { r0: e.r * .6, r1: e.r * (e.type === "paradox" ? 12 : 3.4), life: .3, col, w: e.r > 18 ? 5 : 2.6 });
  if (e.elite) {
    flash(.09, "255,214,138");
    ring(e.x, e.y, "255,214,138", 8, 190, .5, 4);
    if (e.mod === "volatile") explode(e.x, e.y, 168, 30, "255,196,120");
  }
  G.combo++; G.comboTimer = 3.2;
  G.score += Math.round(d.score * (1 + Math.min(G.combo, 30) * .1) * (1 + (G.levelIdx + G.loop * 6) * .12));
  G.kills++;
  const p = G.player;
  if (p && p.surgeActive <= 0) {
    p.surge = Math.min(100, p.surge + (e.type === "paradox" ? 100 : 5.5));
    if (p.surge >= 100) triggerSurge();
  }
  const n = Math.round(d.shards * m.shardMul * (chance(.18) ? 2 : 1));
  for (let i = 0; i < n; i++) G.pickups.push({ x: e.x + rnd(-8, 8), y: e.y + rnd(-8, 8), vx: rnd(-90, 90), vy: rnd(-90, 90), r: 6, spin: rnd(TAU), life: 16, kind: "shard" });
  if (chance(e.r > 16 ? .38 : .07)) G.pickups.push({ x: e.x, y: e.y, vx: rnd(-50, 50), vy: rnd(-50, 50), r: 8, spin: 0, life: 14, kind: "cell" });
  boomFx(e.x, e.y, col, e.r / 13, { n: e.type === "paradox" ? 170 : 15 + d.r, force: e.type === "paradox" ? 2.4 : 1.15, r: e.r });
  if (m.salvage > 0 && e.type !== "mote" && inLiveTrace(e.x, e.y, e.r)) {
    for (let i = 0; i < m.salvage; i++) G.pickups.push({ x: e.x + rnd(-10, 10), y: e.y + rnd(-10, 10), vx: rnd(-70, 70), vy: rnd(-70, 70), r: 6, spin: rnd(TAU), life: 16, kind: "shard" });
    text(e.x, e.y - e.r - 14, "salvage", TH.shard, 12);
  }
  Audio_.kill(G.combo);
  shake(e.type === "paradox" ? .9 : e.r > 16 ? .22 : .1);
  hitStop(e.type === "paradox" ? .32 : e.r > 16 ? .055 : .026);
  if (e.type === "bloom") { explode(e.x, e.y, 158, 40, col); zone(e.x, e.y, 74, 3.2, 26, col); }
  if (e.type === "spore") {
    for (let i = 0; i < 3; i++) {
      const a = rnd(TAU);
      const s = spawnEnemy("mote", e.x + Math.cos(a) * 18, e.y + Math.sin(a) * 18);
      s.kb.x = Math.cos(a) * 220; s.kb.y = Math.sin(a) * 220;
    }
  }
  G.killed[e.type] = (G.killed[e.type] || 0) + 1;
  if (BRANCHFN.onKill) BRANCHFN.onKill(e);
  if (BOSSES[e.type]) {
    G.boss = null; flash(.5, col); shake(.8);
    text(e.x, e.y - 46, BOSS_EPITAPH[e.type] || "resolved", col, 22);
    if (e.type === "omega" && e.flawless) unlockSecret("zero");
    markBranchCleared();
  }
  if (m.chain > 0 && e.type !== "mote") {
    const near = G.enemies.filter((o) => !o.dead && o !== e && dist(o, e) < 250).slice(0, m.chain * 2);
    near.forEach((o) => { beam(e.x, e.y, o.x, o.y, TH.core); damageEnemy(o, 22 * m.dmgMul, { noCrit: true }); });
  }
  const i = G.enemies.indexOf(e);
  if (i >= 0) G.enemies.splice(i, 1);
}
function explode(x, y, r, dmgPlayer, col) {
  ring(x, y, col, 8, r, .34, 4);
  boomFx(x, y, col, r / 60, { n: 34, force: 1.6, r: 16 });
  flash(.09, col); shake(.3); Audio_.boom();
  for (const e of G.enemies.slice()) {
    const d = dist(e, { x, y });
    if (d < r + e.r) damageEnemy(e, 46 * (1 - d / (r + e.r)) + 14, { noCrit: true });
  }
  const p = G.player;
  if (dmgPlayer > 0 && p) {
    const d = Math.hypot(p.x - x, p.y - y);
    if (d < r + p.r) hurtPlayer(dmgPlayer * (1 - d / (r + p.r)));
  }
}
function healPlayer(n) {
  const p = G.player;
  if (!p || p.hp <= 0) return;
  const before = p.hp;
  p.hp = Math.min(p.maxHp, p.hp + n);
  if (p.hp - before > 3) text(p.x, p.y - 26, "+" + Math.round(p.hp - before), TH.core, 13);
}
function hurtPlayer(n, src) {
  const p = G.player;
  if (!p || p.hp <= 0 || p.iframe > 0 || G.mode !== "play") return;
  if (typeof admGod !== "undefined" && admGod) return;
  if (G.boss && G.boss.type === "omega" && G.boss.phase >= 2) G.boss.flawless = 0;
  if (p.shield > 0 && n > 4) {
    p.shield--; p.shieldCd = 11; p.iframe = .5;
    ring(p.x, p.y, TH.core, 16, 92, .4, 3);
    burst(p.x, p.y, 22, TH.core, 1.2);
    Audio_.deflect(); shake(.2); flash(.08);
    text(p.x, p.y - 30, "deflected", TH.core, 13);
    return;
  }
  p.hp -= n;
  p.hurtFlash = Math.min(1, p.hurtFlash + n / 26);
  if (n > 5) {
    Audio_.hurt(); shake(clamp(n / 40, .08, .5)); flash(clamp(n / 90, .04, .2), "255,90,124");
    burst(p.x, p.y, 8, "255,90,124", 1);
    G.combo = 0;
  }
  if (src && G.mods.thorns > 0 && src.hp !== undefined) damageEnemy(src, G.mods.thorns, { noCrit: true });
  if (p.hp <= 0) {
    if (G.mods.secondWind > 0 && !p.windUsed) {
      p.windUsed = true; p.hp = 35; p.iframe = 1.6;
      ring(p.x, p.y, TH.shard, 12, 270, .7, 4);
      flash(.36, TH.shard); Audio_.echo();
      text(p.x, p.y - 40, "second wind", TH.shard, 20);
      return;
    }
    p.hp = 0; endRun();
  }
}
function triggerSurge() {
  const p = G.player;
  p.surge = 0; p.surgeActive = 5;
  ring(p.x, p.y, TH.shard, 10, Math.max(W, H), .75, 5);
  flash(.24, TH.shard); Audio_.surge(); shake(.4);
  text(p.x, p.y - 40, "surge", TH.shard, 22);
}

/* ---------------- player ------------------------------------------------ */
function fire() {
  const p = G.player, m = G.mods;
  if (BRANCHFN.id === "emberwake") {
    if (G.jam > 0) { p.fireCd = .1; return; }
    G.heat += .052;
    if (G.heat >= 1) { G.jam = 1.25; G.heat = 1; Audio_.emberVent(); text(p.x, p.y - 34, "overheated", "255,120,80", 15); shake(.14); return; }
  }
  G.shotsThisWave = (G.shotsThisWave || 0) + 1;
  const dmg = 11 * m.dmgMul;
  const n = 1 + m.multishot;
  const spread = n > 1 ? .05 * (n - 1) : 0;
  for (let i = 0; i < n; i++) {
    const a = p.aim + (n > 1 ? -spread + (2 * spread * i) / (n - 1) : 0) + rnd(-.018, .018);
    G.bullets.push({ x: p.x, y: p.y,
      vx: Math.cos(a) * 980, vy: Math.sin(a) * 980, dmg, r: 3.4, life: 1.15, pierce: m.pierce, hits: [] });
  }
  p.fireCd = .152 / m.rateMul;
  p.vx -= Math.cos(p.aim) * 24; p.vy -= Math.sin(p.aim) * 24;
  p.fireKick = 1;
  Audio_.shoot(1 + rnd(-.06, .06));
  burst(p.x + Math.cos(p.aim) * 18, p.y + Math.sin(p.aim) * 18, 2, TH.core, .5, { life: .13, size: rnd(1, 2) });
}
/* ---- Time-Swap (recall) ---------------------------------------------------
   With a decoy alive, dash stops being a dash: you and the decoy trade places.  */
function recallTarget() {
  const p = G.player;
  if (!p || !G.echoes.length) return null;
  let best = null, bd = 1e9;
  for (const c of G.echoes) { const d = dist(c, p); if (d > 44 && d < bd) { bd = d; best = c; } }
  return best;
}
function recallReady() {
  const p = G.player;
  if (!p) return false;
  return G.mods.swapFree ? p.recallCd <= 0 : p.dash > 0;
}
function doRecall(c) {
  const p = G.player, m = G.mods;
  if (m.swapFree) p.recallCd = 2.2;
  else { p.dash--; p.dashCd = Math.max(p.dashCd, .85 * m.dashCdMul); }
  const px = p.x, py = p.y;
  p.x = c.x; p.y = c.y; c.x = px; c.y = py;
  c.idx = 0; c.hit = .1;
  p.vx *= .18; p.vy *= .18;
  p.iframe = Math.max(p.iframe, .34);
  p.swapFlash = .5;
  p.hist.push({ x: p.x, y: p.y });
  beam(px, py, p.x, p.y, TH.echo, .34);
  ring(p.x, p.y, TH.echo, 8, 104, .44, 3);
  ring(px, py, TH.echo, 8, 88, .44, 2.2);
  shock(p.x, p.y, { r0: 90, r1: 12, life: .3, col: TH.echo, w: 4 });
  shock(px, py, { r0: 10, r1: 120, life: .34, col: TH.echo, w: 3 });
  burst(p.x, p.y, 24, TH.echo, 1.1, { life: .42 });
  burst(px, py, 16, TH.echo, .9, { life: .36 });
  /* a line of afterimages tears open between the two ends of the trade */
  for (let i = 0; i <= 8; i++) {
    const f = i / 8;
    ghost(lerp(px, p.x, f), lerp(py, p.y, f), p.aim, TH.echo,
      { r: p.r, life: .18 + f * .26, a: .45, grow: .3 });
  }
  p.pop = 1;
  G.chroma = Math.max(G.chroma, .8);
  text(p.x, p.y - 34, "swap", TH.echo, 15);
  Audio_.swap(); flash(.06, TH.echo); shake(.16); hitStop(.06);
  if (m.swapWave > 0) {
    const R = 132 + m.swapWave * 36;
    for (const q of [{ x: p.x, y: p.y }, { x: px, y: py }]) {
      ring(q.x, q.y, TH.echo, 14, R, .38, 3);
      for (const e of G.enemies.slice()) {
        if (dist(e, q) < R) {
          const a = Math.atan2(e.y - q.y, e.x - q.x);
          e.kb.x += Math.cos(a) * 310; e.kb.y += Math.sin(a) * 310;
          damageEnemy(e, 24 * m.swapWave * m.dmgMul, { noCrit: true });
        }
      }
    }
  }
}
/* One button. With a decoy on the field it is a swap and nothing else —
   there is no dash to fumble for, and no modifier key to remember. */
function doDash() {
  const p = G.player, m = G.mods;
  if (p.dashing > 0) return;
  const c = recallTarget();
  if (c) {
    if (recallReady()) doRecall(c);
    else { Audio_.ui(false); text(p.x, p.y - 30, "swap charging", TH.faint || TH.echo, 12); }
    return;
  }
  if (p.dash <= 0) return;
  p.dash--; p.dashCd = Math.max(p.dashCd, .85 * m.dashCdMul);
  p.dashing = .17; p.iframe = .26; p.dashHits = []; p.pop = .7;
  const a = p.aim;
  p.vx = Math.cos(a) * 1180; p.vy = Math.sin(a) * 1180;
  ring(p.x, p.y, TH.core, 8, 76, .32, 2.4);
  shock(p.x, p.y, { r0: 12, r1: 150, life: .3, col: TH.core, w: 5, ang: a + Math.PI, arc: 2.2 });
  burst(p.x, p.y, 18, TH.core, 1.3, { life: .34 });
  for (let i = 0; i < 3; i++) ghost(p.x - Math.cos(a) * i * 9, p.y - Math.sin(a) * i * 9, a, TH.core, { r: p.r, life: .2 + i * .05, a: .4 });
  G.chroma = Math.max(G.chroma, .45);
  if (BRANCHFN.id === "emberwake" && G.heat > .05) { G.heat = 0; Audio_.vent(); ring(p.x, p.y, "255,190,110", 10, 96, .35, 3); }
  shake(.2, Math.cos(a), Math.sin(a)); flash(.05); Audio_.dash();
  if (m.dashShock > 0) {
    const R = 150 + m.dashShock * 30;
    ring(p.x, p.y, TH.core, 12, R, .36, 3);
    for (const e of G.enemies.slice()) {
      if (dist(e, p) < R) {
        const ang = Math.atan2(e.y - p.y, e.x - p.x);
        e.kb.x += Math.cos(ang) * 340; e.kb.y += Math.sin(ang) * 340;
        damageEnemy(e, 26 * m.dashShock * m.dmgMul, { noCrit: true });
      }
    }
  }
}
function summonEcho() {
  const p = G.player, m = G.mods;
  if (p.echo <= 0 || p.hist.length < 20) return;
  p.echo--; p.echoCd = Math.max(p.echoCd, 8.5);
  const path = p.hist.slice(-Math.min(p.hist.length, 130)).map((h) => ({ x: h.x, y: h.y }));
  const life = 6.5 * m.echoLifeMul;
  for (let i = 0; i < 1 + m.echoTwin; i++) {
    G.echoes.push({ x: path[0].x, y: path[0].y, r: 13, idx: i ? (path.length / 2) | 0 : 0,
      path, life, max: life, hp: 65 * (1 + m.decoyGuard * .6), fireCd: rnd(.3), aim: 0, hit: 0 });
  }
  ring(p.x, p.y, TH.echo, 10, 132, .5, 3);
  burst(p.x, p.y, 34, TH.echo, 1.3);
  flash(.07, TH.echo); Audio_.echo();
}
function updatePlayer(dt, input) {
  const p = G.player, m = G.mods;
  p.iframe = Math.max(0, p.iframe - dt);
  p.hurtFlash = Math.max(0, p.hurtFlash - dt * 2.2);
  p.dashing = Math.max(0, p.dashing - dt);
  p.surgeActive = Math.max(0, p.surgeActive - dt);
  p.recallCd = Math.max(0, p.recallCd - dt);
  p.swapFlash = Math.max(0, p.swapFlash - dt * 2.2);
  p.fireKick = Math.max(0, (p.fireKick || 0) - dt * 7);
  p.pop = Math.max(0, (p.pop || 0) - dt * 4);
  p.legPhase = (p.legPhase || 0) + dt * (4 + Math.hypot(p.vx, p.vy) * .04);
  if (p.regen > 0) healPlayer(p.regen * dt * .4);
  if (p.shield < p.shieldMax) {
    p.shieldCd -= dt;
    if (p.shieldCd <= 0) { p.shield++; p.shieldCd = 11; ring(p.x, p.y, TH.core, 20, 42, .4, 2); Audio_.pickup(); }
  }
  if (p.dash < p.dashMax) { p.dashCd -= dt; if (p.dashCd <= 0) { p.dash++; p.dashCd = .85 * m.dashCdMul; } }
  else p.dashCd = Math.max(0, p.dashCd - dt);
  if (p.echo < p.echoMax) { p.echoCd -= dt; if (p.echoCd <= 0) { p.echo++; p.echoCd = 8.5; } }
  p.aim = Math.atan2(input.aimY - p.y, input.aimX - p.x);

  if (p.dashing > 0) {
    p.vx *= Math.pow(.12, dt); p.vy *= Math.pow(.12, dt);
    if (m.dashBurn > 0 && chance(.6)) zone(p.x, p.y, 26, 2.2, 34 * m.dashBurn, "255,146,72");
    burst(p.x, p.y, 2, TH.core, .3, { life: .3, size: rnd(1.4, 3) });
    if (chance(dt * 70)) ghost(p.x, p.y, p.aim, TH.core, { r: p.r, life: .26, a: .38 });
    for (const e of G.enemies.slice()) {
      if (p.dashHits.indexOf(e) >= 0) continue;
      if (dist(e, p) < e.r + p.r + 6) {
        p.dashHits.push(e);
        damageEnemy(e, 42 * m.dashDmgMul * m.dmgMul);
        const a = Math.atan2(e.y - p.y, e.x - p.x);
        e.kb.x += Math.cos(a) * 260; e.kb.y += Math.sin(a) * 260;
        e.pop = Math.max(e.pop || 0, .8);
        shock(e.x, e.y, { r0: e.r, r1: e.r * 3.2, life: .22, col: TH.core, w: 3 });
        hitStop(.05); shake(.15);
      }
    }
  } else {
    const sp = 340 * m.speedMul * (p.surgeActive > 0 ? 1.22 : 1);
    p.vx = approach(p.vx, input.mx * sp, 12, dt);
    p.vy = approach(p.vy, input.my * sp, 12, dt);
  }
  p.x += p.vx * dt; p.y += p.vy * dt;
  const pad = 20;
  if (p.x < pad) { p.x = pad; p.vx = Math.abs(p.vx) * .3; }
  if (p.x > W - pad) { p.x = W - pad; p.vx = -Math.abs(p.vx) * .3; }
  if (p.y < pad) { p.y = pad; p.vy = Math.abs(p.vy) * .3; }
  if (p.y > H - pad) { p.y = H - pad; p.vy = -Math.abs(p.vy) * .3; }
  if (input.fire && p.fireCd <= 0 && p.dashing <= 0) fire();
  p.fireCd -= dt;
  if (input.dash) doDash();
  if (input.echo) summonEcho();
  p.hist.push({ x: p.x, y: p.y });
  if (p.hist.length > 150) p.hist.shift();
}
function updateEchoes(dt) {
  const m = G.mods;
  for (let i = G.echoes.length - 1; i >= 0; i--) {
    const c = G.echoes[i];
    c.life -= dt; c.hit = Math.max(0, c.hit - dt);
    c.idx += dt * 62;
    if (c.idx >= c.path.length) c.idx = 0;
    const node = c.path[Math.floor(c.idx)] || c.path[0];
    c.x = lerp(c.x, node.x, 1 - Math.exp(-16 * dt));
    c.y = lerp(c.y, node.y, 1 - Math.exp(-16 * dt));
    c.fireCd -= dt * m.echoRate;
    let near = null, nd = 1e9;
    for (const e of G.enemies) { if (e.dead) continue; const d = dist(e, c); if (d < nd) { nd = d; near = e; } }
    if (near) {
      c.aim = Math.atan2(near.y - c.y, near.x - c.x);
      if (c.fireCd <= 0 && nd < 620) {
        c.fireCd = .3;
        G.bullets.push({ x: c.x, y: c.y, vx: Math.cos(c.aim) * 820, vy: Math.sin(c.aim) * 820,
          dmg: 7 * m.dmgMul * m.echoDmgMul, r: 3, life: 1, pierce: m.pierce, hits: [], echo: true });
        Audio_.shoot(1.5);
      }
    }
    if (c.life <= 0 || c.hp <= 0) {
      burst(c.x, c.y, 28, TH.echo, 1.2);
      ring(c.x, c.y, TH.echo, 8, 72, .4, 2.4);
      if (m.echoBoom > 0) explode(c.x, c.y, 152, 0, TH.echo);
      G.echoes.splice(i, 1);
    }
  }
}

