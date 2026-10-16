import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { t } from "../i18n";
import { dragRows } from "../lib/dragRows";
import { useAnchoredPopover } from "../lib/useAnchoredPopover";
import { MagpieIcon } from "./MagpieIcon";
import { PopoverPortal } from "./PopoverPortal";
import { usePickerDismiss } from "../lib/pickerGhost";
import { watchMenuScroll } from "../lib/menuScroll";

export type AmModel = {
  id: string;
  name: string;
  group: string;
  on: boolean;
  icon?: string;
  logo?: string;
  context?: string;
  own?: boolean;
};
export type AmPreferences = { only: boolean; ordered: boolean };
type Props = {
  open: boolean;
  anchor: HTMLElement | null;
  agentName: string;
  agentId: string;
  models: AmModel[];
  currentModels: string[];
  defaultOrder: string[];
  preferences: AmPreferences;
  onPreferences: (next: AmPreferences) => void;
  onChange: (next: AmModel[]) => void;
  onClose: () => void;
};

const ROUTES = "Routing groups";
function GroupIcon({ name, icon, className }: { name: string; icon?: string; className?: string }) {
  return name === ROUTES ? <svg className={className} viewBox="0 0 16 16" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
    <path d="M4.3 8h7.4 M4.3 8c2.6 0 3.2-4.6 5.8-4.6h1.6 M4.3 8c2.6 0 3.2 4.6 5.8 4.6h1.6" />
    <circle cx={2.9} cy={8} r={1.4} /><circle cx={13.1} cy={3.4} r={1.4} />
    <circle cx={13.1} cy={8} r={1.4} /><circle cx={13.1} cy={12.6} r={1.4} />
  </svg> : <MagpieIcon name={icon} className={className} />;
}

