Set WshShell = CreateObject("WScript.Shell")
Set FSO = CreateObject("Scripting.FileSystemObject")
ScriptDir = FSO.GetParentFolderName(WScript.ScriptFullName)
RunBatPath = FSO.BuildPath(ScriptDir, "run.bat")
WshShell.Run """" & RunBatPath & """", 0, False
