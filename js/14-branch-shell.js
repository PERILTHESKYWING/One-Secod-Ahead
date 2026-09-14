/* Branch shell: timeline select screen, the Archive, the operator console, input handling, run flow, menu routing and the main loop. */
/* =====================================================================
   BRANCH SHELL — timeline select, the archive, the operator console,
   and the wiring that lets the rest of the game not care which branch
   it is standing in.
   ===================================================================== */

/* ---------------- audio additions -------------------------------------- */
Object.assign(Audio_, {
  glassLock() { this.tone({ type: "triangle", freq: 1400, to: 2100, dur: .12, gain: .05 }); },
  glassRay() { this.tone({ type: "sine", freq: 2400, to: 900, dur: .16, gain: .045 }); this.noiseHit({ freq: 5200, to: 2000, dur: .1, gain: .03, q: 3 }); },
  coldRing() { this.tone({ type: "sine", freq: 320, to: 140, dur: .7, gain: .07, filter: "lowpass", cutoff: 1400 }); this.tone({ type: "triangle", freq: 1900, to: 2600, dur: .35, gain: .028 }); },
  shatter() { this.noiseHit({ freq: 6000, to: 1200, dur: .34, gain: .12, q: 2.4 }); [0, .04, .09].forEach((d, i) => this.tone({ type: "triangle", freq: 2200 + i * 700, to: 1200, dur: .2, gain: .035, delay: d })); },
  emberPulse() { this.tone({ type: "sawtooth", freq: 180, to: 90, dur: .3, gain: .06, filter: "lowpass", cutoff: 900 }); },
  emberVent() { this.noiseHit({ freq: 900, to: 180, dur: .55, gain: .16, q: .7, filter: "lowpass" }); this.tone({ type: "sawtooth", freq: 220, to: 60, dur: .5, gain: .09, filter: "lowpass", cutoff: 700 }); },
  vent() { this.noiseHit({ freq: 2600, to: 400, dur: .3, gain: .09, q: 1.6 }); },
  sonar() { this.tone({ type: "sine", freq: 900, to: 1500, dur: .4, gain: .07 }); this.tone({ type: "sine", freq: 450, dur: .5, gain: .035, delay: .06 }); },
  tideWarn() { this.tone({ type: "sine", freq: 70, to: 130, dur: 1.2, gain: .12, filter: "lowpass", cutoff: 500 }); },
  tideRewind() { [0, .05, .1, .15].forEach((d, i) => this.tone({ type: "triangle", freq: 1400 - i * 260, to: 600 - i * 100, dur: .3, gain: .05, delay: d })); this.noiseHit({ freq: 600, to: 3000, dur: .4, gain: .07, q: 1.2 }); },
  codaTick(b) { this.tone({ type: "sine", freq: [523, 587, 659, 784][b] || 523, dur: .1, gain: b === 0 ? .06 : .03 }); },
  codaHit() { this.tone({ type: "triangle", freq: 784, to: 392, dur: .26, gain: .08 }); },
  nullReturn() { this.tone({ type: "square", freq: 120, to: 700, dur: .28, gain: .06, filter: "lowpass", cutoff: 2000 }); },
  penScratch() { this.noiseHit({ freq: 3400, to: 1600, dur: .5, gain: .05, q: 4 }); },
  entropyTick() { this.tone({ type: "square", freq: 220, to: 180, dur: .09, gain: .05 }); },
  omegaShift() { [0, .12, .24].forEach((d, i) => this.tone({ type: "sawtooth", freq: 110 * (i + 1), to: 60 * (i + 1), dur: 1.1, gain: .07, delay: d, filter: "lowpass", cutoff: 900 })); this.noiseHit({ freq: 200, to: 40, dur: 1.4, gain: .2, q: .6, filter: "lowpass" }); },
  secretFx() { [0, .07, .14, .21].forEach((d, i) => this.tone({ type: "sine", freq: 660 * Math.pow(1.335, i), dur: .5, gain: .055, delay: d })); },
  unlockFx() { [0, .1, .2, .32].forEach((d, i) => this.tone({ type: "triangle", freq: 330 * Math.pow(2, [0, 5, 7, 12][i] / 12), dur: 1.1, gain: .08, delay: d, filter: "lowpass", cutoff: 2400 })); },
  /* --- cinematic bed --- */
  droneNodes: null,
  cineDrone(on) {
    if (!this.ctx) return;
    if (on) {
      if (this.droneNodes) return;
      const g = this.ctx.createGain();
      g.gain.value = 0;
      g.gain.linearRampToValueAtTime(.09, this.ctx.currentTime + 2);
      g.connect(this.musicBus);
      const oscs = [];
      [55, 82.5, 110, 164.8].forEach((fq, i) => {
        const o = this.ctx.createOscillator();
        o.type = i > 1 ? "sine" : "sawtooth";
        o.frequency.value = fq;
        const og = this.ctx.createGain();
        og.gain.value = [.5, .22, .3, .12][i];
        const lf = this.ctx.createBiquadFilter();
        lf.type = "lowpass"; lf.frequency.value = 420;
        o.connect(og).connect(lf).connect(g);
        o.start();
        oscs.push(o);
      });
      this.droneNodes = { g, oscs };
    } else if (this.droneNodes) {
      const { g, oscs } = this.droneNodes;
      this.droneNodes = null;
      try {
        g.gain.cancelScheduledValues(this.ctx.currentTime);
        g.gain.setValueAtTime(g.gain.value, this.ctx.currentTime);
        g.gain.linearRampToValueAtTime(0, this.ctx.currentTime + .5);
        oscs.forEach((o) => o.stop(this.ctx.currentTime + .6));
      } catch (e) {}
    }
  },
  cineHit(v) { this.noiseHit({ freq: 240, to: 40, dur: .9, gain: .3 * (v || 1), q: .5, filter: "lowpass" }); this.tone({ type: "sine", freq: 90, to: 28, dur: .8, gain: .28 * (v || 1) }); },
  cineCut() { this.noiseHit({ freq: 5000, to: 900, dur: .09, gain: .1, q: 2 }); },
  cineRiser(d) { this.tone({ type: "sawtooth", freq: 90, to: 1200, dur: d || 1.4, gain: .06, filter: "lowpass", cutoff: 2200 }); },
  cineSnap() { this.noiseHit({ freq: 3800, to: 500, dur: .16, gain: .14, q: 2.6 }); this.tone({ type: "square", freq: 700, to: 140, dur: .12, gain: .05 }); },
  cineServo() { this.tone({ type: "sawtooth", freq: 320, to: 120, dur: .5, gain: .05, filter: "lowpass", cutoff: 800 }); this.noiseHit({ freq: 1200, to: 300, dur: .45, gain: .05, q: 1.4 }); },
  cineLock() { this.tone({ type: "triangle", freq: 880, to: 1320, dur: .4, gain: .09 }); this.tone({ type: "sine", freq: 220, dur: .7, gain: .07, delay: .05 }); },
  cineWake() { [0, .09, .18].forEach((d, i) => this.tone({ type: "triangle", freq: 262 * Math.pow(2, [0, 7, 12][i] / 12), dur: 1.4, gain: .08, delay: d, filter: "lowpass", cutoff: 2600 })); },
  cineTitle() { this.cineHit(1); [0, .04].forEach((d) => this.tone({ type: "sawtooth", freq: 55, to: 44, dur: 2.2, gain: .16, delay: d, filter: "lowpass", cutoff: 600 })); this.tone({ type: "triangle", freq: 523, to: 784, dur: 1.6, gain: .07, delay: .1 }); },
});

