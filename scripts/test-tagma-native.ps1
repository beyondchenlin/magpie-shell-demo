param(
  [string]$Executable = 'target/debug/tagma-desktop.exe',
  [Parameter(Mandatory=$true)][string]$ResultPath,
  [string]$EvidenceDirectory,
  [ValidateSet('full','appearance','recovery','profiles','gateway','performance','workspace','chat','cis')][string]$Mode = 'full'
)
$ErrorActionPreference='Stop'
$taskExecutable=(Resolve-Path -LiteralPath $Executable).Path
$taskResultPath=[IO.Path]::GetFullPath($ResultPath)
if(Test-Path -LiteralPath $taskResultPath) { throw 'Result already exists; choose a fresh evidence file' }
if($EvidenceDirectory -and (Test-Path -LiteralPath $EvidenceDirectory)) { throw 'Screenshot directory already exists; preserve earlier evidence' }
$taskTempRoot=[IO.Path]::GetFullPath($env:TEMP)
$taskFixture=Join-Path $taskTempRoot ('tagma-native-owned-'+[guid]::NewGuid().ToString())
New-Item -ItemType Directory -Path $taskFixture | Out-Null
$taskOperation=[IO.Path]::GetFileName($taskFixture).Substring('tagma-native-owned-'.Length)
@{owner='tagma-native-test/v1';operation_id=$taskOperation} | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $taskFixture 'tagma-native-fixture-owner.json') -Encoding utf8NoBOM
$taskCredentialCleanup=$true
$taskNames=@('TAGMA_TEST_CONFIG_DIR','TAGMA_NATIVE_EXE','TAGMA_NATIVE_EVIDENCE_DIR','TAGMA_NATIVE_SMOKE_MODE')
$taskOldEnvironment=@{}
foreach($taskName in $taskNames) { $taskOldEnvironment[$taskName]=[Environment]::GetEnvironmentVariable($taskName,'Process') }
$taskExit=1
$taskCleaned=$false
try {
  if($Mode -eq 'recovery') {
    [IO.File]::WriteAllText((Join-Path $taskFixture 'config-initialization.json'),'{tagma-corrupt-fixture',[Text.UTF8Encoding]::new($false))
    [IO.File]::WriteAllText((Join-Path $taskFixture 'unrelated-output'),'keep-test-output',[Text.UTF8Encoding]::new($false))
  }
  $env:TAGMA_TEST_CONFIG_DIR=$taskFixture
  $env:TAGMA_NATIVE_EXE=$taskExecutable
  $env:TAGMA_NATIVE_SMOKE_MODE=$Mode
  if($EvidenceDirectory) { $env:TAGMA_NATIVE_EVIDENCE_DIR=[IO.Path]::GetFullPath($EvidenceDirectory) }
  else { Remove-Item Env:TAGMA_NATIVE_EVIDENCE_DIR -ErrorAction SilentlyContinue }
  if($Mode -eq 'performance') { node (Join-Path $PSScriptRoot 'tagma-startup-benchmark.mjs') }
  else { node (Join-Path $PSScriptRoot 'tagma-native-smoke.mjs') }
  $taskExit=$LASTEXITCODE
} finally {
  foreach($taskName in $taskNames) { [Environment]::SetEnvironmentVariable($taskName,$taskOldEnvironment[$taskName],'Process') }
  New-Item -ItemType Directory -Path ([IO.Path]::GetDirectoryName($taskResultPath)) -Force | Out-Null
  $taskNativeResult=Join-Path $taskFixture 'native-result.json'
  if(Test-Path -LiteralPath $taskNativeResult) { Copy-Item -LiteralPath $taskNativeResult -Destination $taskResultPath }
  else { @{result='failed';exitCode=$taskExit;fixture=$taskFixture} | ConvertTo-Json | Set-Content -LiteralPath $taskResultPath -Encoding utf8 }
  # Close the owned host in the JS finally first. Never terminate arbitrary matching processes.
  $taskReferences=@()
  for($taskAttempt=0;$taskAttempt -lt 3;$taskAttempt++) {
    $taskReferences=@(Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -and $_.CommandLine.Contains($taskFixture) })
    if(-not $taskReferences.Count) { break }
    Start-Sleep -Seconds 2
  }
  $taskAbsolute=[IO.Path]::GetFullPath($taskFixture)
  if([IO.Path]::GetDirectoryName($taskAbsolute) -ne $taskTempRoot) { throw 'Cleanup boundary mismatch' }
  $taskRoot=Get-Item -LiteralPath $taskAbsolute -Force
  $taskItems=@(Get-ChildItem -LiteralPath $taskAbsolute -Force -Recurse)
  $taskLinks=@(@($taskRoot)+$taskItems | Where-Object { $_.Attributes -band [IO.FileAttributes]::ReparsePoint })
  $taskLocked=$false
  if(-not $taskReferences.Count -and -not $taskLinks.Count) {
    foreach($taskFile in @($taskItems | Where-Object { -not $_.PSIsContainer })) {
      try { $taskHandle=[IO.File]::Open($taskFile.FullName,[IO.FileMode]::Open,[IO.FileAccess]::ReadWrite,[IO.FileShare]::None);$taskHandle.Dispose() }
      catch { $taskLocked=$true; break }
    }
  }
  $taskLogicalBytes=($taskItems | Where-Object { -not $_.PSIsContainer } | Measure-Object Length -Sum).Sum
  if($Mode -in @('gateway','performance','chat')) {
    $taskCredentialCleanup=$false
    if(-not $taskReferences.Count -and -not $taskLinks.Count -and -not $taskLocked) {
      & (Join-Path $PSScriptRoot '../target/debug/examples/cleanup_native_fixture.exe') $taskAbsolute
      $taskCredentialCleanup=$LASTEXITCODE -eq 0
    }
  }
  $taskSafety=[ordered]@{path=$taskAbsolute;purpose='owned synthetic native test and isolated WebView profile';logicalBytes=$taskLogicalBytes;reparsePoints=$taskLinks.Count;processReferences=$taskReferences.Count;locked=$taskLocked;resultPreserved=$taskResultPath}
  $taskSafety | ConvertTo-Json -Compress | Write-Output
  if(-not $taskReferences.Count -and -not $taskLinks.Count -and -not $taskLocked -and $taskCredentialCleanup) {
    $taskBefore=(Get-Item -LiteralPath $taskAbsolute).LastWriteTimeUtc
    if($taskBefore -eq $taskRoot.LastWriteTimeUtc) {
      Remove-Item -LiteralPath $taskAbsolute -Recurse -Force
      $taskCleaned=$true
      Write-Output ('Removed owned native fixture: '+$taskAbsolute)
    }
  }
  if(-not $taskCleaned) { Write-Warning ('Retained fixture; cleanup could not be proven safe: '+$taskAbsolute) }
}
if($taskExit -ne 0) { exit $taskExit }
if(-not $taskCleaned) { exit 2 }
