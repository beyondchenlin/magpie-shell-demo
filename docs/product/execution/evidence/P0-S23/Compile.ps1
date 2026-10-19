$ErrorActionPreference='Stop'
Set-Location -LiteralPath 'D:/demo1/tagmaai/target/debug/nsis/x64'
foreach($name in @('isolated-dev39','future-dev39','normal-final39')) {
 & 'C:/Users/ai/AppData/Local/tauri/NSIS/makensis.exe' /NOCD /V2 ('D:/demo1/tagmaai/.cache/p0-s23-config-preflight/'+$name+'.nsi') *> ('D:/demo1/tagmaai/.cache/p0-s23-config-preflight/'+$name+'-final-build.log')
 if($LASTEXITCODE){throw ('NSIS failed '+$name)}
 Write-Output ('Built '+$name)
}
