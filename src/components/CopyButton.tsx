import { useEffect, useRef, useState } from "react";
import { demoCopy, t } from "../i18n";

/** Magpie `.copy`: one size, icon and 1200ms feedback in Settings and Gateway. */
export function CopyButton({ text, what, onStatus, className = "copy", title }: {
  text: string;
  what: string;
  onStatus?: (message: string, kind?: string) => void;
  className?: string;
  title?: string;
}) {
  const [done, setDone] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const copy = async () => {
    try {
      let copied = false;
      try { await navigator.clipboard.writeText(text); copied = true; } catch { /* Native tries the page's copy command next. */ }
      if (!copied) {
        const previousFocus = document.activeElement as HTMLElement | null;
        const field = document.createElement("textarea");
        field.value = text;
        field.readOnly = true;
        field.className = "sr-only";
        document.body.append(field);
        try {
          field.focus({ preventScroll: true });
          field.select();
          if (!document.execCommand("copy")) throw new Error("Copy failed");
        } finally {
          field.remove();
          if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
        }
      }
      if (!mounted.current) return;
      if (button.current) {
        button.current.classList.remove("done");
        void button.current.offsetWidth;
        button.current.classList.add("done");
      }
      setDone(true);
      onStatus?.(t("{what} copied", { what }), "ok");
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setDone(false), 1200);
    } catch {
      if (mounted.current) onStatus?.(demoCopy("复制失败，请手动复制", "Could not copy; select and copy the value"), "err");
    }
  };

  return (
    <button ref={button} type="button" className={`${className}${done ? " done" : ""}`}
      title={done ? t("Copied") : title || t("Copy")} aria-label={title || `${t("Copy")} ${what}`}
      onClick={(event) => { event.stopPropagation(); void copy(); }}>
      <svg viewBox="0 0 16 16" width={12} height={12} aria-hidden="true">
        <path d={done ? "m3.5 8.5 3 3 6-7" : "M5.5 5.5V3.5h7v7h-2M3.5 5.5h7v7h-7z"}
          fill="none" stroke="currentColor" strokeWidth={done ? 1.7 : 1.5}
          strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
