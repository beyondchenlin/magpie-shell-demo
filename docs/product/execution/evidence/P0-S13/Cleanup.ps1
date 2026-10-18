$ErrorActionPreference='Stop'
$recordRoot='D:\demo1\tagmaai\.cache\p0-s13-lifecycle'
$targets=@(
 @{path='D:\demo1\tagmaai\.cache\p0-s13-lifecycle\motion-browser-profile';boundary='D:\demo1\tagmaai\.cache\p0-s13-lifecycle';owner='p0-s13-synthetic-motion-only'},
 @{path='C:\Users\ai\AppData\Local\Temp\tagma-p0-s09-128d7053-66d3-424a-8ec2-90640d06bf88\webview-second-p0s13';boundary='C:\Users\ai\AppData\Local\Temp\tagma-p0-s09-128d7053-66d3-424a-8ec2-90640d06bf88';owner='p0-s13-second-native-editor'}
)
Add-Type -TypeDefinition @'
using System;
using System.IO;
using System.Runtime.InteropServices;
using Microsoft.Win32.SafeHandles;
public static class P0Allocation {
 [StructLayout(LayoutKind.Sequential)] struct FileTime {public uint Low,High;}
 [StructLayout(LayoutKind.Sequential)] struct Info {public uint Attr;public FileTime Creation,Access,Write;public uint Volume,SizeHigh,SizeLow,Links,IndexHigh,IndexLow;}
 [StructLayout(LayoutKind.Sequential)] struct Standard {public long Allocation,End;public uint Links;[MarshalAs(UnmanagedType.U1)]public bool DeletePending;[MarshalAs(UnmanagedType.U1)]public bool Directory;}
 [DllImport("kernel32.dll",SetLastError=true)] static extern bool GetFileInformationByHandle(SafeFileHandle file,out Info info);
 [DllImport("kernel32.dll",SetLastError=true)] static extern bool GetFileInformationByHandleEx(SafeFileHandle file,int cls,out Standard info,uint size);
 public class Fact {public string Id;public long Allocated;public uint Links;}
 public static Fact Read(string path){using(var stream=new FileStream(path,FileMode.Open,FileAccess.Read,FileShare.None)){Info i;Standard s;if(!GetFileInformationByHandle(stream.SafeFileHandle,out i)||!GetFileInformationByHandleEx(stream.SafeFileHandle,1,out s,(uint)Marshal.SizeOf(typeof(Standard))))throw new IOException("Allocation/identity unavailable");return new Fact{Id=i.Volume+":"+i.IndexHigh+":"+i.IndexLow,Allocated=s.Allocation,Links=i.Links};}}
}
'@
$before=@(Get-PSDrive C,D|ForEach-Object {@{name=$_.Name;freeBytes=$_.Free}})
$processes=@(Get-CimInstance Win32_Process)
$results=@()
foreach($target in $targets){
 $resolved=(Resolve-Path -LiteralPath $target.path).Path
 if($resolved -cne $target.path -or -not $resolved.StartsWith($target.boundary+'\',[StringComparison]::OrdinalIgnoreCase)){throw 'Cleanup outside exact boundary'}
 $items=@(Get-Item -LiteralPath $resolved)+@(Get-ChildItem -LiteralPath $resolved -Force -Recurse)
 if(@($items|Where-Object {$_.Attributes -band [IO.FileAttributes]::ReparsePoint}).Count){throw 'Reparse point in cleanup tree'}
 if([IO.File]::ReadAllText((Join-Path $resolved 'owner.txt')) -cne $target.owner){throw 'Cleanup owner mismatch'}
 if(@($processes|Where-Object {$_.CommandLine -and $_.CommandLine.IndexOf($resolved,[StringComparison]::OrdinalIgnoreCase) -ge 0}).Count){throw 'Profile still referenced by process'}
 $files=@($items|Where-Object {-not $_.PSIsContainer})
 if(@($files|Where-Object {([DateTime]::UtcNow-$_.LastWriteTimeUtc).TotalSeconds -lt 60}).Count){throw 'Profile still recently writing'}
 $unique=@{};$externalLinks=$false
 foreach($file in $files){$fact=[P0Allocation]::Read($file.FullName);if(-not $unique.ContainsKey($fact.Id)){$unique[$fact.Id]=@{allocation=$fact.Allocated;observedLinks=0;links=$fact.Links}};$unique[$fact.Id].observedLinks++}
 foreach($fact in $unique.Values){if($fact.links -gt $fact.observedLinks){$externalLinks=$true}}
 if($externalLinks){throw 'Hard links outside exact cleanup tree; skip removal'}
 $entry=[ordered]@{path=$resolved;purpose=$target.owner;files=$files.Count;logicalBytes=($files|Measure-Object Length -Sum).Sum;deduplicatedAllocatedFileBytes=($unique.Values|ForEach-Object {$_.allocation}|Measure-Object -Sum).Sum;safety='exact owned path; no reparse points, process references, writes in last60s or file locks; hardlinks deduplicated and none external';removed=$false}
 $entry|ConvertTo-Json -Depth 5|Add-Content -LiteralPath (Join-Path $recordRoot 'cleanup-predelete.jsonl') -Encoding UTF8
 Remove-Item -LiteralPath $resolved -Force -Recurse
 $entry.removed=-not (Test-Path -LiteralPath $resolved);$results+=,$entry
}
[ordered]@{utc=[DateTime]::UtcNow.ToString('o');before=$before;after=@(Get-PSDrive C,D|ForEach-Object {@{name=$_.Name;freeBytes=$_.Free}});results=$results;note='File allocation deduplicates volume/file ID; directory metadata excluded. Whole disk delta is not attributed to this task.'}|ConvertTo-Json -Depth 7|Tee-Object -FilePath (Join-Path $recordRoot 'cleanup-result.json')
