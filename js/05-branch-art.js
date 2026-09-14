/* Procedural art for the enemies and hero/echo silhouettes unique to the four filed timelines (branches), plus the drawEnemy dispatcher. */
/* =====================================================================
   BRANCH ART — the inhabitants of the four filed timelines.
   House rule for this set: nothing in here is an animal. They are
   instruments. Cut glass, machined plate, lens housings, wireframe.
   Everything reads at 13px because everything is built from silhouette
   first and detail second.
   ===================================================================== */

/* ---- impact read (shared by every enemy, applied in drawEnemy) ---------
   The shove tween doubles as the squash driver: shoveStretch() in
   09-enemies-and-render.js returns 0..1 for how far into a shove the body
   is and how hard it was hit, and this is the only knob for how much of
   that turns into deformation. One pulse lands near .03, a dash-through
   near .16, the heaviest shoves pin the cap. */
const KB_STRETCH_MAX = .2;    /* stretch ceiling, as a fraction of scale */
const HIT_POP = .13;          /* extra scale at the peak of a hit flash */

/* shared: a slow specular sweep across a hard surface */
function sheen(r, phase, col, a) {
  ctx.save();
  ctx.rotate(phase);
  const g = ctx.createLinearGradient(-r, 0, r, 0);
  g.addColorStop(0, "rgba(" + col + ",0)");
  g.addColorStop(.5, "rgba(" + col + "," + (a == null ? .45 : a) + ")");
  g.addColorStop(1, "rgba(" + col + ",0)");
  ctx.fillStyle = g;
  ctx.fillRect(-r, -r * .18, r * 2, r * .36);
  ctx.restore();
}
/* shared: an orbiting ring of small hard shapes */
function orbitRing(r, n, sz, sides, spin, col, squash) {
  for (let i = 0; i < n; i++) {
    const a = spin + (i / n) * TAU;
    ctx.save();
    ctx.translate(Math.cos(a) * r, Math.sin(a) * r * (squash == null ? 1 : squash));
    ctx.rotate(a * 1.6);
    ctx.fillStyle = col;
    polyPath(sz, sides || 3, 0); ctx.fill();
    ctx.restore();
  }
}
/* shared: a clean machined lens / optic */
function optic(x, y, r, col, hot, ang) {
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = "rgba(10,14,22,.85)";
  ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
  const g = ctx.createRadialGradient(-r * .2, -r * .2, 0, 0, 0, r);
  g.addColorStop(0, "rgba(" + col + "," + (.45 + hot * .55) + ")");
  g.addColorStop(1, "rgba(" + col + ",0)");
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
  ctx.strokeStyle = "rgba(" + col + "," + (.5 + hot * .5) + ")"; ctx.lineWidth = 1.3;
  ctx.beginPath(); ctx.arc(0, 0, r * .96, 0, TAU); ctx.stroke();
  if (hot > .05) {
    ctx.strokeStyle = "rgba(255,255,255," + (hot * .8) + ")"; ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(Math.cos(ang || 0) * r * .3, Math.sin(ang || 0) * r * .3);
    ctx.lineTo(Math.cos(ang || 0) * r * .82, Math.sin(ang || 0) * r * .82);
    ctx.stroke();
  }
  ctx.restore();
}
/* shared: a wireframe pass of any path — used across Terminus */
function wire(fn, col, w, a) {
  ctx.save();
  ctx.globalAlpha = a == null ? 1 : a;
  ctx.strokeStyle = col; ctx.lineWidth = w || 1.2; ctx.lineJoin = "round";
  fn(); ctx.stroke();
  ctx.restore();
}

