$ErrorActionPreference='Stop'
. "$PSScriptRoot\Inventory.ps1"
$installers=@(Get-Content -LiteralPath (Join-Path $taskRecord 'retained-installers.json') -Raw|ConvertFrom-Json)
$results=[Collections.Generic.List[object]]::new()
foreach($version in @('v0.1.207','v0.1.208')){
 $target=[IO.Path]::GetFullPath((Join-Path $taskRoot "release\$version\win-unpacked"))
 if($target -notin @('D:\demo1\tagmaai\release\v0.1.207\win-unpacked','D:\demo1\tagmaai\release\v0.1.208\win-unpacked')){throw 'Exact cleanup boundary mismatch'}
 $plan=Get-Content -LiteralPath (Join-Path $taskRecord ($version+'-unpacked-before.json')) -Raw|ConvertFrom-Json
 if($plan.root -cne $target){throw 'Plan mismatch'}
 $current=Get-Snapshot $target $false
 $index=@{};foreach($file in $plan.files){$index[$file.relative]=$file}
 if($current.fileCount -ne $plan.fileCount){throw 'Unpacked count changed'}
 foreach($file in $current.files){$old=$index[$file.relative];if(-not $old -or $old.bytes -ne $file.bytes -or $old.identity -cne $file.identity -or $old.links -ne $file.links -or ([datetime]$old.modifiedUtc).ToUniversalTime().Ticks -ne ([datetime]$file.modifiedUtc).ToUniversalTime().Ticks){throw 'Unpacked changed'}}
 foreach($installer in $installers){if((Get-FileHash -LiteralPath $installer.path).Hash -cne $installer.sha256){throw 'Retained installer changed'}}
 Assert-NoProcesses $target
 Assert-OrdinaryAncestors $target
 $before=@(Get-PSDrive C,D|Select-Object Name,Free)
 Remove-Item -LiteralPath $target -Recurse -Force -ErrorAction Stop
 if(Test-Path -LiteralPath $target){throw 'Unpacked cleanup incomplete'}
 $results.Add([pscustomobject]@{target=$target;files=$plan.fileCount;logicalBytes=$plan.logicalBytes;completed=$true;diskBefore=$before;diskAfter=@(Get-PSDrive C,D|Select-Object Name,Free)})
 $results.ToArray()|ConvertTo-Json -Depth 5|Set-Content -LiteralPath (Join-Path $taskRecord 'unpacked-cleanup-results.json') -Encoding utf8
}
foreach($installer in $installers){if((Get-FileHash -LiteralPath $installer.path).Hash -cne $installer.sha256){throw 'Retained installer changed after cleanup'}}
$results.ToArray()|ConvertTo-Json -Depth 5
