param([Parameter(Mandatory=$true)][string]$Json,[string]$Label='')
$ErrorActionPreference='Stop'
[Console]::OutputEncoding=New-Object Text.UTF8Encoding($false)
$dir='D:\demo1\tagmaai\.cache\p0-s16-installer\old-running'
$file=Join-Path $dir 'request.json'
$control=Join-Path $dir 'Control.ps1'
function Run-Request([string]$body) {
  [IO.File]::WriteAllText($file,$body,(New-Object Text.UTF8Encoding($false)))
  $lines=& 'C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe' -NoProfile -File $control -RequestFile $file -AuthorizedNativeChannel
  if($LASTEXITCODE -ne 0){throw ($lines -join "`n")}
  return ($lines -join "`n")
}
$request=$Json | ConvertFrom-Json
$result=Run-Request $Json
if($request.action -eq 'capture'){
  if($Label){Copy-Item -LiteralPath (Join-Path $dir 'latest-capture.png') -Destination (Join-Path $dir ($Label+'.png'))}
  $result;exit
}
if($request.action -eq 'launch' -or $request.expectExit){$result;exit}
if($request.action -eq 'observe'){$observation=$result}else{$observation=Run-Request '{"action":"observe"}'}
$state=$observation | ConvertFrom-Json
$record=[ordered]@{utc=[DateTime]::UtcNow.ToString('o');label=$Label;request=$request;result=if($request.action -eq 'observe'){'observed'}else{$result};observation=$state}
$log=Join-Path $dir 'actions.jsonl'
if((Test-Path -LiteralPath $log) -and (Get-Item -LiteralPath $log).Length -gt 10MB){throw 'Evidence log limit reached'}
Add-Content -LiteralPath $log -Value ($record|ConvertTo-Json -Depth 12 -Compress) -Encoding UTF8
if($Label){[IO.File]::WriteAllText((Join-Path $dir ($Label+'.json')),$observation,(New-Object Text.UTF8Encoding($false)))}
$state|Select-Object pid,window,rect|ConvertTo-Json -Compress
$state.elements|Where-Object {$_.name -or $_.type -eq 'ControlType.Edit'}|ForEach-Object {
  $flags=if(-not $_.enabled){' disabled'}else{''};if($_.focused){$flags+=' focused'};if($_.offscreen){$flags+=' offscreen'}
  $value=if($null -ne $_.value){' = '+$_.value}else{''}
  '{0} {1}{2}: {3}{4}' -f $_.index,($_.type -replace 'ControlType\.',''),$flags,$_.name,$value
}
