$ErrorActionPreference='Stop'
$root=(Resolve-Path -LiteralPath 'C:/Users/ai/AppData/Local/Temp/tagma-p0-s09-128d7053-66d3-424a-8ec2-90640d06bf88').Path
$records='D:/demo1/tagmaai/.cache/p0-s14-closure'
if([IO.File]::ReadAllText((Join-Path $root 'owner.txt')) -cne 'tagma-p0-s09/native/v1'){throw 'Owner mismatch'}
if(@(Get-CimInstance Win32_Process | Where-Object {$_.ExecutablePath -like "$root\*"}).Count){throw 'Fixture processes must exit'}
$file=Join-Path $root 'data/config.sqlite3'
$before=(Get-FileHash -LiteralPath $file).Hash
$stream=[IO.File]::Open($file,[IO.FileMode]::Open,[IO.FileAccess]::Read,[IO.FileShare]::None)
try {
  @{pid=$PID;utc=[DateTime]::UtcNow.ToString('o');file=$file;kind='exclusive read handle; no file writes';before=$before}|ConvertTo-Json|Set-Content -LiteralPath (Join-Path $records 'storage-held.json') -Encoding UTF8
  $timer=[Diagnostics.Stopwatch]::StartNew()
  while($timer.Elapsed.TotalMinutes -lt 10 -and -not (Test-Path -LiteralPath (Join-Path $records 'storage-release'))){Start-Sleep -Milliseconds 200}
}finally{
  $stream.Dispose()
  @{utc=[DateTime]::UtcNow.ToString('o');released=$true;before=$before;after=(Get-FileHash -LiteralPath $file).Hash}|ConvertTo-Json|Set-Content -LiteralPath (Join-Path $records 'storage-released.json') -Encoding UTF8
}
