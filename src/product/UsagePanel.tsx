import { useEffect, useId, useRef, useState } from "react";
import { PrefRow } from "../components/PrefRow";
import { Segs } from "../components/Segs";
import { TextBtn } from "../components/TextBtn";
import { WordsField } from "../components/WordsField";
import type { ConfigView, Provider, UsageDetailsView, UsageMetricKind, UsageReadInfo, UsageRecordState, UsageRequestView } from "./contract";
import { errorCopy } from "./copy";
import type { ProductLanguage } from "./preferences";
import { desktop, service } from "./service";
import { UsageLoader, usageDefault, usageNumber, usageSelection, usageUtc, type UsageData, type UsageDraft, type UsageReadState } from "./usageModel";
import {UsageClearSession,type ClearState} from "./usageClearModel";
import {UsageClearControls} from "./UsageClearControls";
import {BudgetPanel} from "./BudgetPanel";

function stateText(state: UsageRecordState, zh: boolean) {
  return ({ running: ["未终结", "Unfinished"], succeeded: ["成功", "Succeeded"], failed: ["失败", "Failed"], cancelled: ["取消", "Cancelled"], interrupted: ["中断 · 结果未知", "Interrupted · result unknown"] })[state][zh ? 0 : 1];
}
const utc = usageUtc;
function dayText(value: number) { const date = new Date(value); return Number.isNaN(date.getTime()) ? `${value} ms UTC` : date.toISOString().slice(0, 10); }
function providerText(id: string, providers: Provider[]) {
  if(id==="24eb3f13-893a-4fbd-972a-93ea2ac777b1")return "ReachFlow · local pack";
  const name = providers.find(provider => provider.id === id)?.name;
  return name ? `${name} · ${id}` : id;
}
function ReadInfo({ info, zh }: { info: UsageReadInfo; zh: boolean }) {
  return <p className="tagma-footnote">{zh ? "读取于" : "Read at"} {utc(info.observed_ms)} · {zh ? "明细保留起点" : "Detail retention starts"}: {info.detail_start_ms === null ? (zh ? "未知" : "Unknown") : utc(info.detail_start_ms)} · {zh ? "最早保留日汇总" : "Earliest retained daily bucket"}: {info.summary_start_ms === null ? (zh ? "未知" : "Unknown") : dayText(info.summary_start_ms)}</p>;
}
function RequestFacts({ record, providers, zh }: { record: UsageRequestView; providers: Provider[]; zh: boolean }) {
  const unknown = zh ? "未知" : "Unknown";
  return <div className="list prefs">
    <PrefRow name="request_id"><span className="tagma-instance">{record.request_id}</span></PrefRow>
    <PrefRow name={zh ? "模型 / 小队 ID" : "Model / team ID"}><span className="tagma-instance">{record.model}</span></PrefRow>
    <PrefRow name={zh ? "最终供应商" : "Answering provider"}><span className="tagma-instance">{providerText(record.provider_id, providers)}</span></PrefRow>
    <PrefRow name={zh ? "配置 / 小队版本" : "Config / team revision"}><span>{record.config_revision} / {record.team_revision ?? "—"}</span></PrefRow>
    <PrefRow name={zh ? "结果" : "Outcome"} sub={record.error_code ?? undefined}><span>{stateText(record.state, zh)}</span></PrefRow>
    <PrefRow name={zh ? "开始 / 结束（UTC）" : "Started / finished (UTC)"}><span>{utc(record.started_ms)} / {record.finished_ms === null ? unknown : utc(record.finished_ms)}</span></PrefRow>
    <PrefRow name={zh ? "输入 / 输出 token" : "Input / output tokens"}><span>{usageNumber(record.input_tokens, unknown)} / {usageNumber(record.output_tokens, unknown)}</span></PrefRow>
  </div>;
}

