import { Bird } from "./Bird";

/**
 * Fake Windows OS title bar for the web preview only.
 * Magpie on Windows keeps the system title bar (internal/gui/titlebar_other.go)
 * and tints it to the page --bg (titletint_windows.go TintTitleBar).
 * In-page .brand is hidden (app.css L184); icon+name live here instead.
 */
export function WinCaption() {
  return (
    <div className="win-caption" role="banner" aria-label="Window title bar">
      <div className="win-caption-brand">
        <span className="win-caption-ico" aria-hidden>
          <Bird size={14} />
        </span>
        <span className="win-caption-title">Magpie</span>
      </div>
      <span className="grow" />
      <div className="win-caption-btns" aria-hidden="true">
        <button type="button" className="win-cap-btn min" tabIndex={-1} title="Minimize">
          <svg viewBox="0 0 12 12" width={10} height={10}>
            <path d="M2 6h8" fill="none" stroke="currentColor" strokeWidth="1.2" />
          </svg>
        </button>
        <button type="button" className="win-cap-btn max" tabIndex={-1} title="Maximize">
          <svg viewBox="0 0 12 12" width={10} height={10}>
            <rect x="2.25" y="2.25" width="7.5" height="7.5" fill="none" stroke="currentColor" strokeWidth="1.2" />
          </svg>
        </button>
        <button type="button" className="win-cap-btn close" tabIndex={-1} title="Close">
          <svg viewBox="0 0 12 12" width={10} height={10}>
            <path d="M3 3l6 6M9 3L3 9" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
