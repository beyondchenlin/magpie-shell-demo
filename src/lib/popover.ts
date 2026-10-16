/** Magpie placeMenu/placePop in the coordinates of the preview's window. */
export function popoverHost() {
  return document.getElementById("root") || document.body;
}

export type PopoverPlacement = {
  recipe?: "menu" | "model" | "agent";
  requestedWidth?: number;
  align?: "left" | "right";
  dx?: number;
  gap?: number;
  preferUp?: boolean;
  maxHeight?: number;
  arrowMaxWidth?: number;
  arrowInset?: number;
};

/** Magpie openProtoMenu keyboard order; typing remains in the search box. */
export function menuKeyNavigation(box: HTMLElement, event: KeyboardEvent) {
  const items = [...box.querySelectorAll<HTMLButtonElement>("button[role^=menuitem]")]
    .filter(b => !b.disabled && !b.hidden && b.offsetParent);
  const index = items.indexOf(document.activeElement as HTMLButtonElement);
  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    event.preventDefault();
    event.stopPropagation();
    const from = index < 0 ? (event.key === "ArrowDown" ? items.length - 1 : 0) : index;
    items[(from + (event.key === "ArrowDown" ? 1 : items.length - 1)) % items.length]?.focus();
  } else if (index >= 0 && (event.key === "Home" || event.key === "End")) {
    event.preventDefault();
    items[event.key === "Home" ? 0 : items.length - 1]?.focus();
  } else if (event.key === "Enter" && document.activeElement?.matches("input.sc-q")) {
    event.preventDefault();
    items.find(b => !b.classList.contains("always"))?.click();
  }
}

export function placePopover(box: HTMLElement, anchor: HTMLElement, {
  recipe = "menu", requestedWidth, align = "left", dx = 0, gap = 5, preferUp = false, maxHeight, arrowMaxWidth = Infinity, arrowInset = 16,
}: PopoverPlacement = {}) {
  const host = popoverHost();
  const frame = host.getBoundingClientRect();
  const scale = host.offsetWidth ? frame.width / host.offsetWidth : 1;
  // clientLeft/clientTop round a subpixel border to an integer. Use the
  // rendered border width so browser/display scaling does not shift the anchor.
  const style = getComputedStyle(host);
  const originX = frame.left + (parseFloat(style.borderLeftWidth) || 0) * scale;
  const originY = frame.top + (parseFloat(style.borderTopWidth) || 0) * scale;
  const width = host.clientWidth, height = host.clientHeight;
  const r = anchor.getBoundingClientRect();
  const a = { left: (r.left - originX) / scale, right: (r.right - originX) / scale,
    top: (r.top - originY) / scale, bottom: (r.bottom - originY) / scale };
  const pad = 8;
  const caption = host.querySelector<HTMLElement>(".win-caption");
  const top = Math.max(pad, caption?.offsetHeight ? caption.offsetHeight + pad : pad);
  box.style.maxWidth = `${Math.max(0, width - pad * 2)}px`;
  if (requestedWidth != null) box.style.width = `${Math.min(requestedWidth, Math.max(0, width - pad * 2))}px`;
  if (recipe === "model") {
    // placePop uses the declared maximum, not placeMenu's natural list height.
    const h = Math.min(maxHeight ?? 340, Math.max(0, height - pad - top));
    const w = box.offsetWidth;
    const left = Math.max(pad, Math.min(a.left, width - w - pad));
    box.style.left = `${left}px`;
    box.style.setProperty("--ox", `${Math.max(16, Math.min(w - 16, a.left + (a.right - a.left) / 2 - left))}px`);
    const up = a.bottom + 5 + h > height - pad && a.top - 5 - h >= top;
    box.classList.toggle("up", up);
    if (up) {
      box.style.top = "auto";
      box.style.bottom = `${height - a.top + 5}px`;
      box.style.maxHeight = `${Math.min(h, a.top - 5 - top)}px`;
    } else {
      const y = a.bottom + 5 + h > height - pad ? Math.max(top, height - pad - h) : a.bottom + 5;
      box.style.top = `${y}px`;
      box.style.bottom = "auto";
      box.style.maxHeight = `${Math.min(h, height - pad - y)}px`;
    }
    return;
  }
  if (recipe === "agent") {
    box.style.maxHeight = "560px";
    const w = box.offsetWidth, below = Math.max(0, height - a.bottom - 8 - pad), above = Math.max(0, a.top - 8 - top);
    const want = Math.min(560, box.scrollHeight), up = want > below && above > below;
    const left = Math.max(pad, Math.min(a.left - 10, width - w - pad));
    box.style.left = `${left}px`;
    box.style.setProperty("--ox", `${Math.max(18, Math.min(w - 18, a.left + Math.min(a.right - a.left, 60) / 2 - left))}px`);
    box.classList.toggle("up", up);
    box.style.top = up ? "auto" : `${a.bottom + 8}px`;
    box.style.bottom = up ? `${height - a.top + 8}px` : "auto";
    box.style.maxHeight = `${Math.min(560, up ? above : below)}px`;
    return;
  }
  // Reset the previous clamp before measuring, so filtering cannot flip a
  // shortened menu to the wrong side of its anchor on the next observer tick.
  box.style.maxHeight = maxHeight == null ? "" : `${maxHeight}px`;
  if (box.offsetHeight > height - top - pad) box.style.maxHeight = `${Math.max(0, height - top - pad)}px`;
  const h = box.offsetHeight, w = box.offsetWidth;
  const below = Math.max(0, height - pad - a.bottom - gap);
  const above = Math.max(0, a.top - gap - top);
  const up = preferUp && above > 0 || h > below && above > below;
  const available = up ? above : below;
  if (h > available) box.style.maxHeight = `${available}px`;
  const actualHeight = box.offsetHeight;
  const left = Math.max(pad, Math.min((align === "right" ? a.right - w : a.left) + dx, width - w - pad));
  box.style.left = `${left}px`;
  box.style.top = `${Math.max(top, up ? a.top - gap - actualHeight : a.bottom + gap)}px`;
  box.style.bottom = "auto";
  box.style.setProperty("--ox", `${Math.max(arrowInset, Math.min(a.left + Math.min(a.right - a.left, arrowMaxWidth) / 2 - left, w - arrowInset))}px`);
  box.classList.toggle("up", up);
}
