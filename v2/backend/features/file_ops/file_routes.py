import os
from fastapi import APIRouter, Request, HTTPException
from backend.core.database import get_note, save_note, make_key, get_all_notes_for_export, import_notes_bulk, search_notes
from backend.features.file_ops.clipboard import execute_paste_operation
from backend.features.file_ops.delete import execute_delete_operation

router = APIRouter(prefix="/api")

# Rotalar arasında paylaşılacak küresel pano durumu
clipboard = {
    "operation": None,  # "copy" or "cut"
    "paths": []
}

@router.post('/metadata/update')
async def update_metadata(request: Request):
    try:
        data = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Geçersiz JSON verisi.")
        
    folder = data.get('folder')
    updates = data.get('updates')
    
    if not folder or not os.path.isdir(folder) or not updates:
        raise HTTPException(status_code=400, detail="Geçersiz parametreler.")
        
    for update in updates:
        name = update.get('name')
        if not name:
            continue
            
        video_path = os.path.join(folder, name)
        if not os.path.exists(video_path):
            continue
            
        try:
            stat = os.stat(video_path)
            ctime = getattr(stat, 'st_ctime', 0) or stat.st_mtime
            ctime_ms = int(ctime * 1000)
            key = make_key(name, stat.st_size, ctime_ms)
            
            existing = get_note(key) or {"description": "", "shared": False}
            
            description = update.get('description', existing['description'])
            shared = update.get('shared', existing['shared'])
            
            save_note(key, name, stat.st_size, ctime_ms, description, shared, video_path)
        except Exception as e:
            print(f"Error updating SQLite metadata for {name}: {e}")
            
    return {"success": True}

@router.get('/notes/search')
def search_videos(query: str = ""):
    try:
        matches = search_notes(query)
        results = []
        for m in matches:
            if m["path"] and os.path.exists(m["path"]):
                results.append(m)
        return {"success": True, "results": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get('/notes/export')
def export_notes():
    try:
        data = get_all_notes_for_export()
        return {"success": True, "notes": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post('/notes/import')
async def import_notes(request: Request):
    try:
        data = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Geçersiz JSON verisi.")
        
    notes_list = data.get("notes")
    if notes_list is None:
        raise HTTPException(status_code=400, detail="Pano verisi eksik.")
        
    try:
        import_notes_bulk(notes_list)
        return {"success": True, "message": f"{len(notes_list)} adet not başarıyla içe aktarıldı."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post('/clipboard')
async def set_clipboard(request: Request):
    global clipboard
    try:
        data = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Geçersiz JSON verisi.")
        
    clipboard["operation"] = data.get('operation')
    clipboard["paths"] = data.get('paths', [])
    return {"success": True, "clipboard": clipboard}

@router.post('/paste')
async def paste(request: Request):
    global clipboard
    try:
        data = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Geçersiz JSON verisi.")
        
    dest_dir = data.get('folder')
    if not dest_dir or not os.path.isdir(dest_dir):
        raise HTTPException(status_code=400, detail="Geçersiz hedef klasör.")
        
    operation = clipboard.get('operation')
    paths_to_paste = clipboard.get('paths', [])
    
    if not operation or not paths_to_paste:
        raise HTTPException(status_code=400, detail="Pano boş.")
        
    success_count, errors = execute_paste_operation(dest_dir, operation, paths_to_paste)
    
    if operation == "cut" and success_count > 0:
        clipboard["paths"] = []
        clipboard["operation"] = None
        
    return {
        "success": True,
        "copied": success_count,
        "errors": errors,
        "clipboard": clipboard
    }

@router.post('/delete')
async def delete_files(request: Request):
    try:
        data = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Geçersiz JSON verisi.")
        
    paths_to_delete = data.get('paths', [])
    if not paths_to_delete:
        raise HTTPException(status_code=400, detail="Silinecek dosya seçilmedi.")
        
    success_count, errors = execute_delete_operation(paths_to_delete)
            
    return {
        "success": True,
        "deleted": success_count,
        "errors": errors
    }

@router.post('/undo')
async def undo_action():
    from backend.features.file_ops.undo import UndoManager
    success, message = UndoManager.execute_undo()
    if not success:
        raise HTTPException(status_code=400, detail=message)
    return {"success": True, "message": message}