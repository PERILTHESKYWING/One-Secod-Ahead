/* Canvas setup and the low-level drawing toolkit shared by every renderer: gradients, shadows, limbs, eyes, cracks, plates, chains, etc. */
/* ---------------- canvas + art helpers -------------------------------- */
const cv = $("#game");
let ctx = cv.getContext("2d", { alpha: false });
let W = 0, H = 0, DPR = 1;
const bloomC = document.createElement("canvas"); const bctx = bloomC.getContext("2d");
const backC = document.createElement("canvas"); const kctx = backC.getContext("2d");
let backdropDirty = true, gradCache = {};

function resize() {
  DPR = Math.min(devicePixelRatio || 1, 2);
  W = innerWidth; H = innerHeight;
  cv.width = Math.floor(W * DPR); cv.height = Math.floor(H * DPR);
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  bloomC.width = Math.max(2, W >> 2); bloomC.height = Math.max(2, H >> 2);
  backC.width = Math.floor(W + 120); backC.height = Math.floor(H + 120);
  backdropDirty = true; gradCache = {};
}
addEventListener("resize", resize);

/* radial body gradient, cached, drawn around the origin (use after translate) */
function bodyGrad(key, r, c1, c2) {
  const k = key + "|" + Math.round(r) + "|" + TH.id;
  let g = gradCache[k];
  if (!g) {
    g = ctx.createRadialGradient(-r * .34, -r * .4, r * .12, 0, 0, r * 1.12);
    g.addColorStop(0, c1); g.addColorStop(1, c2);
    gradCache[k] = g;
  }
  return g;
}
function softShadow(x, y, rx, ry) {
  ctx.save();
  ctx.globalAlpha = TH.shadowA;
  ctx.fillStyle = "rgb(" + TH.shadow + ")";
  ctx.beginPath();
  ctx.ellipse(x + rx * .18, y + ry * 1.35, rx * .95, ry * .42, 0, 0, TAU);
  ctx.filter = "none";
  ctx.fill();
  ctx.restore();
}
function rimLight(r, alpha) {
  ctx.save();
  ctx.globalAlpha = (alpha == null ? TH.rimA : alpha) * .85;
  ctx.strokeStyle = "rgb(" + TH.rim + ")";
  ctx.lineWidth = Math.max(1, r * .11);
  ctx.beginPath();
  ctx.arc(0, 0, r * .9, Math.PI * 1.05, Math.PI * 1.72);
  ctx.stroke();
  ctx.restore();
}
function outline(r, col) {
  if (!TH.outline) return;
  ctx.save();
  ctx.globalAlpha = TH.outline;
  ctx.strokeStyle = "rgba(" + shade(col, .45, .3, [0, 0, 0]) + ",1)";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.restore();
}
function blob(r, wobble, phase, pts) {
  pts = pts || 16;
  ctx.beginPath();
  for (let i = 0; i <= pts; i++) {
    const a = (i / pts) * TAU;
    const rr = r * (1 + Math.sin(a * 3 + phase) * wobble + Math.cos(a * 5 - phase * .7) * wobble * .5);
    const x = Math.cos(a) * rr, y = Math.sin(a) * rr;
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  }
  ctx.closePath();
}
function polyPath(r, n, rot, inner) {
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const a = rot + (i / n) * TAU;
    const rr = inner && i % 2 ? r * inner : r;
    const x = Math.cos(a) * rr, y = Math.sin(a) * rr;
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  }
  ctx.closePath();
}
/* jointed limb: hip -> knee -> foot, sine driven */
function limb(hx, hy, len, baseAng, swing, col, w) {
  const kx = hx + Math.cos(baseAng + swing * .5) * len * .55;
  const ky = hy + Math.sin(baseAng + swing * .5) * len * .55;
  const fx = kx + Math.cos(baseAng + swing) * len * .6;
  const fy = ky + Math.sin(baseAng + swing) * len * .6;
  ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(kx, ky); ctx.lineTo(fx, fy); ctx.stroke();
}
/* mechanical leg: same hip->knee->foot chain as limb(), but straight segments
   with a hard joint block and a foot pad instead of rounded organic caps */
