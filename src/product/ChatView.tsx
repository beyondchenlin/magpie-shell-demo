import {PackResult} from "./PackResult";
import {ReachFlowForm} from "./ReachFlowForm";
import { useEffect, useRef, useState } from "react";
import { TextBtn } from "../components/TextBtn";
import { ConnectionWorkspace } from "./ConnectionWorkspace";
import { PrefRow } from "../components/PrefRow";
import { ModelPick } from "./ModelPick";
import type { ApplicationView, ChatMessage, ReachFlowRequest } from "./contract";
import type { ProductLanguage } from "./preferences";
import { errorCopy } from "./copy";
import { protocolVersion, service } from "./service";

type Turn = { id: string; model: string; prompt: string; reply: string; serviceOperation?:boolean; status: "streaming" | "complete" | "cancelled" | "failed"; error?: string; finishReason?: string };
const messages: Record<string, [string, string]> = {
  PACK_SAMPLE_COMMAND_REQUIRED:["请输入“本地试跑”。这个入口仅运行固定素材；真实采集请使用市场的授权服务操作。","Enter “local sample”. This route runs fixed material only; use the market for authorized service operations."],
  PACK_UNAVAILABLE:["队员版本不可用，请检查市场中的安装状态。","The pack version is unavailable. Check its installation in the market."],
  PACK_BUSY:["队员正在执行其他操作，请稍后手动重试。","The pack is busy. Retry manually after it finishes."],
  PACK_NETWORK_NOT_ALLOWED:["已安装的队员未允许该服务域名，没有发送网络请求。","The installed package does not permit this service domain. No network request was sent."],
  PACK_INVALID_INPUT:["请检查服务参数。服务路由要求 ReachFlow 是唯一队员步骤并排在第一步。","Check service fields. ReachFlow must be the only pack step and run first."],
  REACHFLOW_RESULT_UNCONFIRMED:["服务操作结果未确认，可能已经提交。请查询原任务，不要立即重复启动。","The service outcome is unconfirmed and may have been submitted. Query the original task before starting again."],
  REACHFLOW_AUTH_REQUIRED:["ReachFlow 拒绝授权，请核对工作区和令牌。","ReachFlow rejected authorization. Check the workspace and token."],
  REACHFLOW_CONFIRMATION_REQUIRED:["请先在 ReachFlow 确认计划、预算和授权。","Confirm the plan, budget and authorization in ReachFlow first."],
  TEAM_DISABLED:["这个小队版本已停用，请选择其他版本。","This team revision is disabled. Select another revision."],
  TEAM_DEPENDENCY_UNAVAILABLE:["小队所需的模型配置已失效，请检查小队版本与供应商。","Team model dependencies are unavailable. Check its revision and providers."],
  TEAM_INTERMEDIATE_EMPTY:["中间步骤没有产生文字，小队已中止，没有继续调用。","An intermediate step returned no text. The team stopped without another call."],
  TEAM_INTERMEDIATE_TRUNCATED:["中间步骤因长度限制未完成，小队已中止，没有继续调用。","An intermediate step was truncated. The team stopped without another call."],
  TEAM_INTERMEDIATE_FILTERED:["中间步骤受到内容过滤，小队已中止，没有继续调用。","An intermediate step was filtered. The team stopped without another call."],
  TEAM_INTERMEDIATE_INCOMPLETE:["中间步骤未确认正常完成，小队已中止。","An intermediate step did not complete normally. The team stopped."],
  TEAM_INTERMEDIATE_UNHANDLED_CALL:["中间步骤含未处理的调用，小队已中止。","An intermediate step contained an unhandled call. The team stopped."],
  TEAM_INTERMEDIATE_REFUSED:["中间步骤拒绝回答，小队已中止。","An intermediate step refused to answer. The team stopped."],
  TEAM_INTERMEDIATE_LIMIT:["中间结果超过大小上限，小队已中止。","An intermediate result exceeded its size limit. The team stopped."],
  MODEL_NOT_FOUND:["模型不在当前运行配置中，请检查供应商。","The model is absent from the running configuration."],
  CONFIG_NOT_APPLIED:["配置尚未生效，请先检查网关。","Apply your saved configuration before sending."],
  UPSTREAM_AUTH_FAILED:["供应商拒绝了凭据，请检查 API Key。","The provider rejected its credential. Check your API key."],
  LOCAL_AUTH_FAILED:["本机网关鉴权失败，请检查网关配置。","Local gateway authentication failed."],
  UPSTREAM_RATE_LIMITED:["供应商限流，请稍后手动重试。","The provider rate limited this request. Retry manually later."],
  UPSTREAM_MODEL_UNAVAILABLE:["供应商无法提供这个模型。","The provider cannot serve this model."],
  UPSTREAM_REQUEST_REJECTED:["供应商拒绝了请求，请检查模型与协议。","The provider rejected the request. Check model and protocol."],
  UPSTREAM_CONNECTION_FAILED:["无法连接供应商，请检查地址和网络。","Cannot connect to the provider. Check its URL and your network."],
  UPSTREAM_STREAM_INTERRUPTED:["回复中途断开，已保留收到的内容；没有自动重试。","The stream was interrupted. Received text is retained; no automatic retry."],
  UPSTREAM_PROTOCOL_ERROR:["供应商响应不符合当前支持的文本协议。","The provider response does not match the supported text protocol."],
  GATEWAY_BUSY:["网关正在处理过多请求，请稍后重试。","The gateway is busy. Retry later."],
  RESPONSE_LIMIT_EXCEEDED:["回复达到本次大小上限，已保留现有内容。","The response reached its size limit. Received text is retained."],
  CONVERSATION_LIMIT:["当前对话达到上下文上限，请开始新对话。","This conversation reached its context limit. Start a new conversation."],
};
function failure(code: string, language: ProductLanguage) {
  if (messages[code]) return messages[code][language === "zh" ? 0 : 1];
  if (code.includes("TIMEOUT") || code === "REQUEST_BUDGET_EXCEEDED") return language === "zh" ? "请求超时，已保留收到的内容；没有自动重试。" : "The request timed out. Received text is retained; no automatic retry.";
  return errorCopy({ code }, language);
}

