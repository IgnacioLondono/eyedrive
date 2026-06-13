import { EYED_BRAND, EYED_EYE_PATH } from "@/lib/brand";
import { cn } from "@/lib/utils";

type Props = {
  size?: number;
  className?: string;
  /** id único para gradientes SVG cuando hay varios logos en pantalla */
  id?: string;
};

const EYE_VIEW = 24;

/** Logo estático: squircle morado + ojo blanco centrado */
export function EyedLogoMark({ size = 32, className, id = "eyed-grad" }: Props) {
  const r = Math.round(size * EYED_BRAND.radiusRatio);
  const eyeScale = (size * 0.55) / EYE_VIEW;
  const offset = (size - EYE_VIEW * eyeScale) / 2;

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
      <g transform={`translate(${offset}, ${offset}) scale(${eyeScale})`}>
        <path
          d={EYED_EYE_PATH}
          fill="none"
          stroke={EYED_BRAND.eye}
          strokeWidth="1.85"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="12" cy="12" r="2.75" fill={EYED_BRAND.eye} stroke="none" />
      </g>
    </svg>
  );
}