function strut(hx, hy, len, baseAng, swing, col, w) {
  const kx = hx + Math.cos(baseAng + swing * .5) * len * .55;
  const ky = hy + Math.sin(baseAng + swing * .5) * len * .55;
  const fx = kx + Math.cos(baseAng + swing) * len * .6;
  const fy = ky + Math.sin(baseAng + swing) * len * .6;
  ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = "butt"; ctx.lineJoin = "miter";
  ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(kx, ky); ctx.lineTo(fx, fy); ctx.stroke();
  ctx.save(); ctx.translate(kx, ky); ctx.rotate(baseAng + swing * .5);
  ctx.fillStyle = col; rrect(-w * .55, -w * .55, w * 1.1, w * 1.1, w * .2); ctx.fill();
  ctx.restore();
  ctx.save(); ctx.translate(fx, fy); ctx.rotate(baseAng + swing);
  ctx.fillStyle = col; rrect(-w * .7, -w * .35, w, w * .7, w * .18); ctx.fill();
  ctx.restore();
}
function eye(x, y, r, look, colIris, blink) {
  ctx.save();
  ctx.translate(x, y);
  const open = blink == null ? 1 : blink;
  ctx.fillStyle = "rgba(" + TH.rim + ",.92)";
  ctx.beginPath(); ctx.ellipse(0, 0, r, r * open, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = colIris;
  ctx.beginPath(); ctx.ellipse(Math.cos(look) * r * .32, Math.sin(look) * r * .32 * open, r * .52, r * .52 * open, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = "rgba(" + TH.rim + ",.9)";
  ctx.beginPath(); ctx.arc(-r * .25, -r * .3, r * .18, 0, TAU); ctx.fill();
  ctx.restore();
}
function cracks(r, frac, col) {
  if (frac > .6) return;
  const n = frac < .3 ? 3 : 2;
  ctx.save();
  ctx.strokeStyle = col; ctx.globalAlpha = .5; ctx.lineWidth = 1.2;
  for (let i = 0; i < n; i++) {
    const a = i * 2.1 + 1;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * r * .2, Math.sin(a) * r * .2);
    ctx.lineTo(Math.cos(a + .4) * r * .6, Math.sin(a + .4) * r * .6);
    ctx.lineTo(Math.cos(a + .1) * r * .92, Math.sin(a + .1) * r * .92);
    ctx.stroke();
  }
  ctx.restore();
}


/* ---------------- character art toolkit -------------------------------- */
function rrect(x, y, w, h, r) {
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h);
}
function tri(x1, y1, x2, y2, x3, y3) {
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.lineTo(x3, y3); ctx.closePath();
}
function glowPool(x, y, r, col, a) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, "rgba(" + col + "," + a + ")");
  g.addColorStop(1, "rgba(" + col + ",0)");
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
}
/* an eye with a lid, an iris and an angry brow — the difference between a
   shape and a face is entirely in this function */
