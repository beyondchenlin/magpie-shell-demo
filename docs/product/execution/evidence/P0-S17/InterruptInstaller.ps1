$ErrorActionPreference='Stop'
$root='C:\Users\ai\AppData\Local\Temp\tagma-p0-s09-128d7053-66d3-424a-8ec2-90640d06bf88'
$install=Join-Path $root 'install-p0s16'
if([IO.File]::ReadAllText((Join-Path $root 'owner.txt')) -cne 'tagma-p0-s09/native/v1'){throw 'Owner'}
if([IO.File]::ReadAllText((Join-Path $PSScriptRoot 'owner.txt')) -cne 'tagma-p0-s17/install-faults/v1'){throw 'Evidence owner'}
if(@(Get-CimInstance Win32_Process|Where-Object {$_.ExecutablePath -like "$root\*"}).Count){throw 'Owned app still active'}
if(Test-Path -LiteralPath 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\Tagma P0 S16 Acceptance'){throw 'Fixture registry still exists'}
$old=(Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '../p0-s16-installer/isolated-dev28-setup.exe')).Path
$baseline=Start-Process -FilePath $old -ArgumentList @('/S','/NS',('/D='+$install)) -WindowStyle Hidden -PassThru -Wait
if($baseline.ExitCode -ne 0){throw 'Baseline failed'}
$path=Join-Path $PSScriptRoot 'interrupted-after-host.exe'
$hash=(Get-FileHash -LiteralPath $path).Hash
$installer=Start-Process -FilePath $path -ArgumentList @('/S','/NS') -WindowStyle Hidden -PassThru
$started=$installer.StartTime.ToUniversalTime().ToString('o')
$deadline=[DateTime]::UtcNow.AddSeconds(15)
while(-not(Test-Path -LiteralPath (Join-Path $install 'p0-s17-after-host.txt')) -and -not $installer.HasExited -and [DateTime]::UtcNow -lt $deadline){Start-Sleep -Milliseconds 50}
if(-not(Test-Path -LiteralPath (Join-Path $install 'p0-s17-after-host.txt')) -or $installer.HasExited){throw 'Expected pause point not reached'}
$hostHash=(Get-FileHash -LiteralPath (Join-Path $install 'tagma-desktop.exe')).Hash
$gatewayHash=(Get-FileHash -LiteralPath (Join-Path $install 'tagma-gateway.exe')).Hash
if($hostHash -ne '09C359FAF08E83883977230F08213636786542F5992B213AB36186D65CA6601A' -or $gatewayHash -ne '115C39E4320CAF2FD2B5D38FE9FC1DD5CA655AA40B921630DF705CA93B2AFA02'){throw 'Wrong interruption boundary'}
if($installer.Path -ine $path -or $installer.StartTime.ToUniversalTime().ToString('o') -cne $started -or (Get-FileHash -LiteralPath $path).Hash -ne $hash){throw 'Installer identity changed'}
$installer.Kill()
$installer.WaitForExit()
[ordered]@{case='Controlled termination of actual isolated NSIS after desktop extraction and before gateway extraction';injection='Test-only 30s pause and marker; remaining generated installer unchanged';terminatedPid=$installer.Id;installerPath=$path;installerSha256=$hash;started=$started;desktopVersion='dev29';desktopHash=$hostHash;gatewayVersion='dev28';gatewayHash=$gatewayHash;registryVersion=(Get-ItemProperty -LiteralPath 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\Tagma P0 S16 Acceptance').DisplayVersion}|ConvertTo-Json|Tee-Object -FilePath (Join-Path $PSScriptRoot 'interrupted-result.json')
