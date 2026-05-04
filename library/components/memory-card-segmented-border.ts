/**
 * Builds open SVG paths along a rounded-rectangle border (clockwise from top-left flat),
 * so cloudy / sunny strokes meet with no dash-measurement gaps (unlike strokeDasharray).
 */

type LineSeg = {
  kind: 'L';
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  len: number;
};

type ArcSeg = {
  kind: 'A';
  cx: number;
  cy: number;
  r: number;
  th0: number;
  th1: number;
  len: number;
};

type BorderSeg = LineSeg | ArcSeg;

function linePoint(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  len: number,
  s: number,
): [number, number] {
  const t = len <= 0 ? 0 : s / len;
  return [x0 + (x1 - x0) * t, y0 + (y1 - y0) * t];
}

function arcPoint(
  cx: number,
  cy: number,
  r: number,
  th0: number,
  th1: number,
  len: number,
  s: number,
): [number, number] {
  const t = len <= 0 ? 0 : s / len;
  const th = th0 + (th1 - th0) * t;
  return [cx + r * Math.cos(th), cy + r * Math.sin(th)];
}

function buildSegs(w: number, h: number, r: number): BorderSeg[] {
  const arcLen = (Math.PI / 2) * r;
  return [
    { kind: 'L', x0: r, y0: 0, x1: w - r, y1: 0, len: w - 2 * r },
    {
      kind: 'A',
      cx: w - r,
      cy: r,
      r,
      th0: -Math.PI / 2,
      th1: 0,
      len: arcLen,
    },
    { kind: 'L', x0: w, y0: r, x1: w, y1: h - r, len: h - 2 * r },
    {
      kind: 'A',
      cx: w - r,
      cy: h - r,
      r,
      th0: 0,
      th1: Math.PI / 2,
      len: arcLen,
    },
    { kind: 'L', x0: w - r, y0: h, x1: r, y1: h, len: w - 2 * r },
    {
      kind: 'A',
      cx: r,
      cy: h - r,
      r,
      th0: Math.PI / 2,
      th1: Math.PI,
      len: arcLen,
    },
    { kind: 'L', x0: 0, y0: h - r, x1: 0, y1: r, len: h - 2 * r },
    {
      kind: 'A',
      cx: r,
      cy: r,
      r,
      th0: Math.PI,
      th1: (3 * Math.PI) / 2,
      len: arcLen,
    },
  ];
}

export function roundedRectBorderPerimeter(w: number, h: number, r: number): number {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  const straightSides = 2 * (w + h) - 8 * rr;
  const cornerArcs = 2 * Math.PI * rr;
  return straightSides + cornerArcs;
}

/**
 * @param d0 inclusive distance along border from start (r,0)
 * @param d1 exclusive upper bound (use perimeter for full loop end)
 */
export function roundedRectBorderSubpathD(
  w: number,
  h: number,
  r: number,
  d0: number,
  d1: number,
): string {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  const P = roundedRectBorderPerimeter(w, h, r);
  if (d1 <= d0 + 1e-9 || P <= 0) return '';

  const dStart = Math.max(0, Math.min(d0, P));
  const dEnd = Math.max(0, Math.min(d1, P));
  if (dEnd <= dStart + 1e-9) return '';

  const segs = buildSegs(w, h, rr);
  const parts: string[] = [];
  let lastX: number | null = null;
  let lastY: number | null = null;
  let acc = 0;
  const EPS = 1e-3;

  for (const seg of segs) {
    const segStart = acc;
    const segEnd = acc + seg.len;
    const a = Math.max(dStart, segStart);
    const b = Math.min(dEnd, segEnd);
    if (a >= b - 1e-9) {
      acc = segEnd;
      continue;
    }
    const localA = a - segStart;
    const localB = b - segStart;

    if (seg.kind === 'L') {
      const pa = linePoint(seg.x0, seg.y0, seg.x1, seg.y1, seg.len, localA);
      const pb = linePoint(seg.x0, seg.y0, seg.x1, seg.y1, seg.len, localB);
      if (lastX === null) {
        parts.push(`M ${pa[0]} ${pa[1]}`);
      } else if (
        Math.abs(pa[0] - lastX) > EPS ||
        Math.abs(pa[1] - lastY!) > EPS
      ) {
        parts.push(`L ${pa[0]} ${pa[1]}`);
      }
      parts.push(`L ${pb[0]} ${pb[1]}`);
      lastX = pb[0];
      lastY = pb[1];
    } else {
      const pa = arcPoint(
        seg.cx,
        seg.cy,
        seg.r,
        seg.th0,
        seg.th1,
        seg.len,
        localA,
      );
      const pb = arcPoint(
        seg.cx,
        seg.cy,
        seg.r,
        seg.th0,
        seg.th1,
        seg.len,
        localB,
      );
      if (lastX === null) {
        parts.push(`M ${pa[0]} ${pa[1]}`);
      } else if (
        Math.abs(pa[0] - lastX) > EPS ||
        Math.abs(pa[1] - lastY!) > EPS
      ) {
        parts.push(`L ${pa[0]} ${pa[1]}`);
      }
      parts.push(`A ${seg.r} ${seg.r} 0 0 1 ${pb[0]} ${pb[1]}`);
      lastX = pb[0];
      lastY = pb[1];
    }
    acc = segEnd;
  }

  return parts.join(' ');
}

/** Closed loop (no stroke gap where start meets end). */
export function roundedRectBorderClosedD(w: number, h: number, r: number): string {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  return [
    `M ${rr} 0`,
    `L ${w - rr} 0`,
    `A ${rr} ${rr} 0 0 1 ${w} ${rr}`,
    `L ${w} ${h - rr}`,
    `A ${rr} ${rr} 0 0 1 ${w - rr} ${h}`,
    `L ${rr} ${h}`,
    `A ${rr} ${rr} 0 0 1 0 ${h - rr}`,
    `L 0 ${rr}`,
    `A ${rr} ${rr} 0 0 1 ${rr} 0`,
    'Z',
  ].join(' ');
}
