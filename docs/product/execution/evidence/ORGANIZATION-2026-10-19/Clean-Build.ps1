$ErrorActionPreference='Stop'
. "$PSScriptRoot\Inventory.ps1"
$target=[IO.Path]::GetFullPath('D:\demo1\tagmaai\target\debug\build')
if($target -cne 'D:\demo1\tagmaai\target\debug\build' -or -not $target.StartsWith($taskRoot+'\target\debug\',[StringComparison]::OrdinalIgnoreCase)){throw 'Cleanup boundary mismatch'}
$plan=Get-Content -LiteralPath (Join-Path $taskRecord 'build-before.json') -Raw|ConvertFrom-Json
if($plan.root -cne $target){throw 'Plan mismatch'}
$protected=Get-Content -LiteralPath (Join-Path $taskRoot 'docs\product\execution\evidence\SPACE-S03-candidates.json') -Raw|ConvertFrom-Json
$protectedBefore=@($protected.files|ForEach-Object{$item=Get-Item -LiteralPath $_.path;[pscustomobject]@{path=$item.FullName;bytes=$item.Length;modified=$item.LastWriteTimeUtc.Ticks}})
if($protectedBefore.Count -ne 250){throw 'Protected history mismatch'}
foreach($file in $protectedBefore){if($file.path.StartsWith($target+'\',[StringComparison]::OrdinalIgnoreCase)){throw 'Previously denied file in target'}}
Assert-NoProcesses $target
$current=@(Get-OrdinaryTree $target)
if($current.Count -ne $plan.fileCount){throw 'Build file count changed'}
$index=@{};foreach($file in $plan.files){$index[$file.relative]=$file}
foreach($item in $current){
 $relative=[IO.Path]::GetRelativePath($target,$item.FullName);$old=$index[$relative]
 if(-not $old -or $item.Length -ne $old.bytes -or $item.LastWriteTimeUtc.Ticks -ne ([datetime]$old.modifiedUtc).ToUniversalTime().Ticks -or $item.LastWriteTimeUtc -gt [datetime]::UtcNow.AddMinutes(-3)){throw "Build changed: $relative"}
 $stream=[IO.File]::Open($item.FullName,[IO.FileMode]::Open,[IO.FileAccess]::Read,[IO.FileShare]::None)
 try{$info=[OrgFileInfo+Info]::new();if(-not [OrgFileInfo]::GetFileInformationByHandle($stream.SafeFileHandle,[ref]$info)){throw 'Identity check failed'};if("$($info.Volume):$($info.IndexHigh):$($info.IndexLow)" -cne $old.identity -or $info.Links -ne $old.links){throw 'Build identity changed'}}finally{$stream.Dispose()}
}
Assert-NoProcesses $target
Assert-OrdinaryAncestors $target
$before=@(Get-PSDrive C,D|Select-Object Name,Free)
$result=[ordered]@{target=$target;purpose='Rebuildable Cargo build-script outputs only; deps and previous denied paths excluded';files=$plan.fileCount;logicalBytes=$plan.logicalBytes;allocation=Get-Content -LiteralPath (Join-Path $taskRecord 'build-allocation.json') -Raw|ConvertFrom-Json;startedUtc=[datetime]::UtcNow.ToString('o');diskBefore=$before;completed=$false;protectedFilesUnchanged=$false}
try{
 Remove-Item -LiteralPath $target -Recurse -Force -ErrorAction Stop
 if(Test-Path -LiteralPath $target){throw 'Target still exists'}
 foreach($file in $protectedBefore){$item=Get-Item -LiteralPath $file.path;if($item.Length -ne $file.bytes -or $item.LastWriteTimeUtc.Ticks -ne $file.modified){throw 'Protected file changed'}}
 $result.protectedFilesUnchanged=$true;$result.completed=$true
}catch{$result.error=$_.Exception.Message;throw}
finally{$result.finishedUtc=[datetime]::UtcNow.ToString('o');$result.diskAfter=@(Get-PSDrive C,D|Select-Object Name,Free);$result|ConvertTo-Json -Depth 5|Set-Content -LiteralPath (Join-Path $taskRecord 'cleanup-result.json') -Encoding utf8}
$result|ConvertTo-Json -Depth 5
