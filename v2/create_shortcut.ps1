$DesktopPath = [Environment]::GetFolderPath("Desktop")
$ShortcutPath = Join-Path $DesktopPath "Media Planner.lnk"

$V2Dir = $PSScriptRoot
$ProjectDir = (Get-Item $V2Dir).Parent.FullName
$LaunchVbsPath = Join-Path $V2Dir "launch.vbs"

$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = "wscript.exe"
$Shortcut.Arguments = "`"$LaunchVbsPath`""
$Shortcut.WorkingDirectory = $ProjectDir
$Shortcut.IconLocation = "shell32.dll,116"
$Shortcut.WindowStyle = 7
$Shortcut.Save()

Write-Host "Shortcut created successfully at: $ShortcutPath"

