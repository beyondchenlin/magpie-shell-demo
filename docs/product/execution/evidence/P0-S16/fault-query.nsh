; Tagma never asks Restart Manager to stop a process. The owning application
; must finish requests and quit before an install, update or uninstall.
!include LogicLib.nsh
!include "Win\RestartManager.nsh"

Var TagmaGuardError
Var TagmaGuardMessage

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
        StrCpy $0 5
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
