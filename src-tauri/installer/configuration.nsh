; Coordinate the same config directory used by app_config_dir on Windows.
; Acceptance packages may override this at compile time; production has no
; command-line or environment override that could bypass the actual target.
Var TagmaConfigurationLease

!macro TagmaRequireConfiguration
  ${If} $TagmaPreflightError != 0
    ; NSIS detail-list rows do not wrap. Keep recovery steps fully readable.
    ${If} $TagmaPreflightError = 1618
      DetailPrint "Configuration is busy or recovery is pending."
      DetailPrint "Finish recovery and requests in the existing Tagma."
      DetailPrint "Quit connected windows; stop gateways through their owner."
      DetailPrint "Then retry. No process was stopped; your data was kept."
    ${ElseIf} $TagmaPreflightError = 1638
      DetailPrint "This package cannot read the configuration or protocol."
      DetailPrint "Use a compatible version. Do not delete or reset data."
    ${Else}
      DetailPrint "Configuration access or inspection failed."
      DetailPrint "Restore folder access and retry. Keep your configuration."
    ${EndIf}
    DetailPrint "No installed program files were changed."
    ${IfNot} ${Silent}
    ${AndIf} $PassiveMode != 1
      MessageBox MB_OK|MB_ICONEXCLAMATION "$TagmaPreflightMessage"
    ${EndIf}
    SetErrorLevel $TagmaPreflightError
    Abort
  ${EndIf}
!macroend

!macro TagmaReleaseConfigurationLease
  ${If} $TagmaConfigurationLease != ""
    System::Call 'kernel32::CloseHandle(p $TagmaConfigurationLease)'
    StrCpy $TagmaConfigurationLease ""
  ${EndIf}
!macroend

!macro TagmaCheckConfiguration
  !ifndef TAGMA_CONFIG_DIRECTORY
    !define TAGMA_CONFIG_DIRECTORY "$APPDATA\${BUNDLEID}"
  !endif
  StrCpy $TagmaPreflightError 1603
  StrCpy $TagmaPreflightMessage "Cannot lock Tagma configuration. Check folder access and retry. No program files were changed."
  ClearErrors
  CreateDirectory "${TAGMA_CONFIG_DIRECTORY}"
  ${IfNot} ${Errors}
    System::Call 'kernel32::CreateFileW(w "${TAGMA_CONFIG_DIRECTORY}\maintenance.lock", i 0xC0000000, i 3, p 0, i 4, i 0x80, p 0) p .r0'
    ${If} $0 != -1
      System::Call '*(p 0, p 0, i 0, i 0, p 0) p .r1'
      ${If} $1 != 0
        System::Call 'kernel32::LockFileEx(p r0, i 3, i 0, i -1, i -1, p r1) i .r2 ?e'
        Pop $3
        System::Free $1
        ${If} $2 != 0
          StrCpy $TagmaConfigurationLease $0
          StrCpy $TagmaPreflightError 0
        ${Else}
          System::Call 'kernel32::CloseHandle(p r0)'
          ${If} $3 = 33
            StrCpy $TagmaPreflightError 1618
            StrCpy $TagmaPreflightMessage "This configuration is in use. Quit all connected Tagma windows after requests finish. Stop independent gateways through their owner, then retry. No process was stopped."
          ${EndIf}
        ${EndIf}
      ${Else}
        System::Call 'kernel32::CloseHandle(p r0)'
      ${EndIf}
    ${EndIf}
  ${EndIf}
  !insertmacro TagmaRequireConfiguration

  ; Use this package's executable, not the installed (possibly older) checker.
  InitPluginsDir
  ClearErrors
  File "/oname=$PLUGINSDIR\tagma-config-check.exe" "${MAINBINARYSRCPATH}"
  !insertmacro TagmaRequireFileWrite
  StrCpy $0 15
  ClearErrors
  ExecWait '"$PLUGINSDIR\tagma-config-check.exe" --check-update-config "${TAGMA_CONFIG_DIRECTORY}"' $0
  StrCpy $TagmaPreflightError 1603
  StrCpy $TagmaPreflightMessage "Cannot inspect Tagma configuration. Keep your data and restore access before retrying. No program files were changed."
  ${IfNot} ${Errors}
    ${If} $0 = 0
      StrCpy $TagmaPreflightError 0
    ${ElseIf} $0 = 13
      StrCpy $TagmaPreflightError 1638
      StrCpy $TagmaPreflightMessage "Configuration schema or gateway protocol is not supported by this package. Use a compatible Tagma version. Do not delete or reset your configuration."
    ${ElseIf} $0 = 16
      StrCpy $TagmaPreflightError 1618
      StrCpy $TagmaPreflightMessage "Configuration recovery is pending. Reopen the existing Tagma version to finish recovery, then quit and retry this update. Your data was kept."
    ${EndIf}
  ${EndIf}
  !insertmacro TagmaRequireConfiguration
!macroend
