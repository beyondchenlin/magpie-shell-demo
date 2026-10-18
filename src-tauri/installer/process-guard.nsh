; Tagma never asks Restart Manager to stop a process. The owning application
; must finish requests and quit before an install, update or uninstall.
!include LogicLib.nsh
!include "Win\RestartManager.nsh"

Var TagmaGuardError
Var TagmaGuardMessage
Var TagmaInstallationLease

; Serialize mutating installers and cooperate with desktop/gateway shared leases.
; The zero-byte marker is intentionally retained: unlinking a lock can let a
; second participant lock a different file under the same name.
!macro TagmaAcquireInstallationLease
  Push $0
  Push $1
  Push $2
  StrCpy $TagmaGuardError 1603
  StrCpy $TagmaGuardMessage "Cannot acquire the Tagma update lock. No program files were changed. Check access to the installation folder and retry."
  ClearErrors
  CreateDirectory "$INSTDIR"
  ${IfNot} ${Errors}
    ; OPEN_ALWAYS, read/write, share read/write but never delete the lock identity.
    System::Call 'kernel32::CreateFileW(w "$INSTDIR\.tagma-install.lock", i 0xC0000000, i 3, p 0, i 4, i 0x80, p 0) p .r0'
    ${If} $0 != -1
      ; A zeroed native OVERLAPPED, kept until this synchronous call completes.
      System::Call '*(p 0, p 0, i 0, i 0, p 0) p .r1'
      ${If} $1 != 0
        ; LOCKFILE_EXCLUSIVE_LOCK | LOCKFILE_FAIL_IMMEDIATELY, full byte range.
        System::Call 'kernel32::LockFileEx(p r0, i 3, i 0, i -1, i -1, p r1) i .r2 ?e'
        Pop $TagmaGuardError
        System::Free $1
        ${If} $2 != 0
          StrCpy $TagmaInstallationLease $0
          StrCpy $TagmaGuardError 0
        ${Else}
          System::Call 'kernel32::CloseHandle(p r0)'
          ${If} $TagmaGuardError = 33
            StrCpy $TagmaGuardError 1618
            StrCpy $TagmaGuardMessage "Tagma, its gateway, or another installer is using this installation. Quit Tagma through Settings, wait for the other operation to finish, then retry. No process was stopped."
          ${Else}
            StrCpy $TagmaGuardError 1603
          ${EndIf}
        ${EndIf}
      ${Else}
        System::Call 'kernel32::CloseHandle(p r0)'
      ${EndIf}
    ${EndIf}
  ${EndIf}
  Pop $2
  Pop $1
  Pop $0
  ${If} $TagmaGuardError != 0
    DetailPrint "$TagmaGuardMessage"
    ${IfNot} ${Silent}
    ${AndIf} $PassiveMode != 1
      MessageBox MB_OK|MB_ICONEXCLAMATION "$TagmaGuardMessage"
    ${EndIf}
    SetErrorLevel $TagmaGuardError
    Abort
  ${EndIf}
!macroend

!macro TagmaReleaseInstallationLease
  ${If} $TagmaInstallationLease != ""
    ; Closing the non-inherited handle releases its byte-range lock, including
    ; on error exits. The OS also releases it after an interrupted process.
    System::Call 'kernel32::CloseHandle(p $TagmaInstallationLease)'
    StrCpy $TagmaInstallationLease ""
  ${EndIf}
!macroend

!macro TagmaCheckInstallProcesses directory
  Push $0
  Push $1
  Push $2
  Push $3
  Push $R0
  StrCpy $TagmaGuardError 1603
  StrCpy $TagmaGuardMessage "Cannot verify whether Tagma is running. No program files were changed. Close Tagma and retry."
  !insertmacro RestartManager_StartSession $R0
  ${If} $R0 != ""
    !insertmacro RestartManager_RegisterFile $R0 "${directory}\${MAINBINARYNAME}.exe"
    ${If} $0 = 0
      !insertmacro RestartManager_RegisterFile $R0 "${directory}\tagma-gateway.exe"
      ${If} $0 = 0
        ; Initialize the input count explicitly. A null output array is a size query.
        StrCpy $2 0
        System::Call 'RSTRTMGR::RmGetList(i R0, *i .r1, *i r2, p 0, *i .r3) i .r0'
        ${If} $0 = 0
          StrCpy $TagmaGuardError 0
        ${ElseIf} $0 = 234
          StrCpy $TagmaGuardError 1618
          StrCpy $TagmaGuardMessage "Tagma or its gateway is still running from this installation. Use Tagma > Settings > Quit and wait for active requests to finish. If a separate gateway is running, stop it through its owner, then retry. No process was stopped and no program files were changed."
        ${EndIf}
      ${EndIf}
    ${EndIf}
    !insertmacro RestartManager_EndSession $R0
  ${EndIf}
  Pop $R0
  Pop $3
  Pop $2
  Pop $1
  Pop $0
  ${If} $TagmaGuardError != 0
    DetailPrint "$TagmaGuardMessage"
    ${IfNot} ${Silent}
    ${AndIf} $PassiveMode != 1
      MessageBox MB_OK|MB_ICONEXCLAMATION "$TagmaGuardMessage"
    ${EndIf}
    SetErrorLevel $TagmaGuardError
    Abort
  ${EndIf}
!macroend

; Delete is allowed to fail without stopping NSIS. Do not remove the recovery
; entry or report success when a payload (or the uninstaller) remains locked.
; Missing files are allowed so an interrupted uninstall can be retried.
!macro TagmaDeleteProgramFile path
  ClearErrors
  Delete "${path}"
  ${If} ${Errors}
    DetailPrint "Tagma removal is incomplete. A program file could not be deleted."
    DetailPrint "Close Tagma and programs holding its files, then retry uninstall."
    DetailPrint "To restore Tagma, run the complete installer for this version."
    DetailPrint "The uninstall entry and user configuration were kept."
    DetailPrint "File: ${path}"
    SetErrorLevel 1603
    Abort
  ${EndIf}
!macroend

; NSIS permits Ignore on an extraction error. It sets the error flag but would
; otherwise continue and record a newer DisplayVersion without installing it.
; Keep the existing registration until every payload and the uninstaller exist.
!macro TagmaRequireFileWrite
  ${If} ${Errors}
    DetailPrint "Tagma installation is incomplete because a program file could not be written. Quit all Tagma instances and separately started gateways, then run this complete installer again. User configuration was not removed."
    SetErrorLevel 1603
    Abort
  ${EndIf}
!macroend
