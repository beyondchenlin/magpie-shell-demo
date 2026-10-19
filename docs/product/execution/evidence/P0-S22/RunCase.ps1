param([ValidateSet('denied','query-failure')][string]$Variant='denied',[string]$Case='native-denied',[ValidateSet(37,38)][int]$Version=38,[switch]$Native,[switch]$Passive,[switch]$BlockRestore)
$ErrorActionPreference='Stop'
$task='D:\demo1\tagmaai\.cache\p0-s22-uninstall-registration'
$root='C:\Users\ai\AppData\Local\Temp\tagma-p0-s09-128d7053-66d3-424a-8ec2-90640d06bf88'
$install=Join-Path $root 'install-p0s16'
if([IO.File]::ReadAllText((Join-Path $task 'owner.txt')) -cne 'tagma-p0-s22/uninstall-registration/v1' -or [IO.File]::ReadAllText((Join-Path $root 'owner.txt')) -cne 'tagma-p0-s09/native/v1'){throw 'Owner mismatch'}
if(@(Get-CimInstance Win32_Process|Where-Object {$_.ExecutablePath -like "$install\*"}).Count){throw 'Owned processes still running'}
function State {
 $key=Get-ItemProperty -LiteralPath 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\Tagma P0 S16 Acceptance' -ErrorAction SilentlyContinue
 @{version=$key.DisplayVersion;registered=($null -ne $key);files=@(foreach($n in 'tagma-desktop.exe','tagma-gateway.exe','uninstall.exe'){$p=Join-Path $install $n;@{name=$n;exists=(Test-Path -LiteralPath $p);sha256=if(Test-Path -LiteralPath $p){(Get-FileHash -LiteralPath $p).Hash}else{$null}}});data=@(Get-FileHash -LiteralPath (Join-Path $root 'data/config.sqlite3'),(Join-Path $root 'data/config.sqlite3-wal')|Select-Object Path,Hash)}
}
$setup=Join-Path $task ($Variant+'-dev'+$Version+'-setup.exe')
$p=Start-Process -FilePath $setup -ArgumentList @('/S','/NS',('/D='+$install)) -WindowStyle Hidden -PassThru -Wait
if($p.ExitCode){throw 'Fixture install failed'}
$before=State
if($Variant -eq 'denied'){[IO.File]::WriteAllText((Join-Path $install 'p0-s22-deny-delete.once'),'tagma-p0-s22/denied/v1')}
if($BlockRestore){[IO.File]::WriteAllText((Join-Path $install 'p0-s22-block-restore.once'),'tagma-p0-s22/block/v1')}
$runner=Join-Path $task ($Case+'-uninstall.exe')
if(Test-Path -LiteralPath $runner){throw 'Keep prior runner evidence'}
Copy-Item -LiteralPath (Join-Path $install 'uninstall.exe') -Destination $runner
$uninstallArguments=@(('_?='+$install));if(-not $Native){$uninstallArguments=@('/S')+$uninstallArguments};if($Passive){$uninstallArguments=@('/P')+$uninstallArguments}
$p=Start-Process -FilePath $runner -ArgumentList $uninstallArguments -PassThru
@{pid=$p.Id;path=$runner;sha256=(Get-FileHash -LiteralPath $runner).Hash;started=$p.StartTime.ToUniversalTime().ToString('o')}|ConvertTo-Json|Set-Content -LiteralPath (Join-Path $task 'installer-identity.json') -Encoding utf8
if(-not $p.WaitForExit(300000)){throw 'Uninstaller driver deadline; retain exact process for observation'}
$after=State
$same=($before.data|ConvertTo-Json -Compress) -ceq ($after.data|ConvertTo-Json -Compress)
$record=@{utc=[DateTime]::UtcNow.ToString('o');case=$Case;version=$Version;variant=$Variant;native=$Native.IsPresent;passive=$Passive.IsPresent;arguments=$uninstallArguments;blockRestore=$BlockRestore.IsPresent;exitCode=$p.ExitCode;dataUnchanged=$same;before=$before;after=$after;runnerHash=(Get-FileHash -LiteralPath $runner).Hash}
$record|ConvertTo-Json -Depth 8|Set-Content -LiteralPath (Join-Path $task ($Case+'-result.json')) -Encoding utf8
if($p.ExitCode -ne 1603 -or -not $same -or -not $after.registered -or -not @($after.files|Where-Object {$_.name -eq 'uninstall.exe' -and $_.exists}).Count){throw 'Unexpected failure/recovery result'}
$record|ConvertTo-Json -Depth 8
