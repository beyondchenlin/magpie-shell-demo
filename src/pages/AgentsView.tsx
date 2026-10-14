import { ZH, iconSrc } from "../data/mock";

type Props = { onAddProvider: () => void };

export function AgentsView({ onAddProvider }: Props) {
  return (
    <main className="view" id="view-agents">
      <div className="ag-lead guiding" id="agentsLead">
        <section className="guide" aria-label={ZH.getStarted}>
          <div className="guide-head">
            <b className="guide-h">{ZH.getStarted}</b>
            <span className="guide-n">{ZH.ofDone}</span>
            <button
              type="button"
              className="guide-x"
              title={ZH.hideGetStarted}
              aria-label={ZH.hideGetStarted}
            >
              <svg viewBox="0 0 16 16" width={12} height={12} aria-hidden>
                <path
                  d="M4.5 4.5l7 7M11.5 4.5l-7 7"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
          <ol className="guide-steps">
            <li className="guide-step">
              <span className="guide-tick" aria-hidden>
                1
              </span>
              <div className="guide-body">
                <b className="guide-title">{ZH.addModelSource}</b>
                <span className="guide-say">{ZH.addModelSourceSay}</span>
                <div className="guide-acts">
                  <button
                    type="button"
                    className="text primary"
                    onClick={onAddProvider}
                  >
                    {ZH.addProvider}
                  </button>
                </div>
              </div>
            </li>
            <li className="guide-step">
              <span className="guide-tick" aria-hidden>
                2
              </span>
              <div className="guide-body">
                <b className="guide-title">{ZH.connectAgent}</b>
                <span className="guide-say">{ZH.connectAgentSay}</span>
              </div>
            </li>
          </ol>
        </section>
      </div>

      <div className="list" id="agents">
        <div className="row agent conn" data-id="cursor" title="Cursor">
          <button type="button" className="ag-handle" aria-label="Cursor">
            <span className="ic">
              <img src={iconSrc("cursor")} alt="" />
            </span>
          </button>
          <div className="who">
            <div className="name">Cursor</div>
            <div className="ag-native-note">
              <span className="sq" aria-hidden />
              <span className="sq" aria-hidden />
              <span>{ZH.onlyCursorOwn}</span>
            </div>
          </div>
          <span className="ag-cant">{ZH.cantConnect}</span>
        </div>

        <div className="ag-manage-bar" id="agentsManage">
          <button type="button" className="ag-manage-button" title={ZH.manage}>
            <svg viewBox="0 0 16 16" width={14} height={14} aria-hidden>
              <g
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              >
                <path d="M2 3.5h2M6 3.5h8M2 8h2M6 8h8M2 12.5h2M6 12.5h8" />
              </g>
            </svg>
            <span>{ZH.manage}</span>
          </button>
        </div>
      </div>

      <section className="ag-install" id="agentsInstall">
        <button
          type="button"
          className="ag-install-head"
          aria-expanded="false"
        >
          <span>{ZH.installAnother}</span>
          <span className="chev" aria-hidden>
            <svg viewBox="0 0 16 16" width={11} height={11}>
              <path
                d="M4 6l4 4 4-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </button>
      </section>

      <section className="profiles">
        <span className="label">{ZH.profiles}</span>
        <div id="profiles" className="chips">
          <span className="hint">{ZH.profilesNone}</span>
        </div>
        <button className="text" id="save" type="button">
          {ZH.saveCurrent}
        </button>
      </section>
    </main>
  );
}
