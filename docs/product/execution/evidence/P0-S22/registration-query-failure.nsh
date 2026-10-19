; NSIS registry writes set the error flag but do not stop installation.
; Report a partial installation and keep a usable complete-installer recovery
; path instead of publishing success after failed installation registration.
!macro TagmaRequireRegistrationWrite
  ${If} ${Errors}
    DetailPrint "Tagma installation registration is incomplete."
    DetailPrint "Windows could not save installation information."
    DetailPrint "Program files may already be updated."
    DetailPrint "Resolve write access, then run this complete installer again."
    DetailPrint "User configuration was not removed."
    ${IfNot} ${Silent}
    ${AndIf} $PassiveMode != 1
      MessageBox MB_OK|MB_ICONEXCLAMATION "Windows could not save Tagma installation information.$\r$\nProgram files may already be updated.$\r$\nResolve write access, then run this complete installer again.$\r$\nUser configuration was not removed."
    ${EndIf}
    SetErrorLevel 1603
    Abort
  ${EndIf}
!macroend

!macro TagmaWriteRegStr root key name value
  ClearErrors
  WriteRegStr ${root} "${key}" "${name}" "${value}"
  !insertmacro TagmaRequireRegistrationWrite
!macroend

!macro TagmaWriteRegDWORD root key name value
  ClearErrors
  WriteRegDWORD ${root} "${key}" "${name}" "${value}"
  !insertmacro TagmaRequireRegistrationWrite
!macroend

Var TagmaRegistrationDeleteFailed
Var TagmaRegistrationRecoveryResult
Var TagmaRegistrationRecoveryMessage

!macro TagmaDeleteUninstallRegistration
  Push $0
  Push $1
  Push $2
  StrCpy $TagmaRegistrationDeleteFailed 0
  StrCpy $0 0 ; TEST ONLY invalid null registry root -> actual API error
  !if "${INSTALLMODE}" == "perMachine"
    StrCpy $0 0x80000002 ; HKEY_LOCAL_MACHINE
  !else if "${INSTALLMODE}" == "both"
    ${If} $MultiUser.InstallMode == "AllUsers"
      StrCpy $0 0x80000002
    ${EndIf}
  !endif
  ; Match SetContext's registry view. Missing registration permits a retry of
  ; an interrupted uninstall; access/query errors must not be treated as absent.
  !if "${ARCH}" == "x64"
    StrCpy $2 0x101 ; KEY_QUERY_VALUE | KEY_WOW64_64KEY
  !else if "${ARCH}" == "arm64"
    StrCpy $2 0x101
  !else
    StrCpy $2 0x201 ; KEY_QUERY_VALUE | KEY_WOW64_32KEY
  !endif
  System::Call 'advapi32::RegOpenKeyExW(p r0, w "${UNINSTKEY}", i 0, i r2, *p .r1) i .r2'
  ${If} $2 = 0
    System::Call 'advapi32::RegCloseKey(p r1)'
    ClearErrors
    DeleteRegKey SHCTX "${UNINSTKEY}"
    ${If} ${Errors}
      StrCpy $TagmaRegistrationDeleteFailed 1
    ${EndIf}
  ${ElseIf} $2 != 2
  ${AndIf} $2 != 3
    StrCpy $TagmaRegistrationDeleteFailed 1
  ${EndIf}
  Pop $2
  Pop $1
  Pop $0
  ${If} $TagmaRegistrationDeleteFailed = 1
    ; Payload removal and the old uninstaller deletion were already checked.
    ; NSIS runs the uninstaller from a temporary copy. Restore that same binary
    ; so a retained Windows entry still has a recovery target. Never overwrite
    ; a file which appeared after deletion. A failed copy is reported honestly.
    System::Call 'kernel32::CopyFileW(w "$EXEPATH", w "$INSTDIR\uninstall.exe", i 1) i .s'
    Pop $TagmaRegistrationRecoveryResult
    ${If} $TagmaRegistrationRecoveryResult != 0
      StrCpy $TagmaRegistrationRecoveryMessage "The uninstall program was restored. Resolve registry access and retry uninstall, or run the complete installer to restore Tagma."
    ${Else}
      StrCpy $TagmaRegistrationRecoveryMessage "The uninstall program could not be restored. Resolve file and registry access, then run the complete installer to restore Tagma."
    ${EndIf}
    DetailPrint "Tagma removal is incomplete: Windows installation registration could not be removed."
    DetailPrint "$TagmaRegistrationRecoveryMessage"
    DetailPrint "User configuration was not removed."
    ${IfNot} ${Silent}
    ${AndIf} $PassiveMode != 1
      MessageBox MB_OK|MB_ICONEXCLAMATION "Windows installation registration could not be removed.$\r$\n$TagmaRegistrationRecoveryMessage$\r$\nUser configuration was not removed."
    ${EndIf}
    SetErrorLevel 1603
    Abort
  ${EndIf}
!macroend
