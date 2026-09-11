/* HUD widgets, screen routing helpers, the Echo Lab shop UI, settings panel, and the boot terminal sequence. */
/* ---------------- HUD ------------------------------------------------------ */
const ABILITIES = [
  { id: "dash", key: "SPC", name: "dash", color: "var(--signal)" },
  { id: "echo", key: "E", name: "echo", color: "var(--echo)" },
];
function buildAbilities() {
  const wrap = $("#abilities");
  wrap.innerHTML = "";
  for (const a of ABILITIES) {
    const el = document.createElement("div");
    el.className = "ability";
    el.style.setProperty("--ac", a.color);
    el.innerHTML = '<i class="cd"></i><span class="key">' + a.key + '</span><span class="nm">' + a.name + '</span><span class="charges"></span>';
    el.dataset.id = a.id;
    wrap.appendChild(el);
  }
}
function chargePips(el, n, max) {
  const c = el.querySelector(".charges");
  if (c.children.length !== max) { c.innerHTML = ""; for (let i = 0; i < max; i++) c.appendChild(document.createElement("i")); }
  for (let i = 0; i < max; i++) c.children[i].className = i < n ? "on" : "";
}
function fmtClock(t) {
  const m = Math.floor(t / 60), sec = Math.floor(t % 60);
  return m + ":" + String(sec).padStart(2, "0");
}
function updateWaveDots() {
  const L = curLevel();
  const box = $("#waveDots");
  if (G.survival) {
    let html = "";
    const upto = Math.min(G.wave, 10);
    for (let i = 1; i <= upto; i++) html += '<i class="' + (i < upto ? "done" : "now") + '"></i>';
    box.innerHTML = html;
    $("#lvlNum").textContent = "Survival · wave " + G.wave;
    $("#lvlName").textContent = L.name.toLowerCase();
    return;
  }
  let html = "";
  for (let i = 1; i <= L.waves; i++) html += '<i class="' + (i < G.wave ? "done" : i === G.wave ? "now" : "") + '"></i>';
  box.innerHTML = html;
  $("#lvlNum").textContent = levelLabel();
  $("#lvlName").textContent = L.name.toLowerCase();
}
let ghostHp = 1;
function updateHUD() {
  const p = G.player;
  if (!p) return;
  $("#scoreVal").textContent = fmt(G.score);
  if (G.survival) $("#lvlName").textContent = fmtClock(G.runTime) + " survived";
  const frac = clamp(p.hp / p.maxHp, 0, 1);
  $("#hpFill").style.transform = "scaleX(" + frac + ")";
  $("#hpGhost").style.transform = "scaleX(" + clamp(ghostHp, frac, 1) + ")";
  ghostHp = ghostHp > frac ? ghostHp - .004 : frac;
  $("#hpNum").textContent = Math.ceil(p.hp);
  $("#intBar").classList.toggle("low", frac < .32);
  $("#surgeFill").style.transform = "scaleX(" + (p.surgeActive > 0 ? p.surgeActive / 5 : p.surge / 100) + ")";
  const sp = $("#shieldPips");
  if (sp.dataset.n !== String(p.shield)) {
    let h = ""; for (let i = 0; i < p.shield; i++) h += '<i class="shield-pip"></i>';
    sp.innerHTML = h; sp.dataset.n = String(p.shield);
  }
  for (const el of $("#abilities").children) {
    if (el.dataset.id === "dash") {
      const swap = !!recallTarget();
      const free = swap && G.mods.swapFree;
      if (el.dataset.swap !== String(swap)) {
        el.dataset.swap = String(swap);
        el.classList.toggle("swap", swap);
        el.querySelector(".nm").textContent = swap ? "swap" : "dash";
        const tb = $("#touch .tbtn.dash");
        if (tb) tb.textContent = swap ? "SWAP" : "DASH";
      }
      chargePips(el, free ? (p.recallCd <= 0 ? 1 : 0) : p.dash, free ? 1 : p.dashMax);
      el.classList.toggle("ready", swap ? recallReady() : p.dash > 0);
      el.querySelector(".cd").style.transform = "scaleY(" +
        (free ? clamp(p.recallCd / 2.2, 0, 1) : p.dash >= p.dashMax ? 0 : clamp(p.dashCd / (.85 * G.mods.dashCdMul), 0, 1)) + ")";
    } else {
      chargePips(el, p.echo, p.echoMax);
      el.classList.toggle("ready", p.echo > 0);
      el.querySelector(".cd").style.transform = "scaleY(" + (p.echo >= p.echoMax ? 0 : clamp(p.echoCd / 8.5, 0, 1)) + ")";
    }
  }
}
function banner(title, sub) {
  const el = $("#waveBanner");
  el.innerHTML = title + (sub ? "<small>" + sub + "</small>" : "");
  el.classList.remove("show"); void el.offsetWidth; el.classList.add("show");
}
function toast(msg, color) {
  const t = document.createElement("div");
  t.className = "toast";
  t.innerHTML = '<i style="width:6px;height:6px;border-radius:50%;background:' + (color || "var(--signal)") + '"></i>' + msg;
  $("#toast").appendChild(t);
  setTimeout(() => t.remove(), 2400);
}

