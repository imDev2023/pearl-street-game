// Gen-0 SVG trait generator - prototype for the on-chain art pipeline (T-003).
// Deterministic: creature #N always renders identically from its seed,
// exactly as the on-chain renderer will after commit-reveal.
import { writeFileSync } from "fs";

/* ---------- seeded PRNG (mulberry32) ---------- */
function rng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = (r, table) => {
  const total = table.reduce((s, [, w]) => s + w, 0);
  let x = r() * total;
  for (const [v, w] of table) { x -= w; if (x <= 0) return v; }
  return table[table.length - 1][0];
};

/* ---------- palettes (body stroke color = rarity tier) ---------- */
const BODY = [
  [{ name: "Biolume",  c: "#35e0a2" }, 55],
  [{ name: "Lagoon",   c: "#38cfe6" }, 28],
  [{ name: "Doubloon", c: "#f0b64f" }, 12],
  [{ name: "Coral",    c: "#ff6b5e" }, 5],
];
const PANEL = "#071c2c";
const DARK = "#020a13";
const GOLD = "#f0b64f";

/* ---------- species bases; anchors: eyes[], hat(x,y,s), mouth(x,y) ---------- */
const SPECIES = {
  Octopus: {
    role: "Strategist",
    anchors: { eyes: [[41, 43], [59, 43]], hat: [50, 26, 1], mouth: [50, 57] },
    draw: (C) => `
      <path d="M28 46 a22 21 0 0 1 44 0 v9 h-44 z" fill="${PANEL}" stroke="${C}" stroke-width="3.5"/>
      <path d="M32 55 q-4 12 -12 15 M42 55 q-2 13 -7 18 M52 55 q0 14 0 18 M62 55 q2 13 7 18 M70 55 q4 12 12 15"
        fill="none" stroke="${C}" stroke-width="3" stroke-linecap="round"/>`,
  },
  Shark: {
    role: "Raider",
    anchors: { eyes: [[72, 50]], hat: [56, 27, 0.9], mouth: [64, 58] },
    draw: (C) => `
      <path d="M14 56 q22 -20 52 -14 l16 -12 -2 16 q8 6 6 10 q-30 12 -58 6 l-12 8 z"
        fill="${PANEL}" stroke="${C}" stroke-width="3.5" stroke-linejoin="round"/>
      <path d="M46 40 l6 -14 10 12" fill="${PANEL}" stroke="${C}" stroke-width="3.5" stroke-linejoin="round"/>
      <path d="M58 60 l3 5 M64 59 l3 5" stroke="${C}" stroke-width="2.5" stroke-linecap="round"/>`,
  },
  Turtle: {
    role: "Defender",
    anchors: { eyes: [[81, 52]], hat: [78, 40, 0.85], mouth: [84, 58] },
    draw: (C) => `
      <path d="M26 56 a24 20 0 0 1 48 0 z" fill="${PANEL}" stroke="${C}" stroke-width="3.5"/>
      <path d="M38 44 h10 M52 44 h10 M45 36 h10 M33 52 h10 M45 52 h10 M57 52 h10" stroke="${C}" stroke-width="2.4" stroke-linecap="round"/>
      <circle cx="80" cy="54" r="7" fill="${PANEL}" stroke="${C}" stroke-width="3.5"/>
      <path d="M32 58 l-6 8 M50 58 l0 9 M66 58 l6 8" stroke="${C}" stroke-width="3" stroke-linecap="round"/>`,
  },
  Seahorse: {
    role: "Courier",
    anchors: { eyes: [[54, 30]], hat: [51, 16, 0.75], mouth: [43, 28] },
    draw: (C) => `
      <path d="M52 22 q16 2 14 18 q-2 14 -14 22 q-8 6 -6 14 q2 8 10 8" fill="none" stroke="${C}" stroke-width="3.5" stroke-linecap="round"/>
      <path d="M52 22 l-12 4 10 6" fill="${PANEL}" stroke="${C}" stroke-width="3.5" stroke-linejoin="round"/>
      <path d="M50 20 l2 -7 5 6" fill="${PANEL}" stroke="${C}" stroke-width="3.5" stroke-linejoin="round"/>
      <path d="M58 42 h7 M56 50 h7 M52 58 h7" stroke="${C}" stroke-width="2.4" stroke-linecap="round"/>`,
  },
  Pufferfish: {
    role: "Tank",
    anchors: { eyes: [[43, 48], [57, 48]], hat: [50, 26, 0.9], mouth: [50, 60] },
    draw: (C) => `
      <circle cx="50" cy="52" r="20" fill="${PANEL}" stroke="${C}" stroke-width="3.5"/>
      <path d="M50 28 v-8 M66 36 l6 -6 M74 52 h8 M66 68 l6 6 M50 76 v8 M34 68 l-6 6 M26 52 h-8 M34 36 l-6 -6"
        stroke="${C}" stroke-width="2.6" stroke-linecap="round"/>`,
  },
};

