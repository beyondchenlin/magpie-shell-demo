$ErrorActionPreference='Stop'
$record=(Resolve-Path -LiteralPath $PSScriptRoot).Path
if([IO.File]::ReadAllText((Join-Path $record 'owner.txt')) -cne 'tagma-p0-s16/installer/v1'){throw 'Owner mismatch'}
$root='C:\Users\ai\AppData\Local\Temp\tagma-p0-s09-128d7053-66d3-424a-8ec2-90640d06bf88'
if([IO.File]::ReadAllText((Join-Path $root 'owner.txt')) -cne 'tagma-p0-s09/native/v1'){throw 'Data owner mismatch'}
$install=Join-Path $root 'install-p0s16'
$exe=Join-Path $install 'tagma-gateway.exe'
if((Get-FileHash -LiteralPath $exe).Hash -ne '9B30CB830D902D57A6EB340D5437B39E49C41FE6D1593481989019D2D697A8A9'){throw 'Binary mismatch'}
if(@(Get-CimInstance Win32_Process|Where-Object {$_.ExecutablePath -like "$root\*"}).Count){throw 'Fixture already active'}
$start=New-Object Diagnostics.ProcessStartInfo
$start.FileName=$exe
$start.UseShellExecute=$false
$start.CreateNoWindow=$true
$start.RedirectStandardInput=$true
$start.Arguments='--managed --test-port-override --config-dir "'+(Join-Path $root 'data')+'" --port 49697'
$gateway=[Diagnostics.Process]::Start($start)
try {
  $gateway.StandardInput.WriteLine((@{owner_token=[Guid]::NewGuid().ToString();instance_id=[Guid]::NewGuid().ToString()}|ConvertTo-Json -Compress))
  $gateway.StandardInput.Flush()
  $deadline=[DateTime]::UtcNow.AddSeconds(10)
  do {Start-Sleep -Milliseconds 100; $listener=Get-NetTCPConnection -LocalPort 49697 -State Listen -ErrorAction SilentlyContinue} while(-not $listener -and -not $gateway.HasExited -and [DateTime]::UtcNow -lt $deadline)
  if($gateway.HasExited -or $listener.OwningProcess -ne $gateway.Id){throw 'Owned standalone gateway did not listen'}
  $before=@(Get-ChildItem -LiteralPath $install -File|ForEach-Object {@{name=$_.Name;sha256=(Get-FileHash -LiteralPath $_.FullName).Hash}})
  $results=@()
  foreach($mode in @('upgrade','uninstall')){
    if($mode -eq 'upgrade'){$path=Join-Path $record 'isolated-dev29-setup.exe';$arguments=@('/S','/NS')}
    else{$path=Join-Path $install 'uninstall.exe';$arguments=@('/S',('_?='+$install))}
    $process=Start-Process -FilePath $path -ArgumentList $arguments -WindowStyle Hidden -PassThru -Wait
    $results+=@{mode=$mode;exit=$process.ExitCode;gatewayAlive=(-not $gateway.HasExited);pid=$gateway.Id}
    if($process.ExitCode -ne 1618 -or $gateway.HasExited){throw 'Guard failed'}
  }
  $unchanged=@($before|Where-Object {(Get-FileHash -LiteralPath (Join-Path $install $_.name)).Hash -eq $_.sha256}).Count -eq $before.Count
  if(-not $unchanged){throw 'Program files changed'}
  [ordered]@{layer='Actual Windows installer and sidecar processes, no desktop UI; synthetic local data; no model requests';gatewayPath=$exe;started=$gateway.StartTime.ToUniversalTime().ToString('o');filesUnchanged=$unchanged;checks=$results}|ConvertTo-Json -Depth 5|Set-Content -LiteralPath (Join-Path $record 'standalone-results.json')
}finally{
  $gateway.StandardInput.Close()
  if(-not $gateway.WaitForExit(15000)){throw 'Owned gateway did not stop after driver closed stdin'}
  @{gatewayExit=$gateway.ExitCode;stoppedBy='owning test driver closed managed stdin; no forced termination'}|ConvertTo-Json|Set-Content -LiteralPath (Join-Path $record 'standalone-cleanup.json')
}
Get-Content -LiteralPath (Join-Path $record 'standalone-results.json')
