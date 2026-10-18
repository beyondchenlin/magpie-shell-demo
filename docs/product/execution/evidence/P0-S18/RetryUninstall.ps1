$ErrorActionPreference='Stop'
$task='D:\demo1\tagmaai\.cache\p0-s18-uninstall-faults'
$install='C:\Users\ai\AppData\Local\Temp\tagma-p0-s09-128d7053-66d3-424a-8ec2-90640d06bf88\install-p0s16'
if([IO.File]::ReadAllText((Join-Path $task 'owner.txt')) -cne 'tagma-p0-s18/uninstall-faults/v1'){throw 'Owner'}
$runner=Join-Path $task 'uninstall-runner-dev31-gateway.exe'
$expected=(Get-Content -LiteralPath (Join-Path $task 'installer-identity.json') -Raw|ConvertFrom-Json).sha256
if((Get-FileHash -LiteralPath $runner).Hash -ne $expected){throw 'Uninstaller changed'}
$process=Start-Process -FilePath $runner -ArgumentList ('_?='+$install) -PassThru
@{pid=$process.Id;path=$runner;started=$process.StartTime.ToUniversalTime().ToString('o');sha256=$expected}|ConvertTo-Json|Set-Content -LiteralPath (Join-Path $task 'installer-identity.json') -Encoding utf8
if(-not $process.WaitForExit(180000)){throw 'Uninstaller still running'}
$result=@{exitCode=$process.ExitCode;registryExists=(Test-Path -LiteralPath 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\Tagma P0 S16 Acceptance');remaining=@(Get-ChildItem -LiteralPath $install -File|Select-Object Name,Length);configSha256=(Get-FileHash -LiteralPath (Join-Path (Split-Path $install) 'data/config.sqlite3')).Hash}
$result|ConvertTo-Json -Depth 6|Set-Content -LiteralPath (Join-Path $task 'dev31-retry-result.json') -Encoding utf8
if($process.ExitCode -ne 0 -or $result.registryExists -or @($result.remaining|Where-Object Name -match '\.exe$').Count){throw 'Uninstall retry failed'}
