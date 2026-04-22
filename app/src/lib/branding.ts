import type { BrandTheme, ColorPalette } from './types';

export const DEFAULT_THEME: BrandTheme = {
  primary: '#FFD700',
  secondary: '#1a1a1a',
  accent: '#FFFFFF',
  intensity: 'balanced',
};

export const PALETTES: ColorPalette[] = [
  {
    id: 'gmc-inspired',
    name: 'GMC',
    description: 'Bold red + dark charcoal',
    theme: { primary: '#C8102E', secondary: '#1C1C1C', accent: '#FFFFFF', intensity: 'bold' },
  },
  {
    id: 'chevrolet-inspired',
    name: 'Chevrolet',
    description: 'Classic gold on dark',
    theme: { primary: '#D4A017', secondary: '#111827', accent: '#FFFFFF', intensity: 'balanced' },
  },
  {
    id: 'ford-inspired',
    name: 'Ford',
    description: 'Clean blue + white',
    theme: { primary: '#003087', secondary: '#1C1C1C', accent: '#FFFFFF', intensity: 'balanced' },
  },
  {
    id: 'black-gold',
    name: 'Luxury',
    description: 'Black & gold — premium',
    theme: { primary: '#C9A84C', secondary: '#0A0A0A', accent: '#F5F5F5', intensity: 'subtle' },
  },
  {
    id: 'truck-yellow-charcoal',
    name: 'Truck Rugged',
    description: 'Yellow + dark charcoal',
    theme: { primary: '#F5C518', secondary: '#2D2D2D', accent: '#FFFFFF', intensity: 'bold' },
  },
  {
    id: 'classic-blue-white',
    name: 'Clean Blue',
    description: 'Professional & trustworthy',
    theme: { primary: '#2563EB', secondary: '#111827', accent: '#FFFFFF', intensity: 'balanced' },
  },
  {
    id: 'bold-red-black',
    name: 'Bold Red',
    description: 'High energy + sport',
    theme: { primary: '#DC2626', secondary: '#0F0F0F', accent: '#FFFFFF', intensity: 'bold' },
  },
  {
    id: 'warm-orange',
    name: 'Warm & Welcoming',
    description: 'Great for bilingual / community',
    theme: { primary: '#F97316', secondary: '#1C1917', accent: '#FFF7ED', intensity: 'balanced' },
  },
];

// ─── Contrast utilities (WCAG) ─────────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '').padEnd(6, '0');
  const num = parseInt(clean, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function relativeLuminance(r: number, g: number, b: number): number {
  return [r, g, b].reduce((sum, c, i) => {
    const s = c / 255;
    const linear = s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    return sum + linear * [0.2126, 0.7152, 0.0722][i];
  }, 0);
}

export function contrastRatio(hex1: string, hex2: string): number {
  const [r1, g1, b1] = hexToRgb(hex1);
  const [r2, g2, b2] = hexToRgb(hex2);
  const l1 = relativeLuminance(r1, g1, b1);
  const l2 = relativeLuminance(r2, g2, b2);
  const [light, dark] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (light + 0.05) / (dark + 0.05);
}

/** Returns black or white — whichever reads better on the given background. */
export function getTextOnColor(bgHex: string): '#000000' | '#ffffff' {
  const [r, g, b] = hexToRgb(bgHex);
  return relativeLuminance(r, g, b) > 0.179 ? '#000000' : '#ffffff';
}

/** Opacity modifier by intensity level. */
export function intensityOpacity(intensity: BrandTheme['intensity']): number {
  return { subtle: 0.72, balanced: 0.90, bold: 1.0 }[intensity];
}

/** Validates a hex string and returns it cleaned, or falls back to default. */
export function sanitizeHex(raw: string, fallback: string): string {
  const cleaned = raw.trim().replace(/^#?/, '#');
  return /^#[0-9A-Fa-f]{6}$/.test(cleaned) ? cleaned : fallback;
}
