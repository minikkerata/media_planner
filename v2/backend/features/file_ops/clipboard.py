import os
import shutil
from backend.core.database import get_note, save_note, delete_note, make_key

def execute_paste_operation(dest_dir: str, operation: str, paths_to_paste: list) -> tuple[int, list]:
    """Hafızadaki videoları hedef klasöre kopyalar veya taşır, çakışmaları çözer, notları SQLite'ta günceller."""
    success_count = 0
    errors = []
    pasted_items = []
    
    for src_path in paths_to_paste:
        if not os.path.exists(src_path):
            errors.append(f"Kaynak dosya bulunamadı: {os.path.basename(src_path)}")
            continue
            
        filename = os.path.basename(src_path)
        dest_path = os.path.join(dest_dir, filename)
        
        is_same_file = os.path.normcase(os.path.abspath(src_path)) == os.path.normcase(os.path.abspath(dest_path))
        
        if is_same_file and operation == "cut":
            errors.append(f"Dosya zaten bu klasörde: {filename}")
            continue

        # İsim çakışması çözümü (Kopya (x) ekleme mantığı)
        if is_same_file or os.path.exists(dest_path):
            base, ext = os.path.splitext(filename)
            counter = 1
            while True:
                new_filename = f"{base} - Kopya ({counter}){ext}"
                dest_path = os.path.join(dest_dir, new_filename)
                if not os.path.exists(dest_path):
                    filename = new_filename
                    break
                counter += 1
                
        # Get source metadata info before move/copy
        meta_entry = None
        src_key = None
        try:
            src_filename = os.path.basename(src_path)
            src_stat = os.stat(src_path)
            src_ctime = getattr(src_stat, 'st_ctime', 0) or src_stat.st_mtime
            src_key = make_key(src_filename, src_stat.st_size, int(src_ctime * 1000))
            meta_entry = get_note(src_key)
        except Exception as e:
            print(f"Error fetching source note before paste: {e}")

        try:
            is_dir = os.path.isdir(src_path)
            if operation == "cut":
                shutil.move(src_path, dest_path)
            else:
                if is_dir:
                    shutil.copytree(src_path, dest_path)
                else:
                    shutil.copy2(src_path, dest_path)
                    
            # Update SQLite database for target
            if meta_entry and not is_dir:
                try:
                    dest_stat = os.stat(dest_path)
                    dest_ctime = getattr(dest_stat, 'st_ctime', 0) or dest_stat.st_mtime
                    dest_ctime_ms = int(dest_ctime * 1000)
                    dest_key = make_key(filename, dest_stat.st_size, dest_ctime_ms)
                    save_note(dest_key, filename, dest_stat.st_size, dest_ctime_ms, meta_entry["description"], meta_entry["shared"])
                    
                    if operation == "cut" and src_key:
                        delete_note(src_key)
                except Exception as db_err:
                    print("Error moving note in SQLite database during paste:", db_err)
                    
            success_count += 1
            pasted_items.append({
                "src": src_path,
                "dest": dest_path,
                "meta": meta_entry
            })
        except Exception as ex:
            errors.append(str(ex))
            
    from backend.features.file_ops.undo import UndoManager
    if pasted_items:
        act_type = "cut_paste" if operation == "cut" else "copy_paste"
        UndoManager.push_action(act_type, pasted_items)
        
    return success_count, errors