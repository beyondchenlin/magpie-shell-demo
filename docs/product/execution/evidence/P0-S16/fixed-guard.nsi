Unicode true
!include MUI2.nsh
!include FileFunc.nsh
!include x64.nsh
!define MAINBINARYNAME "tagma-desktop"
!include "D:\demo1\tagmaai\src-tauri\installer\process-guard.nsh"
!insertmacro MUI_LANGUAGE "English"
Name "Tagma P0 S16 Fixed Guard Fixture"
OutFile "fixed-guard.exe"
RequestExecutionLevel user
SilentInstall silent
Var PassiveMode
Section
  StrCpy $PassiveMode 1
  !insertmacro TagmaCheckInstallProcesses "$EXEDIR\owned"
  SetErrorLevel 0
SectionEnd
