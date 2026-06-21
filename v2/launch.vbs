Set WshShell = CreateObject("WScript.Shell")
Set FSO = CreateObject("Scripting.FileSystemObject")
ScriptDir = FSO.GetParentFolderName(WScript.ScriptFullName)
EditBatPath = FSO.BuildPath(ScriptDir, "edit.bat")
WshShell.Run """" & EditBatPath & """", 0, False
