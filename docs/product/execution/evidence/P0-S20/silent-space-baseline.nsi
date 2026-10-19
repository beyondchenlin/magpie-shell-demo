Unicode true
RequestExecutionLevel user
OutFile "silent-space-baseline.exe"
SilentInstall silent
Section
  AddSize 104857600
  FileOpen $0 "$EXEDIR\baseline-wrote-marker.txt" w
  FileWrite $0 "NSIS silent section executed despite 100 GiB AddSize"
  FileClose $0
SectionEnd