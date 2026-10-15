# React Bits (vendored)

Source: https://reactbits.dev (registry `https://reactbits.dev/r/<Name>-TS-CSS.json`), pulled 2026-10-03; SpotlightCard, Stack, GlareHover, CircularText, CountUp, BorderGlow, TiltedCard, CardSwap and Lanyard pulled 2026-10-08.
Files are kept as upstream ships them so they can be re-pulled; brand styling lives in the wrappers in
`components/bits/` and in `app/reactbits-theme.css`, never in these files.

Local patches (search `VELVIQUE PATCH`):

| Component | Patch | Why |
| --- | --- | --- |
| ScrollReveal | cleanup kills only its own ScrollTriggers | upstream killed every trigger on the page |
| FlowingMenu | optional `onSelect`, optional `image` | client-side navigation keeps in-memory session (age gate, members session) |
| Masonry | optional `onItemClick` | lightbox instead of `window.open` |
| CardSwap | `.card` renamed `.card-swap-card` (css and tsx) | upstream's global `.card` restyled every other card on the site |

In use (wrapper in `components/bits/`, where it goes):

| Component | Wrapper | Where |
| --- | --- | --- |
| SplitText, BlurText, ScrollReveal | same names | timestamps, ledes |
| Noise | `Noise` | film grain over every route |
| ScrollVelocity | `ScrollVelocity` | caption-meme ticker |
| FlowingMenu | `FlowingMenu` | full-screen menu |
| Masonry | `Masonry` | flash archive |
| BorderGlow | `Edge` | the house card: doors, claim, store shelf, gate, rituals, subscribe, wholesale form |
| SpotlightCard | `Slab` | lit lists: perks, tasting notes, past nights, members-only details |
| TiltedCard | `Poster` | event posters, journal lead |
| CardSwap | `Swap` | wholesale pillars |
| Lanyard | `PassLanyard` | the membership pass (/miembros, /acceso) |
| Stack | `Prints` | flash prints on the home after table |
| GlareHover | `Flash` | camera flash over product and bottle photos |
| CircularText | `Seal` | stamps: certifications, tier, pass |
| CountUp | `Count` | bottles left |
| Magnet | `Pull` | the one blue action per screen |
| ShinyText | `Shiny` | waiting states (minting, loading, sending) |

Excluded on purpose (guide section 4 and the palette): Glitch Text, Decrypted Text, Letter Glitch, Faulty Terminal,
Hyperspeed, anything with scanlines; ChromaGrid (greyscale at rest), ProfileCard (holographic chrome), ScrollStack
(runs its own Lenis against SmoothScroll), DecayCard (one global SVG filter id), MagicBento (content hardcoded).
