/* Enemy AI update loop, boss behaviour, projectile/pickup updates, and the main world/HUD render pass. */
/* ---------------- enemies ------------------------------------------------ */
function targetFor(e) {
  const p = G.player;
  let best = p, bd = dist(e, p);
  const w = .62 - (G.mods ? G.mods.decoyGuard * .13 : 0);
  for (const c of G.echoes) { const d = dist(e, c) * w; if (d < bd) { bd = d; best = c; } }
  return best;
}
function enemyShoot(e, ang, speed, dmg, r) {
  const h = { x: e.x, y: e.y, vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed, r: r || 7,
    dmg, life: 6, col: ecol(EN[e.type].col), spin: 0, split: 0 };
  G.hostiles.push(h);
  return h;
}
function splitOrb(h) {
  const n = h.split;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + rnd(.4);
    G.hostiles.push({ x: h.x, y: h.y, vx: Math.cos(a) * 260, vy: Math.sin(a) * 260,
      r: h.r * .62, dmg: h.dmg * .6, life: 2.4, col: h.col, spin: 0, split: 0 });
  }
  ring(h.x, h.y, h.col, 4, 46, .3, 2);
}
function fireLaser(e, ang) {
  const p = G.player;
  G.lasers.push({ x: e.x, y: e.y, ang, life: .3, max: .3, col: ecol(EN[e.type].col) });
  const dx = p.x - e.x, dy = p.y - e.y;
  const along = dx * Math.cos(ang) + dy * Math.sin(ang);
  const perp = Math.abs(-dx * Math.sin(ang) + dy * Math.cos(ang));
  if (along > 0 && perp < p.r + 9) hurtPlayer(e.dmg);
  for (const o of G.enemies.slice()) {
    if (o === e) continue;
    const ax = o.x - e.x, ay = o.y - e.y;
    const al = ax * Math.cos(ang) + ay * Math.sin(ang);
    const pe = Math.abs(-ax * Math.sin(ang) + ay * Math.cos(ang));
    if (al > 0 && pe < o.r + 6) damageEnemy(o, 18, { noCrit: true });
  }
  Audio_.noiseHit({ freq: 3000, to: 400, dur: .3, gain: .12, q: 1.6 });
  Audio_.tone({ type: "sawtooth", freq: 900, to: 200, dur: .28, gain: .07 });
  shake(.18);
}
function updateEnemies(dt) {
  const p = G.player, m = G.mods;
  const slowAll = p.surgeActive > 0 ? .36 : 1;
  const list = G.enemies.slice();
  for (let i = list.length - 1; i >= 0; i--) {
    const e = list[i];
    if (!e || e.dead) continue;
    e.hit = Math.max(0, e.hit - dt);
    e.pop = Math.max(0, (e.pop || 0) - dt * 4);
    e.deflect = Math.max(0, e.deflect - dt);
    e.born += dt; e.wob += dt * 3;
    e.blinkT -= dt;
    if (e.blinkT <= 0) { e.blinkT = rnd(5, 1.6); e.blink = 0; }
    e.blink = approach(e.blink, 1, 9, dt);
    for (const z of G.zones) if (dist(e, z) < z.r + e.r) damageEnemy(e, z.dps * dt, { spark: chance(.1) });
    if (e.dead) continue;
    const dte = dt * slowAll * (BRANCHFN.slowAt ? BRANCHFN.slowAt(e.x, e.y) : 1);
    const dtr = dte * (e.rateMul || 1);
    const t = targetFor(e);
    const ang = Math.atan2(t.y - e.y, t.x - e.x);
    if (e.type !== "mimic" && e.type !== "mirror") e.ang = lerp(e.ang, ang, 1 - Math.exp(-6 * dte));

    if (TLAI[e.type]) {
      TLAI[e.type](e, dte, dtr, t, ang, p, m, dt);
    } else if (e.type === "dart") {
      e.timer -= dtr;
      if (e.state === 0) {
        e.x += Math.cos(ang) * e.sp * .5 * dte; e.y += Math.sin(ang) * e.sp * .5 * dte;
        if (e.timer <= 0 && dist(e, t) < 440) {
          e.state = 1; e.timer = .55; e.lockAng = ang;
          trace({ x: e.x, y: e.y, ang: e.lockAng, len: 460, wide: 26, warn: .55, live: 0, fade: .3,
            col: ecol(EN.dart.col), follow: e, aim: 1 });
          Audio_.lock(1.25);
        }
      } else if (e.state === 1) {
        e.lockAng = lerp(e.lockAng, ang, 1 - Math.exp(-3 * dte));
        if (e.timer <= 0) {
          e.state = 2; e.timer = .42;
          trace({ x: e.x, y: e.y, ang: e.lockAng, len: 307, wide: 22, warn: .001, live: .1, fade: 1.5,
            dot: 20, owner: "dart", col: ecol(EN.dart.col) });
          Audio_.tone({ type: "sawtooth", freq: 260, to: 520, dur: .18, gain: .045 });
        }
      } else {
        e.x += Math.cos(e.lockAng) * 780 * dte; e.y += Math.sin(e.lockAng) * 780 * dte;
        burst(e.x, e.y, 1, ecol(EN.dart.col), .3, { life: .22, size: 2 });
        if (e.timer <= 0) {
          /* it gets a second lunge before it has to rest */
          if (!e.second) {
            e.second = 1; e.state = 1; e.timer = .3; e.lockAng = ang;
            trace({ x: e.x, y: e.y, ang: e.lockAng, len: 340, wide: 24, warn: .3, live: .08, fade: .3,
              col: ecol(EN.dart.col), follow: e, aim: 1 });
          } else { e.second = 0; e.state = 0; e.timer = rnd(1.1, 1.9); }
        }
      }
    } else if (e.type === "weaver") {
      const d = dist(e, t);
      const want = d < 250 ? -1 : d > 340 ? 1 : 0;
      e.x += (Math.cos(ang) * want + Math.cos(ang + Math.PI / 2) * .6 * Math.sin(e.wob * .5)) * e.sp * dte;
      e.y += (Math.sin(ang) * want + Math.sin(ang + Math.PI / 2) * .6 * Math.sin(e.wob * .5)) * e.sp * dte;
      e.timer -= dtr;
      if (e.state === 0 && e.timer <= 0 && d < 580) {
        e.state = 1; e.timer = .5; e.lockAng = ang;
        for (let k = -1; k <= 1; k++) {
          trace({ x: e.x, y: e.y, ang: ang + k * .17, len: 540, wide: 11, warn: .5, live: .1, fade: .4,
            col: ecol(EN.weaver.col), follow: e, aim: 1, aim0: k * .17 });
        }
        Audio_.lock(.9);
      } else if (e.state === 1 && e.timer <= 0) {
        e.state = 0; e.timer = rnd(1.7, 2.6);
        for (let k = -1; k <= 1; k++) {
          const h = enemyShoot(e, e.lockAng + k * .17, 215, 14, 7);
          if (h) h.split = 4;
        }
        Audio_.tone({ type: "square", freq: 380, to: 240, dur: .15, gain: .045 });
      }
    } else if (e.type === "needle") {
      e.timer -= dtr;
      if (e.state === 0) {
        const d = dist(e, t);
        const want = d < 340 ? -1 : d > 470 ? 1 : 0;
        e.x += Math.cos(ang) * e.sp * want * dte; e.y += Math.sin(ang) * e.sp * want * dte;
        if (e.timer <= 0) {
          e.state = 1; e.timer = .9; e.lockAng = ang;
          trace({ x: e.x, y: e.y, ang: e.lockAng, len: 1600, wide: 17, warn: .9, live: .12, fade: 1.2,
            dot: 9, owner: "needle", col: ecol(EN.needle.col), follow: e, aim: 1 });
          Audio_.tone({ type: "sine", freq: 1400, to: 2200, dur: .8, gain: .03 });
        }
      } else {
        e.lockAng = lerp(e.lockAng, ang, 1 - Math.exp(-1.6 * dte));
        if (e.timer <= 0) {
          fireLaser(e, e.lockAng);
          if (!e.second) { e.second = 1; e.state = 1; e.timer = .42; e.lockAng = ang + rnd(-.5, .5); }
          else { e.second = 0; e.state = 0; e.timer = rnd(2.2, 3.2); }
        }
      }
    } else if (e.type === "colossus") {
      e.timer -= dtr;
      if (e.state === 0) {
        e.x += Math.cos(ang) * e.sp * dte; e.y += Math.sin(ang) * e.sp * dte;
        if (e.timer <= 0 && dist(e, t) < 430) {
          e.state = 1; e.timer = .78; e.lockAng = ang;
          trace({ x: e.x, y: e.y, ang: e.lockAng, len: 430, wide: 52, warn: .78, live: .16, fade: 1.6,
            dmg: 20, dot: 16, owner: "colossus", col: ecol(EN.colossus.col), follow: e, aim: 1 });
          Audio_.lock(.6);
        }
      } else if (e.state === 1) {
        e.lockAng = lerp(e.lockAng, ang, 1 - Math.exp(-1.3 * dte));
        e.ang = e.lockAng;
        e.x -= Math.cos(e.lockAng) * 40 * dte; e.y -= Math.sin(e.lockAng) * 40 * dte;
        if (e.timer <= 0) { e.state = 2; e.timer = .52; shake(.12); }
      } else {
        e.ang = e.lockAng;
        e.x += Math.cos(e.lockAng) * 540 * dte; e.y += Math.sin(e.lockAng) * 540 * dte;
        if (chance(dte * 26)) burst(e.x, e.y, 1, ecol(EN.colossus.col), .4, { life: .4, size: rnd(1.6, 3.6) });
        if (e.timer <= 0) {
          /* it stops by planting both fists — a ring goes out from the impact */
          e.state = 0; e.timer = rnd(2.2, 3.6);
          trace({ kind: "ring", x: e.x, y: e.y, r: 128, wide: 30, warn: .38, live: .16, fade: .5,
            dmg: e.dmg * .8, col: ecol(EN.colossus.col) });
          shake(.3); shock(e.x, e.y, { r0: 20, r1: 150, life: .35, col: ecol(EN.colossus.col), w: 5 });
        }
      }
    } else if (e.type === "husk") {
      /* it walks, then coils and throws itself the last stretch */
      e.timer -= dtr;
      if (e.state === 0) {
        const w2 = Math.sin(e.wob) * .3;
        e.x += Math.cos(ang + w2) * e.sp * dte; e.y += Math.sin(ang + w2) * e.sp * dte;
        if (e.timer <= 0 && dist(e, t) < 250) { e.state = 1; e.timer = .42; e.lockAng = ang; }
        else if (e.timer <= 0) e.timer = .6;
      } else if (e.state === 1) {
        e.lockAng = lerp(e.lockAng, ang, 1 - Math.exp(-4 * dte));
        e.x -= Math.cos(e.lockAng) * 30 * dte; e.y -= Math.sin(e.lockAng) * 30 * dte;
        if (e.timer <= 0) {
          e.state = 2; e.timer = .34;
          burst(e.x, e.y, 6, ecol(EN.husk.col), .8, { life: .3 });
        }
      } else {
        e.x += Math.cos(e.lockAng) * 620 * dte; e.y += Math.sin(e.lockAng) * 620 * dte;
        if (e.timer <= 0) { e.state = 0; e.timer = rnd(1.6, 2.8); shake(.05); }
      }
    } else if (e.type === "warden") {
      /* hooks you, then makes the room smaller than you wanted it */
      e.timer -= dtr;
      const d = dist(e, t);
      const want = d > 320 ? 1 : d < 170 ? -.7 : 0;
      e.x += Math.cos(ang) * e.sp * want * dte; e.y += Math.sin(ang) * e.sp * want * dte;
      if (e.state === 0) {
        if (e.timer <= 0 && d < 460 && t === p) {
          e.state = 1; e.timer = .72; e.lockAng = ang;
          trace({ x: e.x, y: e.y, ang: ang, len: d + 60, wide: 15, warn: .72, live: .12, fade: .4,
            col: ecol(EN.warden.col), follow: e, aim: 1 });
          Audio_.lock(.85);
        }
      } else if (e.state === 1) {
        e.lockAng = lerp(e.lockAng, ang, 1 - Math.exp(-3.4 * dte));
        if (e.timer <= 0) {
          e.state = 2; e.timer = 6.5; e.tether = 1;
          text(p.x, p.y - 42, "hooked", ecol(EN.warden.col), 16);
          shock(p.x, p.y, { r0: 40, r1: 16, life: .3, col: ecol(EN.warden.col), w: 3 });
          Audio_.tone({ type: "sawtooth", freq: 180, to: 90, dur: .4, gain: .06 });
        }
      } else {
        const dd = dist(e, p);
        if (dd > 235) {
          const a2 = Math.atan2(e.y - p.y, e.x - p.x);
          p.vx += Math.cos(a2) * 700 * dt; p.vy += Math.sin(a2) * 700 * dt;
          if (chance(dt * 7)) hurtPlayer(6, e);
          if (chance(dt * 26)) part(lerp(p.x, e.x, rnd(1)), lerp(p.y, e.y, rnd(1)),
            { col: ecol(EN.warden.col), s: 30, life: .3, size: 2 });
        }
        if (e.timer <= 0) { e.state = 0; e.tether = 0; e.timer = rnd(2.2, 3.4); }
      }
    } else if (e.type === "revenant") {
      /* it does not come to you, it arrives where you will be */
      e.timer -= dtr;
      if (e.state === 0) {
        e.x += Math.cos(ang) * e.sp * .3 * dte; e.y += Math.sin(ang) * e.sp * .3 * dte;
        if (e.timer <= 0) {
          const tx = clamp(t.x + (t.vx || 0) * .34, 70, W - 70);
          const ty = clamp(t.y + (t.vy || 0) * .34, 70, H - 70);
          const a = rnd(TAU);
          const ox = e.x, oy = e.y;
          e.x = clamp(tx + Math.cos(a) * 96, 40, W - 40);
          e.y = clamp(ty + Math.sin(a) * 96, 40, H - 40);
          e.ang = Math.atan2(ty - e.y, tx - e.x); e.lockAng = e.ang;
          ring(ox, oy, ecol(EN.revenant.col), 4, 74, .34, 3);
          ring(e.x, e.y, ecol(EN.revenant.col), 66, 8, .3, 3);
          burst(ox, oy, 16, ecol(EN.revenant.col), 1, { life: .4 });
          beam(ox, oy, e.x, e.y, ecol(EN.revenant.col), .3);
          Audio_.tone({ type: "sine", freq: 900, to: 220, dur: .22, gain: .05 });
          e.state = 1; e.timer = .58;
          trace({ x: e.x, y: e.y, ang: e.lockAng, len: 200, wide: 92, warn: .58, live: .16, fade: .6,
            dmg: e.dmg, col: ecol(EN.revenant.col), follow: e, aim: 1 });
        }
      } else {
        if (e.timer <= 0) {
          e.state = 0; e.timer = rnd(1.5, 2.3);
          shock(e.x, e.y, { r0: 20, r1: 190, life: .3, col: ecol(EN.revenant.col), w: 4,
            ang: e.lockAng, arc: 1.5 });
          shake(.12);
        }
      }
    } else if (e.type === "howitzer") {
      e.timer -= dtr;
      const d = dist(e, t);
      const want = d < 400 ? -1 : d > 640 ? 1 : 0;
      e.x += (Math.cos(ang) * want + Math.cos(ang + Math.PI / 2) * .5 * Math.sin(e.wob * .5)) * e.sp * dte;
      e.y += (Math.sin(ang) * want + Math.sin(ang + Math.PI / 2) * .5 * Math.sin(e.wob * .5)) * e.sp * dte;
      if (e.state === 0 && e.timer <= 0) {
        e.state = 1; e.timer = 1.2;
        const lead = .55;
        for (let k = 0; k < 3; k++) {
          const tx = clamp(t.x + (t.vx || 0) * lead + rnd(-90, 90), 50, W - 50);
          const ty = clamp(t.y + (t.vy || 0) * lead + rnd(-90, 90), 50, H - 50);
          trace({ kind: "disc", x: tx, y: ty, r: 72, warn: 1.15 + k * .12, live: .16, fade: 1.3,
            dmg: e.dmg, dot: 24, owner: "howitzer", col: ecol(EN.howitzer.col) });
        }
        Audio_.lock(.55);
        Audio_.tone({ type: "square", freq: 160, to: 80, dur: .22, gain: .05 });
      } else if (e.state === 1 && e.timer <= 0) { e.state = 0; e.timer = rnd(2.6, 3.8); }
    } else if (e.type === "hexer") {
      e.timer -= dtr;
      const d = dist(e, t);
      const want = d > 420 ? 1 : d < 200 ? -.6 : 0;
      e.x += Math.cos(ang) * e.sp * want * dte; e.y += Math.sin(ang) * e.sp * want * dte;
      if (e.state === 0 && e.timer <= 0) {
        e.state = 1; e.timer = 3.1;
        const spin = (chance(.5) ? 1 : -1) * (.62 + tierNow() * .012);
        for (let k = 0; k < 3; k++) {
          trace({ x: e.x, y: e.y, ang: ang + (k / 3) * TAU, len: Math.max(W, H) * 1.4, wide: 22,
            warn: .8, live: 2.1, fade: .5, dot: 62, spin, owner: "hexer", stick: 1,
            col: ecol(EN.hexer.col), follow: e });
        }
        Audio_.lock(.7);
      } else if (e.state === 1 && e.timer <= 0) { e.state = 0; e.timer = rnd(3.2, 4.4); }
    } else if (e.type === "broodmother") {
      e.timer -= dtr;
      e.birth = Math.max(0, (e.birth || 0) - dte * 2);
      const d = dist(e, t);
      const want = d > 300 ? .8 : d < 200 ? -.8 : .2;
      e.x += (Math.cos(ang) * want + Math.cos(ang + Math.PI / 2) * .5 * Math.sin(e.wob * .4)) * e.sp * dte;
      e.y += (Math.sin(ang) * want + Math.sin(ang + Math.PI / 2) * .5 * Math.sin(e.wob * .4)) * e.sp * dte;
      if (e.timer <= 0) {
        e.timer = rnd(3.4, 4.6);
        e.birth = 1;
        const n = 2 + (e.elite ? 2 : 0) + (tierNow() > 8 ? 1 : 0);
        for (let k = 0; k < n; k++) {
          const a = rnd(TAU);
          G.portals.push({ x: clamp(e.x + Math.cos(a) * 46, 30, W - 30), y: clamp(e.y + Math.sin(a) * 46, 30, H - 30), t: .2, type: "mote" });
        }
        ring(e.x, e.y, ecol(EN.broodmother.col), 8, 90, .4, 3);
        Audio_.tone({ type: "sine", freq: 240, to: 420, dur: .3, gain: .05 });
      }
    } else if (e.type === "bloom") {
      const d = dist(e, t);
      e.fuse = clamp(1 - d / 300, 0, 1);
      e.x += Math.cos(ang) * e.sp * (1 + e.fuse * .5) * dte;
      e.y += Math.sin(ang) * e.sp * (1 + e.fuse * .5) * dte;
      if (d < e.r + t.r + 14) { killEnemy(e); continue; }
    } else if (e.type === "bulwark") {
      e.face = lerp(e.face, ang, 1 - Math.exp(-2.4 * dte));
      e.timer -= dtr;
      if (e.state === 0) {
        e.x += Math.cos(ang) * e.sp * dte; e.y += Math.sin(ang) * e.sp * dte;
        if (e.timer <= 0 && dist(e, t) < 260) {
          e.state = 1; e.timer = .6; e.lockAng = ang;
          trace({ x: e.x, y: e.y, ang: ang, len: 220, wide: 46, warn: .6, live: .14, fade: .5,
            dmg: e.dmg, col: ecol(EN.bulwark.col), follow: e, aim: 1 });
          Audio_.lock(1);
        }
      } else if (e.state === 1) {
        e.lockAng = lerp(e.lockAng, ang, 1 - Math.exp(-2 * dte));
        e.face = e.lockAng;
        if (e.timer <= 0) { e.state = 2; e.timer = .3; }
      } else {
        e.face = e.lockAng;
        e.x += Math.cos(e.lockAng) * 520 * dte; e.y += Math.sin(e.lockAng) * 520 * dte;
        if (e.timer <= 0) { e.state = 0; e.timer = rnd(2.4, 3.4); }
      }
    } else if (e.type === "mimic") {
      const h = p.hist;
      const node = h[Math.max(0, h.length - 1 - e.delay)];
      if (node) {
        e.x = approach(e.x, node.x, 7, dte);
        e.y = approach(e.y, node.y, 7, dte);
      }
      e.ang = lerp(e.ang, Math.atan2(p.y - e.y, p.x - e.x), 1 - Math.exp(-7 * dte));
      e.timer -= dtr;
      if (e.timer <= 0 && dist(e, p) > 60) {
        e.burst = (e.burst || 0) + 1;
        e.timer = e.burst >= 3 ? rnd(.9, 1.5) : .12;
        if (e.burst >= 3) e.burst = 0;
        enemyShoot(e, e.ang + rnd(-.09, .09), 470, 12, 5);
        Audio_.shoot(.8);
      }
    } else if (e.type === "mirror") {
      const ax = W - p.x, ay = H - p.y;
      e.x = approach(e.x, ax, 4.2, dte);
      e.y = approach(e.y, ay, 4.2, dte);
      e.ang = lerp(e.ang, Math.atan2(p.y - e.y, p.x - e.x), 1 - Math.exp(-5 * dte));
      e.timer -= dtr;
      if (e.state === 0 && e.timer <= 0) {
        e.state = 1; e.timer = .42; e.lockAng = e.ang;
        trace({ x: e.x, y: e.y, ang: e.ang, len: 700, wide: 12, warn: .42, live: .1, fade: .5,
          col: ecol(EN.mirror.col), follow: e, aim: 1 });
      } else if (e.state === 1 && e.timer <= 0) {
        e.state = 0; e.timer = rnd(1.4, 2.2);
        for (let k = 0; k < 4; k++) enemyShoot(e, e.lockAng + k * Math.PI / 2, 340, 13, 6);
      }
    } else if (e.type === "paradox") {
      updateBoss(e, dte, t, ang);
    } else {
      const w = e.type === "husk" ? Math.sin(e.wob) * .32 : 0;
      e.x += Math.cos(ang + w) * e.sp * dte;
      e.y += Math.sin(ang + w) * e.sp * dte;
    }
    e.x += e.kb.x * dt; e.y += e.kb.y * dt;
    e.kb.x *= Math.pow(.02, dt); e.kb.y *= Math.pow(.02, dt);
    e.x = clamp(e.x, -60, W + 60); e.y = clamp(e.y, -60, H + 60);

    if (e.type !== "bloom") {
      const d = dist(e, t);
      if (d < e.r + t.r) {
        const heavy = e.type === "dart" && e.state === 2;
        const dmgAmt = e.dmg * (heavy ? 2.4 : 1);
        if (t === p) hurtPlayer(dmgAmt * dt * (heavy ? 1.6 : 1), e);
        else { t.hp -= dmgAmt * dt * 1.4; t.hit = .1; }
        const a2 = Math.atan2(t.y - e.y, t.x - e.x);
        if (t === p) { p.vx += Math.cos(a2) * (e.type === "colossus" ? 520 : 130) * dt; p.vy += Math.sin(a2) * (e.type === "colossus" ? 520 : 130) * dt; }
      }
    }
  }
  for (let i = G.zones.length - 1; i >= 0; i--) { G.zones[i].life -= dt; if (G.zones[i].life <= 0) G.zones.splice(i, 1); }
  for (let i = G.lasers.length - 1; i >= 0; i--) { G.lasers[i].life -= dt; if (G.lasers[i].life <= 0) G.lasers.splice(i, 1); }
}
function updateBoss(e, dt, t, ang) {
  const f = e.hp / e.maxHp;
  e.phase = f < .35 ? 2 : f < .7 ? 1 : 0;
  e.timer -= dt;
  e.spin = (e.spin || 0) + dt * (.6 + e.phase * .5);
  const d = dist(e, t), orbit = 280;
  const want = d < orbit - 40 ? -1 : d > orbit + 40 ? 1 : 0;
  e.x += (Math.cos(ang) * want + Math.cos(ang + Math.PI / 2) * .85) * e.sp * dt;
  e.y += (Math.sin(ang) * want + Math.sin(ang + Math.PI / 2) * .85) * e.sp * dt;
  if (e.pending) {
    e.pending.t -= dt;
    if (e.pending.t <= 0) {
      const n = 14 + e.phase * 6;
      for (let i = 0; i < n; i++) enemyShoot(e, (i / n) * TAU + e.spin, 195, 14, 8);
      ring(e.x, e.y, ecol(EN.paradox.col), 20, 130, .4, 3);
      Audio_.boom();
      e.pending = null;
    }
  }
  if (e.timer <= 0) {
    const roll = rint(0, e.phase >= 1 ? 3 : 1);
    if (roll === 0) {
      trace({ kind: "ring", x: e.x, y: e.y, r: 168, wide: 24, warn: .5, live: .14, fade: .55,
        col: ecol(EN.paradox.col), follow: e });
      e.pending = { t: .5 };
      Audio_.lock(.5);
      e.timer = 2.6 - e.phase * .4;
    } else if (roll === 3) {
      const a0 = Math.atan2(t.y - e.y, t.x - e.x);
      const spin = chance(.5) ? 1.05 : -1.05;
      for (let k = 0; k < 2; k++) {
        trace({ x: e.x, y: e.y, ang: a0 + k * Math.PI, len: Math.max(W, H) * 1.25, wide: 28,
          warn: .95, live: .3, fade: 1.5, dmg: 26, dot: 12, spin, owner: "paradox",
          col: ecol(EN.paradox.col), follow: e });
      }
      Audio_.lock(.45);
      Audio_.tone({ type: "sawtooth", freq: 90, to: 200, dur: 1, gain: .05, filter: "lowpass", cutoff: 700 });
      e.timer = 3.7 - e.phase * .5;
    } else if (roll === 1) {
      e.volley = 4; e.volleyT = 0;
      e.timer = 2.9 - e.phase * .5;
    } else {
      const call = e.phase >= 2 ? ["husk", "bloom", "revenant", "howitzer"]
        : e.phase >= 1 ? ["husk", "bloom", "warden", "needle"] : ["husk", "bloom"];
      for (let i = 0; i < 3 + e.phase; i++) {
        const a = rnd(TAU);
        G.portals.push({ x: clamp(e.x + Math.cos(a) * 95, 40, W - 40), y: clamp(e.y + Math.sin(a) * 95, 40, H - 40), t: 0, type: pick(call) });
      }
      e.timer = 4.4;
    }
  }
  if (e.volley > 0) {
    e.volleyT -= dt;
    if (e.volleyT <= 0) {
      e.volleyT = .18; e.volley--;
      const a = Math.atan2(G.player.y - e.y, G.player.x - e.x);
      for (let s = -1; s <= 1; s++) enemyShoot(e, a + s * .22, 310, 13, 7);
      Audio_.tone({ type: "square", freq: 300, to: 180, dur: .12, gain: .045 });
    }
  }
  if (chance(dt * 8)) burst(e.x + rnd(-40, 40), e.y + rnd(-40, 40), 1, ecol(EN.paradox.col), .4, { life: .5, size: 2 });
}