Object.assign(ART, {

  /* ================= GLASSFALL ======================================= */

  /* FACET — a cut tetrahedron caught mid-fall, throwing three refractions */
  facet(e, c) {
    const r = e.r, t = e.state === 1 ? 1 : 0;
    const pale = "rgb(" + shade(c, 1.35, .45, [255, 255, 255]) + ")";
    const deep = "rgb(" + shade(c, .32) + ")";
    ctx.save();
    ctx.rotate(e.wob * .35 + e.ang * .2);
    /* refraction ghosts — the same shape, offset, at split channels */
    for (let i = 0; i < 3; i++) {
      const off = (i - 1) * (2 + t * 6);
      ctx.globalAlpha = .28;
      ctx.fillStyle = ["rgba(255,90,120,1)", "rgba(120,255,180,1)", "rgba(120,170,255,1)"][i];
      ctx.save(); ctx.translate(off, off * .4);
      polyPath(r * 1.02, 3, 0); ctx.fill();
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    /* body */
    ctx.fillStyle = bodyGrad("facetB", r, pale, deep);
    polyPath(r, 3, 0); ctx.fill();
    /* internal cut lines */
    ctx.strokeStyle = "rgba(" + shade(c, 1.5, .6, [255, 255, 255]) + ",.7)";
    ctx.lineWidth = 1.1;
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * TAU - Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      ctx.lineTo(0, 0);
      ctx.stroke();
    }
    ctx.strokeStyle = "rgba(" + shade(c, 1.6, .7, [255, 255, 255]) + ",.9)";
    ctx.lineWidth = 1.6;
    polyPath(r, 3, 0); ctx.stroke();
    /* charge core */
    const hot = .2 + t * .8 + Math.sin(G.time * 4 + e.wob) * .08;
    ctx.fillStyle = "rgba(255,255,255," + hot + ")";
    ctx.beginPath(); ctx.arc(0, 0, r * (.16 + t * .14), 0, TAU); ctx.fill();
    ctx.restore();
    /* the three rays it is about to throw */
    if (t) {
      ctx.save(); ctx.rotate(e.lockAng);
      for (let i = -1; i <= 1; i++) {
        ctx.strokeStyle = "rgba(" + shade(c, 1.4, .5, [255, 255, 255]) + ",.35)";
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(r, 0);
        ctx.lineTo(Math.cos(i * .34) * r * 5, Math.sin(i * .34) * r * 5);
        ctx.stroke();
      }
      ctx.restore();
    }
    glowPool(0, 0, r * 2.2, c, .1 + t * .12);
    rimLight(r);
  },

  /* PRISM — a turning column of clear glass with one lit reflecting face */
  prism(e, c) {
    const r = e.r, spin = e.wob * .8;
    const face = Math.cos(spin - (e.ang || 0)); /* >0 = lit face toward you */
    const pale = "rgb(" + shade(c, 1.3, .5, [255, 255, 255]) + ")";
    ctx.save();
    ctx.rotate(spin);
    /* column: hexagonal, tall, with a cap ellipse so it reads as a solid */
    ctx.fillStyle = bodyGrad("prismB", r, pale, "rgb(" + shade(c, .3) + ")");
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU;
      const x = Math.cos(a) * r * .62, y = Math.sin(a) * r * .62 * 1.95;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.closePath(); ctx.fill();
    for (const sgn of [-1, 1]) {
      ctx.fillStyle = sgn < 0 ? "rgba(" + shade(c, 1.5, .6, [255, 255, 255]) + ",.9)" : "rgba(" + shade(c, .42) + ",.95)";
      ctx.beginPath();
      ctx.ellipse(0, sgn * r * 1.21, r * .62, r * .2, 0, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,.55)"; ctx.lineWidth = 1; ctx.stroke();
    }
    /* vertical cut ribs */
    ctx.strokeStyle = "rgba(" + shade(c, 1.6, .7, [255, 255, 255]) + ",.55)";
    ctx.lineWidth = 1;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(i * r * .31, -r * 1.15);
      ctx.lineTo(i * r * .31, r * 1.15);
      ctx.stroke();
    }
    ctx.strokeStyle = "rgba(" + shade(c, 1.7, .8, [255, 255, 255]) + ",.9)";
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU;
      const x = Math.cos(a) * r * .62, y = Math.sin(a) * r * .62 * 1.95;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.closePath(); ctx.stroke();
    ctx.restore();
    /* the lit face — a mirror plane that reads as "this side reflects" */
    if (face > 0) {
      ctx.save();
      ctx.rotate(e.ang);
      ctx.globalAlpha = clamp(face, 0, 1) * .85;
      const g = ctx.createLinearGradient(r * .3, -r, r * .9, r);
      g.addColorStop(0, "rgba(255,255,255,.05)");
      g.addColorStop(.5, "rgba(255,255,255,.75)");
      g.addColorStop(1, "rgba(255,255,255,.05)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(r * .36, -r * 1.2); ctx.lineTo(r * .7, -r * .72);
      ctx.lineTo(r * .7, r * .72); ctx.lineTo(r * .36, r * 1.2);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    /* spectral split spilling off the column */
    ctx.globalAlpha = .3;
    for (let i = 0; i < 3; i++) {
      ctx.strokeStyle = ["rgb(255,110,140)", "rgb(140,255,190)", "rgb(140,180,255)"][i];
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(0, 0, r * (1.28 + i * .12), spin + i * .2, spin + 1.1 + i * .2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    glowPool(0, 0, r * 2.4, c, .12);
    rimLight(r);
  },

  /* RIME — a needle of ice with a cold contrail */
  rime(e, c) {
    const r = e.r;
    const pale = "rgb(" + shade(c, 1.4, .55, [255, 255, 255]) + ")";
    ctx.save();
    ctx.rotate(e.ang);
    /* contrail feathers */
    ctx.globalAlpha = .5;
    for (let i = 1; i <= 4; i++) {
      ctx.strokeStyle = "rgba(" + shade(c, 1.2, .5, [255, 255, 255]) + "," + (.5 / i) + ")";
      ctx.lineWidth = 2.4 - i * .4;
      ctx.beginPath();
      ctx.moveTo(-r * (.6 + i * .55), 0);
      ctx.lineTo(-r * (.2 + i * .55), Math.sin(e.wob * 3 + i) * r * .5);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    /* outrigger shards, cut from the same crystal, canted back */
    for (const sgn of [-1, 1]) {
      ctx.save();
      ctx.translate(-r * .05, sgn * r * .5);
      ctx.rotate(sgn * .38);
      ctx.fillStyle = "rgba(" + shade(c, .8) + ",.95)";
      ctx.beginPath();
      ctx.moveTo(r * .75, 0); ctx.lineTo(-r * .55, sgn * r * .3); ctx.lineTo(-r * .5, -sgn * r * .12);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,.6)"; ctx.lineWidth = 1; ctx.stroke();
      ctx.restore();
    }
    /* dart body — a long faceted spear */
    ctx.fillStyle = bodyGrad("rimeB", r, pale, "rgb(" + shade(c, .34) + ")");
    ctx.beginPath();
    ctx.moveTo(r * 1.85, 0);
    ctx.lineTo(r * .1, r * .52);
    ctx.lineTo(-r * .95, r * .2);
    ctx.lineTo(-r * .95, -r * .2);
    ctx.lineTo(r * .1, -r * .52);
    ctx.closePath(); ctx.fill();
    /* the facet split down the spine, so it catches light like cut ice */
    ctx.fillStyle = "rgba(255,255,255,.32)";
    ctx.beginPath();
    ctx.moveTo(r * 1.85, 0); ctx.lineTo(r * .1, -r * .52); ctx.lineTo(-r * .95, -r * .2);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,.85)"; ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(r * 1.85, 0);
    ctx.lineTo(r * .1, r * .52); ctx.lineTo(-r * .95, r * .2);
    ctx.lineTo(-r * .95, -r * .2); ctx.lineTo(r * .1, -r * .52);
    ctx.closePath(); ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,.5)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(r * 1.85, 0); ctx.lineTo(-r * .95, 0); ctx.stroke();
    /* the cold core */
    ctx.fillStyle = "rgba(255,255,255,.95)";
    ctx.beginPath(); ctx.arc(r * .32, 0, r * .19, 0, TAU); ctx.fill();
    ctx.strokeStyle = "rgba(" + shade(c, 1.4, .4, [255, 255, 255]) + ",.9)"; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(r * .32, 0, r * .3, 0, TAU); ctx.stroke();
    ctx.restore();
    glowPool(0, 0, r * 2, c, .1);
    rimLight(r);
  },

  /* SILICA — a slab carrier that plants pillars */
  silica(e, c) {
    const r = e.r, load = clamp(1 - (e.timer || 0) / 3.4, 0, 1);
    const pale = "rgb(" + shade(c, 1.2, .4, [255, 255, 255]) + ")";
    const deep = "rgb(" + shade(c, .3) + ")";
    softShadow(0, r * .5, r * 1.3, r * .5);
    ctx.save();
    ctx.rotate(e.ang);
    /* four pillar sockets around the hull, filling as it charges */
    for (let i = 0; i < 4; i++) {
      const a = e.wob * .3 + (i / 4) * TAU;
      ctx.save();
      ctx.translate(Math.cos(a) * r * 1.15, Math.sin(a) * r * 1.15);
      ctx.rotate(a);
      ctx.fillStyle = deep;
      rrect(-r * .18, -r * .3, r * .36, r * .6, r * .1); ctx.fill();
      ctx.fillStyle = "rgba(" + shade(c, 1.5, .6, [255, 255, 255]) + "," + (.2 + load * .8) + ")";
      rrect(-r * .1, -r * .22 + (1 - load) * r * .4, r * .2, r * .44 * load, r * .06); ctx.fill();
      ctx.restore();
    }
    /* hull: a stacked slab */
    ctx.fillStyle = bodyGrad("silicaB", r, pale, deep);
    polyPath(r, 6, .26); ctx.fill();
    ctx.fillStyle = "rgba(" + shade(c, .5) + ",.9)";
    polyPath(r * .74, 6, .26); ctx.fill();
    /* engraved lattice */
    ctx.strokeStyle = "rgba(255,255,255,.32)"; ctx.lineWidth = .9;
    for (let i = 0; i < 6; i++) {
      const a = .26 + (i / 6) * TAU;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r * .74, Math.sin(a) * r * .74);
      ctx.lineTo(Math.cos(a + 2.09) * r * .74, Math.sin(a + 2.09) * r * .74);
      ctx.stroke();
    }
    sheen(r, e.wob * .5, "255,255,255", .3);
    /* the socket in the middle it fires the pillars out of */
    optic(0, 0, r * .3, c, load, e.wob);
    ctx.strokeStyle = "rgba(" + shade(c, 1.6, .7, [255, 255, 255]) + ",.9)";
    ctx.lineWidth = 2; polyPath(r, 6, .26); ctx.stroke();
    ctx.restore();
    glowPool(0, 0, r * 2.3, c, .11 + load * .1);
    rimLight(r);
  },

  /* KELVIN — a suspended cold source inside a closing ring */
  kelvin(e, c) {
    const r = e.r, t = clamp(e.charge || 0, 0, 1);
    const pale = "rgb(" + shade(c, 1.4, .5, [255, 255, 255]) + ")";
    /* three concentric gyros, closing as it charges */
    for (let i = 0; i < 3; i++) {
      ctx.save();
      ctx.rotate(e.wob * (i % 2 ? -.5 : .7) + i);
      ctx.strokeStyle = "rgba(" + shade(c, 1.2 - i * .1, .4, [255, 255, 255]) + "," + (.75 - i * .16) + ")";
      ctx.lineWidth = 2.2 - i * .5;
      ctx.beginPath();
      ctx.ellipse(0, 0, r * (1.5 - t * .35 + i * .26), r * (1.5 - t * .35 + i * .26) * (.3 + i * .3), i * .8, 0, TAU);
      ctx.stroke();
      ctx.restore();
    }
    /* frost needles pointing inward */
    ctx.save(); ctx.rotate(-e.wob * .4);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU;
      ctx.strokeStyle = "rgba(255,255,255," + (.2 + t * .5) + ")";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r * 1.3, Math.sin(a) * r * 1.3);
      ctx.lineTo(Math.cos(a) * r * (.9 - t * .2), Math.sin(a) * r * (.9 - t * .2));
      ctx.stroke();
    }
    ctx.restore();
    /* core: an octahedron, very cold */
    ctx.save(); ctx.rotate(e.wob * .3);
    ctx.fillStyle = bodyGrad("kelvinB", r, pale, "rgb(" + shade(c, .3) + ")");
    polyPath(r * .8, 4, 0); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255," + (.35 + t * .5) + ")";
    polyPath(r * .44, 4, Math.PI / 4); ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,.9)"; ctx.lineWidth = 1.5;
    polyPath(r * .8, 4, 0); ctx.stroke();
    ctx.restore();
    glowPool(0, 0, r * 3, c, .1 + t * .16);
    rimLight(r);
  },

  /* THE STILL HOUR — a glass orrery holding 11:59 open */
  stillhour(e, c) {
    const r = e.r, ph = e.phase || 0, sp = e.spin || 0;
    const pale = "rgb(" + shade(c, 1.35, .5, [255, 255, 255]) + ")";
    /* outer armillary — three tilted glass hoops */
    for (let i = 0; i < 3; i++) {
      ctx.save();
      ctx.rotate(sp * (i % 2 ? -.35 : .5) + i * 1.1);
      ctx.strokeStyle = "rgba(" + shade(c, 1.2, .45, [255, 255, 255]) + "," + (.5 - i * .09) + ")";
      ctx.lineWidth = 4 - i;
      ctx.beginPath();
      ctx.ellipse(0, 0, r + 46 + i * 30, (r + 46 + i * 30) * (.26 + i * .22), i * .9, 0, TAU);
      ctx.stroke();
      ctx.restore();
    }
    /* orbiting facets — one broken away per phase */
    for (let i = 0; i < 4; i++) {
      if (i < ph) continue;
      const a = sp * 1.1 + (i / 4) * TAU;
      const rr = r + 62;
      ctx.save();
      ctx.translate(Math.cos(a) * rr, Math.sin(a) * rr * .55);
      ctx.rotate(a * 1.7);
      ctx.fillStyle = pale;
      polyPath(11, 3, 0); ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,.9)"; ctx.lineWidth = 1.2;
      polyPath(11, 3, 0); ctx.stroke();
      ctx.restore();
    }
    /* the dial: a clock face made of glass, with a real hand */
    ctx.save();
    ctx.fillStyle = bodyGrad("shBody", r, pale, "rgb(" + shade(c, .26) + ")");
    ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
    ctx.fillStyle = "rgba(" + shade(c, .3) + ",.9)";
    ctx.beginPath(); ctx.arc(0, 0, r * .82, 0, TAU); ctx.fill();
    /* hour marks — twelve cut wedges, the twelve slot lit */
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU - Math.PI / 2;
      const twelve = i === 0;
      ctx.strokeStyle = twelve ? "rgba(255,255,255,.95)" : "rgba(" + shade(c, 1.5, .6, [255, 255, 255]) + ",.5)";
      ctx.lineWidth = twelve ? 3.2 : 1.4;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r * .62, Math.sin(a) * r * .62);
      ctx.lineTo(Math.cos(a) * r * (twelve ? .8 : .74), Math.sin(a) * r * (twelve ? .8 : .74));
      ctx.stroke();
    }
    /* the hand — secrets live on this */
    const ha = e.handAng == null ? -Math.PI / 2 : e.handAng;
    ctx.save();
    ctx.rotate(ha);
    const g = ctx.createLinearGradient(0, 0, r * .78, 0);
    g.addColorStop(0, "rgba(255,255,255,.95)");
    g.addColorStop(1, "rgba(" + shade(c, 1.4, .5, [255, 255, 255]) + ",.4)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-r * .1, -r * .05); ctx.lineTo(r * .78, -r * .022);
    ctx.lineTo(r * .82, 0); ctx.lineTo(r * .78, r * .022);
    ctx.lineTo(-r * .1, r * .05);
    ctx.closePath(); ctx.fill();
    ctx.restore();
    /* frozen minute hand, stuck one tick short of the hour */
    ctx.save();
    ctx.rotate(-Math.PI / 2 - .14);
    ctx.fillStyle = "rgba(255,255,255,.35)";
    ctx.fillRect(-r * .06, -r * .028, r * .58, r * .056);
    ctx.restore();
    /* centre boss */
    ctx.fillStyle = "rgba(255,255,255,.9)";
    ctx.beginPath(); ctx.arc(0, 0, r * .1, 0, TAU); ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,.85)"; ctx.lineWidth = 2.6;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.stroke();
    sheen(r, sp * .7, "255,255,255", .22);
    ctx.restore();
    glowPool(0, 0, r * 3, c, .14 + ph * .05);
    rimLight(r);
  },

  /* ================= EMBERWAKE ======================================= */

  /* FILAMENT — an incandescent needle, one half of a burning pair */
  filament(e, c) {
    const r = e.r;
    const hot = "rgb(" + shade(c, 1.5, .5, [255, 240, 200]) + ")";
    ctx.save();
    ctx.rotate(e.ang);
    /* the coil housing */
    ctx.fillStyle = bodyGrad("filB", r, hot, "rgb(" + shade(c, .3) + ")");
    ctx.beginPath();
    ctx.moveTo(r * 1.4, 0);
    ctx.lineTo(0, r * .5);
    ctx.lineTo(-r * .9, r * .28);
    ctx.lineTo(-r * .9, -r * .28);
    ctx.lineTo(0, -r * .5);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "rgba(255,240,210,.8)"; ctx.lineWidth = 1.2; ctx.stroke();
    /* the coil itself, glowing */
    ctx.strokeStyle = "rgba(255,255,235," + (.6 + Math.sin(G.time * 9 + e.wob) * .3) + ")";
    ctx.lineWidth = 1.8; ctx.lineCap = "round";
    ctx.beginPath();
    for (let i = 0; i <= 10; i++) {
      const f = i / 10;
      const x = lerp(-r * .7, r * .9, f);
      const y = Math.sin(f * 9 + e.wob * 2) * r * .22;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.stroke();
    /* the two terminals — one at each end, so a pair obviously strings between them */
    for (const [tx, sz] of [[r * 1.25, .26], [-r * .95, .2]]) {
      ctx.fillStyle = "rgb(" + shade(c, .5) + ")";
      ctx.beginPath(); ctx.arc(tx, 0, r * (sz + .1), 0, TAU); ctx.fill();
      ctx.fillStyle = "rgba(255,250,230,.95)";
      ctx.beginPath(); ctx.arc(tx, 0, r * sz, 0, TAU); ctx.fill();
      ctx.strokeStyle = "rgba(255,240,200," + (.5 + Math.sin(G.time * 7 + e.wob) * .3) + ")";
      ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.arc(tx, 0, r * (sz + .24), 0, TAU); ctx.stroke();
    }
    ctx.restore();
    glowPool(0, 0, r * 2.6, c, .16);
    rimLight(r);
  },

  /* CORONA — a ringed solar disc breathing heat outward */
  corona(e, c) {
    const r = e.r, beat = (Math.sin(G.time * 2.4 + e.wob) + 1) / 2;
    const hot = "rgb(" + shade(c, 1.5, .45, [255, 244, 210]) + ")";
    /* petal ring — a corona of tapered blades */
    ctx.save();
    ctx.rotate(e.wob * .5);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU;
      const l = r * (1.35 + (i % 2 ? .3 : .12) + beat * .22);
      ctx.save(); ctx.rotate(a);
      ctx.fillStyle = "rgba(" + shade(c, 1.2, .3, [255, 220, 160]) + "," + (.5 + beat * .35) + ")";
      ctx.beginPath();
      ctx.moveTo(r * .85, -r * .16);
      ctx.lineTo(l, 0);
      ctx.lineTo(r * .85, r * .16);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    ctx.restore();
    /* concentric machined rings */
    for (let i = 0; i < 3; i++) {
      ctx.strokeStyle = "rgba(" + shade(c, 1.1 - i * .12, .2, [255, 230, 180]) + "," + (.85 - i * .2) + ")";
      ctx.lineWidth = 2.4 - i * .6;
      ctx.beginPath(); ctx.arc(0, 0, r * (.92 - i * .22), 0, TAU); ctx.stroke();
    }
    /* core disc */
    ctx.fillStyle = bodyGrad("coronaB", r, hot, "rgb(" + shade(c, .32) + ")");
    ctx.beginPath(); ctx.arc(0, 0, r * .58, 0, TAU); ctx.fill();
    ctx.fillStyle = "rgba(255,250,225," + (.5 + beat * .45) + ")";
    ctx.beginPath(); ctx.arc(0, 0, r * (.22 + beat * .1), 0, TAU); ctx.fill();
    /* the count marks — four, so the rhythm is readable */
    ctx.save(); ctx.rotate(e.wob * .5);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * TAU;
      ctx.fillStyle = i <= beat * 4 ? "rgba(255,255,240,.95)" : "rgba(255,255,240,.22)";
      ctx.beginPath();
      ctx.arc(Math.cos(a) * r * .74, Math.sin(a) * r * .74, r * .09, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
    glowPool(0, 0, r * 3, c, .16 + beat * .1);
    rimLight(r);
  },

  /* CINDER — a small ember on a gimbal, orbiting then dropping */
  cinder(e, c) {
    const r = e.r, dive = e.state === 2 ? 1 : 0;
    ctx.save();
    ctx.rotate(e.ang + (dive ? 0 : e.wob));
    /* trailing sparks */
    for (let i = 1; i <= 3; i++) {
      ctx.fillStyle = "rgba(" + shade(c, 1.3, .3, [255, 220, 150]) + "," + (.4 / i) + ")";
      ctx.beginPath();
      ctx.arc(-r * i * .7, Math.sin(e.wob * 4 + i) * r * .3, r * (.4 / i), 0, TAU);
      ctx.fill();
    }
    /* gimbal ring — it is a dropped munition, not a spark */
    ctx.save();
    ctx.rotate(-e.wob * 1.6);
    ctx.strokeStyle = "rgba(" + shade(c, .9) + ",.9)"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(0, 0, r * 1.4, r * .58, .5, 0, TAU); ctx.stroke();
    ctx.restore();
    /* three vanes around the core */
    for (let i = 0; i < 3; i++) {
      ctx.save();
      ctx.rotate((i / 3) * TAU + e.wob * .8);
      ctx.fillStyle = "rgba(" + shade(c, .7) + ",.95)";
      ctx.beginPath();
      ctx.moveTo(r * .34, -r * .2); ctx.lineTo(r * 1.25, -r * .06);
      ctx.lineTo(r * 1.25, r * .06); ctx.lineTo(r * .34, r * .2);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    /* body: a machined ember cell */
    ctx.fillStyle = bodyGrad("cinderB", r, "rgb(" + shade(c, 1.5, .4, [255, 236, 190]) + ")", "rgb(" + shade(c, .34) + ")");
    polyPath(r * .78, 6, e.wob * .4); ctx.fill();
    ctx.strokeStyle = "rgba(255,236,200,.9)"; ctx.lineWidth = 1.4;
    polyPath(r * .78, 6, e.wob * .4); ctx.stroke();
    ctx.fillStyle = "rgba(255,252,235," + (.65 + dive * .35) + ")";
    ctx.beginPath(); ctx.arc(0, 0, r * (.32 + dive * .12), 0, TAU); ctx.fill();
    ctx.restore();
    glowPool(0, 0, r * 2.6, c, .14 + dive * .12);
    rimLight(r);
  },

  /* HELION — a plated sun-tank; armoured everywhere but the vent */
  helion(e, c) {
    const r = e.r, charge = e.state === 1 ? clamp(1 - e.timer / .9, 0, 1) : e.state === 2 ? 1 : 0;
    const plateC = "rgb(" + shade(c, .8) + ")";
    softShadow(0, r * .55, r * 1.35, r * .5);
    ctx.save();
    ctx.rotate(e.ang);
    /* the vent cone at the front, opening as it charges */
    if (charge > .02) {
      const g = ctx.createLinearGradient(r * .6, 0, r * (2.4 + charge * 1.6), 0);
      g.addColorStop(0, "rgba(255,240,200," + (.55 * charge) + ")");
      g.addColorStop(1, "rgba(" + c + ",0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(r * .5, 0);
      ctx.lineTo(Math.cos(.42) * r * (3 + charge * 2), Math.sin(.42) * r * (3 + charge * 2));
      ctx.lineTo(Math.cos(-.42) * r * (3 + charge * 2), Math.sin(-.42) * r * (3 + charge * 2));
      ctx.closePath(); ctx.fill();
    }
    /* rear + flank plating: overlapping heat shields */
    for (let i = 0; i < 5; i++) {
      const a = Math.PI * (.42 + i * .29);
      ctx.save(); ctx.rotate(a);
      ctx.fillStyle = plateC;
      rrect(r * .55, -r * .34, r * .5, r * .68, r * .12); ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,.22)"; ctx.lineWidth = 1; ctx.stroke();
      ctx.restore();
    }
    /* hull */
    ctx.fillStyle = bodyGrad("helionB", r, "rgb(" + shade(c, 1.25, .3, [255, 240, 210]) + ")", "rgb(" + shade(c, .3) + ")");
    polyPath(r, 8, .2); ctx.fill();
    ctx.strokeStyle = "rgba(255,240,210,.85)"; ctx.lineWidth = 2;
    polyPath(r, 8, .2); ctx.stroke();
    /* vent grille at the nose — the soft face */
    ctx.fillStyle = "rgba(20,10,6,.85)";
    rrect(r * .5, -r * .42, r * .34, r * .84, r * .1); ctx.fill();
    for (let i = -2; i <= 2; i++) {
      ctx.fillStyle = "rgba(255," + Math.round(180 + charge * 70) + ",120," + (.3 + charge * .65) + ")";
      ctx.fillRect(r * .54, i * r * .16 - r * .05, r * .26, r * .1);
    }
    /* the pilot optic */
    optic(-r * .1, 0, r * .26, c, .3 + charge * .6, 0);
    sheen(r, e.wob * .4, "255,240,210", .25);
    ctx.restore();
    glowPool(0, 0, r * 2.6, c, .12 + charge * .16);
    rimLight(r);
  },

  /* IGNIS — a heat-reading turret; brighter the hotter your gun is */
  ignis(e, c) {
    const r = e.r;
    const heat = clamp(G.heat || 0, 0, 1);
    const lit = .25 + heat * .75;
    ctx.save();
    ctx.rotate(e.wob * .6);
    /* gauge ring — literally shows your heat back at you */
    ctx.strokeStyle = "rgba(" + shade(c, .8) + ",.5)"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 0, r * 1.32, 0, TAU); ctx.stroke();
    ctx.strokeStyle = "rgba(255,220,160," + (.4 + heat * .6) + ")"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 0, r * 1.32, -Math.PI / 2, -Math.PI / 2 + TAU * heat); ctx.stroke();
    ctx.restore();
    ctx.save();
    ctx.rotate(e.ang);
    /* body: a lean twin-barrel head */
    ctx.fillStyle = bodyGrad("ignisB", r, "rgb(" + shade(c, 1.35, .3, [255, 220, 180]) + ")", "rgb(" + shade(c, .3) + ")");
    ctx.beginPath();
    ctx.moveTo(r * 1.15, 0);
    ctx.lineTo(r * .2, r * .78);
    ctx.lineTo(-r * .85, r * .42);
    ctx.lineTo(-r * .85, -r * .42);
    ctx.lineTo(r * .2, -r * .78);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "rgba(255,225,190,.9)"; ctx.lineWidth = 1.6; ctx.stroke();
    /* barrels */
    for (const sgn of [-1, 1]) {
      ctx.fillStyle = "rgb(" + shade(c, .42) + ")";
      rrect(r * .6, sgn * r * .18 - r * .1, r * .7, r * .2, r * .06); ctx.fill();
      ctx.fillStyle = "rgba(255,240,200," + lit + ")";
      ctx.beginPath(); ctx.arc(r * 1.28, sgn * r * .28, r * .1, 0, TAU); ctx.fill();
    }
    optic(-r * .05, 0, r * .3, c, lit, 0);
    ctx.restore();
    glowPool(0, 0, r * 2.4, c, .1 + heat * .16);
    rimLight(r);
  },

  /* PERIHELION — a star engine mid-collapse */
  perihelion(e, c) {
    const r = e.r, ph = e.phase || 0, sp = e.spin || 0;
    const pull = clamp(e.pullT || 0, 0, 1);
    /* accretion streams spiralling inward */
    ctx.save();
    ctx.rotate(sp * .5);
    for (let i = 0; i < 10; i++) {
      const a0 = (i / 10) * TAU;
      ctx.strokeStyle = "rgba(" + shade(c, 1.1, .25, [255, 230, 180]) + "," + (.14 + pull * .3) + ")";
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      for (let k = 0; k <= 12; k++) {
        const f = k / 12;
        const rr = lerp(r * 4.4, r * 1.05, f);
        const a = a0 + f * 1.5;
        const x = Math.cos(a) * rr, y = Math.sin(a) * rr;
        k ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.stroke();
    }
    ctx.restore();
    /* containment cage — segmented arcs, shedding a segment per phase */
    for (let i = 0; i < 8; i++) {
      if (i % 3 === 0 && i / 3 < ph) continue;
      const a = sp * .7 + (i / 8) * TAU;
      ctx.strokeStyle = "rgba(" + shade(c, .95) + ",.8)";
      ctx.lineWidth = 5;
      ctx.beginPath(); ctx.arc(0, 0, r * 1.26, a, a + .58); ctx.stroke();
      ctx.strokeStyle = "rgba(255,240,200,.4)"; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.arc(0, 0, r * 1.26, a, a + .58); ctx.stroke();
    }
    /* the star */
    const g = ctx.createRadialGradient(0, 0, r * .1, 0, 0, r);
    g.addColorStop(0, "rgba(255,255,244,1)");
    g.addColorStop(.4, "rgb(" + shade(c, 1.4, .3, [255, 240, 200]) + ")");
    g.addColorStop(1, "rgb(" + shade(c, .55) + ")");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, r * (.95 + Math.sin(G.time * 3) * .03), 0, TAU); ctx.fill();
    /* granulation cells */
    ctx.globalAlpha = .3;
    for (let i = 0; i < 14; i++) {
      const a = sp * 1.3 + i * 2.4, rr = r * (.2 + (i % 5) * .15);
      ctx.fillStyle = "rgba(255,190,110,.7)";
      ctx.beginPath();
      ctx.arc(Math.cos(a) * rr, Math.sin(a) * rr, r * .12, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    /* the collapsing core, darkening with phase */
    ctx.fillStyle = "rgba(" + (ph >= 2 ? "40,10,6" : "120,40,12") + "," + (.3 + ph * .28) + ")";
    ctx.beginPath(); ctx.arc(0, 0, r * (.34 - ph * .07), 0, TAU); ctx.fill();
    /* prominences */
    ctx.save(); ctx.rotate(-sp);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * TAU + Math.sin(G.time + i) * .2;
      ctx.strokeStyle = "rgba(255,200,130,.55)"; ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * r, Math.sin(a) * r, r * .38, a - 2.4, a + .6);
      ctx.stroke();
    }
    ctx.restore();
    glowPool(0, 0, r * 4.4, c, .18 + ph * .06 + pull * .1);
    rimLight(r);
  },

  /* ================= NULLTIDE ======================================== */

  /* FATHOM — a lantern drone; pings, then commits */
  fathom(e, c) {
    const r = e.r, ping = clamp(e.ping || 0, 0, 1);
    ctx.save();
    ctx.rotate(e.ang);
    /* stabiliser fins */
    for (const sgn of [-1, 1]) {
      ctx.fillStyle = "rgba(" + shade(c, .5) + ",.9)";
      ctx.beginPath();
      ctx.moveTo(-r * .3, sgn * r * .3);
      ctx.quadraticCurveTo(-r * 1.3, sgn * r * (.6 + Math.sin(e.wob * 2) * .18), -r * 1.5, sgn * r * .1);
      ctx.quadraticCurveTo(-r * 1.1, sgn * r * .1, -r * .3, 0);
      ctx.closePath(); ctx.fill();
    }
    /* hull: a smooth capsule */
    ctx.fillStyle = bodyGrad("fathomB", r, "rgb(" + shade(c, 1.25, .3, [220, 255, 250]) + ")", "rgb(" + shade(c, .28) + ")");
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 1.1, r * .82, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "rgba(" + shade(c, 1.5, .5, [255, 255, 255]) + ",.75)";
    ctx.lineWidth = 1.4; ctx.stroke();
    /* bioluminescent line down the flank */
    ctx.strokeStyle = "rgba(" + shade(c, 1.6, .6, [255, 255, 255]) + "," + (.4 + ping * .6) + ")";
    ctx.lineWidth = 1.8; ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-r * .7, -r * .3); ctx.quadraticCurveTo(0, -r * .5, r * .7, -r * .2);
    ctx.stroke();
    /* the lamp */
    optic(r * .62, 0, r * .34, c, .3 + ping * .7, 0);
    ctx.restore();
    /* the ping itself */
    if (ping > .02) {
      ctx.strokeStyle = "rgba(" + shade(c, 1.4, .5, [255, 255, 255]) + "," + ((1 - ping) * .6) + ")";
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, r + ping * 90, 0, TAU); ctx.stroke();
    }
    glowPool(0, 0, r * 2.4, c, .12 + ping * .1);
    rimLight(r);
  },

  /* UNDINE — a swimming ribbon */
  undine(e, c) {
    const r = e.r, w = e.wob * 2.2;
    ctx.save();
    ctx.rotate(e.ang);
    /* the ribbon: a spine of segmented fin plates, widest just behind the head */
    const pts = 10;
    const spine = [];
    for (let i = 0; i <= pts; i++) {
      const f = i / pts;
      spine.push({
        f, x: lerp(r * .55, -r * 2.2, f),
        y: Math.sin(w - f * 3.6) * r * .62 * (.25 + f * .9),
        th: r * .68 * (1 - Math.pow(f, 1.5) * .88) + r * .07,
      });
    }
    ctx.beginPath();
    spine.forEach((s, i) => { i ? ctx.lineTo(s.x, s.y - s.th) : ctx.moveTo(s.x, s.y - s.th); });
    for (let i = pts; i >= 0; i--) ctx.lineTo(spine[i].x, spine[i].y + spine[i].th);
    ctx.closePath();
    const g = ctx.createLinearGradient(r * .6, 0, -r * 2.2, 0);
    g.addColorStop(0, "rgb(" + shade(c, 1.35, .4, [235, 252, 255]) + ")");
    g.addColorStop(.45, "rgb(" + shade(c, .8) + ")");
    g.addColorStop(1, "rgba(" + shade(c, .4) + ",.45)");
    ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = "rgba(" + shade(c, 1.5, .5, [255, 255, 255]) + ",.6)";
    ctx.lineWidth = 1.2; ctx.stroke();
    /* rib plates across the ribbon — this is what makes it read as built */
    ctx.strokeStyle = "rgba(" + shade(c, 1.7, .7, [255, 255, 255]) + ",.4)";
    ctx.lineWidth = 1;
    spine.forEach((s, i) => {
      if (i === 0 || i === pts) return;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y - s.th * .82);
      ctx.lineTo(s.x, s.y + s.th * .82);
      ctx.stroke();
    });
    /* luminous seam */
    ctx.strokeStyle = "rgba(" + shade(c, 1.8, .75, [255, 255, 255]) + ",.8)";
    ctx.lineWidth = 1.6; ctx.lineCap = "round";
    ctx.beginPath();
    spine.forEach((s, i) => { i ? ctx.lineTo(s.x, s.y) : ctx.moveTo(s.x, s.y); });
    ctx.stroke();
    /* head: a smooth cowl with a lamp set into it */
    ctx.fillStyle = bodyGrad("undineH", r, "rgb(" + shade(c, 1.4, .45, [240, 255, 255]) + ")", "rgb(" + shade(c, .34) + ")");
    ctx.beginPath();
    ctx.moveTo(r * 1.25, 0);
    ctx.quadraticCurveTo(r * .9, -r * .62, r * .2, -r * .5);
    ctx.quadraticCurveTo(r * .1, 0, r * .2, r * .5);
    ctx.quadraticCurveTo(r * .9, r * .62, r * 1.25, 0);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,.7)"; ctx.lineWidth = 1.3; ctx.stroke();
    optic(r * .78, 0, r * .24, c, .65, 0);
    ctx.restore();
    glowPool(0, 0, r * 2.2, c, .1);
    rimLight(r);
  },

  /* CAUSTIC — a lens housing walking its focal point */
  caustic(e, c) {
    const r = e.r, aim = e.lockAng || 0, live = e.state === 2 ? 1 : e.state === 1 ? .5 : 0;
    ctx.save();
    /* gimbal frame */
    ctx.strokeStyle = "rgba(" + shade(c, .85) + ",.85)"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 0, r * 1.15, .5, 2.8); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, r * 1.15, 3.64, 5.94); ctx.stroke();
    ctx.save();
    ctx.rotate(e.wob * .4);
    ctx.strokeStyle = "rgba(" + shade(c, 1.1, .3, [220, 255, 240]) + ",.6)"; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.ellipse(0, 0, r * 1.3, r * .5, .6, 0, TAU); ctx.stroke();
    ctx.restore();
    /* the lens: a convex disc seen edge-on-ish */
    ctx.save();
    ctx.rotate(aim);
    ctx.fillStyle = bodyGrad("causticB", r, "rgb(" + shade(c, 1.35, .45, [235, 255, 245]) + ")", "rgb(" + shade(c, .3) + ")");
    ctx.beginPath(); ctx.ellipse(0, 0, r * .5, r * .92, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,.7)"; ctx.lineWidth = 1.5; ctx.stroke();
    /* refraction arcs inside the lens */
    ctx.strokeStyle = "rgba(255,255,255,.4)"; ctx.lineWidth = 1;
    for (let i = 1; i <= 2; i++) {
      ctx.beginPath(); ctx.ellipse(0, 0, r * .5 * (i / 3), r * .92 * (i / 3), 0, 0, TAU); ctx.stroke();
    }
    /* the focused beam leaving the lens */
    if (live > 0) {
      const g = ctx.createLinearGradient(r * .4, 0, r * 6, 0);
      g.addColorStop(0, "rgba(255,255,255," + (.5 * live) + ")");
      g.addColorStop(1, "rgba(" + c + ",0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(r * .4, -r * .7); ctx.lineTo(r * 6, -r * .12);
      ctx.lineTo(r * 6, r * .12); ctx.lineTo(r * .4, r * .7);
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
    /* housing body behind the lens */
    ctx.save(); ctx.rotate(aim + Math.PI);
    ctx.fillStyle = "rgb(" + shade(c, .46) + ")";
    rrect(r * .1, -r * .46, r * .7, r * .92, r * .2); ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,.28)"; ctx.lineWidth = 1; ctx.stroke();
    ctx.restore();
    ctx.restore();
    glowPool(0, 0, r * 2.6, c, .11 + live * .12);
    rimLight(r);
  },

  /* TRENCH — a heavy submersible hull, half-sunk */
  trench(e, c) {
    const r = e.r, sub = clamp(e.sub || 0, 0, 1); /* 1 = fully under */
    if (sub > .9) {
      /* only the wake shows */
      ctx.strokeStyle = "rgba(" + shade(c, 1.3, .4, [220, 250, 255]) + ",.5)";
      ctx.lineWidth = 2;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(0, 0, r * (.6 + i * .5) + Math.sin(G.time * 5 + i) * 3, 0, TAU);
        ctx.stroke();
      }
      glowPool(0, 0, r * 2.4, c, .08);
      return;
    }
    ctx.save();
    ctx.globalAlpha = 1 - sub * .7;
    ctx.rotate(e.ang);
    softShadow(0, r * .6, r * 1.5, r * .5);
    /* dorsal fin / sail */
    ctx.fillStyle = "rgb(" + shade(c, .58) + ")";
    ctx.beginPath();
    ctx.moveTo(r * .1, -r * .5); ctx.lineTo(r * .5, -r * 1.15);
    ctx.lineTo(-r * .3, -r * 1.05); ctx.lineTo(-r * .5, -r * .45);
    ctx.closePath(); ctx.fill();
    /* hull: a long smooth pressure body */
    ctx.fillStyle = bodyGrad("trenchB", r, "rgb(" + shade(c, 1.2, .28, [220, 245, 255]) + ")", "rgb(" + shade(c, .26) + ")");
    ctx.beginPath(); ctx.ellipse(0, 0, r * 1.35, r * .82, 0, 0, TAU); ctx.fill();
    /* pressure ribs */
    ctx.strokeStyle = "rgba(255,255,255,.25)"; ctx.lineWidth = 1.2;
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.ellipse(i * r * .38, 0, r * .12, r * .78 * Math.sqrt(Math.max(0, 1 - (i * .38 / 1.35) * (i * .38 / 1.35))), 0, -1.5, 1.5);
      ctx.stroke();
    }
    ctx.strokeStyle = "rgba(" + shade(c, 1.5, .5, [255, 255, 255]) + ",.7)"; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.ellipse(0, 0, r * 1.35, r * .82, 0, 0, TAU); ctx.stroke();
    /* forward observation port */
    optic(r * .92, 0, r * .3, c, .5, 0);
    /* running lights */
    for (const sgn of [-1, 1]) {
      ctx.fillStyle = "rgba(" + shade(c, 1.7, .7, [255, 255, 255]) + ",.8)";
      ctx.beginPath(); ctx.arc(-r * .5, sgn * r * .5, r * .09, 0, TAU); ctx.fill();
    }
    ctx.restore();
    ctx.globalAlpha = 1;
    glowPool(0, 0, r * 2.6, c, .1);
    rimLight(r);
  },

  /* SOUNDING — a charge-layer on a slow count */
  sounding(e, c) {
    const r = e.r, load = clamp(e.load || 0, 0, 1);
    ctx.save();
    ctx.rotate(e.wob * .35);
    /* the rack: six sockets around a spine, emptying as it drops */
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU;
      const has = i >= Math.floor(load * 6);
      ctx.save();
      ctx.translate(Math.cos(a) * r * .95, Math.sin(a) * r * .95);
      ctx.fillStyle = has ? "rgb(" + shade(c, 1.2, .3, [225, 235, 255]) + ")" : "rgba(" + shade(c, .34) + ",.6)";
      ctx.beginPath(); ctx.arc(0, 0, r * .22, 0, TAU); ctx.fill();
      if (has) {
        ctx.strokeStyle = "rgba(255,255,255,.7)"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(0, 0, r * .22, 0, TAU); ctx.stroke();
      }
      ctx.restore();
    }
    ctx.restore();
    ctx.save();
    ctx.rotate(e.ang);
    /* body: a stubby dispenser */
    ctx.fillStyle = bodyGrad("soundB", r, "rgb(" + shade(c, 1.25, .3, [230, 238, 255]) + ")", "rgb(" + shade(c, .3) + ")");
    polyPath(r * .74, 5, -Math.PI / 2); ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,.7)"; ctx.lineWidth = 1.6;
    polyPath(r * .74, 5, -Math.PI / 2); ctx.stroke();
    optic(0, 0, r * .28, c, .35 + load * .5, e.wob);
    ctx.restore();
    /* the count pips — reads as rhythm */
    ctx.fillStyle = "rgba(" + shade(c, 1.6, .6, [255, 255, 255]) + ",.85)";
    for (let i = 0; i < 4; i++) {
      ctx.globalAlpha = load * 4 % 4 > i ? .95 : .2;
      ctx.fillRect(-r * .5 + i * r * .3, r * 1.35, r * .18, r * .12);
    }
    ctx.globalAlpha = 1;
    glowPool(0, 0, r * 2.3, c, .1 + load * .08);
    rimLight(r);
  },

  /* THE DROWNED INDEX — an archive column reading back */
  drownedindex(e, c) {
    const r = e.r, ph = e.phase || 0, sp = e.spin || 0;
    const pale = "rgb(" + shade(c, 1.3, .4, [230, 255, 252]) + ")";
    /* caustic light from above */
    ctx.save();
    ctx.globalAlpha = .16;
    for (let i = 0; i < 7; i++) {
      const a = sp * .3 + (i / 7) * TAU;
      ctx.fillStyle = "rgb(" + shade(c, 1.4, .5, [255, 255, 255]) + ")";
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a - .06) * r * 5, Math.sin(a - .06) * r * 5);
      ctx.lineTo(Math.cos(a + .06) * r * 5, Math.sin(a + .06) * r * 5);
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
    /* index columns — stacked record slabs, rotating */
    for (let i = 0; i < 8; i++) {
      const a = sp * .6 + (i / 8) * TAU;
      const rr = r + 40 + Math.sin(sp * 1.6 + i) * 8;
      ctx.save();
      ctx.translate(Math.cos(a) * rr, Math.sin(a) * rr * .5);
      ctx.rotate(a * .4);
      ctx.fillStyle = "rgba(" + shade(c, .7) + ",.9)";
      rrect(-5, -20, 10, 40, 3); ctx.fill();
      ctx.fillStyle = "rgba(" + shade(c, 1.6, .6, [255, 255, 255]) + ",.7)";
      for (let k = 0; k < 4; k++) ctx.fillRect(-3, -16 + k * 9, 6, 2);
      ctx.restore();
    }
    /* the column itself */
    ctx.save();
    /* outer cage rings */
    for (let i = 0; i < 3; i++) {
      ctx.strokeStyle = "rgba(" + shade(c, 1.1 - i * .1, .3, [240, 255, 255]) + "," + (.6 - i * .14) + ")";
      ctx.lineWidth = 3 - i * .6;
      ctx.beginPath();
      ctx.ellipse(0, 0, r * (1.1 + i * .18), r * (1.1 + i * .18) * .38, sp * (i % 2 ? -.4 : .4), 0, TAU);
      ctx.stroke();
    }
    /* body: a fluted archive drum */
    ctx.fillStyle = bodyGrad("diBody", r, pale, "rgb(" + shade(c, .24) + ")");
    ctx.beginPath();
    ctx.ellipse(0, 0, r * .92, r * 1.05, 0, 0, TAU);
    ctx.fill();
    /* the shelves — horizontal record bands, lit by phase */
    for (let i = -3; i <= 3; i++) {
      const y = i * r * .26;
      const half = r * .9 * Math.sqrt(Math.max(0, 1 - (y / (r * 1.05)) * (y / (r * 1.05))));
      const lit = (i + 3) <= (ph + 1) * 2.4;
      ctx.fillStyle = lit ? "rgba(" + shade(c, 1.7, .65, [255, 255, 255]) + ",.7)" : "rgba(" + shade(c, .5) + ",.7)";
      ctx.fillRect(-half, y - r * .045, half * 2, r * .09);
    }
    ctx.strokeStyle = "rgba(" + shade(c, 1.6, .6, [255, 255, 255]) + ",.85)"; ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.ellipse(0, 0, r * .92, r * 1.05, 0, 0, TAU); ctx.stroke();
    /* the reader head — a lens on a rail, sweeping */
    const ry = Math.sin(sp * 1.1) * r * .8;
    ctx.strokeStyle = "rgba(255,255,255,.35)"; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(0, -r * 1.05); ctx.lineTo(0, r * 1.05); ctx.stroke();
    optic(0, ry, r * .28, c, .8, 0);
    sheen(r, sp * .5, "255,255,255", .2);
    ctx.restore();
    glowPool(0, 0, r * 3.4, c, .14 + ph * .05);
    rimLight(r);
  },

  /* ================= TERMINUS ======================================== */

  /* VESTIGE — the wireframe of a Husk that no longer has a chamber */
  vestige(e, c) {
    const r = e.r, calm = clamp(e.calm || 0, 0, 1);
    const col = calm > .5 ? "rgb(" + shade(c, 1.4, .5, [255, 236, 180]) + ")" : "rgb(" + shade(c, 1.25, .3, [255, 255, 255]) + ")";
    const w = e.wob;
    ctx.save();
    ctx.rotate(e.ang);
    ctx.globalAlpha = .72 + Math.sin(G.time * 2 + e.wob) * .1 + calm * .22;
    /* the walking legs — same lurch as a Husk, drawn as jointed bone lines */
    for (const sgn of [-1, 1]) {
      const sw = Math.sin(w * 2 + (sgn > 0 ? 0 : Math.PI)) * .5;
      ctx.strokeStyle = col; ctx.lineWidth = 1.8; ctx.lineCap = "round";
      const kx = -r * .3 + Math.cos(sgn * 1.35 + sw) * r * .72;
      const ky = sgn * r * .4 + Math.sin(sgn * 1.35 + sw) * r * .72;
      ctx.beginPath();
      ctx.moveTo(-r * .3, sgn * r * .4);
      ctx.lineTo(kx, ky);
      ctx.lineTo(kx + Math.cos(sgn * 1.9 + sw * .5) * r * .6, ky + Math.sin(sgn * 1.9 + sw * .5) * r * .6);
      ctx.stroke();
    }
    /* the two arms it still swings, out of habit */
    for (const sgn of [-1, 1]) {
      const sw = Math.sin(w * 2 + (sgn > 0 ? 1.6 : .2)) * .34;
      ctx.strokeStyle = col; ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(r * .05, sgn * r * .62);
      ctx.quadraticCurveTo(r * .8, sgn * r * (1.05 + sw), r * 1.12, sgn * r * (.72 + sw));
      ctx.stroke();
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(r * 1.12, sgn * r * (.72 + sw), 1.9, 0, TAU); ctx.fill();
    }
    /* torso: an open wire cage over a faint ghost of the body that used to fill it */
    ctx.fillStyle = calm > .5 ? "rgba(255,226,150,.1)" : "rgba(" + shade(c, 1, .2, [255, 255, 255]) + ",.09)";
    ctx.beginPath();
    ctx.moveTo(r * .9, 0); ctx.lineTo(r * .1, r * .8);
    ctx.lineTo(-r * .8, r * .45); ctx.lineTo(-r * .8, -r * .45);
    ctx.lineTo(r * .1, -r * .8); ctx.closePath();
    ctx.fill();
    wire(() => {
      ctx.beginPath();
      ctx.moveTo(r * .9, 0); ctx.lineTo(r * .1, r * .8);
      ctx.lineTo(-r * .8, r * .45); ctx.lineTo(-r * .8, -r * .45);
      ctx.lineTo(r * .1, -r * .8); ctx.closePath();
    }, col, 2.1);
    /* the tape scan: one bright horizontal line travelling the body */
    const sc = ((G.time * .55 + e.wob * .2) % 1) * 2 - 1;
    ctx.save();
    ctx.strokeStyle = calm > .5 ? "rgba(255,236,180,.75)" : "rgba(255,255,255,.6)";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-r * .8, sc * r * .78); ctx.lineTo(r * .55, sc * r * .78);
    ctx.stroke();
    ctx.restore();
    wire(() => {
      ctx.beginPath();
      ctx.moveTo(r * .9, 0); ctx.lineTo(-r * .8, r * .45);
      ctx.moveTo(r * .9, 0); ctx.lineTo(-r * .8, -r * .45);
      ctx.moveTo(r * .1, r * .8); ctx.lineTo(r * .1, -r * .8);
    }, col, .8, .5);
    /* the vertex points — this is what makes it read as a recording */
    ctx.fillStyle = col;
    [[r * .9, 0], [r * .1, r * .8], [-r * .8, r * .45], [-r * .8, -r * .45], [r * .1, -r * .8]]
      .forEach((pt) => { ctx.beginPath(); ctx.arc(pt[0], pt[1], 1.7, 0, TAU); ctx.fill(); });
    /* the mask: an outline of the face plate, with nothing behind it */
    ctx.strokeStyle = col; ctx.lineWidth = 1.7;
    ctx.beginPath();
    ctx.moveTo(r * .34, -r * .34); ctx.lineTo(r * .84, -r * .16);
    ctx.lineTo(r * .84, r * .16); ctx.lineTo(r * .34, r * .34);
    ctx.closePath(); ctx.stroke();
    /* two eye slits, drawn as gaps in the wire rather than lit shapes */
    ctx.strokeStyle = calm > .5 ? "rgba(255,226,150,.9)" : "rgba(255,255,255,.6)";
    ctx.lineWidth = 1.6;
    for (const sgn of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(r * .5, sgn * r * .1); ctx.lineTo(r * .72, sgn * r * .06);
      ctx.stroke();
    }
    ctx.restore();
    ctx.globalAlpha = 1;
    if (calm > .05) {
      ctx.strokeStyle = "rgba(255,226,150," + (calm * .55) + ")"; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.arc(0, 0, r * 1.7 + Math.sin(G.time * 2) * 2, 0, TAU); ctx.stroke();
    }
    glowPool(0, 0, r * 2, c, .07 + calm * .08);
  },

  /* CODA — counts three, fires on four */
  coda(e, c) {
    const r = e.r, beat = e.beat || 0, sub = clamp(e.beatT || 0, 0, 1);
    const gold = "rgb(" + shade(c, 1.35, .3, [255, 236, 190]) + ")";
    ctx.save();
    ctx.rotate(e.ang);
    /* the staff: four bars overhead, filling on the count */
    ctx.save(); ctx.rotate(-e.ang);
    for (let i = 0; i < 4; i++) {
      const on = i < beat;
      ctx.fillStyle = on ? gold : "rgba(" + shade(c, .5) + ",.55)";
      const h = on ? r * .5 : r * .26;
      ctx.fillRect(-r * .72 + i * r * .42, -r * 1.9 - h, r * .22, h);
    }
    /* the beat pulse on the fourth */
    if (beat >= 3) {
      ctx.strokeStyle = "rgba(255,236,190," + (1 - sub) + ")"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, -r * 1.9, 14 + sub * 22, 0, TAU); ctx.stroke();
    }
    ctx.restore();
    /* body: a tuning-fork head over a cast base */
    ctx.fillStyle = bodyGrad("codaB", r, gold, "rgb(" + shade(c, .3) + ")");
    ctx.beginPath();
    ctx.moveTo(r * .2, r * .9); ctx.lineTo(-r * .55, r * .5);
    ctx.lineTo(-r * .55, -r * .5); ctx.lineTo(r * .2, -r * .9);
    ctx.lineTo(r * .75, 0);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "rgba(255,240,210,.85)"; ctx.lineWidth = 1.5; ctx.stroke();
    /* the two tines */
    for (const sgn of [-1, 1]) {
      ctx.strokeStyle = gold; ctx.lineWidth = 2.6; ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(r * .5, sgn * r * .26);
      ctx.quadraticCurveTo(r * 1.2, sgn * r * .5, r * 1.35, sgn * r * .1);
      ctx.stroke();
      ctx.fillStyle = "rgba(255,250,230," + (.35 + (beat / 4) * .6) + ")";
      ctx.beginPath(); ctx.arc(r * 1.35, sgn * r * .1, r * .12, 0, TAU); ctx.fill();
    }
    optic(-r * .05, 0, r * .26, c, .3 + (beat / 4) * .6, 0);
    ctx.restore();
    glowPool(0, 0, r * 2.2, c, .09 + (beat / 4) * .1);
    rimLight(r);
  },

  /* NULL — a hole in the world that returns what you put in it */
  nullc(e, c) {
    const r = e.r, full = clamp((e.stored || 0) / 6, 0, 1);
    /* the void disc — actually darker than the floor */
    const g = ctx.createRadialGradient(0, 0, r * .1, 0, 0, r * 1.05);
    g.addColorStop(0, "rgba(0,0,0,1)");
    g.addColorStop(.72, "rgba(4,4,8,.98)");
    g.addColorStop(1, "rgba(" + shade(c, .5) + ",.2)");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, r * 1.05, 0, TAU); ctx.fill();
    /* the event ring — machined, with a lens flare of stolen light */
    ctx.save();
    ctx.rotate(e.wob * .5);
    ctx.strokeStyle = "rgba(" + shade(c, 1.3, .4, [235, 235, 245]) + ",.9)";
    ctx.lineWidth = 2.6;
    ctx.beginPath(); ctx.arc(0, 0, r * 1.05, 0, TAU); ctx.stroke();
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU;
      const lit = i / 12 < full;
      ctx.strokeStyle = lit ? "rgba(" + TH.core + ",.9)" : "rgba(" + shade(c, .8) + ",.5)";
      ctx.lineWidth = lit ? 2.6 : 1.4;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r * 1.05, Math.sin(a) * r * 1.05);
      ctx.lineTo(Math.cos(a) * r * (1.3 + (lit ? .12 : 0)), Math.sin(a) * r * (1.3 + (lit ? .12 : 0)));
      ctx.stroke();
    }
    ctx.restore();
    /* infalling light — your own pulses, spiralling in */
    ctx.save();
    ctx.rotate(-e.wob);
    for (let i = 0; i < 5; i++) {
      const f = ((G.time * .6 + i / 5) % 1);
      const rr = lerp(r * 2.1, r * .2, f);
      const a = i * 1.26 + f * 4;
      ctx.globalAlpha = (1 - f) * .7 * (.3 + full * .7);
      ctx.strokeStyle = "rgb(" + TH.core + ")"; ctx.lineWidth = 1.6; ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
      ctx.lineTo(Math.cos(a - .3) * (rr - 8), Math.sin(a - .3) * (rr - 8));
      ctx.stroke();
    }
    ctx.restore();
    ctx.globalAlpha = 1;
    /* lensing arc — the room bends around the top edge */
    ctx.strokeStyle = "rgba(255,255,255,.2)"; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(0, 0, r * 1.5, -2.5, -.6); ctx.stroke();
    glowPool(0, 0, r * 2.4, c, .05);
  },

  /* EPILOGUE — writes one line across the floor */
  epilogue(e, c) {
    const r = e.r, prog = clamp(e.write || 0, 0, 1);
    const gold = "rgb(" + shade(c, 1.3, .3, [255, 240, 200]) + ")";
    ctx.save();
    ctx.rotate(e.ang);
    /* the arm holding the stylus */
    ctx.strokeStyle = "rgba(" + shade(c, .8) + ",.95)"; ctx.lineWidth = 4; ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(r * .9, r * .3, r * 1.5, r * .1);
    ctx.stroke();
    ctx.fillStyle = gold;
    ctx.beginPath();
    ctx.moveTo(r * 1.5, r * .1); ctx.lineTo(r * 1.85, r * .02); ctx.lineTo(r * 1.5, -r * .1);
    ctx.closePath(); ctx.fill();
    ctx.restore();
    /* body: a rectangular press frame */
    ctx.save();
    ctx.fillStyle = bodyGrad("epiB", r, gold, "rgb(" + shade(c, .28) + ")");
    rrect(-r * .85, -r * .95, r * 1.7, r * 1.9, r * .22); ctx.fill();
    ctx.strokeStyle = "rgba(255,240,200,.85)"; ctx.lineWidth = 2;
    rrect(-r * .85, -r * .95, r * 1.7, r * 1.9, r * .22); ctx.stroke();
    /* type rows — small glyph blocks, filling as it writes */
    for (let row = 0; row < 5; row++) {
      for (let col2 = 0; col2 < 4; col2++) {
        const idx = (row * 4 + col2) / 20;
        ctx.fillStyle = idx < prog ? "rgba(255,246,220,.92)" : "rgba(" + shade(c, .55) + ",.6)";
        ctx.fillRect(-r * .62 + col2 * r * .34, -r * .74 + row * r * .32, r * .22, r * .2);
      }
    }
    /* platen line */
    ctx.strokeStyle = "rgba(255,246,220,.8)"; ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-r * .78, r * .82); ctx.lineTo(-r * .78 + r * 1.56 * prog, r * .82);
    ctx.stroke();
    ctx.restore();
    glowPool(0, 0, r * 2.4, c, .1 + prog * .08);
    rimLight(r);
  },

  /* ZENITH — wearing your hull and your build */
  zenith(e, c) {
    const r = e.r;
    const gold = "rgb(" + shade(c, 1.3, .3, [255, 244, 205]) + ")";
    /* core halo — one ring per core it has copied */
    const n = e.cores || 0;
    for (let i = 0; i < Math.min(n, 6); i++) {
      ctx.save();
      ctx.rotate(e.wob * (i % 2 ? -.5 : .6) + i);
      ctx.strokeStyle = "rgba(" + shade(c, 1.2, .3, [255, 240, 200]) + "," + (.4 - i * .04) + ")";
      ctx.lineWidth = 1.4;
      polyPath(r * (1.5 + i * .2), 6, 0); ctx.stroke();
      ctx.restore();
    }
    ctx.save();
    ctx.rotate(e.ang);
    /* it is the player silhouette — same path, gold */
    ctx.fillStyle = bodyGrad("zenB", r, gold, "rgb(" + shade(c, .32) + ")");
    heroPath(r); ctx.fill();
    ctx.strokeStyle = "rgba(255,248,225,.95)"; ctx.lineWidth = 1.8;
    heroPath(r); ctx.stroke();
    /* engine glow at the back */
    const eg = ctx.createLinearGradient(-r * .6, 0, -r * 1.8, 0);
    eg.addColorStop(0, "rgba(255,236,180,.7)");
    eg.addColorStop(1, "rgba(255,236,180,0)");
    ctx.fillStyle = eg;
    ctx.beginPath();
    ctx.moveTo(-r * .58, -r * .3); ctx.lineTo(-r * 1.9, 0); ctx.lineTo(-r * .58, r * .3);
    ctx.closePath(); ctx.fill();
    /* the canopy — a visor where your cockpit is */
    visor(r * .3, 0, r * .8, r * .42, "255,250,230", .9, .12);
    /* a small crown of counted cores */
    ctx.fillStyle = "rgba(255,248,220,.9)";
    for (let i = 0; i < Math.min(n, 5); i++) {
      tri(-r * .1 + i * r * .2 - r * .3, -r * 1.12, -r * .1 + i * r * .2 - r * .18, -r * 1.12,
        -r * .1 + i * r * .2 - r * .24, -r * 1.34);
      ctx.fill();
    }
    ctx.restore();
    glowPool(0, 0, r * 2.6, c, .13);
    rimLight(r);
  },

  /* OMEGA-00 — the first pilot, same hull, older */
  omega(e, c) {
    const r = e.r, ph = e.phase || 0;
    const gold = "rgb(" + shade(c, 1.3, .3, [255, 244, 200]) + ")";
    const dark = "rgb(" + shade(c, .26) + ")";
    /* the lead: in phase 3 it renders a full second ahead of itself */
    if (ph >= 2) {
      ctx.save();
      ctx.globalAlpha = .3;
      ctx.translate(Math.cos(e.ang) * 44, Math.sin(e.ang) * 44);
      ctx.rotate(e.ang);
      ctx.strokeStyle = "rgba(255,244,200,.9)"; ctx.lineWidth = 1.4;
      heroPath(r); ctx.stroke();
      ctx.restore();
      ctx.globalAlpha = 1;
    }
    /* buffer rings — three, one per phase, the outer ones broken */
    for (let i = 0; i < 3; i++) {
      const broken = i < ph;
      ctx.save();
      ctx.rotate((e.spin || 0) * (i % 2 ? -.5 : .7) + i * .6);
      ctx.strokeStyle = broken ? "rgba(" + shade(c, .7) + ",.35)" : "rgba(" + shade(c, 1.2, .3, [255, 240, 200]) + ",.75)";
      ctx.lineWidth = broken ? 1.2 : 2.6;
      if (broken) {
        for (let k = 0; k < 5; k++) {
          const a = (k / 5) * TAU;
          ctx.beginPath(); ctx.arc(0, 0, r * (1.7 + i * .34), a, a + .38); ctx.stroke();
        }
      } else {
        ctx.beginPath(); ctx.arc(0, 0, r * (1.7 + i * .34), 0, TAU); ctx.stroke();
      }
      ctx.restore();
    }
    /* orbiting decoy markers — it carries echoes like you do */
    for (let i = 0; i < 2; i++) {
      const a = (e.spin || 0) * 1.6 + i * Math.PI;
      ctx.save();
      ctx.translate(Math.cos(a) * r * 2.5, Math.sin(a) * r * 2.5 * .6);
      ctx.rotate(a);
      ctx.globalAlpha = .5;
      ctx.strokeStyle = "rgba(" + TH.echo + ",.9)"; ctx.lineWidth = 1.2;
      heroPath(r * .4); ctx.stroke();
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    ctx.save();
    ctx.rotate(e.ang);
    const R = r * 1.15;
    /* the hull — same silhouette as yours, heavier and older */
    ctx.fillStyle = bodyGrad("omegaB", R, gold, dark);
    heroPath(R); ctx.fill();
    /* the darker inner shell, so the frame reads as armour over a core */
    ctx.fillStyle = "rgba(" + shade(c, .34) + ",.92)";
    heroPath(R * .72); ctx.fill();
    /* panel seams, cut inside the silhouette rather than bolted on top */
    ctx.strokeStyle = "rgba(255,244,205,.32)"; ctx.lineWidth = 1.1;
    for (const sgn of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(R * .5, sgn * R * .38);
      ctx.lineTo(-R * .18, sgn * R * .74);
      ctx.lineTo(-R * .6, sgn * R * .34);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(R * 1.1, 0); ctx.lineTo(-R * .5, 0);
    ctx.stroke();
    /* three burn notches along the port flank — it has been here a while */
    ctx.fillStyle = "rgba(30,22,14,.8)";
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.ellipse(-R * .05 + i * R * .26, -R * .62 + i * R * .06, R * .07, R * .035, .5, 0, TAU);
      ctx.fill();
    }
    /* the old hull number, stencilled along the spine */
    ctx.save();
    ctx.fillStyle = "rgba(255,248,220,.45)";
    ctx.font = "700 " + Math.max(6, r * .3).toFixed(0) + "px " + MONO;
    ctx.textAlign = "center";
    ctx.fillText("00", -R * .28, R * .1);
    ctx.restore();
    ctx.textAlign = "left";
    /* the canopy — narrow, set into the nose, dark with one lit sliver */
    ctx.save();
    ctx.translate(R * .42, 0);
    ctx.fillStyle = "rgba(8,10,16,.92)";
    ctx.beginPath(); ctx.ellipse(0, 0, R * .34, R * .19, 0, 0, TAU); ctx.fill();
    const cg = ctx.createLinearGradient(-R * .34, 0, R * .34, 0);
    const cc = ph >= 2 ? "255,150,120" : "170,240,255";
    cg.addColorStop(0, "rgba(" + cc + ",0)");
    cg.addColorStop(.55, "rgba(" + cc + ",.85)");
    cg.addColorStop(1, "rgba(" + cc + ",.15)");
    ctx.fillStyle = cg;
    ctx.beginPath(); ctx.ellipse(0, 0, R * .3, R * .15, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = "rgba(255,246,215,.8)"; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.ellipse(0, 0, R * .34, R * .19, 0, 0, TAU); ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = "rgba(255,246,215,.95)"; ctx.lineWidth = 2.4;
    heroPath(R); ctx.stroke();
    /* engine */
    const eg = ctx.createLinearGradient(-r * .8, 0, -r * 2.6, 0);
    eg.addColorStop(0, "rgba(255,236,180,.8)");
    eg.addColorStop(1, "rgba(255,236,180,0)");
    ctx.fillStyle = eg;
    ctx.beginPath();
    ctx.moveTo(-r * .7, -r * .38); ctx.lineTo(-r * 2.7, 0); ctx.lineTo(-r * .7, r * .38);
    ctx.closePath(); ctx.fill();
    ctx.restore();
    glowPool(0, 0, r * 3.6, c, .16 + ph * .06);
    rimLight(r);
  },
});


