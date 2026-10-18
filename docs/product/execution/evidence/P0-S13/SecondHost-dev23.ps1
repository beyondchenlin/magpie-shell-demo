$ErrorActionPreference='Stop'
$fixture='C:\Users\ai\AppData\Local\Temp\tagma-p0-s09-128d7053-66d3-424a-8ec2-90640d06bf88'
$exe=Join-Path $fixture 'candidate-dev23/tagma-desktop.exe'
if([IO.File]::ReadAllText((Join-Path $fixture 'owner.txt')) -cne 'tagma-p0-s09/native/v1' -or (Get-FileHash -LiteralPath $exe).Hash -ne 'DEE166DFC1BB0F9A02C159D414598C56DE2C7B795E28CA566E9EB2439ABA5CFC'){throw 'Fixture identity mismatch'}
$hosts=@(Get-Process tagma-desktop|Where-Object Path -eq $exe)
if($hosts.Count -ne 1){throw 'Expected primary host only'}
$profile=Join-Path $fixture 'webview-second-p0s13'
if([IO.File]::ReadAllText((Join-Path $profile 'owner.txt')) -cne 'p0-s13-second-native-editor'){throw 'Wrong reusable second profile'}
# Short-lived WebView profile only, estimated <100 MiB; binaries, data and dependencies reused.
# Reuse only the validated temporary second-editor profile.
[IO.File]::WriteAllText((Join-Path $profile 'owner.txt'),'p0-s13-second-native-editor')
$start=New-Object Diagnostics.ProcessStartInfo
$start.FileName=$exe;$start.WorkingDirectory=Split-Path -Parent $exe;$start.UseShellExecute=$false;$start.CreateNoWindow=$true
$start.RedirectStandardOutput=$true;$start.RedirectStandardError=$true
$start.EnvironmentVariables['TAGMA_TEST_CONFIG_DIR']=Join-Path $fixture 'data'
$start.EnvironmentVariables['WEBVIEW2_USER_DATA_FOLDER']=$profile
$start.EnvironmentVariables['TAGMA_TEST_WINDOW_TITLE']='Tagma 隔离测试 dev23 P0-S13 second 128d7053'
$start.EnvironmentVariables['TAGMA_TEST_GATEWAY_PORT']='49697'
$start.EnvironmentVariables.Remove('TAGMA_TEST_INITIALIZE_TOKEN');$start.EnvironmentVariables.Remove('WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS')
$process=[Diagnostics.Process]::Start($start);$process.BeginOutputReadLine();$process.BeginErrorReadLine()
[ordered]@{utc=[DateTime]::UtcNow.ToString('o');pid=$process.Id;started=$process.StartTime.ToUniversalTime().ToString('o');primary=$hosts[0].Id;profile=$profile;role='temporary native second editor, shared isolated data only'}|ConvertTo-Json|Set-Content -LiteralPath 'D:\demo1\tagmaai\.cache\p0-s13-lifecycle\18-second-identity.json' -Encoding UTF8
