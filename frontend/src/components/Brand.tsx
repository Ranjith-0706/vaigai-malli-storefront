/** Original brand motifs (inline SVG): jasmine, thodarkodi garland, ornament divider. */

export function Jasmine({ size = 28, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="-20 -20 40 40" aria-hidden="true" className={className}>
      {[0, 72, 144, 216, 288].map((a) => (
        <ellipse key={a} cx="0" cy="-9" rx="5.2" ry="10" transform={`rotate(${a})`} fill="#fffaf0" stroke="#c9b78f" strokeWidth="0.8" />
      ))}
      <circle r="3.4" fill="#b48a2f" />
      <circle r="1.4" fill="#651021" />
    </svg>
  );
}

export function LogoMark({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <path d="M6 46V22C6 11 14 3 24 3s18 8 18 19v24z" fill="#651021" />
      <path d="M11 46V23C11 14 17 8 24 8s13 6 13 15v23z" fill="none" stroke="#b48a2f" strokeWidth="1.2" />
      <g transform="translate(24 26)">
        {[0, 72, 144, 216, 288].map((a) => (
          <ellipse key={a} cx="0" cy="-6.4" rx="3.4" ry="6.6" transform={`rotate(${a})`} fill="#fbf6ea" />
        ))}
        <circle r="2.4" fill="#b48a2f" />
      </g>
    </svg>
  );
}

/** A hanging thodarkodi (jasmine garland) strand. Decorative only. */
export function Garland({ className = "", width = 520 }: { className?: string; width?: number }) {
  const blooms = 11;
  const pts = Array.from({ length: blooms }, (_, i) => {
    const t = i / (blooms - 1);
    const x = 20 + t * (width - 40);
    const y = 18 + Math.sin(t * Math.PI) * 34;
    return { x, y, r: 7 + (i % 3) * 1.4 };
  });
  const d = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${width} 92`} className={className} aria-hidden="true" preserveAspectRatio="xMidYMin meet">
      <path d={d} fill="none" stroke="#2c5a3a" strokeWidth="2" strokeLinecap="round" />
      {pts.map((p, i) => (
        <g key={i} transform={`translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`}>
          {[0, 72, 144, 216, 288].map((a) => (
            <ellipse key={a} cx="0" cy={-p.r * 0.55} rx={p.r * 0.34} ry={p.r * 0.62} transform={`rotate(${a + i * 11})`} fill="#fffaf0" stroke="#c9b78f" strokeWidth="0.7" />
          ))}
          <circle r={p.r * 0.22} fill="#b48a2f" />
          {i % 2 === 0 && <ellipse cx="0" cy={p.r + 8} rx="2.4" ry="6" fill="#2c5a3a" />}
        </g>
      ))}
    </svg>
  );
}

export function OrnamentDivider({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center gap-3 text-gold ${className}`} aria-hidden="true">
      <span className="h-px w-12 bg-gold/60" />
      <svg width="16" height="16" viewBox="-8 -8 16 16">
        <path d="M0-7L7 0 0 7-7 0z" fill="none" stroke="currentColor" strokeWidth="1.3" />
        <circle r="1.8" fill="currentColor" />
      </svg>
      <span className="h-px w-12 bg-gold/60" />
    </div>
  );
}

export function DemoPill({ children = "Demo data" }: { children?: React.ReactNode }) {
  return (
    <span className="inline-block rounded-full border border-gold-ink/40 bg-parchment px-2.5 py-0.5 text-[0.7rem] font-semibold uppercase tracking-wider text-gold-ink">
      {children}
    </span>
  );
}
