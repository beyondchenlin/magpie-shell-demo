# Internal Windows candidate entry, not a release installer or a data downgrade tool.
param(
  [Parameter(Mandatory=$true)][string]$BindingFile,
  [switch]$ValidateOnly
)
$ErrorActionPreference='Stop'
Set-StrictMode -Version Latest
[Console]::OutputEncoding=New-Object Text.UTF8Encoding($false)
function Assert-Ordinary([string]$Path,[bool]$Directory) {
  if(-not [IO.Path]::IsPathRooted($Path)){throw 'An absolute path is required'}
  $item=Get-Item -LiteralPath $Path -Force
  if([bool]$item.PSIsContainer -ne $Directory){throw 'Unexpected path type'}
  $cursor=$item
  while($null -ne $cursor){
    if($cursor.Attributes -band [IO.FileAttributes]::ReparsePoint){throw 'Directory links and reparse points are not permitted'}
    if($cursor -is [IO.FileInfo]){$cursor=$cursor.Directory}else{$cursor=$cursor.Parent}
  }
  return $item.FullName
}
function Assert-Child([string]$Path,[string]$Root) {
  if(-not $Path.StartsWith($Root.TrimEnd('\')+'\',[StringComparison]::OrdinalIgnoreCase)){throw 'Path is outside the isolated root'}
}
function Assert-Hash([string]$Path,[string]$Expected) {
  if($Expected -notmatch '^[0-9A-Fa-f]{64}$'){throw 'Invalid expected SHA-256'}
  if((Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash -ine $Expected){throw ('Candidate identity mismatch: '+[IO.Path]::GetFileName($Path))}
}
$bindingPath=Assert-Ordinary $BindingFile $false
if((Get-Item -LiteralPath $bindingPath).Length -gt 16384){throw 'Candidate binding exceeds its size limit'}
$binding=Get-Content -LiteralPath $bindingPath -Raw -Encoding UTF8|ConvertFrom-Json
if($binding.schema_version -ne 1 -or $binding.source_commit -notmatch '^[0-9a-f]{40}$' -or [string]::IsNullOrWhiteSpace($binding.candidate)){throw 'Invalid candidate binding'}
$fixture=Assert-Ordinary $binding.fixture_root $true
$owner=Assert-Ordinary (Join-Path $fixture 'owner.txt') $false
if([IO.File]::ReadAllText($owner) -cne $binding.owner -or $binding.owner -cne 'tagma-p0-s09/native/v1'){throw 'Isolated owner mismatch'}
$install=Assert-Ordinary $binding.install_dir $true
Assert-Child $install $fixture
$data=Assert-Ordinary (Join-Path $fixture 'data') $true
$webview=Assert-Ordinary (Join-Path $fixture 'webview') $true
$desktop=Assert-Ordinary (Join-Path $install 'tagma-desktop.exe') $false
$gateway=Assert-Ordinary (Join-Path $install 'tagma-gateway.exe') $false
$control=Assert-Ordinary $binding.control_path $false
$records=Assert-Ordinary $binding.record_dir $true
if([IO.Path]::GetDirectoryName($control) -ine $records){throw 'Controller and evidence directory differ'}
Assert-Hash $desktop $binding.desktop_sha256
Assert-Hash $gateway $binding.gateway_sha256
Assert-Hash $control $binding.control_sha256
# The pinned controller carries the exact data/window/title binding. A stale
# controller must not silently launch another candidate with otherwise valid EXEs.
$controller=[IO.File]::ReadAllText($control)
if(-not $controller.Contains($binding.desktop_sha256) -or -not $controller.Contains($binding.window_title) -or -not $controller.Contains($fixture) -or -not $controller.Contains($records)){throw 'Controller binding differs from candidate'}
if($ValidateOnly){
  [ordered]@{validated=$true;candidate=$binding.candidate;source_commit=$binding.source_commit;desktop=$desktop;gateway=$gateway;data=$data;webview=$webview}|ConvertTo-Json -Compress
  return
}
$hosts=@(Get-Process -Name tagma-desktop -ErrorAction SilentlyContinue|Where-Object {$_.Path -ieq $desktop})
if($hosts.Count -gt 1){throw 'Multiple isolated hosts'}
$inFixture=@(Get-CimInstance Win32_Process -Filter "Name='tagma-desktop.exe' OR Name='tagma-gateway.exe'"|Where-Object {$_.ExecutablePath -and $_.ExecutablePath.StartsWith($fixture+'\',[StringComparison]::OrdinalIgnoreCase)})
if(@($inFixture|Where-Object {$_.ExecutablePath -ine $desktop -and $_.ExecutablePath -ine $gateway}).Count){throw 'Another candidate still owns the isolated data'}
if($hosts.Count -eq 0 -and $inFixture.Count){throw 'An isolated gateway is still running; resolve its ownership before launch'}
$action=if($hosts.Count -eq 1){'show'}else{'launch'}
$request=Join-Path $records ('entry-request-'+[guid]::NewGuid().ToString('N')+'.json')
try {
  [IO.File]::WriteAllText($request,('{"action":"'+$action+'"}'),(New-Object Text.UTF8Encoding($false)))
  $env:PSModulePath=Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\Modules'
  & (Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe') -NoProfile -File $control -RequestFile $request -AuthorizedNativeChannel
  if($LASTEXITCODE -ne 0){throw 'Native candidate entry failed'}
} finally {
  # Remove only the request file created by this invocation, never evidence.
  if(Test-Path -LiteralPath $request){Remove-Item -LiteralPath $request -Force}
}
