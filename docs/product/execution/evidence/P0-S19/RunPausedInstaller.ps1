param([ValidateSet('dev32','dev33')][string]$Version='dev32')
$ErrorActionPreference='Stop'
$task='D:\demo1\tagmaai\.cache\p0-s19-update-lease'
$root='C:\Users\ai\AppData\Local\Temp\tagma-p0-s09-128d7053-66d3-424a-8ec2-90640d06bf88'
$install=Join-Path $root 'install-p0s16'
if([IO.File]::ReadAllText((Join-Path $task 'owner.txt')) -cne 'tagma-p0-s19/update-lease/v1' -or [IO.File]::ReadAllText((Join-Path $root 'owner.txt')) -cne 'tagma-p0-s09/native/v1'){throw 'Owner'}
if(@(Get-Process tagma-desktop,tagma-gateway -ErrorAction SilentlyContinue|Where-Object {$_.Path -like "$root\*"}).Count){throw 'Fixture is active'}
$setup=Join-Path $task "paused-$Version-setup.exe"
$process=Start-Process -FilePath $setup -ArgumentList @('/S','/NS',('/D='+$install)) -WindowStyle Hidden -PassThru
@{pid=$process.Id;path=$setup;started=$process.StartTime.ToUniversalTime().ToString('o');sha256=(Get-FileHash -LiteralPath $setup).Hash}|ConvertTo-Json|Set-Content -LiteralPath (Join-Path $task "paused-$Version-identity.json") -Encoding utf8
if(-not $process.WaitForExit(150000)){throw 'Pause exceeded its test bound'}
@{exitCode=$process.ExitCode;utc=[DateTime]::UtcNow.ToString('o');registry=(Get-ItemProperty -LiteralPath 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\Tagma P0 S16 Acceptance').DisplayVersion}|ConvertTo-Json|Set-Content -LiteralPath (Join-Path $task "paused-$Version-exit.json") -Encoding utf8
