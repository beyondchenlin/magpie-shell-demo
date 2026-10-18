$ErrorActionPreference='Stop'
$root='C:\Users\ai\AppData\Local\Temp\tagma-p0-s09-128d7053-66d3-424a-8ec2-90640d06bf88'
$install=Join-Path $root 'install-p0s16'
if([IO.File]::ReadAllText((Join-Path $root 'owner.txt')) -cne 'tagma-p0-s09/native/v1'){throw 'Owner'}
if(-not(Test-Path -LiteralPath (Join-Path $install 'p0-s17-before-gateway-fixed30.txt'))){throw 'Pause not reached'}
$exe=Join-Path $install 'tagma-gateway.exe'
if((Get-FileHash -LiteralPath $exe).Hash -ne '115C39E4320CAF2FD2B5D38FE9FC1DD5CA655AA40B921630DF705CA93B2AFA02'){throw 'Expected old gateway'}
if(@(Get-CimInstance Win32_Process|Where-Object {$_.ExecutablePath -like "$root\*"}).Count){throw 'Fixture already active'}
$start=New-Object Diagnostics.ProcessStartInfo
$start.FileName=$exe;$start.UseShellExecute=$false;$start.CreateNoWindow=$true;$start.RedirectStandardInput=$true
$start.Arguments='--managed --test-port-override --config-dir "'+(Join-Path $root 'data')+'" --port 49697'
$gateway=[Diagnostics.Process]::Start($start)
try {
  $gateway.StandardInput.WriteLine((@{owner_token=[Guid]::NewGuid().ToString();instance_id=[Guid]::NewGuid().ToString()}|ConvertTo-Json -Compress));$gateway.StandardInput.Flush()
  $deadline=[DateTime]::UtcNow.AddSeconds(10)
  do {Start-Sleep -Milliseconds 100;$listener=Get-NetTCPConnection -LocalPort 49697 -State Listen -ErrorAction SilentlyContinue}while(-not $listener -and -not $gateway.HasExited -and [DateTime]::UtcNow -lt $deadline)
  if($gateway.HasExited -or $listener.OwningProcess -ne $gateway.Id){throw 'Gateway not listening'}
  @{pid=$gateway.Id;path=$gateway.Path;started=$gateway.StartTime.ToUniversalTime().ToString('o');sha256=(Get-FileHash -LiteralPath $gateway.Path).Hash;listenerPort=49697}|ConvertTo-Json|Set-Content -LiteralPath (Join-Path $PSScriptRoot 'late-gateway-identity.json')
  $deadline=[DateTime]::UtcNow.AddMinutes(5)
  while(-not(Test-Path -LiteralPath (Join-Path $PSScriptRoot 'stop-late-gateway.txt')) -and -not $gateway.HasExited -and [DateTime]::UtcNow -lt $deadline){Start-Sleep -Milliseconds 100}
  if($gateway.HasExited){throw 'Gateway was stopped unexpectedly'}
}finally{
  $gateway.StandardInput.Close()
  if(-not $gateway.WaitForExit(15000)){throw 'Managed gateway failed to exit'}
  @{exit=$gateway.ExitCode;method='Owner stdin closed';utc=[DateTime]::UtcNow.ToString('o')}|ConvertTo-Json|Set-Content -LiteralPath (Join-Path $PSScriptRoot 'late-gateway-exit.json')
}
