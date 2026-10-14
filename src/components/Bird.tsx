/** Magpie bird mark — uses shared #bird symbol from index.html when present. */
export function Bird({ size = 18 }: { size?: number }) {
  return (
    <svg viewBox="0 0 44 44" width={size} height={size} aria-hidden="true">
      <use href="#bird" />
    </svg>
  );
}