/* ---------------- save schema ------------------------------------------
   SAVE.tl and the per-level Trophy Road records are built and repaired in
   02c-trophy-road.js, which is the single owner of that schema. This file
   only reads them. */
function tlUnlocked(t) { return arenaUnlocked(typeof t === "string" ? t : t.id); }
function setTimeline(id) {
  TL = tlOf(id);
  LEVELS = TL.levels;
  BRANCHFN.field = BRANCHFN.paint = BRANCHFN.over = null;
  BRANCHFN.slowAt = BRANCHFN.dmgAt = BRANCHFN.onKill = null;
  BRANCHFN.bounds = BRANCHFN.spawnEdge = BRANCHFN.walls = null;
  Object.assign(BRANCHFN, BRANCH[id] || {});
  BRANCHFN.id = id;
  if (!SAVE.tl[id].entered) { SAVE.tl[id].entered = 1; persist(); }
}
/* the live field hooks, swapped per branch. Anything not defined by the
   current branch falls back to a no-op so the core loop stays simple.
   `bounds` and `spawnEdge` let a branch own its own room geometry — where
   the player is allowed to stand, and where enemies step in from — instead
   of every branch reusing Chamber 09's flat rectangle. */
const BRANCHFN = { id: "ch09", field: null, paint: null, over: null, slowAt: null, dmgAt: null, onKill: null, bounds: null, spawnEdge: null, walls: null };

/* ---------------- the space-time map --------------------------------------
   This was a flat vertical list of five cards. It is the Trophy Road now:
   every arena is a region with its own identity, and inside each unlocked
   region its fifteen levels run left to right as a strip of nodes in strict
   unlock order, seamed where the tiers change — so the shape of the climb is
   visible rather than being fifteen identical dots.

   Three things this screen has to do that the card list did not:

     BE DISTINCT PER ARENA. Each region is painted out of that arena's own
     accent and palette — the same numbers its levels and backdrops already
     use — plus a motif drawn on its header canvas: Glassfall's shatter,
     Emberwake's heat haze, Nulltide's current lines, Terminus's dial,
     Chamber 09's baseline grid. Procedural, like everything else here.

     TEASE WHAT IS NEXT. A locked arena is not a blank card. It is fogged,
     with a sliver of its real accent colour bleeding across the boundary and
     silhouettes from its actual roster leaking through the haze at low
     opacity — drawn with the same drawIcon() the bestiary uses, then pushed
     behind a blur. The theme is visibly THERE without being legible.

     CARRY THE ROAD'S STATE. Each node shows locked / open / cleared, its best
     trophies against what that level could be worth, and — once it has been
     cleared — the mutation replay toggle that pays the +25%. */
let tlSel = 0;

/* which levels currently have the mutation replay armed. Session state on
   purpose: it is a choice about the next attempt, not a saved setting. */
const roadMut = {};

/* the per-arena motif, drawn on the canvas behind each region header */
function roadMotif(cvs, t, open) {
  const d = Math.min(devicePixelRatio || 1, 2);
  const w = Math.max(120, cvs.clientWidth || 300), h = Math.max(40, cvs.clientHeight || 66);
  cvs.width = w * d; cvs.height = h * d;
  const c = cvs.getContext("2d");
  c.setTransform(d, 0, 0, d, 0, 0);
  c.clearRect(0, 0, w, h);
  const col = t.accent, base = open ? 1 : .4;
  c.strokeStyle = "rgba(" + col + ",.55)";
  c.lineWidth = 1.2;
  if (t.id === "glassfall") {
    /* shatter: radial cracks off a point below the frame, kinked the way a
       real fracture is rather than drawn as clean rays */
    const ox = w * .5, oy = h * 1.2;
    for (let i = 0; i < 11; i++) {
      const a = -Math.PI * (.08 + (i / 10) * .84);
      c.globalAlpha = base * (.16 + (i % 3) * .07);
      c.beginPath(); c.moveTo(ox, oy);
      let x = ox, y = oy;
      for (let k = 0; k < 3; k++) {
        const aa = a + (k % 2 ? .15 : -.15);
        x += Math.cos(aa) * h * .55; y += Math.sin(aa) * h * .55;
        c.lineTo(x, y);
      }
      c.stroke();
    }
  } else if (t.id === "emberwake") {
    /* heat haze: stacked ripples, tighter toward the floor */
    for (let r = 0; r < 6; r++) {
      c.globalAlpha = base * (.13 + r * .06);
      c.beginPath();
      for (let i = 0; i <= 44; i++) {
        const x = (i / 44) * w;
        const y = h - r * (h / 7) - Math.sin(i * .36 + r * 1.3) * (2.4 + r * .5);
        i ? c.lineTo(x, y) : c.moveTo(x, y);
      }
      c.stroke();
    }
  } else if (t.id === "nulltide") {
    /* current lines: long horizontal flow, phase-drifting down the frame */
    for (let r = 0; r < 7; r++) {
      c.globalAlpha = base * (.11 + (r % 3) * .07);
      c.beginPath();
      for (let i = 0; i <= 64; i++) {
        const x = (i / 64) * w;
        const y = (r + .5) * (h / 7) + Math.sin(i * .16 + r * .9) * 3.2;
        i ? c.lineTo(x, y) : c.moveTo(x, y);
      }
      c.stroke();
    }
  } else if (t.id === "terminus") {
    /* the dial, rising off the bottom edge: rings and twelve hour marks */
    const cx = w * .5, cy = h * 1.32, R = h * 1.18;
    for (let i = 0; i < 3; i++) {
      c.globalAlpha = base * .2;
      c.beginPath(); c.arc(cx, cy, R * (.5 + i * .26), Math.PI, 0); c.stroke();
    }
    for (let i = 0; i < 12; i++) {
      const a = Math.PI + (i / 11) * Math.PI;
      c.globalAlpha = base * (i % 3 === 0 ? .5 : .26);
      c.beginPath();
      c.moveTo(cx + Math.cos(a) * R * .78, cy + Math.sin(a) * R * .78);
      c.lineTo(cx + Math.cos(a) * R * .97, cy + Math.sin(a) * R * .97);
      c.stroke();
    }
  } else {
    /* Chamber 09: the baseline grid, which is exactly what it is */
    c.globalAlpha = base * .16;
    for (let x = 0; x < w; x += 22) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); }
    for (let y = 0; y < h; y += 15) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
  }
  c.globalAlpha = 1;
}

