/** Magpie app.js navMorph: compositor snapshots, 500ms CSS spring, 1500ms watchdog. */
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
    }
  };
  void transition.finished.then(finish, finish);
}
