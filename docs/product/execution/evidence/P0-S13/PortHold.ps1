$ErrorActionPreference='Stop'
$dir='D:\demo1\tagmaai\.cache\p0-s13-lifecycle'
$release=Join-Path $dir 'port-release'
if(Test-Path -LiteralPath $release){throw 'Port hold already completed; do not reuse stale release file'}
$listener=[Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback,49697)
$listener.Server.ExclusiveAddressUse=$true
try{
 $listener.Start();$me=Get-Process -Id $PID
 [ordered]@{kind='owned synthetic exclusive TCP listener';pid=$PID;started=$me.StartTime.ToUniversalTime().ToString('o');port=49697;utc=[DateTime]::UtcNow.ToString('o')}|ConvertTo-Json|Set-Content -LiteralPath (Join-Path $dir '13-port-holder.json') -Encoding UTF8
 $timer=[Diagnostics.Stopwatch]::StartNew()
 while($timer.Elapsed.TotalSeconds -lt 120 -and -not (Test-Path -LiteralPath $release)){if($listener.Pending()){$client=$listener.AcceptTcpClient();$client.Dispose()};Start-Sleep -Milliseconds 100}
}finally{$listener.Stop();[ordered]@{utc=[DateTime]::UtcNow.ToString('o');pid=$PID;released=$true}|ConvertTo-Json|Set-Content -LiteralPath (Join-Path $dir '13-port-released.json') -Encoding UTF8}