/* one level node on the strip */
function roadNode(t, i) {
  const L = t.levels[i];
  const rec = levelRec(t.id, i);
  const open = levelUnlocked(t.id, i);
  const best = rec.trophies || 0;
  const cap = levelMaxTrophies(t.id, i);
  const el = document.createElement("button");
  el.className = "node" + (open ? "" : " locked") + (rec.cleared ? " done" : "") +
    (L.boss ? " boss" : "") + (open && !rec.cleared ? " next" : "");
  /* the ARENA's accent, not the level's. Each level carries its own palette
     for its backdrop and its music, and using those here made one arena's
     strip read as fifteen unrelated colours — which is the opposite of the
     "every arena is visually distinct" this screen exists for. The tier
     varies weight instead of hue, so the climb still reads as four stages
     within one identity. */
  el.style.setProperty("--tc", "rgb(" + t.accent + ")");
  el.style.setProperty("--tw", (.5 + (L.tier || TIER_OF(i)) * .14).toFixed(2));
  /* the node's fill bar is how close this level's record is to its ceiling,
     which is the thing a replay is actually chasing */
  el.style.setProperty("--frac", (cap ? clamp(best / cap, 0, 1) * 100 : 0).toFixed(1) + "%");
  let foot;
  if (!open) foot = '<span class="tro part">clear ' + i + " first</span>";
  else if (rec.cleared) foot = '<span class="tro"><i></i>' + fmt(best) + " / " + fmt(cap) + "</span>";
  else if (rec.bestPct > 0) foot = '<span class="tro part">' + Math.round(rec.bestPct * 100) + "% · " + fmt(best) + "</span>";
  else foot = '<span class="tro part">not cleared</span>';
  el.innerHTML =
    '<span class="n">' + (L.boss ? "★" : i + 1) + "</span>" +
    '<span class="nm">' + (open ? L.name : "—") + "</span>" + foot +
    (rec.mut ? '<span class="mutflag" title="cleared with a mutation">M</span>' : "");
  if (!open) {
    el.onclick = () => { Audio_.deny(); toast("Clear level " + i + " first", "var(--threat)"); };
    return el;
  }
  el.onclick = () => { Audio_.confirm(); enterLevel(t.id, i, roadMut[t.id + ":" + i] ? 1 : 0); };
  el.addEventListener("mouseenter", () => {
    Audio_.ui();
    $("#roadHint").textContent = L.hook ? L.hook.split(".")[0].toLowerCase() : "";
  });
  /* the mutation replay toggle — only on a level already cleared once,
     because that is the whole premise: a level you have outgrown, made
     dangerous again, for a quarter more trophies */
  if (rec.cleared) {
    const mt = document.createElement("i");
    mt.className = "mut" + (roadMut[t.id + ":" + i] ? " on" : "");
    mt.title = "Replay with a mutation · +25% trophies";
    mt.textContent = "+25%";
    mt.onclick = (ev) => {
      ev.stopPropagation();
      const k = t.id + ":" + i;
      roadMut[k] = !roadMut[k];
      mt.classList.toggle("on", !!roadMut[k]);
      Audio_.ui();
    };
    el.appendChild(mt);
  }
  return el;
}

function renderTimelines() {
  const box = $("#tlList");
  box.innerHTML = "";
  $("#roadTrophies").textContent = fmt(recomputeTrophies());
  $("#roadHint").textContent = "";
  TIMELINES.forEach((t, ti) => {
    const open = tlUnlocked(t);
    const reg = document.createElement("section");
    reg.className = "region" + (open ? "" : " sealed");
    reg.style.setProperty("--tc", "rgb(" + t.accent + ")");

    /* ---- the region header ---- */
    const head = document.createElement("div");
    head.className = "rhead";
    const motif = document.createElement("canvas");
    motif.className = "rmotif";
    head.appendChild(motif);
    const info = document.createElement("div");
    info.className = "rinfo";
    const done = arenaClearedCount(t.id);
    const marks = ladderThresholds(t.id);
    const rung = ladderTierEarned(t.id);
    const nextMark = marks[rung];
    const stat = open
      ? '<div class="rstat"><span><b>' + done + "</b>/15 cleared</span>" +
        "<span><b>" + fmt(arenaTrophies(t.id)) + "</b> trophies</span>" +
        '<span class="ladder">ladder <b>' + rung + "</b>/5 · " +
        (nextMark ? "next at " + fmt(nextMark) : "complete") + "</span></div>"
      : '<div class="rstat"><span class="ladder">branch physics unavailable while sealed</span></div>';
    info.innerHTML =
      '<span class="tlcode">' + t.code + "</span>" +
      "<h3>" + t.name + "</h3>" +
      "<p>" + (open ? t.blurb : "Sealed. Clear " + tlOf(t.unlockedBy).name + " to bring this branch online.") + "</p>" +
      stat;
    head.appendChild(info);
    reg.appendChild(head);

    if (open) {
      /* ---- the strip of fifteen, seamed at every tier change ---- */
      const strip = document.createElement("div");
      strip.className = "strip";
      for (let i = 0; i < LEVELS_PER_ARENA; i++) {
        if (TIER_STARTS.indexOf(i) >= 0) {
          const seam = document.createElement("div");
          seam.className = "seam";
          seam.innerHTML = "<i></i><span>" + TIER_NAME[TIER_OF(i)] + "</span>";
          strip.appendChild(seam);
        }
        strip.appendChild(roadNode(t, i));
      }
      reg.appendChild(strip);
      /* fifteen nodes do not fit, so put the one you are actually up to in
         view rather than always opening on level 1 */
      const want = nextOpenLevel(t.id);
      requestAnimationFrame(() => {
        const n = strip.querySelectorAll(".node")[want];
        if (n && n.offsetLeft > strip.clientWidth * .55)
          strip.scrollLeft = n.offsetLeft - strip.clientWidth * .42;
      });
    } else {
      /* ---- the tease, instead of a blank locked card ----
         Silhouettes from the arena's REAL roster, drawn with the same
         renderer the bestiary uses and then pushed behind a haze: you can
         see there is something in there and roughly what shape it is, and
         you cannot read it. The CSS bleeds a sliver of the arena's true
         accent across the boundary so the colour arrives before the
         content does. */
      const fog = document.createElement("div");
      fog.className = "fog";
      const ghosts = document.createElement("div");
      ghosts.className = "ghosts";
      t.roster.slice(0, 5).concat([t.boss]).forEach((ty, k) => {
        const cvs = document.createElement("canvas");
        cvs.style.setProperty("--k", k);
        ghosts.appendChild(cvs);
        try { drawIcon(cvs, ty, ty === t.boss ? 56 : 40); } catch (e) {}
      });
      fog.appendChild(ghosts);
      const haze = document.createElement("div");
      haze.className = "haze";
      haze.innerHTML = "<span>sealed</span>";
      fog.appendChild(haze);
      reg.appendChild(fog);
    }

    box.appendChild(reg);
    roadMotif(motif, t, open);
    if (open) reg.addEventListener("mouseenter", () => { tlSel = ti; });
  });
}