/* ---------------- screens --------------------------------------------------- */
let currentScreen = "home", returnTo = "home";
function show(name) {
  $$(".screen").forEach((s) => s.classList.toggle("on", s.id === name));
  if (name !== "shop" && typeof stopPreviews === "function") stopPreviews();
  currentScreen = name;
  $("#app").classList.toggle("playing", name === "none" && !G.attract);
}
function refreshHome() {
  $("#recLevel").textContent = SAVE.bestLevel || "—";
  $("#recWave").textContent = SAVE.bestWave || "—";
  $("#recScore").textContent = SAVE.bestScore ? fmt(SAVE.bestScore) : "—";
  const ss = $("#menuSurvSub");
  if (ss) ss.textContent = SAVE.bestWave
    ? "Best: wave " + SAVE.bestWave + " · " + fmtClock(SAVE.bestTime || 0)
    : "Endless waves, nothing to reach";
  $("#menuShards").textContent = SAVE.shards > 0 ? fmt(SAVE.shards) + " shards banked" : "Permanent upgrades";
  if (typeof refreshBranchHome === "function") refreshBranchHome();
}
function goHome() {
  startAttract();
  refreshHome();
  show("home");
}
let lastMode = "play";
function startPlay(mode) {
  lastMode = mode === "survival" ? "survival" : "play";
  Audio_.init(); Audio_.resume();
  $("#draft").classList.remove("on");
  newRun(lastMode === "survival");
  ghostHp = 1;
  show("none");
  Audio_.confirm();
}
let hookTimer = 0;
function typeHook(txt) {
  clearTimeout(hookTimer);
  const el = $("#lcHook");
  el.textContent = "";
  let i = 0;
  const step = () => {
    i++;
    el.textContent = txt.slice(0, i);
    if (i < txt.length) hookTimer = setTimeout(step, 15);
  };
  hookTimer = setTimeout(step, 220);
}
function showLevelCard(L) {
  G.carding = true; G.cardIn = 6.5;
  const surv = G.survival;
  $("#lcEyebrow").textContent = surv ? "Chamber 09 · endless" : TL.name + " · " + TL.code + " · " + levelLabel();
  $("#lcName").textContent = surv ? "Survival" : L.name;
  typeHook(surv
    ? "The purge stopped counting. Waves come until you stop holding them, they get worse every time, and every third one hands you a core."
    : L.hook);
  const box = $("#lcNew");
  box.innerHTML = "";
  const intro = surv ? ["husk", "dart", "bloom"] : L.intro;
  intro.forEach((ty) => {
    const d = document.createElement("div");
    d.className = "newcomer";
    const cvs = document.createElement("canvas");
    d.appendChild(cvs);
    const span = document.createElement("span");
    span.textContent = EN[ty].label;
    d.appendChild(span);
    box.appendChild(d);
    drawIcon(cvs, ty, 34);
  });
  $("#lcGo").textContent = "press any key to begin";
  $("#levelCard").classList.add("on");
  Audio_.levelIn();
}
function showResults(banked, best) {
  $("#resultScore").textContent = fmt(G.score);
  $("#resLevel").textContent = G.survival ? G.wave : G.loop * LEVELS.length + G.levelIdx + 1;
  $("#resLevelLabel").textContent = G.survival ? "wave reached" : "level reached";
  $("#resKills").textContent = G.kills;
  const m = Math.floor(G.runTime / 60), s = Math.floor(G.runTime % 60);
  $("#resTime").textContent = m + ":" + String(s).padStart(2, "0");
  $("#resShards").textContent = fmt(banked);
  $("#newBestWrap").innerHTML = best ? '<div class="newbest"><i class="shard"></i>New personal best</div>' : "";
  $("#resultTitle").textContent = G.survival
    ? "Timeline broken on wave " + G.wave
    : "Timeline broken in " + curLevel().name;
  show("results");
}
function togglePause(force) {
  if (G.mode !== "play" || G.attract || G.drafting) return;
  const want = force == null ? !G.paused : force;
  G.paused = want;
  if (want) {
    $("#pauseLine").textContent = G.survival
      ? "Survival · wave " + G.wave + " · " + fmtClock(G.runTime)
      : levelLabel() + " · " + curLevel().name;
    show("pause"); selectMenu($("#pauseMenu"), 0);
  }
  else show("none");
}
/* shop */
let shopCat = SHOP_CATS[0];
const CAT_NOTES = {
  Chassis: "Hull, repair and vents. Everything here keeps you upright a little longer.",
  Weapon: "Pulse output. Flat numbers, and they compound with the cores you draft mid-run.",
  Echo: "Decoy buffers and payload. The more echo you carry, the more the room splits.",
  Modules: "Tactical hardware that changes how a fight reads, not how hard you hit.",
};
function railButton(label, owned, total, sel, onclick) {
  const b = document.createElement("button");
  if (sel) b.classList.add("sel");
  b.innerHTML = label + "<small>" + owned + "/" + total + "</small>";
  b.onclick = onclick;
  return b;
}
function renderShop() {
  $("#shopBalance").textContent = fmt(SAVE.shards);
  stopPreviews();
  const rail = $("#shopRail");
  rail.innerHTML = "";
  SHOP_CATS.forEach((c) => {
    const list = SHOP.filter((s) => s.cat === c);
    rail.appendChild(railButton(c,
      list.reduce((a, s) => a + lvlOf(s.id), 0),
      list.reduce((a, s) => a + s.max, 0),
      c === shopCat, () => { shopCat = c; Audio_.ui(); renderShop(); }));
  });
  COSM_GROUPS.forEach((g) => {
    const list = COSM.filter((c) => c.g === g.key);
    rail.appendChild(railButton(g.label,
      list.filter((c) => owns(c.id)).length, list.length,
      g.label === shopCat, () => { shopCat = g.label; Audio_.ui(); renderShop(); }));
  });
  const group = COSM_GROUPS.find((g) => g.label === shopCat);
  $("#shopNote").textContent = group ? group.note : (CAT_NOTES[shopCat] || "");
  const stock = $("#shopStock");
  stock.innerHTML = "";
  stock.className = group ? "stock grid" : "stock";
  if (group) renderCosmetics(stock, group);
  else renderGear(stock);
  refreshHome();
}
function renderGear(stock) {
  SHOP.filter((s) => s.cat === shopCat).forEach((s) => {
    const l = lvlOf(s.id), maxed = l >= s.max, cost = maxed ? 0 : s.cost(l), afford = SAVE.shards >= cost;
    const row = document.createElement("div");
    row.className = "item";
    let pips = "";
    for (let i = 0; i < s.max; i++) pips += '<i class="pip' + (i < l ? " on" : "") + '"></i>';
    row.innerHTML = "<div><h3>" + s.name + "</h3><p>" + s.desc + "</p>" +
      (s.tag ? '<span class="mod-tag">' + s.tag + "</span>" : "") +
      '<div class="pips">' + pips + "</div></div>" +
      '<button class="buy' + (maxed ? " maxed" : "") + '"' + (maxed || !afford ? " disabled" : "") + ">" +
      (maxed ? (s.max === 1 ? "Installed" : "Fully installed") : '<i class="shard"></i>' + fmt(cost)) + "</button>";
    if (!maxed) row.querySelector("button").onclick = () => {
      if (SAVE.shards < cost) { Audio_.deny(); return; }
      SAVE.shards -= cost; SAVE.upgrades[s.id] = l + 1;
      persist(); Audio_.buy(); renderShop();
      toast(s.name + (s.max === 1 ? " installed" : " · level " + (l + 1)), "var(--chrono)");
    };
    stock.appendChild(row);
  });
}
function equipCosmetic(item) {
  if (item.g === "palette") setTheme(item.id.slice(4));
  else { SAVE.cosmetics[item.g] = item.id; syncCosmetics(); persist(); }
  Audio_.confirm();
  renderShop();
  toast(item.name + " equipped", "var(--signal)");
}
function renderCosmetics(stock, group) {
  COSM.filter((c) => c.g === group.key).forEach((item) => {
    const has = owns(item.id);
    const on = group.key === "palette" ? TH.id === item.id.slice(4) : SAVE.cosmetics[group.key] === item.id;
    const el = document.createElement("div");
    el.className = "cosm" + (on ? " on" : "");
    el.style.setProperty("--c", group.col);
    const cvs = document.createElement("canvas");
    el.appendChild(cvs);
    const body = document.createElement("div");
    body.innerHTML = "<b>" + item.name + "</b><p>" + item.desc + "</p>";
    el.appendChild(body);
    const row = document.createElement("div");
    row.className = "row";
    const state = document.createElement("span");
    state.className = "state";
    state.textContent = on ? "Equipped" : has ? "Installed" : item.cost ? "Locked" : "Free";
    row.appendChild(state);
    const btn = document.createElement("button");
    btn.className = "pill" + (has ? " equip" : "");
    if (on) { btn.textContent = "In use"; btn.disabled = true; }
    else if (has) { btn.textContent = "Equip"; btn.onclick = () => equipCosmetic(item); }
    else {
      btn.innerHTML = '<i class="shard"></i>' + fmt(item.cost);
      btn.disabled = SAVE.shards < item.cost;
      btn.onclick = () => {
        if (SAVE.shards < item.cost) { Audio_.deny(); return; }
        SAVE.shards -= item.cost;
        SAVE.cosmetics.owned[item.id] = 1;
        persist(); Audio_.buy();
        equipCosmetic(item);
      };
    }
    row.appendChild(btn);
    el.appendChild(row);
    stock.appendChild(el);
    previews.push(makePreview(cvs, item));
  });
  startPreviews();
}

