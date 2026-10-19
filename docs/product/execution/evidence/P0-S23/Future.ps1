$ErrorActionPreference='Stop'
$task='D:\demo1\tagmaai\.cache\p0-s23-config-preflight'
$root='C:\Users\ai\AppData\Local\Temp\tagma-p0-s09-128d7053-66d3-424a-8ec2-90640d06bf88'
$install=Join-Path $root 'install-p0s16'
$files=@((Join-Path $task 'future-data/config.sqlite3'),(Join-Path $install 'tagma-desktop.exe'),(Join-Path $install 'tagma-gateway.exe'))
$before=@(Get-FileHash -LiteralPath $files | Select-Object Path,Hash)
$setup=Join-Path $task 'future-dev39-setup.exe'
$p=Start-Process -FilePath $setup -ArgumentList @('/P','/NS',('/D='+$install)) -PassThru
@{pid=$p.Id;path=$setup;sha256=(Get-FileHash -LiteralPath $setup).Hash;started=$p.StartTime.ToUniversalTime().ToString('o')}|ConvertTo-Json|Set-Content -LiteralPath (Join-Path $task 'installer-identity.json') -Encoding utf8
if(-not $p.WaitForExit(300000)){throw 'Native preflight deadline'}
$after=@(Get-FileHash -LiteralPath $files | Select-Object Path,Hash)
$same=($before|ConvertTo-Json -Compress) -ceq ($after|ConvertTo-Json -Compress)
@{exitCode=$p.ExitCode;unchanged=$same;before=$before;after=$after;note='Synthetic schema999 database only; original data not edited'}|ConvertTo-Json -Depth 7|Set-Content -LiteralPath (Join-Path $task 'future-result.json') -Encoding utf8
if($p.ExitCode -ne 1638 -or -not $same){throw 'Future schema guard failed'}
Get-Content -LiteralPath (Join-Path $task 'future-result.json')
