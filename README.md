# running-pace-calculator

Running pace calculator. Solve for **pace**, **finish time** or **distance**, in
km or miles, then get predicted times for every common race distance (1 km →
50 km) via Riegel's formula and an even-pace split table. All inputs in the URL
for sharing. Client-side only.

**Live:** https://running-pace-calculator.correia95.workers.dev/

## Stack

- React 18 + TypeScript + Vite, no runtime deps beyond React
- Static-assets Cloudflare Worker

## Engine

[`src/pace.ts`](src/pace.ts): everything stored in metres + seconds. `parseTime`
accepts `mm:ss`, `h:mm:ss` or bare seconds; `paceFromTimeDist` / `timeFromPaceDist`
/ `distFromPaceTime`; `speedKmh` / `speedMph`; `riegel` (t₂ = t₁·(d₂/d₁)^1.06) and
`predictAll`; `splits` for the even-pace table.

Verified in Node: 5 km / 25:00 → 5:00 /km, 8:03 /mi, 12.0 km/h; 5:00 /km ×
marathon → 3:30:59; Riegel 20:00 5 km → 41:42 10 km.

## Develop / deploy

```bash
npm install
npm run dev
npm run deploy
```
