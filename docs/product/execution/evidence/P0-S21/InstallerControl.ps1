param([ValidateSet('observe','capture','invoke','toggle','value','click','button','command')][string]$Action='observe',[int]$Index=-1,[string]$Value='',[string]$Label='installer')
$ErrorActionPreference='Stop'
[Console]::OutputEncoding=New-Object Text.UTF8Encoding($false)
$dir='D:\demo1\tagmaai\.cache\p0-s21-registration'
if([IO.File]::ReadAllText((Join-Path $dir 'owner.txt')) -cne 'tagma-p0-s21/registration/v1'){throw 'Owner'}
$identity=Get-Content -LiteralPath (Join-Path $dir 'installer-identity.json') -Raw|ConvertFrom-Json
$process=Get-Process -Id $identity.pid
if($process.Path -ine $identity.path -or $process.StartTime.ToUniversalTime().ToString('o') -ne $identity.started -or (Get-FileHash -LiteralPath $process.Path).Hash -ine $identity.sha256){throw 'Installer identity changed'}
Add-Type -AssemblyName UIAutomationClient,UIAutomationTypes,WindowsBase,System.Drawing,System.Windows.Forms
$native=[regex]::Match([IO.File]::ReadAllText((Join-Path 'D:\demo1\tagmaai\.cache\p0-s15-closure' 'Control.ps1')),"(?s)Add-Type -TypeDefinition @'\r?\n(.*?)\r?\n'@").Groups[1].Value
Add-Type -TypeDefinition $native
Add-Type -TypeDefinition @'
using System;using System.Runtime.InteropServices;using System.Text;
public static class InstallerNative {
 [DllImport("user32.dll")] public static extern bool IsWindowEnabled(IntPtr h);
 [DllImport("user32.dll")] public static extern IntPtr SendMessage(IntPtr h,uint m,IntPtr w,IntPtr l);
 [DllImport("user32.dll")] public static extern bool PostMessage(IntPtr h,uint m,IntPtr w,IntPtr l);
 [DllImport("user32.dll")] public static extern int GetDlgCtrlID(IntPtr h);
 [DllImport("user32.dll")] public static extern IntPtr GetParent(IntPtr h);
 [DllImport("user32.dll",CharSet=CharSet.Unicode)] static extern int GetClassName(IntPtr h,StringBuilder b,int n);
 public static string Class(IntPtr h){var b=new StringBuilder(100);GetClassName(h,b,100);return b.ToString();}
 [DllImport("kernel32.dll")] static extern uint GetCurrentThreadId();
 [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr h,out uint p);
 [DllImport("user32.dll")] static extern IntPtr GetForegroundWindow();
 [DllImport("user32.dll")] static extern bool SetForegroundWindow(IntPtr h);
 [DllImport("user32.dll")] static extern bool AttachThreadInput(uint a,uint b,bool attach);
 public static bool Foreground(IntPtr target){uint p;uint active=GetWindowThreadProcessId(GetForegroundWindow(),out p);uint self=GetCurrentThreadId();bool attached=active!=self&&AttachThreadInput(self,active,true);try{return SetForegroundWindow(target);}finally{if(attached)AttachThreadInput(self,active,false);}}
}
'@
[void][P0Native]::SetProcessDpiAwarenessContext([IntPtr](-4))
$windows=@([P0Native]::WindowsForPid($process.Id)|Where-Object {$_.Visible -and $_.Title -like 'Tagma P0 S16 Acceptance*'})
$windows=@($windows|Where-Object {[InstallerNative]::IsWindowEnabled([IntPtr]$_.Handle)})
if($windows.Count -ne 1){throw 'Expected one owned installer window'}
$window=[IntPtr]$windows[0].Handle
$root=[Windows.Automation.AutomationElement]::FromHandle($window)
function Observe {
 $elements=@($root.FindAll([Windows.Automation.TreeScope]::Descendants,[Windows.Automation.Condition]::TrueCondition))
 $rows=@(for($i=0;$i -lt $elements.Count;$i++){$c=$elements[$i].Current;$value=$null;$toggle=$null;$p=$null;if($c.IsPassword){throw 'Unexpected secret field'};if($elements[$i].TryGetCurrentPattern([Windows.Automation.ValuePattern]::Pattern,[ref]$p)){$value=$p.Current.Value};$p=$null;if($elements[$i].TryGetCurrentPattern([Windows.Automation.TogglePattern]::Pattern,[ref]$p)){$toggle=$p.Current.ToggleState.ToString()};$cls=[InstallerNative]::Class([IntPtr]$c.NativeWindowHandle);if($cls -eq 'Button'){$toggle=[InstallerNative]::SendMessage([IntPtr]$c.NativeWindowHandle,0xF0,[IntPtr]::Zero,[IntPtr]::Zero).ToInt32()};[ordered]@{index=$i;name=$c.Name;type=$c.ControlType.ProgrammaticName;patterns=@($elements[$i].GetSupportedPatterns()|ForEach-Object {$_.ProgrammaticName});class=$cls;id=($elements[$i].GetRuntimeId()-join ',');enabled=$c.IsEnabled;offscreen=$c.IsOffscreen;value=$value;toggle=$toggle;rect=@($c.BoundingRectangle.X,$c.BoundingRectangle.Y,$c.BoundingRectangle.Width,$c.BoundingRectangle.Height)}})
 $state=[ordered]@{utc=[DateTime]::UtcNow.ToString('o');pid=$process.Id;window=$window.ToInt64();title=$windows[0].Title;elements=$rows}
 $state|ConvertTo-Json -Depth 6|Set-Content -LiteralPath (Join-Path $dir 'installer-observation.json') -Encoding UTF8
 if($Label){$state|ConvertTo-Json -Depth 6|Set-Content -LiteralPath (Join-Path $dir ($Label+'.json')) -Encoding UTF8}
 $state|ConvertTo-Json -Depth 6 -Compress|Add-Content -LiteralPath (Join-Path $dir 'installer-actions.jsonl') -Encoding UTF8
 $rows|ForEach-Object {'{0} {1} enabled={2} offscreen={3}: {4} value={5} toggle={6}' -f $_.index,$_.type,$_.enabled,$_.offscreen,$_.name,$_.value,$_.toggle}
}
if($Action -eq 'capture'){
 $r=New-Object P0Native+Rect;[void][P0Native]::GetWindowRect($window,[ref]$r)
 $bitmap=New-Object Drawing.Bitmap(($r.Right-$r.Left),($r.Bottom-$r.Top));$g=[Drawing.Graphics]::FromImage($bitmap)
 try{$dc=$g.GetHdc();try{if(-not [P0Native]::PrintWindow($window,$dc,2)){throw 'Capture failed'}}finally{$g.ReleaseHdc($dc)};$bitmap.Save((Join-Path $dir ($Label+'.png')))}finally{$g.Dispose();$bitmap.Dispose()};exit
}
if($Action -ne 'observe'){
 $old=Get-Content -LiteralPath (Join-Path $dir 'installer-observation.json') -Raw -Encoding UTF8|ConvertFrom-Json
 if($old.pid -ne $process.Id -or ([DateTime]::UtcNow-[DateTime]::Parse($old.utc)).TotalSeconds -gt 120){throw 'Stale installer observation'}
 $target=@($old.elements|Where-Object index -eq $Index);if($target.Count -ne 1 -or -not $target[0].enabled -or $target[0].offscreen){throw 'Invalid target'}
 $actual=@($root.FindAll([Windows.Automation.TreeScope]::Descendants,[Windows.Automation.Condition]::TrueCondition)|Where-Object {($_.GetRuntimeId()-join ',') -eq $target[0].id})
 if($actual.Count -ne 1 -or $actual[0].Current.Name -cne $target[0].name -or -not $actual[0].Current.IsEnabled){throw 'Target changed'}
 switch($Action){
  invoke {($actual[0].GetCurrentPattern([Windows.Automation.InvokePattern]::Pattern)).Invoke()}
  toggle {($actual[0].GetCurrentPattern([Windows.Automation.TogglePattern]::Pattern)).Toggle()}
  value {($actual[0].GetCurrentPattern([Windows.Automation.ValuePattern]::Pattern)).SetValue($Value)}
  button {
   $child=[IntPtr]$actual[0].Current.NativeWindowHandle
   if([InstallerNative]::Class($child) -ne 'Button' -or [P0Native]::GetAncestor($child,2) -ne $window){throw 'Not an owned native Button'}
   if(-not [InstallerNative]::PostMessage($child,0xF5,[IntPtr]::Zero,[IntPtr]::Zero)){throw 'Native button activation failed'}
  }
  command {
   $child=[IntPtr]$actual[0].Current.NativeWindowHandle
   if([InstallerNative]::Class($child) -ne 'Button' -or [P0Native]::GetAncestor($child,2) -ne $window){throw 'Not an owned native Button'}
   $id=[InstallerNative]::GetDlgCtrlID($child);if($id -le 0 -or $id -gt 65535){throw 'Invalid button id'}
   if(-not [InstallerNative]::PostMessage([InstallerNative]::GetParent($child),0x111,[IntPtr]$id,$child)){throw 'Button notification failed'}
  }
  click {
   [void][P0Native]::ShowWindow($window,9);[void][InstallerNative]::Foreground($window);Start-Sleep -Milliseconds 80
   if([P0Native]::GetForegroundWindow() -ne $window){throw 'Installer foreground changed'}
   $r=$actual[0].Current.BoundingRectangle;$x=[int]($r.X+$r.Width/2);$y=[int]($r.Y+$r.Height/2);$point=New-Object P0Native+Point($x,$y)
   if([P0Native]::GetAncestor([P0Native]::WindowFromPoint($point),2) -ne $window){throw 'Installer target covered'}
   $screen=[Windows.Forms.SystemInformation]::VirtualScreen
   [P0Native]::MouseInput([int][Math]::Round(($x-$screen.Left)*65535.0/($screen.Width-1)),[int][Math]::Round(($y-$screen.Top)*65535.0/($screen.Height-1)),0xC001)
   try{[P0Native]::MouseInput(0,0,2)}finally{[P0Native]::MouseInput(0,0,4)}
  }
 }
 Start-Sleep -Milliseconds 300
 if($process.HasExited){'Owned installer exited';exit}
}
Observe
