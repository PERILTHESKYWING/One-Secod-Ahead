/* Branch-specific room physics: Glassfall stasis discs, Nulltide rewind, Terminus entropy, and the BRANCH hook table. */
/* =====================================================================
   BRANCH PHYSICS — what each timeline does to the room itself
   ===================================================================== */

/* ---- shared state, reset on every run ---- */
function resetBranchState() {
  G.stasis = []; G.chill = []; G.pillars = []; G.charges = [];
  G.heat = 0; G.jam = 0; G.coronaAng = 0;
  G.tideT = 0; G.tideWarn = 0; G.wake = []; G.snap = []; G.snapT = 0; G.current = rnd(TAU);
  G.entropy = 52; G.entropyMax = 52; G.drain = 0;
  G.omegaEchoes = []; G.safeWedge = null;
  G.killed = {}; G.shotsThisWave = 0; G.sealT = 0; G.codaKills = [];
  resetBranchLevel();
}
/* ---- per-LEVEL state: everything the room itself accumulates -----------
   A shattered floor, a clock that has already tolled twice and a copy of
   your last ten seconds all belong to the room you are in, so they reset
   when the room does rather than only when a run does. Called from
   clearWorld(), which every level start goes through. */
function resetBranchLevel() {
  /* force the layout cache to rebuild: the next level is a different room */
  arenaSig = "";
  G.glass = null;
  G.hw = null; G.spurts = []; G.spurtT = 0; G.stillT = 0;
  G.hour = null; G.handA = -Math.PI / 2; G.hourT = TERM_HOUR;
  G.behind = null; G.bTrail = []; G.bi = 0; G.bT = 0; G.bShotN = G.shotN || 0;
  G.termT = 0;
  if (G.player && G.player.env) { G.player.env.x = 0; G.player.env.y = 0; }
}

/* ---- Glassfall: the floor is still falling ---------------------------
   The branch was interrupted at 11:59:59 and never got the rest of the
   second, so nothing in it has landed yet — including the floor. It is a
   grid of panes, and over a run they crack and drop, so the room you finish
   a level in is a good deal smaller than the one you started it in.

   Three guarantees stop that from being a lottery rather than a pressure:

     · A pane always spends GLASS_WARN seconds visibly cracking first, and
       never starts cracking under you or on a pane you are touching.
     · A pane may only go if the panes left over stay ONE connected piece of
       floor. That is a flood fill run against each candidate, and it is
       what prevents the room sealing you into a pocket you cannot leave.
       Panes under a wall or under one of the layout's chokepoints are
       flagged keystone and never go at all, so the room can't shatter a
       doorway out from under you either.
     · GLASS_FLOOR_MIN is a hard floor on how much can ever be taken.

   Enemies here hover — the branch's whole conceit is that it never landed —
   so the shrinking floor is your problem and not theirs. That is the same
   rule the room shapes have always run on: only your footing moves. */
const GLASS_PANE = 92;        /* target pane size, px */
const GLASS_FIRST = 12;       /* seconds into a level before the first pane cracks */
const GLASS_EVERY = 6.4;      /* gap between shatter events at the start of a level */
const GLASS_EVERY_MIN = 2.6;  /* ...and the tightest that gap ever gets */
const GLASS_ACCEL = .84;      /* the gap multiplies by this after every event */
const GLASS_WARN = 1.5;       /* seconds a pane spends cracking before it drops */
const GLASS_PER_EVENT = 2;    /* panes that start cracking per event */
const GLASS_FLOOR_MIN = .46;  /* fraction of the panes that can never be taken */

function glassIndexAt(gl, x, y) {
  const c = Math.floor((x - gl.x0) / gl.cw), r = Math.floor((y - gl.y0) / gl.ch);
  if (c < 0 || r < 0 || c >= gl.cols || r >= gl.rows) return -1;
  return r * gl.cols + c;
}
function glassPaneBox(gl, i) {
  const c = i % gl.cols, r = (i / gl.cols) | 0;
  return { cx: gl.x0 + (c + .5) * gl.cw, cy: gl.y0 + (r + .5) * gl.ch,
    w: gl.cw, h: gl.ch, a: 0, rad: 7 };
}
function glassBuild() {
  const nom = arenaNominal();
  const cols = Math.max(4, Math.round((nom.x1 - nom.x0) / GLASS_PANE));
  const rows = Math.max(3, Math.round((nom.y1 - nom.y0) / GLASS_PANE));
  const cw = (nom.x1 - nom.x0) / cols, ch = (nom.y1 - nom.y0) / rows;
  const gates = arenaGates(), pane = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const cx = nom.x0 + (c + .5) * cw, cy = nom.y0 + (r + .5) * ch;
    /* load-bearing, and never dropped:
       · the outer ring. It is the walkway, and it is also the one place a
         hole would fight the room's own edge — the lip of a rim hole pushes
         you outward and the room's edge pushes you back in, on the same
         axis. Keeping the ring means the floor falls out of the MIDDLE,
         which is where the stasis discs bloom anyway.
       · panes holding a wall up, and panes in a doorway, so the layout's
         chokepoints survive the level. */
    let key = r === 0 || c === 0 || r === rows - 1 || c === cols - 1;
    if (!key) key = !!arenaSolidAt(cx, cy, 6);
    if (!key) for (const g of gates) if (Math.hypot(cx - g.x, cy - g.y) < Math.max(cw, ch) * 1.15) { key = 1; break; }
    pane.push({ st: 0, t: 0, key: !!key, seed: rnd(TAU), fall: 0 });
  }
  return { sig: arenaSig, cols, rows, x0: nom.x0, y0: nom.y0, cw, ch, pane,
    gone: 0, evT: GLASS_FIRST, gap: GLASS_EVERY };
}
/* would taking this pane leave the floor in more than one piece? Anything
   already cracking counts as gone, so two candidates in the same event
   can't conspire to cut the room in half. */
function glassConnected(gl, skip) {
  const n = gl.cols * gl.rows;
  let start = -1, total = 0;
  for (let i = 0; i < n; i++) {
    if (i === skip || gl.pane[i].st >= 1) continue;
    total++; if (start < 0) start = i;
  }
  if (total <= 1) return true;
  const seen = new Uint8Array(n), stack = [start];
  seen[start] = 1;
  let found = 1;
  while (stack.length) {
    const i = stack.pop(), c = i % gl.cols, r = (i / gl.cols) | 0;
    const nb = [c > 0 ? i - 1 : -1, c < gl.cols - 1 ? i + 1 : -1,
                r > 0 ? i - gl.cols : -1, r < gl.rows - 1 ? i + gl.cols : -1];
    for (let k = 0; k < 4; k++) {
      const j = nb[k];
      if (j < 0 || seen[j] || j === skip || gl.pane[j].st >= 1) continue;
      seen[j] = 1; found++; stack.push(j);
    }
  }
  return found === total;
}
function glassCrack(gl) {
  const p = G.player, n = gl.cols * gl.rows;
  if (gl.gone >= Math.floor(n * (1 - GLASS_FLOOR_MIN))) return;
  const pc = p ? glassIndexAt(gl, p.x, p.y) : -1;
  const pcc = pc >= 0 ? pc % gl.cols : -9, pcr = pc >= 0 ? (pc / gl.cols) | 0 : -9;
  const cand = [];
  for (let i = 0; i < n; i++) {
    const q = gl.pane[i];
    if (q.st !== 0 || q.key) continue;
    const c = i % gl.cols, r = (i / gl.cols) | 0;
    if (Math.abs(c - pcc) <= 1 && Math.abs(r - pcr) <= 1) continue; /* not under you */
    cand.push(i);
  }
  for (let i = cand.length - 1; i > 0; i--) { const j = rint(0, i); const t = cand[i]; cand[i] = cand[j]; cand[j] = t; }
  let started = 0;
  for (const i of cand) {
    if (started >= GLASS_PER_EVENT) break;
    if (!glassConnected(gl, i)) continue;
    const q = gl.pane[i];
    q.st = 1; q.t = GLASS_WARN;
    const b = glassPaneBox(gl, i);
    ring(b.cx, b.cy, ecol(EN.facet.col), 6, Math.max(gl.cw, gl.ch) * .6, .4, 1.6);
    started++;
  }
  if (started) Audio_.glassLock ? Audio_.glassLock() : Audio_.coldRing();
}
function glassDrop(gl, i) {
  const b = glassPaneBox(gl, i), col = ecol(EN.facet.col);
  gl.pane[i].st = 2; gl.pane[i].fall = 1; gl.gone++;
  burst(b.cx, b.cy, 22, col, 1.5, { sq: 1, spin: rnd(-8, 8), life: .7 });
  ring(b.cx, b.cy, col, Math.max(gl.cw, gl.ch) * .5, 8, .45, 2.4);
  shake(.10);
  Audio_.shatter();
}
function glassField(dt) {
  if (!G.glass || G.glass.sig !== arenaSig) G.glass = glassBuild();
  const gl = G.glass;
  gl.evT -= dt;
  if (gl.evT <= 0) { glassCrack(gl); gl.gap = Math.max(GLASS_EVERY_MIN, gl.gap * GLASS_ACCEL); gl.evT = gl.gap; }
  for (let i = 0; i < gl.pane.length; i++) {
    const q = gl.pane[i];
    if (q.st === 1) { q.t -= dt; if (q.t <= 0) glassDrop(gl, i); }
    else if (q.st === 2 && q.fall > 0) q.fall = Math.max(0, q.fall - dt * 1.6);
  }
}
/* the player can't stand where the floor isn't. Only the panes overlapping
   their own footprint are tested, and the lip of a hole is resolved with
   the same rounded push-out the walls use — so an edge you are sliding
   along behaves like any other wall rather than catching you. */
function glassBound(p) {
  const gl = G.glass;
  if (!gl) return;
  for (let pass = 0; pass < 3; pass++) {
    const c0 = Math.max(0, Math.floor((p.x - p.r - gl.x0) / gl.cw));
    const c1 = Math.min(gl.cols - 1, Math.floor((p.x + p.r - gl.x0) / gl.cw));
    const r0 = Math.max(0, Math.floor((p.y - p.r - gl.y0) / gl.ch));
    const r1 = Math.min(gl.rows - 1, Math.floor((p.y + p.r - gl.y0) / gl.ch));
    let any = false;
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
      const i = r * gl.cols + c;
      if (gl.pane[i].st !== 2) continue;
      const res = pushOutBox(p.x, p.y, p.r, glassPaneBox(gl, i));
      if (!res) continue;
      p.x = res.x; p.y = res.y; slideOff(p, res.nx, res.ny); any = true;
    }
    if (!any) return;
  }
  /* deep inside a hole after three passes means they were put there rather
     than walking there — a Time-Swap onto an echo standing over a gap that
     dropped since. Snap to the nearest pane that still exists. */
  const at = glassIndexAt(gl, p.x, p.y);
  if (at >= 0 && gl.pane[at].st === 2) {
    let bd = Infinity, best = null;
    for (let i = 0; i < gl.pane.length; i++) {
      if (gl.pane[i].st === 2) continue;
      const b = glassPaneBox(gl, i), d = Math.hypot(b.cx - p.x, b.cy - p.y);
      if (d < bd) { bd = d; best = b; }
    }
    if (best) {
      ghost(p.x, p.y, p.aim || 0, ecol(EN.facet.col), { r: p.r, life: .3, a: .5, grow: .2 });
      p.x = best.cx; p.y = best.cy;
      p.ported = 1;
      p.kb.x *= .2; p.kb.y *= .2;
      p.iframe = Math.max(p.iframe || 0, .3);
    }
  }
}
function glassGoneFrac() {
  const gl = G.glass;
  return gl ? gl.gone / (gl.cols * gl.rows) : 0;
}
function glassPaint() {
  const gl = G.glass;
  if (!gl) return;
  const col = ecol(EN.facet.col);
  ctx.save();
  for (let i = 0; i < gl.pane.length; i++) {
    const q = gl.pane[i], b = glassPaneBox(gl, i);
    const x = b.cx - gl.cw / 2, y = b.cy - gl.ch / 2;
    if (q.st === 2) {
      /* the void where a pane used to be: darker than the floor, with a
         bright broken lip so the edge is unmistakable at speed */
      ctx.fillStyle = "rgba(2,6,12,.90)";
      ctx.fillRect(x, y, gl.cw, gl.ch);
      ctx.strokeStyle = "rgba(" + col + ",.55)"; ctx.lineWidth = 2;
      ctx.strokeRect(x + 1, y + 1, gl.cw - 2, gl.ch - 2);
      ctx.strokeStyle = "rgba(" + col + ",.18)"; ctx.lineWidth = 1;
      for (let k = 0; k < 3; k++) {
        const f = (k + 1) / 4;
        ctx.beginPath();
        ctx.moveTo(x + gl.cw * f, y);
        ctx.lineTo(x + gl.cw * (f + .12), y + gl.ch);
        ctx.stroke();
      }
      continue;
    }
    /* intact: a faint pane with a lit seam */
    ctx.strokeStyle = "rgba(" + col + ",.10)"; ctx.lineWidth = 1;
    ctx.strokeRect(x + .5, y + .5, gl.cw - 1, gl.ch - 1);
    if (q.key) {
      ctx.fillStyle = "rgba(" + col + ",.035)";
      ctx.fillRect(x, y, gl.cw, gl.ch);
    }
    if (q.st === 1) {
      /* cracking: the fracture spreads out of the middle and the pane
         flashes faster the closer it is to going */
      const f = 1 - clamp(q.t / GLASS_WARN, 0, 1);
      const pulse = .35 + Math.sin(G.time * (8 + f * 26)) * .3;
      ctx.fillStyle = "rgba(" + col + "," + (.05 + f * .13) + ")";
      ctx.fillRect(x, y, gl.cw, gl.ch);
      ctx.strokeStyle = "rgba(255,255,255," + (.2 + pulse * .5 * f) + ")";
      ctx.lineWidth = 1.2;
      for (let k = 0; k < 6; k++) {
        const a = q.seed + (k / 6) * TAU;
        const rr = Math.min(gl.cw, gl.ch) * .5 * (.25 + f * .82);
        ctx.beginPath();
        ctx.moveTo(b.cx, b.cy);
        ctx.lineTo(b.cx + Math.cos(a) * rr, b.cy + Math.sin(a) * rr * .82);
        ctx.stroke();
      }
      ctx.strokeStyle = "rgba(" + col + "," + (.3 + pulse * .5) + ")";
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 2, y + 2, gl.cw - 4, gl.ch - 4);
    }
  }
  ctx.restore();
}

