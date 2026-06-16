import os
import shutil
from backend.core.database import get_note, delete_note, make_key

def execute_delete_operation(paths_to_delete: list) -> tuple[int, list]:
    """Seçilen dosyaları diskten kalıcı olarak siler ve metadata kayıtlarını SQLite'tan temizler, geri almayı destekler."""
    success_count = 0
    errors = []
    deleted_items = []
    
    TRASH_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", ".trash"))
    os.makedirs(TRASH_DIR, exist_ok=True)
    
    for path in paths_to_delete:
        if not os.path.exists(path):
            continue
        try:
            folder_path = os.path.dirname(path)
            fname = os.path.basename(path)
            
            # Fetch metadata entry before move
            meta_entry = None
            try:
                stat = os.stat(path)
                ctime = getattr(stat, 'st_ctime', 0) or stat.st_mtime
                key = make_key(fname, stat.st_size, int(ctime * 1000))
                meta_entry = get_note(key)
                if meta_entry:
                    delete_note(key)
            except Exception as e:
                print(f"Error fetching/deleting note from SQLite before deleting file {fname}: {e}")

            import time
            import random
            trash_name = f"{int(time.time())}_{random.randint(1000, 9999)}_{fname}"
            trash_path = os.path.join(TRASH_DIR, trash_name)
            
            shutil.move(path, trash_path)
                
            success_count += 1
            deleted_items.append({
                "original_path": path,
                "trash_path": trash_path,
                "meta": meta_entry
            })
        except Exception as ex:
            errors.append(str(ex))
            
    from backend.features.file_ops.undo import UndoManager
    if deleted_items:
        UndoManager.push_action("delete", deleted_items)
            
    return success_count, errors