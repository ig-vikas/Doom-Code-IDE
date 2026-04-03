interface ParsedColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

function clampByte(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function clampUnit(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function parseHexColor(input: string): ParsedColor | null {
  const raw = input.trim().replace('#', '');
  if (![3, 4, 6, 8].includes(raw.length)) {
    return null;
  }

  const expanded = raw.length <= 4
    ? raw.split('').map((ch) => ch + ch).join('')
    : raw;

  const hasAlpha = expanded.length === 8;
  const r = Number.parseInt(expanded.slice(0, 2), 16);
  const g = Number.parseInt(expanded.slice(2, 4), 16);
  const b = Number.parseInt(expanded.slice(4, 6), 16);
  const a = hasAlpha ? Number.parseInt(expanded.slice(6, 8), 16) / 255 : 1;

  if ([r, g, b].some(Number.isNaN)) {
    return null;
  }

  return { r, g, b, a };
}

function parseRgbColor(input: string): ParsedColor | null {
  const match = input.trim().match(/^rgba?\((.+)\)$/i);
  if (!match) {
    return null;
  }

  const parts = match[1].split(',').map((part) => part.trim());
  if (parts.length < 3) {
    return null;
  }

  const r = Number.parseFloat(parts[0]);
  const g = Number.parseFloat(parts[1]);
  const b = Number.parseFloat(parts[2]);
  const a = parts.length >= 4 ? Number.parseFloat(parts[3]) : 1;

  if ([r, g, b, a].some(Number.isNaN)) {
    return null;
  }

  return {
    r: clampByte(r),
    g: clampByte(g),
    b: clampByte(b),
    a: clampUnit(a),
  };
}

export function parseColor(input: string): ParsedColor | null {
  return parseHexColor(input) ?? parseRgbColor(input);
}

export function serializeColor(color: ParsedColor): string {
  const alpha = clampUnit(color.a);
  if (alpha >= 0.999) {
    return `rgb(${clampByte(color.r)}, ${clampByte(color.g)}, ${clampByte(color.b)})`;
  }
  return `rgba(${clampByte(color.r)}, ${clampByte(color.g)}, ${clampByte(color.b)}, ${alpha.toFixed(3)})`;
}

export function interpolateColor(from: string, to: string, t: number): string {
  const start = parseColor(from);
  const end = parseColor(to);
  if (!start || !end) {
    return t < 0.5 ? from : to;
  }

  const clamped = clampUnit(t);
  return serializeColor({
    r: start.r + (end.r - start.r) * clamped,
    g: start.g + (end.g - start.g) * clamped,
    b: start.b + (end.b - start.b) * clamped,
    a: start.a + (end.a - start.a) * clamped,
  });
}

export function applyWarmTint(color: string, factor: number): string {
  const parsed = parseColor(color);
  if (!parsed) {
    return color;
  }

  return serializeColor({
    r: parsed.r + 3 * factor,
    g: parsed.g,
    b: parsed.b - 2 * factor,
    a: parsed.a,
  });
}

export function getWarmFactorForTime(date: Date): number {
  const minutes = date.getHours() * 60 + date.getMinutes();
  const dayStart = 6 * 60;
  const nightStart = 20 * 60;
  const blendWindow = 30;

  if (minutes >= dayStart - blendWindow && minutes < dayStart) {
    const progress = (minutes - (dayStart - blendWindow)) / blendWindow;
    return 1 - progress;
  }

  if (minutes >= nightStart - blendWindow && minutes < nightStart) {
    const progress = (minutes - (nightStart - blendWindow)) / blendWindow;
    return progress;
  }

  if (minutes >= dayStart && minutes < nightStart) {
    return 0;
  }

  return 1;
}
