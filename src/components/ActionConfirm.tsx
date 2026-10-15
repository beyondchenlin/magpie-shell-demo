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
  /** Slot between message and bar (e.g. Keep-skills Tick). */
  extra?: ReactNode;
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
  extra,
  style,
  titleId,
  messageId,
}: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const autoTitle = useId();
  const autoMsg = useId();
  const tid = titleId || autoTitle;
  const mid = messageId || autoMsg;

  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    const cancelBtn = dialog.querySelector<HTMLButtonElement>(
      "button.text:not(.danger-fill)",
    );
    const acceptBtn = dialog.querySelector<HTMLButtonElement>("button.danger-fill");
    const onKey = (event: KeyboardEvent) => {
      event.stopPropagation();
      if (event.key !== "Tab") return;
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
      dialog.removeEventListener("keydown", onKey);
      if (dialog.open) dialog.close();
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
      onCancel={(e) => {
        e.preventDefault();
        onCancel();
      }}
      onClick={(e) => {
        const dialog = e.currentTarget;
        const rect = dialog.getBoundingClientRect();
        if (
          e.target === dialog &&
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
      {extra ? <div className="extra">{extra}</div> : null}
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
