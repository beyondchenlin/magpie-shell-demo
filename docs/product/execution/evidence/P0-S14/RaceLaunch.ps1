$ErrorActionPreference='Stop'
$fixture='C:\Users\ai\AppData\Local\Temp\tagma-p0-s09-128d7053-66d3-424a-8ec2-90640d06bf88'
$records='D:\demo1\tagmaai\.cache\p0-s14-closure'
$exe=Join-Path $fixture 'candidate-dev27/tagma-desktop.exe'
if([IO.File]::ReadAllText((Join-Path $fixture 'owner.txt')) -cne 'tagma-p0-s09/native/v1' -or (Get-FileHash -LiteralPath $exe).Hash -ne 'F158AFE0BF60791EA03CDD76B4085455ACC09476A79CBCB2CBB59B4A6A82A08A'){throw 'Fixture identity'}
if(@(Get-CimInstance Win32_Process | Where-Object {$_.ExecutablePath -like "$fixture\*"}).Count){throw 'Fixture already running'}
$profile=Join-Path $fixture 'webview-second-p0s14'
if(Test-Path -LiteralPath $profile){throw 'Second profile exists'}
# Only a task-owned temporary WebView profile, <100 MiB expected. Reuse binaries/data.
New-Item -ItemType Directory -Path $profile|Out-Null
[IO.File]::WriteAllText((Join-Path $profile 'owner.txt'),'tagma-p0-s14/second-window/v1')
$starts=@()
foreach($role in @('primary','second')){
 $start=New-Object Diagnostics.ProcessStartInfo
 $start.FileName=$exe;$start.WorkingDirectory=Split-Path -Parent $exe;$start.UseShellExecute=$false;$start.CreateNoWindow=$true
 $start.RedirectStandardOutput=$true;$start.RedirectStandardError=$true
 $start.EnvironmentVariables['TAGMA_TEST_CONFIG_DIR']=Join-Path $fixture 'data'
 $start.EnvironmentVariables['WEBVIEW2_USER_DATA_FOLDER']=if($role -eq 'primary'){Join-Path $fixture 'webview'}else{$profile}
 $start.EnvironmentVariables['TAGMA_TEST_WINDOW_TITLE']=if($role -eq 'primary'){'Tagma 隔离测试 dev27 P0-S14 128d7053'}else{'Tagma 隔离测试 dev27 P0-S14 second 128d7053'}
 $start.EnvironmentVariables['TAGMA_TEST_GATEWAY_PORT']='49697'
 $start.EnvironmentVariables.Remove('TAGMA_TEST_INITIALIZE_TOKEN');$start.EnvironmentVariables.Remove('WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS')
 $starts+=,$start
}
$before=[DateTime]::UtcNow
$processes=@();foreach($start in $starts){$p=[Diagnostics.Process]::Start($start);$p.BeginOutputReadLine();$p.BeginErrorReadLine();$processes+=,$p}
$after=[DateTime]::UtcNow
[ordered]@{before=$before.ToString('o');after=$after.ToString('o');launchSpanMs=($after-$before).TotalMilliseconds;processes=@(for($n=0;$n -lt 2;$n++){[ordered]@{pid=$processes[$n].Id;path=$processes[$n].Path;started=$processes[$n].StartTime.ToUniversalTime().ToString('o');title=$starts[$n].EnvironmentVariables['TAGMA_TEST_WINDOW_TITLE']}});secondProfile=$profile}|ConvertTo-Json -Depth 5|Set-Content -LiteralPath (Join-Path $records '57-race-launch.json') -Encoding utf8
