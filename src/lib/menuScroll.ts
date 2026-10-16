// Native hoverFocus compares with the last actual mouse move, so redrawn
// content under a stationary pointer cannot take keyboard/search focus.
let pointerAt = "";
window.addEventListener("mousemove", e => { pointerAt = `${e.screenX},${e.screenY}`; }, true);
export function menuHoverFocus(button: HTMLElement, e: Pick<MouseEvent, "screenX" | "screenY">) {
  if (`${e.screenX},${e.screenY}` !== pointerAt) button.focus({ preventScroll: true });
}

/** Source scrollCloses/readerScrolls, shared by app menus only. Keyboard and
 * submission behavior remain owned by each menu family. */
export function watchMenuScroll(box: HTMLElement, close: () => void) {
  let purposeUntil = 0;
  const purpose = () => { purposeUntil = performance.now() + 250; };
  const keys = (e: KeyboardEvent) => {
    const typing = (e.target as Element | null)?.matches("input, textarea");
    if (e.key === "Tab" || !typing && ["PageUp", "PageDown", "Home", "End", "ArrowUp", "ArrowDown", " "].includes(e.key)) purposeUntil = performance.now() + 400;
  };
  const scroll = (e: Event) => {
    const target = e.target as Element;
    if (box.contains(target) || target.matches?.("input, textarea")) return;
    if (!target.classList?.contains("view") || performance.now() < purposeUntil) close();
  };
  document.addEventListener("scroll", scroll, true);
  document.addEventListener("keydown", keys, true);
  document.addEventListener("wheel", purpose, { capture: true, passive: true });
  document.addEventListener("touchmove", purpose, { capture: true, passive: true });
  window.addEventListener("resize", close);
  return () => {
    document.removeEventListener("scroll", scroll, true);
    document.removeEventListener("keydown", keys, true);
    document.removeEventListener("wheel", purpose, true);
    document.removeEventListener("touchmove", purpose, true);
    window.removeEventListener("resize", close);
  };
}
