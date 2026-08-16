// Gen-0 art: Style B "Reef Arcade" (chosen, improved anatomy) plus variants
// C "Night Dive" and D "Pastel Plush". Same seeds and trait rolls across styles.
import { writeFileSync } from "fs";

/* ---------- seeded PRNG ---------- */
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

const TIERS = [
  [{ name: "Common",    frame: "#aebfd0", chip: "#8fa3b8", glow: "#9fd8ea" }, 55],
  [{ name: "Rare",      frame: "#4da3ff", chip: "#3d8de6", glow: "#4da3ff" }, 28],
  [{ name: "Epic",      frame: "#c05df0", chip: "#a94ad9", glow: "#c05df0" }, 12],
  [{ name: "Legendary", frame: "#ffb020", chip: "#e69a10", glow: "#ffb020" }, 5],
];
const EYE_T = [[{ n: "Round" }, 52], [{ n: "Monocle" }, 18], [{ n: "Trader Visor" }, 16], [{ n: "Bull Stars" }, 9], [{ n: "Sleepy" }, 5]];
const HAT_T = [[{ n: "None" }, 34], [{ n: "Top Hat" }, 20], [{ n: "Captain Cap" }, 18], [{ n: "Ticker Antenna" }, 14], [{ n: "Kelp Crown" }, 8], [{ n: "Pearl Diadem" }, 6]];
const MOUTH_T = [[{ n: "Smile" }, 42], [{ n: "Grin" }, 26], [{ n: "Bubble Pipe" }, 18], [{ n: "Whistle" }, 14]];
const AURA_T = [[{ n: "None" }, 40], [{ n: "Bubbles" }, 26], [{ n: "Sparkles" }, 22], [{ n: "Glow" }, 12]];
const SECT_T = [[{ tag: "TECH" }, 26], [{ tag: "FINC" }, 22], [{ tag: "ENGY" }, 18], [{ tag: "HLTH" }, 18], [{ tag: "CONS" }, 16]];

/* ---------- style configs ---------- */
export const STYLES = {
  B: { key: "B", label: "Reef Arcade", out: "#233150", sw: 3.2, blushOn: true,
       win: () => `<rect width="100" height="92" fill="url(#gB)"/>
         <path d="M0 82 q14 -5 26 0 t26 0 t26 0 t26 0 v10 h-104 z" fill="#f0dfae"/>`,
       defs: `<linearGradient id="gB" x1="0" y1="0" x2="0" y2="1">
         <stop offset="0" stop-color="#bfe9f5"/><stop offset="1" stop-color="#8ed3e6"/></linearGradient>`,
       colors: { Octopus: ["#f2708a", "#ffd2de"], Shark: ["#6fa8dc", "#e4f1fa"], Turtle: ["#68c47a", "#f0e3b2", "#4e9a5e", "#a8dcae"], Seahorse: ["#ffa94d", "#ffe0b3"], Pufferfish: ["#ffd166", "#fff0c2"] } },
  C: { key: "C", label: "Night Dive", out: "#101c30", sw: 3.2, blushOn: false, glowBehind: true,
       win: () => `<rect width="100" height="92" fill="url(#gC)"/>
         <path d="M0 84 q14 -4 26 0 t26 0 t26 0 t26 0 v8 h-104 z" fill="#0a2e3d"/>
         <circle cx="18" cy="20" r="1.6" fill="#9fe8d2" opacity="0.8"/><circle cx="85" cy="14" r="1.2" fill="#9fe8d2" opacity="0.6"/>
         <circle cx="90" cy="44" r="1.4" fill="#9fe8d2" opacity="0.7"/>`,
       defs: `<linearGradient id="gC" x1="0" y1="0" x2="0" y2="1">
         <stop offset="0" stop-color="#0d3a4d"/><stop offset="1" stop-color="#051f2b"/></linearGradient>`,
       colors: { Octopus: ["#ff7e9a", "#ffc4d4"], Shark: ["#7ab4ec", "#dcedfb"], Turtle: ["#72d488", "#f2e6b8", "#4fa864", "#b2e6b8"], Seahorse: ["#ffb35e", "#ffe3ba"], Pufferfish: ["#ffd97a", "#fff3cc"] } },
  D: { key: "D", label: "Pastel Plush", out: "#7c8db0", sw: 2.6, blushOn: true, bigBlush: true,
       win: () => `<rect width="100" height="92" fill="url(#gD)"/>
         <path d="M0 82 q14 -5 26 0 t26 0 t26 0 t26 0 v10 h-104 z" fill="#f7ead9"/>`,
       defs: `<linearGradient id="gD" x1="0" y1="0" x2="0" y2="1">
         <stop offset="0" stop-color="#eef7f2"/><stop offset="1" stop-color="#d5ebe4"/></linearGradient>`,
       colors: { Octopus: ["#ffb3c7", "#ffe3ec"], Shark: ["#b3d0f2", "#eef5fc"], Turtle: ["#aadfb4", "#f7edcc", "#8bc79a", "#d2eed8"], Seahorse: ["#ffd0a1", "#fff0dd"], Pufferfish: ["#ffe7a3", "#fff8dd"] } },
};

