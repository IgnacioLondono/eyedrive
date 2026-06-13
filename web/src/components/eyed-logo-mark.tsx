import { EYED_BRAND, EYED_EYE_PATH } from "@/lib/brand";
import { cn } from "@/lib/utils";

type Props = {
  size?: number;
  className?: string;
  /** id único para gradientes SVG cuando hay varios logos en pantalla */
  id?: string;
};

/** Logo estático: squircle morado + ojo blanco (estilo pestaña Eyed) */
export function EyedLogoMark({ size = 32, className, id = "eyed-grad" }: Props) {
  const r = Math.round(size * EYED_BRAND.radiusRatio);
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={cn("shrink-0", className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={id} x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor={EYED_BRAND.gradientFrom} />
          <stop offset="55%" stopColor={EYED_BRAND.gradientVia} />
          <stop offset="100%" stopColor={EYED_BRAND.gradientTo} />
        </linearGradient>
      </defs>
      <rect width={size} height={size} rx={r} fill={`url(#${id})`} />
      <g
        transform={`translate(${(size - 24) / 2}, ${(size - 24) / 2}) scale(${24 / 24})`}
        fill="none"
        stroke={EYED_BRAND.eye}
        strokeWidth="1.85"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d={EYED_EYE_PATH} />
        <circle cx="12" cy="12" r="2.75" fill={EYED_BRAND.eye} stroke="none" />
      </g>
    </svg>
  );
}