/* ---------------- the archive (lore + secrets + bestiary) ---------------- */
let arcTab = "The Concordance";
function loreUnlocked(l) { return SAVE.admin || SAVE.lore[l.id] || (() => { try { return !!l.need(); } catch (e) { return false; } })(); }
function redact(s) { return s.replace(/[A-Za-z0-9]/g, "█"); }
function renderArchive() {
  const secs = [];
  LORE.forEach((l) => { if (!secs.includes(l.sec)) secs.push(l.sec); });
  secs.push("Secrets"); secs.push("Bestiary");
  const rail = $("#arcRail");
  rail.innerHTML = "";
  secs.forEach((s) => {
    const b = document.createElement("button");
    if (s === arcTab) b.classList.add("sel");
    let n = "", tot = "";
    if (s === "Secrets") { n = SECRETS.filter((x) => SAVE.secrets[x.id]).length; tot = SECRETS.length; }
    else if (s === "Bestiary") { n = Object.keys(SAVE.seen).length; tot = Object.keys(EN).length; }
    else { const list = LORE.filter((l) => l.sec === s); n = list.filter(loreUnlocked).length; tot = list.length; }
    b.innerHTML = s + "<small>" + n + "/" + tot + "</small>";
    b.onclick = () => { arcTab = s; Audio_.ui(); renderArchive(); };
    rail.appendChild(b);
  });
  const body = $("#arcBody");
  body.innerHTML = "";
  body.className = "arc-body";
  if (arcTab === "Secrets") {
    const note = document.createElement("p");
    note.className = "arc-note";
    note.textContent = "Eight things the chamber does in front of you repeatedly. None of them are announced. The hint is always true.";
    body.appendChild(note);
    SECRETS.forEach((s) => {
      const has = SAVE.secrets[s.id];
      const el = document.createElement("div");
      el.className = "arc-entry secret" + (has ? " on" : "");
      el.innerHTML = "<h4>" + (has ? s.name : "▒▒▒▒▒▒") + "</h4>" +
        '<p class="hint">' + s.hint + "</p>" +
        (has ? "<p>" + s.reveal + "</p>" : '<p class="sealed">not yet observed</p>');
      body.appendChild(el);
    });
    return;
  }
  if (arcTab === "Bestiary") {
    body.className = "arc-body beast";
    TIMELINES.forEach((t) => {
      const h = document.createElement("h3");
      h.className = "arc-h";
      h.innerHTML = t.name + "<span>" + t.code + "</span>";
      body.appendChild(h);
      const grid = document.createElement("div");
      grid.className = "bestiary";
      body.appendChild(grid);
      t.roster.concat([t.boss]).forEach((ty) => {
        const d = EN[ty];
        const seen = SAVE.seen[ty] || SAVE.admin;
        const row = document.createElement("div");
        row.className = "brow" + (seen ? "" : " unseen");
        const cvs = document.createElement("canvas");
        row.appendChild(cvs);
        const txt = document.createElement("div");
        txt.innerHTML = "<b>" + (seen ? d.label : "unrecorded") + "</b><span>" + (seen ? d.note : "No encounter logged in this branch.") + "</span>";
        row.appendChild(txt);
        grid.appendChild(row);
        if (seen) drawIcon(cvs, ty, 30); else { cvs.width = 30; cvs.height = 30; cvs.style.width = "30px"; cvs.style.height = "30px"; }
      });
    });
    return;
  }
  LORE.filter((l) => l.sec === arcTab).forEach((l) => {
    const has = loreUnlocked(l);
    const el = document.createElement("div");
    el.className = "arc-entry" + (has ? " on" : "");
    el.innerHTML = "<h4>" + l.title + "</h4><p>" + (has ? l.body : redact(l.body)) + "</p>" +
      (has ? "" : '<span class="sealed">sealed — keep playing</span>');
    body.appendChild(el);
  });
}

