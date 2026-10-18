Unicode true
!include MUI2.nsh
!include FileFunc.nsh
!include x64.nsh
!include "D:\demo1\tagmaai\target\debug\nsis\x64\utils.nsh"
!include "Win\RestartManager.nsh"
!addplugindir "C:\Users\ai\AppData\Local\tauri\NSIS\Plugins\x86-unicode\additional"
!insertmacro MUI_LANGUAGE "English"
!include "D:\demo1\tagmaai\target\debug\nsis\x64\English.nsh"
Name "Tagma P0 S16 Legacy Guard Fixture"
OutFile "legacy-guard.exe"
RequestExecutionLevel user
SilentInstall silent
Var PassiveMode
Section
  StrCpy $PassiveMode 1
  !insertmacro CheckIfAppIsRunning "$EXEDIR\owned\tagma-desktop.exe" "Tagma P0 S16 Fixture"
  FileOpen $0 "$EXEDIR\legacy-passed.txt" w
  FileWrite $0 "Legacy guard proceeded."
  FileClose $0
SectionEnd
