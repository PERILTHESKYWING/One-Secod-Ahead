/* The 'Cold Open' intro cinematic: scene table and per-scene canvas drawing. */
/* =====================================================================
   COLD OPEN — a fifteen second cinematic in five scenes.
   Everything is drawn, nothing is an asset. Each scene owns its own
   camera move so the cuts feel like cuts rather than crossfades.
   ===================================================================== */

const cineC = $("#cineCanvas");
const cctx = cineC.getContext("2d");
const CINE = {
  active: false, t: 0, scene: -1, after: null, dpr: 1, w: 0, h: 0,
  cues: {}, stars: [], flick: 0,
};

/* scene table: [start, end, draw, caption, sub] */
const SCENES = [
  { a: 0.0, b: 3.1, id: "array", cap: "THE CONCORDANCE", sub: "it does not delete. it prunes." },
  { a: 3.1, b: 6.1, id: "prune", cap: "ELEVEN THOUSAND BRANCHES", sub: "each one gets one second of notice" },
  { a: 6.1, b: 9.1, id: "chamber", cap: "QUANTUM STRESS CHAMBER 09", sub: "sealed. the log says from the outside." },
  { a: 9.1, b: 12.0, id: "buffer", cap: "SUBJECT · CHRONO-01", sub: "temporal buffer holding +1.041s" },
  { a: 12.0, b: 15.0, id: "wake", cap: "", sub: "" },
];

function cineResize() {
  const d = Math.min(devicePixelRatio || 1, 2);
  CINE.dpr = d;
  CINE.w = innerWidth; CINE.h = innerHeight;
  cineC.width = CINE.w * d; cineC.height = CINE.h * d;
  cineC.style.width = CINE.w + "px"; cineC.style.height = CINE.h + "px";
}
addEventListener("resize", () => { if (CINE.active) cineResize(); });

function runCine(after) {
  CINE.active = true; CINE.t = 0; CINE.scene = -1; CINE.after = after || goHome;
  CINE.cues = {};
  CINE.stars = [];
  for (let i = 0; i < 220; i++) CINE.stars.push({ x: Math.random(), y: Math.random(), z: Math.random(), tw: Math.random() * 6 });
  cineResize();
  show("cine");
  $("#cineCap").textContent = "";
  $("#cineSub").textContent = "";
  $("#cineSkip").classList.remove("hide");
  Audio_.init(); Audio_.resume();
  Audio_.cineDrone(true);
}
function endCine() {
  if (!CINE.active) return;
  CINE.active = false;
  Audio_.cineDrone(false);
  $("#cineSkip").classList.add("hide");
  const f = CINE.after; CINE.after = null;
  SAVE.booted = 1; persist();
  if (f) f();
}
function skipCine() {
  if (!CINE.active) return;
  Audio_.ui();
  endCine();
}
/* fires a cue exactly once at a given absolute time */
function cue(id, at, fn) {
  if (CINE.t >= at && !CINE.cues[id]) { CINE.cues[id] = 1; fn(); }
}

function cineTick(dt) {
  if (!CINE.active) return;
  CINE.t += dt;
  if (CINE.t >= 15) { endCine(); return; }
  const s = SCENES.find((x) => CINE.t >= x.a && CINE.t < x.b) || SCENES[SCENES.length - 1];
  const idx = SCENES.indexOf(s);
  if (idx !== CINE.scene) {
    CINE.scene = idx;
    CINE.flick = 1;
    $("#cineCap").textContent = s.cap;
    $("#cineSub").textContent = s.sub;
    const cw = $("#cineCapWrap");
    cw.classList.remove("in"); void cw.offsetWidth;
    if (s.cap) cw.classList.add("in");
    if (idx > 0) Audio_.cineCut();
  }
  CINE.flick = Math.max(0, CINE.flick - dt * 3);
  cineDraw(s, clamp((CINE.t - s.a) / (s.b - s.a), 0, 1));
}

