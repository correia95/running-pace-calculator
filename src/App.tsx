import { useEffect, useMemo, useState } from 'react';
import {
  RACES,
  type Unit,
  distFromPaceTime,
  fmtDuration,
  metresToUnit,
  paceFromTimeDist,
  parseTime,
  predictAll,
  speedKmh,
  speedMph,
  splits,
  timeFromPaceDist,
  unitMetres,
} from './pace';

type Solve = 'pace' | 'time' | 'distance';

const PRESET_M: Record<string, number> = Object.fromEntries(RACES.map((r) => [r.name, r.metres]));

function readState() {
  try {
    const p = new URL(window.location.href).searchParams;
    return {
      solve: (p.get('for') as Solve) || 'pace',
      unit: (p.get('u') as Unit) || 'km',
      time: p.get('t') || '25:00',
      pace: p.get('p') || '5:00',
      distName: p.get('d') || '5 km',
      distCustom: p.get('dc') || '',
    };
  } catch {
    return { solve: 'pace' as Solve, unit: 'km' as Unit, time: '25:00', pace: '5:00', distName: '5 km', distCustom: '' };
  }
}

export default function App() {
  const init = readState();
  const [solve, setSolve] = useState<Solve>(init.solve);
  const [unit, setUnit] = useState<Unit>(init.unit);
  const [timeStr, setTimeStr] = useState(init.time);
  const [paceStr, setPaceStr] = useState(init.pace);
  const [distName, setDistName] = useState(init.distName);
  const [distCustom, setDistCustom] = useState(init.distCustom);

  const metres = useMemo(() => {
    if (distName === 'custom') {
      const v = parseFloat(distCustom);
      return isFinite(v) && v > 0 ? v * unitMetres(unit) : 0;
    }
    return PRESET_M[distName] ?? 5000;
  }, [distName, distCustom, unit]);

  const timeSec = parseTime(timeStr);
  const paceSec = parseTime(paceStr);

  useEffect(() => {
    try {
      const u = new URL(window.location.href);
      const q = u.searchParams;
      q.set('for', solve);
      q.set('u', unit);
      q.set('t', timeStr);
      q.set('p', paceStr);
      q.set('d', distName);
      if (distName === 'custom') q.set('dc', distCustom);
      else q.delete('dc');
      window.history.replaceState(null, '', u.toString());
    } catch {
      /* ignore */
    }
  }, [solve, unit, timeStr, paceStr, distName, distCustom]);

  // compute the answer
  let answerTimeSec = timeSec ?? 0;
  let answerPaceSec = paceSec ?? 0;
  let answerMetres = metres;

  if (solve === 'pace' && timeSec && metres > 0) {
    answerPaceSec = paceFromTimeDist(timeSec, metres, unit);
  } else if (solve === 'time' && paceSec && metres > 0) {
    answerTimeSec = timeFromPaceDist(paceSec, metres, unit);
  } else if (solve === 'distance' && paceSec && timeSec) {
    answerMetres = distFromPaceTime(paceSec, timeSec, unit);
  }

  const ready =
    (solve === 'pace' && !!timeSec && metres > 0) ||
    (solve === 'time' && !!paceSec && metres > 0) ||
    (solve === 'distance' && !!paceSec && !!timeSec);

  const predictions = useMemo(
    () => (ready && answerTimeSec > 0 && answerMetres > 0 ? predictAll(answerTimeSec, answerMetres, unit) : []),
    [ready, answerTimeSec, answerMetres, unit],
  );
  const splitRows = useMemo(
    () => (ready && answerTimeSec > 0 && answerMetres > 0 && answerMetres <= 100000 ? splits(answerTimeSec, answerMetres, unit) : []),
    [ready, answerTimeSec, answerMetres, unit],
  );

  const [copied, setCopied] = useState(false);
  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  const otherUnit: Unit = unit === 'km' ? 'mi' : 'km';

  return (
    <div className="app">
      <header>
        <h1>Running Pace Calculator</h1>
        <p className="tag">
          Work out your pace, a finish time, or how far you went — then get predicted times for every
          common race distance and an even-pace split table. Kilometres or miles, all in your
          browser.
        </p>
      </header>

      <div className="toolbar">
        <div className="seg" role="tablist" aria-label="What to calculate">
          {(['pace', 'time', 'distance'] as Solve[]).map((s) => (
            <button key={s} role="tab" aria-selected={solve === s} className={solve === s ? 'on' : ''} onClick={() => setSolve(s)}>
              {s === 'pace' ? 'Pace' : s === 'time' ? 'Finish time' : 'Distance'}
            </button>
          ))}
        </div>
        <div className="seg units">
          {(['km', 'mi'] as Unit[]).map((u) => (
            <button key={u} className={unit === u ? 'on' : ''} onClick={() => setUnit(u)}>
              {u === 'km' ? 'km' : 'miles'}
            </button>
          ))}
        </div>
      </div>

      <div className="inputs">
        {solve !== 'time' && (
          <label className="fld">
            <span>Time {solve === 'distance' ? '(how long you ran)' : ''}</span>
            <input
              value={timeStr}
              onChange={(e) => setTimeStr(e.target.value)}
              placeholder="mm:ss or h:mm:ss"
              inputMode="numeric"
            />
          </label>
        )}
        {solve !== 'pace' && (
          <label className="fld">
            <span>Pace (per {unit})</span>
            <input
              value={paceStr}
              onChange={(e) => setPaceStr(e.target.value)}
              placeholder="m:ss"
              inputMode="numeric"
            />
          </label>
        )}
        {solve !== 'distance' && (
          <label className="fld">
            <span>Distance</span>
            <select value={distName} onChange={(e) => setDistName(e.target.value)}>
              {RACES.map((r) => (
                <option key={r.name} value={r.name}>
                  {r.name}
                </option>
              ))}
              <option value="custom">Custom…</option>
            </select>
          </label>
        )}
        {solve !== 'distance' && distName === 'custom' && (
          <label className="fld">
            <span>Custom distance ({unit})</span>
            <input
              value={distCustom}
              onChange={(e) => setDistCustom(e.target.value)}
              placeholder={unit === 'km' ? 'e.g. 7.5' : 'e.g. 4.6'}
              inputMode="decimal"
            />
          </label>
        )}
      </div>

      {ready ? (
        <div className="answer">
          {solve === 'pace' && (
            <>
              <div className="big">
                <strong>{fmtDuration(answerPaceSec)}</strong>
                <span>per {unit}</span>
              </div>
              <p className="sub">
                {fmtDuration(paceFromTimeDist(answerTimeSec, answerMetres, otherUnit))} per {otherUnit} ·{' '}
                {speedKmh(answerTimeSec, answerMetres).toFixed(2)} km/h ·{' '}
                {speedMph(answerTimeSec, answerMetres).toFixed(2)} mph
              </p>
            </>
          )}
          {solve === 'time' && (
            <>
              <div className="big">
                <strong>{fmtDuration(answerTimeSec, true)}</strong>
                <span>
                  for {distName === 'custom' ? `${distCustom} ${unit}` : distName}
                </span>
              </div>
              <p className="sub">
                at {fmtDuration(answerPaceSec)} /{unit} ·{' '}
                {speedKmh(answerTimeSec, answerMetres).toFixed(2)} km/h
              </p>
            </>
          )}
          {solve === 'distance' && (
            <>
              <div className="big">
                <strong>{metresToUnit(answerMetres, unit).toFixed(2)}</strong>
                <span>{unit === 'km' ? 'kilometres' : 'miles'}</span>
              </div>
              <p className="sub">
                {metresToUnit(answerMetres, otherUnit).toFixed(2)} {otherUnit} ·{' '}
                {(answerMetres).toLocaleString()} m
              </p>
            </>
          )}
          <button className="share" onClick={share}>
            {copied ? 'Link copied' : 'Copy shareable link'}
          </button>
        </div>
      ) : (
        <p className="hint">Enter the values above to see the result.</p>
      )}

      {predictions.length > 0 && (
        <>
          <h2>Predicted race times</h2>
          <p className="method">
            From your effort using Riegel's formula. Treat shorter distances as more reliable —
            marathon predictions from a 5&nbsp;km time tend to run optimistic unless you have the
            endurance base.
          </p>
          <div className="tablewrap">
            <table className="pred">
              <thead>
                <tr><th>Distance</th><th>Time</th><th>Pace /{unit}</th></tr>
              </thead>
              <tbody>
                {predictions.map((p) => (
                  <tr key={p.race.name} className={Math.abs(p.race.metres - answerMetres) < 1 ? 'self' : ''}>
                    <td>{p.race.name}</td>
                    <td>{fmtDuration(p.seconds, true)}</td>
                    <td>{fmtDuration(p.pace)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {splitRows.length > 1 && (
        <>
          <h2>Even-pace splits</h2>
          <div className="tablewrap">
            <table className="pred">
              <thead>
                <tr><th>Point</th><th>Elapsed</th></tr>
              </thead>
              <tbody>
                {splitRows.map((s) => (
                  <tr key={s.label}>
                    <td>{s.label}</td>
                    <td>{fmtDuration(s.cumSeconds, true)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <section className="explainer">
        <h2>How pace is calculated</h2>
        <p>
          Pace is simply time divided by distance. A 25-minute 5&nbsp;km is 1,500 seconds over
          5&nbsp;km, which is 300 seconds — five minutes — per kilometre. To go the other way,
          multiply your pace by the distance: 5:00 per km over the 42.195&nbsp;km of a marathon is
          about 3 hours 31 minutes.
        </p>
        <h3>Pace, speed and the two units</h3>
        <p>
          Runners usually think in <em>pace</em> (minutes per km or per mile); treadmills and cyclists
          use <em>speed</em> (km/h or mph). They are reciprocals: 5:00 per km is 12.0 km/h; 6:00 per
          km is 10.0 km/h. One mile is 1.609 km, so a per-mile pace is always a larger number than the
          same effort per km.
        </p>
        <h3>Predicting race times</h3>
        <p>
          The predictions use the formula published by Peter Riegel in 1981: predicted time equals
          your known time multiplied by the ratio of the distances raised to the power 1.06. It is a
          good rule of thumb between roughly 1,500&nbsp;m and the half marathon. Beyond that, fuelling,
          heat and how many long runs you have done matter more than the maths, so the marathon figure
          is best read as "what you are capable of if the endurance is there".
        </p>
        <h3>Using the split table</h3>
        <p>
          The split table shows the elapsed time you should hit at each kilometre or mile if you run
          the whole thing at an even pace. Even or slightly negative splits — the second half as fast
          or faster than the first — almost always produce a better finish time than starting quick
          and fading.
        </p>
        <h3>Is anything uploaded?</h3>
        <p>
          No. Every calculation runs in your browser. Your inputs are stored only in the page link,
          which is what the "copy shareable link" button gives you.
        </p>
        <footer>Running Pace Calculator · pace, time, distance, race predictions · no sign-up</footer>
      </section>
    </div>
  );
}
