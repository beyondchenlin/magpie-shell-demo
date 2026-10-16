import {
  useEffect,
  useId,
  useRef,
  type CSSProperties,
  type ReactNode,
} from "react";

type Props = {
  open: boolean;
  title: ReactNode;
  message: ReactNode;
  cancelLabel: ReactNode;
  acceptLabel: ReactNode;
  onCancel: () => void;
  onAccept: () => void;
  acceptDisabled?: boolean;
  /** Magpie plugins confirm uses zIndex 50 over sheet. */
  style?: CSSProperties;
  titleId?: string;
  messageId?: string;
};

/**
 * Magpie `dialog.action-confirm` (confirmAction): showModal, Cancel focused,
 * Tab cycles Cancel↔danger, Escape / backdrop → onCancel.
 * CIS §2.7 / §10 — discard / remove / clear confirms. No parallel modal CSS.
 */
export function ActionConfirm({
  open,
  title,
  message,
  cancelLabel,
  acceptLabel,
  onCancel,
  onAccept,
  acceptDisabled,
  style,
  titleId,
  messageId,
}: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const backdropPress = useRef({ down: false, up: false });
  const autoTitle = useId();
  const autoMsg = useId();
  const tid = titleId || autoTitle;
  const mid = messageId || autoMsg;

  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    // showModal's top layer ignores #root's containing block. Match the
    // other preview modals to the simulated window, not the browser canvas.
    const frame = document.body.classList.contains("web") ? document.getElementById("root") : null;
    const place = () => {
      if (!frame) return;
      const r = frame.getBoundingClientRect();
      const frameStyle = getComputedStyle(frame);
      const cssWidth = parseFloat(frameStyle.width) + (frameStyle.boxSizing === "border-box" ? 0 :
        parseFloat(frameStyle.paddingLeft) + parseFloat(frameStyle.paddingRight) +
        parseFloat(frameStyle.borderLeftWidth) + parseFloat(frameStyle.borderRightWidth));
      const scale = r.width / cssWidth || 1;
      const css = (value: number) => `${value / scale}px`;
      dialog.classList.add("framed-confirm");
      const props = {
        "--confirm-x": css(r.left + r.width / 2), "--confirm-y": css(r.top + r.height / 2),
        "--confirm-width": css(Math.max(0, r.width - 32 * scale)),
        "--confirm-height": css(Math.max(0, r.height - 32 * scale)),
        "--confirm-inset-top": css(r.top), "--confirm-inset-left": css(r.left),
        "--confirm-inset-right": css(window.innerWidth - r.right),
        "--confirm-inset-bottom": css(window.innerHeight - r.bottom),
        "--confirm-radius": frameStyle.borderRadius,
      };
      Object.entries(props).forEach(([key, value]) => dialog.style.setProperty(key, value));
    };
    const observer = new ResizeObserver(place);
    if (frame) observer.observe(frame);
    window.addEventListener("resize", place);
    place();
    const cancelBtn = dialog.querySelector<HTMLButtonElement>(
      "button.text:not(.danger-fill)",
    );
    const acceptBtn = dialog.querySelector<HTMLButtonElement>("button.danger-fill");
    const onKey = (event: KeyboardEvent) => {
      event.stopPropagation();
      if (event.key !== "Tab") return;
      if (acceptBtn?.disabled) {
        event.preventDefault();
        cancelBtn?.focus();
        return;
      }
      const boundary = event.shiftKey ? cancelBtn : acceptBtn;
      if (document.activeElement !== boundary) return;
      event.preventDefault();
      (event.shiftKey ? acceptBtn : cancelBtn)?.focus();
    };
    dialog.addEventListener("keydown", onKey);
    const raf = requestAnimationFrame(() => {
      if (!dialog.open) dialog.showModal();
      cancelBtn?.focus({ preventScroll: true });
    });
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener("resize", place);
      dialog.removeEventListener("keydown", onKey);
      if (dialog.open) dialog.close();
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, [open]);

  if (!open) return null;

  return (
    <dialog
      ref={dialogRef}
      className="action-confirm"
      role="alertdialog"
      aria-labelledby={tid}
      aria-describedby={mid}
      style={style}
      onPointerDownCapture={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        backdropPress.current = { down: e.target === e.currentTarget &&
          (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom), up: false };
      }}
      onPointerUpCapture={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        backdropPress.current.up = backdropPress.current.down && e.target === e.currentTarget &&
          (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom);
      }}
      onPointerCancel={() => { backdropPress.current = { down: false, up: false }; }}
      onCancel={(e) => {
        e.preventDefault();
        onCancel();
      }}
      onClick={(e) => {
        const dialog = e.currentTarget;
        const rect = dialog.getBoundingClientRect();
        if (
          backdropPress.current.up && e.target === dialog &&
          (e.clientX < rect.left ||
            e.clientX > rect.right ||
            e.clientY < rect.top ||
            e.clientY > rect.bottom)
        ) {
          onCancel();
        }
      }}
    >
      <h2 id={tid}>{title}</h2>
      <p id={mid}>{message}</p>
      <div className="bar">
        <span className="grow" />
        <button type="button" className="text" onClick={onCancel}>
          {cancelLabel}
        </button>
        <button
          type="button"
          className="text primary danger-fill"
          disabled={acceptDisabled}
          onClick={onAccept}
        >
          {acceptLabel}
        </button>
      </div>
    </dialog>
  );
}