/* ---- Glassfall: stasis discs ---- */
function addStasis(x, y, r, life) {
  G.stasis.push({ x, y, r, life: life || 8, max: life || 8, born: 0 });
  ring(x, y, ecol(EN.facet.col), 4, r, .6, 3);
  Audio_.coldRing();
}
function stasisAt(x, y) {
  for (const s of G.stasis) if (Math.hypot(x - s.x, y - s.y) < s.r) return s;
  return null;
}
function chillAt(x, y) {
  for (const c of G.chill) if (Math.hypot(x - c.x, y - c.y) < c.r) return 1;
  return 0;
}

/* ---- Emberwake: the heatwave, and the floor spitting fire -------------
   The branch spent its own future and is paying it back as heat, so the
   room BREATHES. A cycle is: quiet, a telegraph, a hard push OUTWARD
   (toward the rim, which is where the floor ends), a beat at full
   extension, then a longer pull INWARD (toward the middle, which is where
   the corona sweep lives). Both halves are dangerous and for opposite
   reasons, so neither "hug the rim" nor "sit in the middle" survives.

   Every cycle rolls its own quiet length and its own strength, so the
   rhythm never becomes something you can count along with — you read the
   telegraph or you get moved.

   The push runs through the player's `env` channel, not their knockback:
   it is the room, so it stops when the room stops and it is cancelled by
   walls rather than banking up behind them. It can hold you against a wall
   or against the rim; it can never post you through either. */
const HEATWAVE_CALM_MIN = 3.2;   /* shortest quiet stretch between breaths */
const HEATWAVE_CALM_MAX = 6.4;   /* longest */
const HEATWAVE_WARN = .85;       /* telegraph before the breath starts */
const HEATWAVE_OUT = 1.15;       /* seconds of outward push */
const HEATWAVE_HOLD = .34;       /* the beat at full extension */
const HEATWAVE_IN = 1.40;        /* seconds of inward pull — the longer, meaner half */
const HEATWAVE_OUT_V = 300;      /* px/s of outward push at the peak of the breath */
const HEATWAVE_IN_V = 250;       /* px/s of inward pull at its peak */
const HEATWAVE_STR_MIN = .78;    /* per-cycle strength roll */
const HEATWAVE_STR_MAX = 1.24;
const HEATWAVE_HEAT = .22;       /* heat the outward half adds to your gun, per second */

/* ---- Emberwake: ground flame spurts ----------------------------------
   Random jets out of the floor, each telegraphed for SPURT_WARN. They are
   random until you stop moving: hold still longer than SPURT_STILL and they
   start landing on you specifically, tightening as you keep standing there.
   That is the whole point of them — Emberwake's other hazards (the corona,
   the heat gauge) all reward planting yourself, and this is the tax. */
const SPURT_EVERY_MIN = .9;      /* gap between jets, fastest */
const SPURT_EVERY_MAX = 2.2;     /* ...and slowest */
const SPURT_WARN = .62;          /* telegraph before it lights */
const SPURT_R = 46;              /* radius of the jet */
const SPURT_DPS = 40;            /* damage per second while standing in one */
const SPURT_LIFE = 1.3;          /* how long it burns after lighting */
const SPURT_STILL = .8;          /* seconds of standing still before they hunt you */
const SPURT_SPREAD = 64;         /* how tightly they land on a stationary target */
const SPURT_STILL_SPEED = 70;    /* px/s under which you count as standing still */

