import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import presets from "../data/presets.json";
import { SUB_TILES, ZH, iconSrc } from "../data/mock";

type Preset = { id: string; name: string; icon: string; kind: string };

const PRESETS = presets as Preset[];

function Tile({
  id,
  name,
  icon,
}: {
  id: string;
  name: string;
  icon: string;
}) {
  return (
    <button type="button" className="tile" data-pick={id} title={name}>
      <img className="ic-img ic" src={iconSrc(icon)} alt="" onError={(e) => {
        const el = e.currentTarget;
        if (!el.dataset.fallback) {
          el.dataset.fallback = "1";
          el.src = iconSrc(icon.replace(/-color$/, "") + ".png").replace(".svg.png", ".png");
          // try png path
          el.src = `/icons/${icon}.png`;
        }
      }} />
      <span className="nm">
        <span className="n">{name}</span>
      </span>
    </button>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <>
      <div className="kind">
        <b>{title}</b>
        {hint ? <span>{hint}</span> : null}
      </div>
      <div className="grid">{children}</div>
    </>
  );
}

export function ProvidersView() {
  const [q, setQ] = useState("");
  const f = q.trim().toLowerCase();

  const hit = (name: string, id: string) =>
    !f || name.toLowerCase().includes(f) || id.toLowerCase().includes(f);

  const subs = useMemo(
    () => SUB_TILES.filter((s) => hit(s.name, s.id)),
    [f],
  );
  const byKind = (kind: string) =>
    PRESETS.filter((p) => p.kind === kind && hit(p.name, p.id));

  // Hide *-cn duplicates under the same display name when searching empty
  // Magpie pairs China endpoints; demo list already has short names.
  const vendors = byKind("vendor").filter((p) => !p.id.endsWith("-cn") || f);
  const relays = byKind("relay");
  const locals = byKind("local");
  const remotes = byKind("remote");

  return (
    <main className="view" id="view-providers">
      <div className="list" id="providers" hidden />
      <section className="sheet" id="addSheet">
        <div className="row-head">
          <span className="label">{ZH.addFirstProvider}</span>
          <span className="grow" />
          <input
            className="find"
            type="search"
            spellCheck={false}
            autoComplete="off"
            placeholder={ZH.findVendor}
            aria-label={ZH.findVendor}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button type="button" className="text">
            {ZH.import}
          </button>
        </div>
        <div className="tiles">
          {subs.length > 0 && (
            <Section title={ZH.subscriptions} hint={ZH.signInNoKey}>
              {subs.map((s) => (
                <Tile key={s.id} id={s.id} name={s.name} icon={s.icon} />
              ))}
              <button type="button" className="tile more-plugins" data-pick="plugins">
                <span className="puzzle" aria-hidden>
                  <svg viewBox="0 0 20 20" width={15} height={15}>
                    <path
                      d="M8 3.5h4v2.5a1.5 1.5 0 0 0 3 0V3.5h1.5v13H4v-4h2.5a1.5 1.5 0 0 0 0-3H4v-6z"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <span className="nm">
                  <span className="n">{ZH.moreInPlugins}</span>
                </span>
              </button>
            </Section>
          )}

          {vendors.length > 0 && (
            <Section title={ZH.vendors} hint={ZH.makersApis}>
              {vendors.map((p) => (
                <Tile key={p.id} id={p.id} name={p.name} icon={p.icon} />
              ))}
            </Section>
          )}

          {relays.length > 0 && (
            <Section title={ZH.relays} hint={ZH.oneKeyMany}>
              {relays.map((p) => (
                <Tile key={p.id} id={p.id} name={p.name} icon={p.icon} />
              ))}
            </Section>
          )}

          {locals.length > 0 && (
            <Section title={ZH.onThisMachine}>
              {locals.map((p) => (
                <Tile key={p.id} id={p.id} name={p.name} icon={p.icon} />
              ))}
            </Section>
          )}

          {remotes.length > 0 && (
            <Section title={ZH.anotherComputer} hint={ZH.sharedNetwork}>
              {remotes.map((p) => (
                <Tile key={p.id} id={p.id} name={p.name} icon={p.icon} />
              ))}
            </Section>
          )}

          {!f && (
            <div className="custom-foot">
              <button type="button" className="custom" data-pick="custom">
                <svg viewBox="0 0 16 16" width={13} height={13} aria-hidden>
                  <path
                    d="M8 3.5v9M3.5 8h9"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
                <span>{ZH.customProvider}</span>
              </button>
              <span className="hint">{ZH.anyCompatible}</span>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