function cineDraw(s, f) {
  const c = cctx, W2 = CINE.w, H2 = CINE.h;
  c.setTransform(CINE.dpr, 0, 0, CINE.dpr, 0, 0);
  c.fillStyle = "#04060c";
  c.fillRect(0, 0, W2, H2);
  c.save();
  /* every scene gets a slow push so nothing sits still */
  const push = 1 + f * .07;
  c.translate(W2 / 2, H2 / 2);
  c.scale(push, push);
  c.translate(-W2 / 2, -H2 / 2);
  ({ array: cineArray, prune: cinePrune, chamber: cineChamber, buffer: cineBuffer, wake: cineWake })[s.id](c, W2, H2, f);
  c.restore();
  /* cut flash + scanlines + vignette, shared across all scenes */
  if (CINE.flick > .01) {
    c.fillStyle = "rgba(190,230,255," + (CINE.flick * .35) + ")";
    c.fillRect(0, 0, W2, H2);
  }
  c.globalAlpha = .05;
  c.fillStyle = "#9fdcff";
  for (let y = 0; y < H2; y += 3) c.fillRect(0, y, W2, 1);
  c.globalAlpha = 1;
  const vg = c.createRadialGradient(W2 / 2, H2 / 2, Math.min(W2, H2) * .3, W2 / 2, H2 / 2, Math.max(W2, H2) * .75);
  vg.addColorStop(0, "rgba(0,0,0,0)");
  vg.addColorStop(1, "rgba(0,0,0,.85)");
  c.fillStyle = vg; c.fillRect(0, 0, W2, H2);
}

function cineStars(c, W2, H2, drift, alpha) {
  for (const st of CINE.stars) {
    const x = ((st.x + drift * st.z * .02) % 1) * W2;
    const y = st.y * H2;
    c.globalAlpha = (alpha == null ? 1 : alpha) * (.15 + st.z * .55) * (.7 + Math.sin(CINE.t * 2 + st.tw) * .3);
    c.fillStyle = "#cfe9ff";
    c.fillRect(x, y, st.z * 1.8 + .5, st.z * 1.8 + .5);
  }
  c.globalAlpha = 1;
}

/* --- SCENE 1: the array, a lattice of rings around a dying star ------- */
function cineArray(c, W2, H2, f) {
  cineStars(c, W2, H2, CINE.t, 1);
  const cx = W2 * .5, cy = H2 * .52;
  const R = Math.min(W2, H2) * (.16 + f * .04);
  /* the star */
  const g = c.createRadialGradient(cx, cy, 0, cx, cy, R * 2.2);
  g.addColorStop(0, "rgba(255,240,220,.95)");
  g.addColorStop(.18, "rgba(255,170,110,.6)");
  g.addColorStop(.5, "rgba(200,80,60,.18)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  c.fillStyle = g;
  c.beginPath(); c.arc(cx, cy, R * 2.2, 0, TAU); c.fill();
  c.fillStyle = "#1a1014";
  c.beginPath(); c.arc(cx, cy, R * .42, 0, TAU); c.fill();
  /* concentric station rings, tilted */
  for (let i = 0; i < 5; i++) {
    const rr = R * (.85 + i * .42);
    c.save();
    c.translate(cx, cy);
    c.rotate(i * .35 + CINE.t * .04 * (i % 2 ? -1 : 1));
    c.strokeStyle = "rgba(150,220,255," + (.55 - i * .07) + ")";
    c.lineWidth = 2.4 - i * .3;
    c.beginPath(); c.ellipse(0, 0, rr, rr * .3, 0, 0, TAU); c.stroke();
    /* station nodes on the ring */
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * TAU + CINE.t * .1 * (i % 2 ? -1 : 1);
      c.fillStyle = "rgba(190,240,255,.8)";
      c.fillRect(Math.cos(a) * rr - 2, Math.sin(a) * rr * .3 - 2, 4, 4);
    }
    c.restore();
  }
  /* branch lines radiating out into the dark — the archive */
  c.save();
  c.translate(cx, cy);
  for (let i = 0; i < 40; i++) {
    const a = (i / 40) * TAU + .2;
    const len = Math.max(W2, H2) * (.4 + (i % 7) * .06);
    c.strokeStyle = "rgba(120,190,240," + (.06 + (i % 3) * .04) + ")";
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(Math.cos(a) * R * 1.1, Math.sin(a) * R * .34);
    c.lineTo(Math.cos(a) * len, Math.sin(a) * len * .55);
    c.stroke();
  }
  c.restore();
  cue("c1a", .35, () => Audio_.cineHit(.4));
  cue("c1b", 1.6, () => Audio_.cineRiser(1.4));
}

