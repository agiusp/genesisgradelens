// Speed-dial gauge: colored letter-grade bands, a needle at the grade as it stands,
// and arcs showing how far one upcoming assignment could move it down or up.

import type { District } from '../config/districts';
import { fmtPct } from './format';

interface Props {
  district: District;
  letter: (rounded: number) => string;
  /** Course grade before this assignment counts. */
  now: number | null;
  /** Course grade at the lowest and highest listed score. */
  worst: number | null;
  best: number | null;
  worstLabel: string;
  bestLabel: string;
  /** Course grade with the score typed into this assignment, if any. */
  whatIf: number | null;
}

const CX = 160;
const CY = 168;
const R_BAND = 128;
const R_RANGE = 86;
const R_NEEDLE = 112;

/** Letter groups (A, B, C, D, F) with their lowest whole-number grade, highest first. */
function bandGroups(district: District): { key: string; min: number }[] {
  const groups = new Map<string, number>();
  for (const [min, letter] of district.gradeScale) {
    const key = letter[0];
    groups.set(key, Math.min(groups.get(key) ?? Infinity, min));
  }
  return [...groups].map(([key, min]) => ({ key, min })).sort((a, b) => b.min - a.min);
}

export function GradeDial({ district, letter, now, worst, best, worstLabel, bestLabel, whatIf }: Props) {
  if (now == null && best == null) return null;
  const vals = [now, worst, best, whatIf].filter((v): v is number => v != null);
  let lo = Math.max(0, Math.floor((Math.min(...vals) - 6) / 5) * 5);
  const hi = Math.max(100, Math.ceil((Math.max(...vals) + 1) / 5) * 5);
  if (hi - lo < 20) lo = Math.max(0, hi - 20);

  const angle = (v: number) => Math.PI * (1 - Math.min(1, Math.max(0, (v - lo) / (hi - lo))));
  const pt = (r: number, v: number) => [CX + r * Math.cos(angle(v)), CY - r * Math.sin(angle(v))] as const;
  const arc = (r: number, v1: number, v2: number) => {
    const [x1, y1] = pt(r, v1);
    const [x2, y2] = pt(r, v2);
    return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 0 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
  };
  const gap = (hi - lo) * 0.005; // 2px-ish surface gap between bands

  const groups = bandGroups(district);
  const bands = groups
    .map((g, i) => {
      const top = i === 0 ? hi : groups[i - 1].min;
      return { key: g.key, from: Math.max(lo, g.min), to: Math.min(hi, top) };
    })
    .filter((b) => b.to > b.from);

  const needle = (v: number) => {
    const [x, y] = pt(R_NEEDLE, v);
    return { x, y };
  };
  const n = now != null ? needle(now) : null;
  const w = whatIf != null ? needle(whatIf) : null;

  const ticks = [lo, ...Array.from({ length: 9 }, (_, i) => lo + ((hi - lo) * (i + 1)) / 10).filter((t) => Number.isInteger(t)), hi];

  const nowLetter = now != null ? letter(Math.floor(now + 0.5)) : '';
  const summary =
    `Grade now ${fmtPct(now)} ${nowLetter}. ` +
    (worst != null && best != null ? `This assignment could move it from ${fmtPct(worst)} to ${fmtPct(best)}.` : '');

  return (
    <figure class="dial" aria-label={summary}>
      <svg viewBox="0 0 320 196" role="img" aria-label={summary}>
        {/* Letter-grade bands */}
        {bands.map((b) => (
          <g key={b.key}>
            <path
              d={arc(R_BAND, b.from + (b.from > lo ? gap : 0), b.to - (b.to < hi ? gap : 0))}
              class={`dial-band band-${b.key.toLowerCase()}`}
            >
              <title>
                {b.key} range: {b.from}–{b.to === hi && b.key === groups[0].key ? `${hi}+` : b.to}
              </title>
            </path>
            {(() => {
              const [x, y] = pt(R_BAND + 20, (b.from + b.to) / 2);
              return (
                <text x={x} y={y} class="dial-letter" text-anchor="middle" dominant-baseline="middle">
                  {b.key}
                </text>
              );
            })()}
          </g>
        ))}

        {/* Scale ticks */}
        {ticks.map((t) => {
          const [x1, y1] = pt(R_BAND - 12, t);
          const [x2, y2] = pt(R_BAND - 6, t);
          const [tx, ty] = pt(R_BAND - 22, t);
          return (
            <g key={t} class="dial-tick">
              <line x1={x1} y1={y1} x2={x2} y2={y2} />
              {(t === lo || t === hi || t % 10 === 0) && (
                <text x={tx} y={ty} text-anchor="middle" dominant-baseline="middle">
                  {t}
                </text>
              )}
            </g>
          );
        })}

        {/* Possible movement: decline arc (red) and improvement arc (green) */}
        {now != null && worst != null && worst < now - 0.01 && (
          <path d={arc(R_RANGE, worst, now)} class="dial-down">
            <title>Could drop to {fmtPct(worst)} ({worstLabel})</title>
          </path>
        )}
        {now != null && best != null && best > now + 0.01 && (
          <path d={arc(R_RANGE, now, best)} class="dial-up">
            <title>Could rise to {fmtPct(best)} ({bestLabel})</title>
          </path>
        )}
        {worst != null &&
          (() => {
            const [x, y] = pt(R_RANGE, worst);
            return <circle cx={x} cy={y} r={5} class="dial-end down" />;
          })()}
        {best != null &&
          (() => {
            const [x, y] = pt(R_RANGE, best);
            return <circle cx={x} cy={y} r={5} class="dial-end up" />;
          })()}

        {/* What-if needle (dashed), then the grade-now needle on top */}
        {w && <line x1={CX} y1={CY} x2={w.x} y2={w.y} class="dial-needle whatif" />}
        {n && <line x1={CX} y1={CY} x2={n.x} y2={n.y} class="dial-needle" />}
        <circle cx={CX} cy={CY} r={8} class="dial-hub" />
      </svg>

      <figcaption class="dial-caption">
        <div class="dial-now">
          <span class="muted small">Grade now</span>
          <span class="dial-value">
            {fmtPct(now)} <strong>{nowLetter}</strong>
          </span>
        </div>
        <div class="dial-legend small">
          {worst != null && (
            <span>
              <span class="swatch down" aria-hidden="true" /> ▼ worst {fmtPct(worst)} <strong>{letter(Math.floor(worst + 0.5))}</strong>{' '}
              <span class="muted">({worstLabel})</span>
            </span>
          )}
          {best != null && (
            <span>
              <span class="swatch up" aria-hidden="true" /> ▲ best {fmtPct(best)} <strong>{letter(Math.floor(best + 0.5))}</strong>{' '}
              <span class="muted">({bestLabel})</span>
            </span>
          )}
          {whatIf != null && (
            <span>
              <span class="swatch whatif" aria-hidden="true" /> your what-if {fmtPct(whatIf)}{' '}
              <strong>{letter(Math.floor(whatIf + 0.5))}</strong>
            </span>
          )}
        </div>
      </figcaption>
    </figure>
  );
}