export function UsageDetail({ detail, providers, zh }: { detail: UsageDetailsView; providers: Provider[]; zh: boolean }) {
  const unknown = zh ? "未知" : "Unknown";
  return <section aria-label={zh ? "请求详情" : "Request details"}>
    <h2>{zh ? "请求详情" : "Request details"}</h2>
    {!detail.record ? <p role="status">{zh ? "没有保留此请求的明细；请检查 ID 和保留起点。" : "No retained details for this request. Check its ID and the retention start."}</p> : <RequestFacts record={detail.record} providers={providers} zh={zh} />}
    {detail.attempts.some(attempt=>attempt.provider_id==="24eb3f13-893a-4fbd-972a-93ea2ac777b1")&&<p className="tagma-footnote">{zh?"队员步骤的 @ 后缀记录本次固定运行版本，不是新的公开调用入口。旧记录没有版本后缀时，版本未知，不按当前活动版本补填。":"A pack step's @ suffix records its pinned execution version, not a new public route. Older unversioned records remain unknown; the current active version is not substituted."}</p>}
    {detail.attempts.length > 0 && <><h3>{zh ? "执行步骤 / 上游尝试" : "Execution steps / upstream attempts"}</h3><div className="list">{detail.attempts.map(attempt => <div className="row tagma-usage-record" key={attempt.ordinal}><div className="who">
      <div className="name">{attempt.ordinal}. {attempt.model} · {stateText(attempt.state, zh)}</div>
      <div className="sub">{providerText(attempt.provider_id, providers)}</div>
      <div className="sub">{utc(attempt.started_ms)} → {attempt.finished_ms === null ? unknown : utc(attempt.finished_ms)}</div>
      <div className="sub">{zh ? "输入 / 输出 token" : "Input / output tokens"}: {usageNumber(attempt.input_tokens, unknown)} / {usageNumber(attempt.output_tokens, unknown)}{attempt.error_code ? ` · ${attempt.error_code}` : ""}</div>
    </div></div>)}</div></>}
    <ReadInfo info={detail.info} zh={zh} />
  </section>;
}

