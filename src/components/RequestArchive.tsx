import { t } from "../i18n";

/** Magpie renderArchive(): one switch, with its label and native 28×16 track. */
export function RequestArchive({ on, onChange }: { on: boolean; onChange: (on: boolean) => void }) {
  return <span className="led-arch" id="ledArchive">
    <button type="button" className={`led-arch-sw${on ? " on" : ""}`}
      role="switch" aria-checked={on}
      title={t("Keeps each call’s headers and bodies, secrets taken out, in your S3 bucket. Set up Sync and backup in Settings with an s3:// address first")}
      onClick={() => onChange(!on)}>
      <span className="led-arch-name">{t("Request archive")}</span>
      <span className={`lib-switch${on ? " on" : ""}`} aria-hidden="true"><i /></span>
    </button>
  </span>;
}
