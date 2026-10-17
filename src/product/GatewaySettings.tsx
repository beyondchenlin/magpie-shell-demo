import { useEffect, useId, useState, type FormEvent } from "react";
import { TextBtn } from "../components/TextBtn";
import { Tick } from "../components/Tick";
import { WordsField } from "../components/WordsField";
import { PrefRow } from "../components/PrefRow";
import { copyText } from "../lib/copyText";
import type { ConfigView, SaveGateway } from "./contract";
import type { ProductLanguage } from "./preferences";
import { copy } from "./copy";
import { protocolVersion, service } from "./service";

export function GatewaySettings({ config, busy, language, onMutate, onEditingChange, onError }: {
  config: ConfigView; busy: boolean; language: ProductLanguage;
  onMutate: (operation: () => Promise<ConfigView>) => Promise<boolean>;
  onEditingChange: (editing: boolean) => void; onError: (error: unknown) => void;
}) {
  const c = copy(language);
  const [editing, setEditing] = useState(false);
  const [storedSecret, setSecret] = useState<{value:string;stamp:string} | null>(null);
  const stamp=`${config.desired_revision}:${config.security.revision}`;
  const secret=storedSecret?.stamp===stamp?storedSecret.value:null;
  const [working, setWorking] = useState(false);
  const [copiedStamp,setCopied] = useState<string|null>(null);
  const copied=copiedStamp===stamp;
  useEffect(() => {
    if (!storedSecret) return;
    const timer = setTimeout(() => setSecret(null), 30_000); return () => clearTimeout(timer);
  }, [storedSecret]);
  function edit(value: boolean) { setSecret(null); setCopied(null); setEditing(value); onEditingChange(value); }
  async function tokenAction(show: boolean) {
    setWorking(true); setCopied(null);
    try {
      const value = await service.revealToken();
      if (show) setSecret({value,stamp});
      else if (await copyText(value)) setCopied(stamp);
      else onError({ code: "CLIPBOARD_UNCONFIRMED" });
    } catch (error) { onError(error); }
    finally { setWorking(false); }
  }
  async function save(input: SaveGateway) { if (await onMutate(() => service.saveGateway(input))) edit(false); }
  return <div className="tagma-profiles" aria-label={c.gatewaySettings}>
    <div className="tagma-heading"><h2>{c.gatewaySettings}</h2><TextBtn disabled={busy || working || editing} onClick={() => edit(true)}>{c.editGateway}</TextBtn></div>
    <div className="list prefs"><PrefRow name={c.port}><span>{config.gateway.port}</span></PrefRow>
      <PrefRow name={c.auth}><span>{config.gateway.auth_enabled ? c.authOn : c.authOff}</span></PrefRow>
      <PrefRow name={c.token} sub={c.tokenHint}><span>{config.gateway.has_access_token ? c.credentialPresent : c.tokenMissing}</span></PrefRow>
    </div><p className="tagma-footnote">{c.portHint}</p>
    {editing && <GatewayForm config={config} busy={busy} language={language} onSave={save} onCancel={() => edit(false)} />}
    {!editing && <div className="tagma-actions">
      {!config.gateway.has_access_token ? <TextBtn busy={busy} disabled={working} onClick={() => void onMutate(() => service.initializeToken({ protocol_version: protocolVersion, expected_revision: config.desired_revision }))}>{c.initializeToken}</TextBtn> : <>
        <TextBtn disabled={busy || working || config.security.gateway_token_revoked} onClick={() => secret ? setSecret(null) : void tokenAction(true)}>{secret ? c.hideToken : c.showToken}</TextBtn>
        <TextBtn disabled={busy || working || config.security.gateway_token_revoked} onClick={() => void tokenAction(false)}>{copied ? c.copied : c.copyToken}</TextBtn>
      </>}
    </div>}
    {secret && <output className="tagma-secret" aria-label={c.token}>{secret}</output>}
  </div>;
}

function GatewayForm({ config, busy, language, onSave, onCancel }: {
  config: ConfigView; busy: boolean; language: ProductLanguage;
  onSave: (input: SaveGateway) => Promise<void>; onCancel: () => void;
}) {
  const c = copy(language); const id = useId();
  const [baseRevision] = useState(config.desired_revision);
  const [port, setPort] = useState(String(config.gateway.port));
  const [auth, setAuth] = useState(config.gateway.auth_enabled);
  async function submit(event: FormEvent) { event.preventDefault(); await onSave({ protocol_version: protocolVersion, expected_revision: baseRevision, port: Number(port), auth_enabled: auth }); }
  return <form className="editor tagma-editor" aria-label={c.editGateway} onSubmit={submit}>
    <fieldset disabled={busy}><label htmlFor={id}>{c.port}</label><WordsField id={id} autoFocus required type="number" min={1} max={65535} step={1} value={port} onChange={e => setPort(e.target.value)} />
      <span /><Tick checked={auth} onChange={e => setAuth(e.target.checked)}>{c.auth}</Tick></fieldset>
    {!auth && <p role="status" className="tagma-banner">{c.authHint}</p>}
    <div className="tagma-actions"><TextBtn disabled={busy} onClick={onCancel}>{c.cancel}</TextBtn><TextBtn type="submit" variant="primary" busy={busy}>{busy ? c.saving : c.save}</TextBtn></div>
  </form>;
}