/** Native openAgentModels DOM and local mock state; no provider API calls. */
export function AgentModelsPop({ open, anchor, agentName, agentId, models, currentModels,
  defaultOrder, preferences, onPreferences, onChange, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [q, setQ] = useState("");
  const [seg, setSeg] = useState<"all" | "shown" | "order">("all");
  const [group, setGroup] = useState("");
  const [kept, setKept] = useState<Set<string>>(new Set());
  const [shut, setShut] = useState<Set<string>>(() => {
    const names = [...new Set(models.map(m => m.group))];
    return new Set(names.filter(g => names.length > 1 && models.filter(m => m.group === g).length > 8 &&
      !models.some(m => m.group === g && currentModels.includes(m.id))));
  });
  const [armed, setArmed] = useState<"show" | "hide" | null>(null);
  const shown = open;
  const dismiss = usePickerDismiss(ref, open, anchor, onClose);
  const focusAfterMove = useRef<string | null>(null);
  const groups = useMemo(() => {
    const result = new Map<string, AmModel[]>();
    models.forEach(m => { if (!result.has(m.group)) result.set(m.group, []); result.get(m.group)!.push(m); });
    return [...result.entries()].sort(([a], [b]) => Number(b === ROUTES) - Number(a === ROUTES));
  }, [models]);
  const frameWidth = anchor?.closest<HTMLElement>("#root")?.clientWidth || window.innerWidth;
  const railed = groups.length > 2 && frameWidth >= 600;
  const inUse = (m: AmModel) => currentModels.includes(m.id);
  const visibleModels = models.filter(m => m.on || inUse(m));
  const order = preferences.ordered ? visibleModels : [...visibleModels.filter(m => m.own), ...visibleModels.filter(m => !m.own)];
  const words = q.trim().toLowerCase();
  const byGroup = groups.map(([name, rows]) => [name, rows.filter(m =>
    (seg !== "shown" || m.on || inUse(m) || kept.has(m.id)) &&
    (!words || [m.name, m.id, m.group].some(s => s.toLowerCase().includes(words))))] as const)
    .filter(([name, rows]) => rows.length && (!group || words || name === group));

  const disarm = () => setArmed(null);
  useEffect(() => {
    if (!armed) return;
    const timer = setTimeout(() => setArmed(null), 4000);
    return () => clearTimeout(timer);
  }, [armed]);
  useAnchoredPopover(ref, anchor, shown, { recipe: "agent", requestedWidth: railed ? 580 : 380 });
  useEffect(() => {
    if (!shown) return;
    anchor?.classList.add("open");
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault(); e.stopPropagation(); dismiss();
      anchor?.focus({ preventScroll: true });
    };
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node) && !anchor?.contains(e.target as Node)) dismiss();
    };
    document.addEventListener("keydown", onKey, true);
    document.addEventListener("mousedown", onDown, true);
    const stopScroll = ref.current ? watchMenuScroll(ref.current, dismiss) : () => {};
    return () => {
      stopScroll();
      anchor?.classList.remove("open");
      document.removeEventListener("keydown", onKey, true);
      document.removeEventListener("mousedown", onDown, true);
    };
  }, [shown, anchor, dismiss]);

  useLayoutEffect(() => {
    const id = focusAfterMove.current;
    if (!id) return;
    listRef.current?.querySelector<HTMLElement>(`.am-or[data-id="${CSS.escape(id)}"]`)?.focus({ preventScroll: true });
    focusAfterMove.current = null;
  }, [models, preferences.ordered]);

  const keepHidden = (ids: string[]) => setKept(previous => new Set([...previous, ...ids]));
  const change = (next: AmModel[]) => { disarm(); onChange(next); };
  const selectView = (next: typeof seg) => {
    setSeg(next); setKept(new Set()); disarm();
    if (listRef.current) listRef.current.scrollTop = 0;
  };
  const moveTo = (id: string, to: number) => {
    const next = [...order], from = next.findIndex(m => m.id === id);
    to = Math.max(0, Math.min(next.length - 1, to));
    if (from < 0 || from === to) return;
    focusAfterMove.current = id;
    next.splice(to, 0, ...next.splice(from, 1));
    change([...next, ...models.filter(m => !m.on && !inUse(m))]);
    onPreferences({ ...preferences, ordered: true });
  };
  const batch = (action: "show" | "hide") => {
    if (armed !== action) { setArmed(action); return; }
    if (action === "hide") keepHidden(models.filter(m => m.on && !inUse(m)).map(m => m.id));
    change(models.map(m => ({ ...m, on: action === "show" || inUse(m) })));
  };
  const hiddenCount = models.filter(m => !m.on && !inUse(m)).length;
  const hideableCount = models.filter(m => m.on && !inUse(m)).length;
  const titleFor = (name: string) => name === ROUTES ? t(name) : name;
  const modelLogo = (m: AmModel, ordering = false) => ordering ? <GroupIcon name={m.group} icon={m.logo || m.icon} className="lg" />
    : m.group === ROUTES ? <span className="ic lg"><GroupIcon name={m.group} /></span>
      : m.logo ? <MagpieIcon name={m.logo} className="lg" /> : <span className="ic lg" />;
  if (!shown) return null;

  const list = <div className="am-list" ref={listRef}>
    {seg === "order" ? <>
      <div className="am-rows am-order" role="list">
        {order.map((m, i) => <div key={m.id} className="am-mr am-or" data-id={m.id} role="listitem" tabIndex={0}
          title={t("Drag to move · Alt+↑/↓ from the keyboard")}
          onKeyDown={e => {
            if (!e.altKey || !["ArrowUp", "ArrowDown"].includes(e.key)) return;
            e.preventDefault(); moveTo(m.id, i + (e.key === "ArrowUp" ? -1 : 1));
          }}
          onPointerDown={e => {
            const row = e.currentTarget, body = row.parentElement!;
            dragRows(e.nativeEvent, { handle: row, row, list: body, rows: [...body.children] as HTMLElement[],
              pointerId: e.pointerId, clientY: e.clientY, onCommit: to => moveTo(m.id, to) });
          }}>
          <span className="grip" /><span className="ix">{i + 1}</span>{modelLogo(m, true)}
          <span className="n">{m.name}</span><span className="x">{titleFor(m.group)}</span>
        </div>)}
      </div>
      {!order.length ? <div className="am-none">{t("No matches.")}</div> : null}
    </> : <>
      {byGroup.map(([name, rows]) => {
        const allModels = groups.find(([n]) => n === name)![1];
        const folded = !words && !group && shut.has(name);
        const free = allModels.filter(m => !inUse(m)), allOn = free.every(m => m.on);
        return <section className={`am-g${folded ? " shut" : ""}${name === ROUTES ? " routes" : ""}`} key={name}>
          <div className="am-gh">
            <button type="button" className="am-fold" aria-expanded={!folded} onClick={() => {
              disarm(); setShut(previous => { const next = new Set(previous); if (next.has(name)) next.delete(name); else next.add(name); return next; });
            }}>
              <span className="tw"><svg viewBox="0 0 16 16" width={10} height={10} fill="none" stroke="currentColor" strokeWidth={1.7}><path d="m5.5 6.5 2.5 2.5 2.5-2.5" /></svg></span>
              <GroupIcon name={name} icon={allModels[0]?.icon} /><span className="gn">{titleFor(name)}</span>
              <span className="c">{allModels.filter(m => m.on || inUse(m)).length} / {allModels.length}</span>
            </button>
            <button type="button" className="am-all" hidden={!free.length} onClick={() => {
              if (allOn) keepHidden(free.map(m => m.id));
              change(models.map(m => m.group === name && !inUse(m) ? { ...m, on: !allOn } : m));
            }}>{allOn ? t("Hide all") : t("Show all")}</button>
          </div>
          {!folded ? <div className="am-rows">{rows.map(m => {
            const locked = inUse(m), on = m.on || locked;
            return <button key={m.id} type="button" className={`am-mr${on ? "" : " off"}${locked ? " lock" : ""}`}
              role="menuitemcheckbox" aria-checked={on} aria-disabled={locked || undefined}
              title={locked ? t("{agent} is set to it, so it stays", { agent: agentName }) : m.id}
              onClick={() => { if (locked) return; if (on) keepHidden([m.id]); change(models.map(x => x.id === m.id ? { ...x, on: !on } : x)); }}>
              {modelLogo(m)}<span className="n">{m.name}{locked ? <span className="am-tag">{t("Current")}</span> : null}</span>
              <span className="x">{m.context}</span><span className="ck">{on ? <svg viewBox="0 0 16 16" width={12} height={12} fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round"><path d="m3.5 8.5 3 3 6-7" /></svg> : null}</span>
            </button>;
          })}</div> : null}
        </section>;
      })}
      {!byGroup.length ? <div className="am-none">{t("No matches.")}</div> : null}
    </>}
  </div>;

  return <PopoverPortal><div data-anchored ref={ref} role="dialog" aria-label={t("{agent}'s model list", { agent: agentName })}
    className={`pop am-pop${railed ? " railed" : ""}${seg === "order" ? " ordering" : ""}`}
    style={{ width: railed ? 580 : 380 }}>
    <div className="am-head"><div className="am-t">{t("{agent}'s model list", { agent: agentName })}</div>
      <div className="am-d">{t("Models turned off don't show in {agent}'s model picker; other agents can still use them.", { agent: agentName })}</div>
    </div>
    <div className="am-tools"><label className="am-search">
      <svg viewBox="0 0 16 16" width={12} height={12} aria-hidden><circle cx="7" cy="7" r="4.5" fill="none" stroke="currentColor" strokeWidth={1.6} /><path d="m10.5 10.5 3 3" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" /></svg>
      <input type="text" spellCheck={false} autoComplete="off" placeholder={t("Search models")} value={q} autoFocus
        onChange={e => { setQ(e.target.value); disarm(); if (listRef.current) listRef.current.scrollTop = 0; }} />
    </label><div className="am-seg">{([ ["all", "All"], ["shown", "Shown"], ["order", "Order"] ] as const).map(([id, label]) =>
      <button key={id} type="button" className={seg === id ? "on" : ""} onClick={() => selectView(id)}>{t(label)}</button>)}</div></div>
    {railed ? <div className="am-body"><div className="am-rail">
      {[[ "", models ] as const, ...groups].map(([name, items]) => <button key={name} type="button" className={`am-ri${group === name ? " on" : ""}`} aria-pressed={group === name}
        title={name ? titleFor(name) : t("All providers")} onClick={() => { setGroup(name); setQ(""); disarm(); if (listRef.current) listRef.current.scrollTop = 0; }}>
        {name ? <GroupIcon name={name} icon={items[0]?.icon} /> : <span className="ic"><svg viewBox="0 0 16 16" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={1.5}><path d="M3 4.5h10M3 8h10M3 11.5h10" /></svg></span>}
        <span className="rn">{name ? titleFor(name) : t("All providers")}</span><span className="c">{items.filter(m => m.on || inUse(m)).length}/{items.length}</span>
      </button>)}
    </div>{list}</div> : list}
    <div className="am-foot">{seg === "order" ? <>
      <span>{t(agentId.split("@wsl:")[0] === "codex" ? "Drag to put them in the order {agent} lists them; new models go last" : "Drag to put them in the order magpie hands them to {agent}; new models go last", { agent: agentName })}</span>
      <span className="sp" /><button type="button" className="am-reset" disabled={!preferences.ordered} onClick={() => {
        const rank = new Map(defaultOrder.map((id, i) => [id, i]));
        change([...models].sort((a, b) => (rank.get(a.id) ?? Infinity) - (rank.get(b.id) ?? Infinity)));
        onPreferences({ ...preferences, ordered: false });
      }}>{t("Default order")}</button>
    </> : <>
      <label className="am-only" hidden={!!armed} title={t("Off: new models are shown. On: only the models ticked here are shown, and a model added later, of any provider, stays off until you tick it")}>
        <button type="button" role="switch" className={`lib-switch use-credits${preferences.only ? " on" : ""}`} aria-checked={preferences.only} aria-label={t("Only models I pick")}
          onClick={e => { e.preventDefault(); disarm(); onPreferences({ ...preferences, only: !preferences.only }); }}><i /></button>
        <span>{t("Only models I pick")}</span>
      </label><span className="sp" />
      <button type="button" className="am-reset am-hide" disabled={!hideableCount} data-armed={armed === "hide" ? "1" : undefined} onClick={() => batch("hide")}>
        {armed === "hide" ? t("Hide {n}, of every provider? Click again", { n: hideableCount }) : t("Hide all")}</button><span className="am-dot">·</span>
      <button type="button" className="am-reset" disabled={!hiddenCount} data-armed={armed === "show" ? "1" : undefined} onClick={() => batch("show")}>
        {armed === "show" ? t("Show {n} hidden, of every provider? Click again", { n: hiddenCount }) : t("Show all")}</button>
    </>}</div>
  </div></PopoverPortal>;
}
