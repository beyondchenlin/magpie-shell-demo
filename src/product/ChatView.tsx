import { useEffect, useRef, useState } from "react";
import { TextBtn } from "../components/TextBtn";
import { ConnectionWorkspace } from "./ConnectionWorkspace";
import { PrefRow } from "../components/PrefRow";
import { ModelPick } from "./ModelPick";
import type { ApplicationView, ChatMessage } from "./contract";
import type { ProductLanguage } from "./preferences";
import { errorCopy } from "./copy";
import { protocolVersion, service } from "./service";

type Turn = { id: string; model: string; prompt: string; reply: string; status: "streaming" | "complete" | "cancelled" | "failed"; error?: string; finishReason?: string };
const messages: Record<string, [string, string]> = {
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

export function ChatView(props: { view: ApplicationView | null; busy: boolean; language: ProductLanguage; active: boolean; onAddProvider: () => void; onProviders: () => void; onGateway: () => void; onMarket: () => void }) {
  const { view, language, busy, active } = props;
  const zh = language === "zh";
  const [selected, setSelected] = useState("");
  const [prompt, setPrompt] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [sending, setSending] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef<{ id: string; cancel: boolean } | null>(null);
  const mounted = useRef(true);
  const conversation = useRef<HTMLDivElement>(null);
  const modelSources = new Map<string, string>();
  for (const provider of view?.config.providers ?? []) if (provider.enabled) for (const model of provider.models) if (!model.startsWith("tagma/") && !modelSources.has(model)) modelSources.set(model, provider.name);
  const model = modelSources.has(selected) ? selected : modelSources.keys().next().value ?? "";
  const applied = view?.runtime.state === "running" && view.runtime.effective_revision === view.config.desired_revision;
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; const request = inFlight.current; if (request) { request.cancel = true; void service.cancelChat(request.id).catch(() => {}); } }; }, []);
  useEffect(() => { if (!active && inFlight.current) { inFlight.current.cancel = true; void service.cancelChat(inFlight.current.id).catch(() => {}); } }, [active]);
  useEffect(() => { const node = conversation.current; if (active && node) node.scrollTop = node.scrollHeight; }, [turns, active]);

  async function send() {
    if (!active || busy || !view || !model || !applied || inFlight.current || !prompt.trim()) return;
    const history: ChatMessage[] = turns.filter(turn => turn.status === "complete").flatMap(turn => [{ role: "user", content: turn.prompt }, { role: "assistant", content: turn.reply }]);
    history.push({ role: "user", content: prompt.trim() });
    if (history.length > 128 || new TextEncoder().encode(JSON.stringify(history)).length > 96 * 1024) { setError(failure("CONVERSATION_LIMIT", language)); return; }
    const id = crypto.randomUUID();
    const request = { id, cancel: false };
    inFlight.current = request;
    setSending(true); setStopping(false); setError(null);
    setTurns(previous => [...previous, { id, model, prompt: prompt.trim(), reply: "", status: "streaming" }]); setPrompt("");
    function update(updateTurn: (turn: Turn) => Turn) { if (mounted.current && inFlight.current?.id === id) setTurns(previous => previous.map(turn => turn.id === id ? updateTurn(turn) : turn)); }
    try {
      await service.sendChat({ protocol_version: protocolVersion, request_id: id, expected_revision: view.config.desired_revision, model, messages: history }, event => {
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
    {!applied && <p className="tagma-error" role="status">{zh ? "等待配置生效后可发送。" : "Apply configuration before sending."} <TextBtn onClick={props.onGateway}>{zh ? "查看网关" : "Open gateway"}</TextBtn></p>}
    <div ref={conversation} className="list tagma-conversation" role="log" aria-label={zh ? "对话记录" : "Conversation"} aria-live="polite" aria-relevant="additions text">
      {!turns.length && <div className="empty-state"><b>{zh ? "发送第一条消息" : "Send your first message"}</b><p>{zh ? "内容经本机网关发送至所选供应商，可能产生其 API 费用。" : "Messages go through your local gateway to the selected provider and may incur its API charges."}</p></div>}
      {turns.map(turn => <article key={turn.id} className="tagma-chat-turn"><div className="tagma-chat-user"><strong>{zh ? "你" : "You"}</strong><pre>{turn.prompt}</pre></div><div className="tagma-chat-assistant"><strong>{turn.model}</strong><pre>{turn.reply || (turn.status === "streaming" ? (zh ? "等待首段回复…" : "Waiting for response…") : "")}</pre>{turn.status === "streaming" && <span className="tagma-stream-status">{zh ? "正在回复…" : "Replying…"}</span>}{turn.status === "cancelled" && <p className="sub">{zh ? "已停止 · 保留收到的内容" : "Stopped · Received text retained"}</p>}{turn.finishReason === "length" && <p className="sub">{zh ? "达到模型输出长度上限" : "Model output length limit reached"}</p>}{turn.finishReason === "content_filter" && <p className="sub">{zh ? "回复被供应商内容过滤器限制" : "Response limited by the provider content filter"}</p>}{turn.error && <p role="alert" className="tagma-error">{turn.error}</p>}</div></article>)}
    </div>
    {error && <p className="tagma-error" role="alert">{error}</p>}
    <form className="tagma-composer" onSubmit={event => { event.preventDefault(); void send(); }}><label className="tagma-compose-label" htmlFor="tagma-message">{zh ? "消息" : "Message"}</label><textarea id="tagma-message" className="words" value={prompt} maxLength={12000} disabled={sending} placeholder={zh ? "输入消息，Enter 发送，Shift + Enter 换行" : "Message · Enter to send, Shift + Enter for newline"} onChange={event => setPrompt(event.target.value)} onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); if (!sending) void send(); } }} /><div className="tagma-composer-footer"><span>{zh ? "仅保留在此窗口内；离开对话页会停止本窗口请求。" : "Kept in this window only. Leaving chat stops this window’s request."}</span>{sending ? <TextBtn disabled={stopping} onClick={() => void stop()}>{stopping ? (zh ? "正在停止…" : "Stopping…") : (zh ? "停止回复" : "Stop reply")}</TextBtn> : <TextBtn variant="action" type="submit" disabled={busy || !applied || !prompt.trim()}>{zh ? "发送" : "Send"}</TextBtn>}</div></form>
    <details className="tagma-chat-setup"><summary>{zh ? "接入工作台与运行状态" : "Setup and runtime status"}</summary><ConnectionWorkspace {...props} /></details>
  </section>;
}
