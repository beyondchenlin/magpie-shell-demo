/** Magpie app.js navMorph: compositor snapshots, 320ms CSS easing, 1500ms watchdog. */
let current: ViewTransition | undefined;
let generation = 0;

export function morphNavigation(change: () => void) {
  const turn = ++generation;
  current?.skipTransition();
  if (!document.startViewTransition || matchMedia("(prefers-reduced-motion: reduce)").matches) {
    document.documentElement.classList.remove("nav-morph");
    change();
    return;
  }
  // View-transition snapshots live above the DOM, so #root's overflow cannot
  // clip them to the simulated OS window. Percent insets remain viewport
  // relative even when the document uses Magpie's CSS zoom.
  const frame = document.body.classList.contains("web") ? document.getElementById("root") : null;
  if (frame) {
    const r = frame.getBoundingClientRect();
    const insets = [r.top / innerHeight, (innerWidth - r.right) / innerWidth,
      (innerHeight - r.bottom) / innerHeight, r.left / innerWidth];
    const radius = getComputedStyle(frame).borderRadius;
    document.documentElement.style.setProperty("--nav-frame-clip",
      `inset(${insets.map(v => `${Math.max(0, v) * 100}%`).join(" ")} round ${radius})`);
  }
  document.documentElement.classList.add("nav-morph");
  const transition = document.startViewTransition(() => {
    if (turn === generation) change();
  });
  current = transition;
  const watchdog = setTimeout(() => transition.skipTransition(), 1500);
  const finish = () => {
    clearTimeout(watchdog);
    if (current === transition) {
      current = undefined;
      document.documentElement.classList.remove("nav-morph");
      document.documentElement.style.removeProperty("--nav-frame-clip");
    }
  };
  void transition.finished.then(finish, finish);
}