function emberFloor(pad) {
  const nom = arenaNominal();
  /* the forge floor tightens as your gun runs hot. Proportional rather than
     a flat pixel figure so it behaves the same on any window, and floored at
     FLOOR_MIN so the rim can never close inside a vent stack. */
  const f = Math.max(FLOOR_MIN, 1 - clamp(G.heat || 0, 0, 1.2) * .09);
  return { cx: nom.cx, cy: nom.cy, R: nom.R * f, nom };
}
function heatwaveReset() {
  G.hw = { ph: 0, t: rnd(HEATWAVE_CALM_MAX, HEATWAVE_CALM_MIN), str: 1, r: 0, n: 0 };
}
/* 0 calm · 1 telegraph · 2 out · 3 hold · 4 in */
function heatwaveField(dt) {
  if (!G.hw) heatwaveReset();
  const hw = G.hw, p = G.player;
  hw.t -= dt;
  if (hw.t <= 0) {
    if (hw.ph === 0) { hw.ph = 1; hw.t = HEATWAVE_WARN; hw.str = rnd(HEATWAVE_STR_MAX, HEATWAVE_STR_MIN);
      Audio_.tideWarn(); banner("Heatwave", hw.str > 1.08 ? "hold onto something" : "the room is breathing"); }
    else if (hw.ph === 1) { hw.ph = 2; hw.t = HEATWAVE_OUT; Audio_.emberVent ? Audio_.emberVent() : Audio_.vent(); shake(.22); }
    else if (hw.ph === 2) { hw.ph = 3; hw.t = HEATWAVE_HOLD; }
    else if (hw.ph === 3) { hw.ph = 4; hw.t = HEATWAVE_IN; Audio_.vent(); shake(.18); }
    else { hw.ph = 0; hw.t = rnd(HEATWAVE_CALM_MAX, HEATWAVE_CALM_MIN); hw.n++; }
  }
  /* the envelope: a half sine over whichever half we are in, so the push
     arrives and leaves smoothly instead of snapping on */
  let force = 0;
  if (hw.ph === 2) force = Math.sin(Math.PI * (1 - hw.t / HEATWAVE_OUT)) * HEATWAVE_OUT_V;
  else if (hw.ph === 4) force = -Math.sin(Math.PI * (1 - hw.t / HEATWAVE_IN)) * HEATWAVE_IN_V;
  force *= hw.str;
  hw.r = hw.ph === 3 ? 1 : hw.ph === 2 ? 1 - hw.t / HEATWAVE_OUT : hw.ph === 4 ? hw.t / HEATWAVE_IN : 0;
  const fl = emberFloor(26);
  if (force !== 0) {
    const dx = p.x - fl.cx, dy = p.y - fl.cy, d = Math.hypot(dx, dy) || 1;
    /* adds rather than assigns: env is a shared per-frame accumulator that
       updatePlayer clears, so the breath is one contributor among however
       many the room has */
    p.env.x += (dx / d) * force; p.env.y += (dy / d) * force;
    /* the outward half is the gun's problem too: riding a heatwave cooks it */
    if (force > 0) G.heat = clamp(G.heat + HEATWAVE_HEAT * dt * hw.str, 0, 1.2);
    /* everything loose goes with it, lighter bodies further — the same
       weight table the shove uses, so the room is consistent about mass */
    for (const e of G.enemies) {
      if (BOSSES[e.type]) continue;
      const ex = e.x - fl.cx, ey = e.y - fl.cy, ed = Math.hypot(ex, ey) || 1;
      const f = (force * .52) / enWeight(e);
      e.x += (ex / ed) * f * dt; e.y += (ey / ed) * f * dt;
      arenaPush(e);
    }
    for (const h of G.hostiles) {
      const hx = h.x - fl.cx, hy = h.y - fl.cy, hd = Math.hypot(hx, hy) || 1;
      h.vx += (hx / hd) * force * .9 * dt; h.vy += (hy / hd) * force * .9 * dt;
    }
  }
}
function spurtField(dt) {
  const p = G.player;
  const sp = Math.hypot(p.vx, p.vy);
  G.stillT = sp < SPURT_STILL_SPEED ? (G.stillT || 0) + dt : 0;
  G.spurtT = (G.spurtT || rnd(SPURT_EVERY_MAX, SPURT_EVERY_MIN)) - dt;
  if (G.spurtT > 0) return;
  G.spurtT = rnd(SPURT_EVERY_MAX, SPURT_EVERY_MIN);
  const fl = emberFloor(26);
  let x, y;
  const still = G.stillT > SPURT_STILL;
  if (still) {
    /* the longer you have been planted the tighter it lands */
    const tight = clamp(1 - (G.stillT - SPURT_STILL) / 2.2, .18, 1);
    const a = rnd(TAU), rr = rnd(SPURT_SPREAD * tight);
    x = p.x + Math.cos(a) * rr; y = p.y + Math.sin(a) * rr;
  } else {
    const a = rnd(TAU), rr = Math.sqrt(rnd(1)) * fl.R * .92;
    x = fl.cx + Math.cos(a) * rr; y = fl.cy + Math.sin(a) * rr;
  }
  /* never inside a wall, where it would be invisible and unavoidable */
  if (arenaSolidAt(x, y, SPURT_R * .5)) return;
  trace({ kind: "disc", x, y, r: SPURT_R, warn: SPURT_WARN, live: .12, fade: SPURT_LIFE,
    dot: SPURT_DPS, col: ecol(EN.ignis.col) });
  G.spurts = G.spurts || [];
  G.spurts.push({ x, y, t: 0, warn: SPURT_WARN, life: SPURT_WARN + SPURT_LIFE + .12, hunted: still });
  Audio_.tone({ type: "sine", freq: 160, to: 420, dur: .22, gain: .035 });
}
function spurtPaint() {
  if (!G.spurts) return;
  const col = ecol(EN.ignis.col);
  for (const s of G.spurts) {
    if (s.t < s.warn) continue;
    const f = clamp((s.t - s.warn) / (s.life - s.warn), 0, 1);
    const h = (1 - f) * 46 + 8;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (let k = 0; k < 5; k++) {
      const a = s.x + Math.sin(G.time * 9 + k * 1.7) * 9;
      const g = ctx.createLinearGradient(a, s.y, a, s.y - h);
      g.addColorStop(0, "rgba(255,230,170,." + Math.round((1 - f) * 55) + ")");
      g.addColorStop(1, "rgba(" + col + ",0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(a, s.y - h / 2, 7 + (1 - f) * 6, h / 2, 0, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }
}
function spurtTick(dt) {
  if (!G.spurts) return;
  for (let i = G.spurts.length - 1; i >= 0; i--) {
    const s = G.spurts[i];
    s.t += dt;
    if (s.t > s.warn && s.t - dt <= s.warn) {
      burst(s.x, s.y, 16, ecol(EN.ignis.col), 1.5, { life: .5 });
      ring(s.x, s.y, ecol(EN.ignis.col), 6, SPURT_R * 1.2, .35, 2.4);
      if (s.hunted) text(s.x, s.y - 40, "move", ecol(EN.ignis.col), 13);
      Audio_.boom ? Audio_.boom() : null;
    }
    if (s.t >= s.life) G.spurts.splice(i, 1);
  }
}

/* ---- Nulltide: the rewind ---- */
function tideRewind(forced) {
  const back = G.snap[0];
  if (!back) return;
  for (const e of G.enemies) {
    const rec = back.e[e.id];
    if (rec && e.type !== TL.boss) {
      ring(e.x, e.y, ecol(EN[e.type].col), 4, 34, .3, 1.6);
      e.x = rec.x; e.y = rec.y;
    }
  }
  /* if the player is standing in their own wake, the tide takes them too */
  const p = G.player;
  let inWake = false;
  for (const w of G.wake) if (Math.hypot(p.x - w.x, p.y - w.y) < 26 && w.age > 1.4) { inWake = true; break; }
  if (inWake) {
    const dest = G.wake.find((w) => w.age > 1.4);
    if (dest) {
      G.ghosts.push({ x: p.x, y: p.y, ang: p.ang, r: p.r, life: .4, max: .4, col: TH.core, a: .6, grow: .3 });
      p.x = dest.x; p.y = dest.y;
      p.ported = 1; playerBounds(p);
      p.iframe = Math.max(p.iframe || 0, .45);
      unlockSecret("wake");
      text(p.x, p.y - 40, "slack water", TH.core, 16);
    }
  }
  flash(.09, ecol(EN.fathom.col));
  shake(.2);
  Audio_.tideRewind();
  banner("Tide", forced ? "pulled early" : "two seconds back");
}

/* ---- Nulltide: the floor breathes with the tide ------------------------
   It closes in as the rewind approaches and opens back up the instant it
   turns, so the tide clock is also a floor clock. */
function nulltideFloor(pad) {
  const nom = arenaNominal();
  const tideT = G.tideT > 0 ? G.tideT : 15;
  const f = clamp(1 - tideT / 15, 0, 1);
  const inset = f * f * TIDE_INSET_MAX;
  return { x0: nom.x0 + inset, x1: nom.x1 - inset, y0: nom.y0 + inset, y1: nom.y1 - inset, f };
}

/* ---- Terminus: the floor is the clock face ----------------------------
   A disc, not a rectangle: the whole branch reads off the centre now, so
   the boundary has to be the dial's rim. It closes as entropy runs out. */
function terminusFloor(pad) {
  const nom = arenaNominal();
  const f = 1 - clamp(G.entropy / G.entropyMax, 0, 1);
  return { cx: nom.cx, cy: nom.cy,
    R: nom.R * Math.max(FLOOR_MIN, 1 - Math.max(0, f - .25) * .16), f };
}

/* ---- Terminus: entropy ---- */
function entropyAdd(n) {
  G.entropy = clamp(G.entropy + n, 0, G.entropyMax);
}

/* ---- Terminus: the room IS the clock ----------------------------------
   Terminus was always described as a branch on a one-second loop with a
   clock running out. It now has one, and the clock is the arena rather than
   a number in the corner:

     · the floor is a dial — twelve hours, a spindle, tick marks
     · the MINUTE HAND is a real hazard sweeping the whole floor, so the
       time is something you have to physically stay out of the way of
     · the hand completes one revolution every TERM_HOUR seconds, and
       reaching twelve TOLLS: the room escalates, permanently, and the
       hour hand advances one notch so the escalation tier is readable off
       the dial without any HUD

   Escalation is cumulative and caps at TERM_TIERS so a long level can't
   run away entirely:

     toll 1   the hand sweeps faster, entropy drains faster
     toll 2   a SECOND hand, opposite the first
     toll 3   faster again, and each toll pulls in more bodies
     toll 4   a THIRD hand, at 120°, and the drain doubles

   Every toll also fires a ring out of the spindle and takes seconds off the
   entropy clock directly, so a toll is both a warning and a hit. */
const TERM_HOUR = 26;            /* seconds per hour — one sweep of the minute hand */
const TERM_TIERS = 4;            /* escalation steps before it stops getting worse */
const TERM_HAND_DMG = 22;        /* damage per second standing in the sweep */
const TERM_HAND_W = 23;          /* half-width of the hand, px */
const TERM_HAND_ENEMY_DMG = 34;  /* it is not on anybody's side */
const TERM_TOLL_ENTROPY = 7;     /* seconds a toll takes off the entropy clock */
const TERM_TOLL_SPAWN = 2;       /* bodies a toll pulls in */
const TERM_DRAIN_PER_TIER = .22; /* extra entropy drain per tier */
const TERM_SPEED_PER_TIER = .16; /* extra hand speed per tier */
const TOLL_LINE = ["the hour turns", "it is later than it was", "the hand is not slowing down",
  "three hands now", "there is no more clock to run out"];

function termTier() { return Math.min(G.hour || 0, TERM_TIERS); }
function termHandCount() { return 1 + Math.min(2, Math.floor((G.hour || 0) / 2)); }
function termHandSpeed() { return 1 + termTier() * TERM_SPEED_PER_TIER; }
function termHandAngles() {
  const n = termHandCount(), out = [];
  for (let i = 0; i < n; i++) out.push((G.handA || 0) + (i / n) * TAU);
  return out;
}
function terminusToll() {
  G.hour = (G.hour || 0) + 1;
  const col = ecol(EN.coda.col);
  banner("Toll " + G.hour, TOLL_LINE[Math.min(G.hour - 1, TOLL_LINE.length - 1)]);
  flash(.28, col); shake(.55);
  Audio_.entropyTick(); Audio_.waveIn();
  shock(W / 2, H / 2, { r0: 24, r1: Math.max(W, H), life: .75, col, w: 6 });
  /* the ring the toll throws: three concentric hoops, inner first, so it
     reads as something leaving the spindle rather than one flat pulse */
  for (let i = 0; i < 3; i++) {
    trace({ kind: "ring", x: W / 2, y: H / 2, r: 140 + i * 140, wide: 30,
      warn: .75 + i * .3, live: .16, fade: .5, dmg: 24, col });
  }
  G.entropy = Math.max(0, G.entropy - TERM_TOLL_ENTROPY);
  const L = curLevel();
  const n = TERM_TOLL_SPAWN + (G.hour >= 3 ? 2 : 0);
  for (let i = 0; i < n; i++) {
    const pt = edgePoint();
    spawnEnemy(pick(L.types), pt.x, pt.y);
  }
}
function terminusClock(dt) {
  const p = G.player;
  if (G.hour == null) { G.hour = 0; G.handA = -Math.PI / 2; G.hourT = TERM_HOUR; }
  const step = dt * (TAU / TERM_HOUR) * termHandSpeed();
  G.handA += step;
  G.hourT -= dt * termHandSpeed();
  /* twelve: the hand has come back round to the top */
  if (G.handA >= Math.PI * 1.5) { G.handA -= TAU; G.hourT = TERM_HOUR; terminusToll(); }
  /* the sweep is a hazard, for everything in the room */
  const R = Math.max(W, H);
  for (const a of termHandAngles()) {
    const ex = W / 2 + Math.cos(a) * R, ey = H / 2 + Math.sin(a) * R;
    if (segDist(p.x, p.y, W / 2, H / 2, ex, ey) < TERM_HAND_W + p.r) {
      /* the room's own hazard: it hurts where you stand and never moves you */
      hurtPlayer(TERM_HAND_DMG * dt, null);
      if (chance(dt * 26)) part(p.x, p.y, { col: ecol(EN.coda.col), s: 40, life: .3, size: 2 });
    }
    for (const e of G.enemies) {
      if (e.dead || BOSSES[e.type]) continue;
      if (segDist(e.x, e.y, W / 2, H / 2, ex, ey) < TERM_HAND_W + e.r)
        damageEnemy(e, TERM_HAND_ENEMY_DMG * dt, { spark: chance(.05) });
    }
  }
}
function terminusPaintClock() {
  const col = ecol(EN.coda.col), cx = W / 2, cy = H / 2;
  const nom = arenaNominal(), R = nom.R;
  ctx.save();
  /* the dial */
  ctx.strokeStyle = "rgba(" + col + ",.16)"; ctx.lineWidth = 1.4;
  for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(cx, cy, R * (.34 + i * .3), 0, TAU); ctx.stroke(); }
  ctx.font = "700 13px " + MONO; ctx.textAlign = "center";
  for (let i = 0; i < 12; i++) {
    const a = -Math.PI / 2 + (i / 12) * TAU;
    const big = i % 3 === 0;
    ctx.strokeStyle = "rgba(" + col + "," + (big ? .42 : .2) + ")";
    ctx.lineWidth = big ? 3 : 1.6;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * R * (big ? .90 : .94), cy + Math.sin(a) * R * (big ? .90 : .94));
    ctx.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R);
    ctx.stroke();
    if (big) {
      ctx.fillStyle = "rgba(" + col + ",.30)";
      ctx.fillText(i === 0 ? "12" : String(i), cx + Math.cos(a) * R * .80, cy + Math.sin(a) * R * .80 + 5);
    }
  }
  /* the hour hand: short, blunt, and the readout for which tier you are in */
  const hourA = -Math.PI / 2 + (Math.min(G.hour || 0, 12) / 12) * TAU;
  ctx.strokeStyle = "rgba(" + col + ",.55)"; ctx.lineWidth = 8; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(hourA) * R * .40, cy + Math.sin(hourA) * R * .40);
  ctx.stroke();
  /* the minute hands, which are the hazard: a lit blade with a leading
     shadow so you can see which way it is coming from a long way off */
  for (const a of termHandAngles()) {
    const ex = cx + Math.cos(a) * R * 1.5, ey = cy + Math.sin(a) * R * 1.5;
    const g = ctx.createLinearGradient(cx, cy, ex, ey);
    g.addColorStop(0, "rgba(" + col + ",.42)");
    g.addColorStop(1, "rgba(" + col + ",.10)");
    ctx.strokeStyle = g; ctx.lineWidth = TERM_HAND_W * 2;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(ex, ey); ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,.55)"; ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(ex, ey); ctx.stroke();
    /* the sliver of floor it is about to cross */
    ctx.strokeStyle = "rgba(" + col + ",.14)"; ctx.lineWidth = TERM_HAND_W * 2;
    const lead = a + .30 * termHandSpeed();
    ctx.beginPath(); ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(lead) * R * 1.5, cy + Math.sin(lead) * R * 1.5);
    ctx.stroke();
  }
  ctx.lineCap = "butt";
  ctx.fillStyle = "rgba(" + col + ",.8)";
  ctx.beginPath(); ctx.arc(cx, cy, 9, 0, TAU); ctx.fill();
  ctx.textAlign = "left";
  ctx.restore();
}

/* ---- Terminus: the second behind --------------------------------------
   Terminus' signature mechanic, and the one that makes it Terminus rather
   than a harder room: the branch keeps a copy of you and plays it back
   BEHIND_DELAY seconds late. It walks the exact path you walked, fires the
   shots you fired, and it cannot be killed.

   It never needs to path around anything — it is following ground you have
   already stood on — so it can't get stuck in geometry and it can't be
   cheesed by cover. What it punishes is repetition: a loop, a corner you
   keep retreating to, a lap of the arena, and it is waiting in it. Break
   your own pattern and it is harmless.

   The one thing that touches it is a dash: go through it and the paradox
   puts it out for BEHIND_STUN, during which it stops consuming the trail
   and so falls further behind — the stun buys real distance, not just a
   pause. That gives the reworked dash a use here that outrunning it does
   not cover. */
const BEHIND_DELAY = 1.15;    /* seconds it runs behind you */
const BEHIND_START = 10;      /* seconds into a level before it wakes up */
const BEHIND_DPS = 30;        /* contact damage per second */
const BEHIND_SHOT_DMG = 10;   /* damage of a replayed shot */
const BEHIND_SHOT_SPD = 470;
const BEHIND_STUN = 1.7;      /* how long a dash through it puts it out */
const BEHIND_SAMPLE = .05;    /* how often the trail is recorded */
const BEHIND_TRAIL_MAX = 220; /* ~11s of path */
const BEHIND_R = 13;

