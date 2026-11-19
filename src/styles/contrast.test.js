// Checks every text/background pair in tokens.css against WCAG 2 contrast:
// 4.5:1 for normal text, 3:1 for UI parts like the streak dots.
// Semi-transparent colors are blended over the surface they sit on.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('./tokens.css', import.meta.url), 'utf8');

function readBlock(selector) {
  const start = css.indexOf('{', css.indexOf(selector));
  const body = css.slice(start + 1, css.indexOf('}', start));
  return Object.fromEntries([...body.matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
}

const base = readBlock(':root {');

function resolve(vars, name) {
  let value = vars[name] ?? base[name];
  while (value?.startsWith('var(')) {
    const ref = value.slice(6, -1).trim();
    value = vars[ref] ?? base[ref];
  }
  if (!value) throw new Error(`Missing token --${name}`);
  return value;
}

function parseColor(value) {
  const hex = value.match(/^#([0-9a-f]{6})$/i);
  if (hex) return [0, 2, 4].map((i) => parseInt(hex[1].slice(i, i + 2), 16)).concat(1);
  const rgba = value.match(/^rgba?\(([^)]+)\)$/);
  if (rgba) {
    const [r, g, b, a = 1] = rgba[1].split(',').map(Number);
    return [r, g, b, a];
  }
  throw new Error(`Unsupported color: ${value}`);
}

const blend = ([r, g, b, a], [br, bg, bb]) => [r * a + br * (1 - a), g * a + bg * (1 - a), b * a + bb * (1 - a), 1];

function luminance([r, g, b]) {
  const lin = (c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

const ratio = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

// [foreground, background, what sits under the background, minimum ratio]
const PAIRS = [
  ['text', 'bg', null, 4.5],
  ['text', 'surface', null, 4.5],
  ['text', 'surface-2', null, 4.5],
  ['text-muted', 'bg', null, 4.5],
  ['text-muted', 'surface', null, 4.5],
  ['text-muted', 'surface-2', null, 4.5],
  ['on-primary', 'primary', null, 4.5],
  ['on-primary', 'primary-hover', null, 4.5],
  ['accent-text', 'bg', null, 4.5],
  ['accent-text', 'surface', null, 4.5],
  ['accent-text', 'surface-2', null, 4.5],
  ['danger-text', 'surface', null, 4.5],
  ['danger-text', 'surface-2', null, 4.5],
  ['badge-text', 'badge-bg', 'surface', 4.5],
  ['danger-text', 'badge-bg', 'surface', 4.5],
  ['accent', 'surface-2', null, 3],
  ['accent', 'surface', null, 3],
];

describe.each(['dark', 'light'])('%s theme contrast', (theme) => {
  const vars = readBlock(`:root[data-theme="${theme}"]`);
  const color = (name) => parseColor(resolve(vars, name));

  it.each(PAIRS)('%s on %s', (fg, bg, under, min) => {
    let background = color(bg);
    if (under) background = blend(background, color(under));
    const foreground = blend(color(fg), background);
    expect(ratio(foreground, background)).toBeGreaterThanOrEqual(min);
  });
});