/* ---------------- operator console (admin) ------------------------------ */
const ADMIN_CODES = ["chrono-1041", "1041", "chrono1041"];
function openAdmin() {
  show("admin");
  $("#admGate").classList.toggle("hide", !!SAVE.admin);
  $("#admPanel").classList.toggle("hide", !SAVE.admin);
  if (SAVE.admin) renderAdmin();
  else setTimeout(() => { const i = $("#admCode"); if (i) { i.value = ""; i.focus(); } }, 60);
}
function tryAdmin() {
  const v = ($("#admCode").value || "").trim().toLowerCase();
  if (ADMIN_CODES.indexOf(v) < 0) {
    $("#admGate").classList.add("shake");
    setTimeout(() => $("#admGate").classList.remove("shake"), 400);
    $("#admErr").textContent = "rejected · the code is printed on the hull";
    Audio_.deny();
    return;
  }
  SAVE.admin = 1; persist();
  Audio_.unlockFx();
  toast("Operator access granted", "var(--shard)");
  $("#admGate").classList.add("hide");
  $("#admPanel").classList.remove("hide");
  renderAdmin();
  refreshHome();
}
let admGod = 0, admOneShot = 0;
function renderAdmin() {
  const p = $("#admPanel");
  p.innerHTML = "";
  const mk = (title, note) => {
    const s = document.createElement("div");
    s.className = "adm-sec";
    s.innerHTML = "<h3>" + title + "</h3>" + (note ? "<p>" + note + "</p>" : "");
    const r = document.createElement("div");
    r.className = "adm-row";
    s.appendChild(r);
    p.appendChild(s);
    return r;
  };
  const btn = (label, fn, cls) => {
    const b = document.createElement("button");
    b.className = "adm-btn " + (cls || "");
    b.textContent = label;
    b.onclick = () => { Audio_.ui(); fn(b); };
    return b;
  };

  /* --- progression --- */
  const r1 = mk("Progression", "Everything the player would otherwise have to earn.");
  r1.appendChild(btn("Unlock all branches", () => {
    TIMELINES.forEach((t) => { SAVE.tl[t.id].entered = 1; SAVE.tl[t.id].cleared = 1; });
    persist(); toast("All branches online", "var(--chrono)"); renderAdmin();
  }, "primary"));
  r1.appendChild(btn("Reveal all lore", () => { LORE.forEach((l) => SAVE.lore[l.id] = 1); persist(); toast("Archive opened"); }));
  r1.appendChild(btn("Reveal all secrets", () => { SECRETS.forEach((s) => SAVE.secrets[s.id] = 1); persist(); toast("Secrets revealed", "var(--shard)"); }));
  r1.appendChild(btn("Log every enemy", () => { Object.keys(EN).forEach((k) => SAVE.seen[k] = 1); persist(); drawBestiary(); toast("Bestiary complete"); }));
  r1.appendChild(btn("+100,000 shards", () => { SAVE.shards += 100000; persist(); refreshHome(); toast("Shards granted", "var(--shard)"); }));
  r1.appendChild(btn("Own every ability", () => {
    ABIL.forEach((a) => abilSave().owned[a.id] = 1);
    COSM.forEach((c) => SAVE.cosmetics.owned[c.id] = 1);
    syncCosmetics(); persist(); toast("Lab fully installed", "var(--chrono)");
  }));
  r1.appendChild(btn("Clear every level", () => {
    /* fills the whole Trophy Road at baseline trophies, which is what the
       save migration does for a player arriving from the old structure */
    TIMELINES.forEach((t) => {
      const st = SAVE.tl[t.id];
      st.entered = 1; st.cleared = 1;
      for (let i = 0; i < LEVELS_PER_ARENA; i++) {
        st.levels[i].cleared = 1; st.levels[i].bestPct = 1;
        st.levels[i].trophies = Math.max(st.levels[i].trophies, levelBaseTrophies(t.id, i));
      }
      claimLadder(t.id);
    });
    recomputeTrophies(); persist();
    toast("Trophy Road filled · " + fmt(SAVE.trophiesTotal) + " trophies", "var(--chrono)");
    renderAdmin();
  }));
  r1.appendChild(btn("Lock everything back", () => {
    TIMELINES.forEach((t, i) => {
      if (i) { SAVE.tl[t.id].entered = 0; SAVE.tl[t.id].cleared = 0; }
      SAVE.tl[t.id].ladder = 0;
      SAVE.tl[t.id].levels = SAVE.tl[t.id].levels.map(() => blankLevelRec());
    });
    SAVE.secrets = {}; SAVE.lore = {};
    recomputeTrophies();
    persist(); toast("Progress reset to first run", "var(--threat)"); renderAdmin();
  }, "danger"));

  /* --- jump --- */
  const r2 = mk("Jump into a branch", "Drops you straight into a level with the branch physics live.");
  TIMELINES.forEach((t) => {
    const wrap = document.createElement("div");
    wrap.className = "adm-jump";
    wrap.style.setProperty("--tc", "rgb(" + t.accent + ")");
    wrap.innerHTML = "<b>" + t.name + "</b>";
    const row = document.createElement("div");
    (t.levels || CH09_LEVELS).forEach((L, i) => {
      row.appendChild(btn((L.boss ? "★ " : "") + (i + 1) + " · " + L.name, () => {
        /* the same entry point the map uses, so the operator console cannot
           drift out of sync with how a level actually starts */
        enterLevel(t.id, i, 0);
      }));
    });
    wrap.appendChild(row);
    r2.appendChild(wrap);
  });

  /* --- boss rush --- */
  const r3 = mk("Straight to the boss", "Skips the waves. Full kit, full health, boss on the floor.");
  TIMELINES.forEach((t) => {
    r3.appendChild(btn(EN[t.boss].label, () => {
      setTimeline(t.id);
      startPlay("play");
      const li = (t.levels || CH09_LEVELS).length - 1;
      G.levelIdx = Math.max(0, li);
      backdropDirty = true;
      Audio_.setPalette(curLevel());
      G.carding = false; G.cardIn = 0;
      $("#levelCard").classList.remove("on");
      clearWorld();
      G.player = makePlayer(); makeDust();
      G.wave = curLevel().waves;
      G.queue = [{ type: t.boss, t: .4 }];
      banner(EN[t.boss].label, t.code);
    }, "primary"));
  });

  /* --- spawn --- */
  const r4 = mk("Spawn into the live room", "Only works while a run is going. Click an icon to drop one in.");
  const grid = document.createElement("div");
  grid.className = "adm-grid";
  Object.keys(EN).forEach((ty) => {
    const b = document.createElement("button");
    b.className = "adm-mob";
    b.title = EN[ty].label;
    const cvs = document.createElement("canvas");
    b.appendChild(cvs);
    const s = document.createElement("span");
    s.textContent = EN[ty].label;
    b.appendChild(s);
    b.onclick = () => {
      if (G.mode !== "play" || G.attract) { Audio_.deny(); toast("Start a run first", "var(--threat)"); return; }
      const pt = edgePoint();
      G.portals.push({ x: pt.x, y: pt.y, t: 0, type: ty });
      Audio_.ui();
      toast(EN[ty].label + " spawned");
    };
    grid.appendChild(b);
    drawIcon(cvs, ty, 34);
  });
  r4.appendChild(grid);

  /* --- toggles --- */
  const r5 = mk("Debug", "Live switches. They persist for the session only.");
  r5.appendChild(btn(admGod ? "Invulnerable: ON" : "Invulnerable: off", (b) => {
    admGod = !admGod; b.textContent = admGod ? "Invulnerable: ON" : "Invulnerable: off";
    b.classList.toggle("primary", !!admGod);
  }, admGod ? "primary" : ""));
  r5.appendChild(btn(admOneShot ? "One-shot kills: ON" : "One-shot kills: off", (b) => {
    admOneShot = !admOneShot; b.textContent = admOneShot ? "One-shot kills: ON" : "One-shot kills: off";
    b.classList.toggle("primary", !!admOneShot);
  }, admOneShot ? "primary" : ""));
  r5.appendChild(btn("Replay the cinematic", () => { runCine(() => { show("admin"); }); }));
  r5.appendChild(btn("Fill entropy clock", () => { G.entropy = G.entropyMax; toast("Clock topped up"); }));
  r5.appendChild(btn("Force a tide rewind", () => { if (G.mode === "play") tideRewind(true); }));
  r5.appendChild(btn("Drop a stasis bloom", () => { if (G.player) addStasis(G.player.x, G.player.y, 170, 12); }));
  r5.appendChild(btn("Kill everything on screen", () => { G.enemies.slice().forEach((e) => killEnemy(e)); }));
  r5.appendChild(btn("Sign out of operator", () => { SAVE.admin = 0; persist(); toast("Operator access revoked"); openAdmin(); refreshHome(); }, "danger"));
}

/* ---------------- home screen wiring ------------------------------------ */
function refreshBranchHome() {
  const n = TIMELINES.filter(tlUnlocked).length;
  const el = $("#menuPlaySub");
  if (el) el.textContent = n > 1 ? n + " branches online" : "Six chambers, one life";
  const ops = $("#opsLink");
  if (ops) ops.classList.toggle("on", !!SAVE.admin);
}

/* ---------------- input ----------------------------------------------------- */
const keys = new Set();
const mouse = { x: innerWidth / 2, y: innerHeight / 2, down: false };
const touch = { active: false, moveId: null, aimId: null, mx: 0, my: 0, mdx: 0, mdy: 0 };
const edge = { dash: false, echo: false };
/* Move and one button. Firing happens on its own, and the aim snaps to
   whatever you are already pointing near. */
function nearestEnemy(x, y, maxD) {
  let best = null, bd = maxD || 1e9;
  for (const e of G.enemies) { if (e.dead) continue; const d = Math.hypot(e.x - x, e.y - y); if (d < bd) { bd = d; best = e; } }
  return best;
}
function humanInput() {
  let mx = 0, my = 0;
  if (keys.has("w") || keys.has("arrowup")) my -= 1;
  if (keys.has("s") || keys.has("arrowdown")) my += 1;
  if (keys.has("a") || keys.has("arrowleft")) mx -= 1;
  if (keys.has("d") || keys.has("arrowright")) mx += 1;
  if (touch.active) { mx = touch.mdx; my = touch.mdy; }
  const l = Math.hypot(mx, my);
  if (l > 1) { mx /= l; my /= l; }
  const p = G.player;
  let ax = mouse.x, ay = mouse.y;
  const usingTouch = touch.active && touch.aimId === null;
  if (p && SAVE.settings.aimassist) {
    if (usingTouch) {
      /* no aim finger down: lock on by itself */
      const near = nearestEnemy(p.x, p.y, 900);
      if (near) { ax = near.x; ay = near.y; }
      else if (l > .05) { ax = p.x + mx * 200; ay = p.y + my * 200; }
    } else {
      const cur = Math.atan2(ay - p.y, ax - p.x);
      let best = null, bs = .3;
      for (const e of G.enemies) {
        if (e.dead) continue;
        const d = Math.hypot(e.x - p.x, e.y - p.y);
        if (d > 780) continue;
        const off = Math.abs(angDiff(Math.atan2(e.y - p.y, e.x - p.x), cur));
        if (off < bs) { bs = off; best = e; }
      }
      if (best) { ax = best.x; ay = best.y; }
    }
  }
  const auto = !!SAVE.settings.autofire;
  const inp = { mx, my, aimX: ax, aimY: ay,
    fire: (auto || mouse.down || (touch.active && touch.aimId !== null)) && currentScreen === "none",
    dash: edge.dash, echo: edge.echo };
  edge.dash = edge.echo = false;
  return inp;
}
function botInput() {
  const p = G.player;
  let ax = 0, ay = 0, target = null, td = 1e9;
  for (const e of G.enemies) {
    const d = dist(e, p);
    if (d < td) { td = d; target = e; }
    if (d < 250) { const f = (250 - d) / 250; ax -= ((e.x - p.x) / (d || 1)) * f; ay -= ((e.y - p.y) / (d || 1)) * f; }
  }
  for (const h of G.hostiles) {
    const d = dist(h, p);
    if (d < 160) { const f = (160 - d) / 160 * 1.6; ax -= ((h.x - p.x) / (d || 1)) * f; ay -= ((h.y - p.y) / (d || 1)) * f; }
  }
  for (const s of G.pickups) { const d = dist(s, p); if (d < 400) { ax += ((s.x - p.x) / (d || 1)) * .35; ay += ((s.y - p.y) / (d || 1)) * .35; } }
  ax += ((W / 2 - p.x) / W) * 1.2; ay += ((H / 2 - p.y) / H) * 1.2;
  const l = Math.hypot(ax, ay) || 1;
  const aim = target || { x: p.x + 1, y: p.y };
  return { mx: ax / l, my: ay / l, aimX: aim.x, aimY: aim.y,
    fire: !!target && td < 700, dash: td < 120 && chance(.12), echo: G.enemies.length > 4 && chance(.005) };
}