/* ---------- trait layers ---------- */
const eyeDot = ([x, y], C) =>
  `<circle cx="${x}" cy="${y}" r="5" fill="${DARK}" stroke="${C}" stroke-width="3"/>
   <circle cx="${x + 1.5}" cy="${y - 1.5}" r="1.8" fill="${C}"/>`;

const EYES = [
  [{ name: "Round", d: (a, C) => a.eyes.map((e) => eyeDot(e, C)).join("") }, 52],
  [{ name: "Monocle", d: (a, C) => {
      const last = a.eyes[a.eyes.length - 1];
      return a.eyes.map((e) => eyeDot(e, C)).join("") +
        `<circle cx="${last[0]}" cy="${last[1]}" r="8.5" fill="none" stroke="${GOLD}" stroke-width="2.2"/>
         <path d="M${last[0] + 6} ${last[1] + 6} l5 7" stroke="${GOLD}" stroke-width="2"/>`;
    } }, 18],
  [{ name: "Trader Visor", d: (a, C) => {
      const xs = a.eyes.map((e) => e[0]); const y = a.eyes[0][1];
      const x0 = Math.min(...xs) - 9, x1 = Math.max(...xs) + 9;
      return `<rect x="${x0}" y="${y - 5.5}" width="${x1 - x0}" height="11" rx="5" fill="${DARK}" stroke="${C}" stroke-width="2.4"/>
        <path d="M${x0 + 3} ${y} h${x1 - x0 - 6}" stroke="${C}" stroke-width="1.4" opacity="0.7"/>`;
    } }, 16],
  [{ name: "Bull Stars", d: (a) => a.eyes.map(([x, y]) =>
      `<path d="M${x} ${y - 5} l1.6 3.2 3.6 0.5 -2.6 2.5 0.6 3.6 -3.2 -1.7 -3.2 1.7 0.6 -3.6 -2.6 -2.5 3.6 -0.5 z" fill="${GOLD}"/>`).join("") }, 9],
  [{ name: "Sleepy", d: (a, C) => a.eyes.map(([x, y]) =>
      `<path d="M${x - 5} ${y} q5 5 10 0" fill="none" stroke="${C}" stroke-width="3" stroke-linecap="round"/>`).join("") }, 5],
];

