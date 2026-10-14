import { AGENTS, PROFILES } from "../data/mock";

export function AgentsView() {
  return (
    <main className="view" id="view-agents">
      <div className="list" id="agents">
        {AGENTS.map((a) => (
          <div className="row agent" data-id={a.id} key={a.id} title={a.name}>
            <button type="button" className="ag-handle" aria-label={a.name}>
              <span className="ic">
                <img src={a.icon} alt="" />
              </span>
            </button>
            <div className="who">
              <div className="name">{a.name}</div>
            </div>
            <div className="fields">
              <button type="button" className="field main" title={`模型: ${a.model}`}>
                {a.modelIcon ? (
                  <span className="ic">
                    <img src={a.modelIcon} alt="" />
                  </span>
                ) : null}
                <span className="v">{a.model}</span>
                <span className="chev">
                  <Chevron />
                </span>
              </button>
              <button type="button" className="field side" title={`推理: ${a.effort}`}>
                <span className="k">推理</span>
                <span className="v">{a.effort}</span>
                <span className="chev">
                  <Chevron />
                </span>
              </button>
            </div>
          </div>
        ))}
      </div>
      <section className="profiles">
        <span className="label">方案</span>
        <div id="profiles" className="chips">
          {PROFILES.map((p, i) => (
            <button type="button" className={i === 0 ? "chip on" : "chip"} key={p}>
              {p}
            </button>
          ))}
        </div>
        <button className="text" id="save" type="button">
          ＋ 保存当前
        </button>
      </section>
    </main>
  );
}

function Chevron() {
  return (
    <svg viewBox="0 0 16 16" width={11} height={11} aria-hidden>
      <path
        d="M5 3.5 10 8 5 12.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
