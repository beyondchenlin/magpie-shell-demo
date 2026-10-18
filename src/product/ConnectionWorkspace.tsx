import { TextBtn } from "../components/TextBtn";
import { PrefRow } from "../components/PrefRow";
import type { ApplicationView } from "./contract";
import type { ProductLanguage } from "./preferences";
import { copy, errorCopy } from "./copy";

export function ConnectionWorkspace({ view, busy, language, configurationError, onAddProvider, onProviders, onGateway, onMarket }: {
  view: ApplicationView | null; busy: boolean; language: ProductLanguage;
  configurationError?: unknown;
  onAddProvider: () => void; onProviders: () => void; onGateway: () => void; onMarket: () => void;
}) {
  const c = copy(language);
  if (!view) return <section aria-label={c.setupTitle}><p role="status">{busy ? c.loading : configurationError != null ? c.configurationUnavailable : c.previewHint}</p></section>;
  const providers=view.config.providers;
  const enabled=providers.filter(provider=>provider.enabled);
  const models=enabled.flatMap(provider=>provider.models.map(model=>({id:`${provider.id}/${model}`,name:model,provider:provider.name})));
  const applied=view.runtime.effective_revision===view.config.desired_revision&&view.runtime.state==="running";
  const steps=[providers.length>0,models.length>0,models.length>0&&applied];
  const titles=[c.connectProvider,c.configureModels,c.confirmGateway];
  const hints=[providers.length?`${providers.length} ${c.providerCount} · ${enabled.length} ${c.enabled}`:c.connectProviderHint,models.length?`${models.length} ${c.configuredModels}`:c.configureModelsHint,applied?c.configurationApplied:c.configurationPending];
  return <section className="tagma-workspace" aria-label={c.setupTitle}>
    <div className="ag-lead guiding"><section className="guide"><div className="guide-head"><b className="guide-h">{c.setupTitle}</b><span className="guide-n">{steps.filter(Boolean).length} / 3</span></div><ol className="guide-steps">{steps.map((done,index)=><li key={index} className={`guide-step${done?" done":""}`}><span className="guide-tick" aria-hidden="true">{done?"✓":index+1}</span><div className="guide-body"><b className="guide-title">{titles[index]}</b><span className="guide-say">{hints[index]}</span><div className="guide-acts">{index===0?<TextBtn variant={providers.length?"text":"primary"} disabled={busy} onClick={providers.length?onProviders:onAddProvider}>{providers.length?c.manageProviders:c.add}</TextBtn>:index===1?<TextBtn disabled={busy||!providers.length} onClick={onProviders}>{c.openModelConfiguration}</TextBtn>:<TextBtn disabled={busy} onClick={onGateway}>{c.openGateway}</TextBtn>}</div></div></li>)}</ol></section></div>
    <div className="list prefs"><PrefRow name={c.gateway} sub={view.runtime.address??c.runtimeHint}><TextBtn disabled={busy} onClick={onGateway}>{c[view.runtime.state]}</TextBtn></PrefRow><PrefRow subClassName="wraps" name={c.profiles} sub={c.workspaceAppsHint}><TextBtn disabled={busy} onClick={onProviders}>{c.details}</TextBtn></PrefRow><PrefRow subClassName="wraps" name={c.market} sub={c.reachflowHint}><TextBtn disabled={busy} onClick={onMarket}>{c.market}</TextBtn></PrefRow></div>
    {view.runtime.error&&<p className="tagma-error" role="alert">{errorCopy(view.runtime.error,language)}</p>}
    <div className="tagma-section-label">{c.modelDirectory}<span>{models.length}</span></div>
    <div className="list">{models.length?models.slice(0,6).map(model=><div className="row" key={model.id}><div className="who"><div className="name">{model.name}</div><div className="sub">{model.provider} · {c.manuallyConfigured}</div></div></div>):<div className="empty-state"><b>{c.noConfiguredModels}</b><span>{c.noConfiguredModelsHint}</span></div>}</div>
    <p className="tagma-footnote">{c.modelDirectoryHint}</p>
  </section>;
}
