$ErrorActionPreference='Stop'
$task='D:\demo1\tagmaai\.cache\p0-s23-config-preflight'
$root='C:\Users\ai\AppData\Local\Temp\tagma-p0-s09-128d7053-66d3-424a-8ec2-90640d06bf88'
$install=Join-Path $root 'install-p0s16'
if([IO.File]::ReadAllText((Join-Path $root 'owner.txt')) -cne 'tagma-p0-s09/native/v1'){throw 'Owner'}
if(@(Get-CimInstance Win32_Process|Where-Object {$_.ExecutablePath -like "$root\*" -or $_.ExecutablePath -eq (Join-Path $task 'independent-dev38-gateway.exe')}).Count){throw 'Isolated processes active'}
$paths=@(Join-Path $root 'data/config.sqlite3';Join-Path $root 'data/config.sqlite3-wal')
$before=@(Get-FileHash -LiteralPath $paths|Select-Object Path,Hash)
$setup=Join-Path $task 'isolated-dev39-setup.exe'
$p=Start-Process -FilePath $setup -ArgumentList @('/NS',('/D='+$install)) -PassThru
@{pid=$p.Id;path=$setup;sha256=(Get-FileHash -LiteralPath $setup).Hash;started=$p.StartTime.ToUniversalTime().ToString('o')}|ConvertTo-Json|Set-Content -LiteralPath (Join-Path $task 'installer-identity.json') -Encoding utf8
if(-not $p.WaitForExit(300000)){throw 'Installer deadline'}
$after=@(Get-FileHash -LiteralPath $paths|Select-Object Path,Hash)
$same=($before|ConvertTo-Json -Compress) -ceq ($after|ConvertTo-Json -Compress)
$record=@{exitCode=$p.ExitCode;configurationUnchanged=$same;before=$before;after=$after;installed=@(Get-FileHash -LiteralPath (Join-Path $install 'tagma-desktop.exe'),(Join-Path $install 'tagma-gateway.exe')|Select-Object Path,Hash);version=(Get-ItemProperty -LiteralPath 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\Tagma P0 S16 Acceptance').DisplayVersion}
$record|ConvertTo-Json -Depth 7|Set-Content -LiteralPath (Join-Path $task 'normal-install-result.json') -Encoding utf8
if($p.ExitCode -ne 0 -or -not $same -or $record.version -ne '0.2.0-dev.39'){throw 'Normal upgrade failed'}
$record|ConvertTo-Json -Depth 7