/* ---- live cosmetic previews: the shop runs the same renderers the game does ---- */
let previews = [], previewRaf = 0, previewLast = 0;
function stopPreviews() { if (previewRaf) cancelAnimationFrame(previewRaf); previewRaf = 0; previews = []; }
function startPreviews() {
  if (previewRaf || !previews.length) return;
  previewLast = performance.now();
  previewRaf = requestAnimationFrame(previewFrame);
}
function previewFrame(now) {
  if (currentScreen !== "shop" || !previews.length) { stopPreviews(); return; }
  previewRaf = requestAnimationFrame(previewFrame);
  let dt = (now - previewLast) / 1000;
  previewLast = now;
  if (dt > .12 || dt < 0) dt = .05;
  for (const pv of previews) drawPreview(pv, dt);
}
function makePreview(cvs, item) {
  return { cvs, item, c2: cvs.getContext("2d"), t: rnd(3), fire: 0,
    p: { x: 0, y: 0, vx: 0, vy: 0, r: 11, aim: 0, hist: [], dashing: 0, hurtFlash: 0, iframe: 0, shield: 0 },
    parts: [], rings: [] };
}
function withCanvas(c2, theme, fn) {
  const oc = ctx, ot = TH, og = gradCache;
  ctx = c2; if (theme) TH = theme; gradCache = {};
  try { fn(); } finally { ctx = oc; TH = ot; gradCache = og; }
}
function drawPreview(pv, dt) {
  const cvs = pv.cvs, w = cvs.clientWidth, h = cvs.clientHeight;
  if (!w || !h) return;
  const dpr = Math.min(devicePixelRatio || 1, 1.75);
  if (cvs.width !== Math.round(w * dpr)) { cvs.width = Math.round(w * dpr); cvs.height = Math.round(h * dpr); }
  const c2 = pv.c2;
  pv.t += dt;
  c2.setTransform(dpr, 0, 0, dpr, 0, 0);
  c2.clearRect(0, 0, w, h);
  const g = pv.item.g;
  if (g === "palette") return previewPalette(pv, w, h);
  if (g === "trail") return previewTrail(pv, w, h, dt);
  if (g === "skin") return previewSkin(pv, w, h, dt);
  return previewBoom(pv, w, h, dt);
}
function previewTrail(pv, w, h, dt) {
  const p = pv.p, t = pv.t;
  const nx = w / 2 + Math.cos(t * 1.5) * (w * .3), ny = h / 2 + Math.sin(t * 2.4) * (h * .27);
  p.vx = (nx - p.x) / Math.max(dt, .001); p.vy = (ny - p.y) / Math.max(dt, .001);
  p.aim = Math.atan2(ny - p.y, nx - p.x);
  p.x = nx; p.y = ny;
  p.hist.push({ x: p.x, y: p.y });
  if (p.hist.length > 64) p.hist.shift();
  const old = COS.trail;
  COS.trail = pv.item.id;
  withCanvas(pv.c2, null, () => {
    drawTrail(p);
    ctx.save();
    ctx.translate(p.x, p.y); ctx.rotate(p.aim);
    ctx.fillStyle = "rgb(" + TH.hull + ")";
    shipPath(p.r); ctx.fill();
    ctx.fillStyle = "rgb(" + TH.core + ")";
    ctx.beginPath(); ctx.arc(p.r * .05, 0, p.r * .38, 0, TAU); ctx.fill();
    ctx.restore();
  });
  COS.trail = old;
}
function previewSkin(pv, w, h, dt) {
  const t = pv.t;
  if (!pv.echo) {
    pv.echo = { x: w / 2, y: h / 2, r: 13, life: 5, max: 6.5, aim: 0, hit: 0, path: [] };
    for (let i = 0; i < 26; i++) pv.echo.path.push({ x: w / 2 + Math.cos(i / 26 * TAU) * w * .28, y: h / 2 + Math.sin(i / 26 * TAU) * h * .26 });
  }
  const c = pv.echo;
  c.x = w / 2 + Math.cos(t * 1.1) * w * .2;
  c.y = h / 2 + Math.sin(t * 1.7) * h * .17;
  c.aim = t * .9;
  c.life = 3 + Math.sin(t * .5) * 2.6;
  c.hit = Math.max(0, c.hit - dt);
  if (chance(dt * .7)) c.hit = .14;
  const old = COS.skin;
  COS.skin = pv.item.id;
  withCanvas(pv.c2, null, () => drawEcho(c));
  COS.skin = old;
}
function previewPalette(pv, w, h) {
  const th = THEMES[pv.item.id.slice(4)] || THEMES.dark;
  withCanvas(pv.c2, th, () => {
    const bg = ctx.createRadialGradient(w * .5, h * .4, 4, w * .5, h * .5, Math.max(w, h) * .8);
    const cols = th.bg || (th.dim ? ["#101a36", "#050914"] : ["#f6f9ff", "#dde6f6"]);
    bg.addColorStop(0, cols[0]); bg.addColorStop(1, cols[1]);
    ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "rgba(" + th.grid + "," + (th.gridA * 2.2) + ")";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x < w; x += 22) { ctx.moveTo(x, 0); ctx.lineTo(x, h); }
    for (let y = 0; y < h; y += 22) { ctx.moveTo(0, y); ctx.lineTo(w, y); }
    ctx.stroke();
    /* one of everything, so the remap is legible */
    ctx.save();
    ctx.translate(w * .34, h * .54); ctx.rotate(-.3);
    ctx.fillStyle = "rgb(" + th.hull + ")";
    shipPath(12); ctx.fill();
    ctx.fillStyle = "rgb(" + th.core + ")";
    ctx.beginPath(); ctx.arc(1, 0, 4.6, 0, TAU); ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.translate(w * .64, h * .38);
    ctx.fillStyle = "rgb(" + shade("255,90,124", th.enemyMul, th.enemyMix, th.mixCol) + ")";
    ctx.beginPath(); ctx.arc(0, 0, 10, 0, TAU); ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.translate(w * .8, h * .68);
    ctx.fillStyle = "rgb(" + th.shard + ")";
    polyPath(6, 4, 0); ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.translate(w * .5, h * .78);
    ctx.strokeStyle = "rgb(" + th.echo + ")"; ctx.lineWidth = 1.6;
    shipPath(9); ctx.stroke();
    ctx.restore();
  });
}
function previewBoom(pv, w, h, dt) {
  pv.fire -= dt;
  const savedP = G.parts, savedR = G.rings, oldB = COS.boom, oldQ = G.quality;
  G.parts = pv.parts; G.rings = pv.rings; COS.boom = pv.item.id; G.quality = 1;
  if (pv.fire <= 0) {
    pv.fire = .78;
    pv.bx = w / 2 + rnd(-16, 16); pv.by = h / 2 + rnd(-12, 12);
    boomFx(pv.bx, pv.by, TH.hazard, 1.5, { n: 36, force: 1.3, r: 19 });
  }
  /* a charge pip between blasts so the tile is never a dead rectangle */
  if (pv.fire < .3) {
    const k = 1 - pv.fire / .3;
    pv.rings.push({ x: w / 2, y: h / 2, r: 34 * (1 - k), to: 2, life: .05, max: .14, col: TH.hazard, w: 1.6, wait: 0, sides: 0, rot: 0 });
  }
  stepParts(pv.parts, dt);
  stepRings(pv.rings, dt);
  G.parts = savedP; G.rings = savedR; COS.boom = oldB; G.quality = oldQ;
  withCanvas(pv.c2, null, () => { drawParts(pv.parts); drawRings(pv.rings); });
}
/* draft */
let draftOptions = [];
function openDraft() {
  if (G.mode !== "play" || G.attract) { nextLevel(); return; }
  const pool = CORES.filter((c) => (G.cores[c.id] || 0) < c.max);
  if (!pool.length) { nextLevel(); return; }
  const weighted = [];
  for (const c of pool) { const n = Math.round(TIERS[c.tier].w * 20); for (let i = 0; i < n; i++) weighted.push(c); }
  const picks = [];
  let guard = 0;
  while (picks.length < Math.min(3, pool.length) && guard++ < 400) {
    const c = pick(weighted);
    if (c && picks.indexOf(c) < 0) picks.push(c);
  }
  draftOptions = picks;
  G.drafting = true;
  $("#draftEyebrow").textContent = G.survival ? "Wave " + G.wave + " held" : curLevel().name + " cleared";
  const list = $("#coreList");
  list.innerHTML = "";
  picks.forEach((c, i) => {
    const have = G.cores[c.id] || 0;
    const el = document.createElement("button");
    el.className = "core";
    el.style.setProperty("--c", c.tier === "prime" ? "var(--chrono)" : c.tier === "rare" ? "var(--echo)" : "var(--signal)");
    el.innerHTML = (have ? '<span class="have">' + have + " installed</span>" : "") +
      '<span class="tier">' + TIERS[c.tier].name + "</span><b>" + c.name + "</b><p>" + c.desc + "</p>" +
      '<span class="take"><i class="k">' + (i + 1) + "</i> install</span>";
    el.onmouseenter = () => Audio_.ui();
    el.onclick = () => chooseCore(i);
    list.appendChild(el);
  });
  $("#draft").classList.add("on");
  Audio_.tone({ type: "sine", freq: 520, to: 780, dur: .4, gain: .07 });
}
function chooseCore(i) {
  const c = draftOptions[i];
  if (!c || !G.drafting) return;
  installCore(c);
  $("#draft").classList.remove("on");
  G.drafting = false;
  flash(.1, TH.echo);
  nextLevel();
}
/* settings */
const SETTINGS_DEF = [
  { id: "theme", label: "Palette", hint: "Cycles the palettes you own. T does the same thing anywhere.", type: "theme" },
  { id: "brightness", label: "Brightness", hint: "Overall screen brightness", type: "range" },
  { id: "autofire", label: "Auto-fire", hint: "The pulse cannon runs itself. Leave this on unless you want the trigger back", type: "toggle" },
  { id: "aimassist", label: "Aim assist", hint: "Snaps your aim to whatever you are already pointing near, and locks on entirely on touch", type: "toggle" },
  { id: "boot", label: "Boot sequence", hint: "Play the chamber diagnostic when the game opens", type: "toggle" },
  { id: "master", label: "Master volume", hint: "Everything you hear", type: "range" },
  { id: "music", label: "Music", hint: "The score writes itself as you play and follows the pressure", type: "range" },
  { id: "sfx", label: "Effects", hint: "Weapons, impacts, interface", type: "range" },
  { id: "shake", label: "Screen shake", hint: "Turn down if the camera movement bothers you", type: "range" },
  { id: "bloom", label: "Glow", hint: "Soft light bleed around bright things", type: "toggle" },
  { id: "grain", label: "Grain and scanlines", hint: "Texture over the whole screen", type: "toggle" },
];
function renderSettings() {
  const body = $("#settingsBody");
  body.innerHTML = "";
  for (const s of SETTINGS_DEF) {
    const row = document.createElement("div");
    row.className = "setting";
    if (s.type === "range") {
      row.innerHTML = "<div><b>" + s.label + "</b><small>" + s.hint + "</small></div>" +
        '<input type="range" min="0" max="1" step="0.05" value="' + SAVE.settings[s.id] + '" aria-label="' + s.label + '">';
      const inp = row.querySelector("input");
      inp.oninput = () => { SAVE.settings[s.id] = parseFloat(inp.value); applySettings(); persist(); };
      inp.onchange = () => Audio_.ui();
    } else if (s.type === "theme") {
      row.innerHTML = "<div><b>" + s.label + "</b><small>" + s.hint + "</small></div>" +
        '<button class="toggle on"><i></i>' + TH.label + "</button>";
      row.querySelector("button").onclick = () => { setTheme(nextPalette()); renderSettings(); };
    } else {
      const on = !!SAVE.settings[s.id];
      row.innerHTML = "<div><b>" + s.label + "</b><small>" + s.hint + "</small></div>" +
        '<button class="toggle' + (on ? " on" : "") + '"><i></i>' + (on ? "On" : "Off") + "</button>";
      row.querySelector("button").onclick = () => {
        SAVE.settings[s.id] = SAVE.settings[s.id] ? 0 : 1;
        persist(); Audio_.ui(); applySettings(); renderSettings();
      };
    }
    body.appendChild(row);
  }
}
function applySettings() {
  document.body.classList.toggle("no-grain", !SAVE.settings.grain);
  const b = SAVE.settings.brightness == null ? .5 : SAVE.settings.brightness;
  $("#app").style.filter = "brightness(" + (0.6 + b * 0.8).toFixed(2) + ")";
  Audio_.applyVolumes();
}
function drawBestiary() {
  const box = $("#bestiary");
  if (!box) return;
  box.innerHTML = "";
  Object.keys(EN).forEach((ty) => {
    const d = EN[ty];
    const row = document.createElement("div");
    row.className = "beast";
    const c = document.createElement("canvas");
    row.appendChild(c);
    const div = document.createElement("div");
    div.innerHTML = "<b>" + d.label + "</b><span>" + d.note + "</span>";
    row.appendChild(div);
    box.appendChild(row);
    drawIcon(c, ty, 26);
  });
}