/* Seahorse silhouette traced from user-supplied reference (seahorse-svgrepo-com.svg), scaled 0.135 into the 100x92 card */
const SEA_FIN1 = "M96.208,206.832c-5.281,3-8.547,8.609-8.547,14.688v20.672c0,9.219,7.406,16.75,16.625,16.891l75.766,1.234 v-13.422l-66.844-39.891C107.989,203.895,101.504,203.816,96.208,206.832z";
const SEA_FIN2 = "M87.661,285.332v20.672c0,6.078,3.266,11.703,8.547,14.703c5.297,3,11.781,2.938,17-0.188l66.844-39.891 v-13.406l-75.766,1.219C95.067,268.598,87.661,276.113,87.661,285.332z";
const SEA_BODY = "M260.536,141.082c20.656,23.25,35.766,29.813,65.578,29.813c14.297,0,87.406-1.203,87.406-1.203 s9.547-21.453,10.734-26.219c1.203-4.766-10.734-5.969-10.734-5.969c-67.953-11.922-72.984-61.328-87.047-76.266 c-4.344-6.594-17.266-61.234-17.266-61.234l-16.891,0.984c0,0,4.969,24.844-4.969,31.797s-42.719,0-51.656-25.828 c-4.969,0-13.906,3.969-13.906,3.969s16.891,24.844-6.953,43.719s-42.719-1-42.719-1l-7.953,15.906c0,0,25.828,8.938,24.828,33.781 c-0.984,24.828-29.797,24.844-29.797,24.844l0.984,12.906c0,0,27.828-2.984,27.828,40.734c0,2.125,0.172,3.797,0.5,5.078v90.813 v64.563v49.469v24.734v3.547c0.016,1.375,0.078,2.719,0.141,4.094c0.172,2.719,0.438,5.422,0.813,8.109 c0.766,5.391,1.969,10.703,3.609,15.844c3.25,10.313,8.188,20.016,14.406,28.672c1.578,2.172,3.219,4.266,4.922,6.281 c1.719,2.063,3.75,4.266,5.797,6.25c4.141,4.031,8.766,7.656,13.75,10.734c9.953,6.188,21.328,10.078,32.781,11.406 c11.469,1.375,23.031,0.297,33.922-2.906c10.875-3.203,21.125-8.578,30-15.828l1.656-1.391l1.734-1.563 c1.156-1.063,2.25-2.156,3.328-3.297c2.125-2.25,4.109-4.641,5.922-7.156c3.625-5.031,6.547-10.5,8.75-16.266 c4.375-11.5,5.828-24.328,3.391-37.109c-1.219-6.375-3.469-12.719-6.719-18.547c-1.609-2.938-3.484-5.719-5.563-8.344 c-1.047-1.313-2.125-2.578-3.266-3.781c-0.547-0.625-1.141-1.203-1.719-1.797c-0.656-0.625-1.313-1.266-2.016-1.875 c-5.5-4.938-12.109-8.656-18.906-10.891c-6.844-2.25-13.859-3.109-20.75-2.766c-6.906,0.375-13.734,1.875-20.391,4.844 c-6.594,2.969-13.203,7.422-18.625,14.266c-1.344,1.703-2.609,3.563-3.734,5.531l-0.406,0.75l-0.563,1.063l-0.344,0.703 l-0.547,1.188l-0.766,1.719c-1.594,3.906-2.766,8.188-3.172,13.031c-0.391,4.797,0.078,10,1.609,14.922 c1.516,4.922,4,9.5,7.25,13.438c1.641,1.984,3.469,3.813,5.594,5.531c2.141,1.719,4.547,3.328,7.766,4.766 c1.609,0.719,3.406,1.391,5.828,1.953l1.422,0.313l1.438,0.25l1.125,0.141c2.922,0.344,5.906,0.344,9.031-0.078 c3.109-0.438,6.391-1.281,9.922-2.969c1.797-0.875,3.641-1.969,5.547-3.438c1.922-1.5,3.922-3.422,5.75-5.984 c1.828-2.516,3.469-5.766,4.359-9.453c0.906-3.656,0.984-7.563,0.406-10.922c-1.219-6.922-4.141-11.016-6.484-13.953l-8.734,7.266 c1.469,1.969,3.141,4.563,3.75,8.578c0.281,1.953,0.188,4.172-0.375,6.234c-0.547,2.078-1.516,3.891-2.609,5.344 c-2.219,2.891-4.688,4.344-6.891,5.344c-2.234,0.953-4.328,1.422-6.359,1.594c-2.016,0.188-3.953,0.094-5.828-0.219 c-0.438-0.063-0.984-0.172-1.578-0.313c-0.703-0.141-0.734-0.203-1.031-0.281c-1.375-0.375-2.422-0.813-3.391-1.297 c-3.766-1.938-6.141-4.344-8.188-7.047c-4.016-5.344-5.625-12.375-4.688-18.531c0.453-3.094,1.391-5.875,2.625-8.422l0.531-1.031 l0.266-0.5l0.203-0.344l0.406-0.656l0.344-0.578l0.297-0.453c0.797-1.219,1.672-2.359,2.609-3.406 c3.797-4.172,8.438-6.906,13.141-8.609c4.734-1.703,9.594-2.406,14.391-2.281c9.531,0.219,18.938,4.047,25.281,10.766 c6.234,6.594,9.844,15.031,10.688,23.484c0.859,8.453-0.859,16.844-4.422,24.094c-7,14.766-21.813,23.453-36.547,26.328 c-14.844,2.891-30.141-0.656-40.781-9.109c-2.688-2.109-5.109-4.469-7.25-7.063c-1.078-1.313-2.031-2.625-3.016-4.078 c-1-1.484-1.938-2.984-2.813-4.5c-3.469-6.109-5.906-12.625-7.219-19.203c-0.656-3.297-1.016-6.594-1.094-9.875 c-0.047-1.641-0.031-3.266,0.063-4.875c0.078-1.703,0.281-2.969,0.469-5.203c0,0-1.516-11.797,5.203-24.781 c6.703-13,17.141-24.766,34.516-34.203c17.391-9.438,65.094-31.781,62.109-83.953c-2.781-48.609-38.469-68.281-67.063-96.875 C255.067,168.41,248.614,127.676,260.536,141.082z";