/* --- SCENE 2: the pruning ------------------------------------------- */
function cinePrune(c, W2, H2, f) {
  cineStars(c, W2, H2, CINE.t * .4, .5);
  const cx = W2 * .12, cy = H2 * .5;
  /* a tree of branch lines running left to right */
  const seed = 12345;
  function br(x, y, ang, len, depth, idx) {
    if (depth <= 0) return;
    const x2 = x + Math.cos(ang) * len, y2 = y + Math.sin(ang) * len;
    /* branches get severed in sequence as f advances */
    const cutAt = (idx % 9) / 9;
    const cut = f > .18 + cutAt * .62;
    const p = cut ? clamp((f - (.18 + cutAt * .62)) * 6, 0, 1) : 0;
    c.strokeStyle = cut ? "rgba(255,90,110," + (.7 * (1 - p)) + ")" : "rgba(150,225,255,.6)";
    c.lineWidth = depth * .7;
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(lerp(x, x2, cut ? 1 - p * .85 : 1), lerp(y, y2, cut ? 1 - p * .85 : 1));
    c.stroke();
    if (cut && p < .6) {
      c.fillStyle = "rgba(255,160,150," + (1 - p) + ")";
      c.beginPath(); c.arc(lerp(x, x2, 1 - p * .85), lerp(y, y2, 1 - p * .85), 3 * (1 - p), 0, TAU); c.fill();
    }
    if (cut && p > .3) return;
    br(x2, y2, ang - .34 + Math.sin(idx * 2.1) * .1, len * .74, depth - 1, idx * 2 + 1);
    br(x2, y2, ang + .34 + Math.cos(idx * 1.7) * .1, len * .74, depth - 1, idx * 2 + 2);
  }
  br(cx, cy, 0, Math.min(W2, H2) * .19, 7, 1);
  /* the purge front: a vertical wall of light sweeping right */
  const px = W2 * (.05 + f * 1.05);
  const g = c.createLinearGradient(px - 120, 0, px + 40, 0);
  g.addColorStop(0, "rgba(255,120,120,0)");
  g.addColorStop(.7, "rgba(255,150,140,.22)");
  g.addColorStop(1, "rgba(255,230,220,.75)");
  c.fillStyle = g;
  c.fillRect(px - 120, 0, 160, H2);
  c.fillStyle = "rgba(255,240,235,.9)";
  c.fillRect(px, 0, 2, H2);
  cue("c2a", 3.2, () => Audio_.cineHit(.6));
  cue("c2b", 4.0, () => Audio_.cineSnap());
  cue("c2c", 4.8, () => Audio_.cineSnap());
  cue("c2d", 5.5, () => Audio_.cineSnap());
}

/* --- SCENE 3: the chamber interior ----------------------------------- */
function cineChamber(c, W2, H2, f) {
  const cx = W2 * .5, cy = H2 * .56;
  /* cold room light */
  const g = c.createRadialGradient(cx, cy - H2 * .1, 20, cx, cy, Math.max(W2, H2) * .7);
  g.addColorStop(0, "rgba(90,150,190,.28)");
  g.addColorStop(1, "rgba(4,8,16,1)");
  c.fillStyle = g; c.fillRect(0, 0, W2, H2);
  /* floor grid receding */
  c.strokeStyle = "rgba(110,190,230,.16)"; c.lineWidth = 1;
  for (let i = 0; i <= 16; i++) {
    const t = i / 16;
    const y = cy + Math.pow(t, 2.1) * H2 * .5;
    c.globalAlpha = 1 - t * .6;
    c.beginPath(); c.moveTo(0, y); c.lineTo(W2, y); c.stroke();
  }
  for (let i = -8; i <= 8; i++) {
    c.globalAlpha = .5;
    c.beginPath();
    c.moveTo(cx + i * 28, cy);
    c.lineTo(cx + i * 190, H2);
    c.stroke();
  }
  c.globalAlpha = 1;
  /* the cradle: a gantry holding a hull */
  const S = Math.min(W2, H2) * .0016;
  c.save();
  c.translate(cx, cy - H2 * .02);
  c.scale(Math.min(W2, H2) / 620, Math.min(W2, H2) / 620);
  /* gantry arms */
  c.strokeStyle = "rgba(150,200,230,.55)"; c.lineWidth = 8; c.lineCap = "round";
  for (const sgn of [-1, 1]) {
    c.beginPath();
    c.moveTo(sgn * 220, -160); c.lineTo(sgn * 96, -18); c.lineTo(sgn * 62, 26);
    c.stroke();
  }
  /* clamps opening as it thaws */
  const open = clamp((f - .3) * 2.2, 0, 1);
  for (const sgn of [-1, 1]) {
    c.save();
    c.translate(sgn * (58 + open * 34), 0);
    c.rotate(sgn * open * .5);
    c.fillStyle = "rgba(120,160,190,.9)";
    c.fillRect(-9, -46, 18, 92);
    c.fillStyle = "rgba(200,240,255,.5)";
    c.fillRect(-4, -40, 8, 80);
    c.restore();
  }
  /* the hull itself, in silhouette then lit */
  const lit = clamp((f - .55) * 3, 0, 1);
  c.save();
  c.rotate(-.12);
  c.fillStyle = "rgba(18,30,44,1)";
  cineHull(c, 54);
  c.fill();
  c.strokeStyle = "rgba(" + (lit > .1 ? "150,240,255" : "90,140,170") + "," + (.5 + lit * .5) + ")";
  c.lineWidth = 2.4;
  cineHull(c, 54); c.stroke();
  /* canopy */
  c.fillStyle = "rgba(120,230,255," + (.12 + lit * .6) + ")";
  c.beginPath(); c.ellipse(16, 0, 26, 13, 0, 0, TAU); c.fill();
  c.restore();
  c.restore();
  /* frost falling off it */
  for (let i = 0; i < 60; i++) {
    const t = (CINE.t * .5 + i * .137) % 1;
    const x = cx + Math.sin(i * 3.1) * W2 * .13;
    const y = cy - H2 * .08 + t * H2 * .3;
    c.globalAlpha = (1 - t) * .5;
    c.fillStyle = "#dff2ff";
    c.fillRect(x, y, 1.6, 3.4);
  }
  c.globalAlpha = 1;
  cue("c3a", 6.2, () => Audio_.cineHit(.5));
  cue("c3b", 7.0, () => Audio_.cineServo());
  cue("c3c", 8.1, () => Audio_.cineServo());
}
function cineHull(c, r) {
  c.beginPath();
  c.moveTo(r * 1.5, 0);
  c.lineTo(r * .55, r * .4); c.lineTo(r * .6, r * .95);
  c.lineTo(-r * .3, r * 1.02); c.lineTo(-r * .88, r * .5);
  c.lineTo(-r * .58, 0); c.lineTo(-r * .88, -r * .5);
  c.lineTo(-r * .3, -r * 1.02); c.lineTo(r * .6, -r * .95);
  c.lineTo(r * .55, -r * .4);
  c.closePath();
}

