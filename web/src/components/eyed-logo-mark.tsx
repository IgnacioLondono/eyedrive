import { EYED_BRAND, EYED_MARK } from "@/lib/brand";
import { cn } from "@/lib/utils";

type Props = {
  size?: number;
  className?: string;
  /** id único para gradientes SVG cuando hay varios logos en pantalla */
  id?: string;
};

/** Logo estático: squircle morado + marca nube-ojo integrada */
export function EyedLogoMark({ size = 32, className, id = "eyed-grad" }: Props) {
  const r = Math.round(size * EYED_BRAND.radiusRatio);
  const markScale = (size / EYED_MARK.view) * EYED_MARK.scaleRatio;

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
      <g transform={`translate(${size / 2}, ${size * EYED_MARK.centerYRatio})`}>
        <g transform={`scale(${markScale}) translate(-12 -12)`}>
          <path
            d={EYED_MARK.outline}
            fill={EYED_BRAND.eye}
            fillOpacity={0.16}
            stroke={EYED_BRAND.eye}
            strokeWidth={1.25}
            strokeLinejoin="round"
          />
          <circle
            cx={EYED_MARK.pupilX}
            cy={EYED_MARK.pupilY}
            r={EYED_MARK.pupilR}
            fill={EYED_BRAND.eye}
            stroke="none"
          />
        </g>
      </g>
    </svg>
  );
}
