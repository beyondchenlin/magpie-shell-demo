import { Segs } from "./Segs";
import { t } from "../i18n";

function nextWarmTime(ats: string[]): string {
  const last = ats[ats.length - 1] || "06:00";
  const [h, m] = last.split(":").map(Number);
  const pad = (n: number) => String(n).padStart(2, "0");
  let at = pad((h + 5) % 24) + ":" + pad(m || 0);
  for (let i = 0; ats.includes(at) && i < 24; i++) at = pad(i) + ":00";
  return at;
}

type Props = {
  ats: string[];
  onChange: (ats: string[]) => void;
};

/** Magpie renderWarmAt: time chips + Off/On segs */
export function WarmAt({ ats, onChange }: Props) {
  const on = ats.length > 0;
  return (
    <div className={`warm-at${on ? " times" : ""}`}>
      {on ? (
        <>
          <span className="warm-times">
            {ats.map((at, n) => (
              <span className="warm-time" key={`${at}-${n}`}>
                <input
                  className="at"
                  type="time"
                  value={at}
                  aria-label={t("Time of day")}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (!v || v === at) return;
                    onChange(ats.map((a, k) => (k === n ? v : a)));
                  }}
                />
                {ats.length > 1 ? (
                  <button
                    type="button"
                    className="text quiet warm-rm"
                    title={t("Remove {at}", { at })}
                    aria-label={t("Remove {at}", { at })}
                    onClick={() => onChange(ats.filter((_, k) => k !== n))}
                  >
                    ×
                  </button>
                ) : null}
              </span>
            ))}
          </span>
          <button
            type="button"
            className="text warm-add"
            title={t("Add a time")}
            aria-label={t("Add a time")}
            onClick={() => onChange([...ats, nextWarmTime(ats)])}
          >
            +
          </button>
        </>
      ) : null}
      <Segs
        value={on ? "on" : "off"}
        onChange={(v) => onChange(v === "on" ? (ats.length ? ats : ["06:00"]) : [])}
        items={[
          { id: "off", label: t("Off") },
          { id: "on", label: t("On") },
        ]}
      />
    </div>
  );
}
