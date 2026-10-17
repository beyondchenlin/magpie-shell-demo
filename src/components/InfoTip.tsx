/** Magpie routing infoTip(): focusable explanation with the native INFO_I icon. */
export function InfoTip({ text }: { text: string }) {
  return <span className="rt-info" tabIndex={0} role="img" title={text} aria-label={text}>
    <svg viewBox="0 0 16 16" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 14.5a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13zM8 7.25V11M8 5v.01" />
    </svg>
  </span>;
}