function faceEye(x, y, r, look, iris, o) {
  o = o || {};
  const open = o.blink == null ? 1 : clamp(o.blink, .06, 1);
  ctx.save(); ctx.translate(x, y); if (o.tilt) ctx.rotate(o.tilt);
  ctx.fillStyle = o.sclera || "rgba(" + TH.rim + ",.94)";
  ctx.beginPath(); ctx.ellipse(0, 0, r, r * open, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = iris;
  const lx = Math.cos(look) * r * .3, ly = Math.sin(look) * r * .3 * open;
  ctx.beginPath(); ctx.ellipse(lx, ly, r * .55, r * .55 * open, 0, 0, TAU); ctx.fill();
  if (o.slit) {
    ctx.fillStyle = "rgba(10,6,14,.85)";
    ctx.beginPath(); ctx.ellipse(lx, ly, r * .17, r * .5 * open, 0, 0, TAU); ctx.fill();
  } else {
    ctx.fillStyle = "rgba(10,6,14,.72)";
    ctx.beginPath(); ctx.arc(lx, ly, r * .24 * open, 0, TAU); ctx.fill();
  }
  ctx.fillStyle = "rgba(255,255,255,.9)";
  ctx.beginPath(); ctx.arc(-r * .26, -r * .3 * open, r * .17, 0, TAU); ctx.fill();
  if (o.brow) {
    ctx.strokeStyle = o.brow; ctx.lineWidth = r * .42; ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-r * 1.05, -r * (o.angry ? .55 : .95));
    ctx.lineTo(r * 1.0, -r * (o.angry ? 1.15 : 1.0));
    ctx.stroke();
  }
  ctx.restore();
}
/* a single glowing slit — visors, masks, sensor eyes */
function visor(x, y, w, h, col, a, skew) {
  ctx.save(); ctx.translate(x, y); if (skew) ctx.rotate(skew);
  const g = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
  g.addColorStop(0, "rgba(" + col + ",.25)");
  g.addColorStop(.5, "rgba(" + col + "," + (a == null ? .95 : a) + ")");
  g.addColorStop(1, "rgba(" + col + ",.25)");
  ctx.fillStyle = g;
  rrect(-w / 2, -h / 2, w, h, h / 2); ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,.55)";
  rrect(-w / 2 + w * .12, -h * .22, w * .3, h * .24, h * .12); ctx.fill();
  ctx.restore();
}
/* a small clock-face charge readout: tick marks plus a hand sweeping from
   12 o'clock as progress runs 0..1. col is a raw "r,g,b" string. */
