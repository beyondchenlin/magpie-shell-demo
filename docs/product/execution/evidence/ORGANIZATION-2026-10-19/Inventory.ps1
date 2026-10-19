param([switch]$Verify)
$ErrorActionPreference='Stop'
$taskRoot='D:\demo1\tagmaai'
$taskRecord=Join-Path $taskRoot '.cache\organization-20261019'
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
using Microsoft.Win32.SafeHandles;
public static class OrgFileInfo {
 [StructLayout(LayoutKind.Sequential)] public struct Info { public uint Attributes; public System.Runtime.InteropServices.ComTypes.FILETIME Creation,Access,Write; public uint Volume,SizeHigh,SizeLow,Links,IndexHigh,IndexLow; }
 [DllImport("kernel32.dll",SetLastError=true)] public static extern bool GetFileInformationByHandle(SafeFileHandle h,out Info info);
 [DllImport("kernel32.dll",CharSet=CharSet.Unicode,SetLastError=true)] static extern uint GetCompressedFileSizeW(string path,out uint high);
 public static ulong Allocated(string path) {uint high;uint low=GetCompressedFileSizeW(path,out high);if(low==0xffffffff && Marshal.GetLastWin32Error()!=0)throw new Exception("Allocation unavailable");return ((ulong)high<<32)|low;}
}
'@
function Assert-OrdinaryAncestors([string]$path) {
 $item=Get-Item -LiteralPath $path -Force
 while($null -ne $item){if($item.Attributes -band [IO.FileAttributes]::ReparsePoint){throw "Reparse point: $($item.FullName)"};$item=$item.Parent}
}
function Get-OrdinaryTree([string]$path) {
 Assert-OrdinaryAncestors $path
 $queue=[Collections.Generic.Stack[string]]::new();$queue.Push($path)
 $items=[Collections.Generic.List[object]]::new()
 while($queue.Count){foreach($item in Get-ChildItem -LiteralPath $queue.Pop() -Force){
  if($item.Attributes -band [IO.FileAttributes]::ReparsePoint){throw "Reparse child: $($item.FullName)"}
  if($item.PSIsContainer){if($item.Name -eq '.git'){throw "Nested repository: $($item.FullName)"};$queue.Push($item.FullName)}else{$items.Add($item)}
 }}
 return $items.ToArray()
}
function Assert-NoProcesses([string]$path) {
 $hits=@(Get-CimInstance Win32_Process|Where-Object{$_.ProcessId -ne $PID -and ($_.ExecutablePath -like "$path\*" -or ($_.CommandLine -and $_.CommandLine.IndexOf($path,[StringComparison]::OrdinalIgnoreCase) -ge 0))})
 if($hits.Count){throw ("Process references $path : "+(($hits|ForEach-Object{"$($_.Name)/$($_.ProcessId)"}) -join ','))}
 if($path -like '*\target\*'){
  $builders=@(Get-Process cargo,rustc,link,rust-lld -ErrorAction SilentlyContinue)
  if($builders.Count){throw 'Build process present'}
 }
}
function Get-Snapshot([string]$path,[bool]$hash) {
 Assert-NoProcesses $path
 $files=@(Get-OrdinaryTree $path)
 $unique=@{};$rows=[Collections.Generic.List[object]]::new();[long]$logical=0;[long]$allocated=0
 foreach($item in $files){
  if($item.LastWriteTimeUtc -gt [DateTime]::UtcNow.AddMinutes(-3)){throw "Recent write: $($item.FullName)"}
  $stream=[IO.File]::Open($item.FullName,[IO.FileMode]::Open,[IO.FileAccess]::Read,[IO.FileShare]::None)
  try {
   $info=[OrgFileInfo+Info]::new();if(-not [OrgFileInfo]::GetFileInformationByHandle($stream.SafeFileHandle,[ref]$info)){throw 'File identity unavailable'}
   $id="$($info.Volume):$($info.IndexHigh):$($info.IndexLow)"
   $bytes=[OrgFileInfo]::Allocated($item.FullName)
   $sha=if($hash){[Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($stream))}else{$null}
   if(-not $unique.ContainsKey($id)){$unique[$id]=$true;$allocated+=$bytes}
   $logical+=$item.Length
   $rows.Add([pscustomobject]@{relative=[IO.Path]::GetRelativePath($path,$item.FullName);bytes=$item.Length;modifiedUtc=$item.LastWriteTimeUtc.ToString('o');identity=$id;links=$info.Links;allocated=$bytes;sha256=$sha})
  } finally {$stream.Dispose()}
 }
 return [pscustomobject]@{root=$path;fileCount=$rows.Count;logicalBytes=$logical;deduplicatedAllocatedBytes=$allocated;uniqueFileIdentities=$unique.Count;files=$rows.ToArray()}
}
if($MyInvocation.InvocationName -eq '.') { return }
$targets=@(
 @{name='deliveries';path='D:\demo1\tagmaai-deliveries';hash=$true},
 @{name='preview';path='D:\demo1\tagmaai-preview';hash=$true},
 @{name='build';path='D:\demo1\tagmaai\target\debug\build';hash=$false}
)
$summary=foreach($target in $targets){
 $snapshot=Get-Snapshot $target.path $target.hash
 $snapshot|ConvertTo-Json -Depth 5|Set-Content -LiteralPath (Join-Path $taskRecord ($target.name+'-before.json')) -Encoding utf8
 $snapshot|Select-Object root,fileCount,logicalBytes,deduplicatedAllocatedBytes,uniqueFileIdentities
}
$summary|ConvertTo-Json|Set-Content -LiteralPath (Join-Path $taskRecord 'inventory-summary.json') -Encoding utf8
$summary|ConvertTo-Json
Get-PSDrive C,D|Select-Object Name,Free|ConvertTo-Json|Set-Content -LiteralPath (Join-Path $taskRecord 'disk-before.json') -Encoding utf8
