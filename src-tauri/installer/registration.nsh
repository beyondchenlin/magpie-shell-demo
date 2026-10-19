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
