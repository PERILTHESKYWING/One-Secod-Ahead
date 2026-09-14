/* Branch-specific enemy AI (the TLAI table) for the four filed timelines. */
/* =====================================================================
   BRANCH BEHAVIOUR — AI for the filed timelines, and the physics each
   branch imposes on the room. Signature matches the base chain:
   (e, dte, dtr, target, angToTarget, player, mods, rawDt)
   ===================================================================== */

function nearEdgeClamp(e, pad) { e.x = clamp(e.x, pad, W - pad); e.y = clamp(e.y, pad, H - pad); }
function driftTo(e, tx, ty, mul, dte) {
  const a = Math.atan2(ty - e.y, tx - e.x);
  e.x += Math.cos(a) * e.sp * mul * dte;
  e.y += Math.sin(a) * e.sp * mul * dte;
}
/* keeps a ranged unit at a comfortable stand-off */
function standOff(e, t, want, dte, strafe) {
  const d = dist(e, t) || 1;
  const a = Math.atan2(t.y - e.y, t.x - e.x);
  const push = d < want - 40 ? -1 : d > want + 40 ? 1 : 0;
  e.x += (Math.cos(a) * push + Math.cos(a + Math.PI / 2) * (strafe || .6)) * e.sp * dte;
  e.y += (Math.sin(a) * push + Math.sin(a + Math.PI / 2) * (strafe || .6)) * e.sp * dte;
  nearEdgeClamp(e, 34);
}