/* --- SCENE 4: the buffer readout ------------------------------------- */
function cineBuffer(c, W2, H2, f) {
  const cx = W2 * .5, cy = H2 * .5;
  c.fillStyle = "#050a12"; c.fillRect(0, 0, W2, H2);
  /* the weld, seen through the back of the room — the seal */
  c.save();
  c.globalAlpha = .35;
  c.strokeStyle = "rgba(255,160,90,.7)";
  c.lineWidth = 5;
  c.beginPath();
  for (let i = 0; i <= 40; i++) {
    const t = i / 40;
    const x = W2 * .1 + t * W2 * .8;
    const y = H2 * .18 + Math.sin(t * 26) * 6 + Math.sin(t * 5) * 10;
    i ? c.lineTo(x, y) : c.moveTo(x, y);
  }
  c.stroke();
  c.globalAlpha = 1;
  c.restore();
  /* the buffer dial */
  const R = Math.min(W2, H2) * .19;
  c.save();
  c.translate(cx, cy);
  c.strokeStyle = "rgba(120,220,255,.25)"; c.lineWidth = 1.4;
  c.beginPath(); c.arc(0, 0, R * 1.25, 0, TAU); c.stroke();
  c.strokeStyle = "rgba(120,220,255,.7)"; c.lineWidth = 3;
  c.beginPath(); c.arc(0, 0, R, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(f * 1.4, 0, 1)); c.stroke();
  for (let i = 0; i < 60; i++) {
    const a = (i / 60) * TAU;
    const big = i % 5 === 0;
    c.strokeStyle = "rgba(150,230,255," + (big ? .7 : .28) + ")";
    c.lineWidth = big ? 2 : 1;
    c.beginPath();
    c.moveTo(Math.cos(a) * R * 1.06, Math.sin(a) * R * 1.06);
    c.lineTo(Math.cos(a) * R * (big ? 1.19 : 1.13), Math.sin(a) * R * (big ? 1.19 : 1.13));
    c.stroke();
  }
  /* the number ticking up to 1.041 and locking */
  const val = clamp(f * 1.35, 0, 1) * 1.041;
  const locked = f > .74;
  c.textAlign = "center";
  c.fillStyle = locked ? "rgba(180,255,240,.95)" : "rgba(160,230,255,.9)";
  c.font = "700 " + (R * .46).toFixed(0) + "px " + MONO;
  c.fillText("+" + val.toFixed(3), 0, R * .14);
  c.font = "600 " + (R * .12).toFixed(0) + "px " + MONO;
  c.fillStyle = "rgba(150,200,230,.6)";
  c.fillText(locked ? "BUFFER LOCKED" : "BUFFER CHARGING", 0, R * .44);
  c.textAlign = "left";
  c.restore();
  /* two columns of chamber telemetry scrolling either side */
  c.font = "600 11px " + MONO;
  for (let i = 0; i < 22; i++) {
    const y = ((i * 26 + CINE.t * 40) % (H2 + 40)) - 20;
    c.fillStyle = "rgba(120,200,240,.18)";
    c.fillText(CINE_TELEM[i % CINE_TELEM.length], W2 * .06, y);
    c.fillText(CINE_TELEM[(i + 7) % CINE_TELEM.length], W2 * .78, y);
  }
  cue("c4a", 9.2, () => Audio_.cineHit(.45));
  cue("c4b", 11.3, () => Audio_.cineLock());
}
const CINE_TELEM = [
  "substrate ....... ok", "cradle .......... open", "seal ............ welded",
  "purge ........... running", "appeal .......... denied", "hull ............ CHRONO-01",
  "buffer .......... +1.041s", "decoys .......... 1 buffered", "recall .......... armed",
  "hostiles ........ rising", "authority ....... facility", "exit ............ none",
];