const HATS = [
  [{ name: "None", d: () => "" }, 34],
  [{ name: "Top Hat", d: ([x, y, s], C) => `<g transform="translate(${x},${y}) scale(${s})">
      <rect x="-13" y="-2" width="26" height="4" rx="2" fill="${PANEL}" stroke="${C}" stroke-width="2.4"/>
      <rect x="-8" y="-16" width="16" height="14" rx="2" fill="${PANEL}" stroke="${C}" stroke-width="2.4"/>
      <path d="M-8 -6 h16" stroke="${GOLD}" stroke-width="2.4"/></g>` }, 20],
  [{ name: "Captain Cap", d: ([x, y, s], C) => `<g transform="translate(${x},${y}) scale(${s})">
      <path d="M-12 0 a12 9 0 0 1 24 0 z" fill="${PANEL}" stroke="${C}" stroke-width="2.4"/>
      <path d="M-14 0 h28" stroke="${C}" stroke-width="2.6" stroke-linecap="round"/>
      <circle cx="0" cy="-4" r="2" fill="${GOLD}"/></g>` }, 18],
  [{ name: "Ticker Antenna", d: ([x, y, s], C) => `<g transform="translate(${x},${y}) scale(${s})">
      <path d="M0 2 v-12" stroke="${C}" stroke-width="2.4"/>
      <path d="M-6 -14 l4 -4 4 4 4 -6" fill="none" stroke="${GOLD}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="0" cy="-10" r="2.4" fill="${C}"/></g>` }, 14],
  [{ name: "Kelp Crown", d: ([x, y, s]) => `<g transform="translate(${x},${y}) scale(${s})">
      <path d="M-11 2 l0 -8 4 5 3 -9 4 9 3 -5 0 8 z" fill="${GOLD}" opacity="0.95"/>
      <circle cx="-7" cy="-7" r="1.4" fill="${DARK}"/><circle cx="0" cy="-11" r="1.4" fill="${DARK}"/><circle cx="7" cy="-7" r="1.4" fill="${DARK}"/></g>` }, 8],
  [{ name: "Pearl Diadem", d: ([x, y, s], C) => `<g transform="translate(${x},${y}) scale(${s})">
      <path d="M-10 0 a10 7 0 0 1 20 0" fill="none" stroke="${C}" stroke-width="2.2"/>
      <circle cx="0" cy="-8" r="3.4" fill="#eaf6f1" stroke="${GOLD}" stroke-width="1.6"/></g>` }, 6],
];

const MOUTHS = [
  [{ name: "Gold Smile", d: ([x, y]) => `<path d="M${x - 8} ${y} q8 6 16 0" fill="none" stroke="${GOLD}" stroke-width="3" stroke-linecap="round"/>` }, 42],
  [{ name: "Neutral", d: ([x, y], C) => `<path d="M${x - 6} ${y + 2} h12" stroke="${C}" stroke-width="2.6" stroke-linecap="round"/>` }, 26],
  [{ name: "Bubble Pipe", d: ([x, y], C) => `
      <path d="M${x} ${y + 1} q8 2 10 6 q4 1 4 -3 v-3" fill="none" stroke="${C}" stroke-width="2.4" stroke-linecap="round"/>
      <circle cx="${x + 17}" cy="${y - 6}" r="2.2" fill="none" stroke="${C}" stroke-width="1.6"/>
      <circle cx="${x + 21}" cy="${y - 12}" r="1.5" fill="none" stroke="${C}" stroke-width="1.4"/>` }, 18],
  [{ name: "Whistle", d: ([x, y], C) => `<circle cx="${x}" cy="${y + 2}" r="3" fill="none" stroke="${C}" stroke-width="2.4"/>` }, 14],
];

const AURAS = [
  [{ name: "None", d: () => "" }, 40],
  [{ name: "Bubbles", d: (C) => `<g fill="none" stroke="${C}" opacity="0.55">
      <circle cx="14" cy="30" r="2.4" stroke-width="1.6"/><circle cx="19" cy="18" r="1.6" stroke-width="1.4"/>
      <circle cx="88" cy="34" r="2" stroke-width="1.5"/><circle cx="84" cy="20" r="1.4" stroke-width="1.3"/></g>` }, 26],
  [{ name: "Chart Wake", d: (C) => `<path d="M8 88 l14 -10 10 6 14 -14 12 7 16 -12 14 8"
      fill="none" stroke="${C}" stroke-width="2" opacity="0.4" stroke-linecap="round" stroke-linejoin="round"/>` }, 22],
  [{ name: "Glow Ring", d: (C) => `<circle cx="50" cy="50" r="42" fill="none" stroke="${C}" stroke-width="5" opacity="0.16"/>
      <circle cx="50" cy="50" r="42" fill="none" stroke="${C}" stroke-width="1.4" opacity="0.5"/>` }, 12],
];

const SECTORS = [
  [{ tag: "TECH" }, 26], [{ tag: "FINC" }, 22], [{ tag: "ENGY" }, 18],
  [{ tag: "HLTH" }, 18], [{ tag: "CONS" }, 16],
];

