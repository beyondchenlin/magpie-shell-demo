import { createContext, useCallback, useContext, useLayoutEffect, useRef } from "react";

/**
 * Magpie slide() thumb under the .on option — app.js ~8168–8267.
 * THUMB_MS 280 / THUMB_EASE cubic-bezier(.2,.8,.2,1) (app.js 8185).
 * Magpie does not calm()-skip WAAPI; CSS prefers-reduced-motion zeros
 * transitions (app.css ~3305–3308) including html.theming — not WAAPI.
 */
const THUMB_MS = 280;
const THUMB_EASE = "cubic-bezier(.2, .8, .2, 1)";

/** The formal product opts in; the pinned CIS reference keeps its original behavior. */
export const RespectReducedMotion = createContext(false);

type ThumbPos = { x: number; w: number; y?: number; h?: number };

function thumbTo(box: HTMLElement, on: HTMLElement): ThumbPos | null {
  if (!on.offsetParent || !on.offsetWidth) return null;
  const to: ThumbPos = { x: on.offsetLeft, w: on.offsetWidth };
  // Magpie thumbTo: wrap (base-apis) — row of the pick, not the strip
  if (box.clientHeight > on.offsetHeight + 8) {
    to.y = on.offsetTop - 2;
    to.h = on.offsetHeight;
  }
  return to;
}

function thumbAt(p: ThumbPos): { transform: string; width: string; height?: string } {
  return {
    transform: p.y != null ? `translate(${p.x}px, ${p.y}px)` : `translateX(${p.x}px)`,
    width: `${p.w}px`,
    ...(p.h != null ? { height: `${p.h}px` } : {}),
  };
}

function thumbSame(a: ThumbPos, b: ThumbPos) {
  return (
    Math.abs(a.x - b.x) < 0.5 &&
    Math.abs((a.y || 0) - (b.y || 0)) < 0.5 &&
    Math.abs(a.w - b.w) < 0.5 &&
    // React retains the strip across desktop/phone reflow. Its selected
    // first-row option can keep x/y/width while the thumb needs a row height.
    Math.abs((a.h || 0) - (b.h || 0)) < 0.5
  );
}

/** Magpie thumbNow — mid-glide from computed style (app.js ~8216–8221). */
function thumbNow(th: HTMLElement): ThumbPos | null {
  if (!th.style.width || !th.isConnected) return null;
  const cs = getComputedStyle(th);
  const m = new DOMMatrixReadOnly(cs.transform === "none" ? undefined : cs.transform);
  return {
    x: m.m41,
    y: m.m42,
    w: parseFloat(cs.width),
    h: th.style.height ? parseFloat(th.style.height) : 0,
  };
}

function thumbPut(th: HTMLElement, p: ThumbPos) {
  for (const a of th.getAnimations()) if (a.id === "thumb") a.cancel();
  th.classList.add("still");
  Object.assign(th.style, thumbAt(p), { height: p.h != null ? `${p.h}px` : "" });
  void th.offsetWidth;
  th.classList.remove("still");
}

function thumbGlide(th: HTMLElement) {
  return th.getAnimations().find((a) => a.id === "thumb" && a.playState === "running");
}

export function useSegThumb(dep: string | null) {
  const respectReducedMotion = useContext(RespectReducedMotion);
  const boxRef = useRef<HTMLElement | null>(null);
  const lastTo = useRef<ThumbPos | null>(null);

  const setBox = useCallback((node: HTMLElement | null) => {
    if (boxRef.current !== node) lastTo.current = null;
    boxRef.current = node;
  }, []);

  const place = useCallback((animate: boolean) => {
    const box = boxRef.current;
    if (!box) return;
    let th = box.querySelector(":scope > .thumb") as HTMLElement | null;
    if (!th) {
      th = document.createElement("span");
      th.className = "thumb";
      box.prepend(th);
    }
    const on = box.querySelector(":scope > .on") as HTMLElement | null;
    if (!on) {
      th.style.opacity = "0";
      lastTo.current = null;
      return;
    }
    th.style.opacity = "";
    const to = thumbTo(box, on);
    if (!to) return;
    // CSS cannot stop a WAAPI glide. Snap an existing glide as well as skipping
    // new ones, including when the system preference changes mid-animation.
    if (respectReducedMotion && matchMedia("(prefers-reduced-motion: reduce)").matches) {
      thumbPut(th, to);
      lastTo.current = to;
      return;
    }
    const last = lastTo.current;
    // Magpie: already there, or on its way there — skip
    if (
      last &&
      thumbSame(last, to) &&
      (thumbGlide(th) || (th.style.width && (() => {
        const now = thumbNow(th);
        return now && thumbSame(now, to);
      })()))
    ) {
      lastTo.current = to;
      return;
    }
    const from = animate && last ? thumbNow(th) : null;
    thumbPut(th, to);
    lastTo.current = to;
    if (!animate || !from || thumbSame(from, to)) return;
    const f = thumbAt(from);
    const t = thumbAt(to);
    if (from.h && to.h) {
      f.height = `${from.h}px`;
      t.height = `${to.h}px`;
    }
    th.animate([f, t], { duration: THUMB_MS, easing: THUMB_EASE, id: "thumb" });
  }, [respectReducedMotion]);

  useLayoutEffect(() => {
    if (!respectReducedMotion) return;
    const query = matchMedia("(prefers-reduced-motion: reduce)");
    const change = () => place(false);
    query.addEventListener("change", change);
    return () => query.removeEventListener("change", change);
  }, [respectReducedMotion, place]);

  useLayoutEffect(() => {
    place(true);
    const box = boxRef.current;
    if (!box || typeof ResizeObserver === "undefined") return;
    // Magpie thumbFit ResizeObserver (app.js ~8227–8239): still put on resize/font
    const ro = new ResizeObserver(() => place(false));
    ro.observe(box);
    // Its siblings can move the selected option without resizing the strip.
    for (const option of box.children) if (!option.classList.contains("thumb")) ro.observe(option);
    let mounted = true;
    document.fonts?.ready.then(() => { if (mounted) place(false); });
    return () => { mounted = false; ro.disconnect(); };
  }, [dep, place]);

  return setBox;
}
