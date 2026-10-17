import { useEffect, useLayoutEffect, useRef, type RefObject } from "react";
import { menuKeyNavigation } from "./popover";
import { useAnchoredPopover } from "./useAnchoredPopover";
import { menuHoverFocus, watchMenuScroll } from "./menuScroll";

/** openRowMenu: shared geometry, keyboard, hover, outside-scroll and cleanup. */
export function useRowMenu(ref: RefObject<HTMLElement | null>, anchor: HTMLElement, onClose: () => void) {
  const closeRef = useRef(onClose);
  useLayoutEffect(() => { closeRef.current = onClose; }, [onClose]);
  useAnchoredPopover(ref, anchor, true, { dx: -4 });
  useEffect(() => {
    const box = ref.current;
    if (!box) return;
    const close = () => closeRef.current();
    anchor.classList.add("open");
    const outside = (e: MouseEvent) => {
      if (!box.contains(e.target as Node) && !anchor.contains(e.target as Node)) close();
    };
    const keys = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault(); e.stopPropagation(); close(); anchor.focus({ preventScroll: true });
      } else if (e.key === "Tab") close();
      else if (e.key === "ArrowDown" || e.key === "ArrowUp") menuKeyNavigation(box, e);
    };
    const hover = (e: MouseEvent) => {
      const item = (e.target as Element).closest<HTMLButtonElement>("button.rm-item");
      if (!item || item.disabled || item.contains(e.relatedTarget as Node)) return;
      menuHoverFocus(item, e);
    };
    document.addEventListener("mousedown", outside, true);
    document.addEventListener("keydown", keys, true);
    const stopScroll = watchMenuScroll(box, close);
    box.addEventListener("mouseover", hover);
    box.querySelector<HTMLButtonElement>("button.rm-item:not(:disabled)")?.focus({ preventScroll: true });
    return () => {
      anchor.classList.remove("open");
      document.removeEventListener("mousedown", outside, true);
      document.removeEventListener("keydown", keys, true);
      stopScroll();
      box.removeEventListener("mouseover", hover);
    };
  }, [ref, anchor]);
}
