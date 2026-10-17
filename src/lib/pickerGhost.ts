import { useCallback, useLayoutEffect, useRef, type RefObject } from "react";

/** Fixed source popGhost: only an inert likeness outlives the interactive picker. */
function popGhost(pop: HTMLElement) {
  if (pop.hidden || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const ghost = pop.cloneNode(true) as HTMLElement;
  ghost.removeAttribute("id");
  ghost.querySelectorAll("[id]").forEach(el => el.removeAttribute("id"));
  ghost.classList.add("leaving");
  ghost.setAttribute("aria-hidden", "true");
  ghost.inert = true;
  pop.after(ghost);
  const from = pop.querySelectorAll<HTMLElement>("*"), to = ghost.querySelectorAll<HTMLElement>("*");
  from.forEach((el, i) => {
    if (el.scrollTop) to[i].scrollTop = el.scrollTop;
    if (el instanceof HTMLInputElement) (to[i] as HTMLInputElement).value = el.value;
  });
  const done = () => ghost.remove();
  ghost.addEventListener("animationend", done, { once: true });
  window.setTimeout(done, 400);
}

export function usePickerDismiss(ref: RefObject<HTMLElement | null>, open: boolean, anchor: HTMLElement | null, onClose: () => void) {
  const closeRef = useRef(onClose), closed = useRef(false);
  useLayoutEffect(() => { closeRef.current = onClose; }, [onClose]);
  useLayoutEffect(() => {
    if (!open) return;
    closed.current = false;
    const node = ref.current;
    if (node) { node.hidden = false; node.inert = false; node.removeAttribute("aria-hidden"); }
    return () => {
      if (!closed.current && node?.isConnected) popGhost(node);
    };
  }, [open, anchor, ref]);
  return useCallback(() => {
    if (closed.current) return;
    closed.current = true;
    const node = ref.current;
    if (node?.isConnected) {
      popGhost(node);
      // End semantics and hit testing in the same native event, before React's
      // queued unmount, so the next input can reach another picker immediately.
      node.inert = true;
      node.setAttribute("aria-hidden", "true");
      node.hidden = true;
    }
    closeRef.current();
  }, [ref]);
}