/* ---------- improved species bodies ---------- */
export function drawSpecies(name, st) {
  const [body, belly, extra, extra2] = st.colors[name];
  const O = st.out, S = st.sw;
  const blush = (x, y) => st.blushOn ? `<circle cx="${x}" cy="${y}" r="${st.bigBlush ? 4.2 : 3.2}" fill="#ff9db8" opacity="${st.bigBlush ? 0.55 : 0.8}"/>` : "";
  if (name === "Octopus") return `
    <path d="M26 46 a24 23 0 0 1 48 0 v7 q0 5 -5 5 h-38 q-5 0 -5 -5 z" fill="${body}" stroke="${O}" stroke-width="${S}"/>
    <path d="M34 50 a16 11 0 0 1 32 0 v8 h-32 z" fill="${belly}"/>
    <path d="M30 58 q-7 9 -15 10 q9 5 16 -2 M40 60 q-4 11 -12 14 q10 2 15 -6 M50 60 q0 13 -5 17 q9 0 11 -10 M60 60 q4 11 12 14 q-10 2 -15 -6 M70 58 q7 9 15 10 q-9 5 -16 -2"
      fill="${body}" stroke="${O}" stroke-width="${S}" stroke-linejoin="round"/>
    <circle cx="37" cy="30" r="4.5" fill="#ffffff" opacity="0.35"/>
    ${blush(30, 50)}${blush(70, 50)}`;
  if (name === "Shark") return `
    <path d="M15 50 l-11 -13 5 14 -5 14 z" fill="${body}" stroke="${O}" stroke-width="${S}" stroke-linejoin="round"/>
    <path d="M14 50 q10 -17 35 -18 q23 -1 34 14 q2 3 -1 6 q-13 12 -34 11 q-24 -1 -34 -13 z" fill="${body}" stroke="${O}" stroke-width="${S}" stroke-linejoin="round"/>
    <path d="M45 33 q1 -13 12 -15 q5 9 -2 16 z" fill="${body}" stroke="${O}" stroke-width="${S}" stroke-linejoin="round"/>
    <path d="M44 58 q-2 10 -10 13 q11 3 17 -7 z" fill="${body}" stroke="${O}" stroke-width="${S}" stroke-linejoin="round"/>
    <path d="M28 57 q20 10 43 -2 q-4 8 -14 10 q-19 3 -29 -8 z" fill="${belly}"/>
    <path d="M57 41 q-2 5 0 9 M63 40 q-2 5 0 9" fill="none" stroke="${O}" stroke-width="2" stroke-linecap="round" opacity="0.75"/>
    ${blush(77, 50)}`;
  if (name === "Turtle") return `
    <path d="M24 54 a26 21 0 0 1 52 0 z" fill="${extra}" stroke="${O}" stroke-width="${S}"/>
    <path d="M36 42 h12 M52 42 h12 M44 34 h12 M30 49 h12 M48 49 h12" stroke="${extra2}" stroke-width="3" stroke-linecap="round"/>
    <path d="M22 54 h56 q3 0 3 3 t-3 3 h-56 q-3 0 -3 -3 t3 -3 z" fill="${belly}" stroke="${O}" stroke-width="${S * 0.8}"/>
    <circle cx="80" cy="46" r="9" fill="${body}" stroke="${O}" stroke-width="${S}"/>
    <path d="M30 60 l-5 8 q7 2 10 -4 M50 60 v9 q6 0 6 -6 M66 60 l5 8 q-7 2 -10 -4" fill="${body}" stroke="${O}" stroke-width="${S * 0.875}" stroke-linejoin="round"/>`;
  if (name === "Seahorse") return `
    <g transform="translate(12 11) scale(0.135)">
      <path d="${SEA_FIN1}" fill="${belly}" stroke="${O}" stroke-width="${S * 6.25}" stroke-linejoin="round"/>
      <path d="${SEA_FIN2}" fill="${belly}" stroke="${O}" stroke-width="${S * 6.25}" stroke-linejoin="round"/>
      <path d="${SEA_BODY}" fill="${body}" stroke="${O}" stroke-width="${S * 6.25}" stroke-linejoin="round"/>
    </g>
    <path d="M50 38 h4 M51.5 45 h4 M51 52 h3.5" stroke="${belly}" stroke-width="2.6" stroke-linecap="round"/>`;
  return `
    <path d="M70 50 l11 -7 -2 9 2 9 -11 -7 z" fill="${body}" stroke="${O}" stroke-width="${S * 0.8}" stroke-linejoin="round"/>
    <path d="M50 24 l4 6 a21 21 0 0 1 13 7.5 l7 -2 -2 7 a21 21 0 0 1 0 15 l2 7 -7 -2 a21 21 0 0 1 -13 7.5 l-4 6 -4 -6 a21 21 0 0 1 -13 -7.5 l-7 2 2 -7 a21 21 0 0 1 0 -15 l-2 -7 7 2 a21 21 0 0 1 13 -7.5 z"
      fill="${body}" stroke="${O}" stroke-width="${S}" stroke-linejoin="round"/>
    <path d="M38 57 a12 8 0 0 0 24 0 z" fill="${belly}"/>
    <path d="M30 48 q-7 -3 -8 2 q3 4 8 2 z" fill="${body}" stroke="${O}" stroke-width="${S * 0.7}" stroke-linejoin="round"/>
    ${blush(36, 54)}${blush(64, 54)}`;
}
export const ANCHORS = {
  Octopus:    { eyes: [[40, 42], [60, 42]], hat: [50, 22, 1],    mouth: [50, 55] },
  Shark:      { eyes: [[68, 44]],           hat: [52, 19, 0.9],  mouth: [64, 55] },
  Turtle:     { eyes: [[81, 44]], eyeS: 0.64, hat: [80, 35.5, 0.65], mouth: [78, 51.5, 0.5] },
  Seahorse:   { eyes: [[54, 25.5]], eyeS: 0.6,  hat: [52, 11, 0.5],  mouth: [67.5, 31, 0.5] },
  Pufferfish: { eyes: [[42, 45], [58, 45]], hat: [50, 22, 0.95], mouth: [50, 58] },
};
const ROLES = { Octopus: "Strategist", Shark: "Raider", Turtle: "Defender", Seahorse: "Courier", Pufferfish: "Tank" };

