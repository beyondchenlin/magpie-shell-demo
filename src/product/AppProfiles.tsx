import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { TextBtn } from "../components/TextBtn";
import { Tick } from "../components/Tick";
import { WordsField } from "../components/WordsField";
import { PrefRow } from "../components/PrefRow";
import { ModelPick } from "./ModelPick";
import type { AppProfile, ConfigView, SaveAppProfile } from "./contract";
import type { ProductLanguage } from "./preferences";
import { copy } from "./copy";
import { protocolVersion, service } from "./service";

export function AppProfiles({ config, busy, language, onMutate, onEditingChange }: {
  config: ConfigView; busy: boolean; language: ProductLanguage;
  onMutate: (operation: () => Promise<ConfigView>) => Promise<boolean>;
  onEditingChange: (editing: boolean) => void;
}) {
  const c = copy(language);
  const zh = language === "zh";
  const [editor, setEditor] = useState<AppProfile | "new" | null>(null);
  const [deleting, setDeleting] = useState<AppProfile | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (!deleting) return;
    const previous = document.activeElement as HTMLElement | null;
    const element = dialog.current; element?.showModal();
    return () => { element?.close(); previous?.focus(); };
  }, [deleting]);
  function edit(profile: AppProfile | "new" | null) { setEditor(profile); onEditingChange(profile !== null); }
  function remove(profile: AppProfile | null) { setDeleting(profile); onEditingChange(profile !== null); }
  async function save(input: SaveAppProfile) {
    if (!await onMutate(() => service.saveProfile(input))) return false;
    edit(null); return true;
  }
  const providerName = (id: string) => config.providers.find(p => p.id === id)?.name ?? id;
  const order = config.first_cloud_order;
  const appOptions = new Map(config.profiles.filter(profile=>!profile.is_global).map(profile=>[profile.id,profile.target_app]));
  const appLabels = new Map(config.profiles.filter(profile=>!profile.is_global).map(profile=>[profile.id,profile.name]));
  appOptions.set("global",zh?"全局顺序":"Global order");appLabels.set("global",zh?"使用全局供应商与模型序":"Use global provider and model order");
  const orderBusy = busy || !!editor || !!deleting;
  const saveOrder = (next:ConfigView["first_cloud_order"]) => void onMutate(()=>service.saveFirstCloudOrder({protocol_version:protocolVersion,expected_revision:config.desired_revision,order:next}));
  return <div className="tagma-profiles" aria-label={c.profiles}>
    <div className="tagma-heading"><h2>{c.profiles}</h2><TextBtn disabled={busy || !!editor || !!deleting} onClick={() => edit("new")}>{c.addProfile}</TextBtn></div>
    <p className="sub wraps">{c.profileHint}</p>
    <div className="list prefs"><PrefRow name={zh?"自动选脑顺序来源":"Automatic brain order"} subClassName="wraps" sub={zh?"默认使用全局供应商及模型顺序。明确不使用全局序时，在此选择一个默认 App；没有近期可用模型时直接拒绝调用。":"Use global provider and model order, or explicitly replace it with a chosen default App. Reject calls when no recent healthy model qualifies."}><ModelPick value={order.kind==="global"?"global":order.profile_id} models={appOptions} labels={appLabels} disabled={orderBusy} label={zh?"选择自动选脑顺序来源":"Choose automatic brain order"} onChange={value=>saveOrder(value==="global"?{kind:"global"}:{kind:"default_app",profile_id:value})}/></PrefRow></div>
    <div className="list">{config.profiles.map(profile => <div className="row provider tagma-provider" key={profile.id}>
      <div className="who"><div className="name">{profile.is_global ? c.globalProfile : profile.name}</div>
        <div className="sub">{profile.is_global ? c.inheritOrder : `${profile.target_app} · ${profile.use_global_order ? c.inheritOrder : c.providerSelection}`}</div>
        <div className="sub">{profile.provider_ids.map(providerName).join(" → ") || c.profileEmpty}</div></div>
      {!profile.is_global && <div className="tagma-actions"><TextBtn disabled={busy || !!editor || !!deleting} aria-label={`${c.editProfile}: ${profile.name}`} onClick={() => edit(profile)}>{c.edit}</TextBtn>
        <TextBtn variant="danger" disabled={busy || !!editor || !!deleting} aria-label={`${c.profileDelete}: ${profile.name}`} onClick={() => remove(profile)}>{c.remove}</TextBtn></div>}
    </div>)}</div>
    {editor && <ProfileForm key={editor === "new" ? "new" : editor.id} profile={editor === "new" ? undefined : editor} config={config} busy={busy} language={language} onSave={save} onCancel={() => edit(null)} />}
    <dialog ref={dialog} className="tagma-confirm" aria-labelledby="profile-delete-title" onCancel={event => { if (busy) event.preventDefault(); else remove(null); }}>
      <h2 id="profile-delete-title">{c.profileDelete}</h2><p>{deleting?.name}</p><div className="tagma-actions"><TextBtn autoFocus disabled={busy} onClick={() => remove(null)}>{c.cancel}</TextBtn>
        <TextBtn variant="danger" busy={busy} onClick={async () => { if (deleting && await onMutate(() => service.deleteProfile({ protocol_version: protocolVersion, expected_revision: config.desired_revision, id: deleting.id }))) remove(null); }}>{c.remove}</TextBtn></div>
    </dialog>
  </div>;
}

