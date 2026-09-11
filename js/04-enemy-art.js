/* Procedural art for every base-game (Chamber 09) enemy type, plus the fillBody shading helper. */
/* ---------------- entity art ------------------------------------------ */
function fillBody(r, c, key) {
  ctx.fillStyle = bodyGrad(key, r, "rgb(" + shade(c, 1.3, .34, [255, 255, 255]) + ")", "rgb(" + shade(c, .5) + ")");
}
const ART = {
  /* ---- HUSK — a lurching cracked-mask revenant with dangling claw arms --- */
  husk(e, c) {
    const w = e.wob, r = e.r;
    const dark = "rgb(" + shade(c, .4) + ")", mid = "rgb(" + shade(c, .72) + ")";
    const bone = "rgb(" + shade(c, 1.35, .62, [255, 250, 245]) + ")";
    const lunge = e.state === 2 ? 1 : 0;
    ctx.save();
    ctx.rotate(e.ang);
    /* legs — two lurching stalks under the body */
    for (const sgn of [-1, 1]) {
      const sw = Math.sin(w * 2 + (sgn > 0 ? 0 : Math.PI)) * .55 * (1 - lunge);
      limb(-r * .3, sgn * r * .5, r * 1.25, Math.PI * (sgn > 0 ? .52 : 1.48), sw, mid, 3.4);
      ctx.fillStyle = mid;
      const fx = -r * .3 + Math.cos(Math.PI * (sgn > 0 ? .52 : 1.48) + sw) * r * 1.4;
      const fy = sgn * r * .5 + Math.sin(Math.PI * (sgn > 0 ? .52 : 1.48) + sw) * r * 1.4;
      ctx.beginPath(); ctx.arc(fx, fy, r * .16, 0, TAU); ctx.fill();
    }
    /* trailing rag */
    ctx.globalAlpha = .55;
    hem(r * .8, w, 1.5, dark, 5, .2);
    ctx.globalAlpha = 1;
    /* arms — long, forward, ending in claws */
    for (const sgn of [-1, 1]) {
      const sw = Math.sin(w * 2 + (sgn > 0 ? 1.6 : 0)) * .3 - lunge * .5;
      const ex = r * 1.5 + lunge * r * .5, ey = sgn * r * (1.05 - lunge * .35);
      ctx.strokeStyle = mid; ctx.lineWidth = 4; ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(-r * .1, sgn * r * .6);
      ctx.quadraticCurveTo(r * .55, sgn * r * (1.35 + sw * .4), ex, ey);
      ctx.stroke();
      claw(ex, ey, sgn * .35, r * .7, bone, 2.4);
    }
    /* hunched torso */
    ctx.fillStyle = bodyGrad("huskBody", r, "rgb(" + shade(c, 1.2, .25, [255, 255, 255]) + ")", "rgb(" + shade(c, .46) + ")");
    ctx.beginPath();
    ctx.moveTo(r * .5, -r * .82);
    ctx.quadraticCurveTo(r * 1.0, 0, r * .5, r * .82);
    ctx.quadraticCurveTo(-r * .55, r * 1.02, -r * .82, 0);
    ctx.quadraticCurveTo(-r * .55, -r * 1.02, r * .5, -r * .82);
    ctx.closePath(); ctx.fill(); outline(r, c);
    /* ribs */
    ctx.strokeStyle = "rgba(" + shade(c, .35) + ",.75)"; ctx.lineWidth = 1.5;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.arc(r * .05, i * r * .34, r * .46, -1.15, 1.15);
      ctx.stroke();
    }
    cracks(r, e.hp / e.maxHp, "rgb(" + shade(c, .28) + ")");
    /* head — a bone mask jutting forward */
    ctx.save();
    ctx.translate(r * .58, Math.sin(w * 2) * r * .06);
    ctx.rotate(Math.sin(w) * .1);
    ctx.fillStyle = bone;
    ctx.beginPath();
    ctx.moveTo(r * .62, 0);
    ctx.quadraticCurveTo(r * .3, r * .5, -r * .3, r * .42);
    ctx.quadraticCurveTo(-r * .5, 0, -r * .3, -r * .42);
    ctx.quadraticCurveTo(r * .3, -r * .5, r * .62, 0);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "rgba(" + shade(c, .3) + ",.6)"; ctx.lineWidth = 1.1;
    ctx.beginPath(); ctx.moveTo(r * .58, 0); ctx.lineTo(-r * .18, 0); ctx.stroke();
    fangs(r * .12, r * .22, r * .62, 4, r * .2, "rgba(" + shade(c, .3) + ",.9)", 1);
    /* one furious eye */
    faceEye(r * .02, -r * .16, r * .27, 0, "rgb(" + shade(c, .95, .1, [255, 80, 80]) + ")",
      { blink: e.blink, brow: "rgb(" + shade(c, .32) + ")", angry: 1, slit: 1 });
    ctx.restore();
    rimLight(r);
    ctx.restore();
    if (e.state === 1) {
      ctx.save();
      ctx.globalAlpha = .3 + Math.sin(G.time * 30) * .2;
      ctx.strokeStyle = "rgb(" + c + ")"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, r + 10, 0, TAU); ctx.stroke();
      ctx.restore();
    }
  },

  /* ---- DART — a hornet with swept wings and a heat-glowing stinger ------- */
  dart(e, c) {
    const r = e.r, ang = e.state === 2 ? e.lockAng : e.ang;
    const dark = "rgb(" + shade(c, .38) + ")", mid = "rgb(" + shade(c, .8) + ")";
    const hot = e.state === 2 ? 1 : e.state === 1 ? .62 : .28;
    if (e.state === 1) {
      ctx.save();
      ctx.globalAlpha = .28 + Math.sin(G.time * 34) * .2;
      ctx.strokeStyle = "rgb(" + c + ")"; ctx.lineWidth = 2; ctx.setLineDash([11, 10]);
      ctx.beginPath(); ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(e.lockAng) * 320, Math.sin(e.lockAng) * 320);
      ctx.stroke(); ctx.restore();
    }
    ctx.rotate(ang);
    /* wings — blur harder the faster it is going */
    const beat = Math.sin(G.time * (e.state === 2 ? 60 : 26) + e.wob);
    for (const sgn of [-1, 1]) {
      ctx.save();
      ctx.globalAlpha = .3 + Math.abs(beat) * .3;
      ctx.fillStyle = "rgb(" + shade(c, 1.5, .55, [235, 245, 255]) + ")";
      ctx.translate(-r * .1, sgn * r * .3);
      ctx.rotate(sgn * (.5 + beat * .3));
      ctx.beginPath();
      ctx.ellipse(-r * .7, sgn * r * .55, r * 1.15, r * .38, sgn * .45, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    /* rear legs */
    for (const sgn of [-1, 1]) limb(-r * .3, sgn * r * .35, r * .7, Math.PI * (sgn > 0 ? .7 : 1.3), sgn * .3, dark, 1.7);
    /* abdomen segments */
    ctx.fillStyle = mid;
    for (let i = 0; i < 3; i++) {
      const f = i / 3;
      ctx.beginPath();
      ctx.ellipse(-r * (.55 + f * .55), 0, r * (.42 - f * .1), r * (.5 - f * .12), 0, 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = "rgba(" + shade(c, .32) + ",.9)";
    for (let i = 0; i < 3; i++) {
      ctx.fillRect(-r * (.72 + i * .34), -r * .34, r * .12, r * .68);
    }
    /* thorax */
    fillBody(r, c, "dartBody");
    ctx.beginPath();
    ctx.moveTo(r * 1.05, 0);
    ctx.quadraticCurveTo(r * .35, r * .72, -r * .45, r * .45);
    ctx.quadraticCurveTo(-r * .72, 0, -r * .45, -r * .45);
    ctx.quadraticCurveTo(r * .35, -r * .72, r * 1.05, 0);
    ctx.closePath(); ctx.fill(); outline(r, c);
    /* head + mandibles + twin eyes */
    ctx.save();
    ctx.translate(r * .95, 0);
    ctx.fillStyle = "rgb(" + shade(c, .5) + ")";
    ctx.beginPath(); ctx.ellipse(0, 0, r * .42, r * .38, 0, 0, TAU); ctx.fill();
    for (const sgn of [-1, 1]) {
      ctx.strokeStyle = "rgb(" + shade(c, 1.3, .5, [255, 250, 240]) + ")";
      ctx.lineWidth = 2.1; ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(r * .2, sgn * r * .2);
      ctx.quadraticCurveTo(r * .72, sgn * r * .34, r * .78, sgn * r * .05);
      ctx.stroke();
      /* antenna */
      ctx.strokeStyle = "rgba(" + shade(c, .4) + ",.8)"; ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(r * .1, sgn * r * .3);
      ctx.quadraticCurveTo(r * .5, sgn * r * .95, r * .95, sgn * r * .75 + Math.sin(G.time * 6 + e.wob) * 2);
      ctx.stroke();
    }
    for (const sgn of [-1, 1]) {
      faceEye(r * .06, sgn * r * .22, r * .19, 0,
        "rgb(" + shade(c, 1.2, .25, [255, 210, 90]) + ")", { slit: 1, blink: e.blink });
    }
    ctx.restore();
    /* stinger + exhaust heat */
    ctx.fillStyle = "rgba(255,240,210," + hot + ")";
    tri(-r * 1.15, 0, -r * 1.62 - hot * r * .5, 0, -r * 1.15, r * .16);
    ctx.fill();
    tri(-r * 1.15, 0, -r * 1.62 - hot * r * .5, 0, -r * 1.15, -r * .16);
    ctx.fill();
    glowPool(-r * 1.2, 0, r * (.5 + hot), "255,190,120", hot * .32);
  },

  /* ---- BLOOM — a grinning bomb-jester whose head is a lit fuse ---------- */
  bloom(e, c) {
    const r = e.r, t = clamp(e.fuse || 0, 0, 1);
    const open = .45 + t * .95 + Math.sin(G.time * 6 + e.wob) * .07;
    const panic = Math.sin(G.time * (7 + t * 26));
    ctx.rotate(e.ang);
    /* little running legs */
    for (const sgn of [-1, 1]) {
      limb(-r * .1, sgn * r * .3, r * .8, Math.PI * (sgn > 0 ? .62 : 1.38),
        Math.sin(G.time * 16 + (sgn > 0 ? 0 : Math.PI)) * .8, "rgb(" + shade(c, .42) + ")", 2.4);
    }
    /* petals peeling back from the core */
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU + e.wob * .25;
      ctx.save();
      ctx.rotate(a);
      ctx.translate(r * .3 * open, 0);
      ctx.fillStyle = bodyGrad("bloomPetal", r * .8,
        "rgb(" + shade(c, 1.3, .3, [255, 245, 235]) + ")", "rgb(" + shade(c, .45) + ")");
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(r * .55, r * .42, r * .95, 0);
      ctx.quadraticCurveTo(r * .55, -r * .42, 0, 0);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = "rgba(" + shade(c, .3) + ",.5)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(r * .05, 0); ctx.lineTo(r * .85, 0); ctx.stroke();
      ctx.restore();
    }
    /* the bulb */
    ctx.fillStyle = bodyGrad("bloomBody", r, "rgb(" + shade(c, 1.25, .3, [255, 255, 255]) + ")", "rgb(" + shade(c, .5) + ")");
    ctx.beginPath(); ctx.arc(0, 0, r * .72, 0, TAU); ctx.fill(); outline(r, c);
    /* manic face */
    for (const sgn of [-1, 1]) {
      faceEye(r * .22, sgn * r * .26, r * .2 * (1 + t * .25), e.ang * 0,
        "rgb(" + shade(c, .35, .2, [40, 20, 30]) + ")", { blink: e.blink, brow: "rgb(" + shade(c, .3) + ")", angry: t > .4 });
    }
    ctx.fillStyle = "rgba(" + shade(c, .26) + ",.92)";
    ctx.beginPath();
    ctx.moveTo(-r * .1, r * .0);
    ctx.quadraticCurveTo(r * .3, r * .58 + t * r * .1, r * .5, -r * .05);
    ctx.quadraticCurveTo(r * .2, r * .2, -r * .1, 0);
    ctx.closePath(); ctx.fill();
    fangs(r * .22, r * .06, r * .5, 4, r * .14, "rgba(255,250,245,.9)", 1);
    /* fuse burning down on top */
    ctx.strokeStyle = "rgb(" + shade(c, .38) + ")"; ctx.lineWidth = 2; ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-r * .12, -r * .68);
    ctx.quadraticCurveTo(-r * .5, -r * 1.05, -r * .2 + panic * 2, -r * (1.25 - t * .35));
    ctx.stroke();
    const fx = -r * .2 + panic * 2, fy = -r * (1.25 - t * .35);
    glowPool(fx, fy, r * (.5 + t * .5), "255,210,120", .55 + t * .4);
    ctx.fillStyle = "rgba(255,250,220," + (.75 + t * .25) + ")";
    ctx.beginPath(); ctx.arc(fx, fy, r * (.14 + t * .1), 0, TAU); ctx.fill();
    /* core heat */
    const heat = clamp(.4 + t * .6 + panic * .2, 0, 1);
    glowPool(0, 0, r * (1 + t), "255,180,120", heat * .2);
  },

  /* ---- COLOSSUS — a plated brute with huge fists and a tiny angry head -- */
  colossus(e, c) {
    const r = e.r, w = e.wob * 3.2;
    const dark = "rgb(" + shade(c, .34) + ")", mid = "rgb(" + shade(c, .66) + ")";
    const hi = "rgba(" + shade(c, 1.4, .35, [255, 255, 255]) + ",.55)";
    const charge = e.state === 2 ? 1 : e.state === 1 ? .5 : 0;
    ctx.save(); ctx.rotate(e.ang);
    /* legs */
    for (const sgn of [-1, 1]) {
      const sw = Math.sin(w + (sgn > 0 ? 0 : Math.PI)) * .3;
      limb(-r * .45, sgn * r * .5, r * .7, Math.PI * (sgn > 0 ? .62 : 1.38), sw, dark, 7);
      ctx.fillStyle = dark;
      const a2 = Math.PI * (sgn > 0 ? .62 : 1.38) + sw;
      ctx.save();
      ctx.translate(-r * .45 + Math.cos(a2) * r * .8, sgn * r * .5 + Math.sin(a2) * r * .8);
      ctx.rotate(a2);
      rrect(-r * .16, -r * .2, r * .5, r * .4, r * .14); ctx.fill();
      ctx.restore();
    }
    /* arms + fists, cocked back when charging */
    for (const sgn of [-1, 1]) {
      const bob = Math.sin(w + (sgn > 0 ? 1 : 0)) * .18;
      const ax = r * (.55 + charge * .45), ay = sgn * r * (1.15 + bob * .2);
      ctx.strokeStyle = mid; ctx.lineWidth = 6.5; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(-r * .3, sgn * r * .7); ctx.lineTo(ax, ay); ctx.stroke();
      ctx.save();
      ctx.translate(ax + r * .18, ay);
      ctx.rotate(sgn * .3 + bob);
      plate(-r * .34, -r * .32, r * .72, r * .64, r * .2, "rgb(" + shade(c, .76) + ")", hi);
      ctx.fillStyle = dark;
      for (let k = -1; k <= 1; k++) ctx.fillRect(r * .18, k * r * .2 - r * .05, r * .16, r * .1);
      ctx.restore();
    }
    /* torso — a hexagonal slab of armour */
    ctx.fillStyle = bodyGrad("colossusBody", r, "rgb(" + shade(c, 1.25, .28, [255, 255, 255]) + ")", "rgb(" + shade(c, .45) + ")");
    polyPath(r, 6, .1); ctx.fill(); outline(r, c);
    plate(-r * .5, -r * .58, r * 1.0, r * 1.16, r * .28, "rgba(" + shade(c, .58) + ",.9)", hi);
    /* vent slats */
    ctx.fillStyle = "rgba(" + shade(c, .3) + ",.8)";
    for (let i = -1; i <= 1; i++) ctx.fillRect(-r * .32, i * r * .27 - r * .05, r * .62, r * .1);
    /* core furnace */
    const fur = .5 + charge * .5 + Math.sin(G.time * 5) * .1;
    glowPool(r * .1, 0, r * .7, "255,170,110", fur * .34);
    ctx.fillStyle = "rgba(255,240,215," + (.6 + charge * .4) + ")";
    polyPath(r * .26, 6, -e.wob * .2); ctx.fill();
    /* head — small, sunk between the shoulders */
    ctx.save();
    ctx.translate(r * .62, 0);
    ctx.fillStyle = dark;
    rrect(-r * .22, -r * .3, r * .5, r * .6, r * .16); ctx.fill();
    visor(r * .12, 0, r * .12, r * .38, shade(c, 1.5, .3, [255, 220, 190]), .95, Math.PI / 2);
    for (const sgn of [-1, 1]) horn(-r * .1, sgn * r * .28, sgn * 1.1, r * .5, r * .22, mid, .7);
    ctx.restore();
    cracks(r, e.hp / e.maxHp, "rgb(" + shade(c, .25) + ")");
    rimLight(r);
    ctx.restore();
  },

  /* ---- WEAVER — a hooded caster with orb-hands and no legs at all ------- */
  weaver(e, c) {
    const r = e.r, charge = clamp(1 - (e.timer || 1) / 2.2, 0, 1);
    const dark = "rgb(" + shade(c, .3) + ")", mid = "rgb(" + shade(c, .58) + ")";
    ctx.save();
    ctx.rotate(e.ang);
    /* floating robe, dragging behind */
    ctx.save();
    ctx.rotate(Math.PI);
    hem(r * 1.05, e.wob, 2.1, "rgba(" + shade(c, .34) + ",.92)", 8, .18);
    ctx.restore();
    /* orb hands */
    for (const sgn of [-1, 1]) {
      const hx = r * .5, hy = sgn * r * (.85 + Math.sin(e.wob + (sgn > 0 ? 0 : 1.6)) * .12);
      ctx.strokeStyle = mid; ctx.lineWidth = 2.6; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(0, sgn * r * .4); ctx.quadraticCurveTo(r * .25, sgn * r * .8, hx, hy); ctx.stroke();
      glowPool(hx, hy, r * (.5 + charge * .5), c, .35 + charge * .45);
      ctx.fillStyle = "rgba(255,250,255," + (.55 + charge * .45) + ")";
      ctx.beginPath(); ctx.arc(hx, hy, r * (.16 + charge * .14), 0, TAU); ctx.fill();
    }
    /* body / hood */
    ctx.fillStyle = bodyGrad("weaverBody", r, "rgb(" + shade(c, 1.1, .2, [255, 255, 255]) + ")", "rgb(" + shade(c, .4) + ")");
    ctx.beginPath();
    ctx.moveTo(r * .62, 0);
    ctx.quadraticCurveTo(r * .3, r * .95, -r * .5, r * .78);
    ctx.quadraticCurveTo(-r * .85, 0, -r * .5, -r * .78);
    ctx.quadraticCurveTo(r * .3, -r * .95, r * .62, 0);
    ctx.closePath(); ctx.fill(); outline(r, c);
    /* hood shadow with a pair of eyes inside it */
    ctx.fillStyle = "rgba(12,8,20,.82)";
    ctx.beginPath(); ctx.ellipse(r * .22, 0, r * .34, r * .5, 0, 0, TAU); ctx.fill();
    for (const sgn of [-1, 1]) {
      ctx.fillStyle = "rgb(" + shade(c, 1.5, .4, [255, 255, 255]) + ")";
      ctx.beginPath();
      ctx.ellipse(r * .26, sgn * r * .19, r * .13, r * .08 * (e.blink == null ? 1 : e.blink), sgn * .3, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
    /* the ring of woven thread it hangs inside */
    ctx.save();
    ctx.rotate(e.wob * .4);
    ctx.strokeStyle = "rgba(" + shade(c, 1.05) + ",.55)"; ctx.lineWidth = 1.6;
    ctx.setLineDash([6, 9]);
    ctx.beginPath(); ctx.arc(0, 0, r * 1.5, 0, TAU); ctx.stroke();
    ctx.setLineDash([]);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * TAU + e.wob * .8;
      ctx.fillStyle = "rgb(" + shade(c, 1.25, .3, [255, 255, 255]) + ")";
      ctx.beginPath(); ctx.arc(Math.cos(a) * r * 1.5, Math.sin(a) * r * 1.5, 2.6, 0, TAU); ctx.fill();
    }
    ctx.restore();
  },

  /* ---- SPORE — a fat fungal thing with a cap and sleepy eyes ------------ */
  spore(e, c) {
    const r = e.r, w = e.wob;
    const squish = 1 + Math.sin(w * 2) * .07;
    ctx.save();
    ctx.rotate(e.ang);
    ctx.scale(1 / squish, squish);
    /* stubby feet */
    for (const sgn of [-1, 1]) {
      ctx.fillStyle = "rgb(" + shade(c, .5) + ")";
      ctx.beginPath();
      ctx.ellipse(-r * .1, sgn * r * .68, r * .3, r * .18, sgn * .2, 0, TAU);
      ctx.fill();
    }
    /* body */
    ctx.fillStyle = bodyGrad("sporeBody", r, "rgb(" + shade(c, 1.25, .3, [255, 255, 255]) + ")", "rgb(" + shade(c, .5) + ")");
    blob(r * .92, .07, w * 1.4, 18); ctx.fill(); outline(r, c);
    /* cap */
    ctx.fillStyle = "rgb(" + shade(c, .62) + ")";
    ctx.beginPath();
    ctx.moveTo(-r * .95, -r * .18);
    ctx.quadraticCurveTo(-r * .1, -r * 1.5, r * .95, -r * .18);
    ctx.quadraticCurveTo(0, -r * .48, -r * .95, -r * .18);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = "rgba(" + shade(c, 1.4, .5, [255, 255, 255]) + ",.75)";
    for (let i = 0; i < 4; i++) {
      const a = -2.5 + i * .6;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * r * .62, Math.sin(a) * r * .62 - r * .2, r * .12 + (i % 2) * r * .04, 0, TAU);
      ctx.fill();
    }
    /* face */
    for (const sgn of [-1, 1]) {
      faceEye(r * .3, sgn * r * .24, r * .19, 0, "rgb(" + shade(c, .3, .3, [20, 40, 30]) + ")",
        { blink: e.blink * .8, sclera: "rgba(255,255,250,.9)" });
    }
    ctx.fillStyle = "rgba(" + shade(c, .3) + ",.8)";
    ctx.beginPath(); ctx.ellipse(r * .42, 0, r * .1, r * .16, 0, 0, TAU); ctx.fill();
    /* sporelings clinging to its back — the ones that pop out on death */
    for (let i = 0; i < 3; i++) {
      const a = 2.1 + i * .55 + Math.sin(w + i) * .1;
      ctx.save();
      ctx.translate(Math.cos(a) * r * .78, Math.sin(a) * r * .72);
      ctx.fillStyle = "rgba(" + shade(c, 1.15, .2, [255, 255, 255]) + ",.92)";
      ctx.beginPath(); ctx.arc(0, 0, r * .21, 0, TAU); ctx.fill();
      ctx.fillStyle = "rgba(20,30,24,.8)";
      ctx.beginPath(); ctx.arc(-r * .05, 0, r * .06, 0, TAU); ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  },

  /* ---- MOTE — a tiny gremlin with one huge eye and buzzing wings -------- */
  mote(e, c) {
    const r = e.r;
    ctx.rotate(e.ang);
    const beat = Math.sin(G.time * 44 + e.wob);
    ctx.globalAlpha = .35 + Math.abs(beat) * .25;
    ctx.fillStyle = "rgb(" + shade(c, 1.5, .5, [255, 255, 255]) + ")";
    for (const sgn of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(-r * .3, sgn * r * .7, r * .8, r * .3, sgn * .5, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = "rgba(" + shade(c, .8) + ",.5)";
    tri(-r * 2.2, 0, 0, r * .45, 0, -r * .45); ctx.fill();
    fillBody(r, c, "moteBody");
    ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
    faceEye(r * .28, 0, r * .55, 0, "rgb(" + shade(c, .3, .3, [30, 50, 40]) + ")", { blink: e.blink, slit: 1 });
    for (const sgn of [-1, 1]) {
      ctx.strokeStyle = "rgb(" + shade(c, .5) + ")"; ctx.lineWidth = 1.2; ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(-r * .3, sgn * r * .5);
      ctx.lineTo(-r * .8, sgn * r * 1.1);
      ctx.stroke();
    }
  },

  /* ---- BULWARK — a barrier drone projecting a hard-light riot shield ---- */
  bulwark(e, c) {
    const r = e.r;
    const dark = "rgb(" + shade(c, .34) + ")", mid = "rgb(" + shade(c, .68) + ")";
    const hi = "rgba(" + shade(c, 1.45, .4, [255, 255, 255]) + ",.5)";
    ctx.save(); ctx.rotate(e.ang);
    /* legs — piston struts, not jointed limbs */
    for (const sgn of [-1, 1]) {
      strut(-r * .3, sgn * r * .42, r * .82, Math.PI * (sgn > 0 ? .6 : 1.4),
        Math.sin(e.wob * 2 + (sgn > 0 ? 0 : Math.PI)) * .3, dark, 4.2);
    }
    /* backpack / brace */
    plate(-r * 1.0, -r * .42, r * .5, r * .84, r * .18, dark);
    /* torso */
    ctx.fillStyle = bodyGrad("bulwarkBody", r, "rgb(" + shade(c, 1.2, .28, [255, 255, 255]) + ")", "rgb(" + shade(c, .46) + ")");
    polyPath(r, 7, e.wob * .04); ctx.fill(); outline(r, c);
    plate(-r * .4, -r * .5, r * .82, r * 1.0, r * .24, "rgba(" + shade(c, .6) + ",.92)", hi);
    /* turret dome with a visor slit — a squat sensor housing, no helm, no crest */
    ctx.save();
    ctx.translate(r * .42, 0);
    ctx.fillStyle = mid;
    rrect(-r * .3, -r * .38, r * .68, r * .76, r * .16); ctx.fill();
    visor(r * .18, 0, r * .1, r * .34, "255,110,140", .95, Math.PI / 2);
    ctx.strokeStyle = "rgba(" + shade(c, 1.3, .3, [255, 255, 255]) + ",.5)"; ctx.lineWidth = 1.1;
    ctx.beginPath(); ctx.moveTo(-r * .3, -r * .12); ctx.lineTo(r * .38, -r * .12); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-r * .3, r * .12); ctx.lineTo(r * .38, r * .12); ctx.stroke();
    ctx.restore();
    cracks(r, e.hp / e.maxHp, "rgb(" + shade(c, .26) + ")");
    rimLight(r);
    ctx.restore();
    /* the shield — a projected hard-light barrier panel, not a physical slab */
    ctx.save();
    ctx.rotate(e.face);
    const glow = e.deflect > 0 ? e.deflect * 4 : 0;
    ctx.translate(r + 8, 0);
    const shieldPath = () => {
      ctx.beginPath();
      ctx.moveTo(r * .3, -r * 1.05);
      ctx.quadraticCurveTo(r * .62, 0, r * .3, r * 1.05);
      ctx.lineTo(-r * .22, r * .82);
      ctx.quadraticCurveTo(-r * .05, 0, -r * .22, -r * .82);
      ctx.closePath();
    };
    ctx.fillStyle = "rgba(" + shade(c, .5 + glow * .6, .12 + glow * .5, [255, 255, 255]) + "," + (.38 + glow * .3) + ")";
    shieldPath(); ctx.fill();
    ctx.strokeStyle = "rgba(" + shade(c, 1.5, .5, [255, 255, 255]) + "," + (.6 + glow) + ")";
    ctx.lineWidth = 2.2; ctx.stroke();
    /* projector grid — suggests a paneled hard-light field, not solid metal */
    ctx.strokeStyle = "rgba(" + shade(c, 1.3, .4, [255, 255, 255]) + ",.4)"; ctx.lineWidth = 1;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath(); ctx.moveTo(r * .2, i * r * .55); ctx.lineTo(-r * .1, i * r * .42); ctx.stroke();
    }
    /* emitter spine down the middle */
    ctx.fillStyle = "rgba(" + shade(c, .3) + ",.85)";
    rrect(-r * .07, -r * .4, r * .1, r * .8, r * .04); ctx.fill();
    if (glow > 0) {
      ctx.globalAlpha = clamp(glow, 0, 1) * .55;
      glowPool(r * .2, 0, r * 1.6, shade(c, 1.5, .5, [255, 255, 255]), .8);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  },

  /* ---- NEEDLE — a tripod sniper, all lens and barrel -------------------- */
  needle(e, c) {
    const r = e.r, aiming = e.state === 1;
    const chg = aiming ? clamp(1 - e.timer / .9, 0, 1) : 0;
    if (aiming) {
      ctx.save();
      ctx.globalAlpha = .22 + chg * .6;
      ctx.strokeStyle = "rgb(" + c + ")";
      ctx.lineWidth = 1 + chg * 2.4;
      ctx.beginPath(); ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(e.lockAng) * 1400, Math.sin(e.lockAng) * 1400);
      ctx.stroke(); ctx.restore();
    }
    const dark = "rgb(" + shade(c, .34) + ")", mid = "rgb(" + shade(c, .7) + ")";
    /* three splayed legs, planted */
    ctx.save();
    ctx.rotate(e.ang);
    for (let i = 0; i < 3; i++) {
      const a = Math.PI * .55 + i * 1.4;
      limb(0, 0, r * 1.25, a, Math.sin(e.wob + i) * .12 - .5, dark, 2.4);
    }
    ctx.restore();
    ctx.rotate(aiming ? e.lockAng : e.ang);
    /* barrel */
    ctx.fillStyle = mid;
    rrect(-r * .3, -r * .24, r * 2.5, r * .48, r * .2); ctx.fill();
    ctx.fillStyle = dark;
    for (let i = 0; i < 3; i++) rrect(r * (.5 + i * .55), -r * .34, r * .12, r * .68, r * .05), ctx.fill();
    ctx.fillStyle = "rgba(255,240,240," + (.3 + chg * .7) + ")";
    ctx.beginPath(); ctx.arc(r * 2.1, 0, r * (.14 + chg * .12), 0, TAU); ctx.fill();
    if (chg > 0) glowPool(r * 2.1, 0, r * (.6 + chg), c, chg * .55);
    /* head — a single big lens with a shutter */
    fillBody(r * .95, c, "needleBody");
    ctx.beginPath(); ctx.arc(0, 0, r * .88, 0, TAU); ctx.fill(); outline(r, c);
    ctx.fillStyle = "rgba(10,8,16,.8)";
    ctx.beginPath(); ctx.arc(r * .1, 0, r * .62, 0, TAU); ctx.fill();
    ctx.strokeStyle = "rgba(" + shade(c, 1.45, .35, [255, 255, 255]) + ",.9)";
    ctx.lineWidth = 1.6;
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * TAU + e.wob * .5;
      ctx.beginPath();
      ctx.moveTo(r * .1 + Math.cos(a) * r * .24, Math.sin(a) * r * .24);
      ctx.lineTo(r * .1 + Math.cos(a) * r * .6, Math.sin(a) * r * .6);
      ctx.stroke();
    }
    /* iris — a plain mechanical pupil, no lid or lash. brightens as it charges. */
    ctx.fillStyle = "rgba(" + shade(c, 1.3, .2, [255, 90, 110]) + "," + (.65 + chg * .35) + ")";
    ctx.beginPath(); ctx.arc(r * .14, 0, r * .16, 0, TAU); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255," + (.4 + chg * .6) + ")";
    ctx.beginPath(); ctx.arc(r * .14, 0, r * .05, 0, TAU); ctx.fill();
    /* charge-up readout — a small clock face ticking toward the shot */
    clockTick(r * .1, 0, r * .58, chg, shade(c, 1.3, .2, [255, 90, 110]), 8);
    ctx.strokeStyle = "rgba(" + TH.rim + ",.35)"; ctx.lineWidth = 1.1;
    ctx.beginPath(); ctx.arc(0, 0, r * .95, -2.3, -.7); ctx.stroke();
  },

  /* ---- MIMIC — a smeared, glitching copy of you ------------------------- */
  mimic(e, c) {
    const r = e.r;
    ctx.rotate(e.ang);
    /* torn duplicate frames trailing behind it */
    for (let i = 2; i >= 1; i--) {
      ctx.save();
      ctx.globalAlpha = .16 * i;
      ctx.translate(-i * 5 - Math.sin(G.time * 9 + i) * 2, Math.sin(G.time * 7 + i) * 2);
      ctx.fillStyle = "rgb(" + c + ")";
      heroPath(r * 1.05); ctx.fill();
      ctx.restore();
    }
    /* solid black body with a bright fracture edge */
    ctx.fillStyle = "rgb(" + shade(c, .2) + ")";
    heroPath(r * 1.05); ctx.fill();
    ctx.strokeStyle = "rgb(" + shade(c, 1.3, .3, [255, 255, 255]) + ")";
    ctx.lineWidth = 1.7; ctx.stroke();
    /* the mask — cracked, one live eye */
    ctx.fillStyle = "rgba(" + shade(c, .34) + ",.95)";
    ctx.beginPath(); ctx.ellipse(r * .34, 0, r * .34, r * .4, 0, 0, TAU); ctx.fill();
    visor(r * .42, 0, r * .12, r * .42, c, .95, Math.PI / 2);
    ctx.strokeStyle = "rgba(" + shade(c, 1.4, .4, [255, 255, 255]) + ",.7)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(r * .2, -r * .4); ctx.lineTo(r * .42, -r * .05); ctx.lineTo(r * .26, r * .3);
    ctx.stroke();
    /* scan band sliding down the hull */
    ctx.save();
    ctx.globalAlpha = .5;
    ctx.fillStyle = "rgb(" + shade(c, 1.5, .5, [255, 255, 255]) + ")";
    const band = ((G.time * 90 + e.wob * 40) % (r * 3)) - r * 1.5;
    ctx.fillRect(-r * 1.2, band, r * 2.8, 1.4);
    ctx.restore();
    ctx.globalAlpha = .35;
    ctx.fillStyle = "rgb(" + c + ")";
    ctx.beginPath(); ctx.ellipse(-r * 1.25, 0, r * .5, r * .22, 0, 0, TAU); ctx.fill();
    ctx.globalAlpha = 1;
  },

  /* ---- MIRROR — your reflection, made of cold glass --------------------- */
  mirror(e, c) {
    const r = e.r;
    ctx.rotate(e.ang);
    /* halo of loose shards */
    for (let i = 0; i < 5; i++) {
      const a = e.wob * .8 + (i / 5) * TAU;
      const rr = r * 1.5 + Math.sin(G.time * 2 + i) * 4;
      ctx.save();
      ctx.translate(Math.cos(a) * rr, Math.sin(a) * rr);
      ctx.rotate(a * 1.6);
      ctx.globalAlpha = .55;
      ctx.fillStyle = "rgb(" + c + ")";
      tri(-3, -5, 4, 0, -3, 5); ctx.fill();
      ctx.restore();
    }
    ctx.globalAlpha = .2;
    ctx.fillStyle = "rgb(" + c + ")";
    heroPath(r * 1.3); ctx.fill();
    ctx.globalAlpha = 1;
    /* faceted body */
    const g = ctx.createLinearGradient(-r, -r, r, r);
    g.addColorStop(0, "rgba(" + c + ",.45)");
    g.addColorStop(.5, "rgba(" + shade(c, 1.4, .55, [255, 255, 255]) + ",.28)");
    g.addColorStop(1, "rgba(" + c + ",.5)");
    ctx.fillStyle = g;
    heroPath(r * 1.05); ctx.fill();
    ctx.strokeStyle = "rgb(" + c + ")"; ctx.lineWidth = 2; ctx.stroke();
    ctx.strokeStyle = "rgba(" + c + ",.55)"; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(r * 1.2, 0); ctx.lineTo(-r * .4, r * .5);
    ctx.moveTo(r * 1.2, 0); ctx.lineTo(-r * .4, -r * .5);
    ctx.moveTo(-r * .4, r * .5); ctx.lineTo(-r * .4, -r * .5);
    ctx.stroke();
    visor(r * .35, 0, r * .1, r * .5, "255,255,255", .9, Math.PI / 2);
    ctx.fillStyle = "rgba(" + TH.rim + ",.85)";
    ctx.beginPath(); ctx.arc(0, 0, r * .18, 0, TAU); ctx.fill();
  },

  /* ---- WARDEN — a jailer that hooks you and refuses to let go ----------- */
  warden(e, c) {
    const r = e.r, w = e.wob;
    const dark = "rgb(" + shade(c, .3) + ")", mid = "rgb(" + shade(c, .62) + ")";
    /* the chain, drawn out to whatever it has caught */
    if (e.state === 2 && G.player) {
      ctx.save();
      ctx.globalAlpha = .9;
      chain(r * .5, 0, G.player.x - e.x, G.player.y - e.y, "rgba(" + shade(c, 1.3, .35, [255, 255, 255]) + ",.85)");
      ctx.restore();
    }
    ctx.save(); ctx.rotate(e.ang);
    /* heavy robe, no legs */
    hem(r * 1.05, w * .6, 2.4, "rgba(" + shade(c, .26) + ",.95)", 9, .12);
    /* shoulder yoke */
    for (const sgn of [-1, 1]) {
      ctx.save();
      ctx.translate(-r * .05, sgn * r * .82);
      ctx.rotate(sgn * .3);
      plate(-r * .38, -r * .26, r * .8, r * .52, r * .24, mid, "rgba(255,255,255,.25)");
      ctx.fillStyle = dark;
      for (let k = 0; k < 3; k++) {
        tri(-r * .2 + k * r * .24, -r * .26, -r * .06 + k * r * .24, -r * .26, -r * .13 + k * r * .24, -r * .56);
        ctx.fill();
      }
      ctx.restore();
    }
    /* body */
    ctx.fillStyle = bodyGrad("wardenBody", r, "rgb(" + shade(c, 1.15, .25, [255, 255, 255]) + ")", "rgb(" + shade(c, .38) + ")");
    ctx.beginPath();
    ctx.moveTo(r * .58, -r * .62);
    ctx.quadraticCurveTo(r * .9, 0, r * .58, r * .62);
    ctx.quadraticCurveTo(-r * .3, r * .95, -r * .7, 0);
    ctx.quadraticCurveTo(-r * .3, -r * .95, r * .58, -r * .62);
    ctx.closePath(); ctx.fill(); outline(r, c);
    /* shackle rings across the chest */
    ctx.strokeStyle = "rgba(" + shade(c, 1.4, .4, [255, 255, 255]) + ",.7)";
    ctx.lineWidth = 1.8;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath(); ctx.ellipse(r * .05, i * r * .34, r * .22, r * .12, 0, 0, TAU); ctx.stroke();
    }
    /* hooded head with a lamp for a face */
    ctx.save();
    ctx.translate(r * .46, 0);
    ctx.fillStyle = dark;
    ctx.beginPath();
    ctx.moveTo(r * .46, 0);
    ctx.quadraticCurveTo(r * .3, r * .48, -r * .2, r * .38);
    ctx.quadraticCurveTo(-r * .38, 0, -r * .2, -r * .38);
    ctx.quadraticCurveTo(r * .3, -r * .48, r * .46, 0);
    ctx.closePath(); ctx.fill();
    const lamp = e.state === 2 ? 1 : e.state === 1 ? .7 : .4;
    glowPool(r * .18, 0, r * .5, c, lamp * .3);
    ctx.fillStyle = "rgba(" + shade(c, 1.5, .45, [255, 255, 255]) + "," + (.5 + lamp * .4) + ")";
    ctx.beginPath(); ctx.arc(r * .18, 0, r * .11, 0, TAU); ctx.fill();
    ctx.strokeStyle = "rgba(" + shade(c, 1.2, .3, [255, 255, 255]) + ",.8)"; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(r * .18, 0, r * .2, 0, TAU); ctx.stroke();
    ctx.fillStyle = "rgba(10,10,20,.8)";
    ctx.beginPath(); ctx.ellipse(r * .2, 0, r * .05, r * .14, 0, 0, TAU); ctx.fill();
    ctx.restore();
    /* the hook arm */
    ctx.save();
    ctx.translate(r * .3, r * .95);
    ctx.rotate(.5 + Math.sin(w) * .1 - (e.state ? .8 : 0));
    ctx.strokeStyle = mid; ctx.lineWidth = 3.4; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(r * .7, 0); ctx.stroke();
    ctx.strokeStyle = "rgb(" + shade(c, 1.35, .4, [255, 255, 255]) + ")";
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(r * .85, r * .18, r * .3, -1.4, 2.1); ctx.stroke();
    ctx.restore();
    rimLight(r);
    ctx.restore();
  },

  /* ---- REVENANT — a blinking reaper that cleaves where you were ---------- */
  revenant(e, c) {
    const r = e.r, w = e.wob;
    const swing = e.state === 1 ? clamp(1 - e.timer / .62, 0, 1) : 0;
    const dark = "rgb(" + shade(c, .26) + ")";
    /* it doesn't stand on anything — smoke instead of legs */
    ctx.save();
    ctx.globalAlpha = .5;
    for (let i = 0; i < 4; i++) {
      const a = w * .5 + i * 1.6;
      glowPool(Math.cos(a) * r * .3, r * .8 + Math.sin(a) * r * .3, r * .55, c, .3);
    }
    ctx.restore();
    ctx.save();
    ctx.rotate(e.ang);
    /* cloak */
    ctx.save(); ctx.rotate(Math.PI);
    hem(r * 1.1, w, 2.5, "rgba(" + shade(c, .3) + ",.92)", 9, .22);
    ctx.restore();
    ctx.fillStyle = bodyGrad("revBody", r, "rgb(" + shade(c, 1.1, .22, [255, 255, 255]) + ")", "rgb(" + shade(c, .34) + ")");
    ctx.beginPath();
    ctx.moveTo(r * .5, -r * .6);
    ctx.quadraticCurveTo(r * .82, 0, r * .5, r * .6);
    ctx.quadraticCurveTo(-r * .35, r * .95, -r * .72, 0);
    ctx.quadraticCurveTo(-r * .35, -r * .95, r * .5, -r * .6);
    ctx.closePath(); ctx.fill(); outline(r, c);
    /* skull mask */
    ctx.save();
    ctx.translate(r * .42, 0);
    ctx.fillStyle = "rgb(" + shade(c, 1.4, .68, [255, 250, 250]) + ")";
    ctx.beginPath();
    ctx.moveTo(r * .48, 0);
    ctx.quadraticCurveTo(r * .3, r * .42, -r * .1, r * .34);
    ctx.quadraticCurveTo(-r * .34, 0, -r * .1, -r * .34);
    ctx.quadraticCurveTo(r * .3, -r * .42, r * .48, 0);
    ctx.closePath(); ctx.fill();
    for (const sgn of [-1, 1]) {
      ctx.fillStyle = "rgba(12,6,20,.9)";
      ctx.beginPath(); ctx.ellipse(r * .12, sgn * r * .18, r * .13, r * .1, sgn * .35, 0, TAU); ctx.fill();
      ctx.fillStyle = "rgb(" + shade(c, 1.5, .3, [255, 255, 255]) + ")";
      ctx.beginPath(); ctx.arc(r * .14, sgn * r * .18, r * .05, 0, TAU); ctx.fill();
    }
    fangs(r * .18, r * .34, r * .4, 4, r * .1, "rgba(" + shade(c, .3) + ",.85)", 0);
    for (const sgn of [-1, 1]) horn(r * .1, sgn * r * .32, sgn * 1.5, r * .62, r * .16,
      "rgb(" + shade(c, 1.2, .35, [255, 255, 255]) + ")", 1.1);
    ctx.restore();
    /* scythe — sweeps through the cleave */
    ctx.save();
    ctx.rotate(-1.5 + swing * 3.0);
    ctx.strokeStyle = "rgb(" + shade(c, .55) + ")"; ctx.lineWidth = 3.2; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(r * 1.5, 0); ctx.stroke();
    ctx.fillStyle = "rgb(" + shade(c, 1.45, .55, [255, 255, 255]) + ")";
    ctx.beginPath();
    ctx.moveTo(r * 1.5, 0);
    ctx.quadraticCurveTo(r * 2.3, -r * .3, r * 2.1, -r * 1.15);
    ctx.quadraticCurveTo(r * 1.75, -r * .4, r * 1.42, -r * .18);
    ctx.closePath(); ctx.fill();
    if (swing > 0) {
      ctx.globalAlpha = .5;
      glowPool(r * 1.9, -r * .6, r * 1.2, c, .6);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
    ctx.restore();
  },

  /* ---- HOWITZER — an artillery beetle that shells the floor ------------- */
  howitzer(e, c) {
    const r = e.r, w = e.wob;
    const dark = "rgb(" + shade(c, .32) + ")", mid = "rgb(" + shade(c, .68) + ")";
    const kick = e.state === 1 ? clamp(1 - e.timer / 1.15, 0, 1) : 0;
    ctx.save(); ctx.rotate(e.ang);
    /* four crab legs */
    for (const sgn of [-1, 1]) {
      for (let i = 0; i < 2; i++) {
        limb(-r * .2 + i * r * .45, sgn * r * .55, r * .85,
          Math.PI * (sgn > 0 ? .5 : 1.5) + (i ? -.4 : .4) * (sgn > 0 ? 1 : -1),
          Math.sin(w * 1.6 + i * 2 + (sgn > 0 ? 0 : Math.PI)) * .3, dark, 3);
      }
    }
    /* shell */
    ctx.fillStyle = bodyGrad("howBody", r, "rgb(" + shade(c, 1.25, .3, [255, 255, 255]) + ")", "rgb(" + shade(c, .45) + ")");
    ctx.beginPath(); ctx.ellipse(0, 0, r * 1.0, r * .82, 0, 0, TAU); ctx.fill(); outline(r, c);
    ctx.strokeStyle = "rgba(" + shade(c, .3) + ",.7)"; ctx.lineWidth = 1.6;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(-r * .8, i * r * .3); ctx.lineTo(r * .75, i * r * .34);
      ctx.stroke();
    }
    /* the mortar tube, angled up and back, recoiling on fire */
    ctx.save();
    ctx.translate(-r * .1 - kick * r * .25, 0);
    ctx.rotate(-.5);
    plate(-r * .2, -r * .3, r * 1.5, r * .6, r * .22, mid, "rgba(255,255,255,.25)");
    ctx.fillStyle = dark;
    rrect(r * 1.05, -r * .38, r * .28, r * .76, r * .1); ctx.fill();
    if (kick > 0) glowPool(r * 1.35, 0, r * (.7 + kick), "255,210,140", kick * .45);
    ctx.restore();
    /* head with a targeting eye */
    ctx.save();
    ctx.translate(r * .82, 0);
    ctx.fillStyle = mid;
    rrect(-r * .28, -r * .3, r * .66, r * .6, r * .2); ctx.fill();
    faceEye(r * .12, 0, r * .24, 0, "rgb(" + shade(c, 1.3, .25, [255, 90, 60]) + ")",
      { slit: 1, blink: e.blink, brow: dark, angry: 1 });
    ctx.strokeStyle = "rgba(" + shade(c, 1.4, .4, [255, 255, 255]) + ",.6)";
    ctx.lineWidth = 1.1;
    ctx.beginPath(); ctx.arc(r * .12, 0, r * .42, -1, 1); ctx.stroke();
    ctx.restore();
    /* shells strapped to the flank */
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = "rgba(" + shade(c, 1.2, .3, [255, 240, 200]) + ",.9)";
      rrect(-r * .75 + i * r * .3, r * .5, r * .2, r * .42, r * .1); ctx.fill();
    }
    rimLight(r);
    ctx.restore();
  },

  /* ---- HEXER — a rotating beacon that sweeps the room with light -------- */
  hexer(e, c) {
    const r = e.r, w = e.wob;
    const casting = e.state === 1;
    ctx.save();
    /* outer rotor with three emitter arms */
    ctx.rotate(w * (casting ? 1.6 : .5));
    for (let i = 0; i < 3; i++) {
      ctx.save();
      ctx.rotate((i / 3) * TAU);
      ctx.strokeStyle = "rgb(" + shade(c, .55) + ")"; ctx.lineWidth = 3.2; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(r * .5, 0); ctx.lineTo(r * 1.45, 0); ctx.stroke();
      ctx.fillStyle = "rgb(" + shade(c, 1.3, .35, [255, 255, 255]) + ")";
      polyPath(r * .3, 3, 0); ctx.translate(r * 1.5, 0);
      ctx.beginPath();
      ctx.moveTo(r * .34, 0); ctx.lineTo(-r * .16, r * .26); ctx.lineTo(-r * .16, -r * .26);
      ctx.closePath(); ctx.fill();
      if (casting) glowPool(r * .1, 0, r * .8, c, .38);
      ctx.restore();
    }
    ctx.restore();
    /* levitation ring */
    ctx.save();
    ctx.rotate(-w * .7);
    ctx.strokeStyle = "rgba(" + shade(c, 1.1) + "," + (casting ? .8 : .4) + ")";
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 8]);
    ctx.beginPath(); ctx.ellipse(0, 0, r * 1.15, r * .5, 0, 0, TAU); ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
    /* body — a floating cowl around one big eye */
    ctx.save();
    ctx.rotate(e.ang);
    hem(r * .82, w, 1.8, "rgba(" + shade(c, .3) + ",.9)", 6, .18);
    ctx.fillStyle = bodyGrad("hexBody", r, "rgb(" + shade(c, 1.2, .28, [255, 255, 255]) + ")", "rgb(" + shade(c, .42) + ")");
    ctx.beginPath();
    ctx.moveTo(r * .55, -r * .55);
    ctx.quadraticCurveTo(r * .85, 0, r * .55, r * .55);
    ctx.quadraticCurveTo(-r * .4, r * .8, -r * .62, 0);
    ctx.quadraticCurveTo(-r * .4, -r * .8, r * .55, -r * .55);
    ctx.closePath(); ctx.fill(); outline(r, c);
    ctx.fillStyle = "rgba(10,6,18,.8)";
    ctx.beginPath(); ctx.ellipse(r * .2, 0, r * .38, r * .44, 0, 0, TAU); ctx.fill();
    faceEye(r * .26, 0, r * .3, 0, "rgb(" + shade(c, 1.4, .3, [255, 255, 255]) + ")",
      { slit: 1, blink: casting ? 1 : e.blink, sclera: "rgba(" + shade(c, .9) + ",.95)" });
    if (casting) {
      ctx.globalAlpha = .5 + Math.sin(G.time * 20) * .3;
      glowPool(r * .26, 0, r * 1.1, c, .4);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  },

  /* ---- BROODMOTHER — a swollen queen that keeps making more ------------- */
  broodmother(e, c) {
    const r = e.r, w = e.wob;
    const birth = clamp(e.birth || 0, 0, 1);
    const dark = "rgb(" + shade(c, .32) + ")", mid = "rgb(" + shade(c, .62) + ")";
    ctx.save(); ctx.rotate(e.ang);
    /* eight legs */
    for (const sgn of [-1, 1]) {
      for (let i = 0; i < 4; i++) {
        const base = Math.PI * (sgn > 0 ? .5 : 1.5) + (i - 1.5) * .38 * (sgn > 0 ? 1 : -1);
        const sw = Math.sin(w * 1.5 + i * 1.2 + (sgn > 0 ? 0 : 2)) * .38;
        limb(r * .1, sgn * r * .3, r * 1.25, base, sw, mid, 3.4);
        ctx.fillStyle = dark;
        ctx.beginPath();
        ctx.arc(r * .1 + Math.cos(base + sw) * r * 1.4, sgn * r * .3 + Math.sin(base + sw) * r * 1.4, r * .1, 0, TAU);
        ctx.fill();
      }
    }
    /* egg sac */
    ctx.fillStyle = bodyGrad("broodSac", r, "rgb(" + shade(c, 1.3, .4, [255, 255, 255]) + ")", "rgb(" + shade(c, .5) + ")");
    ctx.beginPath();
    ctx.ellipse(-r * .58, 0, r * .85 * (1 + birth * .12), r * .78 * (1 + birth * .1), 0, 0, TAU);
    ctx.fill(); outline(r, c);
    for (let i = 0; i < 5; i++) {
      const a = w * .4 + i * 1.26;
      const ex = -r * .58 + Math.cos(a) * r * .42, ey = Math.sin(a) * r * .38;
      ctx.fillStyle = "rgba(" + shade(c, 1.5, .5, [255, 255, 255]) + "," + (.5 + birth * .5) + ")";
      ctx.beginPath(); ctx.ellipse(ex, ey, r * .17, r * .21, a, 0, TAU); ctx.fill();
      ctx.fillStyle = "rgba(20,32,24,.7)";
      ctx.beginPath(); ctx.arc(ex, ey, r * .07, 0, TAU); ctx.fill();
    }
    if (birth > 0) glowPool(-r * .58, 0, r * 1.5, c, birth * .45);
    /* thorax */
    ctx.fillStyle = mid;
    ctx.beginPath(); ctx.ellipse(r * .15, 0, r * .5, r * .44, 0, 0, TAU); ctx.fill();
    /* head with mandibles and a cluster of eyes */
    ctx.save();
    ctx.translate(r * .72, 0);
    ctx.fillStyle = bodyGrad("broodHead", r * .5, "rgb(" + shade(c, 1.2, .25, [255, 255, 255]) + ")", "rgb(" + shade(c, .45) + ")");
    ctx.beginPath(); ctx.ellipse(0, 0, r * .42, r * .38, 0, 0, TAU); ctx.fill();
    for (const sgn of [-1, 1]) {
      ctx.strokeStyle = "rgb(" + shade(c, 1.25, .45, [255, 255, 250]) + ")";
      ctx.lineWidth = 2.6; ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(r * .2, sgn * r * .22);
      ctx.quadraticCurveTo(r * .72, sgn * r * .42, r * .82, sgn * r * .02);
      ctx.stroke();
    }
    for (const sgn of [-1, 1]) {
      faceEye(r * .1, sgn * r * .18, r * .15, 0, "rgb(" + shade(c, .3, .3, [10, 30, 20]) + ")", { blink: e.blink, slit: 1 });
      ctx.fillStyle = "rgba(" + shade(c, .28) + ",.9)";
      ctx.beginPath(); ctx.arc(-r * .1, sgn * r * .3, r * .07, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(-r * .2, sgn * r * .12, r * .06, 0, TAU); ctx.fill();
    }
    ctx.restore();
    rimLight(r);
    ctx.restore();
  },

  /* ---- PARADOX — the thing under the level ------------------------------ */
  paradox(e, c) {
    const r = e.r, ph = e.phase || 0, sp = e.spin || 0;
    const dark = "rgb(" + shade(c, .24) + ")";
    /* orbital rings */
    for (let i = 0; i < 3; i++) {
      ctx.save();
      ctx.rotate(sp * (i % 2 ? -1 : 1) * (.4 + i * .2));
      ctx.strokeStyle = "rgba(" + shade(c, 1.1 - i * .12, .2, [255, 255, 255]) + "," + (.5 - i * .1) + ")";
      ctx.lineWidth = 3 - i * .6;
      ctx.beginPath();
      ctx.ellipse(0, 0, r + 26 + i * 20, (r + 26 + i * 20) * (.34 + i * .2), i * .7, 0, TAU);
      ctx.stroke();
      ctx.restore();
    }
    /* six drifting shards */
    for (let i = 0; i < 6; i++) {
      const a = sp * 1.4 + (i / 6) * TAU;
      const rr = r + 44 + Math.sin(sp * 2 + i) * 12;
      ctx.save();
      ctx.translate(Math.cos(a) * rr, Math.sin(a) * rr * .62);
      ctx.rotate(a * 2);
      ctx.fillStyle = "rgb(" + shade(c, 1.15) + ")";
      polyPath(7 + ph * 1.5, 3, 0); ctx.fill();
      ctx.restore();
    }
    /* four arms reaching out of the cloak */
    for (let i = 0; i < 4; i++) {
      const sgn = i < 2 ? -1 : 1, k = i % 2;
      const a = sgn * (.8 + k * .5) + Math.sin(G.time * 1.4 + i) * .12;
      ctx.save();
      ctx.rotate(e.ang + a);
      ctx.strokeStyle = "rgba(" + shade(c, .55) + ",.95)";
      ctx.lineWidth = 5 - k; ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(r * .3, 0);
      ctx.quadraticCurveTo(r * .9, r * .2, r * (1.25 + k * .2), 0);
      ctx.stroke();
      claw(r * (1.25 + k * .2), 0, 0, r * .38, "rgb(" + shade(c, 1.3, .35, [255, 255, 255]) + ")", 2.4);
      ctx.restore();
    }
    /* cloak + body */
    ctx.save();
    ctx.rotate(e.ang);
    ctx.save(); ctx.rotate(Math.PI);
    hem(r * 1.0, sp, 2.6, "rgba(" + shade(c, .22) + ",.95)", 11, .14);
    ctx.restore();
    ctx.fillStyle = bodyGrad("paradoxBody", r, "rgb(" + shade(c, 1.2, .25, [255, 255, 255]) + ")", "rgb(" + shade(c, .34) + ")");
    polyPath(r, 6, 0); ctx.fill();
    ctx.fillStyle = "rgba(" + shade(c, .32) + ",.9)";
    polyPath(r * .76, 6, .5); ctx.fill();
    /* clock face core */
    ctx.strokeStyle = "rgba(" + TH.rim + ",.5)"; ctx.lineWidth = 1.2;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r * .5, Math.sin(a) * r * .5);
      ctx.lineTo(Math.cos(a) * r * .62, Math.sin(a) * r * .62);
      ctx.stroke();
    }
    ctx.strokeStyle = "rgba(" + TH.rim + ",.9)"; ctx.lineWidth = 2.4; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(-sp * 2.2) * r * .44, Math.sin(-sp * 2.2) * r * .44); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(sp * .7) * r * .3, Math.sin(sp * .7) * r * .3); ctx.stroke();
    /* hood full of eyes — one opens per phase */
    ctx.save();
    ctx.translate(r * .52, 0);
    ctx.fillStyle = dark;
    ctx.beginPath();
    ctx.moveTo(r * .5, 0);
    ctx.quadraticCurveTo(r * .34, r * .52, -r * .2, r * .42);
    ctx.quadraticCurveTo(-r * .42, 0, -r * .2, -r * .42);
    ctx.quadraticCurveTo(r * .34, -r * .52, r * .5, 0);
    ctx.closePath(); ctx.fill();
    const pc = ["255,120,160", "255,180,120", "255,90,90"][ph] || "255,120,160";
    faceEye(r * .18, 0, r * .2, 0, "rgb(" + pc + ")", { slit: 1, blink: 1 });
    for (let i = 0; i <= ph; i++) {
      for (const sgn of [-1, 1]) {
        ctx.fillStyle = "rgb(" + pc + ")";
        ctx.beginPath();
        ctx.ellipse(r * (.02 - i * .14), sgn * r * (.24 + i * .1), r * .08, r * .05, sgn * .4, 0, TAU);
        ctx.fill();
      }
    }
    ctx.restore();
    ctx.restore();
    glowPool(0, 0, r * 2.1, pcOf(ph), .16 + ph * .06);
    rimLight(r);
  },
};
function pcOf(ph) { return ["255,120,160", "255,180,120", "255,90,90"][ph] || "255,120,160"; }