/* ---------- trait renderers (parameterized outline) ---------- */
function eyesR(name, a, O) {
  const eye = ([x, y]) => `
    <ellipse cx="${x}" cy="${y}" rx="6.2" ry="7" fill="#ffffff" stroke="${O}" stroke-width="2.5"/>
    <circle cx="${x + 1.2}" cy="${y + 1}" r="2.9" fill="${O}"/>
    <circle cx="${x + 2.3}" cy="${y - 1}" r="1.2" fill="#ffffff"/>`;
  const es = a.eyes;
  if (name === "Round") return es.map(eye).join("");
  if (name === "Monocle") {
    const l = es[es.length - 1];
    return es.map(eye).join("") +
      `<circle cx="${l[0]}" cy="${l[1]}" r="9.4" fill="none" stroke="#e6a417" stroke-width="2.5"/>
       <path d="M${l[0] + 7} ${l[1] + 7} l4 8" stroke="#e6a417" stroke-width="2.1"/>`;
  }
  if (name === "Trader Visor") {
    const xs = es.map((e) => e[0]); const y = es[0][1];
    const x0 = Math.min(...xs) - 10, x1 = Math.max(...xs) + 10;
    return `<rect x="${x0}" y="${y - 6}" width="${x1 - x0}" height="12" rx="6" fill="#2b3a5c" stroke="${O}" stroke-width="2.3"/>
      <rect x="${x0 + 3}" y="${y - 2}" width="${x1 - x0 - 6}" height="3.4" rx="1.7" fill="#5ee0ff"/>`;
  }
  if (name === "Bull Stars") return es.map(([x, y]) =>
    `<path d="M${x} ${y - 6.5} l1.9 3.9 4.3 0.6 -3.1 3 0.7 4.3 -3.8 -2 -3.8 2 0.7 -4.3 -3.1 -3 4.3 -0.6 z" fill="#ffb020" stroke="${O}" stroke-width="1.5" stroke-linejoin="round"/>`).join("");
  return es.map(([x, y]) => `<path d="M${x - 5.5} ${y} q5.5 6 11 0" fill="none" stroke="${O}" stroke-width="3" stroke-linecap="round"/>`).join("");
}
function hatR(name, [x, y, s], O) {
  if (name === "None") return "";
  if (name === "Top Hat") return `<g transform="translate(${x},${y}) scale(${s})">
    <rect x="-14" y="-2.4" width="28" height="4.8" rx="2.4" fill="#2b3a5c" stroke="${O}" stroke-width="2.1"/>
    <rect x="-9" y="-18" width="18" height="16" rx="2.5" fill="#33436b" stroke="${O}" stroke-width="2.1"/>
    <rect x="-9" y="-8" width="18" height="4" fill="#ffb020"/></g>`;
  if (name === "Captain Cap") return `<g transform="translate(${x},${y}) scale(${s})">
    <path d="M-12 0 a12 10 0 0 1 24 0 z" fill="#f4f8fb" stroke="${O}" stroke-width="2.1"/>
    <path d="M-15 0 h30 q2 0 2 2.4 t-2 2.4 h-30 q-2 0 -2 -2.4 t2 -2.4 z" fill="#2b3a5c" stroke="${O}" stroke-width="1.9"/>
    <circle cx="0" cy="-4.5" r="2.6" fill="#ffb020" stroke="${O}" stroke-width="1.3"/></g>`;
  if (name === "Ticker Antenna") return `<g transform="translate(${x},${y}) scale(${s})">
    <path d="M0 2 v-10" stroke="${O}" stroke-width="2.5"/>
    <path d="M-7 -12 l4.5 -4 4.5 4 4.5 -6" fill="none" stroke="#ffb020" stroke-width="2.7" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="0" cy="-8" r="2.8" fill="#5ee0ff" stroke="${O}" stroke-width="1.5"/></g>`;
  if (name === "Kelp Crown") return `<g transform="translate(${x},${y}) scale(${s})">
    <path d="M-12 2 v-9 l4.5 5 3.5 -10 4 10 4.5 -5 v9 z" fill="#ffc93c" stroke="${O}" stroke-width="2.1" stroke-linejoin="round"/>
    <circle cx="-7" cy="-8" r="1.5" fill="#ff5e6c"/><circle cx="0" cy="-12" r="1.5" fill="#5ee0ff"/><circle cx="7" cy="-8" r="1.5" fill="#68c47a"/></g>`;
  return `<g transform="translate(${x},${y}) scale(${s})">
    <path d="M-10 1 a10 8 0 0 1 20 0" fill="none" stroke="#e6a417" stroke-width="2.5"/>
    <circle cx="0" cy="-8.5" r="4" fill="#fdf3ff" stroke="#e6a417" stroke-width="1.9"/></g>`;
}
function mouthR(name, [x, y, s = 1], O) {
  let inner;
  if (name === "Smile") inner = `<path d="M-7 -1 q7 6 14 0" fill="none" stroke="${O}" stroke-width="3" stroke-linecap="round"/>`;
  else if (name === "Grin") inner = `<path d="M-8 -2 q8 9 16 0 z" fill="#5c2e3e" stroke="${O}" stroke-width="2.3" stroke-linejoin="round"/>
    <path d="M-4.5 3.5 q4.5 3 9 0 q-2 3.4 -4.5 3.4 t-4.5 -3.4 z" fill="#ff7e8a"/>`;
  else if (name === "Bubble Pipe") inner = `
    <path d="M-1 0 q7 1.5 9 5 q5 2 6 -2 l0.5 -4" fill="none" stroke="#8a5a44" stroke-width="3" stroke-linecap="round"/>
    <rect x="11" y="-3" width="7" height="6" rx="2" fill="#8a5a44" stroke="${O}" stroke-width="1.7"/>
    <circle cx="20" cy="-9" r="2.6" fill="none" stroke="#9fd8ea" stroke-width="1.8"/>
    <circle cx="24" cy="-15" r="1.7" fill="none" stroke="#9fd8ea" stroke-width="1.5"/>`;
  else inner = `<circle cx="0" cy="0" r="3.2" fill="#5c2e3e" stroke="${O}" stroke-width="2.1"/>`;
  return `<g transform="translate(${x} ${y})${s !== 1 ? ` scale(${s})` : ""}">${inner}</g>`;
}
function auraR(name, glow, style) {
  const dot = style.key === "C" ? "#9fe8d2" : "#ffffff";
  if (name === "Bubbles") return `<g fill="${dot}" opacity="0.55">
    <circle cx="15" cy="28" r="3"/><circle cx="21" cy="16" r="2"/><circle cx="86" cy="32" r="2.6"/><circle cx="81" cy="18" r="1.8"/><circle cx="12" cy="46" r="1.6"/></g>`;
  if (name === "Sparkles") return `<g fill="#ffe27a" stroke="#e6a417" stroke-width="1">
    <path d="M16 24 l2 4 4 2 -4 2 -2 4 -2 -4 -4 -2 4 -2 z"/><path d="M84 20 l1.6 3.2 3.2 1.6 -3.2 1.6 -1.6 3.2 -1.6 -3.2 -3.2 -1.6 3.2 -1.6 z"/>
    <path d="M86 52 l1.3 2.6 2.6 1.3 -2.6 1.3 -1.3 2.6 -1.3 -2.6 -2.6 -1.3 2.6 -1.3 z"/></g>`;
  if (name === "Glow") return `<circle cx="50" cy="48" r="38" fill="${glow}" opacity="0.16"/>
    <circle cx="50" cy="48" r="38" fill="none" stroke="${glow}" stroke-width="1.6" opacity="0.55"/>`;
  return "";
}