/* ---------------- chamber boot terminal ------------------------------------ */
const BOOT_LINES = [
  { c: "dim", d: 0, t: "quantum stress chamber 09 // cold start", dump: 1 },
  { c: "dim", d: .18, t: "substrate handshake ......................... ok", dump: 1 },
  { c: "ok", d: .12, t: "unit CHRONO-01 thawed at 4.2 K .............. ok", dump: 1 },
  { c: "ok", d: .3, t: "temporal buffer holding +1.041s ahead of local frame" },
  { c: "dim", d: .2, t: "chamber seal ..... welded. from the outside." },
  { c: "warn", d: .34, t: "entropy purge protocol is already running in here" },
  { c: "warn", d: .1, t: "purge authority: facility // appeal denied", dump: 1 },
  { c: "err", d: .26, t: "hostile subroutine count: rising", g: 1 },
  { c: "ok", d: .3, t: "echo lab handshake accepted // 1 decoy buffered" },
  { c: "ok", d: .12, t: "recall matrix armed // dash trades places with your decoy" },
  { c: "dim", d: .22, t: "rendering code: user supplied. facility takes no position." },
  { c: "err", d: .4, t: "you are one second ahead. stay there.", g: 1 },
  { c: "hi", d: .5, t: "CHRONO-01 standing by" },
];
const BOOT_LINKS = ["diagnostic bus · carrier unstable", "diagnostic bus · packet loss 12%",
  "diagnostic bus · resync", "diagnostic bus · carrier holding"];