function behindField(dt) {
  const p = G.player, col = ecol(EN.omega.col);
  G.termT = (G.termT || 0) + dt;
  G.bTrail = G.bTrail || [];
  /* record */
  G.bT = (G.bT || 0) - dt;
  if (G.bT <= 0) {
    G.bT = BEHIND_SAMPLE;
    const shot = (G.shotN || 0) !== (G.bShotN || 0);
    G.bShotN = G.shotN || 0;
    G.bTrail.push({ x: p.x, y: p.y, aim: p.aim, fire: shot ? 1 : 0, t: G.time });
    if (G.bTrail.length > BEHIND_TRAIL_MAX) { G.bTrail.shift(); if (G.bi > 0) G.bi--; }
  }
  if (!G.behind) {
    if (G.termT < BEHIND_START || G.bTrail.length < 8) return;
    G.behind = { x: G.bTrail[0].x, y: G.bTrail[0].y, ang: 0, stun: 0, born: 0 };
    G.bi = 0;
    ring(G.behind.x, G.behind.y, col, 8, 150, .6, 3);
    flash(.16, col); Audio_.echo();
    banner("One second behind", "it has your route");
    return;
  }
  const bh = G.behind;
  bh.born += dt;
  if (bh.stun > 0) { bh.stun -= dt; return; }
  /* walk the trail forward to wherever we should be by now, firing whatever
     was fired along the way */
  const want = G.time - BEHIND_DELAY;
  let node = null;
  while (G.bi < G.bTrail.length - 1 && G.bTrail[G.bi].t <= want) {
    node = G.bTrail[G.bi];
    if (node.fire) {
      G.hostiles.push({ x: node.x, y: node.y,
        vx: Math.cos(node.aim) * BEHIND_SHOT_SPD, vy: Math.sin(node.aim) * BEHIND_SHOT_SPD,
        r: 5, dmg: BEHIND_SHOT_DMG, life: 2.6, col, spin: 0, split: 0 });
      Audio_.shoot(.72);
    }
    G.bi++;
  }
  if (node) { bh.x = node.x; bh.y = node.y; bh.ang = node.aim; }
  if (chance(dt * 24)) ghost(bh.x, bh.y, bh.ang, col, { r: BEHIND_R, life: .3, a: .3 });
  /* a dash through it is the only thing it answers to */
  if (p.dashing > 0 && Math.hypot(p.x - bh.x, p.y - bh.y) < p.r + BEHIND_R + 8) {
    bh.stun = BEHIND_STUN;
    burst(bh.x, bh.y, 26, col, 1.5); ring(bh.x, bh.y, col, 8, 130, .5, 3);
    shock(bh.x, bh.y, { r0: 14, r1: 120, life: .3, col, w: 4 });
    text(bh.x, bh.y - 34, "paradox", col, 15);
    hitStop(HITSTOP_MEDIUM); shake(.3); Audio_.swap();
    return;
  }
  if (Math.hypot(p.x - bh.x, p.y - bh.y) < p.r + BEHIND_R) hurtPlayer(BEHIND_DPS * dt, null);
}
function behindPaint() {
  const bh = G.behind;
  if (!bh) return;
  const col = ecol(EN.omega.col), stunned = bh.stun > 0;
  ctx.save();
  ctx.translate(bh.x, bh.y); ctx.rotate(bh.ang);
  ctx.globalAlpha = stunned ? .3 : .8;
  ctx.fillStyle = "rgba(" + col + ",.14)";
  heroPath(BEHIND_R); ctx.fill();
  ctx.strokeStyle = "rgb(" + col + ")"; ctx.lineWidth = 1.8;
  heroPath(BEHIND_R); ctx.stroke();
  ctx.restore();
  ctx.globalAlpha = 1;
  /* the delay, drawn as an arc around it — and the stun counting back down */
  ctx.strokeStyle = stunned ? "rgba(255,255,255,.7)" : "rgba(" + col + ",.5)";
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.arc(bh.x, bh.y, BEHIND_R + 8,
    -Math.PI / 2, -Math.PI / 2 + TAU * (stunned ? bh.stun / BEHIND_STUN : 1));
  ctx.stroke();
  if (stunned) {
    ctx.font = "700 10px " + MONO; ctx.textAlign = "center";
    ctx.fillStyle = "rgba(255,255,255,.75)";
    ctx.fillText("STALLED", bh.x, bh.y - BEHIND_R - 14);
    ctx.textAlign = "left";
  }
}

/* =====================================================================
   ARENA GEOMETRY — the floor a branch actually gives you
   =====================================================================
   Replaces the old union-of-rects clamp. That version described a room as
   "the set of places you may stand" and snapped you to the nearest legal
   point, which produced exactly the two failures you can feel: at a seam
   between two of its rects the nearest-point search would flip which rect
   it was clamping into and pop you sideways, and every clamp killed your
   whole velocity rather than the part driving into the wall, so sliding
   along a face felt like catching on an invisible nail.

   The model here is the inverse and it is the standard one: ONE convex
   floor (a rect or a disc, still owned by the branch because three of them
   breathe it with their own mechanic) with SOLID BOXES cut out of it. A box
   carries three properties:

     solid  blocks bodies — you, enemies, and anything being shoved
     los    blocks sight — shots and hazard lines die on it
     rad    corner rounding

   Corner rounding is the thing that actually fixes the snags: a box corner
   is treated as an arc, so a glancing approach is deflected around it
   instead of wedging into a 90° notch. Collision resolves along the
   shortest exit and then removes only the component of velocity pointing
   into the wall, which is what makes walls slide. Boxes may be ROTATED
   (`a`), which is done by running the whole test in the box's own frame —
   that is what lets a layout use diagonals and tangent arcs instead of
   reading as a grid of blocks.

   Solids are also what the shrinking floors are checked against, and the
   player's move is substepped (see stepPlayer in 08-run-and-player.js), so
   a dash at 1180px/s and a shove landing mid-dash both get the walls'
   opinion several times per frame rather than once. */
const WALL_T = 26;        /* standard wall thickness, px */
const WALL_T_HEAVY = 38;  /* for the load-bearing ones */
/* Openings are sized in PIXELS, never in fractions of the room, so a
   chokepoint is still a chokepoint on a phone and on a 32" monitor. The
   player is 26px across, so: */
const CHOKE_TIGHT = 84;   /* three body-widths — you commit or you don't */
const CHOKE_MID = 124;    /* a door you can back out of */
const CHOKE_OPEN = 170;   /* wide enough to fight inside */
/* Two branches tighten their round floor with their own mechanic, which
   creates a trap worth naming: if the rim can close INSIDE a wall, the shell
   pushes you into the wall, the wall pushes you back out past the rim, and
   you oscillate — permanently stuck in geometry, which is exactly the failure
   this rework exists to remove. So there is a contract:
     · a shrinking floor never goes below FLOOR_MIN of its nominal radius
     · every wall in a disc layout sits entirely inside WALL_MAX_R of it
   WALL_MAX_R is below FLOOR_MIN with room to spare, so the rim always
   closes onto open floor. */
const FLOOR_MIN = .87;   /* the tightest a breathing floor may ever close */
const WALL_MAX_R = .86;  /* the furthest out a wall in a disc room may reach */
/* Nulltide's rect floor breathes the same way and needs the same contract:
   this is the deepest its rim ever closes, and no wall parallel to a rim may
   sit within it. A wall PERPENDICULAR to a closing rim is harmless (the
   push and the clamp are on different axes and cannot fight), which is why
   the breakwaters may run right out to the edge and the side wall may not. */
const TIDE_INSET_MAX = 96;

function abox(cx, cy, w, h, o) {
  return Object.assign({ cx, cy, w: Math.max(2, w), h: Math.max(2, h), a: 0, rad: 9, los: 1, solid: 1 }, o || {});
}
/* a bar spanning two coordinates, which is how nearly every wall below is
   most readable to write */
function vbar(x, ya, yb, t, o) { return abox(x, (ya + yb) / 2, t || WALL_T, Math.abs(yb - ya), o); }
function hbar(y, xa, xb, t, o) { return abox((xa + xb) / 2, y, Math.abs(xb - xa), t || WALL_T, o); }
/* a slab laid tangent to a circle — the building block of every ring */
function arcbar(cx, cy, r, ang, len, t, o) {
  return abox(cx + Math.cos(ang) * r, cy + Math.sin(ang) * r, len, t || WALL_T,
    Object.assign({ a: ang + Math.PI / 2 }, o || {}));
}

/* ---- the primitives -------------------------------------------------- */
/* pushes a circle out of one box along the shortest exit and hands back the
   exit normal, or null if it was never inside. Rotated boxes are handled by
   doing the work in the box's own frame and rotating the result back. */
function pushOutBox(x, y, r, b) {
  let dx = x - b.cx, dy = y - b.cy;
  const ca = b.a ? Math.cos(b.a) : 1, sa = b.a ? Math.sin(b.a) : 0;
  if (b.a) { const lx = dx * ca + dy * sa; dy = -dx * sa + dy * ca; dx = lx; }
  const hw = b.w / 2, hh = b.h / 2;
  const rad = Math.min(b.rad, hw, hh);
  const sx = dx < 0 ? -1 : 1, sy = dy < 0 ? -1 : 1;
  const ax = Math.abs(dx), ay = Math.abs(dy);
  let lx, ly, nx, ny;
  const ox = ax - (hw - rad), oy = ay - (hh - rad);
  if (ox > 0 && oy > 0) {
    /* the rounded corner: exit radially off the corner arc */
    const d = Math.hypot(ox, oy);
    if (d >= rad + r) return null;
    if (d < 1e-6) { nx = sx; ny = 0; } else { nx = sx * (ox / d); ny = sy * (oy / d); }
    const push = rad + r - d;
    lx = dx + nx * push; ly = dy + ny * push;
  } else {
    const px = hw + r - ax, py = hh + r - ay;
    if (px <= 0 || py <= 0) return null;
    if (px < py) { nx = sx; ny = 0; lx = sx * (hw + r); ly = dy; }
    else { nx = 0; ny = sy; lx = dx; ly = sy * (hh + r); }
  }
  return b.a
    ? { x: b.cx + lx * ca - ly * sa, y: b.cy + lx * sa + ly * ca,
        nx: nx * ca - ny * sa, ny: nx * sa + ny * ca }
    : { x: b.cx + lx, y: b.cy + ly, nx, ny };
}
/* is this circle overlapping the box at all */
function inBox(x, y, r, b) {
  let dx = x - b.cx, dy = y - b.cy;
  if (b.a) { const ca = Math.cos(b.a), sa = Math.sin(b.a); const lx = dx * ca + dy * sa; dy = -dx * sa + dy * ca; dx = lx; }
  return Math.abs(dx) < b.w / 2 + r && Math.abs(dy) < b.h / 2 + r;
}
/* segment vs box, by the slab method in the box's own frame */
function segBox(x0, y0, x1, y1, b) {
  let ax = x0 - b.cx, ay = y0 - b.cy, bx = x1 - b.cx, by = y1 - b.cy;
  if (b.a) {
    const ca = Math.cos(b.a), sa = Math.sin(b.a);
    let t = ax * ca + ay * sa; ay = -ax * sa + ay * ca; ax = t;
    t = bx * ca + by * sa; by = -bx * sa + by * ca; bx = t;
  }
  const hw = b.w / 2, hh = b.h / 2;
  let t0 = 0, t1 = 1;
  const dx = bx - ax, dy = by - ay;
  for (let k = 0; k < 2; k++) {
    const d = k ? dy : dx, o = k ? ay : ax, h = k ? hh : hw;
    if (Math.abs(d) < 1e-9) { if (o < -h || o > h) return false; continue; }
    let lo = (-h - o) / d, hi = (h - o) / d;
    if (lo > hi) { const sw = lo; lo = hi; hi = sw; }
    if (lo > t0) t0 = lo;
    if (hi < t1) t1 = hi;
    if (t0 > t1) return false;
  }
  return true;
}
/* the same test, but returning how far along the ray the box starts — used
   to stop a hazard line at the wall it runs into */
function rayBox(x, y, dx, dy, b, maxT) {
  let ax = x - b.cx, ay = y - b.cy, rx = dx, ry = dy;
  if (b.a) {
    const ca = Math.cos(b.a), sa = Math.sin(b.a);
    let t = ax * ca + ay * sa; ay = -ax * sa + ay * ca; ax = t;
    t = rx * ca + ry * sa; ry = -rx * sa + ry * ca; rx = t;
  }
  const hw = b.w / 2, hh = b.h / 2;
  let t0 = 0, t1 = maxT;
  for (let k = 0; k < 2; k++) {
    const d = k ? ry : rx, o = k ? ay : ax, h = k ? hh : hw;
    if (Math.abs(d) < 1e-9) { if (o < -h || o > h) return null; continue; }
    let lo = (-h - o) / d, hi = (h - o) / d;
    if (lo > hi) { const sw = lo; lo = hi; hi = sw; }
    if (lo > t0) t0 = lo;
    if (hi < t1) t1 = hi;
    if (t0 > t1) return null;
  }
  return t0;
}

/* ---- the cached layout ------------------------------------------------
   Rebuilt whenever the branch, the level or the window changes, and never
   otherwise — the boxes themselves don't move, so nothing here runs per
   frame. Authored against the nominal floor (the un-breathed one) so a
   branch tightening its floor can never leave a wall stranded outside it. */
let arenaSig = "";
let arenaCache = { boxes: [], gates: [], nom: null };
function arenaNominal() {
  const pad = 26;
  if (BRANCHFN.id === "emberwake" || BRANCHFN.id === "terminus")
    return { disc: 1, cx: W / 2, cy: H / 2, R: Math.max(160, Math.min(W, H) / 2 - pad) };
  return { x0: pad, y0: pad, x1: W - pad, y1: H - pad, cx: W / 2, cy: H / 2,
    R: Math.max(160, Math.min(W, H) / 2 - pad) };
}
function arenaLayout() {
  const sig = BRANCHFN.id + "|" + G.levelIdx + "|" + W + "x" + H;
  if (arenaSig === sig) return arenaCache;
  const nom = arenaNominal();
  const fns = LAYOUTS[BRANCHFN.id];
  const fn = fns && fns[G.levelIdx % fns.length];
  const built = fn ? fn(nom) : { boxes: [], gates: [] };
  arenaCache = { boxes: built.boxes || [], gates: built.gates || [], nom, name: built.name || "" };
  arenaSig = sig;
  return arenaCache;
}
function arenaBoxes() { return arenaLayout().boxes; }
/* the chokepoints of the current layout, as points. Used by the Glassfall
   floor to refuse to shatter a doorway out from under you. */
