; All-mode release preflight. Do not rely on the interactive directory page.
Var TagmaPreflightError
Var TagmaPreflightMessage
Var TagmaRequiredMiB

!macro TagmaRequirePreflight
  ${If} $TagmaPreflightError != 0
    DetailPrint "$TagmaPreflightMessage"
    ${IfNot} ${Silent}
    ${AndIf} $PassiveMode != 1
      MessageBox MB_OK|MB_ICONEXCLAMATION "$TagmaPreflightMessage"
    ${EndIf}
    SetErrorLevel $TagmaPreflightError
    Abort
  ${EndIf}
!macroend

!macro TagmaCheckArchitecture
  Push $0
  ${GetNativeMachineArchitecture} $0
  StrCpy $TagmaPreflightError 1633
  !if "${ARCH}" == "x64"
    ${If} $0 = 34404
      StrCpy $TagmaPreflightError 0
    ${EndIf}
  !else if "${ARCH}" == "arm64"
    ${If} $0 = 43620
      StrCpy $TagmaPreflightError 0
    ${EndIf}
  !else if "${ARCH}" == "x86"
    ${If} $0 = 332
      StrCpy $TagmaPreflightError 0
    ${EndIf}
  !else
    !error "Unsupported Tagma package architecture"
  !endif
  StrCpy $TagmaPreflightMessage "This package requires native ${ARCH} Windows. Use the Tagma package for this computer's architecture. No program files were changed."
  Pop $0
  !insertmacro TagmaRequirePreflight
!macroend

!macro TagmaCheckAvailableSpace directory payloadKiB
  Push $0
  Push $1
  Push $2
  ; Conservatively reserve the complete payload in BOTH target and temporary
  ; storage, plus 16 MiB per location. Require the combined budget at each path
  ; so co-located volumes cannot double-count the same available bytes. NSIS may
  ; have already unpacked plugins; query the current quota-aware free amount.
  System::Int64Op ${payloadKiB} * 2048
  Pop $2
  System::Int64Op $2 + 33554432
  Pop $2
  System::Int64Op $2 + 1048575
  Pop $TagmaRequiredMiB
  System::Int64Op $TagmaRequiredMiB / 1048576
  Pop $TagmaRequiredMiB
  StrCpy $TagmaPreflightError 1603
  StrCpy $TagmaPreflightMessage "Cannot verify free space at ${directory}. Check that this folder is available and retry. No program files were changed."
  ; Query the actual directory, not its drive-letter root (mount points/quotas).
  System::Call 'kernel32::GetDiskFreeSpaceExW(w "${directory}", *l .r0, p 0, p 0) i .r1'
  ${If} $1 != 0
    System::Int64Op $0 < $2
    Pop $1
    ${If} $1 = 1
      StrCpy $TagmaPreflightError 112
      StrCpy $TagmaPreflightMessage "Not enough free space at ${directory}. This package needs at least $TagmaRequiredMiB MiB of free space for installation and temporary work. Free space or choose another installation folder, then retry. No program files were changed."
    ${Else}
      StrCpy $TagmaPreflightError 0
    ${EndIf}
  ${EndIf}
  Pop $2
  Pop $1
  Pop $0
  !insertmacro TagmaRequirePreflight
!macroend
