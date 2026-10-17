import { useId, useState, type FormEvent } from "react";
import { TextBtn } from "../components/TextBtn";
import { WordsField } from "../components/WordsField";
import { Tick } from "../components/Tick";
import type { Provider, SaveProvider } from "./contract";
import type { ProductLanguage } from "./preferences";
import { copy } from "./copy";
import { protocolVersion } from "./service";

export function ProviderForm({ provider, revision, busy, language, onSave, onCancel }: {
  provider?: Provider; revision: number; busy: boolean; language: ProductLanguage;
  onSave: (input: SaveProvider) => Promise<boolean>; onCancel: () => void;
}) {
  const c = copy(language);
  const id = useId();
  // The editor deliberately retains its base revision so a concurrent save cannot silently overwrite.
  const [baseRevision] = useState(revision);
  const [name, setName] = useState(provider?.name || "");
  const [url, setUrl] = useState(provider?.base_url || "https://api.openai.com/v1");
  const [models, setModels] = useState(provider?.models.join("\n") || "");
  const [secret, setSecret] = useState("");
  const [enabled, setEnabled] = useState(provider?.enabled ?? true);
  async function submit(event: FormEvent) {
    event.preventDefault();
    const saved = await onSave({ protocol_version: protocolVersion, expected_revision: baseRevision, id: provider?.id ?? null,
      name, protocol: "openai_chat_completions", base_url: url, models: models.split(/\r?\n/).map(x => x.trim()).filter(Boolean), enabled,
      credential: secret || null });
    if (saved) setSecret("");
  }
  return <form className="editor tagma-editor" onSubmit={submit} aria-label={provider ? c.edit : c.add}>
    <fieldset disabled={busy}>
      <label htmlFor={`${id}-name`}>{c.name}</label><WordsField id={`${id}-name`} autoFocus required maxLength={120} value={name} onChange={e => setName(e.target.value)} />
      <span>{c.protocol}</span><span>{c.protocolName}</span>
      <label htmlFor={`${id}-url`}>{c.url}</label><WordsField id={`${id}-url`} type="url" required maxLength={2048} value={url} onChange={e => setUrl(e.target.value)} />
      <label htmlFor={`${id}-models`}>{c.models}</label><textarea id={`${id}-models`} className="words" rows={3} value={models} onChange={e => setModels(e.target.value)} spellCheck={false} />
      <label htmlFor={`${id}-key`}>{c.key}</label><div><WordsField id={`${id}-key`} type="password" autoComplete="new-password" maxLength={2400} value={secret} onChange={e => setSecret(e.target.value)} aria-describedby={`${id}-hint`} /><p className="sub wraps" id={`${id}-hint`}>{c.keyHint}</p></div>
      <span /><Tick checked={enabled} onChange={e => setEnabled(e.target.checked)}>{c.enabled}</Tick>
    </fieldset>
    <p className="sub">{c.cancelHint}</p>
    <div className="tagma-actions"><TextBtn disabled={busy} onClick={() => { setSecret(""); onCancel(); }}>{c.cancel}</TextBtn><TextBtn variant="primary" type="submit" busy={busy}>{busy ? c.saving : c.save}</TextBtn></div>
  </form>;
}
