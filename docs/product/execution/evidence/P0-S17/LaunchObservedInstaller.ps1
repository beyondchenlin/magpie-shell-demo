param([ValidateSet('late-start-fixed30.exe','late-gateway-fixed30.exe')][string]$Name='late-start-fixed30.exe')
$ErrorActionPreference='Stop'
if([IO.File]::ReadAllText((Join-Path $PSScriptRoot 'owner.txt')) -cne 'tagma-p0-s17/install-faults/v1'){throw 'Owner'}
$path=Join-Path $PSScriptRoot $Name
$p=Start-Process -FilePath $path -ArgumentList @('/P','/NS') -WindowStyle Hidden -PassThru
[ordered]@{pid=$p.Id;path=$p.Path;started=$p.StartTime.ToUniversalTime().ToString('o');sha256=(Get-FileHash -LiteralPath $p.Path).Hash}|ConvertTo-Json|Set-Content -LiteralPath (Join-Path $PSScriptRoot 'installer-identity.json')
$p.WaitForExit()
@{installer=$Name;pid=$p.Id;exit=$p.ExitCode;utc=[DateTime]::UtcNow.ToString('o')}|ConvertTo-Json|Set-Content -LiteralPath (Join-Path $PSScriptRoot ($Name+'.exit.json'))
