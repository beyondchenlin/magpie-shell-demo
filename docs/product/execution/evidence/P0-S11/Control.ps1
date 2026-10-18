# Prepared only. Run after explicit user authorization to change native-control channels.
# This harness cannot target a default installation, another window, or another fixture.
param(
  [Parameter(Mandatory=$true)][string]$RequestFile,
  [Parameter(Mandatory=$true)][switch]$AuthorizedNativeChannel
)
$ErrorActionPreference = 'Stop'
if (-not $AuthorizedNativeChannel) { throw 'Native channel authorization required' }
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
$fixtureRoot = 'C:\Users\ai\AppData\Local\Temp\tagma-p0-s09-128d7053-66d3-424a-8ec2-90640d06bf88'
$candidateExe = Join-Path $fixtureRoot 'tagma-desktop.exe'
$expectedHash = '2233C33385BF37A16316E8AB66047D3631EA1493FE21DCE2CDED26758D29D7BF'
$recordRoot = 'D:\demo1\tagmaai\.cache\p0-s11-native-control'
if ([IO.File]::ReadAllText((Join-Path $fixtureRoot 'owner.txt')) -cne 'tagma-p0-s09/native/v1') { throw 'Fixture owner mismatch' }
if ((Get-FileHash -LiteralPath $candidateExe -Algorithm SHA256).Hash -ne $expectedHash) { throw 'Candidate hash mismatch' }
if ((Get-Item -LiteralPath $fixtureRoot).Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'Fixture is a reparse point' }
$request = Get-Content -LiteralPath $RequestFile -Encoding UTF8 -Raw | ConvertFrom-Json
if ($request.action -notin @('observe','capture','show','scrollTo','focus','value','invoke','toggle','expand','key','text','click','doubleClick','drag','launch')) { throw 'Unknown action' }
Add-Type -AssemblyName UIAutomationClient,UIAutomationTypes,WindowsBase,System.Drawing,System.Windows.Forms
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
using System.Collections.Generic;
using System.Text;
public static class P0Native {
  public class TargetWindow { public long Handle; public string Title; public bool Visible; }
  delegate bool EnumProc(IntPtr window,IntPtr param);
  [DllImport("user32.dll")] static extern bool EnumWindows(EnumProc callback,IntPtr param);
  [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr window,out uint pid);
  [DllImport("user32.dll",CharSet=CharSet.Unicode)] static extern int GetWindowText(IntPtr window,StringBuilder text,int length);
  [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr window);
  public static TargetWindow[] WindowsForPid(uint pid) {
    var windows=new List<TargetWindow>();
    EnumWindows(delegate(IntPtr window,IntPtr unused) {
      uint owner;GetWindowThreadProcessId(window,out owner);
      if(owner==pid){var title=new StringBuilder(512);GetWindowText(window,title,title.Capacity);windows.Add(new TargetWindow{Handle=window.ToInt64(),Title=title.ToString(),Visible=IsWindowVisible(window)});}
      return true;
    },IntPtr.Zero);return windows.ToArray();
  }
  [StructLayout(LayoutKind.Sequential)] public struct Rect { public int Left,Top,Right,Bottom; }
  [StructLayout(LayoutKind.Sequential)] public struct Point { public int X,Y; public Point(int x,int y){X=x;Y=y;} }
  [StructLayout(LayoutKind.Sequential)] public struct Mouse { public int X,Y; public uint Data,Flags,Time; public UIntPtr Extra; }
  [StructLayout(LayoutKind.Sequential)] public struct Keyboard { public ushort Vk,Scan; public uint Flags,Time; public UIntPtr Extra; }
  [StructLayout(LayoutKind.Explicit)] public struct Union { [FieldOffset(0)] public Mouse Mouse; [FieldOffset(0)] public Keyboard Keyboard; }
  [StructLayout(LayoutKind.Sequential)] public struct Input { public uint Type; public Union Data; }
  [DllImport("user32.dll")] public static extern bool SetProcessDpiAwarenessContext(IntPtr context);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr window,out Rect rect);
  [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr window);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr window,int command);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr window);
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern IntPtr GetAncestor(IntPtr window,uint flags);
  [DllImport("user32.dll")] public static extern IntPtr WindowFromPoint(Point point);
  [DllImport("user32.dll")] public static extern bool PrintWindow(IntPtr window,IntPtr dc,uint flags);
  [DllImport("user32.dll",SetLastError=true)] static extern uint SendInput(uint count,Input[] inputs,int size);
  static void Send(Input input) { if(SendInput(1,new[]{input},Marshal.SizeOf(typeof(Input)))!=1) throw new Exception("SendInput failed: "+Marshal.GetLastWin32Error()); }
  public static void Key(ushort vk,bool up) { var i=new Input();i.Type=1;i.Data.Keyboard.Vk=vk;i.Data.Keyboard.Flags=up?2u:0u;Send(i); }
  public static void Unicode(char ch,bool up) { var i=new Input();i.Type=1;i.Data.Keyboard.Scan=ch;i.Data.Keyboard.Flags=4u|(up?2u:0u);Send(i); }
  public static void MouseInput(int x,int y,uint flags) { var i=new Input();i.Type=0;i.Data.Mouse.X=x;i.Data.Mouse.Y=y;i.Data.Mouse.Flags=flags;Send(i); }
}
'@
[void][P0Native]::SetProcessDpiAwarenessContext([IntPtr](-4))
$matches = @(Get-Process -Name 'tagma-desktop' -ErrorAction SilentlyContinue | Where-Object { $_.Path -ieq $candidateExe })
if ($request.action -eq 'launch') {
  if ($matches.Count -ne 0) { throw 'Candidate is already running' }
  $launcher = Join-Path $fixtureRoot 'launch-tagma.exe'
  Start-Process -FilePath $launcher -WorkingDirectory $fixtureRoot -WindowStyle Hidden
  [ordered]@{action='launch';utc=[DateTime]::UtcNow.ToString('o');result='dispatched-only'} | ConvertTo-Json -Compress
  exit
}
if ($matches.Count -ne 1) { throw 'Expected one owned candidate process' }
$candidate = $matches[0]
$ownedWindows = [P0Native]::WindowsForPid($candidate.Id)
$targetWindows = @($ownedWindows | Where-Object { $_.Title -like 'Tagma *dev18 P0-S09 128d7053' })
if ($targetWindows.Count -ne 1) { $ownedWindows | ConvertTo-Json -Compress; throw 'Candidate window identity mismatch' }
$targetTitle = $targetWindows[0].Title
$window = [IntPtr]$targetWindows[0].Handle
if ($request.action -eq 'show') {
  [void][P0Native]::ShowWindow($window,9)
  [void][P0Native]::SetForegroundWindow($window)
  Start-Sleep -Milliseconds 300
  [P0Native]::WindowsForPid($candidate.Id) | ConvertTo-Json -Compress
  exit
}
if (-not $targetWindows[0].Visible) { throw 'Candidate is hidden; restore the identified window before acting' }
if ([P0Native]::IsIconic($window)) { throw 'Candidate minimized; do not act on stale geometry' }
$root = [Windows.Automation.AutomationElement]::FromHandle($window)
$bounds = New-Object P0Native+Rect
if (-not [P0Native]::GetWindowRect($window,[ref]$bounds)) { throw 'Window bounds unavailable' }
$snapshotFile = Join-Path $recordRoot 'latest-observation.json'
function Read-Element($element,$index) {
  $cur=$element.Current
  $value=$null
  if (-not $cur.IsPassword) {
    $pattern=$null
    if ($element.TryGetCurrentPattern([Windows.Automation.ValuePattern]::Pattern,[ref]$pattern)) { $value=$pattern.Current.Value }
  }
  [ordered]@{index=$index;runtimeId=($element.GetRuntimeId() -join ',');name=$cur.Name;type=$cur.ControlType.ProgrammaticName;automationId=$cur.AutomationId;enabled=$cur.IsEnabled;offscreen=$cur.IsOffscreen;focused=$cur.HasKeyboardFocus;password=$cur.IsPassword;value=$value;rect=@($cur.BoundingRectangle.X,$cur.BoundingRectangle.Y,$cur.BoundingRectangle.Width,$cur.BoundingRectangle.Height);patterns=@($element.GetSupportedPatterns() | ForEach-Object {$_.ProgrammaticName})}
}
function Get-ObservedElement {
  if (-not (Test-Path -LiteralPath $snapshotFile)) { throw 'Observe before targeting a control' }
  $snap=Get-Content -LiteralPath $snapshotFile -Encoding UTF8 -Raw | ConvertFrom-Json
  if ($snap.pid -ne $candidate.Id -or $snap.started -ne $candidate.StartTime.ToUniversalTime().ToString('o')) { throw 'Stale process observation' }
  if (([DateTime]::UtcNow-[DateTime]::Parse($snap.utc).ToUniversalTime()).TotalSeconds -gt 120) { throw 'Observation expired' }
  if($null -ne $request.index){$saved=@($snap.elements | Where-Object {$_.index -eq $request.index})}else{$saved=@($snap.elements | Where-Object {$_.name -ceq $request.name -and $_.type -eq ('ControlType.'+$request.type) -and $_.enabled})}
  if ($saved.Count -ne 1) { throw 'Observed index not unique' }
  $elements=$root.FindAll([Windows.Automation.TreeScope]::Descendants,[Windows.Automation.Condition]::TrueCondition)
  $found=@($elements | Where-Object {($_.GetRuntimeId() -join ',') -ceq $saved[0].runtimeId})
  if ($found.Count -ne 1) { throw 'Control identity changed' }
  $current=Read-Element $found[0] $saved[0].index
  if ($current.name -cne $saved[0].name -or $current.type -ne $saved[0].type -or -not $current.enabled) { throw 'Control state changed' }
  return $found[0]
}
function Assert-Foreground {
  if ([P0Native]::GetForegroundWindow() -ne $window) {
    if (-not [P0Native]::SetForegroundWindow($window)) { throw 'Could not foreground target' }
    Start-Sleep -Milliseconds 200
  }
  if ([P0Native]::GetForegroundWindow() -ne $window) { throw 'Wrong foreground window' }
}
function Assert-Point([int]$x,[int]$y) {
  if ($x -lt $bounds.Left -or $x -ge $bounds.Right -or $y -lt $bounds.Top -or $y -ge $bounds.Bottom) { throw 'Point outside target bounds' }
  $hit=[P0Native]::WindowFromPoint((New-Object P0Native+Point($x,$y)))
  if ([P0Native]::GetAncestor($hit,2) -ne $window) { throw 'Point is covered by another window' }
}
function Move-Pointer([int]$x,[int]$y) {
  $screen=[Windows.Forms.SystemInformation]::VirtualScreen
  $ax=[int][Math]::Round(($x-$screen.Left)*65535.0/($screen.Width-1))
  $ay=[int][Math]::Round(($y-$screen.Top)*65535.0/($screen.Height-1))
  [P0Native]::MouseInput($ax,$ay,0xC001)
}
switch ($request.action) {
  'observe' {
    $all=$root.FindAll([Windows.Automation.TreeScope]::Descendants,[Windows.Automation.Condition]::TrueCondition)
    if ($all.Count -gt 1500) { throw 'Accessibility observation too large' }
    $rows=@();for($i=0;$i -lt $all.Count;$i++){ $rows+=,(Read-Element $all[$i] $i) }
    $record=[ordered]@{utc=[DateTime]::UtcNow.ToString('o');pid=$candidate.Id;started=$candidate.StartTime.ToUniversalTime().ToString('o');window=$window.ToInt64();title=$targetTitle;rect=@($bounds.Left,$bounds.Top,$bounds.Right,$bounds.Bottom);elements=$rows}
    $json=$record | ConvertTo-Json -Depth 9
    [IO.File]::WriteAllText($snapshotFile,$json,(New-Object Text.UTF8Encoding($false)))
    $json
    exit
  }
  'capture' {
    $width=$bounds.Right-$bounds.Left;$height=$bounds.Bottom-$bounds.Top
    if ($width -le 0 -or $height -le 0 -or $width*$height -gt 20000000) { throw 'Invalid capture dimensions' }
    $bitmap=New-Object Drawing.Bitmap($width,$height)
    $graphics=[Drawing.Graphics]::FromImage($bitmap)
    try {
      $dc=$graphics.GetHdc()
      try { if (-not [P0Native]::PrintWindow($window,$dc,2)) { throw 'PrintWindow failed' } }
      finally { $graphics.ReleaseHdc($dc) }
      $capturePath=Join-Path $recordRoot 'latest-capture.png'
      $bitmap.Save($capturePath,[Drawing.Imaging.ImageFormat]::Png)
    } finally { $graphics.Dispose();$bitmap.Dispose() }
    [ordered]@{path=$capturePath;utc=[DateTime]::UtcNow.ToString('o');pid=$candidate.Id;rect=@($bounds.Left,$bounds.Top,$bounds.Right,$bounds.Bottom)} | ConvertTo-Json -Compress
    exit
  }
  'focus' { $el=Get-ObservedElement;$el.SetFocus() }
  'scrollTo' { $el=Get-ObservedElement;($el.GetCurrentPattern([Windows.Automation.ScrollItemPattern]::Pattern)).ScrollIntoView() }
  'value' { $el=Get-ObservedElement;($el.GetCurrentPattern([Windows.Automation.ValuePattern]::Pattern)).SetValue([string]$request.text) }
  'invoke' { $el=Get-ObservedElement;($el.GetCurrentPattern([Windows.Automation.InvokePattern]::Pattern)).Invoke() }
  'toggle' { $el=Get-ObservedElement;($el.GetCurrentPattern([Windows.Automation.TogglePattern]::Pattern)).Toggle() }
  'expand' { $el=Get-ObservedElement;($el.GetCurrentPattern([Windows.Automation.ExpandCollapsePattern]::Pattern)).Expand() }
  'text' {
    $el=Get-ObservedElement;Assert-Foreground
    $focused=[Windows.Automation.AutomationElement]::FocusedElement
    if (($focused.GetRuntimeId() -join ',') -ne ($el.GetRuntimeId() -join ',')) { throw 'Expected field not focused' }
    if ($request.text.Length -gt 2400 -or $request.text -match '[\x00-\x1f]') { throw 'Only bounded literal text allowed' }
    foreach($ch in ([string]$request.text).ToCharArray()){[P0Native]::Unicode($ch,$false);[P0Native]::Unicode($ch,$true)}
  }
  'key' {
    Assert-Foreground
    $keys=@{'Tab'=@(9);'Shift+Tab'=@(16,9);'Return'=@(13);'Escape'=@(27);'Ctrl+A'=@(17,65);'Alt+F4'=@(18,115)}
    if (-not $keys.ContainsKey([string]$request.key)) { throw 'Key is not allowed' }
    $chord=$keys[[string]$request.key]
    try { foreach($key in $chord){[P0Native]::Key($key,$false)} }
    finally { for($i=$chord.Count-1;$i -ge 0;$i--){[P0Native]::Key($chord[$i],$true)} }
  }
  'click' {
    Assert-Foreground
    $x=$bounds.Left+[int]$request.x;$y=$bounds.Top+[int]$request.y
    Assert-Point $x $y;Move-Pointer $x $y
    try { [P0Native]::MouseInput(0,0,2) } finally { [P0Native]::MouseInput(0,0,4) }
  }
  'doubleClick' {
    Assert-Foreground
    $x=$bounds.Left+[int]$request.x;$y=$bounds.Top+[int]$request.y
    Assert-Point $x $y;Move-Pointer $x $y
    for($n=0;$n -lt 2;$n++) {
      Assert-Foreground;Assert-Point $x $y
      try { [P0Native]::MouseInput(0,0,2) } finally { [P0Native]::MouseInput(0,0,4) }
      Start-Sleep -Milliseconds 100
    }
  }
  'drag' {
    Assert-Foreground
    $x=$bounds.Left+[int]$request.x;$y=$bounds.Top+[int]$request.y
    $dx=[int]$request.dx;$dy=[int]$request.dy
    if ([Math]::Abs($dx) -gt 250 -or [Math]::Abs($dy) -gt 250) { throw 'Drag exceeds bounded movement' }
    Assert-Point $x $y;Move-Pointer $x $y
    try {
      [P0Native]::MouseInput(0,0,2);Start-Sleep -Milliseconds 100
      for($step=1;$step -le 20;$step++){Move-Pointer ([int]($x+$dx*$step/20)) ([int]($y+$dy*$step/20));Start-Sleep -Milliseconds 15}
    } finally { [P0Native]::MouseInput(0,0,4) }
  }
}
Start-Sleep -Milliseconds 250
[ordered]@{action=$request.action;utc=[DateTime]::UtcNow.ToString('o');pid=$candidate.Id;result='action-returned-reobserve-required'} | ConvertTo-Json -Compress
