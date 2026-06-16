import os
import time
import subprocess
import threading

def open_in_explorer(file_paths):
    """Seçilen videoları Windows Explorer üzerinde vurgulayarak açar (Windows API)."""
    try:
        if not file_paths:
            return
        first_path = file_paths[0]
        folder_path = os.path.dirname(first_path)
        file_names = [os.path.basename(p) for p in file_paths]

        def worker():
            try:
                import ctypes
                from ctypes import wintypes
                shell32 = ctypes.windll.shell32
                ole32 = ctypes.windll.ole32
                user32 = ctypes.windll.user32

                shell32.ILCreateFromPathW.argtypes = [wintypes.LPCWSTR]
                shell32.ILCreateFromPathW.restype = ctypes.c_void_p
                shell32.ILFree.argtypes = [ctypes.c_void_p]
                shell32.ILFree.restype = None
                shell32.SHOpenFolderAndSelectItems.argtypes = [
                    ctypes.c_void_p, wintypes.UINT, ctypes.c_void_p, wintypes.DWORD
                ]
                shell32.SHOpenFolderAndSelectItems.restype = ctypes.HRESULT

                ole32.CoInitialize(None)
                try:
                    folder_pidl = shell32.ILCreateFromPathW(folder_path)
                    if not folder_pidl:
                        subprocess.Popen(["explorer", "/select,", os.path.normpath(first_path)])
                        return
                    pidl_list = []
                    for name in file_names:
                        pidl = shell32.ILCreateFromPathW(os.path.join(folder_path, name))
                        if pidl:
                            pidl_list.append(pidl)
                    if not pidl_list:
                        shell32.ILFree(folder_pidl)
                        subprocess.Popen(["explorer", "/select,", os.path.normpath(first_path)])
                        return
                    pidl_array = (ctypes.c_void_p * len(pidl_list))(*pidl_list)
                    hr = shell32.SHOpenFolderAndSelectItems(folder_pidl, len(pidl_list), pidl_array, 0)
                    for pidl in pidl_list:
                        shell32.ILFree(pidl)
                    shell32.ILFree(folder_pidl)
                    
                    if hr == 0:
                        time.sleep(0.4)
                        hwnd = user32.FindWindowW("CabinetWClass", None)
                        if hwnd:
                            user32.AllowSetForegroundWindow(wintypes.DWORD(-1))
                            user32.SetForegroundWindow(hwnd)
                            user32.ShowWindow(hwnd, 9)
                    else:
                        subprocess.Popen(["explorer", "/select,", os.path.normpath(first_path)])
                except Exception:
                    subprocess.Popen(["explorer", "/select,", os.path.normpath(first_path)])
                finally:
                    ole32.CoUninitialize()
            except Exception:
                try:
                    subprocess.Popen(["explorer", "/select,", os.path.normpath(first_path)])
                except Exception:
                    pass

        threading.Thread(target=worker, daemon=True).start()
    except Exception:
        pass