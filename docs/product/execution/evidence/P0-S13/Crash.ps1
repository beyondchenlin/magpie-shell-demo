$ErrorActionPreference='Stop'
$dir='D:\demo1\tagmaai\.cache\p0-s13-lifecycle'
$fixture='C:\Users\ai\AppData\Local\Temp\tagma-p0-s09-128d7053-66d3-424a-8ec2-90640d06bf88'
if([IO.File]::ReadAllText((Join-Path $fixture 'owner.txt')) -cne 'tagma-p0-s09/native/v1'){throw 'Wrong fixture'}
$desktop=Join-Path $fixture 'candidate-dev21/tagma-desktop.exe';$gateway=Join-Path $fixture 'candidate-dev21/tagma-gateway.exe'
if((Get-FileHash -LiteralPath $desktop).Hash -ne 'A67C6065AB9FEE8D2598C347E6D77D6829DFF0C7FFE85EBDF0A543EC52C34CB5' -or (Get-FileHash -LiteralPath $gateway).Hash -ne '9BB7513EF27C1D08072BED0B07D1FE9BDD3C0F44D8F37865FBEE16BF771E5F5A'){throw 'Wrong binaries'}
$hosts=@(Get-Process tagma-desktop|Where-Object Path -eq $desktop);if($hosts.Count -ne 1){throw 'Host not unique'}
$hostProcess=$hosts[0];$started=$hostProcess.StartTime
$events=@()
for($i=0;$i -lt 4;$i++){
 $current=Get-Process -Id $hostProcess.Id;if($current.StartTime -ne $started -or $current.Path -ne $desktop){throw 'Host identity changed'}
 $children=@(Get-CimInstance Win32_Process|Where-Object {$_.ExecutablePath -eq $gateway -and $_.ParentProcessId -eq $hostProcess.Id});if($children.Count -ne 1){throw 'Owned gateway not unique'}
 $child=$children[0];$live=Get-Process -Id $child.ProcessId
 if($live.Path -ne $gateway -or [Math]::Abs(($live.StartTime.ToUniversalTime()-$child.CreationDate.ToUniversalTime()).TotalMilliseconds) -gt 1){throw 'Child identity changed'}
 $event=[ordered]@{round=$i+1;host=$hostProcess.Id;killedPid=$child.ProcessId;childStarted=$child.CreationDate.ToUniversalTime().ToString('o');utc=[DateTime]::UtcNow.ToString('o')}
 $timer=[Diagnostics.Stopwatch]::StartNew();Stop-Process -InputObject $live -Force
 & (Join-Path $dir 'Run.ps1') -Json '{"action":"observe"}' -Label ('08-crash-{0}-transition' -f ($i+1))|Out-Null
 if($i -lt 3){
  $next=$null
  while($timer.Elapsed.TotalSeconds -lt 12){$new=@(Get-CimInstance Win32_Process|Where-Object {$_.ExecutablePath -eq $gateway -and $_.ParentProcessId -eq $hostProcess.Id -and $_.ProcessId -ne $child.ProcessId});if($new.Count -eq 1){$next=$new[0];break};Start-Sleep -Milliseconds 100}
  if(-not $next){throw 'Expected bounded restart missing'}
  $event.restartedPid=$next.ProcessId;$event.observedRestartMs=$timer.Elapsed.TotalMilliseconds
  Start-Sleep -Milliseconds 500
  & (Join-Path $dir 'Run.ps1') -Json '{"action":"observe"}' -Label ('08-crash-{0}-recovered' -f ($i+1))|Out-Null
 }else{
  Start-Sleep -Seconds 6
  $event.remainingGateway=@(Get-CimInstance Win32_Process|Where-Object {$_.ExecutablePath -eq $gateway}).Count
  $event.observedMs=$timer.Elapsed.TotalMilliseconds
  if($event.remainingGateway){throw 'Retry limit exceeded'}
  & (Join-Path $dir 'Run.ps1') -Json '{"action":"observe"}' -Label '08-crash-exhausted'|Out-Null
 }
 $events+=,$event;$events|ConvertTo-Json -Depth 6|Set-Content -LiteralPath (Join-Path $dir '08-crash-processes.json') -Encoding UTF8
 $event|ConvertTo-Json -Compress
}
Get-Content -LiteralPath (Join-Path $fixture 'data/logs/tagma.0.jsonl') -Tail 28|Set-Content -LiteralPath (Join-Path $dir '08-crash-runtime-tail.jsonl') -Encoding UTF8
