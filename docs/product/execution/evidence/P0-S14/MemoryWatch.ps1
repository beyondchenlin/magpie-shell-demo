$ErrorActionPreference='Stop'
$dir='D:\demo1\tagmaai\.cache\p0-s14-closure'
if([IO.File]::ReadAllText((Join-Path $dir 'owner.txt')) -cne 'tagma-p0-s14/closure/v1'){throw 'Owner'}
$identity=Get-Content -LiteralPath (Join-Path $dir 'perf-identity.json') -Raw|ConvertFrom-Json
$start=Get-Content -LiteralPath (Join-Path $dir 'steady-started.json') -Raw|ConvertFrom-Json
$began=[DateTime]::Parse($start.started).ToUniversalTime()
$samples=@();$failure=$null
try {
 for($index=0;$index -le 120;$index++){
  $due=$began.AddSeconds($index*15);$ms=($due-[DateTime]::UtcNow).TotalMilliseconds;if($ms -gt 0){Start-Sleep -Milliseconds ([int]$ms)}
  $hostProcess=Get-Process -Id $identity.host;$gateway=Get-Process -Id $identity.gateway
  if($hostProcess.Path -ne $identity.hostPath -or $gateway.Path -ne $identity.gatewayPath -or $hostProcess.StartTime.ToUniversalTime().ToString('o') -ne $identity.hostStarted -or $gateway.StartTime.ToUniversalTime().ToString('o') -ne $identity.gatewayStarted){throw 'Measured process identity changed'}
  $all=Get-CimInstance Win32_Process
  $ids=@([int]$identity.host);for($depth=0;$depth -lt 5;$depth++){$ids=@($ids+@($all|Where-Object ParentProcessId -in $ids|ForEach-Object ProcessId)|Sort-Object -Unique)}
  $views=@($all|Where-Object {$_.ProcessId -in $ids -and $_.Name -eq 'msedgewebview2.exe'}|ForEach-Object {Get-Process -Id $_.ProcessId -ErrorAction SilentlyContinue})
  $sample=[ordered]@{index=$index;utc=[DateTime]::UtcNow.ToString('o');elapsedSeconds=([DateTime]::UtcNow-$began).TotalSeconds;hostPrivateBytes=$hostProcess.PrivateMemorySize64;hostWorkingSetBytes=$hostProcess.WorkingSet64;gatewayPrivateBytes=$gateway.PrivateMemorySize64;gatewayWorkingSetBytes=$gateway.WorkingSet64;gatewayCpuSeconds=$gateway.TotalProcessorTime.TotalSeconds;webviewPrivateBytes=($views|Measure-Object PrivateMemorySize64 -Sum).Sum;webviewProcesses=$views.Count}
  $samples+=,$sample;$sample|ConvertTo-Json -Compress|Add-Content -LiteralPath (Join-Path $dir 'memory-samples.jsonl') -Encoding UTF8
  if($index%20 -eq 0){Write-Output ('Memory sample {0}/120: gateway private {1:N2} MiB' -f $index,($gateway.PrivateMemorySize64/1MB))}
  if(Test-Path -LiteralPath (Join-Path $dir 'steady-result.json')){$r=Get-Content -LiteralPath (Join-Path $dir 'steady-result.json') -Raw|ConvertFrom-Json;if($r.failed -gt 0){throw 'Steady load failed'}}
 }
}catch{$failure=$_.Exception.Message;throw}
finally{
 [ordered]@{started=$start.started;ended=[DateTime]::UtcNow.ToString('o');identity=$identity;intervalSeconds=15;samples=$samples;failure=$failure;layer='Process resource observations during synthetic loopback load; no native UI acceptance implied'}|ConvertTo-Json -Depth 7|Set-Content -LiteralPath (Join-Path $dir 'memory-result.json') -Encoding UTF8
}
