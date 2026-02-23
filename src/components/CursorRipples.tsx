import { useEffect, useRef } from "react";

type CursorRipplesProps = {
  enabled?: boolean;
};

const RIPPLE_THROTTLE_MS = 60;

export default function CursorRipples({ enabled = true }: CursorRipplesProps) {
  const layerRef = useRef<HTMLDivElement | null>(null);
  const lastSpawnRef = useRef(0);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") {
      return;
    }

    const isReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isTouchDevice = window.matchMedia("(hover: none), (pointer: coarse)").matches;

    if (isReducedMotion || isTouchDevice) {
      return;
    }

    const spawnRipple = (event: MouseEvent) => {
      const now = performance.now();
      if (now - lastSpawnRef.current < RIPPLE_THROTTLE_MS) {
        return;
      }

      lastSpawnRef.current = now;

      const layer = layerRef.current;
      if (!layer) {
        return;
      }

      const ripple = document.createElement("span");
      ripple.className = "cursor-ripple";
      ripple.style.left = `${event.clientX}px`;
      ripple.style.top = `${event.clientY}px`;

      ripple.addEventListener("animationend", () => {
        ripple.remove();
      });

      layer.appendChild(ripple);
    };

    window.addEventListener("mousemove", spawnRipple, { passive: true });

    return () => {
      window.removeEventListener("mousemove", spawnRipple);
      if (layerRef.current) {
        layerRef.current.innerHTML = "";
      }
    };
  }, [enabled]);

  if (!enabled) {
    return null;
  }

  return <div ref={layerRef} className="cursor-ripple-layer" aria-hidden="true" />;
}
