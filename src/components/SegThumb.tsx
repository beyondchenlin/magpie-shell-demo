import { useCallback, useLayoutEffect, useRef } from "react";

/** Magpie slide() thumb under the .on option — 280ms cubic-bezier(.2,.8,.2,1). */
const THUMB_MS = 280;
const THUMB_EASE = "cubic-bezier(.2, .8, .2, 1)";

export function useSegThumb(dep: string | null) {
  const boxRef = useRef<HTMLElement | null>(null);
  const prev = useRef<{ x: number; w: number } | null>(null);

  const setBox = useCallback((node: HTMLElement | null) => {
    boxRef.current = node;
  }, []);

  useLayoutEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    let th = box.querySelector(":scope > .thumb") as HTMLElement | null;
    if (!th) {
      th = document.createElement("span");
      th.className = "thumb";
      box.prepend(th);
    }
    const on = box.querySelector(":scope > .on") as HTMLElement | null;
    if (!on || !on.offsetWidth) {
      th.style.opacity = "0";
      prev.current = null;
      return;
    }
    th.style.opacity = "";
    const to = { x: on.offsetLeft, w: on.offsetWidth };
    const from = prev.current;
    for (const a of th.getAnimations()) if (a.id === "thumb") a.cancel();
    th.style.transform = `translateX(${to.x}px)`;
    th.style.width = `${to.w}px`;
    if (
      from &&
      (Math.abs(from.x - to.x) > 0.5 || Math.abs(from.w - to.w) > 0.5)
    ) {
      th.animate(
        [
          { transform: `translateX(${from.x}px)`, width: `${from.w}px` },
          { transform: `translateX(${to.x}px)`, width: `${to.w}px` },
        ],
        { duration: THUMB_MS, easing: THUMB_EASE, id: "thumb" },
      );
    }
    prev.current = to;
  }, [dep]);

  return setBox;
}