export function UsageResults({ data, providers, zh, busy, inspect, next }: { data: UsageData; providers: Provider[]; zh: boolean; busy: boolean; inspect: (id: string) => void; next: () => void }) {
  const totals = data.summary?.totals;
  const unknown = zh ? "未知" : "Unknown";
  const filter = data.selection.filter;
  const scope = [filter.provider_id, filter.model, filter.state && stateText(filter.state, zh), filter.error_code, filter.config_revision !== null ? `config ${filter.config_revision}` : null, filter.team_revision !== null ? `team ${filter.team_revision}` : null].filter(value => value !== null).join(" · ");
  return <>
    <p className="tagma-footnote">{zh ? "已应用范围" : "Applied range"}: {dayText(data.selection.range.start_ms)} — {dayText(data.selection.range.end_ms - 1)} UTC{scope ? ` · ${scope}` : ""}</p>
    {data.requests.info.availability === "not_created" ? <p role="status">{zh ? "尚未创建用量库，用量未知。" : "Usage storage has not been created; usage is unknown."}</p> : null}
    {data.summary === null ? <p>{zh ? "当前按错误码筛选明细，日汇总不支持此筛选，因此不显示汇总总计。" : "Error-code filtering applies to details. Daily totals do not support this filter and are not shown."}</p> : <>
      <div className="tagma-section-label">{data.selection.kind === "request" ? (zh ? "逻辑请求汇总" : "Logical request totals") : (zh ? "上游尝试汇总" : "Upstream attempt totals")}</div>
      <div className="list prefs">
        <PrefRow name={zh ? "总数 / 未终结" : "Total / unfinished"}><span>{totals ? `${usageNumber(totals.total, unknown)} / ${usageNumber(totals.unfinished, unknown)}` : unknown}</span></PrefRow>
        <PrefRow name={zh ? "成功 / 失败 / 取消 / 中断" : "Succeeded / failed / cancelled / interrupted"}><span>{totals ? [totals.succeeded, totals.failed, totals.cancelled, totals.interrupted].map(value => usageNumber(value, unknown)).join(" / ") : unknown}</span></PrefRow>
        <PrefRow name={zh ? "输入 / 输出 token 总量" : "Input / output token totals"}><span>{totals ? `${usageNumber(totals.input_total, unknown)} / ${usageNumber(totals.output_total, unknown)}` : unknown}</span></PrefRow>
        <PrefRow name={zh ? "已知输入 / 输出 token" : "Known input / output tokens"}><span>{totals ? `${usageNumber(totals.input_known, unknown)} / ${usageNumber(totals.output_known, unknown)}` : unknown}</span></PrefRow>
        <PrefRow name={zh ? "输入 / 输出未知条数" : "Records with unknown input / output"}><span>{totals ? `${usageNumber(totals.input_unknown, unknown)} / ${usageNumber(totals.output_unknown, unknown)}` : unknown}</span></PrefRow>
        <PrefRow name={zh ? "已完成记录累计耗时（毫秒）" : "Accumulated completed duration (ms)"}><span>{totals ? usageNumber(totals.elapsed_ms, unknown) : unknown}</span></PrefRow>
      </div><ReadInfo info={data.summary.info} zh={zh} />
    </>}
    <div className="tagma-section-label">{zh ? "逻辑请求明细 · 每页最多 32 条" : "Logical request details · up to 32 per page"}</div>
    {data.requests.records.length === 0 && data.requests.info.availability === "available" ? <p role="status">{zh ? "保留明细中没有匹配记录。" : "No matching retained details."}</p> : null}
    <div className="list">{data.requests.records.map(record => <div className="row tagma-usage-record" key={record.request_id}><div className="who">
      <div className="name">{record.model} · {stateText(record.state, zh)}</div>
      <div className="sub">{record.request_id}</div><div className="sub">{providerText(record.provider_id, providers)}</div><div className="sub">{utc(record.started_ms)} · config {record.config_revision}{record.team_revision !== null ? ` · team ${record.team_revision}` : ""}</div>
      <div className="sub">{zh ? "输入 / 输出 token" : "Input / output tokens"}: {usageNumber(record.input_tokens, unknown)} / {usageNumber(record.output_tokens, unknown)}{record.error_code ? ` · ${record.error_code}` : ""}</div>
    </div><TextBtn disabled={busy} aria-label={`${zh ? "查看请求" : "Inspect request"} ${record.request_id}`} onClick={() => inspect(record.request_id)}>{zh ? "详情" : "Details"}</TextBtn></div>)}</div>
    <ReadInfo info={data.requests.info} zh={zh} />
    {data.requests.next_cursor && <TextBtn disabled={busy} onClick={next}>{zh ? "下一页" : "Next page"}</TextBtn>}
  </>;
}

