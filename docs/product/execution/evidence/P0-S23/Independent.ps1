$ErrorActionPreference='Stop'
$task='D:\demo1\tagmaai\.cache\p0-s23-config-preflight'
$root='C:\Users\ai\AppData\Local\Temp\tagma-p0-s09-128d7053-66d3-424a-8ec2-90640d06bf88'
$install=Join-Path $root 'install-p0s16'
if([IO.File]::ReadAllText((Join-Path $root 'owner.txt')) -cne 'tagma-p0-s09/native/v1' -or [IO.File]::ReadAllText((Join-Path $task 'owner.txt')) -cne 'tagma-p0-s23/config-preflight/v1'){throw 'Owner'}
if(@(Get-CimInstance Win32_Process|Where-Object {$_.ExecutablePath -like "$root\*"}).Count){throw 'Isolated process still running'}
$exe=Join-Path $task 'independent-dev38-gateway.exe'
$original=Join-Path $install 'tagma-gateway.exe'
if((Get-FileHash -LiteralPath $original).Hash -cne '3D694C2696DCA9846330A69279A96428A1BACA651E81E83D44AF97EFB660A32F'){throw 'Gateway hash'}
Copy-Item -LiteralPath $original -Destination $exe
$start=New-Object Diagnostics.ProcessStartInfo
$start.FileName=$exe;$start.UseShellExecute=$false;$start.CreateNoWindow=$true;$start.RedirectStandardInput=$true
$start.Arguments='--managed --test-port-override --config-dir "'+(Join-Path $root 'data')+'" --port 49697'
$gateway=[Diagnostics.Process]::Start($start)
function State {
 @(foreach($p in @((Join-Path $install 'tagma-desktop.exe'),(Join-Path $install 'tagma-gateway.exe'),(Join-Path $root 'data/config.sqlite3'),(Join-Path $root 'data/config.sqlite3-wal'))){if(Test-Path -LiteralPath $p){@{path=$p;sha256=(Get-FileHash -LiteralPath $p).Hash}}}) | ConvertTo-Json -Compress
}
try {
 $gateway.StandardInput.WriteLine((@{owner_token=[Guid]::NewGuid().ToString();instance_id=[Guid]::NewGuid().ToString()}|ConvertTo-Json -Compress));$gateway.StandardInput.Flush()
 $deadline=[DateTime]::UtcNow.AddSeconds(10)
 do{Start-Sleep -Milliseconds 100;$listener=Get-NetTCPConnection -LocalPort 49697 -State Listen -ErrorAction SilentlyContinue}while(-not $listener -and -not $gateway.HasExited -and [DateTime]::UtcNow -lt $deadline)
 if($gateway.HasExited -or $listener.OwningProcess -ne $gateway.Id){throw 'Independent gateway not ready'}
 $before=State
 $setup=Join-Path $task 'isolated-dev39-setup.exe'
 $p=Start-Process -FilePath $setup -ArgumentList @('/P','/NS',('/D='+$install)) -PassThru
 @{pid=$p.Id;path=$setup;sha256=(Get-FileHash -LiteralPath $setup).Hash;started=$p.StartTime.ToUniversalTime().ToString('o')}|ConvertTo-Json|Set-Content -LiteralPath (Join-Path $task 'installer-identity.json') -Encoding utf8
 if(-not $p.WaitForExit(300000)){throw 'Native installer deadline'}
 $after=State
 $record=@{exitCode=$p.ExitCode;gatewayAlive=(-not $gateway.HasExited);gatewayPid=$gateway.Id;gatewayPath=$exe;gatewayHash=(Get-FileHash -LiteralPath $exe).Hash;unchanged=($before -ceq $after);before=($before|ConvertFrom-Json);after=($after|ConvertFrom-Json)}
 $record|ConvertTo-Json -Depth 7|Set-Content -LiteralPath (Join-Path $task 'independent-configuration-result.json') -Encoding utf8
 if($p.ExitCode -ne 1618 -or $gateway.HasExited -or $before -cne $after){throw 'Configuration guard failed'}
 $record|ConvertTo-Json -Depth 7
}finally{$gateway.StandardInput.Close();if(-not $gateway.WaitForExit(15000)){throw 'Owned gateway did not exit'};@{pid=$gateway.Id;exitCode=$gateway.ExitCode;method='owner stdin EOF'}|ConvertTo-Json|Set-Content -LiteralPath (Join-Path $task 'independent-cleanup.json') -Encoding utf8}
