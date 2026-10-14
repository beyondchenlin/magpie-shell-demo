import { useMemo, useState } from "react";
import { PROVIDERS } from "../data/mock";

export function ProvidersView() {
  const [q, setQ] = useState("");
  const [offOpen, setOffOpen] = useState(false);
  const [items, setItems] = useState(PROVIDERS);

  const on = useMemo(
    () => items.filter((p) => p.on && p.name.toLowerCase().includes(q.toLowerCase())),
    [items, q],
  );
  const off = useMemo(
    () => items.filter((p) => !p.on && p.name.toLowerCase().includes(q.toLowerCase())),
    [items, q],
  );

  return (
    <main className="view" id="view-providers">
      <div className="pv-head" id="pvHead">
        <input
          className="sess-filter pv-q"
          id="pvQ"
          type="search"
          spellCheck={false}
          autoComplete="off"
          placeholder="查找供应商"
          aria-label="查找供应商"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      <div className="list" id="providers">
        {on.map((p) => (
          <div className="row provider" key={p.id} data-id={p.id}>
            <span className="ic" style={{ width: 22, height: 22 }}>
              <img src={p.icon} alt="" />
            </span>
            <div className="who" style={{ flex: 1, minWidth: 0 }}>
              <div className="name">{p.name}</div>
              <div className="note" style={{ fontSize: 11.5, color: "var(--muted)" }}>
                {p.account} · {p.models} 个模型
              </div>
            </div>
            <button
              type="button"
              className="text"
              onClick={() =>
                setItems((prev) => prev.map((x) => (x.id === p.id ? { ...x, on: false } : x)))
              }
            >
              关闭
            </button>
          </div>
        ))}
      </div>
      <div className="row-head off-head" id="offHead" hidden={off.length === 0}>
        <button
          className="fold"
          id="foldOff"
          type="button"
          aria-expanded={offOpen}
          aria-controls="offProviders"
          onClick={() => setOffOpen((v) => !v)}
        >
          <span className="label">已关闭的供应商</span>
          <span className="note" id="offCount">
            {off.length}
          </span>
        </button>
      </div>
      <div className="list" id="offProviders" hidden={!offOpen || off.length === 0}>
        {off.map((p) => (
          <div className="row provider" key={p.id} style={{ opacity: 0.7 }}>
            <span className="ic" style={{ width: 22, height: 22 }}>
              <img src={p.icon} alt="" />
            </span>
            <div className="who" style={{ flex: 1 }}>
              <div className="name">{p.name}</div>
            </div>
            <button
              type="button"
              className="text primary"
              onClick={() =>
                setItems((prev) => prev.map((x) => (x.id === p.id ? { ...x, on: true } : x)))
              }
            >
              开启
            </button>
          </div>
        ))}
      </div>
      <div className="after-list">
        <button className="text" id="addProvider" type="button">
          ＋ 添加供应商
        </button>
      </div>
    </main>
  );
}
