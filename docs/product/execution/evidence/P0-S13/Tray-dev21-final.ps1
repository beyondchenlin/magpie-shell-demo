param([ValidateSet('inspect','open','menu','choose','overflow')][string]$Action='inspect',[ValidateSet('Tagma','Quit')][string]$Item='Tagma')
$ErrorActionPreference='Stop'
[Console]::OutputEncoding=New-Object Text.UTF8Encoding($false)
$dir='D:\demo1\tagmaai\.cache\p0-s13-lifecycle'
$fixture='C:\Users\ai\AppData\Local\Temp\tagma-p0-s09-128d7053-66d3-424a-8ec2-90640d06bf88'
$exe=Join-Path $fixture 'candidate-dev21/tagma-desktop.exe'
if([IO.File]::ReadAllText((Join-Path $fixture 'owner.txt')) -cne 'tagma-p0-s09/native/v1'){throw 'Wrong fixture'}
if((Get-Item -LiteralPath $fixture).Attributes -band [IO.FileAttributes]::ReparsePoint){throw 'Reparse fixture'}
if((Get-FileHash -LiteralPath $exe).Hash -ne 'A67C6065AB9FEE8D2598C347E6D77D6829DFF0C7FFE85EBDF0A543EC52C34CB5'){throw 'Wrong binary'}
$owned=@(Get-Process tagma-desktop -ErrorAction SilentlyContinue|Where-Object Path -eq $exe)
if($owned.Count -ne 1){throw 'Expected unique candidate'}
$hostProcess=$owned[0]
Add-Type -AssemblyName UIAutomationClient,UIAutomationTypes,WindowsBase,System.Drawing,System.Windows.Forms
$control=[IO.File]::ReadAllText((Join-Path $dir 'Control.ps1'))
$native=[regex]::Match($control,"(?s)Add-Type -TypeDefinition @'\r?\n(.*?)\r?\n'@").Groups[1].Value
Add-Type -TypeDefinition $native
Add-Type -TypeDefinition @'
using System;
using System.Text;
using System.Runtime.InteropServices;
public static class P0Tray {
 [StructLayout(LayoutKind.Sequential)] public struct Rect { public int Left,Top,Right,Bottom; }
 [StructLayout(LayoutKind.Sequential)] public struct Id { public uint Size; public IntPtr Window; public uint UID; public Guid Guid; }
 [DllImport("shell32.dll")] static extern int Shell_NotifyIconGetRect(ref Id id,out Rect rect);
 [DllImport("user32.dll",CharSet=CharSet.Unicode)] static extern int GetClassName(IntPtr window,StringBuilder text,int length);
 [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr window,out uint pid);
 [DllImport("user32.dll",CharSet=CharSet.Unicode)] public static extern IntPtr FindWindow(string cls,string title);
 [DllImport("user32.dll")] public static extern IntPtr SendMessage(IntPtr window,uint msg,IntPtr wp,IntPtr lp);
 [DllImport("user32.dll")] public static extern int GetMenuItemCount(IntPtr menu);
 [DllImport("user32.dll",CharSet=CharSet.Unicode)] static extern int GetMenuString(IntPtr menu,uint item,StringBuilder text,int length,uint flags);
 [DllImport("user32.dll")] public static extern bool GetMenuItemRect(IntPtr window,IntPtr menu,uint item,out Rect rect);
 [DllImport("user32.dll")] public static extern uint GetMenuState(IntPtr menu,uint item,uint flags);
 public static string MenuName(IntPtr menu,uint item){var s=new StringBuilder(128);GetMenuString(menu,item,s,s.Capacity,0x400);return s.ToString();}
 [DllImport("user32.dll")] static extern bool SystemParametersInfo(uint action,uint parameter,out bool value,uint flags);
 public static string Class(IntPtr w){var s=new StringBuilder(256);GetClassName(w,s,s.Capacity);return s.ToString();}
 public static int LastIconResult;
 public static Rect Icon(IntPtr w,uint uid){var id=new Id{Size=(uint)Marshal.SizeOf(typeof(Id)),Window=w,UID=uid};Rect r;LastIconResult=Shell_NotifyIconGetRect(ref id,out r);if(LastIconResult<0)throw new Exception("Icon rectangle unavailable: "+LastIconResult);return r;}
 public static bool ClientAnimations(){bool value;if(!SystemParametersInfo(0x1042,0,out value,0))throw new Exception("Cannot read animation preference");return value;}
}
'@
[void][P0Native]::SetProcessDpiAwarenessContext([IntPtr](-4))
$windows=@([P0Native]::WindowsForPid($hostProcess.Id)|ForEach-Object {[pscustomobject]@{handle=$_.Handle;title=$_.Title;visible=$_.Visible;class=[P0Tray]::Class([IntPtr]$_.Handle)}})
$main=@($windows|Where-Object title -like 'Tagma *dev21 P0-S12 128d7053')
$tray=@($windows|Where-Object class -eq 'tray_icon_app')
if($main.Count -ne 1 -or $tray.Count -ne 1){throw 'Window ownership ambiguous'}
# tray-icon Counter starts at 1; builder.new_unique consumes 1 before with_id replaces it;
# the Windows TrayIcon::new consumes the next ID, 2. No process memory is read.
$icon=[P0Tray]::Icon([IntPtr]$tray[0].handle,2)
$record=[ordered]@{utc=[DateTime]::UtcNow.ToString('o');pid=$hostProcess.Id;started=$hostProcess.StartTime.ToUniversalTime().ToString('o');action=$Action;windows=$windows;icon=$icon;iconHResult=[P0Tray]::LastIconResult;systemClientAnimations=[P0Tray]::ClientAnimations()}
if([P0Tray]::LastIconResult -eq 0){$ic=[Windows.Automation.AutomationElement]::FromPoint((New-Object Windows.Point([int](($icon.Left+$icon.Right)/2),[int](($icon.Top+$icon.Bottom)/2))));$record.iconElement=@{name=$ic.Current.Name;class=$ic.Current.ClassName;type=$ic.Current.ControlType.ProgrammaticName;runtimeId=($ic.GetRuntimeId()-join ',')}}
function Move-Point([int]$x,[int]$y){$s=[Windows.Forms.SystemInformation]::VirtualScreen;[P0Native]::MouseInput([int][Math]::Round(($x-$s.Left)*65535.0/($s.Width-1)),[int][Math]::Round(($y-$s.Top)*65535.0/($s.Height-1)),0xC001)}
if($Action -in @('inspect','overflow')){
 $taskbar=[P0Tray]::FindWindow('Shell_TrayWnd',$null)
 $taskbarRoot=[Windows.Automation.AutomationElement]::FromHandle($taskbar)
 $buttons=@($taskbarRoot.FindAll([Windows.Automation.TreeScope]::Descendants,[Windows.Automation.Condition]::TrueCondition))
 $record.taskbar=@{handle=$taskbar.ToInt64();name=$taskbarRoot.Current.Name;count=$buttons.Count;children=@($taskbarRoot.FindAll([Windows.Automation.TreeScope]::Children,[Windows.Automation.Condition]::TrueCondition)|ForEach-Object {@{name=$_.Current.Name;id=$_.Current.AutomationId;type=$_.Current.ControlType.ProgrammaticName;class=$_.Current.ClassName}})}
 $notify=@($buttons|Where-Object {$_.Current.ClassName -eq 'TrayNotifyWnd'})
 if($notify.Count -eq 1){$record.notifyChildren=@($notify[0].FindAll([Windows.Automation.TreeScope]::Descendants,[Windows.Automation.Condition]::TrueCondition)|ForEach-Object {@{name=$_.Current.Name;id=$_.Current.AutomationId;type=$_.Current.ControlType.ProgrammaticName;class=$_.Current.ClassName;patterns=@($_.GetSupportedPatterns()|ForEach-Object ProgrammaticName);rect=@($_.Current.BoundingRectangle.X,$_.Current.BoundingRectangle.Y,$_.Current.BoundingRectangle.Width,$_.Current.BoundingRectangle.Height)}})}
 $record.shellButtons=@($buttons|Where-Object {$_.Current.AutomationId -like '*Chevron*' -or $_.Current.Name -match '隐藏|hidden|overflow|溢出'}|ForEach-Object {@{name=$_.Current.Name;id=$_.Current.AutomationId;type=$_.Current.ControlType.ProgrammaticName;patterns=@($_.GetSupportedPatterns()|ForEach-Object ProgrammaticName);runtimeId=($_.GetRuntimeId()-join ',');rect=@($_.Current.BoundingRectangle.X,$_.Current.BoundingRectangle.Y,$_.Current.BoundingRectangle.Width,$_.Current.BoundingRectangle.Height)}})
 if($Action -eq 'overflow'){
  $chevron=@($buttons|Where-Object {$_.Current.AutomationId -eq '1502' -and $_.Current.ClassName -eq 'Button'})
  if($chevron.Count -ne 1){throw 'Observed overflow control unavailable'}
  $r=$chevron[0].Current.BoundingRectangle;$x=[int]($r.X+$r.Width/2);$y=[int]($r.Y+$r.Height/2)
  $point=New-Object P0Native+Point($x,$y);$hit=[P0Native]::WindowFromPoint($point)
  if($hit.ToInt64() -ne $chevron[0].Current.NativeWindowHandle -or [P0Native]::GetAncestor($hit,2) -ne $taskbar){throw 'Overflow control covered'}
  Move-Point $x $y
  try{[P0Native]::MouseInput(0,0,2)}finally{[P0Native]::MouseInput(0,0,4)}
 }else{
  $chevron=@($buttons|Where-Object {$_.Current.AutomationId -eq '1502' -and $_.Current.ClassName -eq 'Button'})
  if($chevron.Count -eq 1){
   $r=$chevron[0].Current.BoundingRectangle;$bmp=New-Object Drawing.Bitmap([int]$r.Width,[int]$r.Height);$g=[Drawing.Graphics]::FromImage($bmp)
   try{$dc=$g.GetHdc();try{if(-not [P0Native]::PrintWindow([IntPtr]$chevron[0].Current.NativeWindowHandle,$dc,2)){throw 'Chevron capture failed'}}finally{$g.ReleaseHdc($dc)};$bmp.Save((Join-Path $dir 'tray-chevron.png'))}finally{$g.Dispose();$bmp.Dispose()}
  }
 }
}
if($Action -eq 'open'){
 if([P0Tray]::LastIconResult -ne 0){throw 'Exact owned tray icon is not currently visible; do not click the returned fallback rectangle'}
 $x=[int](($icon.Left+$icon.Right)/2);$y=[int](($icon.Top+$icon.Bottom)/2)
 $point=New-Object P0Native+Point($x,$y)
 $hit=[P0Native]::WindowFromPoint($point)
 $element=[Windows.Automation.AutomationElement]::FromPoint((New-Object Windows.Point($x,$y)))
 # Only click the rectangle returned for our exact (owned tray HWND, ID), and require matching tooltip.
 if($element.Current.Name -notin @('Tagma','溢出通知区域') -or $element.Current.IsOffscreen){throw ('Owned icon not exposed at its exact shell rectangle; name='+$element.Current.Name)}
 $hitPid=[uint32]0;[void][P0Tray]::GetWindowThreadProcessId($hit,[ref]$hitPid)
 if((Get-Process -Id $hitPid).ProcessName -ne 'explorer'){throw 'Tray rectangle is occluded'}
 $record.hit=@{window=$hit.ToInt64();pid=$hitPid;name=$element.Current.Name;runtimeId=($element.GetRuntimeId()-join ',')}
 Move-Point $x $y
 if([P0Native]::WindowFromPoint($point) -ne $hit){throw 'Tray moved before click'}
 try{[P0Native]::MouseInput(0,0,8)}finally{[P0Native]::MouseInput(0,0,16)}
 Start-Sleep -Milliseconds 200
}
if($Action -in @('open','menu','choose')){
 $menus=@([P0Native]::WindowsForPid($hostProcess.Id)|Where-Object {$_.Visible -and [P0Tray]::Class([IntPtr]$_.Handle) -eq '#32768'})
 if($menus.Count -ne 1){throw 'Owned popup menu not unique'}
 $menuWindow=[IntPtr]$menus[0].Handle
 # MN_GETHMENU only reads the actually displayed native popup; commands are activated by physical click below.
 $hmenu=[P0Tray]::SendMessage($menuWindow,0x1e1,[IntPtr]::Zero,[IntPtr]::Zero)
 $count=[P0Tray]::GetMenuItemCount($hmenu)
 if($count -ne 2){throw 'Unexpected Tagma menu structure'}
 $items=@(for($n=0;$n -lt $count;$n++){$r=New-Object P0Tray+Rect;if(-not [P0Tray]::GetMenuItemRect($menuWindow,$hmenu,$n,[ref]$r)){throw 'Menu bounds unavailable'};[pscustomobject]@{name=[P0Tray]::MenuName($hmenu,$n);enabled=([P0Tray]::GetMenuState($hmenu,$n,0x400) -band 3) -eq 0;rect=@($r.Left,$r.Top,($r.Right-$r.Left),($r.Bottom-$r.Top));runtimeId=('{0},{1},{2}' -f $menuWindow.ToInt64(),$hmenu.ToInt64(),$n)}})
 if($items[0].name -cne 'Tagma' -or $items[1].name -cne '退出 Tagma / Quit'){throw 'Unexpected menu labels'}
 $record.menu=$items
 if($Action -eq 'choose'){
  $saved=Get-Content -LiteralPath (Join-Path $dir 'tray-menu.json') -Raw -Encoding UTF8|ConvertFrom-Json
  if($saved.pid -ne $hostProcess.Id -or ([DateTime]::UtcNow-[DateTime]::Parse($saved.utc)).TotalSeconds -gt 120){throw 'Stale menu observation'}
  $label=if($Item -eq 'Tagma'){'Tagma'}else{[string]($saved.menu|Where-Object name -like '*Quit*').name}
  $pick=@($items|Where-Object {$_.name -ceq $label -and $_.enabled})
  $old=@($saved.menu|Where-Object name -ceq $label)
  if($pick.Count -ne 1 -or $old.Count -ne 1 -or $pick[0].runtimeId -ne $old[0].runtimeId){throw 'Menu item identity changed'}
  $r=$pick[0].rect;$x=[int]($r[0]+$r[2]/2);$y=[int]($r[1]+$r[3]/2)
  $point=New-Object P0Native+Point($x,$y)
  if([P0Native]::WindowFromPoint($point) -ne $menuWindow){throw 'Menu covered'}
  $foreground=[P0Native]::GetForegroundWindow();$foregroundPid=[uint32]0;[void][P0Tray]::GetWindowThreadProcessId($foreground,[ref]$foregroundPid)
  if($foregroundPid -ne $hostProcess.Id){throw 'Menu lost foreground'}
  Move-Point $x $y
  try{[P0Native]::MouseInput(0,0,2)}finally{[P0Native]::MouseInput(0,0,4)}
  $record.chosen=$label
 }else{
  $record|ConvertTo-Json -Depth 8|Set-Content -LiteralPath (Join-Path $dir 'tray-menu.json') -Encoding UTF8
  $r=New-Object P0Native+Rect;[void][P0Native]::GetWindowRect($menuWindow,[ref]$r)
  $bmp=New-Object Drawing.Bitmap(($r.Right-$r.Left),($r.Bottom-$r.Top));$g=[Drawing.Graphics]::FromImage($bmp)
  try{$dc=$g.GetHdc();try{if(-not [P0Native]::PrintWindow($menuWindow,$dc,2)){throw 'Menu capture failed'}}finally{$g.ReleaseHdc($dc)};$bmp.Save((Join-Path $dir 'tray-menu.png'))}finally{$g.Dispose();$bmp.Dispose()}
 }
}
$record|ConvertTo-Json -Depth 8
$record|ConvertTo-Json -Depth 8 -Compress|Add-Content -LiteralPath (Join-Path $dir 'tray-actions.jsonl') -Encoding UTF8
