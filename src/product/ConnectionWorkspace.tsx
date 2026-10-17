import { TextBtn } from "../components/TextBtn";
import type { ApplicationView } from "./contract";
import type { ProductLanguage } from "./preferences";
import { copy, errorCopy } from "./copy";

export function ConnectionWorkspace({ view, busy, language, onAddProvider, onProviders, onGateway, onMarket }: {
  view: ApplicationView | null; busy: boolean; language: ProductLanguage;
  onAddProvider: () => void; onProviders: () => void; onGateway: () => void; onMarket: () => void;
}) {
  const c = copy(language);
  if (!view) return <section className="tagma-workspace"><h1>{c.workspaceTitle}</h1><p role="status">{c.loading}</p></section>;
  const providers = view.config.providers;
  const enabled = providers.filter(provider => provider.enabled);
  const models = enabled.flatMap(provider => provider.models.map(model => ({ id: `${provider.id}/${model}`, name: model, provider: provider.name })));
  const profiles = view.config.profiles.filter(profile => !profile.is_global);
  const applied = view.runtime.effective_revision === view.config.desired_revision && view.runtime.state === "running";
  const steps = [providers.length > 0, models.length > 0, models.length > 0 && applied];
  const completed = steps.filter(Boolean).length;
  return <section className="tagma-workspace" aria-label={c.workspaceTitle}>
    <div className="tagma-workspace-intro"><div><p className="tagma-eyebrow">TAGMA · {c.localWorkspace}</p><h1>{c.workspaceTitle}</h1><p>{c.workspaceIntro}</p></div>
      <div className={`tagma-runtime-badge ${view.runtime.state === "running" ? "is-running" : ""}`}><span className="tagma-status-dot" />{c.gateway} · {c[view.runtime.state]}</div>
    </div>
    <div className="tagma-workspace-grid">
      <div className="tagma-setup-card"><div className="tagma-heading"><h2>{c.setupTitle}</h2><span className="sub">{completed} / 3</span></div>
        <div className="tagma-setup-progress" aria-label={`${c.setupTitle}: ${completed}/3`}>{steps.map((done, index) => <span key={index} className={done ? "done" : ""} />)}</div>
        <ol className="tagma-setup-steps">
          <li><span className={`tagma-step-number ${steps[0] ? "done" : ""}`}>{steps[0] ? "✓" : "1"}</span><div><h3>{c.connectProvider}</h3><p>{providers.length ? `${providers.length} ${c.providerCount} · ${enabled.length} ${c.enabled}` : c.connectProviderHint}</p><TextBtn variant={providers.length ? "text" : "action"} disabled={busy} onClick={providers.length ? onProviders : onAddProvider}>{providers.length ? c.manageProviders : c.add}</TextBtn></div></li>
          <li><span className={`tagma-step-number ${steps[1] ? "done" : ""}`}>{steps[1] ? "✓" : "2"}</span><div><h3>{c.configureModels}</h3><p>{models.length ? `${models.length} ${c.configuredModels}` : c.configureModelsHint}</p><TextBtn disabled={busy || !providers.length} onClick={onProviders}>{c.openModelConfiguration}</TextBtn></div></li>
          <li><span className={`tagma-step-number ${steps[2] ? "done" : ""}`}>{steps[2] ? "✓" : "3"}</span><div><h3>{c.confirmGateway}</h3><p>{applied ? c.configurationApplied : c.configurationPending}</p><TextBtn disabled={busy} onClick={onGateway}>{c.openGateway}</TextBtn></div></li>
        </ol>
      </div>
      <div className="tagma-workspace-side"><div className="tagma-summary-card"><div className="tagma-heading"><h2>{c.localStatus}</h2><TextBtn disabled={busy} onClick={onGateway}>{c.details}</TextBtn></div>
        <dl><div><dt>{c.gateway}</dt><dd>{c[view.runtime.state]}</dd></div><div><dt>{c.desired}</dt><dd>{view.config.desired_revision}</dd></div><div><dt>{c.effective}</dt><dd>{view.runtime.effective_revision ?? c.unknown}</dd></div><div><dt>{c.profiles}</dt><dd>{profiles.length} + {c.globalProfile}</dd></div></dl>
        {view.runtime.address && <div className="tagma-address"><span>LOCAL API</span><code>{view.runtime.address}</code></div>}
        {view.runtime.error && <p className="tagma-error" role="status">{errorCopy(view.runtime.error, language)}</p>}
      </div><div className="tagma-summary-card"><h2>{c.workspaceApps}</h2><p>{c.workspaceAppsHint}</p><div className="tagma-actions"><TextBtn disabled={busy} onClick={onProviders}>{c.profiles}</TextBtn><TextBtn disabled={busy} onClick={onMarket}>{c.market}</TextBtn></div></div></div>
    </div>
    <div className="tagma-model-card"><div className="tagma-heading"><div><h2>{c.modelDirectory}</h2><p>{c.modelDirectoryHint}</p></div><span className="tagma-count">{models.length}</span></div>
      {models.length ? <ul className="tagma-model-list">{models.slice(0, 6).map(model => <li key={model.id}><span>{model.name}</span><span>{model.provider}</span><span>{c.manuallyConfigured}</span></li>)}</ul> : <div className="tagma-model-empty"><span className="tagma-model-symbol" aria-hidden="true">＋</span><div><h3>{c.noConfiguredModels}</h3><p>{c.noConfiguredModelsHint}</p></div><TextBtn disabled={busy} onClick={providers.length ? onProviders : onAddProvider}>{providers.length ? c.configureModels : c.add}</TextBtn></div>}
    </div>
    <aside className="tagma-chat-boundary"><div><strong>{c.chatBoundaryTitle}</strong><p>{c.chatBoundaryHint}</p></div><span>{c.noInference}</span></aside>
  </section>;
}