/* ---------------- run flow --------------------------------------------------- */
function endRun() {
  const p = G.player;
  /* the frame comes apart: armour first, then the core lets go */
  for (let i = 0; i < 5; i++) {
    const a = rnd(TAU);
    ghost(p.x, p.y, p.aim + rnd(-.6, .6), TH.core, { r: p.r, life: .5 + i * .12, a: .5, grow: 1.4 + i * .5 });
  }
  debris(p.x, p.y, 22, TH.hull, 1.5, { size: 1.2, life: 1.5 });
  debris(p.x, p.y, 10, TH.core, 1.1, { size: .8, life: 1.2 });
  burst(p.x, p.y, 130, TH.core, 2);
  ring(p.x, p.y, TH.core, 10, 330, .8, 4);
  ring(p.x, p.y, TH.echo, 10, 210, 1.1, 3);
  shock(p.x, p.y, { r0: 14, r1: Math.max(W, H) * .8, life: .8, col: TH.core, w: 7 });
  shock(p.x, p.y, { r0: 14, r1: 300, life: .5, col: TH.echo, w: 4 });
  text(p.x, p.y - 60, "timeline broken", TH.echo, 26);
  G.slowmo = 1.5; G.chroma = 1; G.deathT = 2.2;
  flash(.55); shake(1.2); hitStop(HITSTOP_DEATH); Audio_.death();
  G.mode = "dead";
  Audio_.target = .05;
  if (G.attract) { setTimeout(() => startAttract(), 900); return; }
  /* A story level is a discrete ATTEMPT now, so dying in one is the end of
     that attempt rather than the end of a run: it banks whatever fraction
     of the level you actually got through (see finishLevel) and hands you
     back to the map to try again, instead of throwing you to the branch's
     level 1 with a fresh build. Survival is unchanged — it has no levels to
     be partway through. */
  if (!G.survival) { setTimeout(() => finishLevel(false), 2100); return; }
  const banked = Math.round(G.shards + (G.survival ? G.wave * 26 : (G.loop * LEVELS.length + G.levelIdx) * 40 + G.wave * 8));
  SAVE.shards += banked; SAVE.runs++;
  const reached = G.loop * LEVELS.length + G.levelIdx + 1;
  const best = G.survival
    ? (G.wave > SAVE.bestWave || G.runTime > SAVE.bestTime || G.score > SAVE.bestScore)
    : (G.score > SAVE.bestScore || reached > SAVE.bestLevel);
  SAVE.bestScore = Math.max(SAVE.bestScore, G.score);
  if (G.survival) { SAVE.bestWave = Math.max(SAVE.bestWave, G.wave); SAVE.bestTime = Math.max(SAVE.bestTime, G.runTime); }
  else SAVE.bestLevel = Math.max(SAVE.bestLevel, reached);
  persist();
  setTimeout(() => showResults(banked, best), 2100);
}
function endRunSilently() {
  if (G.mode === "play" && !G.attract) {
    const banked = Math.round(G.shards + (G.survival ? G.wave * 26 : (G.loop * LEVELS.length + G.levelIdx) * 40 + G.wave * 8));
    SAVE.shards += banked; SAVE.runs++;
    SAVE.bestScore = Math.max(SAVE.bestScore, G.score);
    if (G.survival) { SAVE.bestWave = Math.max(SAVE.bestWave, G.wave); SAVE.bestTime = Math.max(SAVE.bestTime, G.runTime); }
    else SAVE.bestLevel = Math.max(SAVE.bestLevel, G.loop * LEVELS.length + G.levelIdx + 1);
    persist();
    if (banked > 0) toast(fmt(banked) + " shards banked", "var(--chrono)");
  }
  G.mode = "dead";
}
let attractT = 0;
function startAttract() {
  G.mode = "play"; G.attract = true; G.paused = false; G.drafting = false; G.carding = false;
  $("#draft").classList.remove("on"); $("#levelCard").classList.remove("on");
  G.mods = baseMods(); G.mods.dmgMul *= 1.7; G.mods.multishot = 1; G.cores = {};
  G.levelIdx = rint(0, LEVELS.length - 2); G.loop = 0; G.wave = 1;
  backdropDirty = true;
  Audio_.setPalette(curLevel());
  clearWorld();
  G.score = 0; G.kills = 0; G.shards = 0; G.combo = 0;
  G.player = makePlayer();
  G.player.maxHp = 500; G.player.hp = 500;
  makeDust();
  attractT = 0;
  Audio_.target = .2;
}
function attractSpawn(dt) {
  attractT -= dt;
  if (attractT <= 0 && G.enemies.length < 13) {
    attractT = rnd(1.6, .5);
    const p = edgePoint();
    spawnEnemy(pick(curLevel().types), p.x, p.y);
  }
}
function sim(dt) {
  G.time += dt;
  if (!G.attract) G.runTime += dt;
  /* the attempt clock, which is what the par-time trophy bonus is judged
     on. Scoped to this level rather than to the run, and it stops the
     moment the last wave falls so the results animation is not charged to
     the player's time. */
  if (!G.attract && !G.survival && !G.levelDone && !G.carding) G.levelT += dt;
  const input = G.attract ? botInput() : humanInput();
  updatePlayer(dt, input);
  updateEchoes(dt);
  updateEnemies(dt);
  updateBullets(dt);
  updateTraces(dt);
  updatePickups(dt);
  if (!G.attract) abilTick(dt);
  if (!G.attract && BRANCHFN.field) BRANCHFN.field(dt);
  /* the barrier drones' walls. Ticked here rather than inside a branch
     field hook because the drone is in four arenas' rosters and Chamber 09
     has no field hook at all. */
  if (!G.attract) barrierTick(dt);
  if (!G.attract) checkSecrets(dt);
  if (G.attract) attractSpawn(dt); else tickWaves(dt);
  if (G.comboTimer > 0) { G.comboTimer -= dt; if (G.comboTimer <= 0) G.combo = 0; }
  Audio_.target = G.attract ? .22 : clamp(.28 + G.enemies.length / 18 * .72 + (G.boss ? .3 : 0), 0, 1);
}

