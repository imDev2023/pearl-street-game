# Pearl Street Art and Motion Direction

Decided 2026-08-14.

## Creatures: the reef, not crabs

Species is class.
Five founding species, each a "trading house" with a gameplay role:

| Species | Class | Role |
| --- | --- | --- |
| Octopus | Strategist | Versatile; reinforcement bonuses; flexible sector affinity; the brand mascot (monocle, gradient tentacles) |
| Shark | Raider | Looting attack bonuses, shorter loot cooldown |
| Turtle | Defender | Mining defense bonuses; nods to the real "Turtle Traders" story |
| Seahorse | Courier | Shorter voyages, narrower loot window |
| Pufferfish | Tank | Damage absorption, spike-back on attackers |

Crabs are deliberately not a launch species (avoids Crabada-clone optics); a rare crab may appear later as an Easter egg.

## Motion language

Micro-interactions everywhere; the pre-sale site (`website/index.html`) is the reference implementation:

- Canvas ocean background: depth gradient, rising bubbles, drifting light shafts, cursor glow.
- Scroll-triggered reveals with stagger; count-up stats; scroll progress bar.
- Magnetic buttons, 3D card tilt, species hover behaviors (shark lunges, puffer inflates, seahorse bobs).
- Hero: staggered line reveal, self-drawing chart, floating mascot with swaying tentacles.
- All motion respects `prefers-reduced-motion`, and content is never hidden if JS fails (`.js` class gate).

Production stack for `apps/web`: React + Framer Motion + GSAP + React Three Fiber.
The static site hand-rolls equivalents because the artifact sandbox blocks external libraries.

## Icons

Lucide (ISC license), inlined as an SVG sprite for CSP safety; 25 icons in use.
Custom SVG only for what no library has: the five species, the mascot, the vault diagram.

## Color schemes (candidate set, toggleable on the site)

| Scheme | Ground | Accent | Notes |
| --- | --- | --- | --- |
| Abyssal Neon (default) | #04121f -> #020a13 | #35e0a2 -> #38cfe6 gradient, gold #f0b64f | Flagship dark |
| Midnight Exchange | #070c17 | #46d885, gold #d9a441 | Fintech-serious dark |
| Lagoon Day | #eef6f3 | #0b8f77, gold #9c6f1d | Light mode |

All SVG art re-colors per scheme via attribute-to-token CSS mapping; keep new SVGs on the same palette hexes so the mapping keeps working.

## NFT art pipeline (decided 2026-08-14)

**Code-generated SVG trait system, stored fully on-chain, inspired by Nouns-style on-chain art.**
Prototype generator: `tools/artgen2.mjs` (proof sheet: `tools/artgen-preview.html`); `tools/artgen.mjs` is the outline-era prototype, superseded.
User taste rules (2026-08-14, learned the hard way): no oversized eyes on small-headed species; real-animal silhouettes beat invented blob-cute; the original website drawings are the quality bar; when a shape will not converge by tweaking, trace a reference instead.
The octopus is a closed decision: keep the current baseline (candidates reviewed and rejected 2026-08-14).
Species notes (2026-08-14): turtle is the original website drawing ported into the generator (small eye via the `eyeS` anchor scale); seahorse is traced from the user-supplied reference `seahorse-svgrepo-com.svg` (SVG Repo silhouette; verify its license before mainnet art freeze) restyled with Reef Arcade fill and outline; mouth anchors accept an optional third scale value.
Trait axes: species base (5) x body color tier (Biolume 55 / Lagoon 28 / Doubloon 12 / Coral 5) x eyes (5) x headgear (6) x mouth (4) x aura (4) x sector tag (5).
Deterministic from the commit-reveal seed; the on-chain renderer must reproduce the generator byte-for-byte.
ComfyUI/diffusion rejected for the collection (consistency, and this Intel/AMD Mac cannot run it usefully); cloud diffusion remains an option for marketing art only.
