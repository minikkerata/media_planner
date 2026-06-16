import os
from fastapi import APIRouter, Request, HTTPException
from backend.features.explorer.scan import scan_folder_contents
from backend.features.explorer.os_tools import open_in_explorer

router = APIRouter(prefix="/api")

# Küresel pano durumunu (clipboard) file_ops modülünden dinamik okuyacağız
from backend.features.file_ops.file_routes import clipboard

@router.get('/scan')
def scan(folder: str):
    if not folder:
        raise HTTPException(status_code=400, detail="Klasör yolu boş olamaz.")
    
    clean_folder = folder.replace('"', '').replace("'", "").strip()
    
    if not os.path.isdir(clean_folder):
        raise HTTPException(status_code=400, detail="Geçersiz veya bulunamayan klasör yolu.")
        
    folders, videos = scan_folder_contents(clean_folder)
    
    parent = os.path.dirname(os.path.abspath(clean_folder))
    if parent == os.path.abspath(clean_folder):
        parent = None
        
    return {
        "success": True,
        "current_folder": os.path.abspath(clean_folder),
        "parent_folder": parent,
        "subfolders": folders,
        "videos": videos,
        "clipboard": clipboard
      }

@router.post('/open-explorer')
async def open_explorer_endpoint(request: Request):
    try:
        data = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Geçersiz JSON verisi.")
        
    paths = data.get('paths', [])
    if not paths:
        raise HTTPException(status_code=400, detail="Dosya yolu bulunamadı.")
    
    open_in_explorer(paths)
    return {"success": True}

def pick_folder_sync():
    import tkinter as tk
    from tkinter import filedialog
    root = tk.Tk()
    root.withdraw()
    root.lift()
    root.attributes("-topmost", True)
    folder = filedialog.askdirectory(parent=root, title="Video klasörünü seçin")
    root.destroy()
    return folder

@router.get('/pick-folder')
def pick_folder():
    folder = pick_folder_sync()
    return {"success": bool(folder), "folder": folder}