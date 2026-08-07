$DesktopPaths = @(
  [Environment]::GetFolderPath("Desktop"),
  (Join-Path $env:USERPROFILE "OneDrive\Masaüstü"),
  (Join-Path $env:USERPROFILE "OneDrive\Desktop"),
  (Join-Path $env:USERPROFILE "Masaüstü")
)

$V2Dir = $PSScriptRoot
$LaunchVbsPath = Join-Path $V2Dir "launch.vbs"
$IconPath = Join-Path $V2Dir "logo.ico"

$WshShell = New-Object -ComObject WScript.Shell

foreach ($d in $DesktopPaths) {
  if (Test-Path $d) {
    foreach ($name in @("Media Planner.lnk", "Media Planner v2.lnk")) {
      $ShortcutPath = Join-Path $d $name
      $Shortcut = $WshShell.CreateShortcut($ShortcutPath)
      $Shortcut.TargetPath = "wscript.exe"
      $Shortcut.Arguments = "`"$LaunchVbsPath`""
      $Shortcut.WorkingDirectory = $V2Dir
      $Shortcut.IconLocation = $IconPath
      $Shortcut.WindowStyle = 1
      $Shortcut.Save()
      Write-Host "Updated desktop shortcut at: $ShortcutPath"
    }
  }
}
