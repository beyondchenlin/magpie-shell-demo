import { TextBtn } from "../components/TextBtn";
import { copy, errorCopy } from "./copy";
import type { ProductLanguage } from "./preferences";

export function ConfigurationFailure({ error, busy, language, onRefresh, onDiagnostics, onQuit }: {
  error: unknown; busy: boolean; language: ProductLanguage;
  onRefresh: () => void; onDiagnostics: () => void; onQuit: () => void;
}) {
  const c = copy(language);
  return <div className="tagma-error" role="alert">
    <p>{errorCopy(error, language)}</p>
    <p>{c.startupRecovery}</p>
    <div className="tagma-actions">
      <TextBtn disabled={busy} onClick={onDiagnostics}>{c.diagnostics}</TextBtn>
      <TextBtn disabled={busy} onClick={onRefresh}>{c.refreshStatus}</TextBtn>
      <TextBtn disabled={busy} onClick={onQuit}>{c.quit}</TextBtn>
    </div>
  </div>;
}