/* ---------------- projectiles, pickups, fx -------------------------------- */
function updateBullets(dt) {
  const m = G.mods;
  for (let i = G.bullets.length - 1; i >= 0; i--) {
    const b = G.bullets[i];
    b.life -= dt;
    if (m.homing > 0 && !b.echo) {
      let near = null, nd = 340;
      for (const e of G.enemies) { if (e.dead) continue; const d = dist(e, b); if (d < nd) { nd = d; near = e; } }
      if (near) {
        const a = Math.atan2(near.y - b.y, near.x - b.x);
        const sp = Math.hypot(b.vx, b.vy), ca = Math.atan2(b.vy, b.vx);
        const na = ca + clamp(angDiff(a, ca), -3.4 * dt * m.homing, 3.4 * dt * m.homing);
        b.vx = Math.cos(na) * sp; b.vy = Math.sin(na) * sp;
      }
    }
    const px = b.x, py = b.y;
    b.x += b.vx * dt; b.y += b.vy * dt;
    if (G.pillars && G.pillars.length) {
      let struck = false;
      for (const pl of G.pillars) {
        if (segDist(pl.x, pl.y, px, py, b.x, b.y) < pl.r + b.r) {
          pl.hp -= b.dmg; burst(b.x, b.y, 4, ecol(EN.silica.col), .7, { life: .25 });
          Audio_.hit(); struck = true; break;
        }
      }
      if (struck) { G.bullets.splice(i, 1); continue; }
    }
    if (b.life <= 0 || b.x < -40 || b.x > W + 40 || b.y < -40 || b.y > H + 40) { G.bullets.splice(i, 1); continue; }
    for (const e of G.enemies.slice()) {
      if (e.dead || b.hits.indexOf(e) >= 0) continue;
      if (segDist(e.x, e.y, px, py, b.x, b.y) < e.r + b.r) {
        if (e.type === "prism") {
          /* the lit face throws it back; the dark side takes it normally */
          const bAng = Math.atan2(b.vy, b.vx);
          if (Math.abs(angDiff(bAng, e.ang + Math.PI)) < .9) {
            e.deflect = .25;
            damageEnemy(e, b.dmg * .2, { x: b.x, y: b.y, noCrit: true, spark: false });
            burst(b.x, b.y, 7, "220,246,255", .9, { life: .25 });
            const back = bAng + Math.PI + rnd(-.35, .35);
            G.hostiles.push({ x: b.x, y: b.y, vx: Math.cos(back) * 420, vy: Math.sin(back) * 420,
              r: 5, dmg: 10, life: 2.4, col: ecol(EN.prism.col), spin: 0, split: 0 });
            Audio_.glassRay(); G.bullets.splice(i, 1);
            break;
          }
        }
        if (e.type === "nullc") {
          /* it swallows the pulse and keeps it */
          e.stored = (e.stored || 0) + 1;
          burst(b.x, b.y, 4, TH.core, .5, { life: .3 });
          Audio_.deflect();
          G.bullets.splice(i, 1);
          break;
        }
        if (e.type === "bulwark") {
          const bAng = Math.atan2(b.vy, b.vx);
          if (Math.abs(angDiff(bAng, e.face)) > Math.PI * .74) {
            e.deflect = .25;
            damageEnemy(e, b.dmg * .14, { x: b.x, y: b.y, noCrit: true, spark: false });
            burst(b.x, b.y, 6, "200,220,255", .8, { life: .25 });
            /* the shield throws it back at whoever fired it */
            const back = Math.atan2(b.vy, b.vx) + Math.PI + rnd(-.25, .25);
            G.hostiles.push({ x: b.x, y: b.y, vx: Math.cos(back) * 380, vy: Math.sin(back) * 380,
              r: 5.5, dmg: 11, life: 2.6, col: ecol(EN.bulwark.col), spin: 0, split: 0 });
            Audio_.deflect(); G.bullets.splice(i, 1);
            break;
          }
        }
        b.hits.push(e);
        damageEnemy(e, b.dmg, { x: b.x, y: b.y });
        Audio_.hit();
        if (m.explosive > 0 && !b.echo) explode(b.x, b.y, 80, 0, "255,180,120");
        if (b.pierce > 0) b.pierce--;
        else { G.bullets.splice(i, 1); }
        break;
      }
    }
  }
  for (let i = G.hostiles.length - 1; i >= 0; i--) {
    const h = G.hostiles[i];
    h.life -= dt; h.spin += dt * 5;
    const hx = h.x, hy = h.y;
    h.x += h.vx * dt; h.y += h.vy * dt;
    if (h.life <= 0 || h.x < -50 || h.x > W + 50 || h.y < -50 || h.y > H + 50) {
      if (h.split > 0 && h.life <= 0) splitOrb(h);
      G.hostiles.splice(i, 1); continue;
    }
    if (chance(dt * 10)) part(h.x, h.y, { col: h.col, s: 20, life: .3, size: 1.6 });
    const p = G.player;
    if (segDist(p.x, p.y, hx, hy, h.x, h.y) < h.r + p.r) { hurtPlayer(h.dmg); burst(h.x, h.y, 8, h.col, .8); G.hostiles.splice(i, 1); continue; }
    for (const c of G.echoes) if (dist(h, c) < h.r + c.r) { c.hp -= h.dmg; c.hit = .12; burst(h.x, h.y, 6, h.col, .7); G.hostiles.splice(i, 1); break; }
  }
}
function updatePickups(dt) {
  const p = G.player, m = G.mods;
  const R = 110 * m.magnetMul;
  for (let i = G.pickups.length - 1; i >= 0; i--) {
    const s = G.pickups[i];
    s.life -= dt; s.spin += dt * 3;
    const d = dist(s, p);
    if (d < R) {
      const a = Math.atan2(p.y - s.y, p.x - s.x);
      const pull = 340 * (1 - d / R) + 140;
      s.vx = approach(s.vx, Math.cos(a) * pull, 8, dt);
      s.vy = approach(s.vy, Math.sin(a) * pull, 8, dt);
    }
    s.vx *= Math.pow(.35, dt); s.vy *= Math.pow(.35, dt);
    s.x += s.vx * dt; s.y += s.vy * dt;
    if (d < p.r + 13) {
      if (s.kind === "shard") { G.shards += 1; Audio_.pickup(); part(s.x, s.y, { col: TH.shard, s: 40, life: .3, size: 2 }); }
      else { healPlayer(24); Audio_.confirm(); ring(s.x, s.y, TH.core, 6, 48, .35, 2); }
      G.pickups.splice(i, 1); continue;
    }
    if (s.life <= 0) G.pickups.splice(i, 1);
  }
}
function updateFx(dt) {
  stepParts(G.parts, dt);
  stepRings(G.rings, dt);
  stepFxLists(dt);
  for (let i = G.texts.length - 1; i >= 0; i--) {
    const t = G.texts[i]; t.life -= dt; t.y += t.vy * dt; t.vy *= Math.pow(.1, dt);
    if (t.pop > 0) t.pop = Math.max(0, t.pop - dt * 5);
    if (t.life <= 0) G.texts.splice(i, 1);
  }
  for (let i = G.beams.length - 1; i >= 0; i--) { G.beams[i].life -= dt; if (G.beams[i].life <= 0) G.beams.splice(i, 1); }
  const p = G.player;
  for (const d of G.dust) {
    d.a += dt * .4;
    d.x += Math.cos(d.a) * 9 * dt * d.z - (p ? p.vx * .008 * d.z * dt * 60 : 0) * .02;
    d.y += Math.sin(d.a * .7) * 9 * dt * d.z;
    if (d.x < -20) d.x = W + 20; if (d.x > W + 20) d.x = -20;
    if (d.y < -20) d.y = H + 20; if (d.y > H + 20) d.y = -20;
  }
}

