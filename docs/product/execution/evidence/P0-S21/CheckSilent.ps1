$ErrorActionPreference='Stop'
$task='D:\demo1\tagmaai\.cache\p0-s21-registration'
$root='C:\Users\ai\AppData\Local\Temp\tagma-p0-s09-128d7053-66d3-424a-8ec2-90640d06bf88'
$install=Join-Path $root 'install-p0s16'
if([IO.File]::ReadAllText((Join-Path $task 'owner.txt')) -cne 'tagma-p0-s21/registration/v1' -or [IO.File]::ReadAllText((Join-Path $root 'owner.txt')) -cne 'tagma-p0-s09/native/v1'){throw 'Owner mismatch'}
if(@(Get-CimInstance Win32_Process|Where-Object {$_.ExecutablePath -like "$install\*"}).Count){throw 'Fixture still running'}
if(([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)){throw 'Unexpected elevated token'}
function State {
 $data=@(foreach($name in 'config.sqlite3','config.sqlite3-wal'){$p=Join-Path $root ('data/'+$name);@{path=$name;sha256=(Get-FileHash -LiteralPath $p).Hash}})
 $key=Get-ItemProperty -LiteralPath 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\Tagma P0 S16 Acceptance'
 @{data=$data;version=$key.DisplayVersion;uninstaller=(Test-Path -LiteralPath (Join-Path $install 'uninstall.exe'))}
}
$before=State
$results=@()
foreach($name in 'dword-failure','version-failure'){
 $setup=Join-Path $task ($name+'-dev36-setup.exe')
 $p=Start-Process -FilePath $setup -ArgumentList @('/S','/NS',('/D='+$install)) -WindowStyle Hidden -PassThru -Wait
 $after=State
 $unchanged=($before.data|ConvertTo-Json -Compress) -ceq ($after.data|ConvertTo-Json -Compress)
 $results+=@{case=$name;exitCode=$p.ExitCode;dataUnchanged=$unchanged;state=$after;installerSha256=(Get-FileHash -LiteralPath $setup).Hash}
 @{utc=[DateTime]::UtcNow.ToString('o');scope='Actual NSIS registry writes to task-only HKLM destination denied to non-elevated current-user installer; test-only destination change, no ACL change';before=$before;results=$results}|ConvertTo-Json -Depth 8|Set-Content -LiteralPath (Join-Path $task 'silent-results.json') -Encoding utf8
 if($p.ExitCode -ne 1603 -or -not $unchanged -or $after.version -ne '0.2.0-dev.35' -or -not $after.uninstaller){throw 'Failure did not preserve required state'}
}
$results|Select-Object case,exitCode,dataUnchanged|ConvertTo-Json