/* ---------------- menus + routing --------------------------------------------- */
function menuItems(menu) { return Array.from(menu.querySelectorAll(".menu-item")); }
function selectMenu(menu, idx) {
  const items = menuItems(menu);
  idx = (idx + items.length) % items.length;
  items.forEach((el, i) => el.classList.toggle("sel", i === idx));
  menu.dataset.idx = idx;
}
function moveMenu(menu, d) { selectMenu(menu, parseInt(menu.dataset.idx || "0", 10) + d); Audio_.ui(); }
function activeMenu() {
  if (currentScreen === "home") return $("#mainMenu");
  if (currentScreen === "pause") return $("#pauseMenu");
  if (currentScreen === "submenu") return $("#submenuMenu");
  return null;
}
/* where returnTo points, for screens reachable from more than one place */
/* the level results screen belongs to the map, so Esc from it goes there */
function returnToFor() {
  if (currentScreen === "pause") return "pause";
  if (currentScreen === "submenu") return "submenu";
  return "home";
}
function route(dest) {
  Audio_.init(); Audio_.resume();
  if (dest === "play") { renderTimelines(); show("timelines"); Audio_.ui(); return; }
  if (dest === "survival") { setTimeline("ch09"); startPlay("survival"); return; }
  if (dest === "again") { startPlay(lastMode); return; }
  if (dest === "shop") { returnTo = currentScreen === "pause" ? "pause" : "home"; renderShop(); show("shop"); Audio_.confirm(); return; }
  if (dest === "guide") { returnTo = returnToFor(); drawBestiary(); show("guide"); Audio_.ui(); return; }
  if (dest === "settings") { returnTo = returnToFor(); renderSettings(); show("settings"); Audio_.ui(); return; }
  if (dest === "submenu") { show("submenu"); selectMenu($("#submenuMenu"), 0); Audio_.ui(); return; }
  if (dest === "home") { if (G.mode === "play" && !G.attract) { G.paused = false; endRunSilently(); } goHome(); Audio_.ui(false); return; }
  if (dest === "boot") { runCine(() => goHome()); return; }
  if (dest === "timelines") { renderTimelines(); show("timelines"); Audio_.ui(); return; }
  if (dest === "admin") { openAdmin(); Audio_.ui(); return; }
  if (dest === "resume") { togglePause(false); return; }
  if (dest === "abandon") { G.paused = false; endRunSilently(); goHome(); return; }
}
document.addEventListener("click", (e) => {
  const el = e.target.closest("[data-go]");
  if (el) route(el.dataset.go);
});
$("#themeSwap").onclick = () => setTheme(nextPalette());
$("#wipeSave").onclick = function () {
  if (this.dataset.armed) {
    const theme = SAVE.settings.theme;
    SAVE = JSON.parse(JSON.stringify(DEFAULT_SAVE));
    SAVE.settings.theme = THEMES[theme] && (theme === "dark" || theme === "light") ? theme : "dark";
    syncCosmetics(); persist(); applySettings(); setTheme(SAVE.settings.theme, true); renderSettings(); refreshHome();
    toast("Progress erased", "var(--threat)");
    this.textContent = "Erase all progress"; delete this.dataset.armed;
  } else {
    this.dataset.armed = "1"; this.textContent = "Click again to confirm";
    setTimeout(() => { if (this.dataset.armed) { this.textContent = "Erase all progress"; delete this.dataset.armed; } }, 4000);
  }
};
$$(".menu").forEach((menu) => menuItems(menu).forEach((el, i) => el.addEventListener("mouseenter", () => { selectMenu(menu, i); Audio_.ui(); })));
$("#levelCard").addEventListener("click", () => { if (G.carding) beginLevelWaves(); });

addEventListener("keydown", (e) => {
  const k = e.key.toLowerCase();
  if (e.code === "Space" || k === "arrowup" || k === "arrowdown") e.preventDefault();
  Audio_.init(); Audio_.resume();
  if (CINE.active) { if (k !== "escape") skipCine(); keys.add(k); return; }
  if (bootRunning) { skipBoot(); keys.add(k); return; }
  if (!keys.has(k)) {
    if (G.drafting) { if (k === "1" || k === "2" || k === "3") { chooseCore(parseInt(k, 10) - 1); return; } }
    if (G.carding && currentScreen === "none") { beginLevelWaves(); keys.add(k); return; }
    if (currentScreen === "none" && G.mode === "play") {
      if (e.code === "Space") edge.dash = true;
      /* the loadout is bound by SLOT, so the order you arrange it in the
         Echo Lab is the order it sits under your fingers */
      if (k === "1") abilUse(0);
      if (k === "2") abilUse(1);
      if (k === "3") abilUse(2);
      if (k === "e") edge.echo = true;
    }
  }
  keys.add(k);
  if (k === "t") { setTheme(nextPalette()); if (currentScreen === "settings") renderSettings(); if (currentScreen === "shop") renderShop(); return; }
  const menu = activeMenu();
  if (menu) {
    if (k === "arrowdown") { moveMenu(menu, 1); return; }
    if (k === "arrowup") { moveMenu(menu, -1); return; }
    if (k === "enter") { menuItems(menu)[parseInt(menu.dataset.idx || "0", 10)].click(); return; }
  }
  if (k === "escape") {
    if (currentScreen === "cine") { skipCine(); return; }
    if (currentScreen === "timelines" || currentScreen === "admin" || currentScreen === "submenu") { goHome(); return; }
    if (currentScreen === "shop" || currentScreen === "guide" || currentScreen === "settings") {
      if (returnTo === "pause") { show("pause"); selectMenu($("#pauseMenu"), 0); }
      else if (returnTo === "submenu") { show("submenu"); selectMenu($("#submenuMenu"), 0); }
      else goHome();
    } else if (currentScreen === "pause") togglePause(false);
    /* the level results belong to the map, so Esc goes back to the road
       rather than all the way out to the main menu */
    else if (currentScreen === "levelResult") route("timelines");
    else if (currentScreen === "results") route("home");
    else if (currentScreen === "none") togglePause(true);
    return;
  }
  if (currentScreen === "home") {
    if (k === "enter") return route("play");
    if (k === "v") return route("survival");
    if (k === "l") return route("shop");
    if (k === "m") return route("submenu");
    if (k === "`" || k === "~") return route("admin");
    codeBuffer = (codeBuffer + k).slice(-8);
    if (codeBuffer.indexOf("1041") >= 0) { codeBuffer = ""; unlockSecret("constant"); document.body.classList.add("showops"); refreshBranchHome(); }
  }
  if (currentScreen === "results" && (k === "r" || k === "enter")) route("again");
});
addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()));
addEventListener("blur", () => { keys.clear(); mouse.down = false; if (G.mode === "play" && !G.attract && !G.paused) togglePause(true); });
document.addEventListener("visibilitychange", () => { if (document.hidden && G.mode === "play" && !G.attract && !G.paused) togglePause(true); });
addEventListener("mousemove", (e) => { mouse.x = e.clientX; mouse.y = e.clientY; });
cv.addEventListener("mousedown", (e) => {
  Audio_.init(); Audio_.resume();
  if (G.carding && currentScreen === "none") { beginLevelWaves(); return; }
  if (e.button === 0) mouse.down = true;
  if (e.button === 2) { edge.dash = true; e.preventDefault(); }
});
addEventListener("mouseup", (e) => { if (e.button === 0) mouse.down = false; });
cv.addEventListener("contextmenu", (e) => e.preventDefault());
if ("ontouchstart" in window) document.body.classList.add("touch");
cv.addEventListener("touchstart", (e) => {
  Audio_.init(); Audio_.resume();
  touch.active = true;
  if (G.carding) beginLevelWaves();
  for (const t of e.changedTouches) {
    if (t.clientX < innerWidth / 2 && touch.moveId === null) { touch.moveId = t.identifier; touch.mx = t.clientX; touch.my = t.clientY; }
    else if (touch.aimId === null) { touch.aimId = t.identifier; mouse.x = t.clientX; mouse.y = t.clientY; }
  }
  e.preventDefault();
}, { passive: false });
cv.addEventListener("touchmove", (e) => {
  for (const t of e.changedTouches) {
    if (t.identifier === touch.moveId) {
      const dx = t.clientX - touch.mx, dy = t.clientY - touch.my, l = Math.hypot(dx, dy) || 1;
      const n = Math.min(l, 60) / 60;
      touch.mdx = (dx / l) * n; touch.mdy = (dy / l) * n;
    } else if (t.identifier === touch.aimId) { mouse.x = t.clientX; mouse.y = t.clientY; }
  }
  e.preventDefault();
}, { passive: false });
function endTouch(e) {
  for (const t of e.changedTouches) {
    if (t.identifier === touch.moveId) { touch.moveId = null; touch.mdx = 0; touch.mdy = 0; }
    if (t.identifier === touch.aimId) touch.aimId = null;
  }
}
cv.addEventListener("touchend", endTouch);
cv.addEventListener("touchcancel", endTouch);
$$("#touch .tbtn").forEach((b) => b.addEventListener("touchstart", (e) => {
  e.stopPropagation(); e.preventDefault();
  if (b.dataset.act === "dash") edge.dash = true; else edge.echo = true;
}, { passive: false }));

