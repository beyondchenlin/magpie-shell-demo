$env:PSModulePath=Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\Modules'
$ErrorActionPreference='Stop'
$root='C:\Users\ai\AppData\Local\Temp\tagma-p0-s09-128d7053-66d3-424a-8ec2-90640d06bf88'
$cache='D:\demo1\tagmaai\.cache\p2-s15-uninstall'
if([IO.File]::ReadAllText((Join-Path $root 'owner.txt')) -cne 'tagma-p0-s09/native/v1'){throw 'owner'}
$path=Join-Path $root 'data/packs/versions/prepared-8c0c9ebf-eb5a-4b02-8791-a67b101e1c9f/payload/tagma-reachflow.exe'
if((Get-FileHash -LiteralPath $path).Hash -ne 'AE922DB0B00C5818D0E89A3C1D63D48C6FACF49DEE3133B3750E0DB4B9DE8DF7'){throw 'payload identity'}
if((Get-Item -LiteralPath $path).Attributes -band [IO.FileAttributes]::ReparsePoint){throw 'reparse'}
$stream=[IO.File]::Open($path,[IO.FileMode]::Open,[IO.FileAccess]::Read,[IO.FileShare]::ReadWrite)
try {
 [ordered]@{pid=$PID;started=[DateTime]::UtcNow.ToString('o');path=$path;purpose='deny deletion only for native uninstall recovery acceptance';ttlSeconds=600}|ConvertTo-Json|Set-Content (Join-Path $cache 'lock-ready.json')
 $until=[DateTime]::UtcNow.AddMinutes(10)
 while([DateTime]::UtcNow -lt $until -and -not(Test-Path -LiteralPath (Join-Path $cache 'release-lock.signal'))){Start-Sleep -Milliseconds 200}
}finally{$stream.Dispose();[DateTime]::UtcNow.ToString('o')|Set-Content (Join-Path $cache 'lock-released.txt')}