/* ---------- compose one creature ---------- */
export function creature(id) {
  const r = rng(0x5eaf00d ^ (id * 2654435761));
  const speciesName = Object.keys(SPECIES)[id % 5]; // even species split, like the real 1,500-per-species mint
  const sp = SPECIES[speciesName];
  const body = pick(r, BODY), eyes = pick(r, EYES), hat = pick(r, HATS),
        mouth = pick(r, MOUTHS), aura = pick(r, AURAS), sector = pick(r, SECTORS);
  const C = body.c;
  const svg = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    ${aura.d(C)}
    <g>${sp.draw(C)}${eyes.d(sp.anchors, C)}${hat.d(sp.anchors.hat, C)}${mouth.d(sp.anchors.mouth, C)}</g>
    <g font-family="ui-monospace,Menlo,monospace" font-size="6.5">
      <rect x="70" y="90" width="26" height="9" rx="2" fill="${DARK}" stroke="${C}" stroke-width="1" opacity="0.9"/>
      <text x="83" y="96.5" fill="${C}" text-anchor="middle" letter-spacing="0.5">${sector.tag}</text>
    </g>
  </svg>`;
  return { id, species: speciesName, role: sp.role, body: body.name,
    traits: { eyes: eyes.name, hat: hat.name, mouth: mouth.name, aura: aura.name, sector: sector.tag }, svg };
}

/* ---------- proof sheet ---------- */
const N = 25;
const cards = [];
for (let i = 1; i <= N; i++) {
  const c = creature(i);
  const traitLine = [c.body, c.traits.eyes, c.traits.hat, c.traits.mouth, c.traits.aura]
    .filter((t) => t !== "None").join(" · ");
  cards.push(`<div class="card">
    <div class="art">${c.svg}</div>
    <div class="meta">
      <div class="name">${c.species} #${String(c.id).padStart(4, "0")}</div>
      <div class="role">${c.role} · ${c.traits.sector}</div>
      <div class="traits">${traitLine}</div>
    </div>
  </div>`);
}

const html = `<title>Gen-0 Art Prototype</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { background:#04121f; color:#eaf6f1; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; padding:40px 24px 80px; }
  h1 { font-family:"Iowan Old Style",Palatino,Georgia,serif; font-size:34px; margin-bottom:6px; }
  h1 em { font-style:italic; color:#35e0a2; }
  .sub { color:#97b0be; margin-bottom:8px; max-width:70ch; }
  .note { font-family:ui-monospace,Menlo,monospace; font-size:12px; color:#5f7a8c; margin-bottom:30px; }
  .grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(190px,1fr)); gap:14px; max-width:1200px; }
  .card { background:rgba(255,255,255,0.035); border:1px solid rgba(94,234,195,0.16); border-radius:10px; padding:12px; transition:transform .2s ease, border-color .2s ease; }
  .card:hover { transform:translateY(-4px); border-color:#35e0a2; }
  .art svg { width:100%; height:auto; display:block; }
  .meta { margin-top:8px; }
  .name { font-family:ui-monospace,Menlo,monospace; font-size:13px; font-weight:700; }
  .role { font-family:ui-monospace,Menlo,monospace; font-size:10.5px; color:#35e0a2; letter-spacing:0.12em; text-transform:uppercase; margin:2px 0 4px; }
  .traits { font-size:11px; color:#97b0be; line-height:1.5; }
</style>
<h1>Gen-0 Art Prototype - <em>the reef, drawn by code</em></h1>
<p class="sub">Twenty-five creatures rolled from seeded randomness, composed from SVG trait layers: body color tier, eyes, headgear, mouth, aura, sector. Deterministic - creature #N always renders identically, exactly as the on-chain renderer will after commit-reveal.</p>
<p class="note">PROTOTYPE - trait weights and art subject to tuning · every byte here can live on-chain, Nouns-style: no IPFS, no image servers</p>
<div class="grid">${cards.join("\n")}</div>`;

writeFileSync(new URL("./artgen-preview.html", import.meta.url), html);
console.log("wrote artgen-preview.html with", N, "creatures");
const dist = {};
for (let i = 1; i <= 500; i++) { const c = creature(i); dist[c.body] = (dist[c.body] || 0) + 1; }
console.log("body-tier distribution over 500 rolls:", dist);
