/** Colores de marca Eyed (jerarquía compartida con Eyed.bio / EyedBot) */
export const EYED_BRAND = {
  gradientFrom: "#9B7BF7",
  gradientTo: "#6D28D9",
  gradientVia: "#7C4DFF",
  eye: "#FFFFFF",
  radiusRatio: 0.22,
} as const;

/** Ojo clásico Eyed (solo contorno), usado en UI secundaria */
export const EYED_EYE_PATH = "M1 12s4-6.5 11-6.5 10 6.5 10 6.5-4 6.5-10 6.5S1 12 1 12Z";

/**
 * Marca Eyedrive: un solo glifo donde el párpado superior
 * se convierte en lóbulos de nube y la base mantiene el ojo.
 */
export const EYED_MARK = {
  outline:
    "M2.4 12.6C2.4 10.2 3.8 8.2 5.9 7.1C6.7 5.9 7.9 4.9 9.3 4.4C10.4 3.6 11.2 3.2 12 3.2C12.8 3.2 13.6 3.6 14.7 4.4C16.1 4.9 17.3 5.9 18.1 7.1C20.2 8.2 21.6 10.2 21.6 12.6C21.6 14.4 20.5 16 18.9 16.7C18 18.3 16.2 19.2 14.2 19.5C13.2 19.75 12.8 19.85 12 19.85C11.2 19.85 10.8 19.75 9.8 19.5C7.8 19.2 6 18.3 5.1 16.7C3.5 16 2.4 14.4 2.4 12.6Z",
  pupilX: 12,
  pupilY: 12.9,
  pupilR: 2.55,
  pivotX: 12,
  pivotY: 12.6,
  view: 24,
  scaleRatio: 0.78,
  centerYRatio: 0.525,
} as const;

const ICON_VIEW = EYED_MARK.view;

/** SVG estático del icono de app (favicon / apple-touch) */
export function eyedriveIconSvg(size = 512): string {
  const r = Math.round(size * EYED_BRAND.radiusRatio);
  const markScale = (size / ICON_VIEW) * EYED_MARK.scaleRatio;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" role="img" aria-label="Eyedrive">
  <defs>
    <linearGradient id="g" x1="0.5" y1="0" x2="0.5" y2="1">
      <stop offset="0%" stop-color="${EYED_BRAND.gradientFrom}"/>
      <stop offset="55%" stop-color="${EYED_BRAND.gradientVia}"/>
      <stop offset="100%" stop-color="${EYED_BRAND.gradientTo}"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${r}" fill="url(#g)"/>
  <g transform="translate(${size / 2} ${size * EYED_MARK.centerYRatio}) scale(${markScale}) translate(-12 -12)">
    <path d="${EYED_MARK.outline}" fill="${EYED_BRAND.eye}" fill-opacity="0.16" stroke="${EYED_BRAND.eye}" stroke-width="1.25" stroke-linejoin="round"/>
    <circle cx="${EYED_MARK.pupilX}" cy="${EYED_MARK.pupilY}" r="${EYED_MARK.pupilR}" fill="${EYED_BRAND.eye}" stroke="none"/>
  </g>
</svg>`;
}
