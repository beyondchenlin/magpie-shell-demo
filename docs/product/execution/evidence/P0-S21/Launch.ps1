$ErrorActionPreference='Stop'
# Start-Process from PowerShell 7 inherits its module path. Restore only the
# child Windows PowerShell module lookup, without changing machine settings.
$env:PSModulePath=Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\Modules'
& 'D:\demo1\tagmaai\.cache\p0-s21-registration\Control.ps1' -RequestFile 'D:\demo1\tagmaai\.cache\p0-s21-registration\request.json' -AuthorizedNativeChannel
