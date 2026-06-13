"use client";

import { useEffect, useId, useRef, useState } from "react";
import { EYED_BRAND, EYED_MARK } from "@/lib/brand";
import { cn } from "@/lib/utils";

type Props = {
  closeOnPassword?: boolean;
  className?: string;
  size?: number;
};

/** Logo animado: squircle morado + marca nube-ojo; pupila sigue al cursor */
export function EyeBrand({ closeOnPassword = false, className, size = 40 }: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const gradId = useId().replace(/:/g, "");
  const [closed, setClosed] = useState(false);
  const [blink, setBlink] = useState(false);
  const pupil = useRef({ x: 0, y: 0, tx: 0, ty: 0 });
  const raf = useRef(0);

  const r = Math.round(size * EYED_BRAND.radiusRatio);
  const markScale = (size / EYED_MARK.view) * EYED_MARK.scaleRatio;
  const squint = closed || blink;

  useEffect(() => {
    const onMove = (e: MouseEvent | TouchEvent) => {
      if (closed) return;
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const clientX = "touches" in e ? (e.touches[0]?.clientX ?? cx) : e.clientX;
      const clientY = "touches" in e ? (e.touches[0]?.clientY ?? cy) : e.clientY;
      const dx = clientX - cx;
      const dy = clientY - cy;
      const dist = Math.hypot(dx, dy);
      const scale = Math.min(dist * 0.04, 2.2);
      const angle = Math.atan2(dy, dx);
      pupil.current.tx = Math.cos(angle) * scale;
      pupil.current.ty = Math.sin(angle) * scale;
    };

    const tick = () => {
      const p = pupil.current;
      p.x += (p.tx - p.x) * 0.14;
      p.y += (p.ty - p.y) * 0.14;
      const g = ref.current?.querySelector("[data-pupil]") as SVGGElement | null;
      if (g) g.setAttribute("transform", `translate(${p.x.toFixed(2)}, ${p.y.toFixed(2)})`);
      raf.current = requestAnimationFrame(tick);
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: true });
    raf.current = requestAnimationFrame(tick);

    let blinkTimer: ReturnType<typeof setTimeout>;
    const scheduleBlink = () => {
      blinkTimer = setTimeout(() => {
        if (!closed) {
          setBlink(true);
          setTimeout(() => setBlink(false), 160);
        }
        scheduleBlink();
      }, 3200 + Math.random() * 4500);
    };
    scheduleBlink();

    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("touchmove", onMove);
      cancelAnimationFrame(raf.current);
      clearTimeout(blinkTimer);
    };
  }, [closed]);

  useEffect(() => {
    if (!closeOnPassword) return;
    const update = () => setClosed(!!document.querySelector("input[type='password']:focus"));
    document.querySelectorAll("input[type='password']").forEach((input) => {
      input.addEventListener("focus", update);
      input.addEventListener("blur", update);
    });
    return () => {
      document.querySelectorAll("input[type='password']").forEach((input) => {
        input.removeEventListener("focus", update);
        input.removeEventListener("blur", update);
      });
    };
  }, [closeOnPassword]);

  return (
    <span ref={ref} className={cn("inline-flex shrink-0", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <defs>
          <linearGradient id={gradId} x1="0.5" y1="0" x2="0.5" y2="1">
            <stop offset="0%" stopColor={EYED_BRAND.gradientFrom} />
            <stop offset="55%" stopColor={EYED_BRAND.gradientVia} />
            <stop offset="100%" stopColor={EYED_BRAND.gradientTo} />
          </linearGradient>
        </defs>
        <rect width={size} height={size} rx={r} fill={`url(#${gradId})`} />
        <g transform={`translate(${size / 2}, ${size * EYED_MARK.centerYRatio})`}>
          <g
            transform={`scale(${markScale}) translate(-${EYED_MARK.pivotX} -${EYED_MARK.pivotY}) scale(1, ${squint ? 0.12 : 1}) translate(${EYED_MARK.pivotX} ${EYED_MARK.pivotY})`}
          >
            <path
              d={EYED_MARK.outline}
              fill={EYED_BRAND.eye}
              fillOpacity={0.16}
              stroke={EYED_BRAND.eye}
              strokeWidth={1.25}
              strokeLinejoin="round"
            />
            <g data-pupil opacity={squint ? 0 : 1}>
              <circle
                cx={EYED_MARK.pupilX}
                cy={EYED_MARK.pupilY}
                r={EYED_MARK.pupilR}
                fill={EYED_BRAND.eye}
                stroke="none"
              />
            </g>
          </g>
        </g>
      </svg>
    </span>
  );
}
