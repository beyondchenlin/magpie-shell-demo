$ErrorActionPreference='Stop'
. "$PSScriptRoot\Inventory.ps1"
$retained=Join-Path $taskRoot '.local-retained'
if(-not(Test-Path -LiteralPath $retained)){New-Item -ItemType Directory -Path $retained|Out-Null}
Assert-OrdinaryAncestors $retained
$moves=@(
 @{name='deliveries';source='D:\demo1\tagmaai-deliveries';destination=(Join-Path $retained 'deliveries')},
 @{name='preview';source='D:\demo1\tagmaai-preview';destination=(Join-Path $retained 'preview')}
)
$results=[Collections.Generic.List[object]]::new()
foreach($move in $moves){
 $source=[IO.Path]::GetFullPath($move.source);$destination=[IO.Path]::GetFullPath($move.destination)
 if($source -notin @('D:\demo1\tagmaai-deliveries','D:\demo1\tagmaai-preview') -or -not $destination.StartsWith($retained+'\',[StringComparison]::OrdinalIgnoreCase) -or [IO.Path]::GetPathRoot($source) -ne [IO.Path]::GetPathRoot($destination)){throw 'Move boundary mismatch'}
 if(Test-Path -LiteralPath $destination){throw "Destination exists: $destination"}
 $before=Get-Content -LiteralPath (Join-Path $taskRecord ($move.name+'-before.json')) -Raw|ConvertFrom-Json
 $current=Get-Snapshot $source $true
 $index=@{};foreach($file in $before.files){$index[$file.relative]=$file}
 if($current.fileCount -ne $before.fileCount){throw 'Source count changed'}
 foreach($file in $current.files){$old=$index[$file.relative];if(-not $old -or $old.sha256 -ne $file.sha256 -or $old.identity -ne $file.identity -or $old.bytes -ne $file.bytes){throw "Source changed: $($file.relative)"}}
 Assert-NoProcesses $source
 Move-Item -LiteralPath $source -Destination $destination -ErrorAction Stop
 try {New-Item -ItemType Junction -Path $source -Target $destination -ErrorAction Stop|Out-Null}
 catch {if(-not(Test-Path -LiteralPath $source)){Move-Item -LiteralPath $destination -Destination $source};throw}
 $after=Get-Snapshot $destination $true
 if($after.fileCount -ne $before.fileCount){throw 'Destination count mismatch; retained for review'}
 foreach($file in $after.files){$old=$index[$file.relative];if(-not $old -or $old.sha256 -ne $file.sha256 -or $old.identity -ne $file.identity -or $old.bytes -ne $file.bytes){throw "Destination mismatch: $($file.relative)"}}
 $link=Get-Item -LiteralPath $source -Force
 if($link.LinkType -ne 'Junction' -or [IO.Path]::GetFullPath($link.Target) -ine $destination){throw 'Compatibility junction mismatch'}
 $results.Add([pscustomobject]@{oldPath=$source;actualPath=$destination;files=$after.fileCount;logicalBytes=$after.logicalBytes;allHashesAndFileIdentitiesUnchanged=$true;linkType=$link.LinkType})
 $results.ToArray()|ConvertTo-Json -Depth 4|Set-Content -LiteralPath (Join-Path $taskRecord 'move-results.json') -Encoding utf8
}
$results.ToArray()|ConvertTo-Json