function arenaGates() { return arenaLayout().gates; }

/* ---- the queries ----------------------------------------------------- */
/* does anything between these two points block sight? This is what makes a
   wall cover rather than decoration: enemy shots die on it, hazard lines
   stop at it, and a ranged enemy that can't see you goes looking. */
function arenaBlocked(x0, y0, x1, y1) {
  const bx = arenaBoxes();
  for (let i = 0; i < bx.length; i++) if (bx[i].los && segBox(x0, y0, x1, y1, bx[i])) return true;
  return false;
}
/* how far a ray gets before a wall stops it */
function arenaRay(x, y, ang, maxLen) {
  const bx = arenaBoxes();
  const dx = Math.cos(ang), dy = Math.sin(ang);
  let best = maxLen;
  for (let i = 0; i < bx.length; i++) {
    if (!bx[i].los) continue;
    const t = rayBox(x, y, dx, dy, bx[i], best);
    if (t != null && t < best) best = t;
  }
  return best;
}
function arenaSolidAt(x, y, r) {
  const bx = arenaBoxes();
  for (let i = 0; i < bx.length; i++) if (bx[i].solid && inBox(x, y, r || 0, bx[i])) return bx[i];
  return null;
}
/* pushes any body out of the solids it is overlapping. Three passes,
   because a body wedged into the corner where two boxes meet is pushed out
   of one into the other and needs a second look; three is comfortably
   enough for every layout below and bounded so it can never spin. */
function resolveSolids(ent, r) {
  const bx = arenaBoxes();
  let last = null;
  for (let pass = 0; pass < 3; pass++) {
    let any = false;
    for (let i = 0; i < bx.length; i++) {
      const b = bx[i];
      if (!b.solid) continue;
      const res = pushOutBox(ent.x, ent.y, r, b);
      if (!res) continue;
      ent.x = res.x; ent.y = res.y; last = res; any = true;
    }
    if (!any) break;
  }
  return last;
}
/* enemies get pushed out of walls but keep no velocity state worth
   bouncing, so this is the whole of their wall handling. Bosses are exempt
   — they are the size of the room and the layouts leave them the middle. */
function arenaPush(e) {
  if (!arenaBoxes().length) { e.wallN = null; return; }
  const n = resolveSolids(e, e.r * .82);
  e.wallN = n ? { nx: n.nx, ny: n.ny } : null;
}
/* a body that walked into a wall slides along it toward whatever it was
   heading for, so enemies come around cover instead of grinding on it */
function slideAlongWall(e, dte, t) {
  const n = e.wallN;
  if (!n) return;
  const tx = -n.ny, ty = n.nx;
  const d = (t.x - e.x) * tx + (t.y - e.y) * ty;
  const s = d < 0 ? -1 : 1;
  e.x += tx * s * e.sp * .95 * dte;
  e.y += ty * s * e.sp * .95 * dte;
  resolveSolids(e, e.r * .82);
}
/* kills only the component of motion driving into the wall, which is what
   sliding along a face is. A shove into a wall spends itself there rather
   than banking up behind it. */
function slideOff(p, nx, ny) {
  const vn = p.vx * nx + p.vy * ny;
  if (vn < 0) { p.vx -= vn * nx; p.vy -= vn * ny; }
  if (!p.kb) return;
  const kn = p.kb.x * nx + p.kb.y * ny;
  if (kn < 0) { p.kb.x -= kn * nx * 1.3; p.kb.y -= kn * ny * 1.3; }
  /* the room's own push spends itself on the wall too, so a heatwave can
     hold you against a wall but never through it */
  if (!p.env) return;
  const en = p.env.x * nx + p.env.y * ny;
  if (en < 0) { p.env.x -= en * nx; p.env.y -= en * ny; }
}
function boundToRect(p, r) {
  if (p.x < r.x0) { p.x = r.x0; slideOff(p, 1, 0); }
  if (p.x > r.x1) { p.x = r.x1; slideOff(p, -1, 0); }
  if (p.y < r.y0) { p.y = r.y0; slideOff(p, 0, 1); }
  if (p.y > r.y1) { p.y = r.y1; slideOff(p, 0, -1); }
}
function boundToCircle(p, cx, cy, R) {
  const dx = p.x - cx, dy = p.y - cy, d = Math.hypot(dx, dy);
  if (d > R && d > 0) {
    const nx = dx / d, ny = dy / d;
    p.x = cx + nx * R; p.y = cy + ny * R;
    slideOff(p, -nx, -ny);
  }
}
/* the one call every branch's bounds() ends with: the shell has had its
   say, now the solids inside it get theirs. */
function boundToSolids(p) {
  const n = resolveSolids(p, p.r);
  if (n) slideOff(p, n.nx, n.ny);
}
/* Where the player is put down at the start of a level. The old fixed point
   (mid-width, 60% down) is inside a wall in some of the layouts below —
   Emberwake's Vent Row runs straight through it — and starting inside
   geometry is the worst version of being stuck in it. This walks outward
   from the nominal spot in a widening spiral and takes the first place that
   is on the floor, clear of every solid, and standing on glass that is
   still there. */
function playerSpawnPoint(r) {
  const nom = arenaNominal();
  const x0 = nom.disc ? nom.cx : (nom.x0 + nom.x1) / 2;
  const y0 = nom.disc ? nom.cy + nom.R * .45 : nom.y0 + (nom.y1 - nom.y0) * .6;
  const rad = r || 13;
  const okAt = (x, y) => {
    if (nom.disc) { if (Math.hypot(x - nom.cx, y - nom.cy) > nom.R * FLOOR_MIN - rad - 6) return false; }
    else if (x < nom.x0 + rad || x > nom.x1 - rad || y < nom.y0 + rad || y > nom.y1 - rad) return false;
    if (arenaSolidAt(x, y, rad + 8)) return false;
    if (G.glass) { const i = glassIndexAt(G.glass, x, y); if (i >= 0 && G.glass.pane[i].st === 2) return false; }
    return true;
  };
  if (okAt(x0, y0)) return { x: x0, y: y0 };
  for (let step = 28; step < Math.max(W, H); step += 28) {
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * TAU;
      const x = x0 + Math.cos(a) * step, y = y0 + Math.sin(a) * step;
      if (okAt(x, y)) return { x, y };
    }
  }
  return { x: nom.disc ? nom.cx : (nom.x0 + nom.x1) / 2, y: nom.disc ? nom.cy : (nom.y0 + nom.y1) / 2 };
}
/* a spawn point on the given flank that is actually on the floor and not
   inside a wall */
function arenaSpawn(side, shell) {
  const L = arenaLayout(), nom = L.nom;
  for (let tries = 0; tries < 14; tries++) {
    const e = side === "top" ? 0 : side === "right" ? 1 : side === "bottom" ? 2 : side === "left" ? 3 : rint(0, 3);
    let x, y;
    if (nom.disc || (shell && shell.disc)) {
      const a = e === 0 ? rnd(-Math.PI * .8, -Math.PI * .2) : e === 1 ? rnd(-.3, .3)
        : e === 2 ? rnd(Math.PI * .2, Math.PI * .8) : rnd(Math.PI * .7, Math.PI * 1.3);
      const R = nom.R * .92;
      x = nom.cx + Math.cos(a) * R; y = nom.cy + Math.sin(a) * R;
    } else {
      const pad = 46;
      if (e === 0) { x = rnd(nom.x1 - pad, nom.x0 + pad); y = nom.y0 + pad; }
      else if (e === 1) { x = nom.x1 - pad; y = rnd(nom.y1 - pad, nom.y0 + pad); }
      else if (e === 2) { x = rnd(nom.x1 - pad, nom.x0 + pad); y = nom.y1 - pad; }
      else { x = nom.x0 + pad; y = rnd(nom.y1 - pad, nom.y0 + pad); }
    }
    if (!arenaSolidAt(x, y, 22)) return { x, y };
  }
  return { x: nom.cx, y: nom.cy };
}

/* =====================================================================
   THE LAYOUTS
   =====================================================================
   Twelve rooms — three per branch, one per level — held to four rules:

     COVER      every layout has walls that break a real sightline, not an
                outline drawn on the floor. `los` is what does it.
     A CHOKE    at least one opening narrow enough that going through it is
                a decision. Listed in `gates` so the Glassfall floor knows
                not to shatter one away.
     DISTINCT   no two are the same shape reskinned: curtains, a cell,
                a ring, radial stacks, a corridor, a core, breakwaters, a
                pillar field, shelves, a spindle, a dial, a triangle.
     BOSS ROOMS keep the middle clear. Bosses orbit the centre and fire
                across the whole room; cover in a boss room lives in the
                outer band so the fight still has lines through it. */