export function ChatView(props: { selectedModel: string; onModelChange: (model:string)=>void; view: ApplicationView | null; busy: boolean; language: ProductLanguage; active: boolean; configurationError?: unknown; onAddProvider: () => void; onProviders: () => void; onGateway: () => void; onMarket: () => void }) {
  const { view, language, busy, active } = props;
  const zh = language === "zh";
  const selected = props.selectedModel;
  const setSelected = props.onModelChange;
  const composer = useRef<HTMLTextAreaElement>(null);
  const [prompt, setPrompt] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [sending, setSending] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef<{ id: string; cancel: boolean } | null>(null);
  const mounted = useRef(true);
  const conversation = useRef<HTMLDivElement>(null);
  const modelSources = new Map<string, string>();
  for (const provider of view?.config.providers ?? []) if (provider.enabled&&!view?.config.security.revoked_provider_ids.includes(provider.id)) for (const model of provider.models) if (!model.startsWith("tagma/") && !modelSources.has(model)) modelSources.set(model, provider.name);
  for (const team of view?.config.teams ?? []) for (const version of team.published) if (version.enabled&&version.configured_ready) modelSources.set(version.public_id,version.display_name);
  for(const pack of view?.config.installed_packs??[])if(pack.id==="reachflow"&&pack.active_version)modelSources.set("tagma/reachflow",zh?"ReachFlow · 队员":"ReachFlow · teammate");
  const model = modelSources.has(selected) ? selected : modelSources.keys().next().value ?? "";
  const applied = view?.runtime.state === "running" && view.runtime.effective_revision === view.config.desired_revision;
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; const request = inFlight.current; if (request) { request.cancel = true; void service.cancelChat(request.id).catch(() => {}); } }; }, []);
  useEffect(() => { if (!active && inFlight.current) { inFlight.current.cancel = true; void service.cancelChat(inFlight.current.id).catch(() => {}); } }, [active]);
  useEffect(() => { const node = conversation.current; if (active && node) node.scrollTop = node.scrollHeight; }, [turns, active]);

  const teamRecipe=view?.config.teams.flatMap(item=>item.team.versions).find(version=>version.public_id===model)?.recipe;
  const packSteps=teamRecipe?.steps.filter(step=>step.target.kind==="pack")??[];
  const routedPack=model==="tagma/reachflow"?view?.config.installed_packs.find(pack=>pack.id==="reachflow")?.active_version:packSteps.length===1&&teamRecipe?.steps[0].target.kind==="pack"?teamRecipe.steps[0].target.version:undefined;
  const localOnly=view?.config.installed_packs.find(pack=>pack.id==="reachflow")?.versions.find(version=>version.version===routedPack)?.display_name==="ReachFlow 内部本地试跑";
  async function send(reachflow?:ReachFlowRequest) {
    if (!active || busy || !view || !model || !applied || inFlight.current || (!reachflow&&!prompt.trim())) return;
    const operationLabel=reachflow?({task_status:zh?"查询任务":"Query task",task_report:zh?"查看报告":"View report",start_collection:zh?"启动已确认计划":"Start confirmed collection",cancel_task:zh?"请求取消任务":"Request task cancellation"}[reachflow.action.kind]):"";
    const content=reachflow?`ReachFlow · ${operationLabel}`:prompt.trim();
    const history: ChatMessage[] = turns.filter(turn => turn.status === "complete").flatMap(turn => [{ role: "user", content: turn.prompt }, { role: "assistant", content: turn.reply }]);
    history.push({ role: "user", content });
    if (history.length > 128 || new TextEncoder().encode(JSON.stringify(history)).length > 96 * 1024) { setError(failure("CONVERSATION_LIMIT", language)); return; }
    const id = crypto.randomUUID();
    const request = { id, cancel: false };
    inFlight.current = request;
    setSending(true); setStopping(false); setError(null);
    setTurns(previous => [...previous, { id, model, prompt: content, serviceOperation:!!reachflow, reply: "", status: "streaming" }]); if(!reachflow)setPrompt("");
    function update(updateTurn: (turn: Turn) => Turn) { if (mounted.current && inFlight.current?.id === id) setTurns(previous => previous.map(turn => turn.id === id ? updateTurn(turn) : turn)); }
    try {
      await service.sendChat({ protocol_version: protocolVersion, request_id: id, expected_revision: view.config.desired_revision, model, messages: history, reachflow }, event => {
        if (inFlight.current?.id !== id) return;
        if (event.kind === "started" && request.cancel) void service.cancelChat(id).catch(() => {});
        if (event.kind === "delta") update(turn => ({ ...turn, reply: turn.reply + event.text }));
        if (event.kind === "finished") update(turn => ({ ...turn, status: "complete", finishReason: event.reason }));
        if (event.kind === "cancelled") update(turn => ({ ...turn, status: "cancelled" }));
        if (event.kind === "failed") update(turn => ({ ...turn, status: "failed", error: failure(event.code, language) }));
      });
      update(turn => turn.status === "streaming" ? { ...turn, status: "failed", error: failure("UPSTREAM_STREAM_INTERRUPTED", language) } : turn);
    } catch (err) { update(turn => ({ ...turn, status: "failed", error: errorCopy(err, language) })); }
    finally { if (inFlight.current?.id === id) { inFlight.current = null; if (mounted.current) { setSending(false); setStopping(false); } } }
  }
  function editAgain(turn: Turn) {
    if (sending || busy || prompt.trim()) return;
    setPrompt(turn.prompt);
    if (modelSources.has(turn.model)) { setSelected(turn.model); setError(null); }
    else setError(zh ? "原模型已不可用，请选择当前可用模型后再发送。" : "The original model is unavailable. Select an available model before sending.");
    composer.current?.focus();
  }
  async function stop() {
    const request = inFlight.current; if (!request) return;
    request.cancel = true; setStopping(true);
    try { await service.cancelChat(request.id); }
    catch { if (mounted.current) { setStopping(false); setError(zh ? "尚未确认停止，请重试。" : "Stop is not confirmed. Retry."); } }
  }
  if (!view || !modelSources.size) return <ConnectionWorkspace {...props} />;
  return <section className="tagma-chat" aria-label={zh ? "模型对话" : "Model chat"}>
    <div className="tagma-heading"><h1>{zh ? "对话" : "Chat"}</h1><div className="tagma-actions"><TextBtn disabled={busy} onClick={props.onProviders}>{zh ? "管理模型" : "Manage models"}</TextBtn><TextBtn disabled={sending} onClick={() => { setTurns([]); setError(null); }}>{zh ? "新对话" : "New chat"}</TextBtn></div></div>
    <div className="list prefs"><PrefRow name={zh ? "模型" : "Model"} sub={modelSources.get(model)}><ModelPick value={model} models={modelSources} disabled={sending||busy} label={zh?"选择模型":"Select model"} onChange={setSelected}/></PrefRow></div>
    {model==="tagma/reachflow"&&<p className="tagma-footnote">{zh?"本地固定素材入口：输入“本地试跑”，或使用下方按钮。不联网，不产生真实研究成果。":"Local fixed sample: enter “local sample” or use the button. No network or real research output."} <TextBtn disabled={sending||busy} onClick={()=>{setPrompt(zh?"本地试跑":"local sample");composer.current?.focus();}}>{zh?"填入本地试跑命令":"Use local sample command"}</TextBtn></p>}
    {!!routedPack&&<ReachFlowForm key={model} zh={zh} locked={sending||busy||!applied} unavailable={localOnly?(zh?"当前内部包没有网络权限。请安装允许服务域名的受信任队员包。":"This internal package has no network permissions. Install a trusted package permitting the service domain."):undefined} onSubmit={request=>void send(request)}/>}
    {!!routedPack&&model!=="tagma/reachflow"&&<p className="tagma-footnote">{zh?"服务操作只用于本次首个 ReachFlow 步骤；返回结果会交给小队后续模型，访问令牌不会转发。停止回复仅停止本机等待；取消远端任务需明确请求并查询最终状态。":"The explicit service operation applies only to the first ReachFlow step. Its result goes to subsequent models; the token does not. Stopping a reply only stops local waiting; request remote cancellation explicitly and check its final state."}</p>}
    {!applied && <p className="tagma-error" role="status">{zh ? "等待配置生效后可发送。" : "Apply configuration before sending."} <TextBtn onClick={props.onGateway}>{zh ? "查看网关" : "Open gateway"}</TextBtn></p>}
    <div ref={conversation} className="list tagma-conversation" role="log" aria-label={zh ? "对话记录" : "Conversation"} aria-live="polite" aria-relevant="additions text">
      {!turns.length && <div className="empty-state"><b>{zh ? "发送第一条消息" : "Send your first message"}</b><p>{model==="tagma/reachflow"?(zh?"运行已安装的 ReachFlow 固定素材试跑。":"Run the installed ReachFlow fixed sample."):(zh ? "内容经本机网关发送至所选供应商，可能产生其 API 费用。" : "Messages go through your local gateway to the selected provider and may incur its API charges.")}</p></div>}
      {turns.map(turn => <article key={turn.id} className="tagma-chat-turn"><div className="tagma-chat-user"><strong>{zh ? "你" : "You"}</strong><pre>{turn.prompt}</pre></div><div className="tagma-chat-assistant"><strong>{turn.model}</strong>{turn.model==="tagma/reachflow"&&turn.status==="complete"?<PackResult raw={turn.reply} zh={zh}/>:<pre>{turn.reply || (turn.status === "streaming" ? (zh ? "等待首段回复…" : "Waiting for response…") : "")}</pre>}{turn.status === "streaming" && <span className="tagma-stream-status">{zh ? "正在回复…" : "Replying…"}</span>}{turn.status === "cancelled" && <p className="sub">{zh ? "已停止 · 保留收到的内容" : "Stopped · Received text retained"}</p>}{turn.finishReason === "length" && <p className="sub">{zh ? "达到模型输出长度上限" : "Model output length limit reached"}</p>}{turn.finishReason === "content_filter" && <p className="sub">{zh ? "回复被供应商内容过滤器限制" : "Response limited by the provider content filter"}</p>}{turn.error && <p role="alert" className="tagma-error">{turn.error}</p>}{!turn.serviceOperation&&(turn.status === "failed" || turn.status === "cancelled") && <TextBtn disabled={sending || busy || !!prompt.trim()} title={prompt.trim() ? (zh ? "先处理当前输入框中的草稿" : "Finish your current draft first") : undefined} onClick={() => editAgain(turn)}>{zh ? "编辑后重试" : "Edit and retry"}</TextBtn>}</div></article>)}
    </div>
    {error && <p className="tagma-error" role="alert">{error}</p>}
    <form className="tagma-composer" onSubmit={event => { event.preventDefault(); void send(); }}><label className="tagma-compose-label" htmlFor="tagma-message">{zh ? "消息" : "Message"}</label><textarea ref={composer} id="tagma-message" className="words" value={prompt} maxLength={12000} disabled={sending} placeholder={zh ? "输入消息，Enter 发送，Shift + Enter 换行" : "Message · Enter to send, Shift + Enter for newline"} onChange={event => setPrompt(event.target.value)} onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); if (!sending) void send(); } }} /><div className="tagma-composer-footer"><span>{zh ? "仅保留在此窗口内；离开对话页会停止本窗口请求。" : "Kept in this window only. Leaving chat stops this window’s request."}</span>{sending ? <TextBtn disabled={stopping} onClick={() => void stop()}>{stopping ? (zh ? "正在停止…" : "Stopping…") : (zh ? "停止回复" : "Stop reply")}</TextBtn> : <TextBtn variant="action" type="submit" disabled={busy || !applied || !prompt.trim()}>{zh ? "发送" : "Send"}</TextBtn>}</div></form>
    <details className="tagma-chat-setup"><summary>{zh ? "接入工作台与运行状态" : "Setup and runtime status"}</summary><ConnectionWorkspace {...props} /></details>
  </section>;
}
