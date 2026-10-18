import { useEffect, useRef, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { TextBtn } from "../components/TextBtn";
import { desktop, service } from "./service";
import { errorCopy } from "./copy";
import type { ProductLanguage } from "./preferences";

export function QuitDialog({ language }: { language: ProductLanguage }) {
  const zh = language === "zh";
  const [open, setOpen] = useState(false);
  const [quitting, setQuitting] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const alert = useRef<HTMLParagraphElement>(null);
  const waiting = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (!desktop) return;
    let live = true;
    const subscriptions = [
      listen("tagma-quit-requested", () => {
        if (!live || dialog.current?.open) return;
        returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        setError(null); setQuitting(false); setOpen(true);
      }),
      listen("tagma-quit-failed", event => {
        if (live) { setError(event.payload); setQuitting(false); }
      }),
    ];
    return () => { live = false; for (const subscription of subscriptions) void subscription.then(unlisten => unlisten()); };
  }, []);
  useEffect(() => {
    if (open) dialog.current?.showModal();
    else if (dialog.current?.open) {
      dialog.current.close();
      if (returnFocus.current?.isConnected) returnFocus.current.focus();
    }
  }, [open]);
  useEffect(() => { if (error) alert.current?.focus(); }, [error]);
  useEffect(() => { if (quitting) waiting.current?.focus(); }, [quitting]);

  async function confirm() {
    if (quitting) return;
    setError(null); setQuitting(true);
    try { await service.confirmQuit(); }
    catch (failure) { setError(failure); setQuitting(false); }
  }
  return <dialog ref={dialog} className="tagma-confirm" aria-labelledby="tagma-quit-title" aria-describedby="tagma-quit-description" onKeyDown={event => {
    if (event.key !== "Tab") return;
    // WebView2 can otherwise move focus to the document after the last button.
    event.preventDefault();
    const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>("button:not(:disabled)"));
    if (buttons.length === 0) { waiting.current?.focus(); return; }
    const index = buttons.findIndex(button => button === document.activeElement);
    const next = index < 0 ? (event.shiftKey ? buttons.length - 1 : 0)
      : (index + (event.shiftKey ? -1 : 1) + buttons.length) % buttons.length;
    buttons[next].focus();
  }} onCancel={event => {
    event.preventDefault(); if (!quitting) setOpen(false);
  }}>
    <h2 id="tagma-quit-title">{zh ? "退出 Tagma" : "Quit Tagma"}</h2>
    <p id="tagma-quit-description">{zh
      ? "退出将停止本桌面拥有的网关：先停止接收新请求，等待活动请求完成，最多 10 秒；超时后取消剩余请求并退出。独立启动的网关会继续运行。尚未保存的编辑将丢失。"
      : "Quitting stops the gateway owned by this desktop: new requests are refused, and active requests may finish for up to 10 seconds. Remaining requests are then cancelled. Independently started gateways keep running. Unsaved edits will be lost."}</p>
    {error != null && <p ref={alert} role="alert" tabIndex={-1} className="tagma-error">{errorCopy(error, language)}</p>}
    {quitting && <p ref={waiting} role="status" tabIndex={-1}>{zh ? "正在等待活动请求并退出…" : "Waiting for active requests and quitting…"}</p>}
    <div className="tagma-actions">
      <TextBtn autoFocus disabled={quitting} onClick={() => setOpen(false)}>{zh ? "继续使用" : "Keep using Tagma"}</TextBtn>
      <TextBtn variant="danger" disabled={quitting} onClick={() => void confirm()}>{zh ? "等待后退出" : "Wait and quit"}</TextBtn>
    </div>
  </dialog>;
}
