$ErrorActionPreference='Stop'
$task='D:\demo1\tagmaai\.cache\p0-s20-installer-preflight'
$root='C:\Users\ai\AppData\Local\Temp\tagma-p0-s09-128d7053-66d3-424a-8ec2-90640d06bf88'
$install=Join-Path $root 'install-p0s16'
if([IO.File]::ReadAllText((Join-Path $task 'owner.txt')) -cne 'tagma-p0-s20/installer-preflight/v1' -or [IO.File]::ReadAllText((Join-Path $root 'owner.txt')) -cne 'tagma-p0-s09/native/v1'){throw 'Owner mismatch'}
if(@(Get-Process tagma-desktop,tagma-gateway -ErrorAction SilentlyContinue|Where-Object {$_.Path -like "$root\*"}).Count){throw 'Fixture still running'}
function State {
 $files=@(foreach($relative in @('install-p0s16/tagma-desktop.exe','install-p0s16/tagma-gateway.exe','install-p0s16/uninstall.exe','data/config.sqlite3','data/config.sqlite3-wal','data/runtime.json')){
  $path=Join-Path $root $relative
  [ordered]@{path=$relative;exists=(Test-Path -LiteralPath $path);sha256=if(Test-Path -LiteralPath $path){(Get-FileHash -LiteralPath $path).Hash}else{$null}}
 })
 $key=Get-ItemProperty -LiteralPath 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\Tagma P0 S16 Acceptance'
 [ordered]@{files=$files;registeredVersion=$key.DisplayVersion;installLocation=$key.InstallLocation}
}
$before=State
$results=@()
foreach($case in @(@{name='target-space';expected=112},@{name='temp-space';expected=112},@{name='query-failure';expected=1603},@{name='wrong-arch';expected=1633})){
 $setup=Join-Path $task ($case.name+'-dev35-setup.exe')
 $p=Start-Process -FilePath $setup -ArgumentList @('/S','/NS',('/D='+$install)) -WindowStyle Hidden -PassThru -Wait
 $after=State
 $unchanged=($before|ConvertTo-Json -Depth 8 -Compress) -ceq ($after|ConvertTo-Json -Depth 8 -Compress)
 $results+=@{case=$case.name;exitCode=$p.ExitCode;expected=$case.expected;unchanged=$unchanged;installerSha256=(Get-FileHash -LiteralPath $setup).Hash;after=$after}
 @{utc=[DateTime]::UtcNow.ToString('o');scope='Real full NSIS process; synthetic declared100GiB payload budgets, nonexistent query path, or mismatched declared architecture. Real Windows API responses, not actual disk exhaustion or another OS.';before=$before;results=$results}|ConvertTo-Json -Depth 10|Set-Content -LiteralPath (Join-Path $task 'silent-preflight-results.json') -Encoding utf8
 if($p.ExitCode -ne $case.expected -or -not $unchanged){throw "Unexpected preflight outcome $($case.name): $($p.ExitCode)"}
}
$results|Select-Object case,exitCode,unchanged|ConvertTo-Json