const MONO = 'ui-monospace, "SF Mono", Menlo, Consolas, monospace';
function shipPath(r) { heroPath(r); }

/* the hero silhouette — an angular armoured frame, nose along +x.
   shared by the player, its echoes, its afterimages and the things
   that are pretending to be it. */
function heroPath(r) {
  ctx.beginPath();
  ctx.moveTo(r * 1.5, 0);
  ctx.lineTo(r * .55, r * .4);
  ctx.lineTo(r * .6, r * .95);
  ctx.lineTo(-r * .3, r * 1.02);
  ctx.lineTo(-r * .88, r * .5);
  ctx.lineTo(-r * .58, 0);
  ctx.lineTo(-r * .88, -r * .5);
  ctx.lineTo(-r * .3, -r * 1.02);
  ctx.lineTo(r * .6, -r * .95);
  ctx.lineTo(r * .55, -r * .4);
  ctx.closePath();
}
/* elite enemies wear a jagged halo and a small crown */
function eliteAura(e, c) {
  const r = e.r, t = G.time;
  ctx.save();
  ctx.rotate(t * .9);
  ctx.strokeStyle = "rgba(255,214,138,.55)";
  ctx.lineWidth = 1.6;
  polyPath(r * 1.55 + Math.sin(t * 3) * 1.5, 8, 0, .82); ctx.stroke();
  ctx.restore();
  ctx.save();
  ctx.rotate(e.ang);
  ctx.fillStyle = "rgba(255,214,138,.95)";
  for (let i = -1; i <= 1; i++) {
    tri(r * .1 + i * r * .34 - r * .1, -r * 1.15, r * .1 + i * r * .34 + r * .1, -r * 1.15,
      r * .1 + i * r * .34, -r * (1.55 - Math.abs(i) * .18));
    ctx.fill();
  }
  ctx.restore();
  glowPool(0, 0, r * 2.2, "255,214,138", .1 + Math.sin(t * 4) * .03);
}
function drawEnemy(e) {
  const d = EN[e.type] || EN.husk;
  const c = e.elite ? shade(ecol(d.col), 1.12, .18, [255, 226, 150]) : ecol(d.col);
  if (e.type !== "weaver" && e.type !== "mirror" && e.type !== "revenant" && e.type !== "hexer")
    softShadow(e.x, e.y, e.r, e.r);
  ctx.save();
  ctx.translate(e.x, e.y);
  /* the shove stretches the body along its own direction, hardest during
     the punch and back to round by the time the body has settled */
  const shf = shoveStretch(e.sh);
  if (shf > .02) {
    const st = shf * KB_STRETCH_MAX;
    ctx.rotate(e.sh.ang); ctx.scale(1 + st, 1 - st * .55); ctx.rotate(-e.sh.ang);
  }
  const born = e.born < .35 ? .4 + (e.born / .35) * .6 : 1;
  const sc = born * (1 + (e.pop || 0) * .3 + clamp((e.hit || 0) / HIT_FLASH_ENEMY, 0, 1) * HIT_POP);
  if (sc !== 1) ctx.scale(sc, sc);
  if (e.mut) specialAura(e);
  else if (e.elite) eliteAura(e, c);
  (ART[e.type] || ART.husk)(e, c);
  if (e.hit > 0) {
    ctx.globalAlpha = clamp(e.hit / HIT_FLASH_ENEMY, 0, 1) * .92;
    ctx.fillStyle = "rgb(" + TH.rim + ")";
    ctx.beginPath(); ctx.arc(0, 0, e.r * 1.06, 0, TAU); ctx.fill();
  }
  ctx.restore();
  if (e.hp < e.maxHp - .5) {
    const w = Math.max(24, e.r * 2.2), x = e.x - w / 2, y = e.y - e.r - 13;
    ctx.fillStyle = "rgba(" + TH.ink + ",.18)"; ctx.fillRect(x, y, w, 3);
    ctx.fillStyle = e.elite ? "rgb(255,214,138)" : "rgb(" + c + ")";
    ctx.fillRect(x, y, w * clamp(e.hp / e.maxHp, 0, 1), 3);
  }
  if (e.tether && G.player) {
    /* the leash ring you have to stay inside */
    ctx.save();
    ctx.globalAlpha = .3 + Math.sin(G.time * 6) * .1;
    ctx.strokeStyle = "rgb(" + c + ")";
    ctx.lineWidth = 2; ctx.setLineDash([12, 14]); ctx.lineDashOffset = -G.time * 40;
    ctx.beginPath(); ctx.arc(e.x, e.y, 235, 0, TAU); ctx.stroke();
    ctx.restore();
  }
}

