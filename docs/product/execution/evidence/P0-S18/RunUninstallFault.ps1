param([ValidateSet('dev30','dev31','dev32')][string]$Version='dev30',[ValidateSet('gateway','uninstaller')][string]$LockedFile='gateway')
$ErrorActionPreference='Stop'
$task='D:\demo1\tagmaai\.cache\p0-s18-uninstall-faults'
$root='C:\Users\ai\AppData\Local\Temp\tagma-p0-s09-128d7053-66d3-424a-8ec2-90640d06bf88'
$install=Join-Path $root 'install-p0s16'
if([IO.File]::ReadAllText((Join-Path $task 'owner.txt')) -cne 'tagma-p0-s18/uninstall-faults/v1' -or [IO.File]::ReadAllText((Join-Path $root 'owner.txt')) -cne 'tagma-p0-s09/native/v1'){throw 'Owner'}
if((Get-Item -LiteralPath $install).Attributes -band [IO.FileAttributes]::ReparsePoint){throw 'Linked install'}
if(@(Get-Process tagma-desktop,tagma-gateway -ErrorAction SilentlyContinue|Where-Object {$_.Path -like "$root\*"}).Count){throw 'Fixture still active'}
$label="$Version-$LockedFile"
$setup=Join-Path $task $(if($LockedFile -eq 'gateway'){"uninstall-fault-$Version-setup.exe"}else{"uninstall-lock-$Version-setup.exe"})
$result=Start-Process -FilePath $setup -ArgumentList @('/S','/NS',('/D='+$install)) -WindowStyle Hidden -Wait -PassThru
if($result.ExitCode -ne 0){throw "Install failed $($result.ExitCode)"}
$ready=Join-Path $install "p0-s18-uninstall-ready-$label.txt"
$continue=Join-Path $install "p0-s18-uninstall-continue-$label.txt"
if((Test-Path -LiteralPath $ready) -or (Test-Path -LiteralPath $continue)){throw 'Unique markers already exist'}
function State {
 $key=Get-ItemProperty -LiteralPath 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\Tagma P0 S16 Acceptance' -ErrorAction SilentlyContinue
 [ordered]@{utc=[DateTime]::UtcNow.ToString('o');registeredVersion=$key.DisplayVersion;files=@(foreach($name in @('tagma-desktop.exe','tagma-gateway.exe','uninstall.exe')){$path=Join-Path $install $name;@{name=$name;exists=(Test-Path -LiteralPath $path);sha256=if(Test-Path -LiteralPath $path){(Get-FileHash -LiteralPath $path).Hash}else{$null}}});configSha256=(Get-FileHash -LiteralPath (Join-Path $root 'data/config.sqlite3')).Hash}
}
$before=State
$runner=Join-Path $task "uninstall-runner-$label.exe"
Copy-Item -LiteralPath (Join-Path $install 'uninstall.exe') -Destination $runner
$process=Start-Process -FilePath $runner -ArgumentList ('_?='+$install) -PassThru
@{pid=$process.Id;path=$runner;started=$process.StartTime.ToUniversalTime().ToString('o');sha256=(Get-FileHash -LiteralPath $runner).Hash}|ConvertTo-Json|Set-Content -LiteralPath (Join-Path $task 'installer-identity.json') -Encoding utf8
$stream=$null
try {
 $limit=[DateTime]::UtcNow.AddSeconds(120)
 while(-not (Test-Path -LiteralPath $ready)){
  if($process.HasExited -or [DateTime]::UtcNow -gt $limit){throw 'No uninstall pause reached'}
  Start-Sleep -Milliseconds 100
 }
 $name=if($LockedFile -eq 'gateway'){'tagma-gateway.exe'}else{'uninstall.exe'}
 $stream=[IO.File]::Open((Join-Path $install $name),[IO.FileMode]::Open,[IO.FileAccess]::Read,[IO.FileShare]::Read)
 [IO.File]::WriteAllText($continue,'lock-held')
 if(-not $process.WaitForExit(180000)){throw 'Uninstaller did not finish within evidence window'}
 $after=State
 @{scenario=$label;layer='Real Windows uninstaller, test-only pause after production process check, real FileShare.Read delete denial';before=$before;after=$after;exitCode=$process.ExitCode;lockedFile=$name}|ConvertTo-Json -Depth 8|Set-Content -LiteralPath (Join-Path $task "$label-result.json") -Encoding utf8
} finally {if($stream){$stream.Dispose()}}