const TLAI = {

  /* ================= GLASSFALL ======================================= */

  facet(e, dte, dtr, t, ang) {
    e.timer -= dtr;
    if (e.state === 0) {
      standOff(e, t, 260, dte, Math.sin(e.born * .7) * .7);
      if (e.timer <= 0 && dist(e, t) < 520) {
        e.state = 1; e.timer = .62; e.lockAng = ang;
        for (let i = -1; i <= 1; i++) {
          trace({ x: e.x, y: e.y, ang: e.lockAng + i * .34, len: 540, wide: 12, warn: .62, live: .1,
            fade: .35, col: ecol(EN.facet.col), follow: e, aim: 1, aim0: i * .34 });
        }
        Audio_.glassLock();
      }
    } else {
      e.lockAng = lerp(e.lockAng, ang, 1 - Math.exp(-2.4 * dte));
      if (e.timer <= 0) {
        e.state = 0; e.timer = rnd(1.5, 2.4);
        for (let i = -1; i <= 1; i++) enemyShoot(e, e.lockAng + i * .34, 430, e.dmg, 5);
        Audio_.glassRay();
      }
    }
  },

  /* PRISM — turns slowly; the lit face deflects. The AI is mostly the walk;
     the deflection is handled where bullets are resolved. */
  prism(e, dte, dtr, t, ang) {
    driftTo(e, t.x, t.y, .55, dte);
    e.timer -= dtr;
    if (e.timer <= 0) {
      e.timer = rnd(2.1, 3.2);
      const a = Math.atan2(t.y - e.y, t.x - e.x);
      trace({ x: e.x, y: e.y, ang: a, len: 640, wide: 10, warn: .55, live: .12, fade: .5,
        dmg: e.dmg * .7, col: ecol(EN.prism.col), follow: e, aim: 1 });
      e.lockAng = a;
      Audio_.glassLock();
    }
  },

  rime(e, dte, dtr, t, ang) {
    e.timer -= dtr;
    /* a wide arcing approach so the cold trail actually draws a shape */
    const swing = Math.sin(e.born * 1.8) * .5;
    e.x += Math.cos(ang + swing) * e.sp * dte;
    e.y += Math.sin(ang + swing) * e.sp * dte;
    e.chill = (e.chill || 0) - dte;
    if (e.chill <= 0) {
      e.chill = .09;
      G.chill.push({ x: e.x, y: e.y, r: 26, life: 2.6, max: 2.6 });
      if (G.chill.length > 90) G.chill.shift();
    }
  },

  silica(e, dte, dtr, t, ang) {
    standOff(e, t, 300, dte, .35);
    e.timer -= dtr;
    if (e.timer <= 0) {
      e.timer = rnd(3.4, 4.6);
      /* plants two pillars on opposite sides of the player */
      const base = Math.atan2(t.y - e.y, t.x - e.x) + rnd(-.5, .5);
      for (let i = 0; i < 2; i++) {
        const a = base + i * Math.PI;
        const px = clamp(t.x + Math.cos(a) * 190, 60, W - 60);
        const py = clamp(t.y + Math.sin(a) * 190, 60, H - 60);
        G.pillars.push({ x: px, y: py, hp: 30, max: 30, born: 0, fire: 1.4, ang: a + Math.PI, r: 15 });
        ring(px, py, ecol(EN.silica.col), 4, 40, .4, 2);
      }
      Audio_.glassLock();
    }
  },

  kelvin(e, dte, dtr, t, ang) {
    standOff(e, t, 210, dte * .7, .5);
    e.timer -= dtr;
    if (e.state === 0) {
      e.charge = approach(e.charge || 0, 0, 4, dte);
      if (e.timer <= 0) {
        e.state = 1; e.timer = 1.5; e.charge = 0;
        e.ringR = 250;
        trace({ kind: "ring", x: e.x, y: e.y, r: 250, wide: 30, warn: 1.5, live: .18, fade: .5,
          dmg: 34, col: ecol(EN.kelvin.col), follow: e, stick: 1 });
        Audio_.coldRing();
      }
    } else {
      e.charge = approach(e.charge || 0, 1, 3, dte);
      if (e.timer <= 0) { e.state = 0; e.timer = rnd(2.6, 3.6); }
    }
  },

  /* --- THE STILL HOUR ------------------------------------------------ */
  stillhour(e, dte, dtr, t, ang) {
    const f = e.hp / e.maxHp;
    e.phase = f < .3 ? 3 : f < .55 ? 2 : f < .8 ? 1 : 0;
    e.spin = (e.spin || 0) + dte * (.3 + e.phase * .16);
    /* the hand sweeps the dial — the secret lives on it passing 12 */
    const hs = .9 + e.phase * .35;
    const prev = e.handAng == null ? -Math.PI / 2 : e.handAng;
    e.handAng = prev + hs * dte;
    if (e.handAng > Math.PI * 1.5) e.handAng -= TAU;
    /* slow orbit around the room centre */
    const cx = W / 2, cy = H / 2;
    e.orb = (e.orb || 0) + dte * .18;
    e.x = approach(e.x, cx + Math.cos(e.orb) * 150, 1.2, dte);
    e.y = approach(e.y, cy + Math.sin(e.orb) * 90, 1.2, dte);
    e.timer -= dte;
    if (e.timer <= 0) {
      const roll = rint(0, e.phase >= 2 ? 3 : 2);
      if (roll === 0) {
        /* refraction sweep — four rotating rays out of the dial */
        const a0 = Math.atan2(t.y - e.y, t.x - e.x);
        const spin = chance(.5) ? .8 : -.8;
        for (let k = 0; k < 4; k++) {
          trace({ x: e.x, y: e.y, ang: a0 + k * Math.PI / 2, len: Math.max(W, H) * 1.3, wide: 24,
            warn: 1, live: .35, fade: 1.2, dmg: 24, dot: 10, spin, owner: "stillhour",
            col: ecol(EN.stillhour.col), follow: e, stick: 1 });
        }
        Audio_.glassLock(); Audio_.coldRing();
        e.timer = 4 - e.phase * .5;
      } else if (roll === 1) {
        /* it drops stasis discs and then shoots into them */
        for (let i = 0; i < 2 + e.phase; i++) {
          const a = rnd(TAU), rr = rnd(320, 120);
          addStasis(clamp(e.x + Math.cos(a) * rr, 70, W - 70), clamp(e.y + Math.sin(a) * rr, 70, H - 70), rnd(120, 90), 7);
        }
        e.volley = 10; e.volleyT = 0;
        e.timer = 3.4 - e.phase * .4;
      } else if (roll === 2) {
        /* closing lattice: three concentric rings, inner first */
        for (let i = 0; i < 3; i++) {
          trace({ kind: "ring", x: e.x, y: e.y, r: 120 + i * 105, wide: 26,
            warn: 1.1 + i * .34, live: .16, fade: .5, dmg: 26,
            col: ecol(EN.stillhour.col), follow: e, stick: 1 });
        }
        Audio_.coldRing();
        e.timer = 4.2 - e.phase * .5;
      } else {
        /* it sheds a facet and calls glass */
        const call = e.phase >= 2 ? ["prism", "kelvin", "silica"] : ["facet", "rime"];
        for (let i = 0; i < 2 + e.phase; i++) {
          const a = rnd(TAU);
          G.portals.push({ x: clamp(e.x + Math.cos(a) * 130, 40, W - 40),
            y: clamp(e.y + Math.sin(a) * 130, 40, H - 40), t: 0, type: pick(call) });
        }
        e.timer = 4.6 - e.phase * .5;
      }
    }
    if (e.volley > 0) {
      e.volleyT -= dte;
      if (e.volleyT <= 0) {
        e.volleyT = .14;
        e.volley--;
        const a = Math.atan2(t.y - e.y, t.x - e.x) + rnd(-.22, .22);
        enemyShoot(e, a, 360, 16, 7);
        Audio_.glassRay();
      }
    }
  },

  /* ================= EMBERWAKE ======================================= */

  filament(e, dte, dtr, t, ang) {
    /* pairs itself with the nearest unlinked filament and strings a wire */
    if (!e.mate || e.mate.dead) {
      e.mate = null;
      for (const o of G.enemies) {
        if (o !== e && o.type === "filament" && !o.dead && (!o.mate || o.mate === e)) { e.mate = o; o.mate = e; break; }
      }
    }
    standOff(e, t, e.mate ? 230 : 150, dte, e.mate ? .8 : .5);
    if (e.mate && !e.mate.dead) {
      /* the wire burns anything crossing it */
      const p = G.player;
      const d = segDist(p.x, p.y, e.x, e.y, e.mate.x, e.mate.y);
      if (d < p.r + 6 && e.x < e.mate.x) hurtPlayer(e.dmg * dte * 2.4, e);
    } else {
      e.timer -= dtr;
      if (e.timer <= 0) { e.timer = rnd(1.3, 2); enemyShoot(e, ang, 380, e.dmg * .7, 5); }
    }
  },

  corona(e, dte, dtr, t, ang) {
    standOff(e, t, 240, dte * .8, .55);
    e.timer -= dtr;
    if (e.timer <= 0) {
      e.timer = 2.4;
      /* a heat ring every count of four — spacing is the whole puzzle */
      for (let i = 0; i < 2; i++) {
        trace({ kind: "ring", x: e.x, y: e.y, r: 90 + i * 120, wide: 24,
          warn: .5 + i * .55, live: .14, fade: .45, dmg: e.dmg,
          col: ecol(EN.corona.col), follow: e, stick: 1 });
      }
      Audio_.emberPulse();
    }
  },

  cinder(e, dte, dtr, t, ang) {
    e.timer -= dtr;
    if (e.state === 0) {
      /* orbits */
      const d = dist(e, t) || 1;
      const a = Math.atan2(t.y - e.y, t.x - e.x);
      const push = d < 170 ? -.6 : d > 230 ? 1 : 0;
      e.x += (Math.cos(a) * push + Math.cos(a + Math.PI / 2) * 1.3) * e.sp * dte;
      e.y += (Math.sin(a) * push + Math.sin(a + Math.PI / 2) * 1.3) * e.sp * dte;
      if (e.timer <= 0) {
        e.state = 2; e.timer = .74; e.lockAng = ang;
        trace({ kind: "disc", x: t.x, y: t.y, r: 44, warn: .74, live: .12, fade: .4,
          dmg: e.dmg, col: ecol(EN.cinder.col) });
        e.diveX = t.x; e.diveY = t.y;
        Audio_.emberPulse();
      }
    } else {
      const a = Math.atan2(e.diveY - e.y, e.diveX - e.x);
      e.x += Math.cos(a) * 620 * dte; e.y += Math.sin(a) * 620 * dte;
      burst(e.x, e.y, 1, ecol(EN.cinder.col), .4, { life: .3, size: 2 });
      if (e.timer <= 0 || Math.hypot(e.diveX - e.x, e.diveY - e.y) < 18) {
        e.state = 0; e.timer = rnd(1.6, 2.6);
        zone(e.x, e.y, 46, 3.2, 20, ecol(EN.cinder.col));
        ring(e.x, e.y, ecol(EN.cinder.col), 6, 60, .35, 2.4);
      }
    }
  },

  helion(e, dte, dtr, t, ang) {
    e.timer -= dtr;
    if (e.state === 0) {
      driftTo(e, t.x, t.y, .8, dte);
      if (e.timer <= 0 && dist(e, t) < 420) {
        e.state = 1; e.timer = .9; e.lockAng = ang;
        trace({ x: e.x, y: e.y, ang: e.lockAng, len: 440, wide: 36, warn: .9, live: .3, fade: .9,
          dmg: e.dmg, dot: 16, owner: "helion", col: ecol(EN.helion.col), follow: e, aim: 1 });
        Audio_.lock(.7);
      }
    } else if (e.state === 1) {
      e.lockAng = lerp(e.lockAng, ang, 1 - Math.exp(-1.6 * dte));
      if (e.timer <= 0) { e.state = 2; e.timer = .5; Audio_.emberVent(); }
    } else {
      /* it recoils backwards while venting */
      e.x -= Math.cos(e.lockAng) * 130 * dte;
      e.y -= Math.sin(e.lockAng) * 130 * dte;
      if (e.timer <= 0) { e.state = 0; e.timer = rnd(1.8, 2.8); }
    }
  },

  ignis(e, dte, dtr, t, ang) {
    standOff(e, t, 280, dte, .7);
    /* fires at a rate driven by the player's own heat gauge */
    const heat = clamp(G.heat || 0, 0, 1);
    e.timer -= dtr * (.55 + heat * 1.9);
    if (e.timer <= 0) {
      e.timer = 1.4;
      const n = heat > .6 ? 3 : 1;
      for (let i = 0; i < n; i++) enemyShoot(e, ang + (i - (n - 1) / 2) * .16, 400, e.dmg * .6, 6);
      Audio_.emberPulse();
    }
  },

  /* --- PERIHELION ---------------------------------------------------- */
  perihelion(e, dte, dtr, t, ang) {
    const f = e.hp / e.maxHp;
    e.phase = f < .3 ? 3 : f < .55 ? 2 : f < .8 ? 1 : 0;
    e.spin = (e.spin || 0) + dte * (.5 + e.phase * .25);
    e.orb = (e.orb || 0) + dte * .14;
    e.x = approach(e.x, W / 2 + Math.cos(e.orb) * 110, 1, dte);
    e.y = approach(e.y, H / 2 + Math.sin(e.orb) * 70, 1, dte);
    /* a constant gravity well; stronger with phase */
    e.pullT = approach(e.pullT || 0, .3 + e.phase * .22, 2, dte);
    const p = G.player;
    const d = dist(e, p) || 1;
    const pa = Math.atan2(e.y - p.y, e.x - p.x);
    const pull = (60 + e.phase * 55) * clamp(600 / d, .3, 2.2);
    p.vx += Math.cos(pa) * pull * dte;
    p.vy += Math.sin(pa) * pull * dte;
    e.timer -= dte;
    if (e.timer <= 0) {
      const roll = rint(0, e.phase >= 2 ? 3 : 2);
      if (roll === 0) {
        /* flare barrage — spiral of shots */
        e.volley = 22 + e.phase * 8; e.volleyT = 0;
        e.timer = 3.6 - e.phase * .4;
      } else if (roll === 1) {
        /* nova rings with a gap you have to already be standing in */
        const gap = rnd(TAU);
        for (let i = 0; i < 3; i++) {
          trace({ kind: "ring", x: e.x, y: e.y, r: 130 + i * 130, wide: 30,
            warn: .9 + i * .42, live: .18, fade: .6, dmg: 30,
            col: ecol(EN.perihelion.col), follow: e, stick: 1 });
        }
        /* the safe wedge, drawn as a cool corridor */
        G.safeWedge = { ang: gap, arc: .55, life: 2.6, max: 2.6, x: e.x, y: e.y };
        Audio_.emberVent();
        e.timer = 4.4 - e.phase * .5;
      } else if (roll === 2) {
        /* corona lash — two counter-rotating beams */
        const a0 = Math.atan2(t.y - e.y, t.x - e.x);
        for (let k = 0; k < 2; k++) {
          trace({ thru: 1, x: e.x, y: e.y, ang: a0 + k * Math.PI, len: Math.max(W, H) * 1.3, wide: 34,
            warn: .95, live: .34, fade: 1.4, dmg: 28, dot: 14, spin: k ? 1.1 : -1.1,
            owner: "perihelion", col: ecol(EN.perihelion.col), follow: e, stick: 1 });
        }
        Audio_.lock(.5);
        e.timer = 4 - e.phase * .5;
      } else {
        const call = e.phase >= 2 ? ["helion", "ignis", "corona"] : ["cinder", "filament"];
        for (let i = 0; i < 3 + e.phase; i++) {
          const a = rnd(TAU);
          G.portals.push({ x: clamp(e.x + Math.cos(a) * 150, 40, W - 40),
            y: clamp(e.y + Math.sin(a) * 150, 40, H - 40), t: 0, type: pick(call) });
        }
        e.timer = 4.8 - e.phase * .5;
      }
    }
    if (e.volley > 0) {
      e.volleyT -= dte;
      if (e.volleyT <= 0) {
        e.volleyT = .07;
        e.volley--;
        enemyShoot(e, e.spin * 3.4 + e.volley * .5, 300, 15, 8);
      }
    }
  },

  /* ================= NULLTIDE ======================================== */

  fathom(e, dte, dtr, t, ang) {
    e.timer -= dtr;
    e.ping = Math.max(0, (e.ping || 0) - dte * 1.6);
    if (e.state === 0) {
      standOff(e, t, 300, dte, .5);
      if (e.timer <= 0) {
        e.state = 1; e.timer = .8; e.ping = 1;
        e.markX = t.x; e.markY = t.y;
        Audio_.sonar();
      }
    } else {
      /* it commits to where the ping found you, not where you are */
      const a = Math.atan2(e.markY - e.y, e.markX - e.x);
      e.x += Math.cos(a) * e.sp * 2.4 * dte;
      e.y += Math.sin(a) * e.sp * 2.4 * dte;
      if (e.timer <= 0) {
        e.state = 0; e.timer = rnd(1.8, 2.8);
        enemyShoot(e, Math.atan2(e.markY - e.y, e.markX - e.x), 380, e.dmg, 6);
      }
    }
  },

  undine(e, dte, dtr, t, ang) {
    /* never approaches straight — a sine offset that widens with distance */
    const d = dist(e, t);
    const swim = Math.sin(e.born * 3.4) * clamp(d / 260, .2, 1) * .95;
    e.x += Math.cos(ang + swim) * e.sp * dte;
    e.y += Math.sin(ang + swim) * e.sp * dte;
    e.ang = ang + swim;
    e.timer -= dtr;
    if (e.timer <= 0 && d < 380) {
      e.timer = rnd(1.6, 2.4);
      enemyShoot(e, ang + swim * .4, 330, e.dmg * .8, 5);
    }
  },

  caustic(e, dte, dtr, t, ang) {
    standOff(e, t, 330, dte * .7, .35);
    e.timer -= dtr;
    if (e.state === 0) {
      e.lockAng = lerp(e.lockAng || ang, ang, 1 - Math.exp(-3 * dte));
      if (e.timer <= 0) { e.state = 1; e.timer = .8; Audio_.sonar(); }
    } else if (e.state === 1) {
      e.lockAng = lerp(e.lockAng, ang, 1 - Math.exp(-1.4 * dte));
      if (e.timer <= 0) {
        e.state = 2; e.timer = 1.8;
        e.focus = { x: e.x + Math.cos(e.lockAng) * 120, y: e.y + Math.sin(e.lockAng) * 120 };
      }
    } else {
      /* walks a burning focal point toward you */
      const fa = Math.atan2(t.y - e.focus.y, t.x - e.focus.x);
      e.focus.x += Math.cos(fa) * 210 * dte;
      e.focus.y += Math.sin(fa) * 210 * dte;
      e.lockAng = Math.atan2(e.focus.y - e.y, e.focus.x - e.x);
      const p = G.player;
      if (Math.hypot(p.x - e.focus.x, p.y - e.focus.y) < p.r + 20) hurtPlayer(e.dmg * dte * 2.2, e);
      burst(e.focus.x, e.focus.y, 1, ecol(EN.caustic.col), .4, { life: .25, size: 2 });
      if (e.timer <= 0) { e.state = 0; e.timer = rnd(2, 3); e.focus = null; }
    }
  },

  trench(e, dte, dtr, t, ang) {
    e.timer -= dtr;
    if (e.state === 0) {
      e.sub = approach(e.sub || 0, 0, 5, dte);
      driftTo(e, t.x, t.y, .7, dte);
      if (e.timer <= 0) { e.state = 1; e.timer = 1.5; Audio_.sonar(); }
    } else if (e.state === 1) {
      /* submerged transit — the wake shows the route */
      e.sub = approach(e.sub || 0, 1, 4, dte);
      const a = Math.atan2(t.y - e.y, t.x - e.x);
      e.x += Math.cos(a) * e.sp * 3.2 * dte;
      e.y += Math.sin(a) * e.sp * 3.2 * dte;
      if (e.timer <= 0) {
        e.state = 2; e.timer = .55;
        trace({ kind: "disc", x: e.x, y: e.y, r: 78, warn: .55, live: .16, fade: .5,
          dmg: e.dmg, col: ecol(EN.trench.col) });
      }
    } else {
      e.sub = approach(e.sub || 0, 0, 6, dte);
      if (e.timer <= 0) {
        e.state = 0; e.timer = rnd(2.6, 3.6);
        shock(e.x, e.y, { r0: 10, r1: 130, life: .4, col: ecol(EN.trench.col), w: 5 });
        for (let i = 0; i < 8; i++) enemyShoot(e, (i / 8) * TAU, 260, e.dmg * .5, 6);
      }
    }
  },

  sounding(e, dte, dtr, t, ang) {
    standOff(e, t, 290, dte, .6);
    e.timer -= dtr;
    e.load = clamp((e.load || 0) + dte * .4, 0, 1);
    if (e.timer <= 0) {
      e.timer = 3.2;
      e.load = 0;
      /* drops three charges around you. The tide drags them, so the danger ring
         is drawn on the charge itself rather than pinned to the floor — a fixed
         telegraph would point at where the charge no longer is. */
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * TAU + rnd(.6);
        G.charges.push({
          x: clamp(t.x + Math.cos(a) * rnd(150, 70), 50, W - 50),
          y: clamp(t.y + Math.sin(a) * rnd(150, 70), 50, H - 50),
          t: 0, fuse: 2.1, r: 58, dmg: e.dmg,
        });
      }
      Audio_.sonar();
    }
  },

  /* --- THE DROWNED INDEX --------------------------------------------- */
  drownedindex(e, dte, dtr, t, ang) {
    const f = e.hp / e.maxHp;
    e.phase = f < .3 ? 3 : f < .55 ? 2 : f < .8 ? 1 : 0;
    e.spin = (e.spin || 0) + dte * (.4 + e.phase * .2);
    e.orb = (e.orb || 0) + dte * .12;
    e.x = approach(e.x, W / 2 + Math.cos(e.orb) * 130, 1, dte);
    e.y = approach(e.y, H / 2 + Math.sin(e.orb) * 80, 1, dte);
    e.timer -= dte;
    if (e.timer <= 0) {
      const roll = rint(0, e.phase >= 2 ? 3 : 2);
      if (roll === 0) {
        /* retrieval — it plays back things you already killed this run */
        const pool = Object.keys(G.killed).filter((k) => G.killed[k] > 0 && EN[k] && EN[k].cost > 0);
        const call = pool.length ? pool : ["fathom", "undine"];
        for (let i = 0; i < 3 + e.phase; i++) {
          const a = rnd(TAU);
          G.portals.push({ x: clamp(e.x + Math.cos(a) * 150, 40, W - 40),
            y: clamp(e.y + Math.sin(a) * 150, 40, H - 40), t: 0, type: pick(call), recall: 1 });
        }
        text(e.x, e.y - e.r - 30, "retrieving", ecol(EN.drownedindex.col), 15);
        Audio_.sonar();
        e.timer = 5 - e.phase * .5;
      } else if (roll === 1) {
        /* pressure crush — a ring that closes on the whole room */
        trace({ kind: "ring", x: W / 2, y: H / 2, r: Math.max(W, H) * .62, wide: 40,
          warn: 1.4, live: .2, fade: .6, dmg: 30, col: ecol(EN.drownedindex.col) });
        trace({ kind: "ring", x: W / 2, y: H / 2, r: 150, wide: 34,
          warn: 1.9, live: .18, fade: .6, dmg: 30, col: ecol(EN.drownedindex.col) });
        Audio_.tideWarn();
        e.timer = 4.4 - e.phase * .4;
      } else if (roll === 2) {
        /* index columns rise in a grid — read the gaps */
        const cols = 5;
        const skip = rint(0, cols - 1);
        for (let i = 0; i < cols; i++) {
          if (i === skip) continue;
          trace({ thru: 1, x: (W / (cols + 1)) * (i + 1), y: -40, ang: Math.PI / 2, len: H + 80, wide: 46,
            warn: 1.1, live: .28, fade: .8, dmg: 26, col: ecol(EN.drownedindex.col) });
        }
        Audio_.tideWarn();
        e.timer = 3.8 - e.phase * .4;
      } else {
        /* forced rewind — the tide comes early and hard */
        tideRewind(true);
        e.volley = 16; e.volleyT = 0;
        e.timer = 4.2 - e.phase * .4;
      }
    }
    if (e.volley > 0) {
      e.volleyT -= dte;
      if (e.volleyT <= 0) {
        e.volleyT = .1; e.volley--;
        enemyShoot(e, e.spin * 2.6 + e.volley * .78, 280, 15, 7);
      }
    }
  },

  /* ================= TERMINUS ======================================== */

  vestige(e, dte, dtr, t, ang) {
    /* if left alone long enough it remembers there was a reason to stop */
    e.peace = (e.peace || 0) + (e.hit > 0 ? -2 * dte : dte);
    if (e.peace > 30 && !e.calmed) {
      e.calmed = 1;
      unlockSecret("mercy");
      text(e.x, e.y - 40, "it stopped", TH.shard, 16);
    }
    e.calm = approach(e.calm || 0, e.calmed ? 1 : 0, 2, dte);
    if (e.calmed) {
      /* follows you at a distance and stops attacking */
      const d = dist(e, t);
      if (d > 130) driftTo(e, t.x, t.y, .5, dte);
      e.dmg = 0;
      return;
    }
    const w = Math.sin(e.wob) * .3;
    e.x += Math.cos(ang + w) * e.sp * dte;
    e.y += Math.sin(ang + w) * e.sp * dte;
  },

  coda(e, dte, dtr, t, ang) {
    standOff(e, t, 250, dte * .8, .5);
    /* every Coda in the room shares the same clock, so they can land together */
    const period = .5;
    e.beatT = (e.beatT || 0) + dte / period;
    if (e.beatT >= 1) {
      e.beatT -= 1;
      e.beat = ((e.beat || 0) + 1) % 4;
      Audio_.codaTick(e.beat);
      if (e.beat === 0) {
        /* the fourth beat is the shot */
        e.lastFire = G.time;
        const a = Math.atan2(t.y - e.y, t.x - e.x);
        for (let i = -1; i <= 1; i++) enemyShoot(e, a + i * .2, 400, e.dmg * .7, 6);
        Audio_.codaHit();
      } else if (e.beat === 3) {
        const a = Math.atan2(t.y - e.y, t.x - e.x);
        trace({ x: e.x, y: e.y, ang: a, len: 520, wide: 28, warn: period, live: .1, fade: .3,
          col: ecol(EN.coda.col), follow: e, aim: 1 });
        e.lockAng = a;
      }
    }
  },

  nullc(e, dte, dtr, t, ang) {
    driftTo(e, t.x, t.y, .5, dte);
    e.stored = e.stored || 0;
    e.timer -= dtr;
    if (e.stored >= 6 || (e.timer <= 0 && e.stored > 0)) {
      /* returns everything it swallowed, with your name still on it */
      const n = e.stored;
      for (let i = 0; i < n; i++) {
        const a = ang + (i - (n - 1) / 2) * .18;
        const h = enemyShoot(e, a, 520, e.dmg * .55, 5);
        h.col = TH.core;
      }
      e.stored = 0; e.timer = 1.6;
      ring(e.x, e.y, TH.core, e.r, e.r * 3.4, .35, 2.6);
      Audio_.nullReturn();
    }
  },

  epilogue(e, dte, dtr, t, ang) {
    standOff(e, t, 320, dte * .6, .3);
    e.timer -= dtr;
    if (e.state === 0) {
      e.write = approach(e.write || 0, 0, 5, dte);
      if (e.timer <= 0) {
        e.state = 1; e.timer = 2.2; e.write = 0;
        /* it writes a line across the floor; the finished line is the hazard */
        const a = Math.atan2(t.y - e.y, t.x - e.x) + rnd(-.4, .4);
        e.lineA = a;
        e.line = { x: t.x - Math.cos(a) * 320, y: t.y - Math.sin(a) * 320, ang: a };
        trace({ x: e.line.x, y: e.line.y, ang: a, len: 660, wide: 34, warn: 2.2, live: .3,
          fade: 1.1, dmg: e.dmg, dot: 14, owner: "epilogue", col: ecol(EN.epilogue.col) });
        Audio_.penScratch();
      }
    } else {
      e.write = approach(e.write || 0, 1, 1.4, dte);
      if (e.timer <= 0) { e.state = 0; e.timer = rnd(2.6, 3.6); e.line = null; }
    }
  },

  /* ZENITH — it drafted what you drafted */
  zenith(e, dte, dtr, t, ang) {
    if (e.cores == null) {
      e.cores = Object.values(G.cores || {}).reduce((a, b) => a + b, 0);
      e.rate = 1 + (G.cores.clock || 0) * .25;
      e.shots = 1 + (G.cores.split || 0);
      e.blink = 1;
    }
    e.timer -= dtr * e.rate;
    if (e.state === 0) {
      standOff(e, t, 240, dte, .9);
      if (e.timer <= 0) {
        /* it dashes, exactly like you do */
        e.state = 1; e.timer = .22;
        e.lockAng = ang;
        ring(e.x, e.y, ecol(EN.zenith.col), 6, 50, .3, 2);
        Audio_.dash();
      }
    } else if (e.state === 1) {
      e.x += Math.cos(e.lockAng) * 900 * dte;
      e.y += Math.sin(e.lockAng) * 900 * dte;
      G.ghosts.push({ x: e.x, y: e.y, ang: e.lockAng, r: e.r, life: .3, max: .3,
        col: ecol(EN.zenith.col), a: .5, grow: .2 });
      nearEdgeClamp(e, 40);
      if (e.timer <= 0) { e.state = 2; e.timer = .9; }
    } else {
      standOff(e, t, 200, dte, -.6);
      if (e.timer <= 0) {
        e.state = 0; e.timer = rnd(1.2, 2);
        const n = Math.min(5, e.shots);
        const sp = n > 1 ? .07 * (n - 1) : 0;
        for (let i = 0; i < n; i++) {
          enemyShoot(e, ang + (n > 1 ? -sp + (2 * sp * i) / (n - 1) : 0), 620, e.dmg * .5, 4);
        }
        Audio_.shoot(.7);
      }
    }
  },

  /* --- OMEGA-00 ------------------------------------------------------- */
  omega(e, dte, dtr, t, ang) {
    const f = e.hp / e.maxHp;
    const wasPhase = e.phase || 0;
    e.phase = f < .3 ? 2 : f < .65 ? 1 : 0;
    if (e.phase !== wasPhase) {
      flash(.16, ecol(EN.omega.col));
      shake(.5);
      ring(e.x, e.y, ecol(EN.omega.col), 20, 420, .7, 5);
      if (e.phase === 2) {
        e.flawless = 1;
        banner("One second ahead", "it has the lead now");
        Audio_.omegaShift();
      } else banner("OMEGA-00", "phase " + (e.phase + 1));
    }
    e.spin = (e.spin || 0) + dte * (.8 + e.phase * .4);
    e.timer -= dte;
    /* it flies like a pilot: burst of speed, reposition, hold a line */
    const d = dist(e, t) || 1;
    const want = e.phase >= 2 ? 200 : 280;
    const push = d < want - 50 ? -1 : d > want + 50 ? 1 : 0;
    const strafe = Math.sin(G.time * 1.3) * 1.2;
    e.x += (Math.cos(ang) * push + Math.cos(ang + Math.PI / 2) * strafe) * e.sp * dte;
    e.y += (Math.sin(ang) * push + Math.sin(ang + Math.PI / 2) * strafe) * e.sp * dte;
    nearEdgeClamp(e, 60);
    if (e.timer <= 0) {
      const roll = rint(0, e.phase >= 1 ? 4 : 2);
      if (roll === 0) {
        /* aimed burst — your gun, its hands */
        e.volley = 8 + e.phase * 5; e.volleyT = 0;
        e.timer = 2.6 - e.phase * .4;
      } else if (roll === 1) {
        /* it dashes through you and leaves a burning wake */
        e.dashA = ang; e.dashT = .34;
        trace({ thru: 1, x: e.x, y: e.y, ang, len: 620, wide: 40, warn: .5, live: .2, fade: .8,
          dmg: 26, dot: 12, owner: "omega", col: ecol(EN.omega.col), follow: e, aim: 1 });
        Audio_.lock(1.1);
        e.timer = 3 - e.phase * .4;
      } else if (roll === 2) {
        /* it drops decoys of itself — they fight like echoes do */
        for (let i = 0; i < 1 + e.phase; i++) {
          const a = rnd(TAU);
          G.omegaEchoes.push({ x: clamp(e.x + Math.cos(a) * 130, 50, W - 50),
            y: clamp(e.y + Math.sin(a) * 130, 50, H - 50), ang: a, life: 6, max: 6, fire: 0 });
        }
        text(e.x, e.y - e.r - 26, "echo", TH.echo, 15);
        Audio_.echo();
        e.timer = 3.4 - e.phase * .4;
      } else if (roll === 3) {
        /* purge cross — the same move the Paradox used, done properly */
        const a0 = ang;
        for (let k = 0; k < 4; k++) {
          trace({ thru: 1, x: e.x, y: e.y, ang: a0 + k * Math.PI / 2, len: Math.max(W, H) * 1.3, wide: 26,
            warn: .85, live: .3, fade: 1.2, dmg: 28, dot: 12, spin: .55,
            owner: "omega", col: ecol(EN.omega.col), follow: e, stick: 1 });
        }
        Audio_.lock(.4);
        e.timer = 3.8 - e.phase * .5;
      } else {
        /* time-swap: it trades places with its furthest decoy */
        let best = null, bd = -1;
        for (const c of G.omegaEchoes) { const dd = dist(c, e); if (dd > bd) { bd = dd; best = c; } }
        if (best) {
          ring(e.x, e.y, ecol(EN.omega.col), 8, 90, .4, 3);
          const tx = best.x, ty = best.y;
          best.x = e.x; best.y = e.y; e.x = tx; e.y = ty;
          ring(e.x, e.y, ecol(EN.omega.col), 8, 90, .4, 3);
          Audio_.swap();
        }
        e.timer = 2.2;
      }
    }
    if (e.dashT > 0) {
      e.dashT -= dte;
      e.x += Math.cos(e.dashA) * 1000 * dte;
      e.y += Math.sin(e.dashA) * 1000 * dte;
      nearEdgeClamp(e, 50);
      G.ghosts.push({ x: e.x, y: e.y, ang: e.dashA, r: e.r, life: .3, max: .3,
        col: ecol(EN.omega.col), a: .45, grow: .25 });
    }
    if (e.volley > 0) {
      e.volleyT -= dte;
      if (e.volleyT <= 0) {
        e.volleyT = .11;
        e.volley--;
        const lead = e.phase >= 2 ? 1 : .4; /* in phase 3 it shoots where you will be */
        const px = t.x + (t.vx || 0) * lead * .35, py = t.y + (t.vy || 0) * lead * .35;
        enemyShoot(e, Math.atan2(py - e.y, px - e.x) + rnd(-.05, .05), 700, 15, 5);
        Audio_.shoot(.65);
      }
    }
  },
};

