param([int]$Runs=20)
$ErrorActionPreference='Stop'
[Console]::OutputEncoding=New-Object Text.UTF8Encoding($false)
if($Runs -ne 20){throw 'Fixed 20-sample benchmark'}
$dir='D:\demo1\tagmaai\.cache\p0-s14-closure'
$fixture='C:\Users\ai\AppData\Local\Temp\tagma-p0-s09-128d7053-66d3-424a-8ec2-90640d06bf88'
$exe=Join-Path $fixture 'candidate-dev25/tagma-desktop.exe'
$data=Join-Path $fixture 'p0s14-faults/empty'
$title='Tagma 隔离测试 dev25 P0-S14 128d7053'
if([IO.File]::ReadAllText((Join-Path $fixture 'owner.txt')) -cne 'tagma-p0-s09/native/v1' -or [IO.File]::ReadAllText((Join-Path $data 'owner.txt')) -cne 'tagma-p0-s14/synthetic-only/v1'){throw 'Owner mismatch'}
if((Get-FileHash -LiteralPath $exe).Hash -ne '4C9207F1F244359174D8E3BA9134C206E8C45C752609D9460A5A68F26CEF86B7'){throw 'Binary changed'}
if(@(Get-CimInstance Win32_Process|Where-Object ExecutablePath -like "$fixture\*").Count){throw 'Owned fixture already running'}
Add-Type -AssemblyName UIAutomationClient,UIAutomationTypes,WindowsBase
$native=[regex]::Match([IO.File]::ReadAllText((Join-Path $dir 'Control-dev25.ps1')),"(?s)Add-Type -TypeDefinition @'\r?\n(.*?)\r?\n'@").Groups[1].Value
Add-Type -TypeDefinition $native
$condition=[Windows.Automation.Condition]::TrueCondition
# Warm the automation transport only. Every measured host/gateway is a new process.
[void][Windows.Automation.AutomationElement]::RootElement
function Find-Control($root,[string]$name,[string]$type='Button') {
 $condition=New-Object Windows.Automation.AndCondition((New-Object Windows.Automation.PropertyCondition([Windows.Automation.AutomationElement]::NameProperty,$name)),(New-Object Windows.Automation.PropertyCondition([Windows.Automation.AutomationElement]::ControlTypeProperty,([Windows.Automation.ControlType]::$type))))
 return $root.FindFirst([Windows.Automation.TreeScope]::Descendants,$condition)
}
function Invoke-Owned($root,[string]$name) {
 $el=Find-Control $root $name
 if(-not $el -or -not $el.Current.IsEnabled){throw ('Missing enabled native control '+$name)}
 ($el.GetCurrentPattern([Windows.Automation.InvokePattern]::Pattern)).Invoke()
}
$samples=@();$child=$null;$failure=$null
$environment=[ordered]@{utc=[DateTime]::UtcNow.ToString('o');os=(Get-CimInstance Win32_OperatingSystem|Select-Object Caption,Version,BuildNumber,TotalVisibleMemorySize);cpu=(Get-CimInstance Win32_Processor|Select-Object Name,NumberOfLogicalProcessors);build='Windows x64 debug embedded assets dev25';exe=$exe;sha256=(Get-FileHash -LiteralPath $exe).Hash;method='20 process-cold starts; shared owned configuration and WebView profile; warm OS/file caches; UIA Invoke Settings plus visible Settings group confirms interaction, no CDP/DOM; gateway footer observed separately; concurrent workstation activity retained';budgetMs=3000;percentile='nearest rank'}
try {
 for($run=1;$run -le $Runs;$run++) {
  $info=New-Object Diagnostics.ProcessStartInfo;$info.FileName=$exe;$info.WorkingDirectory=Split-Path -Parent $exe;$info.UseShellExecute=$false;$info.CreateNoWindow=$true
  $info.EnvironmentVariables['TAGMA_TEST_CONFIG_DIR']=$data;$info.EnvironmentVariables['TAGMA_TEST_GATEWAY_PORT']='49697';$info.EnvironmentVariables['TAGMA_TEST_WINDOW_TITLE']=$title;$info.EnvironmentVariables['WEBVIEW2_USER_DATA_FOLDER']=Join-Path $fixture 'webview'
  $info.EnvironmentVariables.Remove('TAGMA_TEST_INITIALIZE_TOKEN');$info.EnvironmentVariables.Remove('WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS')
  $clock=[Diagnostics.Stopwatch]::StartNew();$child=[Diagnostics.Process]::Start($info);$root=$null;$interactive=$null;$gateway=$null;$invoked=$false
  while($clock.Elapsed.TotalSeconds -lt 15 -and ($null -eq $interactive -or $null -eq $gateway)) {
   if($child.HasExited){throw 'Host exited before readiness'}
   if(-not $root){$windows=@([P0Native]::WindowsForPid($child.Id)|Where-Object {$_.Title -ceq $title -and $_.Visible});if($windows.Count -eq 1){$root=[Windows.Automation.AutomationElement]::FromHandle([IntPtr]$windows[0].Handle)}}
   if($root){
    $elements=@($root.FindAll([Windows.Automation.TreeScope]::Descendants,$condition));$names=@($elements|ForEach-Object {$_.Current.Name})
    if(-not $invoked){$settings=Find-Control $root '设置';if($settings -and $settings.Current.IsEnabled -and $names -contains '已保存版本'){($settings.GetCurrentPattern([Windows.Automation.InvokePattern]::Pattern)).Invoke();$invoked=$true}}
    elseif($null -eq $interactive -and (Find-Control $root '设置' 'Group')){$interactive=[Math]::Round($clock.Elapsed.TotalMilliseconds,2)}
    $index=[Array]::IndexOf($names,'运行中版本');if($null -eq $gateway -and $index -ge 0 -and $names.Length -gt ($index+2) -and $names[$index+2] -eq '2'){$gateway=[Math]::Round($clock.Elapsed.TotalMilliseconds,2)}
   }
   if($null -eq $interactive -or $null -eq $gateway){Start-Sleep -Milliseconds 15}
  }
  if($null -eq $interactive -or $null -eq $gateway){throw 'Native readiness deadline exceeded'}
  $samples+=,[ordered]@{run=$run;pid=$child.Id;interactiveMs=$interactive;gatewayObservedMs=$gateway;utc=[DateTime]::UtcNow.ToString('o')}
  $samples[-1]|ConvertTo-Json -Compress|Add-Content -LiteralPath (Join-Path $dir 'startup-samples.jsonl') -Encoding UTF8
  Invoke-Owned $root '退出 Tagma'
  $until=[DateTime]::UtcNow.AddSeconds(3);while(-not (Find-Control $root '等待后退出') -and [DateTime]::UtcNow -lt $until){Start-Sleep -Milliseconds 20}
  Invoke-Owned $root '等待后退出'
  if(-not $child.WaitForExit(13000)){throw 'Native confirmed quit exceeded bound'}
  if($child.ExitCode -ne 0 -or (Test-Path -LiteralPath (Join-Path $data 'runtime.json'))){throw 'Unclean owned exit'}
  $child.Dispose();$child=$null;Write-Output ('Native startup sample {0}/20: interactive {1} ms, gateway {2} ms' -f $run,$interactive,$gateway)
  Start-Sleep -Milliseconds 100
 }
} catch {$failure=$_.Exception.Message;throw}
finally {
 if($child -and -not $child.HasExited){
  # Emergency cleanup of this exact owned process only; failed run is not counted as passing.
  if($child.MainModule.FileName -ceq $exe){$child.Kill();[void]$child.WaitForExit(5000)}
 }
 $ordered=@($samples|ForEach-Object {$_.interactiveMs}|Sort-Object)
 $gateways=@($samples|ForEach-Object {$_.gatewayObservedMs}|Sort-Object)
 $environment.samples=$samples;$environment.failure=$failure;$environment.completed=$samples.Count
 if($samples.Count -eq 20){$environment.p95Ms=$ordered[18];$environment.gatewayP95Ms=$gateways[18];$environment.localDebugWithinBudget=$ordered[18] -le 3000}
 $environment|ConvertTo-Json -Depth 8|Set-Content -LiteralPath (Join-Path $dir 'native-startup-result.json') -Encoding UTF8
}
