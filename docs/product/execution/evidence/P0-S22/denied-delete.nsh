; TEST ONLY: substitute one deletion instruction with an actual denied Windows
; deletion on a query-only handle of the same task-owned registration. This
; exercises propagation/recovery; it is not a RegDeleteKey ACL outage test.
Push $0
Push $1
Push $2
System::Call 'advapi32::RegOpenKeyExW(p 0x80000001, w "${UNINSTKEY}", i 0, i 0x101, *p .r1) i .r0'
${If} $0 = 0
  System::Call 'advapi32::RegDeleteValueW(p r1, w "DisplayName") i .r0'
  System::Call 'advapi32::RegCloseKey(p r1)'
${EndIf}
FileOpen $2 "$INSTDIR\p0-s22-delete-code.txt" w
FileWrite $2 "$0"
FileClose $2
${If} $0 != 5
  SetErrorLevel 1700
  Abort
${EndIf}
Pop $2
Pop $1
Pop $0
SetErrors