const LAYOUTS = {
  /* ---- GLASSFALL: standing glass. Vertical, brittle, tall sightlines. -- */
  glassfall: [
    /* 1 · Fracture Line — two curtain walls with their doors at opposite
       ends, so crossing the hall means walking its whole length twice. */
    function (f) {
      const x1 = lerp(f.x0, f.x1, .34), x2 = lerp(f.x0, f.x1, .66), door = CHOKE_MID;
      return { name: "curtains", boxes: [
        vbar(x1, f.y0, f.y1 - door, WALL_T),
        vbar(x2, f.y0 + door, f.y1, WALL_T),
        /* two loose shards so neither open bay is a clean shooting gallery */
        abox(lerp(f.x0, f.x1, .16), lerp(f.y0, f.y1, .70), 104, WALL_T, { a: -.62 }),
        abox(lerp(f.x0, f.x1, .84), lerp(f.y0, f.y1, .30), 104, WALL_T, { a: .62 }),
      ], gates: [{ x: x1, y: f.y1 - door / 2 }, { x: x2, y: f.y0 + door / 2 }] };
    },
    /* 2 · The Cut Hall — a glass cell in the middle with ONE door. Best
       cover in the room and the easiest place to be trapped in. */
    function (f) {
      const cw = Math.min(380, (f.x1 - f.x0) * .38), chh = Math.min(260, (f.y1 - f.y0) * .40);
      const cx = f.cx, cy = f.cy, t = WALL_T_HEAVY;
      const x0 = cx - cw / 2, x1 = cx + cw / 2, y0 = cy - chh / 2, y1 = cy + chh / 2;
      return { name: "cell", boxes: [
        hbar(y0, x0, x1, t), vbar(x0, y0, y1, t), vbar(x1, y0, y1, t),
        hbar(y1, x0, cx - CHOKE_TIGHT / 2, t), hbar(y1, cx + CHOKE_TIGHT / 2, x1, t),
        /* diagonals across the outer ring, so the lap around the cell is
           not one uninterrupted sightline */
        abox(lerp(f.x0, f.x1, .17), lerp(f.y0, f.y1, .26), 168, WALL_T, { a: .74 }),
        abox(lerp(f.x0, f.x1, .83), lerp(f.y0, f.y1, .74), 168, WALL_T, { a: .74 }),
      ], gates: [{ x: cx, y: y1 }] };
    },
    /* 3 · Eleven Fifty-Nine — BOSS. Four standing shards in the outer band
       and nothing in the middle: the orrery needs its stage. */
    function (f) {
      const bx = [], R = f.R;
      for (let i = 0; i < 4; i++) {
        const a = Math.PI / 4 + i * Math.PI / 2;
        bx.push(arcbar(f.cx, f.cy, R * .74, a, R * .46, WALL_T, { rad: 12 }));
      }
      bx.push(abox(f.cx, f.cy - R * .93, CHOKE_OPEN, WALL_T, {}));
      bx.push(abox(f.cx, f.cy + R * .93, CHOKE_OPEN, WALL_T, {}));
      return { name: "shards", boxes: bx, gates: [
        { x: f.cx + Math.cos(0) * R * .74, y: f.cy },
        { x: f.cx, y: f.cy - R * .74 },
      ] };
    },
  ],

  /* ---- EMBERWAKE: a round forge floor. Radial, industrial, hot. ------- */
  emberwake: [
    /* 1 · The Long Noon — three vent stacks on 120°, so the floor is three
       sectors. Two ways between them: through the hub the corona sweeps, or
       a tight lane around the rim. That is the decision. */
    function (f) {
      const bx = [], gates = [];
      for (let i = 0; i < 3; i++) {
        const a = -Math.PI / 2 + i * TAU / 3;
        const rIn = f.R * .30, rOut = f.R * .72, mid = (rIn + rOut) / 2;
        bx.push(abox(f.cx + Math.cos(a) * mid, f.cy + Math.sin(a) * mid, rOut - rIn, WALL_T_HEAVY, { a, rad: 11 }));
        gates.push({ x: f.cx + Math.cos(a) * (f.R * .88), y: f.cy + Math.sin(a) * (f.R * .88) });
      }
      return { name: "stacks", boxes: bx, gates };
    },
    /* 2 · Vent Row — a corridor straight across the middle with its two
       mouths staggered, so running the row is committing to it. */
    function (f) {
      const gap = CHOKE_OPEN, len = f.R * 1.30, t = WALL_T_HEAVY;
      return { name: "row", boxes: [
        abox(f.cx, f.cy - gap / 2, len, t, {}),
        abox(f.cx, f.cy + gap / 2, len, t, {}),
        /* the staggered caps: each mouth is half shut, from opposite sides */
        abox(f.cx - len / 2, f.cy - gap * .18, t, gap * .64, {}),
        abox(f.cx + len / 2, f.cy + gap * .18, t, gap * .64, {}),
        /* and one slab out in the open floor either side of the row */
        abox(f.cx - f.R * .40, f.cy - f.R * .44, 128, WALL_T, { a: .5 }),
        abox(f.cx + f.R * .40, f.cy + f.R * .44, 128, WALL_T, { a: .5 }),
      ], gates: [
        { x: f.cx - len / 2, y: f.cy + gap * .3 },
        { x: f.cx + len / 2, y: f.cy - gap * .3 },
      ] };
    },
    /* 3 · Closest Approach — BOSS. Four tangent satellites and two rim
       arcs; the engine keeps the middle. */
    function (f) {
      const bx = [];
      for (let i = 0; i < 4; i++) {
        const a = Math.PI / 4 + i * Math.PI / 2;
        bx.push(arcbar(f.cx, f.cy, f.R * .58, a, f.R * .50, WALL_T_HEAVY, { rad: 13 }));
      }
      bx.push(arcbar(f.cx, f.cy, f.R * .74, 0, f.R * .60, WALL_T, {}));
      bx.push(arcbar(f.cx, f.cy, f.R * .74, Math.PI, f.R * .60, WALL_T, {}));
      return { name: "satellites", boxes: bx, gates: [
        { x: f.cx, y: f.cy - f.R * .58 }, { x: f.cx, y: f.cy + f.R * .58 },
      ] };
    },
  ],

  /* ---- NULLTIDE: submerged structure. Horizontal, layered, heavy. ----- */
  nulltide: [
    /* 1 · The Shelf — three staggered breakwaters. No straight line exists
       from one end of the room to the other. */
    function (f) {
      const w = f.x1 - f.x0, h = f.y1 - f.y0, t = WALL_T_HEAVY;
      const y1 = f.y0 + h * .30, y2 = f.cy, y3 = f.y0 + h * .70;
      return { name: "breakwaters", boxes: [
        hbar(y1, f.x0, f.x0 + w * .62, t),
        hbar(y2, f.x1 - w * .62, f.x1, t),
        hbar(y3, f.x0, f.x0 + w * .62, t),
      ], gates: [
        { x: f.x0 + w * .80, y: y1 }, { x: f.x0 + w * .20, y: y2 }, { x: f.x0 + w * .80, y: y3 },
      ] };
    },
    /* 2 · Pressure Deck — a pillar field. Cover everywhere and none of it
       complete: every pillar leaves slivers of sightline past it. */
    function (f) {
      const bx = [], w = f.x1 - f.x0, h = f.y1 - f.y0, s = 62;
      for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) {
        bx.push(abox(f.x0 + w * (.26 + c * .24), f.y0 + h * (.32 + r * .36), s, s, { rad: 14 }));
      }
      /* one long wall down the near side, so the field has a back to it.
         Held clear of TIDE_INSET_MAX: it runs parallel to the rim that
         closes, and a wall the rim can shut onto is a wall you get stuck in. */
      bx.push(vbar(f.x0 + Math.max(w * .085, TIDE_INSET_MAX + 58),
        f.y0 + h * .18, f.y1 - h * .18, WALL_T_HEAVY));
      return { name: "pillars", boxes: bx, gates: [
        { x: f.x0 + w * .38, y: f.cy }, { x: f.x0 + w * .62, y: f.cy },
      ] };
    },
    /* 3 · The Stacks — BOSS. Four shelves with aisles between them, capped
       at alternating ends, all of it clear of the middle third. */
    function (f) {
      const bx = [], w = f.x1 - f.x0, h = f.y1 - f.y0, t = WALL_T;
      const xs = [.13, .26, .74, .87];
      xs.forEach(function (fx, i) {
        const x = f.x0 + w * fx;
        const capTop = i % 2 === 0;
        bx.push(vbar(x, capTop ? f.y0 + h * .06 : f.y0 + h * .30, capTop ? f.y0 + h * .70 : f.y1 - h * .06, t));
      });
      return { name: "shelves", boxes: bx, gates: [
        { x: f.x0 + w * .195, y: f.y1 - h * .12 }, { x: f.x0 + w * .805, y: f.y0 + h * .12 },
      ] };
    },
  ],

  /* ---- TERMINUS: the clock. Everything reads off the centre. ---------- */
  terminus: [
    /* 1 · The Repeat — the spindle, with four quadrant walls that stop
       short of the rim. Four gates, all of them the same distance from the
       middle, which is where the hands are. */
    function (f) {
      const bx = [], gates = [];
      bx.push(abox(f.cx, f.cy, f.R * .19, f.R * .19, { rad: 30 }));
      for (let i = 0; i < 4; i++) {
        const a = Math.PI / 4 + i * Math.PI / 2;
        const rIn = f.R * .26, rOut = f.R * .74, mid = (rIn + rOut) / 2;
        bx.push(abox(f.cx + Math.cos(a) * mid, f.cy + Math.sin(a) * mid, rOut - rIn, WALL_T, { a, rad: 10 }));
        gates.push({ x: f.cx + Math.cos(a) * (f.R * .87), y: f.cy + Math.sin(a) * (f.R * .87) });
      }
      return { name: "spindle", boxes: bx, gates };
    },
    /* 2 · Last Draft — the dial itself: twelve hour blocks around the rim,
       and two long rests crossing near the middle at an angle to each
       other. Reads as a face, plays as a maze of short sightlines. */
    function (f) {
      const bx = [];
      for (let i = 0; i < 12; i++) {
        const a = -Math.PI / 2 + (i / 12) * TAU;
        const big = i % 3 === 0;
        bx.push(arcbar(f.cx, f.cy, f.R * .78, a, big ? 104 : 60, big ? WALL_T_HEAVY : WALL_T, { rad: 10 }));
      }
      bx.push(abox(f.cx - f.R * .22, f.cy - f.R * .10, f.R * .84, WALL_T, { a: -.42 }));
      bx.push(abox(f.cx + f.R * .22, f.cy + f.R * .10, f.R * .84, WALL_T, { a: -.42 }));
      return { name: "dial", boxes: bx, gates: [
        { x: f.cx, y: f.cy }, { x: f.cx - f.R * .55, y: f.cy + f.R * .42 },
      ] };
    },
    /* 3 · One Second Behind — BOSS. A triangle of long walls standing off
       the centre, three corner gaps, nothing in the middle. */
    function (f) {
      const bx = [], gates = [];
      for (let i = 0; i < 3; i++) {
        const a = -Math.PI / 2 + i * TAU / 3;
        bx.push(arcbar(f.cx, f.cy, f.R * .60, a, f.R * .88, WALL_T_HEAVY, { rad: 12 }));
        const g = a + TAU / 6;
        gates.push({ x: f.cx + Math.cos(g) * f.R * .74, y: f.cy + Math.sin(g) * f.R * .74 });
      }
      return { name: "triangle", boxes: bx, gates };
    },
  ],
};

/* ---- drawing the room ------------------------------------------------
   The floor line goes down in paint() (under everything) and the wall
   bodies go down in walls(), which the render pass calls AFTER the enemies
   and before the player — so a body behind cover is actually hidden by it,
   which is the only way a player reads a wall as cover rather than as
   floor paint. */
function paintArenaFloorEdge(col, a) {
  const nom = arenaNominal();
  ctx.save();
  ctx.strokeStyle = "rgba(" + col + "," + (a || .3) + ")";
  ctx.lineWidth = 2;
  if (nom.disc) { ctx.beginPath(); ctx.arc(nom.cx, nom.cy, nom.R, 0, TAU); ctx.stroke(); }
  else ctx.strokeRect(nom.x0, nom.y0, nom.x1 - nom.x0, nom.y1 - nom.y0);
  ctx.restore();
}
/* the footprint: a dark plate under each wall, drawn with the floor so the
   wall above it reads as standing on something */
