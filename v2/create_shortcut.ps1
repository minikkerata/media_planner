$DesktopPath = [Environment]::GetFolderPath("Desktop")
$ShortcutPath = Join-Path $DesktopPath "Media Planner v2.lnk"

$V2Dir = $PSScriptRoot
$LaunchVbsPath = Join-Path $V2Dir "launch.vbs"
$IconPath = Join-Path $V2Dir "logo.ico"

$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = "wscript.exe"
$Shortcut.Arguments = "`"$LaunchVbsPath`""
$Shortcut.WorkingDirectory = $V2Dir
$Shortcut.IconLocation = $IconPath
$Shortcut.WindowStyle = 7
$Shortcut.Save()

Write-Host "Independent shortcut created successfully at: $ShortcutPath"