/* ---------------- render -------------------------------------------------- */
const FONT = '"Inter Tight", Inter, system-ui, sans-serif';
function drawWorld() {
  const p = G.player;
  if (backdropDirty) bakeBackdrop();
  const ox = p ? clamp((p.x - W / 2) * .02, -50, 50) : 0;
  const oy = p ? clamp((p.y - H / 2) * .02, -50, 50) : 0;
  ctx.drawImage(backC, -60 - ox, -60 - oy);
  /* light pool under the player */
  if (p) {
    const a = ctx.createRadialGradient(p.x, p.y, 10, p.x, p.y, 340);
    a.addColorStop(0, "rgba(" + TH.core + "," + (TH.dim ? .07 : .05) + ")");
    a.addColorStop(1, "rgba(" + TH.core + ",0)");
    ctx.fillStyle = a; ctx.fillRect(0, 0, W, H);
  }
  for (const d of G.dust) {
    ctx.globalAlpha = TH.dustA * d.z * .55;
    ctx.fillStyle = "rgb(" + TH.dust + ")";
    ctx.beginPath(); ctx.arc(d.x, d.y, d.s * d.z, 0, TAU); ctx.fill();
  }
  ctx.globalAlpha = 1;
  if (BRANCHFN.paint && !G.attract) { ctx.save(); try { BRANCHFN.paint(); } catch (err) {} ctx.restore(); }
  if (!G.attract) drawSeal();
  ctx.globalAlpha = 1;
  for (const z of G.zones) {
    ctx.globalAlpha = clamp(z.life / z.max, 0, 1) * .28;
    ctx.fillStyle = "rgb(" + z.col + ")";
    ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, TAU); ctx.fill();
  }
  ctx.globalAlpha = 1;
  drawTraces();
  drawMimicPaths();
  ctx.globalAlpha = 1;
  for (const pr of G.portals) {
    const t = pr.t / .55, c = ecol(EN[pr.type].col);
    ctx.save(); ctx.translate(pr.x, pr.y); ctx.rotate(t * 6);
    ctx.strokeStyle = "rgba(" + c + "," + (.35 + t * .6) + ")"; ctx.lineWidth = 2;
    polyPath(46 * (1 - t) + 14, 3, 0); ctx.stroke();
    polyPath(34 * (1 - t) + 9, 3, Math.PI); ctx.stroke();
    ctx.globalAlpha = t * .3;
    ctx.fillStyle = "rgb(" + c + ")";
    ctx.beginPath(); ctx.arc(0, 0, 14 * t, 0, TAU); ctx.fill();
    ctx.restore();
  }
  for (const s of G.pickups) {
    ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.spin);
    ctx.globalAlpha = s.life < 3 && Math.floor(s.life * 8) % 2 === 0 ? .35 : 1;
    if (s.kind === "shard") {
      ctx.fillStyle = "rgb(" + TH.shard + ")";
      polyPath(6.5, 4, 0); ctx.fill();
      ctx.fillStyle = "rgba(" + TH.rim + ",.75)";
      ctx.beginPath(); ctx.moveTo(0, -6.5); ctx.lineTo(2.6, 0); ctx.lineTo(0, 0); ctx.closePath(); ctx.fill();
    } else {
      ctx.strokeStyle = "rgb(" + TH.core + ")"; ctx.lineWidth = 2;
      polyPath(8, 6, 0); ctx.stroke();
      ctx.fillStyle = "rgba(" + TH.core + ",.35)"; ctx.fill();
      ctx.fillStyle = "rgb(" + TH.core + ")";
      ctx.fillRect(-3.4, -1, 6.8, 2); ctx.fillRect(-1, -3.4, 2, 6.8);
    }
    ctx.restore();
  }
  ctx.globalAlpha = 1;
  for (const l of G.lasers) {
    const a = l.life / l.max;
    ctx.save();
    ctx.translate(l.x, l.y); ctx.rotate(l.ang);
    const g = ctx.createLinearGradient(0, 0, 1500, 0);
    g.addColorStop(0, "rgba(" + l.col + ",1)");
    g.addColorStop(1, "rgba(" + l.col + ",0)");
    ctx.fillStyle = g; ctx.globalAlpha = a;
    ctx.fillRect(0, -9 * a, 1500, 18 * a);
    ctx.fillStyle = "rgba(" + TH.rim + "," + a + ")";
    ctx.fillRect(0, -2.4 * a, 1500, 4.8 * a);
    ctx.restore();
  }
  ctx.globalAlpha = 1;
  drawRecallLink();
  drawCorpses();
  for (const c of G.echoes) drawEcho(c);
  for (const e of G.enemies) drawEnemy(e);
  for (const b of G.bullets) {
    const g = ctx.createLinearGradient(b.x, b.y, b.x - b.vx * .02, b.y - b.vy * .02);
    const c = b.echo ? TH.echo : TH.core;
    g.addColorStop(0, "rgba(" + TH.rim + ",.95)");
    g.addColorStop(.35, "rgba(" + c + ",.9)");
    g.addColorStop(1, "rgba(" + c + ",0)");
    ctx.strokeStyle = g; ctx.lineWidth = b.echo ? 3 : 3.6; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.x - b.vx * .019, b.y - b.vy * .019); ctx.stroke();
  }
  for (const h of G.hostiles) {
    ctx.save(); ctx.translate(h.x, h.y); ctx.rotate(h.spin);
    ctx.fillStyle = "rgb(" + h.col + ")";
    ctx.beginPath(); ctx.arc(0, 0, h.r, 0, TAU); ctx.fill();
    ctx.strokeStyle = "rgba(" + TH.rim + ",.55)"; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(0, 0, h.r + 3, .4, 2.6); ctx.stroke();
    ctx.fillStyle = "rgba(" + TH.rim + ",.85)";
    ctx.beginPath(); ctx.arc(-h.r * .25, -h.r * .25, h.r * .35, 0, TAU); ctx.fill();
    ctx.restore();
  }
  drawPlayer();
  for (const b of G.beams) {
    const a = b.life / b.max;
    ctx.strokeStyle = "rgba(" + b.col + "," + a + ")";
    ctx.lineWidth = 1 + a * 3;
    ctx.beginPath(); ctx.moveTo(b.x1, b.y1);
    ctx.quadraticCurveTo((b.x1 + b.x2) / 2 + rnd(-14, 14), (b.y1 + b.y2) / 2 + rnd(-14, 14), b.x2, b.y2);
    ctx.stroke();
  }
  if (BRANCHFN.over && !G.attract) { ctx.save(); try { BRANCHFN.over(); } catch (err) {} ctx.restore(); }
  if (!G.attract) drawBossBar();
  drawDebris();
  drawGhosts();
  drawParts(G.parts);
  drawRings(G.rings);
  drawShocks();
  ctx.textAlign = "center";
  for (const t of G.texts) {
    const a = clamp(t.life / t.max, 0, 1);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(t.x, t.y);
    const sc = 1 + (t.pop || 0) * .7;
    if (sc !== 1) ctx.scale(sc, sc);
    ctx.font = "700 " + t.size + "px " + FONT;
    if (t.crit) {
      ctx.strokeStyle = "rgba(" + TH.deep + ",.65)"; ctx.lineWidth = 4;
      ctx.strokeText(t.txt, 0, 0);
    }
    ctx.fillStyle = "rgb(" + t.col + ")";
    ctx.fillText(t.txt, 0, 0);
    ctx.restore();
  }
  ctx.globalAlpha = 1; ctx.textAlign = "left";
}
/* the tether that says "dash puts you there" */
function drawRecallLink() {
  const p = G.player;
  if (!p || G.mode !== "play") return;
  const c = recallTarget();
  if (!c) return;
  const ready = recallReady();
  ctx.save();
  ctx.setLineDash([7, 9]);
  ctx.lineDashOffset = -G.time * 44;
  ctx.strokeStyle = "rgba(" + TH.echo + "," + (ready ? .36 : .12) + ")";
  ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(c.x, c.y); ctx.stroke();
  ctx.setLineDash([]);
  if (ready) {
    ctx.strokeStyle = "rgba(" + TH.echo + ",.5)";
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(c.x, c.y, c.r + 11 + Math.sin(G.time * 5) * 1.8, 0, TAU); ctx.stroke();
  }
  if (p.swapFlash > 0) {
    ctx.globalAlpha = p.swapFlash;
    ctx.strokeStyle = "rgb(" + TH.echo + ")";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(c.x, c.y); ctx.stroke();
  }
  ctx.restore();
}
/* mimics walk your own past, so show them the line they are about to take */
function drawMimicPaths() {
  const p = G.player;
  if (!p) return;
  ctx.save();
  ctx.setLineDash([4, 7]);
  ctx.lineWidth = 1.1;
  for (const e of G.enemies) {
    if (e.type !== "mimic") continue;
    const h = p.hist, start = Math.max(0, h.length - 1 - e.delay);
    if (start >= h.length - 2) continue;
    ctx.strokeStyle = "rgba(" + ecol(EN.mimic.col) + ",.3)";
    ctx.beginPath();
    for (let i = start; i < h.length; i += 3) { const n = h[i]; i === start ? ctx.moveTo(n.x, n.y) : ctx.lineTo(n.x, n.y); }
    ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.restore();
}
function drawCursor() {
  if (G.mode !== "play" || G.attract || touch.active) return;
  const p = G.player;
  ctx.save();
  ctx.translate(mouse.x, mouse.y);
  const swapping = !!recallTarget() && recallReady();
  ctx.strokeStyle = swapping ? "rgba(" + TH.echo + ",.95)" : p.dash > 0 ? "rgba(" + TH.core + ",.95)" : "rgba(" + TH.ink + ",.32)";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(0, 0, 11, 0, TAU);
  ctx.moveTo(-18, 0); ctx.lineTo(-7, 0); ctx.moveTo(7, 0); ctx.lineTo(18, 0);
  ctx.moveTo(0, -18); ctx.lineTo(0, -7); ctx.moveTo(0, 7); ctx.lineTo(0, 18);
  ctx.stroke();
  if (p.dash < p.dashMax) {
    const frac = 1 - clamp(p.dashCd / (.85 * G.mods.dashCdMul), 0, 1);
    ctx.strokeStyle = "rgba(" + TH.core + ",.9)"; ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.arc(0, 0, 15, -Math.PI / 2, -Math.PI / 2 + TAU * frac); ctx.stroke();
  }
  ctx.restore();
}
function render() {
  const s = SAVE.settings;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.fillStyle = "rgb(" + TH.deep + ")";
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  if (G.trauma > 0) {
    const t = G.trauma * G.trauma;
    ctx.translate(rnd(-1, 1) * 20 * t + G.shakeDir.x * t * 6, rnd(-1, 1) * 20 * t + G.shakeDir.y * t * 6);
    ctx.rotate(rnd(-1, 1) * .011 * t);
  }
  drawWorld();
  ctx.restore();
  if (s.bloom && G.quality > .7) {
    bctx.setTransform(1, 0, 0, 1, 0, 0);
    bctx.clearRect(0, 0, bloomC.width, bloomC.height);
    bctx.filter = TH.dim ? "blur(3px) brightness(1.5) saturate(1.2)" : "blur(3px) brightness(1.15) saturate(1.3)";
    bctx.drawImage(cv, 0, 0, bloomC.width, bloomC.height);
    bctx.filter = "none";
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = TH.bloom;
    ctx.drawImage(bloomC, 0, 0, W, H);
    const split = Math.max(G.trauma, G.chroma);
    if (TH.dim && split > .25) {
      ctx.globalAlpha = .24 * split;
      ctx.drawImage(bloomC, -8 * split, 0, W, H);
      ctx.drawImage(bloomC, 8 * split, 0, W, H);
    }
    ctx.restore();
  }
  drawCursor();
  const p = G.player;
  if (p && p.surgeActive > 0) {
    ctx.save();
    ctx.globalCompositeOperation = TH.dim ? "lighter" : "source-over";
    const g = ctx.createRadialGradient(p.x, p.y, 40, p.x, p.y, Math.max(W, H) * .7);
    g.addColorStop(0, "rgba(" + TH.shard + ",.05)");
    g.addColorStop(1, "rgba(" + TH.shard + ",.012)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
  if (p && p.hp > 0 && p.hp / p.maxHp < .3 && G.mode === "play") {
    const pulse = .09 + Math.sin(G.time * 5) * .05;
    const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * .3, W / 2, H / 2, Math.max(W, H) * .62);
    g.addColorStop(0, "rgba(255,60,90,0)");
    g.addColorStop(1, "rgba(255,40,80," + pulse + ")");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  if (G.flash > .001) {
    ctx.fillStyle = "rgba(" + G.flashCol + "," + G.flash + ")";
    ctx.fillRect(0, 0, W, H);
  }
}
/* small icon renderer used by the guide and level cards */
function drawIcon(canvas, type, size) {
  const c2 = canvas.getContext("2d");
  const old = ctx, oldCache = gradCache;
  ctx = c2; gradCache = {};
  const d = Math.min(devicePixelRatio || 1, 2);
  canvas.width = size * d; canvas.height = size * d;
  canvas.style.width = size + "px"; canvas.style.height = size + "px";
  c2.setTransform(d, 0, 0, d, 0, 0);
  c2.clearRect(0, 0, size, size);
  c2.save();
  c2.translate(size / 2, size / 2);
  if (BOSSES[type]) c2.scale(.52, .52);
  const r = size * (BOSSES[type] ? .3 : .3);
  const e = { type, r, ang: -.4, wob: 1.2, hp: 1, maxHp: 1, hit: 0, state: 0, timer: 1.4,
    face: -.4, deflect: 0, fuse: .4, blink: 1, phase: 0, spin: .7, born: 1, lockAng: 0,
    tether: 0, birth: .5, pop: 0, elite: 0, x: 0, y: 0, burst: 0,
    charge: .55, ping: .4, sub: 0, load: .5, calm: 0, stored: 3, beat: 2, beatT: .4,
    write: .55, cores: 3, handAng: -Math.PI / 2, pullT: .5, peace: 0, mate: null };
  try { (ART[type] || ART.husk)(e, ecol(EN[type].col)); } catch (err) {}
  c2.restore();
  ctx = old; gradCache = oldCache;
}