function paintArenaFootprints(col) {
  ctx.save();
  for (const b of arenaBoxes()) {
    ctx.save();
    ctx.translate(b.cx, b.cy); ctx.rotate(b.a);
    ctx.fillStyle = "rgba(0,0,0,.30)";
    rrect(-b.w / 2 - 3, -b.h / 2 + 4, b.w + 6, b.h + 6, Math.min(b.rad, b.h / 2)); ctx.fill();
    ctx.fillStyle = "rgba(" + col + ",.05)";
    rrect(-b.w / 2 - 12, -b.h / 2 - 12, b.w + 24, b.h + 24, Math.min(b.rad + 8, b.h)); ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}
/* the wall bodies. `col` is the branch accent; `face` biases the top edge
   highlight so every wall in a room catches light from the same side. */
function drawArenaWalls(col, opaque) {
  const bx = arenaBoxes();
  if (!bx.length) return;
  ctx.save();
  for (const b of bx) {
    ctx.save();
    ctx.translate(b.cx, b.cy); ctx.rotate(b.a);
    const hw = b.w / 2, hh = b.h / 2, rad = Math.min(b.rad, hw, hh);
    const g = ctx.createLinearGradient(0, -hh, 0, hh);
    g.addColorStop(0, "rgba(" + col + "," + (opaque ? .46 : .3) + ")");
    g.addColorStop(.45, "rgba(0,0,0," + (opaque ? .80 : .62) + ")");
    g.addColorStop(1, "rgba(0,0,0," + (opaque ? .92 : .74) + ")");
    ctx.fillStyle = g;
    rrect(-hw, -hh, b.w, b.h, rad); ctx.fill();
    ctx.strokeStyle = "rgba(" + col + ",.75)"; ctx.lineWidth = 1.6;
    rrect(-hw, -hh, b.w, b.h, rad); ctx.stroke();
    /* the lit top edge, so the wall has a height to it */
    ctx.strokeStyle = "rgba(255,255,255,.20)"; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(-hw + rad, -hh + 1.2); ctx.lineTo(hw - rad, -hh + 1.2); ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}

/* ---- the branch field table ---- */
const BRANCH = {
  glassfall: {
    field(dt) {
      const p = G.player;
      /* the floor, first: it is the branch's headline now */
      glassField(dt);
      /* discs bloom on their own schedule */
      G.stasisT = (G.stasisT || 4) - dt;
      if (G.stasisT <= 0) {
        G.stasisT = rnd(9, 5);
        addStasis(rnd(W - 160, 160), rnd(H - 160, 160), rnd(150, 100), rnd(11, 7));
      }
      for (let i = G.stasis.length - 1; i >= 0; i--) {
        const s = G.stasis[i]; s.life -= dt; s.born += dt;
        if (s.life <= 0) G.stasis.splice(i, 1);
      }
      for (let i = G.chill.length - 1; i >= 0; i--) {
        const c = G.chill[i]; c.life -= dt;
        if (c.life <= 0) G.chill.splice(i, 1);
      }
      /* the player is slowed inside a disc, and by rime trails */
      if (stasisAt(p.x, p.y)) { p.vx *= Math.pow(.02, dt); p.vy *= Math.pow(.02, dt); }
      else if (chillAt(p.x, p.y)) { p.vx *= Math.pow(.2, dt); p.vy *= Math.pow(.2, dt); }
      /* pillars planted by Silica */
      for (let i = G.pillars.length - 1; i >= 0; i--) {
        const pl = G.pillars[i];
        pl.born += dt; pl.fire -= dt;
        if (pl.fire <= 0) {
          pl.fire = 2.6;
          pl.ang += 1.1;
          trace({ x: pl.x, y: pl.y, ang: pl.ang, len: 620, wide: 14, warn: .7, live: .12, fade: .4,
            dmg: 20, col: ecol(EN.silica.col) });
          trace({ x: pl.x, y: pl.y, ang: pl.ang + Math.PI / 2, len: 620, wide: 14, warn: .7, live: .12, fade: .4,
            dmg: 20, col: ecol(EN.silica.col) });
        }
        if (pl.hp <= 0 || pl.born > 22) {
          burst(pl.x, pl.y, 16, ecol(EN.silica.col), 1.2);
          ring(pl.x, pl.y, ecol(EN.silica.col), 6, 70, .4, 2.4);
          G.pillars.splice(i, 1);
        }
      }
    },
    slowAt(x, y) { return stasisAt(x, y) ? .34 : chillAt(x, y) ? .62 : 1; },
    dmgAt(x, y) { return stasisAt(x, y) ? 2 : 1; },
    /* the room, then the glass standing in it, then the glass that has
       stopped being under you. Order matters: the shell can push you onto a
       missing pane, so the panes get the last word. */
    bounds(p, pad) {
      /* three constraints that can each undo another: the room's edge, the
         glass standing in it, and the panes that have stopped being under
         you. Running the sequence twice settles all three — the alternative
         is picking which one wins, and each choice leaves a way to end up
         either inside a wall or standing on nothing. */
      const nom = arenaNominal();
      for (let i = 0; i < 2; i++) {
        boundToRect(p, nom);
        boundToSolids(p);
        glassBound(p);
      }
      /* safe to finish on the room's edge because the outer ring of panes
         never drops (see glassBuild), so this can't push you onto a hole */
      boundToRect(p, nom);
    },
    spawnEdge(side) { return arenaSpawn(side); },
    onKill(e) {
      if (!stasisAt(e.x, e.y)) return;
      /* things that die inside a disc shatter into their neighbours */
      const col = ecol(EN[e.type].col);
      ring(e.x, e.y, col, e.r, e.r * 7, .45, 3);
      burst(e.x, e.y, 26, col, 1.6, { sq: 1, spin: rnd(-9, 9) });
      for (const o of G.enemies) {
        if (o === e || o.dead) continue;
        if (dist(o, e) < 150) damageEnemy(o, 46, { noCrit: true });
      }
      Audio_.shatter();
    },
    paint() {
      const fc = ecol(EN.facet.col);
      glassPaint();
      paintArenaFloorEdge(fc, .34);
      paintArenaFootprints(fc);
      for (const c of G.chill) {
        const a = clamp(c.life / c.max, 0, 1);
        ctx.globalAlpha = a * .16;
        ctx.fillStyle = "rgb(" + ecol(EN.rime.col) + ")";
        ctx.beginPath(); ctx.arc(c.x, c.y, c.r, 0, TAU); ctx.fill();
      }
      ctx.globalAlpha = 1;
      for (const s of G.stasis) {
        const a = clamp(s.life / 1.4, 0, 1) * clamp(s.born / .5, 0, 1);
        const g = ctx.createRadialGradient(s.x, s.y, s.r * .2, s.x, s.y, s.r);
        g.addColorStop(0, "rgba(" + fc + ",0)");
        g.addColorStop(.72, "rgba(" + fc + "," + (.09 * a) + ")");
        g.addColorStop(1, "rgba(" + fc + "," + (.2 * a) + ")");
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, TAU); ctx.fill();
        ctx.strokeStyle = "rgba(" + fc + "," + (.5 * a) + ")";
        ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, TAU); ctx.stroke();
        /* frozen hex lattice inside */
        ctx.strokeStyle = "rgba(255,255,255," + (.1 * a) + ")"; ctx.lineWidth = 1;
        for (let i = 0; i < 6; i++) {
          const ang = (i / 6) * TAU + s.born * .1;
          ctx.beginPath();
          ctx.moveTo(s.x, s.y);
          ctx.lineTo(s.x + Math.cos(ang) * s.r, s.y + Math.sin(ang) * s.r);
          ctx.stroke();
        }
      }
      /* Silica pillars */
      for (const pl of G.pillars) {
        const c = ecol(EN.silica.col);
        ctx.save(); ctx.translate(pl.x, pl.y); ctx.rotate(pl.born * .5);
        ctx.fillStyle = "rgba(" + c + ",.75)";
        polyPath(pl.r, 6, 0); ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,.7)"; ctx.lineWidth = 1.6;
        polyPath(pl.r, 6, 0); ctx.stroke();
        ctx.fillStyle = "rgba(255,255,255," + (.4 + Math.sin(G.time * 6) * .25) + ")";
        ctx.beginPath(); ctx.arc(0, 0, pl.r * .3, 0, TAU); ctx.fill();
        ctx.restore();
        ctx.strokeStyle = "rgba(" + c + ",.3)"; ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(pl.x, pl.y, pl.r + 6 + Math.sin(G.time * 3) * 3, 0, TAU);
        ctx.stroke();
      }
    },
    walls() { drawArenaWalls(ecol(EN.facet.col), 1); },
    over() {
      /* floor integrity, so the shrinking room is a number as well as a
         feeling — and so the next crack is never a surprise */
      const gl = G.glass;
      if (!gl) return;
      const left = 1 - glassGoneFrac();
      const col = ecol(EN.facet.col);
      ctx.save();
      ctx.translate(W / 2, H - 22);
      ctx.fillStyle = "rgba(0,0,0,.3)";
      rrect(-62, -4, 124, 7, 3.5); ctx.fill();
      ctx.fillStyle = left < .62 ? "rgb(255,140,120)" : "rgb(" + col + ")";
      rrect(-61, -3, 122 * clamp(left, 0, 1), 5, 2.5); ctx.fill();
      ctx.font = "600 9px " + MONO; ctx.textAlign = "center";
      ctx.fillStyle = "rgba(" + TH.ink + ",.5)";
      ctx.fillText("FLOOR", 0, 16);
      ctx.textAlign = "left";
      ctx.restore();
    },
  },

  emberwake: {
    field(dt) {
      const p = G.player;
      /* heat decays slowly on its own; the dash vents it */
      G.heat = clamp(G.heat - dt * .28, 0, 1.2);
      if (G.jam > 0) { G.jam -= dt; if (G.jam <= 0) { G.heat = 0; Audio_.vent(); } }
      /* the room breathing, and the floor spitting */
      heatwaveField(dt);
      spurtField(dt);
      spurtTick(dt);
      /* corona sweep — a slow wedge out of the room centre */
      G.coronaAng += dt * .42;
      const cx = W / 2, cy = H / 2;
      const a = Math.atan2(p.y - cy, p.x - cx);
      let d = Math.abs(angDiff(a, G.coronaAng));
      /* the sweep is light, so a wall between you and the middle stops it —
         the vent stacks are the only shade in the branch */
      if (d < .2 && !arenaBlocked(cx, cy, p.x, p.y)) {
        hurtPlayer(20 * dt, null);
        G.heat = clamp(G.heat + dt * .5, 0, 1.2);
      }
      /* the sweep also lights enemies it crosses, which is usually useful */
      for (const e of G.enemies) {
        if (e.dead || e.type === "perihelion") continue;
        const ea = Math.atan2(e.y - cy, e.x - cx);
        if (Math.abs(angDiff(ea, G.coronaAng)) < .16 && !arenaBlocked(cx, cy, e.x, e.y))
          damageEnemy(e, 26 * dt, { spark: chance(.06) });
      }
      if (G.safeWedge) {
        G.safeWedge.life -= dt;
        if (G.safeWedge.life <= 0) G.safeWedge = null;
      }
    },
    bounds(p, pad) {
      /* the rim and the vent stacks can each undo the other, so both get two
         passes. WALL_MAX_R guarantees this settles rather than oscillates. */
      /* three passes, not two: when the rim projects you back inward it does
         so radially, which is a jump rather than a step, and a jump wants
         one more chance to be re-checked against the stacks it crossed. */
      const f = emberFloor(pad);
      for (let i = 0; i < 3; i++) { boundToCircle(p, f.cx, f.cy, f.R); boundToSolids(p); }
      boundToCircle(p, f.cx, f.cy, f.R);
    },
    spawnEdge(side) { return arenaSpawn(side); },
    paint() {
      /* the forge floor: a round arena under the corona, tighter the hotter
         you run and swelling with the breath. Everything past the ring is
         dead space — tinted dark rather than clipped, since enemies still
         cross it freely on their way in. */
      const fl = emberFloor(26);
      const dark = ctx.createRadialGradient(fl.cx, fl.cy, fl.R * .85, fl.cx, fl.cy, Math.max(W, H) * .75);
      dark.addColorStop(0, "rgba(20,8,4,0)");
      dark.addColorStop(1, "rgba(20,8,4,.55)");
      ctx.fillStyle = dark;
      ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = "rgba(255,200,130,.35)"; ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.arc(fl.cx, fl.cy, fl.R, 0, TAU); ctx.stroke();
      ctx.strokeStyle = "rgba(255,150,70,.15)"; ctx.lineWidth = 14;
      ctx.beginPath(); ctx.arc(fl.cx, fl.cy, fl.R + 7, 0, TAU); ctx.stroke();
      /* the breath: a telegraph ring while it winds up, then bands running
         the way the push is going, so the direction is never ambiguous */
      const hw = G.hw;
      if (hw && hw.ph > 0) {
        const out = hw.ph === 2, inward = hw.ph === 4;
        if (hw.ph === 1) {
          const f = 1 - hw.t / HEATWAVE_WARN;
          ctx.strokeStyle = "rgba(255,190,110," + (.2 + f * .5) + ")";
          ctx.lineWidth = 2 + f * 4;
          ctx.setLineDash([16, 13]); ctx.lineDashOffset = -G.time * 60;
          ctx.beginPath(); ctx.arc(fl.cx, fl.cy, fl.R * (.3 + f * .62), 0, TAU); ctx.stroke();
          ctx.setLineDash([]);
        } else if (out || inward) {
          const e = out ? 1 - hw.t / HEATWAVE_OUT : 1 - hw.t / HEATWAVE_IN;
          const env = Math.sin(Math.PI * e);
          for (let k = 0; k < 5; k++) {
            const base = out ? (e + k * .2) % 1 : 1 - ((e + k * .2) % 1);
            const rr = fl.R * (.14 + base * .92);
            ctx.strokeStyle = "rgba(" + (out ? "255,178,96" : "255,120,84") + "," + (env * .30 * (1 - base * .5)) + ")";
            ctx.lineWidth = 3 + env * 5;
            ctx.beginPath(); ctx.arc(fl.cx, fl.cy, rr, 0, TAU); ctx.stroke();
          }
        }
      }
      paintArenaFootprints("255,176,84");
      /* corona sweep wedge */
      const cx = W / 2, cy = H / 2, R = Math.max(W, H) * 1.2;
      const g = ctx.createRadialGradient(cx, cy, 20, cx, cy, R);
      g.addColorStop(0, "rgba(255,220,150,.22)");
      g.addColorStop(1, "rgba(255,150,60,.05)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, R, G.coronaAng - .2, G.coronaAng + .2);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = "rgba(255,240,200,.5)"; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(G.coronaAng) * R, cy + Math.sin(G.coronaAng) * R);
      ctx.stroke();
      if (G.safeWedge) {
        const s = G.safeWedge, a = clamp(s.life / s.max, 0, 1);
        ctx.fillStyle = "rgba(120,220,255," + (.14 * a) + ")";
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.arc(s.x, s.y, R, s.ang - s.arc / 2, s.ang + s.arc / 2);
        ctx.closePath(); ctx.fill();
      }
      /* the filament wires */
      for (const e of G.enemies) {
        if (e.type !== "filament" || !e.mate || e.mate.dead || e.x > e.mate.x) continue;
        const c = ecol(EN.filament.col);
        ctx.strokeStyle = "rgba(" + c + ",.85)";
        ctx.lineWidth = 2.4 + Math.sin(G.time * 12) * .8;
        ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(e.mate.x, e.mate.y); ctx.stroke();
        ctx.strokeStyle = "rgba(255,250,220,.5)"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(e.mate.x, e.mate.y); ctx.stroke();
      }
    },
    walls() { drawArenaWalls("255,176,84", 1); spurtPaint(); },
    over() {
      /* the heat gauge, drawn in world space under the player */
      const p = G.player;
      if (!p || G.heat < .04) return;
      const h = clamp(G.heat, 0, 1);
      ctx.save();
      ctx.translate(p.x, p.y + 34);
      ctx.fillStyle = "rgba(0,0,0,.35)";
      rrect(-26, -3, 52, 6, 3); ctx.fill();
      ctx.fillStyle = G.jam > 0 ? "rgb(255,80,60)" : "rgb(" + shade("255,180,90", 1, h * .5, [255, 90, 60]) + ")";
      rrect(-25, -2, 50 * h, 4, 2); ctx.fill();
      if (G.jam > 0) {
        ctx.fillStyle = "rgba(255,110,80,.95)";
        ctx.font = "700 11px " + MONO; ctx.textAlign = "center";
        ctx.fillText("VENTING", 0, 18);
        ctx.textAlign = "left";
      }
      ctx.restore();
    },
  },

  nulltide: {
    field(dt) {
      const p = G.player;
      /* the current: a slow rotating push on everything loose */
      G.current += dt * .12;
      const cx = Math.cos(G.current) * 42, cy = Math.sin(G.current) * 42;
      p.vx += cx * dt; p.vy += cy * dt;
      for (const e of G.enemies) { if (e.type !== TL.boss) { e.x += cx * dt * .5; e.y += cy * dt * .5; } }
      for (const h of G.hostiles) { h.vx += cx * dt * .7; h.vy += cy * dt * .7; }
      for (const ch of G.charges) { ch.x += cx * dt * 1.3; ch.y += cy * dt * 1.3; }
      /* the wake: your own path, which the tide respects */
      G.wakeT = (G.wakeT || 0) - dt;
      if (G.wakeT <= 0) {
        G.wakeT = .07;
        G.wake.unshift({ x: p.x, y: p.y, age: 0 });
        if (G.wake.length > 70) G.wake.pop();
      }
      for (const w of G.wake) w.age += dt;
      /* position snapshots for the rewind */
      G.snapT -= dt;
      if (G.snapT <= 0) {
        G.snapT = .2;
        const rec = {};
        for (const e of G.enemies) { if (!e.id) e.id = "e" + (G.eid = (G.eid || 0) + 1); rec[e.id] = { x: e.x, y: e.y }; }
        G.snap.push({ e: rec });
        if (G.snap.length > 10) G.snap.shift();
      }
      /* the tide itself */
      G.tideT -= dt;
      if (G.tideT <= 1.2 && G.tideWarn === 0) { G.tideWarn = 1; Audio_.tideWarn(); banner("Undertow", "the tide is turning"); }
      if (G.tideT <= 0) { G.tideT = 15; G.tideWarn = 0; tideRewind(false); }
      /* depth charges */
      for (let i = G.charges.length - 1; i >= 0; i--) {
        const ch = G.charges[i];
        ch.t += dt;
        if (ch.t >= ch.fuse) {
          explode(ch.x, ch.y, ch.r, ch.dmg, ecol(EN.sounding.col));
          G.charges.splice(i, 1);
        }
      }
    },
    bounds(p, pad) {
      const r = nulltideFloor(pad);
      for (let i = 0; i < 2; i++) { boundToRect(p, r); boundToSolids(p); }
      boundToRect(p, r);
    },
    spawnEdge(side) { return arenaSpawn(side); },
    walls() { drawArenaWalls(ecol(EN.trench.col), 1); },
    paint() {
      /* the shoreline: the floor breathes with the tide, and the water
         line that's actually load-bearing is drawn here, waves and all */
      const fl = nulltideFloor(26), fc = ecol(EN.fathom.col);
      paintArenaFootprints(fc);
      if (fl.f > .02) {
        ctx.save();
        ctx.strokeStyle = "rgba(" + fc + "," + (.2 + fl.f * .4) + ")";
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let x = fl.x0; x <= fl.x1; x += 24) {
          const yy = fl.y0 + Math.sin(x * .04 + G.time * 2.2) * (3 + fl.f * 5);
          x === fl.x0 ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy);
        }
        ctx.stroke();
        ctx.beginPath();
        for (let x = fl.x0; x <= fl.x1; x += 24) {
          const yy = fl.y1 + Math.sin(x * .04 - G.time * 2.2 + 2) * (3 + fl.f * 5);
          x === fl.x0 ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy);
        }
        ctx.stroke();
        ctx.fillStyle = "rgba(" + fc + "," + (.03 + fl.f * .05) + ")";
        ctx.fillRect(0, 0, W, fl.y0); ctx.fillRect(0, fl.y1, W, H - fl.y1);
        ctx.fillRect(0, 0, fl.x0, H); ctx.fillRect(fl.x1, 0, W - fl.x1, H);
        ctx.restore();
      }
      /* caustics on the floor */
      ctx.save();
      ctx.globalAlpha = .06;
      ctx.strokeStyle = "rgb(" + ecol(EN.fathom.col) + ")";
      ctx.lineWidth = 2;
      for (let i = 0; i < 9; i++) {
        const y = ((i * 97 + G.time * 22) % (H + 120)) - 60;
        ctx.beginPath();
        for (let x = 0; x <= W; x += 40) {
          const yy = y + Math.sin(x * .012 + G.time * .8 + i) * 22;
          x ? ctx.lineTo(x, yy) : ctx.moveTo(x, yy);
        }
        ctx.stroke();
      }
      ctx.restore();
      /* the wake */
      const c = ecol(EN.fathom.col);
      ctx.lineCap = "round";
      for (let i = 1; i < G.wake.length; i++) {
        const a = G.wake[i], b = G.wake[i - 1];
        const solid = a.age > 1.4 ? 1 : 0;
        ctx.strokeStyle = "rgba(" + c + "," + ((solid ? .35 : .12) * (1 - i / G.wake.length)) + ")";
        ctx.lineWidth = solid ? 7 : 4;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      }
      /* tide warning wash */
      if (G.tideWarn) {
        const f = clamp(1 - G.tideT / 1.2, 0, 1);
        ctx.fillStyle = "rgba(" + c + "," + (.05 + f * .07) + ")";
        ctx.fillRect(0, 0, W, H);
      }
      /* depth charges, each carrying its own blast ring so you can read it drift */
      for (const ch of G.charges) {
        const f = clamp(ch.t / ch.fuse, 0, 1);
        ctx.save(); ctx.translate(ch.x, ch.y);
        /* the blast radius: an outline that fills only in the last third */
        ctx.strokeStyle = "rgba(" + c + "," + (.16 + f * .3) + ")";
        ctx.lineWidth = 1.4;
        ctx.setLineDash([7, 6]);
        ctx.lineDashOffset = -G.time * 22;
        ctx.beginPath(); ctx.arc(0, 0, ch.r, 0, TAU); ctx.stroke();
        ctx.setLineDash([]);
        if (f > .66) {
          ctx.fillStyle = "rgba(" + c + "," + ((f - .66) / .34 * .13) + ")";
          ctx.beginPath(); ctx.arc(0, 0, ch.r, 0, TAU); ctx.fill();
        }
        /* the sweep hand, so the fuse is readable at a glance */
        ctx.strokeStyle = "rgba(255,255,255,.5)"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(f * TAU - Math.PI / 2) * ch.r * .8, Math.sin(f * TAU - Math.PI / 2) * ch.r * .8);
        ctx.stroke();
        ctx.fillStyle = "rgb(" + ecol(EN.sounding.col) + ")";
        ctx.beginPath(); ctx.arc(0, 0, 7, 0, TAU); ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255," + (.35 + Math.sin(f * 34) * .35) + ")";
        ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.arc(0, 0, 11, 0, TAU); ctx.stroke();
        ctx.restore();
      }
    },
    over() {
      /* the tide clock, small, bottom centre in world space */
      const f = clamp(G.tideT / 15, 0, 1);
      ctx.save();
      ctx.translate(W / 2, H - 26);
      ctx.strokeStyle = "rgba(" + ecol(EN.fathom.col) + ",.25)"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-70, 0); ctx.lineTo(70, 0); ctx.stroke();
      ctx.strokeStyle = "rgba(" + ecol(EN.fathom.col) + "," + (G.tideWarn ? .95 : .6) + ")";
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-70, 0); ctx.lineTo(-70 + 140 * (1 - f), 0); ctx.stroke();
      ctx.restore();
    },
  },

  terminus: {
    field(dt) {
      const p = G.player;
      /* the clock the arena is, and the thing it keeps a copy of */
      terminusClock(dt);
      behindField(dt);
      /* the entropy clock drains faster with every toll — the escalation is
         not only new hazards, it is less time to deal with them in */
      G.entropy -= dt * (1 + termTier() * TERM_DRAIN_PER_TIER);
      if (G.entropy <= 0) {
        G.entropy = 0;
        G.drain += dt;
        hurtPlayer(7 * dt * (1 + termTier() * TERM_DRAIN_PER_TIER), null);
        if (G.drain > 1) { G.drain = 0; shake(.1); Audio_.entropyTick(); }
      }
      /* Epilogue lines glow while they are being written */
      /* Null swallows nearby player bullets — resolved in the bullet pass */
      /* OMEGA decoys */
      for (let i = G.omegaEchoes.length - 1; i >= 0; i--) {
        const c = G.omegaEchoes[i];
        c.life -= dt;
        c.fire -= dt;
        const a = Math.atan2(p.y - c.y, p.x - c.x);
        c.ang = lerp(c.ang, a, 1 - Math.exp(-4 * dt));
        if (c.fire <= 0) {
          c.fire = .6;
          const h = enemyShoot({ x: c.x, y: c.y, type: "omega" }, a, 560, 11, 4);
          h.col = ecol(EN.omega.col);
        }
        if (c.life <= 0) { burst(c.x, c.y, 14, ecol(EN.omega.col), 1); G.omegaEchoes.splice(i, 1); }
      }
    },
    bounds(p, pad) {
      const f = terminusFloor(pad);
      for (let i = 0; i < 3; i++) { boundToCircle(p, f.cx, f.cy, f.R); boundToSolids(p); }
      boundToCircle(p, f.cx, f.cy, f.R);
    },
    spawnEdge(side) { return arenaSpawn(side); },
    walls() { drawArenaWalls(ecol(EN.coda.col), 1); behindPaint(); },
    paint() {
      /* long shadows: everything in Terminus casts one, toward the last light */
      const la = Math.PI * .75;
      ctx.save();
      ctx.globalAlpha = .18;
      ctx.fillStyle = "rgba(0,0,0,1)";
      for (const e of G.enemies) {
        ctx.save(); ctx.translate(e.x, e.y);
        ctx.transform(1, 0, Math.cos(la) * 2.4, .28, 0, 0);
        ctx.beginPath(); ctx.arc(0, 0, e.r, 0, TAU); ctx.fill();
        ctx.restore();
      }
      ctx.restore();
      /* the dial, and the hands on it */
      terminusPaintClock();
      paintArenaFootprints(ecol(EN.coda.col));
      /* the entropy horizon: the clock face closing in. This is the wall
         from bounds() above, drawn at the exact same radius so the line you
         see is the line that actually stops you. */
      const fl = terminusFloor(26);
      const cc = ecol(EN.coda.col);
      if (fl.f > .25) {
        const dark = ctx.createRadialGradient(fl.cx, fl.cy, fl.R, fl.cx, fl.cy, Math.max(W, H) * .8);
        dark.addColorStop(0, "rgba(" + cc + ",0)");
        dark.addColorStop(1, "rgba(" + cc + "," + ((fl.f - .25) * .16) + ")");
        ctx.fillStyle = dark; ctx.fillRect(0, 0, W, H);
      }
      ctx.strokeStyle = "rgba(" + cc + "," + (.25 + fl.f * .45) + ")";
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(fl.cx, fl.cy, fl.R, 0, TAU); ctx.stroke();
      /* Omega's decoys */
      for (const c of G.omegaEchoes) {
        const a = clamp(c.life / c.max, 0, 1);
        ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.ang);
        ctx.globalAlpha = a * .6;
        ctx.strokeStyle = "rgb(" + ecol(EN.omega.col) + ")"; ctx.lineWidth = 1.6;
        heroPath(14); ctx.stroke();
        ctx.fillStyle = "rgba(" + ecol(EN.omega.col) + ",.2)";
        heroPath(14); ctx.fill();
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    },
    over() {
      /* colour drains out of the branch as the clock runs down */
      const f = 1 - clamp(G.entropy / G.entropyMax, 0, 1);
      if (f > .3) {
        ctx.save();
        ctx.globalCompositeOperation = "saturation";
        ctx.fillStyle = "rgba(128,128,128," + clamp((f - .3) * 1.1, 0, .8) + ")";
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
      }
      /* the clock itself */
      const secs = Math.max(0, G.entropy);
      ctx.save();
      ctx.translate(W / 2, 44);
      ctx.textAlign = "center";
      ctx.font = "700 24px " + MONO;
      ctx.fillStyle = secs < 10 ? "rgb(255,90,90)" : "rgba(" + ecol(EN.coda.col) + ",.9)";
      ctx.fillText(secs.toFixed(1), 0, 0);
      ctx.font = "600 9px " + MONO;
      ctx.fillStyle = "rgba(" + TH.ink + ",.5)";
      ctx.fillText("ENTROPY", 0, 14);
      /* and the other clock: how long until the room gets worse, and how
         many times it already has */
      const toll = Math.max(0, G.hourT || 0);
      ctx.font = "700 12px " + MONO;
      ctx.fillStyle = toll < 5 ? "rgb(255,150,90)" : "rgba(" + ecol(EN.coda.col) + ",.75)";
      ctx.fillText("TOLL " + ((G.hour || 0) + 1) + " IN " + toll.toFixed(0) + "s", 0, 32);
      ctx.textAlign = "left";
      ctx.restore();
    },
    onKill(e) {
      entropyAdd(2.2 + (EN[e.type] ? EN[e.type].cost * .6 : 0));
      if (e.type === "coda") {
        G.codaKills.push(G.time);
        G.codaKills = G.codaKills.filter((t) => G.time - t < .45);
        if (G.codaKills.length >= 3) { unlockSecret("chorus"); G.codaKills = []; }
      }
    },
  },
};

