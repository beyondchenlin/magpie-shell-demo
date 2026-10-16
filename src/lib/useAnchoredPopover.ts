import { useLayoutEffect, type RefObject } from "react";
import { placePopover, popoverHost, type PopoverPlacement } from "./popover";

export function useAnchoredPopover(
  ref: RefObject<HTMLElement | null>, anchor: HTMLElement | null | RefObject<HTMLElement | null>, shown: boolean,
  { recipe = "menu", requestedWidth, align = "left", dx = 0, gap = 5, preferUp = false, maxHeight, arrowMaxWidth, arrowInset }: PopoverPlacement = {},
) {
  useLayoutEffect(() => {
    const box = ref.current;
    const target = anchor && "current" in anchor ? anchor.current : anchor;
    if (!shown || !box || !target) return;
    const place = () => placePopover(box, target, { recipe, requestedWidth, align, dx, gap, preferUp, maxHeight, arrowMaxWidth, arrowInset });
    place();
    const ro = new ResizeObserver(place);
    ro.observe(box);
    ro.observe(target);
    ro.observe(popoverHost());
    window.addEventListener("resize", place);
    document.addEventListener("scroll", place, true);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", place);
      document.removeEventListener("scroll", place, true);
    };
  }, [ref, anchor, shown, recipe, requestedWidth, align, dx, gap, preferUp, maxHeight, arrowMaxWidth, arrowInset]);
}