/* ---------------- loop -------------------------------------------------------- */
let last = performance.now(), raf = 0, fpsAcc = 0, fpsN = 0, slowFor = 0;
/* ---- adaptive quality --------------------------------------------------
   This used to be a single one-way cliff: below 42fps for four samples it
   dropped straight to .5, which switches the bloom off outright, and it
   never came back for the rest of the session. So a machine that stuttered
   once during a boss spent the whole run looking flat, and one that only
   just could not afford the chromatic split lost the bloom as well.

   It is a ladder now. Each rung sheds the most expensive thing left before
   touching anything cheaper — the split first (measured at 6.5ms a frame on
   its own), then the bloom, then particle counts — and it climbs back up
   when the frames come back. The hysteresis gap between DROP and RECOVER is
   what stops it oscillating on a machine sitting right on the boundary. */
const QUALITY_RUNGS = [1, .82, .62, .4];
/* What each rung costs the picture, cheapest thing first:
     1     everything
     .82   no chromatic split           (measured 6.5ms a frame on its own)
     .62   no bloom, fewer particles
     .4    ...and the canvas drops to RENDER_SCALE of the device resolution,
           which is the single biggest lever there is on a 2x display —
           a quarter of the pixels to rasterise for a slightly softer image.
   The render scale is deliberately last: it is the only rung you can see in
   the sharpness of the picture rather than just in the effects. */
const RENDER_SCALE = [1, 1, 1, .68];
const QUALITY_DROP_FPS = 46;    /* below this, shed a rung */
const QUALITY_RECOVER_FPS = 58; /* above this, take one back */
let qSlow = 0, qFast = 0;
function applyQualityRung(rung) {
  G.quality = QUALITY_RUNGS[rung];
  if (typeof setRenderScale === "function") setRenderScale(RENDER_SCALE[rung]);
}
function adaptQuality() {
  const i = QUALITY_RUNGS.indexOf(G.quality);
  const rung = i < 0 ? 0 : i;
  if (G.fps < QUALITY_DROP_FPS) {
    qFast = 0;
    if (++qSlow >= 3 && rung < QUALITY_RUNGS.length - 1) { applyQualityRung(rung + 1); qSlow = 0; }
  } else if (G.fps > QUALITY_RECOVER_FPS) {
    qSlow = 0;
    if (++qFast >= 10 && rung > 0) { applyQualityRung(rung - 1); qFast = 0; }
  } else { qSlow = 0; qFast = 0; }
}
function frame(now) {
  raf = requestAnimationFrame(frame);
  let dt = (now - last) / 1000;
  last = now;
  if (dt > .25 || dt < 0) dt = .016;
  dt = Math.min(dt, .05);
  fpsAcc += dt; fpsN++;
  if (fpsAcc > .5) {
    G.fps = fpsN / fpsAcc; fpsAcc = 0; fpsN = 0;
    adaptQuality();
  }
  Audio_.tick(dt);
  if (CINE.active) { cineTick(dt); return; }
  let sdt = dt;
  if (G.slowmo > 0) { G.slowmo -= dt; sdt *= .34; }
  /* hit-stop: the fight holds still for a couple of frames while the sparks
     it just threw keep going, which is what sells the weight of the hit */
  const frozen = G.freeze > 0;
  if (frozen) G.freeze = Math.max(0, G.freeze - dt);
  const running = G.mode === "play" && !G.paused && !G.drafting;
  if (running) {
    if (!frozen) sim(sdt);
    updateFx(frozen ? dt : sdt);
  } else if (G.mode === "dead") {
    const ddt = frozen ? 0 : sdt;
    G.time += ddt * .4; updateEnemies(ddt * .3); updateBullets(ddt * .3); updateEchoes(ddt * .3); updateTraces(ddt * .3);
    updateFx(frozen ? dt : sdt * .7);
  }
  /* exponential bleed-off, snapped to zero so a settled camera is truly still */
  G.trauma = G.trauma > .002 ? approach(G.trauma, 0, TRAUMA_DECAY, dt) : 0;
  G.flash = Math.max(0, G.flash - dt * 3.4);
  G.chroma = Math.max(0, G.chroma - dt * 1.6);
  G.deathT = Math.max(0, G.deathT - dt);
  render();
  if (G.mode === "play" && !G.attract && !G.paused) updateHUD();
}

/* ---------------- boot --------------------------------------------------------- */
resize();
syncCosmetics();
if (!owns(SAVE.cosmetics.palette)) { SAVE.settings.theme = "dark"; SAVE.cosmetics.palette = "pal_dark"; }
setTheme(SAVE.settings.theme || "dark", true);
buildAbilities();
applySettings();
renderSettings();
drawBestiary();
refreshHome();
startAttract();
selectMenu($("#mainMenu"), 0);
refreshBranchHome();
if (SAVE.settings.boot) { runCine(() => { SAVE.booted = 1; persist(); goHome(); }); }
else show("home");