/* ---------- compose ---------- */
export function creatureStyled(id, styleKey) {
  const st = STYLES[styleKey];
  const r = rng(0x5eaf00d ^ (id * 2654435761));
  const speciesName = Object.keys(ANCHORS)[id % 5];
  const a = ANCHORS[speciesName];
  const tier = pick(r, TIERS), eyes = pick(r, EYE_T), hat = pick(r, HAT_T),
        mouth = pick(r, MOUTH_T), aura = pick(r, AURA_T), sector = pick(r, SECT_T);
  const nightGlow = st.glowBehind ? `<circle cx="50" cy="50" r="34" fill="${tier.glow}" opacity="0.2"/>` : "";
  const svg = `<svg viewBox="0 0 100 92" xmlns="http://www.w3.org/2000/svg">
    <defs>${st.defs.replace(/id="g/, `id="g${id}`).replace(/url\(#g/, `url(#g${id}`)}</defs>
    ${st.win().replace(/url\(#g[BCD]\)/, `url(#g${id}${st.key})`).replace(/id="g[BCD]"/, "")}
    ${nightGlow}${auraR(aura.n, tier.glow, st)}
    <ellipse cx="50" cy="84" rx="24" ry="4" fill="rgba(8,24,40,${st.key === "C" ? 0.3 : 0.15})"/>
    <g>${drawSpecies(speciesName, st)}${a.eyeS ? `<g transform="translate(${a.eyes[0][0]} ${a.eyes[0][1]}) scale(${a.eyeS}) translate(${-a.eyes[0][0]} ${-a.eyes[0][1]})">${eyesR(eyes.n, a, st.out)}</g>` : eyesR(eyes.n, a, st.out)}${hatR(hat.n, a.hat, st.out)}${mouthR(mouth.n, a.mouth, st.out)}</g>
  </svg>`;
  return { id, species: speciesName, role: ROLES[speciesName], tier,
    traits: { eyes: eyes.n, hat: hat.n, mouth: mouth.n, aura: aura.n, sector: sector.tag }, svg };
}

/* fix gradient ids: simpler - regenerate defs per card with unique id */
function card(id, styleKey) {
  const st = STYLES[styleKey];
  const c = creatureStyled(id, styleKey);
  const gid = `g${styleKey}${id}`;
  const defs = st.defs.replace(/id="g[BCD]"/, `id="${gid}"`);
  const win = st.win().replace(/url\(#g[BCD]\)/, `url(#${gid})`);
  const svg = c.svg
    .replace(/<defs>[\s\S]*?<\/defs>/, `<defs>${defs}</defs>`)
    .replace(/fill="url\(#g[^)]*\)"/, `fill="url(#${gid})"`);
  return `<div class="cardB" style="--frame:${c.tier.frame}">
    <div class="artB">${svg}</div>
    <div class="metaB">
      <div class="rowB"><span class="nameB">${c.species} #${String(c.id).padStart(4, "0")}</span>
      <span class="chipB" style="background:${c.tier.chip}">${c.tier.name}</span></div>
      <div class="roleB">${c.role} · ${c.traits.sector}</div>
      <div class="traitsB">${[c.traits.eyes, c.traits.hat, c.traits.mouth, c.traits.aura].filter((t) => t !== "None").join(" · ")}</div>
    </div>
  </div>`;
}

const rowIds = [1, 2, 3, 4, 5];
const gridIds = Array.from({ length: 15 }, (_, i) => i + 6);

const html = `<title>Gen-0 Art Prototype</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { background:#0b3242; color:#eef7f4; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; padding:40px 24px 80px; }
  h1 { font-family:ui-rounded,"Arial Rounded MT Bold","Trebuchet MS",sans-serif; font-size:32px; font-weight:800; }
  h1 em { font-style:normal; color:#ffb020; }
  h2 { font-family:ui-rounded,"Arial Rounded MT Bold","Trebuchet MS",sans-serif; font-size:21px; font-weight:800; margin:38px 0 4px; }
  h2 .star { color:#ffb020; }
  .sub { color:#a8cbd6; margin:6px 0 4px; max-width:80ch; }
  .note { font-family:ui-monospace,Menlo,monospace; font-size:11.5px; color:#6f97a3; margin-bottom:8px; }
  .rowGrid { display:grid; grid-template-columns:repeat(auto-fill,minmax(180px,1fr)); gap:13px; max-width:1200px; margin-top:12px; }
  .cardB { background:#fdf8ec; border-radius:14px; padding:8px; border:3.5px solid var(--frame);
    box-shadow:0 6px 16px rgba(3,14,22,0.35); transition:transform .2s ease; color:#22303c; }
  .cardB:hover { transform:translateY(-5px) rotate(-0.5deg); }
  .artB svg { width:100%; height:auto; display:block; border-radius:8px; }
  .metaB { padding:7px 4px 3px; }
  .rowB { display:flex; align-items:center; justify-content:space-between; gap:6px; }
  .nameB { font-weight:800; font-size:12.5px; }
  .chipB { font-size:9px; font-weight:800; color:#fff; padding:2.5px 7px; border-radius:999px; letter-spacing:0.06em; text-transform:uppercase; }
  .roleB { font-size:10px; font-weight:700; color:#3d7a8a; letter-spacing:0.1em; text-transform:uppercase; margin-top:3px; }
  .traitsB { font-size:10.5px; color:#5d7180; margin-top:3px; line-height:1.45; }
</style>
<h1>Gen-0 Art: <em>Reef Arcade</em> and two new takes</h1>
<p class="sub">Same five creatures, same seeds and trait rolls in every row. After the 2026-08-14 evening pass: the turtle is the original website drawing, ported unchanged with its small eye (trait eyes scale down to match); the seahorse is redrawn from a real seahorse silhouette reference - crest, blunt snout, pectoral fins, belly plates and the signature spiral tail - with the mouth trait at the snout tip. Night Dive and Pastel Plush are the same system wearing different skins.</p>

<h2><span class="star">★</span> Style B - Reef Arcade (chosen, improved)</h2>
<div class="rowGrid">${rowIds.map((i) => card(i, "B")).join("")}</div>

<h2>Style C - Night Dive</h2>
<p class="note">Same creatures after dark: deep water, plankton lights, rarity-colored glow. Could be the game's night mode or a special-event skin.</p>
<div class="rowGrid">${rowIds.map((i) => card(i, "C")).join("")}</div>

<h2>Style D - Pastel Plush</h2>
<p class="note">Soft toy energy: pastel fills, gentle outlines, bigger blush. The most mainstream-cute of the three.</p>
<div class="rowGrid">${rowIds.map((i) => card(i, "D")).join("")}</div>

<h2>Reef Arcade collection preview</h2>
<div class="rowGrid">${gridIds.map((i) => card(i, "B")).join("")}</div>`;

writeFileSync(new URL("./artgen-preview.html", import.meta.url), html);
console.log("wrote 3-style comparison: B improved, C night, D pastel");
