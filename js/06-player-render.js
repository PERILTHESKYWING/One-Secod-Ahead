/* Player and echo (decoy) rendering: hero body, motion trails, and echo/decoy visuals. */
/* ---------------- the player character --------------------------------- */
/* draws the whole frame in local space, nose along +x. shared with the
   afterimage stamps so a ghost reads as the same character. */
function heroBody(p, o) {
  o = o || {};
  const r = p.r, flat = o.flat;
  const hull = flat ? o.col : (p.hurtFlash > .05 ? "rgb(255,150,170)" : "rgb(" + TH.hull + ")");
  const dark = flat ? o.col : "rgb(" + TH.hullDark + ")";
  const core = o.core || TH.core;
  const step = o.step == null ? 0 : o.step;
  /* legs, tucked and pedalling with speed */
  if (!flat) {
    for (const sgn of [-1, 1]) {
      limb(-r * .45, sgn * r * .45, r * .5, Math.PI * (sgn > 0 ? .72 : 1.28),
        Math.sin(step + (sgn > 0 ? 0 : Math.PI)) * .45, "rgb(" + TH.hullDark + ")", 4);
    }
  }
  /* body */
  ctx.fillStyle = flat ? o.col : bodyGrad("hero", r * 1.5, hull, "rgb(" + TH.hullDark + ")");
  heroPath(r); ctx.fill();
  if (!flat) { ctx.strokeStyle = "rgba(" + TH.hullDark + ",.95)"; ctx.lineWidth = 1.6; ctx.stroke(); }
  /* chest plate — dark wedge so the nose reads as a direction */
  ctx.fillStyle = flat ? o.col : "rgba(" + TH.hullDark + ",.72)";
  ctx.beginPath();
  ctx.moveTo(r * 1.15, 0); ctx.lineTo(0, r * .52); ctx.lineTo(-r * .35, 0); ctx.lineTo(0, -r * .52);
  ctx.closePath(); ctx.fill();
  /* hip skirt */
  if (!flat) {
    ctx.fillStyle = "rgba(" + TH.hullDark + ",.55)";
    rrect(-r * .95, -r * .55, r * .4, r * 1.1, r * .16); ctx.fill();
  }
  /* shoulder pauldrons with a spike each */
  for (const sgn of [-1, 1]) {
    ctx.save();
    ctx.translate(r * .1, sgn * r * .82);
    ctx.rotate(sgn * .18);
    ctx.fillStyle = flat ? o.col : "rgb(" + TH.hullDark + ")";
    rrect(-r * .44, -r * .32, r * .95, r * .64, r * .22); ctx.fill();
    if (!flat) {
      ctx.fillStyle = "rgba(" + TH.hull + ",.85)";
      rrect(-r * .34, -r * .24, r * .74, r * .18, r * .09); ctx.fill();
      ctx.fillStyle = "rgba(" + core + ",.95)";
      rrect(-r * .3, r * .04, r * .3, r * .12, r * .06); ctx.fill();
    }
    ctx.fillStyle = flat ? o.col : "rgb(" + TH.hullDark + ")";
    tri(r * .3, -r * .3, r * .62, -r * .02, r * .18, r * .12); ctx.fill();
    ctx.restore();
  }
  /* arm cannon along the right flank, kicks back when it fires */
  ctx.save();
  ctx.translate(r * .35 - (o.kick || 0) * r * .3, r * .7);
  ctx.fillStyle = flat ? o.col : "rgb(" + TH.hullDark + ")";
  rrect(-r * .3, -r * .22, r * 1.2, r * .44, r * .16); ctx.fill();
  if (!flat) {
    ctx.fillStyle = "rgba(" + core + "," + (.45 + (o.kick || 0) * .55) + ")";
    ctx.beginPath(); ctx.arc(r * .82, 0, r * (.13 + (o.kick || 0) * .1), 0, TAU); ctx.fill();
    if (o.kick > .02) glowPool(r * .9, 0, r * (.5 + o.kick * 1.4), core, o.kick * .7);
  }
  ctx.restore();
  /* helmet: dome, crest fin, visor */
  ctx.save();
  ctx.translate(r * .66, 0);
  ctx.fillStyle = flat ? o.col : "rgb(" + TH.hull + ")";
  ctx.beginPath();
  ctx.moveTo(r * .56, 0);
  ctx.quadraticCurveTo(r * .38, r * .44, -r * .22, r * .38);
  ctx.quadraticCurveTo(-r * .42, 0, -r * .22, -r * .38);
  ctx.quadraticCurveTo(r * .38, -r * .44, r * .56, 0);
  ctx.closePath(); ctx.fill();
  if (!flat) { ctx.strokeStyle = "rgba(" + TH.hullDark + ",.9)"; ctx.lineWidth = 1.3; ctx.stroke(); }
  /* crest fin */
  ctx.fillStyle = flat ? o.col : "rgba(" + TH.hullDark + ",.9)";
  ctx.beginPath();
  ctx.moveTo(-r * .16, -r * .3); ctx.lineTo(r * .02, -r * .9); ctx.lineTo(r * .3, -r * .2);
  ctx.closePath(); ctx.fill();
  if (!flat) visor(r * .22, 0, r * .2, r * .5, core, 1, Math.PI / 2);
  ctx.restore();
  /* core reactor */
  if (!flat) {
    const cg = ctx.createRadialGradient(-r * .06, -r * .1, 1, 0, 0, r * .6);
    cg.addColorStop(0, "rgba(255,255,255,.95)");
    cg.addColorStop(.5, "rgb(" + core + ")");
    cg.addColorStop(1, "rgba(" + core + ",.25)");
    ctx.fillStyle = cg;
    ctx.beginPath(); ctx.arc(-r * .05, 0, r * .28, 0, TAU); ctx.fill();
    ctx.strokeStyle = "rgba(" + TH.hullDark + ",.85)"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(-r * .05, 0, r * .28, 0, TAU); ctx.stroke();
  }
}
function drawPlayer() {
  const p = G.player;
  if (!p) return;
  const speed = Math.hypot(p.vx, p.vy);
  softShadow(p.x, p.y, p.r, p.r);
  drawTrail(p);
  /* cape — hangs off the back and lags behind the frame */
  ctx.save();
  ctx.translate(p.x, p.y);
  const capeAng = speed > 24 ? Math.atan2(p.vy, p.vx) + Math.PI : p.aim + Math.PI;
  ctx.save();
  ctx.rotate(capeAng);
  const flap = clamp(speed / 300, .25, 1.4);
  ctx.globalAlpha = .82;
  hem(p.r * (.7 + flap * .5), G.time * (3 + flap * 4), 1.35, "rgba(" + TH.echo + ",.35)", 5, .2);
  ctx.globalAlpha = 1;
  ctx.restore();
  if (p.iframe > 0 && Math.floor(G.time * 22) % 2 === 0) ctx.globalAlpha = .55;
  if (p.shield > 0) {
    ctx.save();
    ctx.strokeStyle = "rgba(" + TH.core + "," + (.28 + Math.sin(G.time * 3) * .12) + ")";
    ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.arc(0, 0, p.r + 9 + p.shield * 2, 0, TAU); ctx.stroke();
    ctx.setLineDash([3, 7]); ctx.lineDashOffset = -G.time * 30;
    ctx.strokeStyle = "rgba(" + TH.core + ",.5)";
    ctx.beginPath(); ctx.arc(0, 0, p.r + 13 + p.shield * 2, 0, TAU); ctx.stroke();
    ctx.restore();
  }
  /* squash and stretch: stretched along the way the frame is being thrown,
     pinched across it. Rotating into that axis and back leaves the body's
     own aim rotation below untouched. */
  const st = p.stretch || 0;
  if (st > .01) {
    ctx.rotate(p.stretchAng || 0);
    ctx.scale(1 + st, 1 - st * .55);
    ctx.rotate(-(p.stretchAng || 0));
  }
  const pop = 1 + (p.pop || 0) * .3;
  ctx.scale(pop, pop);
  ctx.rotate(p.aim);
  /* thrusters */
  const thrust = clamp(speed / 340, 0, 1.6) + (p.dashing > 0 ? 1.6 : 0);
  if (thrust > .08) {
    const fl = p.r * (.6 + thrust * 1.6) * (.85 + Math.random() * .3);
    for (const sgn of [-1, 1]) {
      const g = ctx.createLinearGradient(-p.r * .5, 0, -p.r * .5 - fl, 0);
      g.addColorStop(0, "rgba(255,255,255,.95)");
      g.addColorStop(.3, "rgba(" + TH.core + ",.75)");
      g.addColorStop(1, "rgba(" + TH.core + ",0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(-p.r * .55, sgn * p.r * .55);
      ctx.lineTo(-p.r * .55 - fl, sgn * p.r * .12);
      ctx.lineTo(-p.r * .55, sgn * p.r * .06);
      ctx.closePath(); ctx.fill();
    }
  }
  heroBody(p, { kick: p.fireKick || 0, step: p.legPhase || 0 });
  /* a white frame the instant something lands, same read as the enemies get */
  if (p.hitFlash > 0) {
    ctx.globalAlpha = clamp(p.hitFlash / HIT_FLASH_PLAYER, 0, 1) * .9;
    ctx.fillStyle = "rgb(" + TH.rim + ")";
    ctx.beginPath(); ctx.arc(0, 0, p.r * 1.12, 0, TAU); ctx.fill();
  }
  ctx.restore();
  /* swap charge halo */
  if (p.swapFlash > 0) {
    ctx.save();
    ctx.globalAlpha = clamp(p.swapFlash, 0, 1) * .8;
    ctx.strokeStyle = "rgb(" + TH.echo + ")"; ctx.lineWidth = 2;
    polyPath(p.r * (2.2 - p.swapFlash), 6, G.time * 4); ctx.stroke();
    ctx.restore();
  }
}

/* ---- motion trails (cosmetic) ---- */
const MATRIX_GLYPHS = "01ｱｶｻﾀﾅﾊﾏﾔﾗﾜ+=*<>?#%$";
function drawTrail(p) {
  const h = p.hist, n = h.length;
  if (n < 4) return;
  const kind = COS.trail;
  ctx.save();
  ctx.lineCap = "round";
  if (kind === "trail_rainbow") {
    for (let i = 2; i < n; i += 2) {
      const a = i / n, q = h[i - 2], k = h[i];
      ctx.strokeStyle = "hsla(" + ((i * 6 + G.time * 130) % 360) + ",92%," + (TH.dim ? 64 : 44) + "%," + (a * a * .55) + ")";
      ctx.lineWidth = 1 + a * 6;
      ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(k.x, k.y); ctx.stroke();
    }
  } else if (kind === "trail_matrix") {
    for (let i = 2; i < n; i += 2) {
      const a = i / n, q = h[i - 2], k = h[i];
      ctx.strokeStyle = "rgba(126,240,168," + (a * a * .12) + ")";
      ctx.lineWidth = 1 + a * 3;
      ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(k.x, k.y); ctx.stroke();
    }
    ctx.textAlign = "center";
    for (let i = n - 3; i > 2; i -= 5) {
      const a = i / n, k = h[i];
      const idx = (Math.floor(k.x * .7 + k.y * .3 + i * 3 + G.time * 11) % MATRIX_GLYPHS.length + MATRIX_GLYPHS.length) % MATRIX_GLYPHS.length;
      ctx.font = "700 " + (8 + a * 4).toFixed(1) + "px " + MONO;
      ctx.fillStyle = "rgba(" + (a > .82 ? "220,255,235" : "126,240,168") + "," + (a * a * .85) + ")";
      ctx.fillText(MATRIX_GLYPHS[idx], k.x, k.y + 3);
    }
    ctx.textAlign = "left";
  } else if (kind === "trail_glitch") {
    for (let k = 1; k <= 3; k++) {
      const i = n - 1 - k * 12;
      if (i < 1) break;
      const q = h[i], a = .34 - k * .085, rr = p.r * (1 - k * .07);
      ctx.save();
      ctx.translate(q.x + Math.round(rnd(-1.5, 1.5)), q.y);
      ctx.rotate(p.aim);
      ctx.globalCompositeOperation = TH.dim ? "lighter" : "source-over";
      ctx.fillStyle = "rgba(255,64,116," + a + ")";
      ctx.save(); ctx.translate(2.6, 0); shipPath(rr); ctx.fill(); ctx.restore();
      ctx.fillStyle = "rgba(64,222,255," + a + ")";
      ctx.save(); ctx.translate(-2.6, 0); shipPath(rr); ctx.fill(); ctx.restore();
      ctx.restore();
      if (chance(.3)) {
        ctx.fillStyle = "rgba(" + TH.rim + "," + (a * .5) + ")";
        ctx.fillRect(q.x - 14 + rnd(-6, 6), q.y + rnd(-8, 8), rnd(10, 26), 1.5);
      }
    }
  } else {
    for (let i = 2; i < n; i += 2) {
      const a = i / n, q = h[i - 2], k = h[i];
      ctx.strokeStyle = "rgba(" + TH.core + "," + (a * a * .18) + ")";
      ctx.lineWidth = 1 + a * 5;
      ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(k.x, k.y); ctx.stroke();
    }
  }
  ctx.restore();
}
/* ---- decoy skins (cosmetic) ---- */
function echoBody(c, fade) {
  const kind = COS.skin;
  if (kind === "skin_wire") {
    ctx.rotate(c.aim);
    ctx.strokeStyle = c.hit > 0 ? "rgb(" + TH.rim + ")" : "rgb(" + TH.echo + ")";
    ctx.lineWidth = 1.25;
    shipPath(c.r); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(c.r * 1.5, 0); ctx.lineTo(-c.r * .3, c.r * 1.02);
    ctx.moveTo(c.r * 1.5, 0); ctx.lineTo(-c.r * .3, -c.r * 1.02);
    ctx.moveTo(-c.r * .3, c.r * 1.02); ctx.lineTo(-c.r * .3, -c.r * 1.02);
    ctx.moveTo(-c.r * .58, 0); ctx.lineTo(c.r * 1.5, 0);
    ctx.stroke();
    ctx.fillStyle = "rgb(" + TH.echo + ")";
    const vs = [[c.r * 1.5, 0], [c.r * .6, c.r * .95], [-c.r * .3, c.r * 1.02], [-c.r * .58, 0], [-c.r * .3, -c.r * 1.02], [c.r * .6, -c.r * .95]];
    for (const v of vs) ctx.fillRect(v[0] - 1.5, v[1] - 1.5, 3, 3);
    ctx.rotate(-c.aim);
    ctx.strokeStyle = "rgba(" + TH.echo + ",.45)";
    ctx.lineWidth = 1;
    polyPath(c.r + 5, 3, -G.time * 1.3); ctx.stroke();
  } else if (kind === "skin_static") {
    const dense = 20 + Math.round(fade * 22);
    for (let i = 0; i < dense; i++) {
      const a = rnd(TAU), d = Math.pow(Math.random(), .6) * (c.r + 3);
      ctx.fillStyle = "rgba(" + (Math.random() < .3 ? TH.rim : TH.echo) + "," + rnd(.85, .2) + ")";
      ctx.fillRect(Math.cos(a) * d, Math.sin(a) * d, 1.9, 1.9);
    }
    for (let i = 0; i < 3; i++) {
      const y = rnd(-c.r, c.r);
      ctx.fillStyle = "rgba(" + TH.echo + "," + rnd(.5, .15) + ")";
      ctx.fillRect(-c.r - rnd(6, 0), y, c.r * 2 + rnd(10, 2), 1.2);
    }
    ctx.rotate(c.aim);
    ctx.strokeStyle = "rgba(" + TH.echo + ",.38)";
    ctx.lineWidth = 1;
    shipPath(c.r); ctx.stroke();
    ctx.rotate(-c.aim);
  } else if (kind === "skin_neon") {
    ctx.rotate(c.aim);
    ctx.shadowColor = "rgba(" + TH.echo + ",.95)";
    ctx.shadowBlur = 16;
    ctx.strokeStyle = "rgb(" + TH.echo + ")";
    ctx.lineWidth = 2.6;
    shipPath(c.r); ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(" + TH.deep + ",.86)";
    shipPath(c.r * .92); ctx.fill();
    ctx.fillStyle = "rgba(" + TH.rim + ",.9)";
    ctx.beginPath(); ctx.arc(c.r * .1, 0, c.r * .2, 0, TAU); ctx.fill();
    ctx.rotate(-c.aim);
  } else {
    ctx.rotate(c.aim);
    ctx.fillStyle = "rgba(" + TH.echo + ",.22)";
    shipPath(c.r); ctx.fill();
    ctx.strokeStyle = c.hit > 0 ? "rgb(" + TH.rim + ")" : "rgb(" + TH.echo + ")";
    ctx.lineWidth = 1.8;
    shipPath(c.r); ctx.stroke();
    ctx.fillStyle = "rgb(" + TH.echo + ")";
    ctx.beginPath(); ctx.arc(0, 0, c.r * .26, 0, TAU); ctx.fill();
    ctx.rotate(-c.aim);
  }
}
function drawEcho(c) {
  const fade = clamp(c.life / c.max, 0, 1);
  ctx.save();
  ctx.globalAlpha = .12 * fade;
  ctx.strokeStyle = "rgb(" + TH.echo + ")";
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i < c.path.length; i += 3) { const n = c.path[i]; i ? ctx.lineTo(n.x, n.y) : ctx.moveTo(n.x, n.y); }
  ctx.stroke();
  ctx.restore();
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.globalAlpha = .45 + fade * .45;
  echoBody(c, fade);
  ctx.strokeStyle = "rgba(" + TH.echo + ",.8)";
  ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.arc(0, 0, c.r + 6, -Math.PI / 2, -Math.PI / 2 + TAU * fade); ctx.stroke();
  ctx.restore();
}

