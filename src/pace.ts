// Running pace / time / distance maths. All distances stored internally in metres,
// all durations in seconds. Pure functions, no dependencies.

export type Unit = 'km' | 'mi';
export const M_PER_KM = 1000;
export const M_PER_MI = 1609.344;

export const unitMetres = (u: Unit) => (u === 'km' ? M_PER_KM : M_PER_MI);

export interface RaceDist {
  name: string;
  metres: number;
}

export const RACES: RaceDist[] = [
  { name: '1 km', metres: 1000 },
  { name: '1 mile', metres: M_PER_MI },
  { name: '5 km', metres: 5000 },
  { name: '10 km', metres: 10000 },
  { name: '15 km', metres: 15000 },
  { name: '10 miles', metres: 10 * M_PER_MI },
  { name: 'Half marathon', metres: 21097.5 },
  { name: 'Marathon', metres: 42195 },
  { name: '50 km', metres: 50000 },
];

// ---- parsing / formatting time ----

// Accepts "mm:ss", "h:mm:ss", "90" (seconds), "9:30", "1:45:00".
export function parseTime(s: string): number | null {
  const t = s.trim();
  if (!t) return null;
  if (/^\d+(\.\d+)?$/.test(t)) return parseFloat(t);
  const parts = t.split(':').map((p) => p.trim());
  if (parts.some((p) => p === '' || !/^\d+(\.\d+)?$/.test(p))) return null;
  const nums = parts.map(Number);
  let sec = 0;
  for (const n of nums) sec = sec * 60 + n;
  return sec;
}

export function fmtDuration(totalSec: number, forceHours = false): string {
  if (!isFinite(totalSec) || totalSec < 0) return '–';
  const s = Math.round(totalSec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  if (h > 0 || forceHours) return `${h}:${pad(m)}:${pad(sec)}`;
  return `${m}:${pad(sec)}`;
}

// pace shown as m:ss per unit
export function fmtPace(secPerUnit: number, unit: Unit): string {
  return `${fmtDuration(secPerUnit)} /${unit}`;
}

// ---- core conversions ----

export function paceFromTimeDist(totalSec: number, metres: number, unit: Unit): number {
  if (metres <= 0) return 0;
  return totalSec / (metres / unitMetres(unit));
}

export function timeFromPaceDist(secPerUnit: number, metres: number, unit: Unit): number {
  return secPerUnit * (metres / unitMetres(unit));
}

export function speedKmh(totalSec: number, metres: number): number {
  if (totalSec <= 0) return 0;
  return metres / 1000 / (totalSec / 3600);
}

export function speedMph(totalSec: number, metres: number): number {
  if (totalSec <= 0) return 0;
  return metres / M_PER_MI / (totalSec / 3600);
}

// ---- race-time prediction (Peter Riegel, 1981): t2 = t1 * (d2/d1)^1.06 ----

export function riegel(knownSec: number, knownM: number, targetM: number, exp = 1.06): number {
  if (knownM <= 0) return 0;
  return knownSec * Math.pow(targetM / knownM, exp);
}

export interface Prediction {
  race: RaceDist;
  seconds: number;
  pace: number; // sec per unit
}

export function predictAll(knownSec: number, knownM: number, unit: Unit): Prediction[] {
  return RACES.map((race) => {
    const seconds = riegel(knownSec, knownM, race.metres);
    return { race, seconds, pace: paceFromTimeDist(seconds, race.metres, unit) };
  });
}

// ---- split table for a race at an even pace ----

export interface Split {
  label: string;
  cumMetres: number;
  cumSeconds: number;
}

export function splits(totalSec: number, metres: number, unit: Unit): Split[] {
  const step = unitMetres(unit);
  const out: Split[] = [];
  const perStep = totalSec / (metres / step);
  let d = step;
  let i = 1;
  while (d < metres - 1) {
    out.push({ label: `${i} ${unit}`, cumMetres: d, cumSeconds: perStep * i });
    d += step;
    i++;
  }
  out.push({
    label: `Finish (${(metres / step).toFixed(2)} ${unit})`,
    cumMetres: metres,
    cumSeconds: totalSec,
  });
  return out;
}

// distance from pace + time
export function distFromPaceTime(secPerUnit: number, totalSec: number, unit: Unit): number {
  if (secPerUnit <= 0) return 0;
  return (totalSec / secPerUnit) * unitMetres(unit);
}

export function metresToUnit(metres: number, unit: Unit): number {
  return metres / unitMetres(unit);
}
