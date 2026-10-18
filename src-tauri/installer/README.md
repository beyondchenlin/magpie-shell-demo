# Windows installer lifecycle

`installer.nsi` is based on the Tauri CLI **2.12.3** template:
https://github.com/tauri-apps/tauri/blob/tauri-cli-v2.12.3/crates/tauri-bundler/src/bundle/windows/nsis/installer.nsi

Unmodified upstream SHA256: `8AE02C66F8ADB4A0D15D97F984FBACD2B44262D8A4D03FEFAF6177F67F7008E5`.
The upstream MIT license is retained in `LICENSE-MIT`.

Tagma changes:

- Update in place; do not run an old uninstaller before installing. Older
  uninstallers can force-close the desktop without coordinating with its gateway.
- Check both exact installed executable paths through Restart Manager before
  prerequisites and again before program writes or removal. Do not call shutdown,
  kill by name, or stop a gateway owned by another host. Unknown check results fail
  closed. Busy exits with 1618; check failures with 1603.
- Reject binary downgrades in interactive, passive and silent modes (1638).
  Schema recovery remains an explicit application operation.
- Abort on payload/directory/uninstaller write failures (1603), including when
  Ignore was selected in NSIS's file error dialog. Do not update DisplayVersion
  after an incomplete payload write. A complete reinstall is the recovery path.

The user quits the desktop through its existing request-draining flow. A separate
gateway must be stopped by its owner. This guard does **not** establish an atomic
two-executable update transaction or prevent a new process starting after the
check. Interrupted replacement and startup races remain release acceptance gates.
No configuration database or credentials are touched by this guard.

When upgrading Tauri, compare the pinned upstream template with the new one and
retest full interactive/silent install, update, uninstall and downgrade paths.
The stock `utils.nsh` still contains its unused force-shutdown macro; this template
must never invoke it.
