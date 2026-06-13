/** Colores de marca Eyed (jerarquía compartida con Eyed.bio / EyedBot) */
export const EYED_BRAND = {
  gradientFrom: "#9B7BF7",
  gradientTo: "#6D28D9",
  gradientVia: "#7C4DFF",
  eye: "#FFFFFF",
  radiusRatio: 0.22,
} as const;

export const EYED_EYE_PATH = "M1 12s4-6.5 11-6.5 10 6.5 10 6.5-4 6.5-10 6.5S1 12 1 12Z";

/** Nube (estilo Lucide), compartida con favicon y logo */
export const EYED_CLOUD_PATH =
  "M18 10h-1.5A3.5 3.5 0 0 0 7 9a4 4 0 0 0-1.2 7.8A2.5 2.5 0 0 0 8.5 22H16a4 4 0 0 0 0-8z";

const ICON_VIEW = 24;

/** SVG estático del icono de app (favicon / apple-touch) */
export function eyedriveIconSvg(size = 512): string {
  const r = Math.round(size * EYED_BRAND.radiusRatio);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" role="img" aria-label="Eyedrive">
  <defs>
    <linearGradient id="g" x1="0.5" y1="0" x2="0.5" y2="1">
      <stop offset="0%" stop-color="${EYED_BRAND.gradientFrom}"/>
      <stop offset="55%" stop-color="${EYED_BRAND.gradientVia}"/>
      <stop offset="100%" stop-color="${EYED_BRAND.gradientTo}"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${r}" fill="url(#g)"/>
  <g transform="translate(${size / 2} ${size * 0.545}) scale(${size / ICON_VIEW * 0.39}) translate(-12 -12)" fill="${EYED_BRAND.eye}" fill-opacity="0.92" stroke="none">
    <path d="${EYED_CLOUD_PATH}"/>
  </g>
  <g transform="translate(${size / 2} ${size * 0.495}) scale(${size / ICON_VIEW * 0.31}) translate(-12 -12)" fill="none" stroke="${EYED_BRAND.eye}" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round">
    <path d="${EYED_EYE_PATH}"/>
    <circle cx="12" cy="12" r="2.75" fill="${EYED_BRAND.eye}" stroke="none"/>
  </g>
</svg>`;
}
