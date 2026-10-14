/**
 * Magpie app.js dragRows — measure once, sibling translateY slide, commit on release.
 * Sibling transition: .22s cubic-bezier(.22, 1, .36, 1) via list.sorting CSS.
 */
export type DragRowsOpts = {
  handle: HTMLElement;
  row: HTMLElement;
  list: HTMLElement;
  rows: HTMLElement[];
  pointerId: number;
  clientY: number;
  onStart?: () => void;
  onCommit: (to: number) => void;
  onIdle?: () => void;
};

export function dragRows(e: Pick<PointerEvent, "button" | "isPrimary">, opts: DragRowsOpts): boolean {
  const { handle, row, list, rows, pointerId, onStart, onCommit, onIdle } = opts;
  if (e.button !== 0 || e.isPrimary === false || rows.length < 2) return false;
  const from = rows.indexOf(row);
  if (from < 0) return false;

  const rects = rows.map((r) => r.getBoundingClientRect());
  const tops = rects.map((r) => r.top);
  const heights = rects.map((r) => r.height);
  const h = heights[from]!;
  let scroll: HTMLElement | Element | null = list.parentElement;
  while (scroll && scroll instanceof HTMLElement && !/(auto|scroll)/.test(getComputedStyle(scroll).overflowY)) {
    scroll = scroll.parentElement;
  }
  scroll ||= document.scrollingElement;
  if (!scroll) return false;

  const bounds = scroll.getBoundingClientRect();
  const scroll0 = (scroll as HTMLElement).scrollTop ?? 0;
  let dragging = false;
  let ended = false;
  let to = from;
  let y = opts.clientY;
  let frame = 0;
  let lastTime = 0;
  const y0 = y;

  const paint = (time: number) => {
    frame = 0;
    if (!row.isConnected) return finish(false);
    if (!dragging) return;
    const dt = Math.min(32, lastTime ? time - lastTime : 16);
    lastTime = time;
    const edge = 36;
    const speed =
      y < bounds.top + edge
        ? -Math.min(1, (bounds.top + edge - y) / edge)
        : y > bounds.bottom - edge
          ? Math.min(1, (y - bounds.bottom + edge) / edge)
          : 0;
    if (speed) (scroll as HTMLElement).scrollTop += speed * dt * 0.6;
    const dy = y - y0 + ((scroll as HTMLElement).scrollTop ?? 0) - scroll0;
    const lo = tops[0]! - tops[from]!;
    const hi = tops[tops.length - 1]! + heights[heights.length - 1]! - h - tops[from]!;
    const d = Math.max(lo, Math.min(hi, dy));
    row.style.transform = `translateY(${d}px)`;
    const mid = tops[from]! + d + h / 2;
    to = from;
    if (d > 0) {
      while (to < rows.length - 1 && mid >= tops[to + 1]! + heights[to + 1]! / 2) to++;
    } else {
      while (to > 0 && mid <= tops[to - 1]! + heights[to - 1]! / 2) to--;
    }
    if (d <= lo && from > 0) to = 0;
    else if (d >= hi && from < rows.length - 1) to = rows.length - 1;
    rows.forEach((r, i) => {
      if (i === from) return;
      const shift = i > from && i <= to ? -h : i < from && i >= to ? h : 0;
      r.style.transform = shift ? `translateY(${shift}px)` : "";
    });
    if (speed) frame = requestAnimationFrame(paint);
  };

  const move = (ev: PointerEvent) => {
    if (ev.pointerId !== pointerId) return;
    if (!row.isConnected || !handle.isConnected) return finish(false, ev);
    y = ev.clientY;
    if (!dragging) {
      if (Math.abs(y - y0) < 4) return;
      dragging = true;
      handle.dataset.dragged = "1";
      onStart?.();
      list.classList.add("sorting");
      row.classList.add("dragging");
      window.getSelection()?.removeAllRanges();
      try {
        handle.setPointerCapture(pointerId);
      } catch {
        /* */
      }
    }
    ev.preventDefault();
    if (!frame) frame = requestAnimationFrame(paint);
  };

  const finish = (save: boolean, ev?: PointerEvent) => {
    if (ended || (ev?.pointerId != null && ev.pointerId !== pointerId)) return;
    if (save && dragging && ev) {
      y = ev.clientY;
      cancelAnimationFrame(frame);
      paint(performance.now());
    }
    if (ended) return;
    ended = true;
    cancelAnimationFrame(frame);
    document.removeEventListener("pointermove", move);
    document.removeEventListener("pointerup", up);
    document.removeEventListener("pointercancel", cancel);
    document.removeEventListener("keydown", keys, true);
    handle.removeEventListener("lostpointercapture", cancel);
    window.removeEventListener("blur", cancel);
    window.removeEventListener("resize", cancel);
    try {
      if (handle.hasPointerCapture(pointerId)) handle.releasePointerCapture(pointerId);
    } catch {
      /* */
    }
    list.classList.remove("sorting");
    row.classList.remove("dragging");
    rows.forEach((r) => {
      r.style.transform = "";
    });
    if (save && dragging && to !== from) onCommit(to);
    onIdle?.();
    setTimeout(() => delete handle.dataset.dragged, 0);
  };

  const up = (ev: PointerEvent) => finish(true, ev);
  const cancel = (ev?: Event) => finish(false, ev as PointerEvent | undefined);
  const keys = (ev: KeyboardEvent) => {
    if (ev.key === "Escape") {
      ev.preventDefault();
      ev.stopImmediatePropagation();
      finish(false);
    }
  };

  document.addEventListener("pointermove", move, { passive: false });
  document.addEventListener("pointerup", up);
  document.addEventListener("pointercancel", cancel);
  document.addEventListener("keydown", keys, true);
  handle.addEventListener("lostpointercapture", cancel);
  window.addEventListener("blur", cancel);
  window.addEventListener("resize", cancel);
  return true;
}
