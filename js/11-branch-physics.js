/* Branch-specific room physics: Glassfall stasis discs, Nulltide rewind, Terminus entropy, and the BRANCH hook table. */
/* =====================================================================
   BRANCH PHYSICS — what each timeline does to the room itself
   ===================================================================== */

/* ---- shared state, reset on every run ---- */
function resetBranchState() {
  G.stasis = []; G.chill = []; G.pillars = []; G.charges = [];
  G.heat = 0; G.jam = 0; G.coronaAng = 0;
  G.tideT = 0; G.tideWarn = 0; G.wake = []; G.snap = []; G.snapT = 0; G.current = rnd(TAU);
  G.entropy = 60; G.entropyMax = 60; G.drain = 0;
  G.omegaEchoes = []; G.safeWedge = null;
  G.killed = {}; G.shotsThisWave = 0; G.sealT = 0; G.codaKills = [];
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

/* ---- Terminus: entropy ---- */
function entropyAdd(n) {
  G.entropy = clamp(G.entropy + n, 0, G.entropyMax);
}

/* ---- room geometry: a branch can reshape where the player is allowed to
   stand — walls, a round floor, a zone that breathes or closes in with the
   branch's own mechanic. Enemies are not constrained by any of this: only
   your own footing moves, which is what makes the shape something you have
   to actually play around rather than just look at. Falls back to the
   plain rectangle (see updatePlayer) when a branch defines none of it. ---- */
function clampToRect(x, y, r) { return { x: clamp(x, r.x0, r.x1), y: clamp(y, r.y0, r.y1) }; }
function insideRect(x, y, r) { return x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1; }
function nearestInRects(x, y, rects) {
  for (const r of rects) if (insideRect(x, y, r)) return { x, y };
  let best = null, bd = Infinity;
  for (const r of rects) {
    const c = clampToRect(x, y, r);
    const d = Math.hypot(c.x - x, c.y - y);
    if (d < bd) { bd = d; best = c; }
  }
  return best;
}
/* clamps onto the nearest point inside the union of rects, and bounces the
   player's velocity/knockback off whichever wall it hit — same feel as the
   flat rectangle clamp it replaces */
function boundToRects(p, rects) {
  const res = nearestInRects(p.x, p.y, rects);
  const dx = res.x - p.x, dy = res.y - p.y;
  if (dx) { const s = dx > 0 ? 1 : -1; p.vx = s * Math.abs(p.vx) * .3; p.kb.x = s * Math.abs(p.kb.x) * .3; }
  if (dy) { const s = dy > 0 ? 1 : -1; p.vy = s * Math.abs(p.vy) * .3; p.kb.y = s * Math.abs(p.kb.y) * .3; }
  p.x = res.x; p.y = res.y;
}
function boundToCircle(p, cx, cy, R) {
  const dx = p.x - cx, dy = p.y - cy, d = Math.hypot(dx, dy);
  if (d > R && d > 0) {
    const nx = dx / d, ny = dy / d;
    p.x = cx + nx * R; p.y = cy + ny * R;
    const vr = p.vx * nx + p.vy * ny;
    if (vr > 0) { p.vx -= vr * 1.3 * nx; p.vy -= vr * 1.3 * ny; }
    const kr = p.kb.x * nx + p.kb.y * ny;
    if (kr > 0) { p.kb.x -= kr * 1.3 * nx; p.kb.y -= kr * 1.3 * ny; }
  }
}

/* Glassfall — the Cut Hall: two rooms and a corridor between them, computed
   fresh off the current W/H so a resize never leaves you outside it. */
function glassfallRooms(pad) {
  const gap = 130, corHalf = Math.min(150, H * .22);
  const midLo = W / 2 - gap / 2, midHi = W / 2 + gap / 2, cy = H / 2;
  return {
    left: { x0: pad, x1: midLo, y0: pad, y1: H - pad },
    right: { x0: midHi, x1: W - pad, y0: pad, y1: H - pad },
    corridor: { x0: midLo, x1: midHi, y0: cy - corHalf, y1: cy + corHalf },
    midLo, midHi, corHalf, cy, pad,
  };
}
/* Emberwake — a round forge floor under the corona sweep. It tightens as
   your heat climbs, so running hot costs you room as well as ammo. */
function emberwakeFloor(pad) {
  return { cx: W / 2, cy: H / 2, R: Math.max(120, Math.min(W, H) / 2 - pad - (G.heat || 0) * 40) };
}
/* Nulltide — the floor breathes with the tide: it closes in as the
   rewind approaches and opens back up the instant it turns. */
function nulltideFloor(pad) {
  const tideT = G.tideT > 0 ? G.tideT : 15;
  const f = clamp(1 - tideT / 15, 0, 1);
  const inset = pad + f * f * 130;
  return { x0: inset, x1: W - inset, y0: inset, y1: H - inset, f };
}
/* Terminus — the entropy horizon is no longer just a line: it is the wall. */
function terminusFloor(pad) {
  const f = 1 - clamp(G.entropy / G.entropyMax, 0, 1);
  const inset = f > .25 ? (f - .25) * 90 : pad;
  return { x0: inset, x1: W - inset, y0: inset, y1: H - inset, f };
}

/* ---- the branch field table ---- */
const BRANCH = {
  glassfall: {
    field(dt) {
      const p = G.player;
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
    bounds(p, pad) { const g = glassfallRooms(pad); boundToRects(p, [g.left, g.right, g.corridor]); },
    spawnEdge(side) {
      const g = glassfallRooms(52);
      const room = pick([g.left, g.right]);
      const opts = {
        left: { x: g.left.x0, y: rnd(g.left.y1, g.left.y0) },
        right: { x: g.right.x1, y: rnd(g.right.y1, g.right.y0) },
        top: { x: rnd(room.x1, room.x0), y: room.y0 },
        bottom: { x: rnd(room.x1, room.x0), y: room.y1 },
      };
      return opts[side] || pick(Object.values(opts));
    },
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
      /* the frozen walls that split the hall into two rooms and a corridor */
      const g = glassfallRooms(26), fc = ecol(EN.facet.col);
      const bands = [
        { x0: g.midLo, x1: g.midHi, y0: 26, y1: g.corridor.y0 },
        { x0: g.midLo, x1: g.midHi, y0: g.corridor.y1, y1: H - 26 },
      ];
      for (const b of bands) {
        const w = b.x1 - b.x0, h = b.y1 - b.y0;
        if (h <= 0) continue;
        const grad = ctx.createLinearGradient(b.x0, 0, b.x1, 0);
        grad.addColorStop(0, "rgba(" + fc + ",.02)");
        grad.addColorStop(.5, "rgba(" + fc + ",.16)");
        grad.addColorStop(1, "rgba(" + fc + ",.02)");
        ctx.fillStyle = grad;
        ctx.fillRect(b.x0, b.y0, w, h);
        ctx.strokeStyle = "rgba(" + fc + ",.4)"; ctx.lineWidth = 1.4;
        ctx.strokeRect(b.x0, b.y0, w, h);
        ctx.strokeStyle = "rgba(255,255,255,.1)"; ctx.lineWidth = 1;
        for (let i = 0; i < 5; i++) {
          const lx = b.x0 + (i + .5) * (w / 5);
          ctx.beginPath(); ctx.moveTo(lx, b.y0); ctx.lineTo(lx + 10, b.y1); ctx.stroke();
        }
      }
      /* the corridor mouth itself, so the opening reads clearly */
      ctx.strokeStyle = "rgba(" + fc + ",.55)"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(g.midLo, g.corridor.y0); ctx.lineTo(g.midLo, g.corridor.y1); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(g.midHi, g.corridor.y0); ctx.lineTo(g.midHi, g.corridor.y1); ctx.stroke();
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
        g.addColorStop(0, "rgba(" + ecol(EN.facet.col) + ",0)");
        g.addColorStop(.72, "rgba(" + ecol(EN.facet.col) + "," + (.09 * a) + ")");
        g.addColorStop(1, "rgba(" + ecol(EN.facet.col) + "," + (.2 * a) + ")");
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, TAU); ctx.fill();
        ctx.strokeStyle = "rgba(" + ecol(EN.facet.col) + "," + (.5 * a) + ")";
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
  },

  emberwake: {
    field(dt) {
      const p = G.player;
      /* heat decays slowly on its own; the dash vents it */
      G.heat = clamp(G.heat - dt * .28, 0, 1.2);
      if (G.jam > 0) { G.jam -= dt; if (G.jam <= 0) { G.heat = 0; Audio_.vent(); } }
      /* corona sweep — a slow wedge out of the room centre */
      G.coronaAng += dt * .42;
      const cx = W / 2, cy = H / 2;
      const a = Math.atan2(p.y - cy, p.x - cx);
      let d = Math.abs(angDiff(a, G.coronaAng));
      if (d < .2) {
        hurtPlayer(20 * dt, null);
        G.heat = clamp(G.heat + dt * .5, 0, 1.2);
      }
      /* the sweep also lights enemies it crosses, which is usually useful */
      for (const e of G.enemies) {
        if (e.dead || e.type === "perihelion") continue;
        const ea = Math.atan2(e.y - cy, e.x - cx);
        if (Math.abs(angDiff(ea, G.coronaAng)) < .16) damageEnemy(e, 26 * dt, { spark: chance(.06) });
      }
      if (G.safeWedge) {
        G.safeWedge.life -= dt;
        if (G.safeWedge.life <= 0) G.safeWedge = null;
      }
    },
    bounds(p, pad) { const f = emberwakeFloor(pad); boundToCircle(p, f.cx, f.cy, f.R); },
    paint() {
      /* the forge floor: a round arena under the corona, tighter the hotter you run.
         Everything past the ring is dead space — tinted dark rather than clipped,
         since enemies still cross it freely on their way in. */
      const fl = emberwakeFloor(26);
      const dark = ctx.createRadialGradient(fl.cx, fl.cy, fl.R * .85, fl.cx, fl.cy, Math.max(W, H) * .75);
      dark.addColorStop(0, "rgba(20,8,4,0)");
      dark.addColorStop(1, "rgba(20,8,4,.55)");
      ctx.fillStyle = dark;
      ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = "rgba(255,200,130,.35)"; ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.arc(fl.cx, fl.cy, fl.R, 0, TAU); ctx.stroke();
      ctx.strokeStyle = "rgba(255,150,70,.15)"; ctx.lineWidth = 14;
      ctx.beginPath(); ctx.arc(fl.cx, fl.cy, fl.R + 7, 0, TAU); ctx.stroke();
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
    bounds(p, pad) { const r = nulltideFloor(pad); boundToRects(p, [r]); },
    paint() {
      /* the shoreline: the floor breathes with the tide, and the water
         line that's actually load-bearing is drawn here, waves and all */
      const fl = nulltideFloor(26), fc = ecol(EN.fathom.col);
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
      G.entropy -= dt;
      if (G.entropy <= 0) {
        G.entropy = 0;
        G.drain += dt;
        hurtPlayer(7 * dt, null);
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
    bounds(p, pad) { const r = terminusFloor(pad); boundToRects(p, [r]); },
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
      /* the entropy horizon: a slowly closing frame of dead space. This is
         the wall from bounds() above, drawn with the exact same inset so
         the line you see is the line that actually stops you. */
      const f = 1 - clamp(G.entropy / G.entropyMax, 0, 1);
      if (f > .25) {
        const inset = (f - .25) * 90;
        ctx.fillStyle = "rgba(" + ecol(EN.coda.col) + "," + ((f - .25) * .1) + ")";
        ctx.fillRect(0, 0, W, inset); ctx.fillRect(0, H - inset, W, inset);
        ctx.fillRect(0, inset, inset, H - inset * 2); ctx.fillRect(W - inset, inset, inset, H - inset * 2);
        ctx.strokeStyle = "rgba(" + ecol(EN.coda.col) + "," + ((f - .25) * .5) + ")";
        ctx.lineWidth = 2;
        ctx.strokeRect(inset, inset, W - inset * 2, H - inset * 2);
      }
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