export function UsagePanel({ providers, language, config, busy=false, budgetEditing=false, onMutate, onBudgetEditing }: { providers: Provider[]; language: ProductLanguage;config?:ConfigView;busy?:boolean;budgetEditing?:boolean;onMutate?:(operation:()=>Promise<ConfigView>)=>Promise<boolean>;onBudgetEditing?:(editing:boolean)=>void }) {
  const zh = language === "zh";
  const [draft, setDraft] = useState(usageDefault);
  const [state, setState] = useState<UsageReadState>({ busy: desktop, data: null, detail: null, error: null });
  const [contextAttempt,setContextAttempt]=useState(0);
  const contextPromise=useRef<ReturnType<typeof service.usageContext>|null>(null);
  const [ready,setReady]=useState(false);
  const [clearState,setClearState]=useState<ClearState|null>(null);
  const [clearSession,setClearSession]=useState<UsageClearSession|null>(null);
  const [invalid, setInvalid] = useState(false);
  const [requestId, setRequestId] = useState("");
  const [budgetBusy,setBudgetBusy]=useState(false);
  const [readEpoch,setReadEpoch]=useState(0);
  const loader = useRef<UsageLoader | null>(null);
  const id = useId();
  useEffect(() => {
    if(!desktop)return;
    let live=true;let current:UsageLoader|null=null;let session:UsageClearSession|null=null;
    // StrictMode's effect replay shares only this read-only bootstrap promise.
    contextPromise.current??=service.usageContext();
    void contextPromise.current.then(info=>{
      if(!live)return;
      const next=new UsageClearSession(service,info,localStorage,setClearState,()=>{current?.invalidate();setReadEpoch(epoch=>epoch+1);});session=next;
      current=new UsageLoader(service,setState,()=>next.barrier());loader.current=current;setClearSession(next);setReady(true);setState({busy:false,data:null,detail:null,error:null});
    }).catch(error=>{if(live)setState({busy:false,data:null,detail:null,error});});
    return()=>{live=false;current?.dispose();session?.dispose();if(loader.current===current)loader.current=null;};
  }, [contextAttempt]);
  const disabled = !desktop || !ready || busy || state.busy || budgetBusy || budgetEditing || !!clearState?.busy || !!clearState?.pending || !!clearState?.storageBlocked;
  function change(key: keyof UsageDraft, value: string) { setDraft(previous => ({ ...previous, [key]: value })); setInvalid(false); }
  function refresh() {
    try { const selection = usageSelection(draft); setInvalid(false); void loader.current?.load(selection); }
    catch { setInvalid(true); }
  }
  return <section className="tagma-usage" aria-busy={state.busy}>
    <h1>{zh ? "用量" : "Usage"}</h1>
    <p className="tagma-footnote">{zh ? "仅统计已保留的本机登记记录；UTC 日按开始时间归属。未知 token 不补零，未终结不表示上游仍在运行。逻辑请求和上游尝试是两种口径。" : "Retained local registrations only; UTC days follow start time. Unknown tokens stay unknown. Unfinished does not imply a live upstream. Logical requests and attempts are separate metrics."}</p>
    <p className="tagma-footnote">{zh ? "逻辑请求按最终供应商及公开模型 / 小队 ID 筛选；上游尝试汇总按步骤的实际供应商及模型筛选，两者不合并计数。" : "Request filters match the answering provider and public model / team ID. Attempt totals match the actual step provider and model. These counts are not combined."}</p>
    {!desktop && <p>{zh ? "请在桌面版读取本机用量。预览不会显示模拟用量。" : "Read local usage in the desktop app. This preview does not display simulated usage."}</p>}
    <form onSubmit={event => { event.preventDefault(); refresh(); }}>
      <fieldset disabled={disabled} className="tagma-usage-filters"><legend>{zh ? "筛选（修改后点击读取）" : "Filters (apply with Read)"}</legend><div className="list prefs">
        <PrefRow name={zh ? "开始日期（UTC）" : "Start date (UTC)"}><WordsField type="date" min="1970-01-01" max="9999-12-31" required aria-label={zh ? "开始日期（UTC）" : "Start date (UTC)"} value={draft.from} onChange={event => change("from", event.target.value)} /></PrefRow>
        <PrefRow name={zh ? "结束日期（含当日，UTC）" : "Through date (inclusive, UTC)"}><WordsField type="date" min={draft.from} max="9999-12-31" required aria-label={zh ? "结束日期（UTC）" : "Through date (UTC)"} value={draft.through} onChange={event => change("through", event.target.value)} /></PrefRow>
        <PrefRow name={zh ? "供应商 UUID" : "Provider UUID"} sub={zh ? "留空包含历史和已移除的供应商。" : "Leave empty to include historical and removed providers."}><WordsField maxLength={36} aria-label={zh ? "供应商 UUID" : "Provider UUID"} value={draft.provider} onChange={event => change("provider", event.target.value)} /></PrefRow>
        <PrefRow name={zh ? "模型 / 小队 ID" : "Model / team ID"} sub={zh ? "精确匹配；留空包含全部。" : "Exact match; empty includes all."}><WordsField maxLength={256} aria-label={zh ? "模型 / 小队 ID" : "Model / team ID"} value={draft.model} onChange={event => change("model", event.target.value)} /></PrefRow>
        <PrefRow name={zh ? "结果" : "Outcome"}><select className="words" aria-label={zh ? "结果" : "Outcome"} value={draft.state} onChange={event => change("state", event.target.value)}><option value="">{zh ? "全部" : "All"}</option>{(["running", "succeeded", "failed", "cancelled", "interrupted"] as const).map(value => <option key={value} value={value}>{stateText(value, zh)}</option>)}</select></PrefRow>
        <PrefRow name={zh ? "错误码（仅明细）" : "Error code (details only)"}><WordsField maxLength={64} pattern="[A-Z0-9_]+" aria-label={zh ? "错误码" : "Error code"} value={draft.error} onChange={event => change("error", event.target.value)} /></PrefRow>
        <PrefRow name={zh ? "配置版本" : "Config revision"}><WordsField inputMode="numeric" pattern="[0-9]+" aria-label={zh ? "配置版本" : "Config revision"} value={draft.config} onChange={event => change("config", event.target.value)} /></PrefRow>
        <PrefRow name={zh ? "小队版本" : "Team revision"}><WordsField inputMode="numeric" pattern="[0-9]+" aria-label={zh ? "小队版本" : "Team revision"} value={draft.team} onChange={event => change("team", event.target.value)} /></PrefRow>
        <PrefRow name={zh ? "汇总口径" : "Summary metric"}><Segs value={draft.kind} items={[{ id: "request", label: zh ? "逻辑请求" : "Requests" }, { id: "attempt", label: zh ? "上游尝试" : "Attempts" }]} onChange={value => change("kind", value as UsageMetricKind)} /></PrefRow>
      </div></fieldset>
      <TextBtn type="submit" variant="action" disabled={disabled} busy={state.busy}>{zh ? "读取 / 刷新" : "Read / refresh"}</TextBtn>
    </form>
    {invalid && <p role="alert" className="tagma-error">{zh ? "请检查日期与筛选值；最多查询 366 天，版本须为整数，小队版本须大于 0。" : "Check dates and filters. Choose up to 366 days; revisions must be integers and team revisions positive."}</p>}
    {state.busy && <p role="status">{zh ? "正在读取本机记录…" : "Reading local records…"}</p>}
    {state.error != null && <p role="alert" className="tagma-error">{errorCopy(state.error, language)}</p>}
    {desktop&&!ready&&!state.busy&&<TextBtn onClick={()=>{contextPromise.current=null;setReady(false);setClearState(null);setClearSession(null);setState({busy:true,data:null,detail:null,error:null});setContextAttempt(attempt=>attempt+1);}}>{zh?"重新读取本机状态":"Read local state again"}</TextBtn>}
    {!state.busy && !state.data && !state.error && <p>{zh ? "选择范围后点击读取。" : "Choose a range, then read."}</p>}
    {state.data && <UsageResults data={state.data} providers={providers} zh={zh} busy={state.busy} inspect={id => void loader.current?.inspect(id)} next={() => { if (state.data) void loader.current?.load(state.data.selection, true); }} />}
    <form className="tagma-usage-lookup" onSubmit={event => { event.preventDefault(); void loader.current?.inspect(requestId); }}><label htmlFor={`${id}-request`}>request_id</label><WordsField id={`${id}-request`} value={requestId} maxLength={36} required pattern="[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}" disabled={disabled} onChange={event => setRequestId(event.target.value)} /><TextBtn type="submit" disabled={disabled || !requestId}>{zh ? "查详情" : "Inspect"}</TextBtn></form>
    {state.detail && <UsageDetail detail={state.detail} providers={providers} zh={zh} />}
    <p className="tagma-footnote">{zh ? "默认保留 30 天明细、12 个月日汇总，容量限制也可能缩短保留范围。汇总与明细各有读取时刻，翻页不是冻结快照。" : "Default retention is 30 days of details and 12 months of daily summaries; capacity may shorten it. Each read has its own timestamp; pagination is not a frozen snapshot."}</p>
    {ready&&clearSession&&clearState&&<>
      {config&&onMutate&&onBudgetEditing&&<BudgetPanel config={config} session={clearSession} readEpoch={readEpoch} onBusy={setBudgetBusy} onMutate={onMutate} onEditingChange={onBudgetEditing} busy={busy||state.busy||budgetBusy||clearState.busy||!!clearState.pending||clearState.storageBlocked} language={language}/>}
      <UsageClearControls session={clearSession} state={clearState} busy={busy||state.busy||budgetBusy||budgetEditing} language={language}/>
    </>}
  </section>;
}