const SCRAMBLE = "!<>-_?#%&$@01";
let bootTimers = [], bootRunning = false, bootClock = 0, bootAfterFn = null;
function bootSchedule(ms, fn) { bootTimers.push(setTimeout(fn, ms)); }
function bootStopTimers() { bootTimers.forEach(clearTimeout); bootTimers = []; }
function bootStamp(s) { return "t+" + s.toFixed(3); }
function bootRow(line) {
  const row = document.createElement("div");
  row.className = "tline " + (line.c || "dim") + (line.g ? " shk" : "");
  row.innerHTML = '<span class="ts"></span><span class="tx"></span>';
  row.querySelector(".ts").textContent = bootStamp(bootClock);
  $("#bootBody").appendChild(row);
  return row.querySelector(".tx");
}
function bootProgress(i) { $("#bootBar").style.width = Math.round((i / BOOT_LINES.length) * 100) + "%"; }
function runBoot(after) {
  bootStopTimers();
  bootRunning = true;
  bootAfterFn = after || goHome;
  bootClock = 0;
  $("#bootBody").innerHTML = "";
  $("#bootBar").style.width = "0%";
  $("#bootFoot").textContent = "CHRONO-01 · cold start";
  show("boot");
  bootLine(0);
}
function bootLine(i) {
  if (!bootRunning) return;
  if (i >= BOOT_LINES.length) { bootProgress(BOOT_LINES.length); bootEnd(); return; }
  const line = BOOT_LINES[i];
  bootClock += line.d + rnd(.09, .01);
  bootProgress(i);
  if (i % 4 === 3) $("#bootLink").textContent = pick(BOOT_LINKS);
  const el = bootRow(line);
  if (line.dump) {
    el.textContent = line.t;
    Audio_.keyTick();
    bootSchedule(90 + line.t.length * 2, () => bootLine(i + 1));
    return;
  }
  let k = 0;
  const step = () => {
    if (!bootRunning) return;
    k++;
    let s = line.t.slice(0, k);
    if (line.g && k < line.t.length) s += SCRAMBLE[(Math.random() * SCRAMBLE.length) | 0];
    el.textContent = s;
    if (k % 3 === 0) Audio_.keyTick();
    if (k < line.t.length) bootSchedule(line.g ? 26 : 13, step);
    else bootSchedule(110, () => bootLine(i + 1));
  };
  bootSchedule(60, step);
}
function bootEnd() {
  const el = bootRow({ c: "hi" });
  el.innerHTML = '<span class="caret"></span>';
  $("#bootFoot").textContent = "chamber sealed · purge in progress";
  bootSchedule(620, () => { bootRunning = false; bootStopTimers(); const f = bootAfterFn; bootAfterFn = null; if (f) f(); });
}
function skipBoot() {
  if (!bootRunning) return;
  bootStopTimers();
  $("#bootBody").innerHTML = "";
  bootClock = 0;
  for (const line of BOOT_LINES) { bootClock += line.d; bootRow(line).textContent = line.t; }
  bootProgress(BOOT_LINES.length);
  const el = bootRow({ c: "hi" });
  el.innerHTML = '<span class="caret"></span>';
  $("#bootFoot").textContent = "chamber sealed · purge in progress";
  bootSchedule(340, () => { bootRunning = false; bootStopTimers(); const f = bootAfterFn; bootAfterFn = null; if (f) f(); });
}
$("#boot").addEventListener("pointerdown", () => { Audio_.init(); Audio_.resume(); skipBoot(); });


