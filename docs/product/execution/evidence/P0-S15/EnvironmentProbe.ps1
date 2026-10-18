$ErrorActionPreference='Stop'
$dir='D:/demo1/tagmaai/.cache/p0-s15-closure'
if([IO.File]::ReadAllText((Join-Path $dir 'owner.txt')) -cne 'tagma-p0-s15/closure/v1'){throw 'Owner mismatch'}
Add-Type @'
using System;
using System.Runtime.InteropServices;
public static class P0Environment {
  [DllImport("user32.dll",SetLastError=true)] public static extern bool SystemParametersInfoW(uint action,uint param,out int value,uint flags);
  [DllImport("advapi32.dll",CharSet=CharSet.Unicode,SetLastError=true)] static extern bool CredReadW(string target,uint type,uint flags,out IntPtr credential);
  [DllImport("advapi32.dll")] static extern void CredFree(IntPtr credential);
  public static int MissingReference(string reference){
    if(!reference.StartsWith("provider/"))throw new Exception("Unexpected reference");
    Guid.Parse(reference.Substring(9));
    IntPtr entry;bool ok=CredReadW(reference+".com.tagmaai.desktop",1,0,out entry);
    if(ok){CredFree(entry);throw new Exception("Synthetic reference unexpectedly exists; no value read");}
    return Marshal.GetLastWin32Error();
  }
}
'@
$motion=0
if(-not [P0Environment]::SystemParametersInfoW(0x1042,0,[ref]$motion,0)){throw 'Read-only animation preference query failed'}
$fixture=Get-Content -LiteralPath (Join-Path $dir 'credential-fault-created.json') -Raw | ConvertFrom-Json
$code=[P0Environment]::MissingReference($fixture.reference)
if($code -ne 1168){throw "Expected missing synthetic credential; Win32 error=$code"}
$vm=@();$vmError=$null
try{$vm=@(Get-VM -ErrorAction Stop | Select-Object Name,Id,State)}catch{$vmError=$_.Exception.Message}
$certificates=@(Get-ChildItem -Path 'Cert:/CurrentUser/My','Cert:/LocalMachine/My' -CodeSigningCert -ErrorAction Stop | Select-Object Subject,NotAfter,HasPrivateKey,Thumbprint)
$installer='D:/demo1/tagmaai-deliveries/0.2.0-dev.27/Tagma_0.2.0-dev.27_x64-setup.exe'
$r=[ordered]@{
 utc=[DateTime]::UtcNow.ToString('o'); animationPreferenceReadOnly=$true; clientAreaAnimationEnabled=($motion -ne 0); preferenceChanged=$false
 credential=[ordered]@{reference=$fixture.reference;win32Error=$code;expected='ERROR_NOT_FOUND';secretRead=$false;secretWritten=$false;facilityLocked=$false}
 hyperV=[ordered]@{vms=$vm;queryError=$vmError;changed=$false}
 windowsSandboxPresent=(Test-Path -LiteralPath 'C:/Windows/System32/WindowsSandbox.exe')
 signingCertificates=$certificates;installerSignature=(Get-AuthenticodeSignature -LiteralPath $installer).Status.ToString()
 space=@(Get-PSDrive C,D | Select-Object Name,Free)
 schedules=@('tagma-prd','magpie-cis'|ForEach-Object {[ordered]@{name=$_;status=(Select-String -LiteralPath "C:/Users/ai/.codex/automations/$_/automation.toml" -Pattern '^status = ').Line}})
 runBinding=(Get-Content -LiteralPath 'D:/demo1/tagmaai/docs/product/execution/RUN-BINDING.json' -Raw|ConvertFrom-Json).automation_status
 scope='Read-only local environment inventory. No settings, services, credentials or automations modified.'
}
$r|ConvertTo-Json -Depth 8|Set-Content -LiteralPath (Join-Path $dir 'environment.json') -Encoding utf8
$r|ConvertTo-Json -Depth 8