function clockTick(x, y, r, progress, col, ticks) {
  ctx.save(); ctx.translate(x, y);
  ctx.strokeStyle = "rgba(" + col + ",.5)"; ctx.lineWidth = 1;
  const n = ticks || 8;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU - Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * r * .74, Math.sin(a) * r * .74);
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    ctx.stroke();
  }
  ctx.strokeStyle = "rgba(" + col + ",.95)"; ctx.lineWidth = 1.8; ctx.lineCap = "round";
  const a = clamp(progress, 0, 1) * TAU - Math.PI / 2;
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * r * .82, Math.sin(a) * r * .82); ctx.stroke();
  ctx.restore();
}
/* a row of teeth along a horizontal mouth line */
function fangs(x, y, w, n, h, col, down) {
  ctx.fillStyle = col;
  for (let i = 0; i < n; i++) {
    const fx = x - w / 2 + (w / n) * (i + .5);
    const fw = (w / n) * .42;
    tri(fx - fw, y, fx + fw, y, fx, y + (down ? h : -h) * (i % 2 ? .68 : 1));
    ctx.fill();
  }
}
/* three-fingered claw at the end of a limb */
function claw(x, y, ang, len, col, w) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
  ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = "round";
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(len * .6, i * len * .34, len, i * len * .52);
    ctx.stroke();
  }
  ctx.restore();
}
/* curved horn growing out of a head */
function horn(x, y, ang, len, w, col, curl) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(0, -w / 2);
  ctx.quadraticCurveTo(len * .55, -w * (curl || .8), len, 0);
  ctx.quadraticCurveTo(len * .5, w * .1, 0, w / 2);
  ctx.closePath(); ctx.fill();
  ctx.restore();
}
/* ragged cloth hem — cloaks, robes, capes */
function hem(r, phase, spread, col, tips, wob) {
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(-r * .1, -r * .8);
  const n = tips || 7;
  for (let i = 0; i <= n; i++) {
    const f = i / n;
    const a = -spread / 2 + spread * f;
    const rr = r * (1.5 + Math.sin(phase * 2 + i * 1.4) * (wob == null ? .16 : wob));
    ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    if (i < n) {
      const a2 = a + spread / n * .5;
      ctx.lineTo(Math.cos(a2) * rr * .74, Math.sin(a2) * rr * .74);
    }
  }
  ctx.lineTo(-r * .1, r * .8);
  ctx.closePath(); ctx.fill();
}
/* armour plate with a highlight edge */
function plate(x, y, w, h, r, col, hi) {
  ctx.fillStyle = col;
  rrect(x, y, w, h, r); ctx.fill();
  if (hi) {
    ctx.fillStyle = hi;
    rrect(x + w * .08, y + h * .1, w * .84, h * .22, r * .5); ctx.fill();
  }
}
function bolt(x1, y1, x2, y2, col, w, jag) {
  ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineJoin = "round";
  ctx.beginPath(); ctx.moveTo(x1, y1);
  const n = 4;
  for (let i = 1; i < n; i++) {
    const f = i / n;
    ctx.lineTo(lerp(x1, x2, f) + rnd(-jag, jag), lerp(y1, y2, f) + rnd(-jag, jag));
  }
  ctx.lineTo(x2, y2); ctx.stroke();
}
/* chunky segmented chain, used by the Warden */
function chain(x1, y1, x2, y2, col, links) {
  const d = Math.hypot(x2 - x1, y2 - y1), n = links || Math.max(3, Math.round(d / 15));
  const a = Math.atan2(y2 - y1, x2 - x1);
  ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = 2.4;
  for (let i = 0; i < n; i++) {
    const f = (i + .5) / n;
    const sag = Math.sin(f * Math.PI) * 10;
    const cx = lerp(x1, x2, f) + Math.cos(a + Math.PI / 2) * sag;
    const cy = lerp(y1, y2, f) + Math.sin(a + Math.PI / 2) * sag;
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(a);
    ctx.beginPath(); ctx.ellipse(0, 0, 5.4, 3.1, 0, 0, TAU); ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}

/* ---------------- backdrop ------------------------------------------- */
function ACC() { return TH.tint || curLevel().accent; }
function bakeBackdrop() {
  const L = curLevel();
  const cols = TH.bg || (TH.dim ? L.dark : L.light);
  const w = backC.width, h = backC.height;
  kctx.setTransform(1, 0, 0, 1, 0, 0);
  kctx.clearRect(0, 0, w, h);
  const g = kctx.createRadialGradient(w * .5, h * .42, 20, w * .5, h * .5, Math.max(w, h) * .78);
  g.addColorStop(0, cols[0]); g.addColorStop(1, cols[1]);
  kctx.fillStyle = g; kctx.fillRect(0, 0, w, h);

  /* soft clouds for depth */
  for (let i = 0; i < 14; i++) {
    const x = rnd(w), y = rnd(h), r = rnd(w * .34, w * .1);
    const cg = kctx.createRadialGradient(x, y, 0, x, y, r);
    cg.addColorStop(0, "rgba(" + ACC() + "," + (TH.cloudA || (TH.dim ? .05 : .07)) + ")");
    cg.addColorStop(1, "rgba(" + ACC() + ",0)");
    kctx.fillStyle = cg; kctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  /* floor pattern */
  const sp = 62;
  kctx.strokeStyle = "rgba(" + TH.grid + "," + TH.gridA + ")";
  kctx.lineWidth = 1;
  kctx.beginPath();
  for (let x = 0; x < w; x += sp) { kctx.moveTo(x, 0); kctx.lineTo(x, h); }
  for (let y = 0; y < h; y += sp) { kctx.moveTo(0, y); kctx.lineTo(w, y); }
  kctx.stroke();
  kctx.strokeStyle = "rgba(" + TH.grid + "," + TH.gridA2 + ")";
  kctx.beginPath();
  for (let x = 0; x < w; x += sp * 4) { kctx.moveTo(x, 0); kctx.lineTo(x, h); }
  for (let y = 0; y < h; y += sp * 4) { kctx.moveTo(0, y); kctx.lineTo(w, y); }
  kctx.stroke();

  const env = L.env;
  const ink = TH.dim ? "255,255,255" : "40,60,110";
  if (env === "pillars") {
    for (let i = 0; i < 9; i++) {
      const x = rnd(w), y = rnd(h), pw = rnd(70, 26), ph = rnd(240, 90);
      const pg = kctx.createLinearGradient(x, y, x + pw, y);
      pg.addColorStop(0, "rgba(" + ACC() + ",.14)");
      pg.addColorStop(.5, "rgba(" + ink + ",.05)");
      pg.addColorStop(1, "rgba(" + ACC() + ",.03)");
      kctx.fillStyle = pg;
      kctx.beginPath();
      if (kctx.roundRect) kctx.roundRect(x, y, pw, ph, pw / 2); else kctx.rect(x, y, pw, ph);
      kctx.fill();
    }
  } else if (env === "spores") {
    for (let i = 0; i < 26; i++) {
      const x = rnd(w), y = rnd(h), r = rnd(52, 12);
      kctx.strokeStyle = "rgba(" + ACC() + "," + rnd(.14, .04) + ")";
      kctx.lineWidth = 1.4;
      kctx.beginPath(); kctx.arc(x, y, r, 0, TAU); kctx.stroke();
      kctx.fillStyle = "rgba(" + ACC() + ",.05)";
      kctx.beginPath(); kctx.arc(x, y, r * .5, 0, TAU); kctx.fill();
    }
  } else if (env === "rain") {
    kctx.lineWidth = 1;
    for (let i = 0; i < 130; i++) {
      const x = rnd(w), y = rnd(h), l = rnd(90, 26);
      kctx.strokeStyle = "rgba(" + ACC() + "," + rnd(.13, .03) + ")";
      kctx.beginPath(); kctx.moveTo(x, y); kctx.lineTo(x + l * .35, y + l); kctx.stroke();
    }
  } else if (env === "mirror") {
    const mg = kctx.createLinearGradient(w / 2 - 70, 0, w / 2 + 70, 0);
    mg.addColorStop(0, "rgba(" + ACC() + ",0)");
    mg.addColorStop(.5, "rgba(" + ACC() + ",.16)");
    mg.addColorStop(1, "rgba(" + ACC() + ",0)");
    kctx.fillStyle = mg; kctx.fillRect(w / 2 - 70, 0, 140, h);
    kctx.strokeStyle = "rgba(" + ACC() + ",.32)"; kctx.lineWidth = 1.4;
    kctx.beginPath(); kctx.moveTo(w / 2, 0); kctx.lineTo(w / 2, h); kctx.stroke();
  } else if (env === "fold") {
    for (let i = 0; i < 7; i++) {
      kctx.strokeStyle = "rgba(" + ACC() + "," + (.16 - i * .015) + ")";
      kctx.lineWidth = 1.6;
      kctx.beginPath();
      for (let k = 0; k < 7; k++) {
        const a = (k / 6) * TAU + i * .3;
        const rr = 120 + i * 96;
        const x = w / 2 + Math.cos(a) * rr * 1.5, y = h / 2 + Math.sin(a) * rr;
        k ? kctx.lineTo(x, y) : kctx.moveTo(x, y);
      }
      kctx.closePath(); kctx.stroke();
    }
  } else if (env === "glass") {
    /* a pane that broke and was told to hold still: shards, then the cracks */
    for (let i = 0; i < 24; i++) {
      const x = rnd(w), y = rnd(h), rr = rnd(160, 44), sides = rint(3, 6), rot = rnd(TAU);
      const sg = kctx.createLinearGradient(x - rr, y - rr, x + rr, y + rr);
      sg.addColorStop(0, "rgba(" + ACC() + ",.17)");
      sg.addColorStop(.55, "rgba(" + ink + ",.03)");
      sg.addColorStop(1, "rgba(" + ACC() + ",.01)");
      kctx.fillStyle = sg;
      kctx.beginPath();
      for (let k = 0; k < sides; k++) {
        const a = rot + (k / sides) * TAU;
        const px = x + Math.cos(a) * rr * rnd(1.15, .6), py = y + Math.sin(a) * rr * rnd(1.15, .6);
        k ? kctx.lineTo(px, py) : kctx.moveTo(px, py);
      }
      kctx.closePath(); kctx.fill();
      kctx.strokeStyle = "rgba(" + ACC() + ",.17)";
      kctx.lineWidth = 1.1; kctx.stroke();
    }
    /* four impact points, each throwing long hairline fractures */
    for (let i = 0; i < 6; i++) {
      const ox = rnd(w), oy = rnd(h), arms = rint(5, 9);
      for (let k = 0; k < arms; k++) {
        let a = rnd(TAU), x = ox, y = oy, len = rnd(230, 90);
        kctx.strokeStyle = "rgba(" + ACC() + "," + rnd(.16, .05) + ")";
        kctx.lineWidth = rnd(1.5, .5);
        kctx.beginPath(); kctx.moveTo(x, y);
        for (let s = 0; s < 5; s++) {
          a += rnd(.5, -.25);
          x += Math.cos(a) * len / 5; y += Math.sin(a) * len / 5;
          kctx.lineTo(x, y);
        }
        kctx.stroke();
      }
    }
  } else if (env === "ember") {
    /* heat: convection bands, flare arcs off the centre, floating ash */
    for (let i = 0; i < 13; i++) {
      const y = rnd(h), bh = rnd(96, 26);
      const bg = kctx.createLinearGradient(0, y, 0, y + bh);
      bg.addColorStop(0, "rgba(" + ACC() + ",0)");
      bg.addColorStop(.5, "rgba(" + ACC() + "," + rnd(.09, .03) + ")");
      bg.addColorStop(1, "rgba(" + ACC() + ",0)");
      kctx.fillStyle = bg; kctx.fillRect(0, y, w, bh);
    }
    for (let i = 0; i < 7; i++) {
      const rr = 150 + i * 130;
      kctx.strokeStyle = "rgba(" + ACC() + "," + (.14 - i * .016) + ")";
      kctx.lineWidth = rnd(2.4, .8);
      const a0 = rnd(TAU);
      kctx.beginPath();
      kctx.arc(w * .5, h * .5, rr, a0, a0 + rnd(2.4, .8));
      kctx.stroke();
    }
    for (let i = 0; i < 150; i++) {
      const x = rnd(w), y = rnd(h), r = rnd(2.6, .5);
      kctx.fillStyle = "rgba(" + ACC() + "," + rnd(.45, .1) + ")";
      kctx.beginPath(); kctx.arc(x, y, r, 0, TAU); kctx.fill();
      if (r > 1.8) {
        kctx.strokeStyle = "rgba(" + ACC() + ",.12)"; kctx.lineWidth = 1;
        kctx.beginPath(); kctx.moveTo(x, y); kctx.lineTo(x - rnd(16, 5), y - rnd(30, 10)); kctx.stroke();
      }
    }
  } else if (env === "abyss") {
    /* depth: pressure strata, sonar rings, light shafts, suspended silt */
    for (let i = 0; i < 11; i++) {
      const y = (i / 11) * h + rnd(20, -20);
      kctx.strokeStyle = "rgba(" + ACC() + "," + (.11 - i * .006) + ")";
      kctx.lineWidth = rnd(2.2, .7);
      kctx.beginPath();
      kctx.moveTo(0, y);
      for (let x = 0; x <= w; x += 70) kctx.lineTo(x, y + Math.sin(x * .012 + i) * 11);
      kctx.stroke();
    }
    for (let i = 0; i < 5; i++) {
      const ox = rnd(w), oy = rnd(h);
      for (let k = 1; k <= 5; k++) {
        kctx.strokeStyle = "rgba(" + ACC() + "," + (.1 / k) + ")";
        kctx.lineWidth = 1.2;
        kctx.beginPath(); kctx.arc(ox, oy, k * 46, 0, TAU); kctx.stroke();
      }
    }
    for (let i = 0; i < 5; i++) {
      const x = rnd(w), sw = rnd(110, 34);
      const lg = kctx.createLinearGradient(0, 0, 0, h);
      lg.addColorStop(0, "rgba(" + ACC() + ",.1)");
      lg.addColorStop(1, "rgba(" + ACC() + ",0)");
      kctx.fillStyle = lg;
      kctx.beginPath();
      kctx.moveTo(x, 0); kctx.lineTo(x + sw, 0);
      kctx.lineTo(x + sw * 2.4, h); kctx.lineTo(x + sw * .9, h);
      kctx.closePath(); kctx.fill();
    }
    for (let i = 0; i < 140; i++) {
      const x = rnd(w), y = rnd(h);
      kctx.fillStyle = "rgba(" + ACC() + "," + rnd(.3, .05) + ")";
      kctx.beginPath(); kctx.arc(x, y, rnd(1.7, .4), 0, TAU); kctx.fill();
    }
  } else if (env === "terminus") {
    /* the end of the count: a dial with no hands, and tally marks everywhere.
       Terminus desaturates its accent to near-grey, so the marks are scratched
       in bare ink instead — they have to read against a dead wall. */
    const mark = TH.dim ? "228,236,252" : "26,36,66";
    kctx.save();
    kctx.translate(w * .5, h * .5);
    for (const rr of [Math.min(w, h) * .3, Math.min(w, h) * .42]) {
      kctx.strokeStyle = "rgba(" + mark + ",.16)"; kctx.lineWidth = 1.8;
      kctx.beginPath(); kctx.arc(0, 0, rr, 0, TAU); kctx.stroke();
    }
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * TAU, big = i % 5 === 0;
      const r0 = Math.min(w, h) * .42, r1 = r0 + (big ? 26 : 13);
      kctx.strokeStyle = "rgba(" + mark + "," + (big ? .3 : .15) + ")";
      kctx.lineWidth = big ? 2.4 : 1.1;
      kctx.beginPath();
      kctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0);
      kctx.lineTo(Math.cos(a) * r1, Math.sin(a) * r1);
      kctx.stroke();
    }
    kctx.restore();
    /* tally marks, scratched in fives, most of them struck through */
    for (let i = 0; i < 44; i++) {
      const x = rnd(w), y = rnd(h), sc = rnd(1.6, .6), a = rnd(.5, -.5);
      kctx.save();
      kctx.translate(x, y); kctx.rotate(a); kctx.scale(sc, sc);
      kctx.strokeStyle = "rgba(" + mark + "," + rnd(.34, .12) + ")";
      kctx.lineWidth = 1.9;
      const n = rint(3, 5);
      for (let k = 0; k < n; k++) {
        kctx.beginPath(); kctx.moveTo(k * 7, -11); kctx.lineTo(k * 7 + 2, 11); kctx.stroke();
      }
      if (n >= 5) {
        kctx.beginPath(); kctx.moveTo(-4, 9); kctx.lineTo(n * 7 + 1, -9); kctx.stroke();
      }
      kctx.restore();
    }
    /* the grid giving out toward the edges */
    for (let i = 0; i < 70; i++) {
      const x = rnd(w), y = rnd(h);
      kctx.fillStyle = "rgba(" + ink + "," + rnd(.07, .015) + ")";
      kctx.fillRect(x, y, rnd(74, 18), rnd(74, 18));
    }
  } else {
    for (let i = 0; i < 90; i++) {
      const x = rnd(w), y = rnd(h), r = rnd(2.4, .5);
      kctx.fillStyle = "rgba(" + ACC() + "," + rnd(.4, .08) + ")";
      kctx.beginPath(); kctx.arc(x, y, r, 0, TAU); kctx.fill();
    }
  }
  backdropDirty = false;
}

