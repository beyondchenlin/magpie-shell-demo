import { useCallback, useEffect, useRef, type RefObject } from "react";

/**
 * Magpie brand bird — whole mark at rest; .logo.wag splits into body/tail/wing
 * (app.css wing-flap / tail-flick / bird-bob · .9s cubic-bezier(.3,0,.3,1)).
 * Routing rt-sky uses Magpie FLIER paths in RoutingView, not this mark.
 */
export function Bird({ size = 18 }: { size?: number }) {
  return (
    <svg viewBox="0 0 44 44" width={size} height={size} aria-hidden="true">
      <g className="bird">
        <use className="whole" href="#bird" />
        <g className="parts">
          <use href="#bird" clipPath="url(#bird-body)" />
          <g className="tail">
            <use href="#bird" clipPath="url(#bird-tail)" />
          </g>
          <g className="wing">
            <use href="#bird" clipPath="url(#bird-wing)" />
          </g>
        </g>
      </g>
    </svg>
  );
}

/** Magpie: flap on open (250ms) and brand hover; reduced-motion skips. */
export function useLogoWag(brandRef: RefObject<HTMLElement | null>) {
  const wagging = useRef(false);
  const wag = useCallback(() => {
    const logo = brandRef.current?.querySelector(".logo");
    if (!logo || wagging.current) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    wagging.current = true;
    logo.classList.add("wag");
    const tail = logo.querySelector(".tail");
    const done = () => {
      logo.classList.remove("wag");
      wagging.current = false;
      tail?.removeEventListener("animationend", done);
    };
    if (tail) tail.addEventListener("animationend", done);
    else setTimeout(done, 900);
  }, [brandRef]);

  useEffect(() => {
    const el = brandRef.current;
    if (!el) return;
    const t = window.setTimeout(wag, 250);
    el.addEventListener("mouseenter", wag);
    return () => {
      clearTimeout(t);
      el.removeEventListener("mouseenter", wag);
    };
  }, [brandRef, wag]);
}