function ProfileForm({ profile, config, busy, language, onSave, onCancel }: {
  profile?: AppProfile; config: ConfigView; busy: boolean; language: ProductLanguage;
  onSave: (input: SaveAppProfile) => Promise<boolean>; onCancel: () => void;
}) {
  const id = useId(); const c = copy(language);
  const [baseRevision] = useState(config.desired_revision);
  const [name, setName] = useState(profile?.name ?? "");
  const [target, setTarget] = useState(profile?.target_app ?? "");
  const [inherit, setInherit] = useState(profile?.use_global_order ?? true);
  const [selected, setSelected] = useState(profile?.provider_ids ?? config.providers.map(p => p.id));
  const ordered = inherit ? config.providers.filter(p => selected.includes(p.id)).map(p => p.id) : selected;
  function move(providerId: string, direction: -1 | 1) {
    const next = [...selected]; const from = next.indexOf(providerId); const to = from + direction;
    if (from < 0 || to < 0 || to >= next.length) return;
    [next[from], next[to]] = [next[to], next[from]]; setSelected(next);
  }
  async function submit(event: FormEvent) {
    event.preventDefault(); await onSave({ protocol_version: protocolVersion, expected_revision: baseRevision, id: profile?.id ?? null, name, target_app: target, provider_ids: ordered, use_global_order: inherit });
  }
  return <form className="editor tagma-editor" aria-label={profile ? c.editProfile : c.addProfile} onSubmit={submit}>
    <fieldset disabled={busy}><label htmlFor={`${id}-name`}>{c.name}</label><WordsField id={`${id}-name`} autoFocus required maxLength={120} value={name} onChange={e => setName(e.target.value)} />
      <label htmlFor={`${id}-target`}>{c.targetApp}</label><WordsField id={`${id}-target`} required maxLength={80} value={target} onChange={e => setTarget(e.target.value)} />
      <span /><Tick checked={inherit} onChange={e => { setSelected(ordered); setInherit(e.target.checked); }}>{c.inheritOrder}</Tick>
      <span>{c.providerSelection}</span><div className="tagma-profile-selection">{config.providers.map(provider => <Tick key={provider.id} checked={selected.includes(provider.id)} onChange={e => setSelected(previous => e.target.checked ? [...previous, provider.id] : previous.filter(value => value !== provider.id))}>{provider.name}</Tick>)}</div>
    </fieldset>
    <ol className="tagma-profile-order">{ordered.map((providerId, index) => <li key={providerId}><span>{config.providers.find(p => p.id === providerId)?.name ?? providerId}</span>{!inherit && <div className="tagma-actions">
      <TextBtn disabled={busy || index === 0} aria-label={`${c.up}: ${config.providers.find(p => p.id === providerId)?.name}`} onClick={() => move(providerId, -1)}>↑</TextBtn>
      <TextBtn disabled={busy || index === ordered.length - 1} aria-label={`${c.down}: ${config.providers.find(p => p.id === providerId)?.name}`} onClick={() => move(providerId, 1)}>↓</TextBtn></div>}</li>)}</ol>
    <p className="sub">{c.cancelHint}</p><div className="tagma-actions"><TextBtn disabled={busy} onClick={onCancel}>{c.cancel}</TextBtn><TextBtn variant="primary" type="submit" busy={busy}>{busy ? c.saving : c.save}</TextBtn></div>
  </form>;
}
