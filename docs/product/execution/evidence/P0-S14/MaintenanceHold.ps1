$ErrorActionPreference='Stop'
$root='C:/Users/ai/AppData/Local/Temp/tagma-p0-s09-128d7053-66d3-424a-8ec2-90640d06bf88'
$records='D:/demo1/tagmaai/.cache/p0-s14-closure'
if([IO.File]::ReadAllText((Join-Path $root 'owner.txt')) -cne 'tagma-p0-s09/native/v1'){throw 'Owner mismatch'}
if(@(Get-CimInstance Win32_Process | Where-Object {$_.ExecutablePath -like "$root*"}).Count){throw 'Fixture processes must exit before maintenance'}
$file=Join-Path $root 'data/maintenance.lock'
$stream=[IO.File]::Open($file,[IO.FileMode]::Open,[IO.FileAccess]::ReadWrite,[IO.FileShare]::ReadWrite)
$locked=$false
try {
  $stream.Lock(0,[long]::MaxValue);$locked=$true
  @{pid=$PID;utc=[DateTime]::UtcNow.ToString('o');file=$file;kind='Windows byte-range lock; no database writes'}|ConvertTo-Json|Set-Content -LiteralPath (Join-Path $records 'maintenance-held.json') -Encoding UTF8
  $timer=[Diagnostics.Stopwatch]::StartNew()
  while($timer.Elapsed.TotalMinutes -lt 10 -and -not (Test-Path -LiteralPath (Join-Path $records 'maintenance-release'))){Start-Sleep -Milliseconds 200}
}finally{
  if($locked){$stream.Unlock(0,[long]::MaxValue)};$stream.Dispose()
  @{utc=[DateTime]::UtcNow.ToString('o');released=$true}|ConvertTo-Json|Set-Content -LiteralPath (Join-Path $records 'maintenance-released.json') -Encoding UTF8
}
