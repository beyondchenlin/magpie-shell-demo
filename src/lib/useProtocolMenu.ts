import {useEffect, useLayoutEffect, type RefObject} from "react";
import {useAnchoredPopover} from "./useAnchoredPopover";
import {menuKeyNavigation, type PopoverPlacement} from "./popover";
import {menuHoverFocus, watchMenuScroll} from "./menuScroll";

/** Native protocol-menu behavior for specialized Library/settings contents. */
export function useProtocolMenu(
  ref: RefObject<HTMLDivElement | null>, anchor: RefObject<HTMLElement | null>, open: boolean,
  close: () => void, placement: PopoverPlacement = {},
) {
  useAnchoredPopover(ref, anchor, open, placement);
  useLayoutEffect(() => {
    if (!open) return;
    const box = ref.current;
    const first = box?.querySelector<HTMLElement>("input.sc-q") ||
      box?.querySelector<HTMLElement>(".pm-item.on") || box?.querySelector<HTMLElement>(".pm-item");
    first?.focus({preventScroll:true});
  }, [ref, anchor, open]);
  useEffect(() => {
    const box = ref.current;
    if (!open || !box) return;
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault(); event.stopPropagation(); close(); anchor.current?.focus({preventScroll:true});
      } else if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
        menuKeyNavigation(box, event);
      } else if (event.key === "Enter" && document.activeElement?.matches("input.sc-q")) {
        event.preventDefault(); box.querySelector<HTMLButtonElement>(".pm-item:not(:disabled)")?.click();
      }
    };
    const outside = (event: MouseEvent) => {
      if (!box.contains(event.target as Node) && !anchor.current?.contains(event.target as Node)) close();
    };
    const hover = (event: MouseEvent) => {
      const button = (event.target as Element).closest<HTMLButtonElement>(".pm-item");
      if (button && !button.contains(event.relatedTarget as Node)) menuHoverFocus(button, event);
    };
    document.addEventListener("keydown", key, true);
    document.addEventListener("mousedown", outside, true);
    box.addEventListener("mouseover", hover);
    const stop = watchMenuScroll(box, close);
    return () => {
      stop(); document.removeEventListener("keydown", key, true);
      document.removeEventListener("mousedown", outside, true); box.removeEventListener("mouseover", hover);
    };
  }, [ref, anchor, open, close]);
}