/* --- SCENE 5: wake, and the title ------------------------------------ */
function cineWake(c, W2, H2, f) {
  const cx = W2 * .5, cy = H2 * .5;
  cineStars(c, W2, H2, CINE.t * 3, .6);
  /* the purge front arriving, from all sides */
  const inset = (1 - clamp(f * 1.5, 0, 1)) * Math.max(W2, H2) * .5;
  const g = c.createRadialGradient(cx, cy, inset * .5, cx, cy, inset + 200);
  g.addColorStop(0, "rgba(255,120,120,0)");
  g.addColorStop(1, "rgba(255,130,120,.3)");
  c.fillStyle = g; c.fillRect(0, 0, W2, H2);
  /* the hull, lighting up, then a hard dash streak */
  const dash = clamp((f - .42) * 3.4, 0, 1);
  c.save();
  c.translate(cx - dash * W2 * .12, cy);
  const S = Math.min(W2, H2) / 700;
  c.scale(S, S);
  /* dash afterimages */
  for (let i = 4; i >= 1; i--) {
    c.save();
    c.globalAlpha = dash * (.16 / i);
    c.translate(-i * 90 * dash, 0);
    c.fillStyle = "rgba(140,240,255,1)";
    cineHull(c, 46); c.fill();
    c.restore();
  }
  c.fillStyle = "rgba(20,34,50,1)";
  cineHull(c, 46); c.fill();
  c.strokeStyle = "rgba(150,245,255,.95)"; c.lineWidth = 3;
  cineHull(c, 46); c.stroke();
  c.fillStyle = "rgba(150,250,255," + (.4 + dash * .6) + ")";
  c.beginPath(); c.ellipse(14, 0, 22, 11, 0, 0, TAU); c.fill();
  /* engine bloom */
  const eg = c.createLinearGradient(-30, 0, -220 - dash * 260, 0);
  eg.addColorStop(0, "rgba(150,240,255," + (.5 + dash * .5) + ")");
  eg.addColorStop(1, "rgba(150,240,255,0)");
  c.fillStyle = eg;
  c.beginPath();
  c.moveTo(-28, -16); c.lineTo(-230 - dash * 280, 0); c.lineTo(-28, 16);
  c.closePath(); c.fill();
  c.restore();
  /* title slam */
  if (f > .5) {
    const tf = clamp((f - .5) * 4, 0, 1);
    const ease = 1 - Math.pow(1 - tf, 4);
    c.save();
    c.translate(cx, cy + H2 * .26);
    c.textAlign = "center";
    c.globalAlpha = ease;
    const sz = Math.min(W2, H2) * .085;
    c.font = "800 " + sz.toFixed(0) + "px " + MONO;
    /* chromatic split that settles */
    const sp = (1 - ease) * 26;
    c.fillStyle = "rgba(255,80,120,.85)"; c.fillText("ONE SECOND AHEAD", -sp, 0);
    c.fillStyle = "rgba(80,255,220,.85)"; c.fillText("ONE SECOND AHEAD", sp, 0);
    c.fillStyle = "rgba(238,250,255,1)"; c.fillText("ONE SECOND AHEAD", 0, 0);
    c.font = "600 " + (sz * .22).toFixed(0) + "px " + MONO;
    c.fillStyle = "rgba(160,210,235,.75)";
    c.fillText("BRANCH ARCHIVE  ·  FIVE TIMELINES  ·  ONE HULL", 0, sz * .72);
    c.textAlign = "left";
    c.restore();
  }
  cue("c5a", 12.1, () => Audio_.cineWake());
  cue("c5b", 13.4, () => { Audio_.cineTitle(); });
}


