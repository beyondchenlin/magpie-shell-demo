param([Parameter(Mandatory=$true)][string]$BindingFile)
$ErrorActionPreference='Stop'
Set-StrictMode -Version Latest
$entry=Join-Path $PSScriptRoot 'Open-IsolatedTagma.ps1'
$binding=Get-Content -LiteralPath $BindingFile -Raw -Encoding UTF8|ConvertFrom-Json
$fixture=$binding.fixture_root
$before=@(Get-CimInstance Win32_Process -Filter "Name='tagma-desktop.exe' OR Name='tagma-gateway.exe'"|Where-Object {$_.ExecutablePath -and $_.ExecutablePath.StartsWith($fixture+'\',[StringComparison]::OrdinalIgnoreCase)}|Sort-Object ProcessId|Select-Object ProcessId,ExecutablePath,CreationDate)|ConvertTo-Json -Compress
$valid=& $entry -BindingFile $BindingFile -ValidateOnly
if(-not ($valid|ConvertFrom-Json).validated){throw 'Valid binding was rejected'}
$cases=@(
 @{field='gateway_sha256';value=('0'*64);match='Candidate identity mismatch'},
 @{field='desktop_sha256';value=('0'*64);match='Candidate identity mismatch'},
 @{field='control_sha256';value=('0'*64);match='Candidate identity mismatch'},
 @{field='owner';value='not-this-isolated-owner';match='Isolated owner mismatch'},
 @{field='window_title';value='not-this-window-title';match='Controller binding differs'}
)
$checks=@('valid paired binding accepted')
foreach($case in $cases){
 $copy=($binding|ConvertTo-Json -Depth 8)|ConvertFrom-Json
 $copy.($case.field)=$case.value
 $path=Join-Path (Split-Path -Parent $BindingFile) ('test-binding-'+[guid]::NewGuid().ToString('N')+'.json')
 try{
  [IO.File]::WriteAllText($path,($copy|ConvertTo-Json -Depth 8),(New-Object Text.UTF8Encoding($false)))
  $rejected=$false
  try{& $entry -BindingFile $path -ValidateOnly|Out-Null}catch{
   if($_.Exception.Message -notlike ('*'+$case.match+'*')){throw}
   $rejected=$true
  }
  if(-not $rejected){throw ('Identity mutation was accepted: '+$case.field)}
  $checks+=($case.field+' mismatch rejected before launch')
 }finally{
  # This exact file was created above; preserve candidate data and evidence.
  if(Test-Path -LiteralPath $path){Remove-Item -LiteralPath $path -Force}
 }
}
$after=@(Get-CimInstance Win32_Process -Filter "Name='tagma-desktop.exe' OR Name='tagma-gateway.exe'"|Where-Object {$_.ExecutablePath -and $_.ExecutablePath.StartsWith($fixture+'\',[StringComparison]::OrdinalIgnoreCase)}|Sort-Object ProcessId|Select-Object ProcessId,ExecutablePath,CreationDate)|ConvertTo-Json -Compress
if($before -cne $after){throw 'Owned process identities changed during validation-only tests'}
[ordered]@{scope='isolated delivery validation; no process launch or data migration';checks=$checks;owned_processes_unchanged=$true}|ConvertTo-Json -Depth 5
