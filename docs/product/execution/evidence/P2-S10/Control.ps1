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
$candidateExe = Join-Path $fixtureRoot 'install-p0s16/tagma-desktop.exe'
$expectedHash = '54F15942A7525D93955A1F920804156ACE4C2CCCF368062CA7E9ED188BC16A55'
$recordRoot = 'D:\demo1\tagmaai\.cache\p2-s10-market-adapter'
if ([IO.File]::ReadAllText((Join-Path $fixtureRoot 'owner.txt')) -cne 'tagma-p0-s09/native/v1') { throw 'Fixture owner mismatch' }
if ((Get-FileHash -LiteralPath $candidateExe -Algorithm SHA256).Hash -ne $expectedHash) { throw 'Candidate hash mismatch' }
if ((Get-Item -LiteralPath $fixtureRoot).Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'Fixture is a reparse point' }
$request = Get-Content -LiteralPath $RequestFile -Encoding UTF8 -Raw | ConvertFrom-Json
if ($request.action -notin @('observe','capture','show','scrollTo','focus','value','invoke','toggle','expand','key','text','click','doubleClick','drag','launch','keyboardTrace','nativeFocus','interruptDraft','imeProbe','motionCapture','invokeBusyProbe')) { throw 'Unknown action' }
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
  [StructLayout(LayoutKind.Sequential)] public struct GuiThread { public uint Size,Flags; public IntPtr Active,Focus,Capture,MenuOwner,MoveSize,Caret; public Rect CaretRect; }
  [DllImport("user32.dll")] static extern bool GetGUIThreadInfo(uint thread,ref GuiThread info);
  public static GuiThread GuiForWindow(IntPtr window) { uint owner;uint thread=GetWindowThreadProcessId(window,out owner);var g=new GuiThread();g.Size=(uint)Marshal.SizeOf(typeof(GuiThread));if(!GetGUIThreadInfo(thread,ref g))throw new Exception("GUI focus unavailable");return g; }
  [DllImport("user32.dll")] static extern IntPtr GetKeyboardLayout(uint thread);
  [DllImport("user32.dll")] static extern short GetAsyncKeyState(int key);
  [DllImport("imm32.dll")] static extern IntPtr ImmGetContext(IntPtr window);
  [DllImport("imm32.dll")] static extern bool ImmReleaseContext(IntPtr window,IntPtr context);
  [DllImport("imm32.dll")] static extern bool ImmGetOpenStatus(IntPtr context);
  [DllImport("imm32.dll",CharSet=CharSet.Unicode)] static extern int ImmGetCompositionStringW(IntPtr context,uint index,IntPtr buffer,uint length);
  public static object InputState(IntPtr window) {
    uint owner;uint thread=GetWindowThreadProcessId(window,out owner);var g=GuiForWindow(window);var ime=ImmGetContext(g.Focus);bool open=false;int composition=-2;
    try{if(ime!=IntPtr.Zero){open=ImmGetOpenStatus(ime);composition=ImmGetCompositionStringW(ime,8,IntPtr.Zero,0);}}
    finally{if(ime!=IntPtr.Zero)ImmReleaseContext(g.Focus,ime);}
    return new {KeyboardLayout=GetKeyboardLayout(thread).ToInt64(),ImeContext=ime.ToInt64(),ImeOpen=open,CompositionBytes=composition,ShiftDown=GetAsyncKeyState(16)<0,ControlDown=GetAsyncKeyState(17)<0,AltDown=GetAsyncKeyState(18)<0,Focus=g.Focus.ToInt64()};
  }
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
  $runningFixture=@(Get-CimInstance Win32_Process | Where-Object { $_.ExecutablePath -like "$fixtureRoot\*" })
  if($request.expectedExistingGatewayPid){
    $survivor=Get-Content -LiteralPath (Join-Path $recordRoot '15-independent-identity.json') -Raw -Encoding UTF8|ConvertFrom-Json
    if($runningFixture.Count -ne 1 -or $runningFixture[0].ProcessId -ne $survivor.gateway -or $runningFixture[0].ProcessId -ne $request.expectedExistingGatewayPid -or $runningFixture[0].ExecutablePath -ne $survivor.gatewayPath -or (Get-Process -Id $runningFixture[0].ProcessId).StartTime.ToUniversalTime().ToString('o') -ne $survivor.gatewayStarted){throw 'Expected independent fixture gateway changed'}
  }elseif($runningFixture.Count){throw 'Another fixture version is still running'}
  $start = New-Object System.Diagnostics.ProcessStartInfo
  $start.FileName = $candidateExe
  $start.WorkingDirectory = Split-Path -Parent $candidateExe
  $start.UseShellExecute = $false
  $start.CreateNoWindow = $true
  $start.RedirectStandardOutput = $false
  $start.RedirectStandardError = $false
  $selectedData=Join-Path $fixtureRoot 'data'
  if($request.faultCase){
    if($request.faultCase -notin @('missing-credential')){throw 'Unsupported synthetic case'}
    $selectedData=Join-Path $fixtureRoot ('p0s15-'+$request.faultCase)
    if([IO.File]::ReadAllText((Join-Path $selectedData 'owner.txt')) -cne 'tagma-p0-s15/missing-credential/v1'){throw 'Synthetic owner mismatch'}
    if((Get-Item -LiteralPath $selectedData).Attributes -band [IO.FileAttributes]::ReparsePoint){throw 'Synthetic directory reparse'}
  }
  $start.EnvironmentVariables['TAGMA_TEST_CONFIG_DIR'] = $selectedData
  $start.EnvironmentVariables['WEBVIEW2_USER_DATA_FOLDER'] = Join-Path $fixtureRoot 'webview'
  $start.EnvironmentVariables['TAGMA_TEST_WINDOW_TITLE'] = 'Tagma 隔离测试 dev41r2 P2-S10 128d7053'
  $start.EnvironmentVariables['TAGMA_TEST_GATEWAY_PORT'] = '49697'
  $start.EnvironmentVariables.Remove('TAGMA_TEST_INITIALIZE_TOKEN')
  if($request.reducedMotion){$start.EnvironmentVariables['WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS']='--force-prefers-reduced-motion'}
  else{$start.EnvironmentVariables.Remove('WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS')}
  $launched = [System.Diagnostics.Process]::Start($start)


  [ordered]@{action='launch';utc=[DateTime]::UtcNow.ToString('o');result='dispatched-only'} | ConvertTo-Json -Compress
  exit
}
$matches=@($matches|Where-Object {@([P0Native]::WindowsForPid($_.Id)|Where-Object Title -like 'Tagma *dev41r2 P2-S10 128d7053').Count -eq 1})
if ($matches.Count -ne 1) { throw 'Expected one owned candidate process with the exact role title' }
$candidate = $matches[0]
$ownedWindows = [P0Native]::WindowsForPid($candidate.Id)
$targetWindows = @($ownedWindows | Where-Object { $_.Title -like 'Tagma *dev41r2 P2-S10 128d7053' })
if ($targetWindows.Count -ne 1) { $ownedWindows | ConvertTo-Json -Compress; throw 'Candidate window identity mismatch' }
$targetTitle = $targetWindows[0].Title
$window = [IntPtr]$targetWindows[0].Handle
if ($request.dialog) {
    $webviews=@(Get-CimInstance Win32_Process | Where-Object {$_.ParentProcessId -eq $candidate.Id -and $_.ExecutablePath -like 'C:\Program Files (x86)\Microsoft\EdgeWebView\Application\*\msedgewebview2.exe'})
  if($webviews.Count -ne 1){throw 'Expected unique direct WebView child'}
  $dialogs=@([P0Native]::WindowsForPid($webviews[0].ProcessId) | Where-Object {$_.Title -ceq '打开' -and $_.Visible})
  if($dialogs.Count -ne 1){throw 'Expected one file dialog owned by verified Tagma process'}
  $window=[IntPtr]$dialogs[0].Handle
  $targetTitle=$dialogs[0].Title
}
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
  if ($request.name -and $saved[0].name -cne $request.name) { throw 'Requested name differs from observed index; reobserve and select again' }
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
if ($request.action -in @('drag','click','doubleClick') -and $request.name) { (Get-ObservedElement).SetFocus() }
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
  'imeProbe' {
    $el=Get-ObservedElement
    if($el.Current.Name -cne '名称' -or $el.Current.IsOffscreen -or $el.Current.IsPassword){throw 'Requires synthetic name field'}
    $vp=$el.GetCurrentPattern([Windows.Automation.ValuePattern]::Pattern)
    if($vp.Current.Value -ne ''){throw 'Requires empty unsaved field'}
    Assert-Foreground
    $r=$el.Current.BoundingRectangle;$x=[int]($r.X+$r.Width/2);$y=[int]($r.Y+$r.Height/2)
    Assert-Point $x $y;Move-Pointer $x $y
    try{[P0Native]::MouseInput(0,0,2)}finally{[P0Native]::MouseInput(0,0,4)}
    Start-Sleep -Milliseconds 250
    if(-not $el.Current.HasKeyboardFocus){throw 'Physical focus missing'}
    foreach($vk in @(78,73)){Assert-Foreground;[P0Native]::Key($vk,$false);[P0Native]::Key($vk,$true);Start-Sleep -Milliseconds 100}
    Start-Sleep -Milliseconds 250
    $typed=$vp.Current.Value
    $bmp=New-Object Drawing.Bitmap(($bounds.Right-$bounds.Left),($bounds.Bottom-$bounds.Top));$g=[Drawing.Graphics]::FromImage($bmp)
    try{$dc=$g.GetHdc();try{[void][P0Native]::PrintWindow($window,$dc,2)}finally{$g.ReleaseHdc($dc)};$bmp.Save((Join-Path $recordRoot '25-native-ime-preedit.png'))}finally{$g.Dispose();$bmp.Dispose()}
    Assert-Foreground;[P0Native]::Key(27,$false);[P0Native]::Key(27,$true);Start-Sleep -Milliseconds 350
    $afterFirst=Read-Element ([Windows.Automation.AutomationElement]::FocusedElement) -1
    $record=@{kind='physical N,I then Escape';typed=$typed;afterFirst=$afterFirst;native=[P0Native]::InputState($window)}
    if($afterFirst.name -ceq '名称' -and $afterFirst.value -eq ''){
      Assert-Foreground;[P0Native]::Key(27,$false);[P0Native]::Key(27,$true);Start-Sleep -Milliseconds 350
      $record.afterSecond=Read-Element ([Windows.Automation.AutomationElement]::FocusedElement) -1
    }
    $record|ConvertTo-Json -Depth 6|Set-Content -LiteralPath (Join-Path $recordRoot '25-native-ime-result.json') -Encoding UTF8
    $record|ConvertTo-Json -Depth 6;exit
  }
  'interruptDraft' {
    $el=Get-ObservedElement
    if($el.Current.IsPassword -or $el.Current.ControlType -ne [Windows.Automation.ControlType]::Edit -or $el.Current.IsOffscreen){throw 'Requires a visible nonsecret edit'}
    $vp=$el.GetCurrentPattern([Windows.Automation.ValuePattern]::Pattern)
    if($vp.Current.Value -ne ''){throw 'Refuse overwrite of an existing draft'}
    Assert-Foreground
    $r=$el.Current.BoundingRectangle;$x=[int]($r.X+$r.Width/2);$y=[int]($r.Y+$r.Height/2)
    Assert-Point $x $y;Move-Pointer $x $y
    try{[P0Native]::MouseInput(0,0,2)}finally{[P0Native]::MouseInput(0,0,4)}
    Start-Sleep -Milliseconds 250
    if(-not $el.Current.HasKeyboardFocus -or [P0Native]::GuiForWindow($window).Focus -eq [IntPtr]::Zero){throw 'Physical focus missing'}
    foreach($ch in 'P0 interruption draft'.ToCharArray()){[P0Native]::Unicode($ch,$false);[P0Native]::Unicode($ch,$true)}
    Start-Sleep -Milliseconds 200
    $before=$vp.Current.Value
    if($before -cne 'P0 interruption draft'){throw 'Input readback diverged'}
    $beforeFocus=[P0Native]::InputState($window)
    [void][P0Native]::ShowWindow($window,6)
    Start-Sleep -Milliseconds 500
    $minimized=[P0Native]::IsIconic($window)
    [void][P0Native]::ShowWindow($window,9)
    Assert-Foreground
    Start-Sleep -Milliseconds 250
    $after=$vp.Current.Value
    $record=@{kind='physical Unicode input, native minimize/restore';before=$before;after=$after;minimized=$minimized;focused=$el.Current.HasKeyboardFocus;nativeBefore=$beforeFocus;nativeAfter=[P0Native]::InputState($window)}
    $record|ConvertTo-Json -Depth 5|Set-Content -LiteralPath (Join-Path $recordRoot '22-input-interruption-result.json') -Encoding UTF8
    if(-not $minimized -or $after -cne $before){throw 'Interruption lost draft'}
    $record|ConvertTo-Json -Depth 5;exit
  }
  'nativeFocus' { [P0Native]::InputState($window) | ConvertTo-Json -Depth 4; exit }
  'invokeBusyProbe' {
    $el=Get-ObservedElement;($el.GetCurrentPattern([Windows.Automation.InvokePattern]::Pattern)).Invoke()
    Start-Sleep -Milliseconds 100
    $all=$root.FindAll([Windows.Automation.TreeScope]::Descendants,[Windows.Automation.Condition]::TrueCondition)
    $rows=@();for($i=0;$i -lt $all.Count;$i++){$rows+=,(Read-Element $all[$i] $i)}
    [ordered]@{utc=[DateTime]::UtcNow.ToString('o');pid=$candidate.Id;title=$targetTitle;elements=$rows}|ConvertTo-Json -Depth 8|Set-Content -LiteralPath (Join-Path $recordRoot '16-write-busy.json') -Encoding UTF8
    $bmp=New-Object Drawing.Bitmap(($bounds.Right-$bounds.Left),($bounds.Bottom-$bounds.Top));$g=[Drawing.Graphics]::FromImage($bmp)
    try{$dc=$g.GetHdc();try{if(-not [P0Native]::PrintWindow($window,$dc,2)){throw 'Busy capture failed'}}finally{$g.ReleaseHdc($dc)};$bmp.Save((Join-Path $recordRoot '16-write-busy.png'))}finally{$g.Dispose();$bmp.Dispose()}
  }
  'motionCapture' {
    if($request.prefix -notmatch '^[a-z0-9-]{1,50}$'){throw 'Invalid bounded capture prefix'}
    $el=Get-ObservedElement;$el.SetFocus();Assert-Foreground
    $r=$el.Current.BoundingRectangle;$x=[int]($r.X+$r.Width/2);$y=[int]($r.Y+$r.Height/2)
    Assert-Point $x $y;Move-Pointer $x $y
    $width=$bounds.Right-$bounds.Left;$height=$bounds.Bottom-$bounds.Top
    $bitmap=New-Object Drawing.Bitmap($width,$height);$graphics=[Drawing.Graphics]::FromImage($bitmap)
    $trace=@();$clock=[Diagnostics.Stopwatch]::StartNew()
    try{
      for($n=0;$n -lt 15;$n++){
        if($n -eq 1){Assert-Foreground;Assert-Point $x $y;try{[P0Native]::MouseInput(0,0,2)}finally{[P0Native]::MouseInput(0,0,4)};$clock.Restart()}
        $at=$clock.Elapsed.TotalMilliseconds
        $dc=$graphics.GetHdc();try{if(-not [P0Native]::PrintWindow($window,$dc,2)){throw 'Motion PrintWindow failed'}}finally{$graphics.ReleaseHdc($dc)}
        $clip=$bitmap.Clone((New-Object Drawing.Rectangle(0,25,$width,60)),$bitmap.PixelFormat)
        $file=Join-Path $recordRoot ('{0}-{1:D2}.png' -f $request.prefix,$n)
        try{$clip.Save($file,[Drawing.Imaging.ImageFormat]::Png)}finally{$clip.Dispose()}
        $trace+=,@{frame=$n;before=$n -eq 0;atMs=$at;endMs=$clock.Elapsed.TotalMilliseconds;file=[IO.Path]::GetFileName($file)}
        Start-Sleep -Milliseconds 18
      }
    }finally{$graphics.Dispose();$bitmap.Dispose()}
    [ordered]@{utc=[DateTime]::UtcNow.ToString('o');pid=$candidate.Id;name=$request.name;kind='native-PrintWindow-after-SendInput';trace=$trace}|ConvertTo-Json -Depth 6|Set-Content -LiteralPath (Join-Path $recordRoot ($request.prefix+'.json')) -Encoding UTF8
    $trace|ConvertTo-Json -Compress;exit
  }
  'keyboardTrace' {
    $el=Get-ObservedElement
    Assert-Foreground
    if($request.primeClick){
      if($el.Current.ControlType -notin @([Windows.Automation.ControlType]::Edit,[Windows.Automation.ControlType]::Spinner,[Windows.Automation.ControlType]::Button) -or $el.Current.IsOffscreen){throw 'Prime click requires an observed visible field or explicitly chosen button'}
      $r=$el.Current.BoundingRectangle
      $x=[int]($r.X+[Math]::Min(40,$r.Width/2));$y=[int]($r.Y+$r.Height/2)
      Assert-Point $x $y;Move-Pointer $x $y
      try{[P0Native]::MouseInput(0,0,2)}finally{[P0Native]::MouseInput(0,0,4)}
    }else{$el.SetFocus()}
    Start-Sleep -Milliseconds 200
    Assert-Foreground
    $keys=@{'Tab'=@(9);'Shift+Tab'=@(16,9);'Return'=@(13);'Escape'=@(27);'Space'=@(32);'ArrowDown'=@(40);'ArrowUp'=@(38)}
    if($request.keys.Count -gt 60){throw 'Trace length limit'}
    if($request.expected.Count -ne $request.keys.Count){throw 'Each keyboard step requires an expected focus name'}
    $stepIndex=0
    $trace=@()
    function Read-OwnedFocus([string]$key) {
      $focused=[Windows.Automation.AutomationElement]::FocusedElement
      $current=$focused
      $owned=$false
      for($depth=0;$current -and $depth -lt 30;$depth++){
        if(($current.GetRuntimeId() -join ',') -eq ($root.GetRuntimeId() -join ',')){$owned=$true;break}
        $current=[Windows.Automation.TreeWalker]::RawViewWalker.GetParent($current)
      }
      if(-not $owned){throw 'Focus left owned window'}
      [ordered]@{key=$key;focus=(Read-Element $focused -1);native=([P0Native]::GuiForWindow($window))}
    }
    $trace+=,(Read-OwnedFocus 'initial')
    foreach($stroke in $request.keys){
      if(-not $keys.ContainsKey([string]$stroke)){throw 'Trace key not allowed'}
      Assert-Foreground
      $nativeFocus=[P0Native]::GuiForWindow($window)
      if($nativeFocus.Focus -eq [IntPtr]::Zero){throw 'Win32 keyboard focus missing'}
      $chord=$keys[[string]$stroke]
      try{foreach($vk in $chord){[P0Native]::Key($vk,$false)}}finally{for($i=$chord.Count-1;$i -ge 0;$i--){[P0Native]::Key($chord[$i],$true)}}
      Start-Sleep -Milliseconds 130
      $trace+=,(Read-OwnedFocus $stroke)
      $trace | ConvertTo-Json -Depth 7 | Set-Content -LiteralPath (Join-Path $recordRoot 'latest-keyboard.json') -Encoding UTF8
      if($trace[-1].focus.name -cne $request.expected[$stepIndex]){throw 'Keyboard focus diverged; sequence stopped before further input'}
      $stepIndex++
    }
    $trace | ConvertTo-Json -Depth 7 | Set-Content -LiteralPath (Join-Path $recordRoot 'latest-keyboard.json') -Encoding UTF8
    $trace | ForEach-Object { [ordered]@{key=$_.key;name=$_.focus.name;type=$_.focus.type;focused=$_.focus.focused} } | ConvertTo-Json -Compress
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
