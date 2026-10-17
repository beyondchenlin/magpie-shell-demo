import { useCallback, useEffect, useRef, useState } from "react";
import { TextBtn } from "../components/TextBtn";
import { Segs } from "../components/Segs";
import { PrefRow } from "../components/PrefRow";
import { LibSwitch } from "../components/LibSwitch";
import type { ApplicationView, ConfigView, Provider, RuntimeStatus, SaveProvider } from "./contract";
import { ProviderForm } from "./ProviderForm";
import { LanguagePick } from "./LanguagePick";
import { DiagnosticsPanel } from "./DiagnosticsPanel";
import { AppProfiles } from "./AppProfiles";
import { GatewaySettings } from "./GatewaySettings";
import { ChatView } from "./ChatView";
import { ProductChrome, type ProductPage } from "./ProductChrome";
import { copy, errorCopy } from "./copy";
import { applyPreferences, readPreferences, savePreferences, type Preferences, type ProductTheme } from "./preferences";
import { desktop, protocolVersion, service } from "./service";
import { getCurrentWindow } from "@tauri-apps/api/window";

type Page = ProductPage;

export default function ProductApp() {
  const [page, setPage] = useState<Page>("chat");
  const [preferences, setPreferences] = useState(readPreferences);
  const [view, setView] = useState<ApplicationView | null>(null);
  const [busy, setBusy] = useState(desktop);
  const [error, setError] = useState<unknown>(null);
  const [notice, setNotice] = useState(false);
  const [editor, setEditor] = useState<Provider | "new" | null>(null);
  const [profileEditing, setProfileEditing] = useState(false);
  const [gatewayEditing, setGatewayEditing] = useState(false);
  const [deleting, setDeleting] = useState<Provider | null>(null);
  const mounted = useRef(true);
  const deleteDialog = useRef<HTMLDialogElement>(null);
  const c = copy(preferences.language);
  const editing = !!editor || profileEditing || gatewayEditing;
  const providerReferences = deleting ? view?.config.profiles.filter(profile => !profile.is_global && profile.provider_ids.includes(deleting.id)) ?? [] : [];
  const refresh = useCallback(async () => {
    if (!desktop) return;
    setBusy(true); setError(null);
    try { const current = await service.view(); if (mounted.current) setView(current); }
    catch (err) { if (mounted.current) setError(err); }
    finally { if (mounted.current) setBusy(false); }
  }, []);
  useEffect(() => {
    mounted.current = true;
    let live = true;
    if (desktop) void service.view().then(current => { if (live) setView(current); }, err => { if (live) setError(err); })
      .finally(() => { if (live) setBusy(false); });
    return () => { live = false; mounted.current = false; };
  }, []);
  useEffect(() => { applyPreferences(preferences); if (desktop) void getCurrentWindow().setTheme(preferences.theme === "system" ? null : preferences.theme).catch(() => setError({code:"NATIVE_THEME_UNCONFIRMED"})); }, [preferences]);
  useEffect(() => {
    if (!desktop || busy) return;
    let live=true;
    const timer=setInterval(() => {
      void service.view().then(current => {
        if (live) setView(previous => previous && previous.config.desired_revision > current.config.desired_revision ? previous : current);
      }, err => { if (live) setError(err); });
    },2000);
    return () => { live=false; clearInterval(timer); };
  },[busy]);
  useEffect(() => {
    if (!deleting) return;
    const previous = document.activeElement as HTMLElement | null;
    const dialog = deleteDialog.current;
    dialog?.showModal();
    return () => { dialog?.close(); previous?.focus(); };
  }, [deleting]);

  async function mutate(operation: () => Promise<ConfigView>): Promise<boolean> {
    if (busy) return false;
    setBusy(true); setError(null); setNotice(false);
    try {
      const config = await operation();
      if (mounted.current) { setView(old => old ? { ...old, config } : old); setNotice(true); }
      return true;
    } catch (err) { if (mounted.current) setError(err); return false; }
    finally { if (mounted.current) setBusy(false); }
  }

  async function save(input: SaveProvider) {
    const success = await mutate(() => service.save(input));
    if (success && mounted.current) setEditor(null);
    return success;
  }
  async function runtimeAction(operation: () => Promise<RuntimeStatus>) {
    if(busy) return;
    setBusy(true); setError(null); setNotice(false);
    try { const runtime=await operation(); if(mounted.current) setView(previous => previous ? {...previous,runtime} : previous); }
    catch(err) { if(mounted.current) setError(err); }
    finally { if(mounted.current) setBusy(false); }
  }
  function changePreferences(next: Preferences) {
    setPreferences(next);
    if (!savePreferences(next)) setError({ code: "PREFERENCES_UNSAVED" });
  }
  async function move(provider: Provider, direction: -1 | 1) {
    if (!view) return;
    const ids = view.config.providers.map(p => p.id);
    const from = ids.indexOf(provider.id); const to = from + direction;
    if (to < 0 || to >= ids.length) return;
    [ids[from], ids[to]] = [ids[to], ids[from]];
    await mutate(() => service.reorder({ protocol_version: protocolVersion, expected_revision: view.config.desired_revision, ids }));
  }

  return <>
    <ProductChrome page={page} onPage={setPage} onRefresh={()=>void refresh()} disabled={busy||editing} view={view} language={preferences.language}/>
    {!desktop && <aside className="tagma-banner" role="status">{c.preview}</aside>}
    {!["zh", "en"].includes(preferences.language) && <aside className="tagma-banner">{c.coverage}</aside>}
    <main className="view tagma-main" aria-busy={busy}>
      {error != null && <div className="tagma-error" role="alert">{typeof error === "object" && "code" in error && error.code === "PREFERENCES_UNSAVED" ? c.preferencesError : typeof error === "object" && "code" in error && error.code === "CLIPBOARD_UNCONFIRMED" ? c.copyFailed : errorCopy(error, preferences.language)} <TextBtn disabled={busy} onClick={() => void refresh()}>{c.refresh}</TextBtn></div>}
      {notice && <p role="status" className="tagma-notice">{view?.runtime.state === "running" && view.runtime.effective_revision === view.config.desired_revision ? c.configurationApplied : c.saved}</p>}
      <div hidden={page !== "chat"}><ChatView active={page === "chat"} view={view} busy={busy} language={preferences.language} onAddProvider={() => { setPage("providers"); setEditor("new"); setNotice(false); }} onProviders={() => setPage("providers")} onGateway={() => setPage("gateway")} onMarket={() => setPage("market")} /></div>
      {page === "providers" && <section><div className="tagma-heading"><h1>{c.providers}</h1><TextBtn variant="action" disabled={!view || busy || editing} onClick={() => { setEditor("new"); setNotice(false); }}>{c.add}</TextBtn></div>
        {!desktop && <p>{c.previewHint}</p>}
        {desktop && !view && !error && <p role="status">{c.loading}</p>}
        {view && !view.config.providers.length && !editor && <div className="tagma-empty"><h2>{c.empty}</h2><p>{c.emptyHint}</p></div>}
        {!!view?.config.pending_credential_cleanup && <p className="tagma-error">{c.cleanup}</p>}
        <div className="list">{view?.config.providers.map((provider, index) => <div className="row provider tagma-provider" key={provider.id}>
          <div className="who"><div className="name">{provider.name}</div><div className="sub">{provider.base_url}</div><div className="sub">{provider.has_credential ? c.credentialPresent : c.noCredential} · {provider.models.length} models</div></div>
          <div className="tagma-actions"><LibSwitch on={provider.enabled} disabled={busy || editing} aria-label={`${c.enabled}: ${provider.name}`} onClick={() => void save({ name: provider.name, protocol: provider.protocol, base_url: provider.base_url, models: provider.models, enabled: !provider.enabled, id: provider.id, protocol_version: protocolVersion, expected_revision: view.config.desired_revision, credential: null })} />
            <TextBtn disabled={busy || editing || index === 0} aria-label={`${c.up}: ${provider.name}`} onClick={() => void move(provider, -1)}>↑</TextBtn>
            <TextBtn disabled={busy || editing || index === view.config.providers.length - 1} aria-label={`${c.down}: ${provider.name}`} onClick={() => void move(provider, 1)}>↓</TextBtn>
            <TextBtn disabled={busy || editing} onClick={() => { setEditor(provider); setNotice(false); }}>{c.edit}</TextBtn>
            <TextBtn variant="danger" disabled={busy || editing} onClick={() => setDeleting(provider)}>{c.remove}</TextBtn>
          </div>
        </div>)}</div>
        {editor && view && <ProviderForm key={editor === "new" ? "new" : editor.id} provider={editor === "new" ? undefined : editor} revision={view.config.desired_revision} busy={busy} language={preferences.language} onSave={save} onCancel={() => setEditor(null)} />}
        {view && <AppProfiles config={view.config} busy={busy || !!editor} language={preferences.language} onMutate={mutate} onEditingChange={setProfileEditing} />}
        <p className="tagma-footnote">{c.protocolName} · {c.noInference}</p>
        <TextBtn disabled={busy || editing} onClick={() => setPage("gateway")}>{c.gateway}</TextBtn>
      </section>}
      {page === "market" && <section><h1>{c.market}</h1><div className="list prefs"><PrefRow name={c.reachflow} sub={c.reachflowHint}><span>{c.notInstalled}</span></PrefRow><PrefRow name={c.teams} sub={c.teamsHint}><span>{c.notAvailable}</span></PrefRow></div></section>}
      {page === "gateway" && <section><h1>{c.gateway}</h1><div className="list prefs"><PrefRow name={c.gateway} sub={c.runtimeHint}><span>{view ? c[view.runtime.state] : c.unknown}</span></PrefRow><PrefRow name={c.desired}><span>{view?.config.desired_revision ?? c.unknown}</span></PrefRow><PrefRow name={c.effective}><span>{view?.runtime.effective_revision ?? c.unknown}</span></PrefRow>
        {view?.runtime.address && <PrefRow name="URL"><span>{view.runtime.address}</span></PrefRow>}
        {view?.runtime.instance_id && <PrefRow name={view.runtime.owned ? c.owned : c.external}><span className="tagma-instance">{view.runtime.instance_id}</span></PrefRow>}
      </div>{view?.runtime.error && <p role="alert" className="tagma-error">{errorCopy(view.runtime.error,preferences.language)}</p>}
        <div className="tagma-actions"><TextBtn disabled={!desktop || busy || gatewayEditing} onClick={() => void runtimeAction(service.startGateway)}>{c.start}</TextBtn><TextBtn disabled={!view?.runtime.owned || busy || gatewayEditing} onClick={() => void runtimeAction(service.stopGateway)}>{c.stop}</TextBtn><TextBtn disabled={!view?.runtime.instance_id || busy || gatewayEditing} onClick={() => void runtimeAction(service.applyGateway)}>{c.apply}</TextBtn></div>
        {view && <GatewaySettings config={view.config} busy={busy} language={preferences.language} onMutate={mutate} onEditingChange={setGatewayEditing} onError={setError} />}
        <TextBtn disabled={busy || gatewayEditing} onClick={() => setPage("providers")}>{c.back}</TextBtn></section>}
      {page === "settings" && <section><h1>{c.settings}</h1><div className="list prefs">
        <PrefRow name={c.theme}><Segs value={preferences.theme} items={[{ id: "system", label: c.system }, { id: "light", label: c.light }, { id: "dark", label: c.dark }]} onChange={id => changePreferences({ ...preferences, theme: id as ProductTheme })} /></PrefRow>
        <PrefRow name={c.language} wrapVal={false}><LanguagePick label={c.language} value={preferences.language} onChange={language=>changePreferences({...preferences,language})} /></PrefRow>
        <PrefRow name={c.size}><Segs value={preferences.textSize} items={[100, 110, 125, 150].map(n => ({ id: n, label: `${n}%` }))} onChange={id => changePreferences({ ...preferences, textSize: id as Preferences["textSize"] })} /></PrefRow>
        <PrefRow name={c.gateway}><TextBtn onClick={() => setPage("gateway")}>{c.gateway}</TextBtn></PrefRow>
        <PrefRow name={c.version}><span>{view?.product_version ?? "0.2.0-dev.8"}</span></PrefRow>
        <PrefRow name={c.schema}><span>{view?.config.schema_version ?? c.unknown}</span></PrefRow>
      </div><DiagnosticsPanel language={preferences.language} /><TextBtn disabled={!desktop || busy} onClick={() => void service.quit().catch(setError)}>{c.quit}</TextBtn></section>}
      <div className="tagma-revision-line"><span>{c.desired}: {view?.config.desired_revision ?? c.unknown} · {c.effective}: {view?.runtime.effective_revision ?? c.unknown}</span></div>
    </main>
    <dialog ref={deleteDialog} className="tagma-confirm" onCancel={e => { if (busy) e.preventDefault(); else setDeleting(null); }} aria-labelledby="delete-title" aria-describedby="delete-description">
      <h2 id="delete-title">{c.deleteTitle}</h2><p id="delete-description">{deleting?.name} — {c.deleteHint}</p>
      {providerReferences.length > 0 && <div role="status"><h3>{c.referencedBy}</h3><ul>{providerReferences.map(profile => <li key={profile.id}>{profile.name} · {profile.target_app}</li>)}</ul><p>{c.referenceHint}</p></div>}
      <div className="tagma-actions"><TextBtn autoFocus disabled={busy} onClick={() => setDeleting(null)}>{c.cancel}</TextBtn><TextBtn variant="danger" disabled={providerReferences.length > 0} busy={busy} onClick={async () => { if (deleting && view && await mutate(() => service.remove({ protocol_version: protocolVersion, expected_revision: view.config.desired_revision, id: deleting.id }))) setDeleting(null); }}>{c.confirm}</TextBtn></div>
    </dialog>
  </>;
}
