import os
import shutil
import time
from backend.core.database import get_note, save_note, delete_note, make_key

class UndoManager:
    _stack = []
    
    @classmethod
    def push_action(cls, action_type, items):
        cls._stack.append({
            "type": action_type,
            "items": items,
            "timestamp": time.time()
        })
        if len(cls._stack) > 50:
            cls._stack.pop(0)
            
    @classmethod
    def pop_action(cls):
        if not cls._stack:
            return None
        return cls._stack.pop()
        
    @classmethod
    def execute_undo(cls):
        action = cls.pop_action()
        if not action:
            return False, "Geri alınacak işlem yok."
            
        try:
            act_type = action["type"]
            items = action["items"]
            
            if act_type == "cut_paste":
                for item in items:
                    src = item["src"]
                    dest = item["dest"]
                    if os.path.exists(dest):
                        meta_entry = None
                        try:
                            # 1. Fetch note at dest key and delete it
                            dest_name = os.path.basename(dest)
                            dest_stat = os.stat(dest)
                            dest_ctime = getattr(dest_stat, 'st_ctime', 0) or dest_stat.st_mtime
                            dest_key = make_key(dest_name, dest_stat.st_size, int(dest_ctime * 1000))
                            meta_entry = get_note(dest_key)
                            if meta_entry:
                                delete_note(dest_key)
                        except Exception as e:
                            print(f"Error fetching/deleting dest note during cut_paste undo: {e}")

                        os.makedirs(os.path.dirname(src), exist_ok=True)
                        shutil.move(dest, src)
                        
                        # 2. Write note back under src key
                        if meta_entry:
                            try:
                                src_name = os.path.basename(src)
                                src_stat = os.stat(src)
                                src_ctime = getattr(src_stat, 'st_ctime', 0) or src_stat.st_mtime
                                src_ctime_ms = int(src_ctime * 1000)
                                src_key = make_key(src_name, src_stat.st_size, src_ctime_ms)
                                save_note(src_key, src_name, src_stat.st_size, src_ctime_ms, meta_entry["description"], meta_entry["shared"])
                            except Exception as e:
                                print(f"Error saving src note during cut_paste undo: {e}")
                        
            elif act_type == "copy_paste":
                for item in items:
                    dest = item["dest"]
                    if os.path.exists(dest):
                        try:
                            # Delete notes entry for copied file
                            dest_name = os.path.basename(dest)
                            dest_stat = os.stat(dest)
                            dest_ctime = getattr(dest_stat, 'st_ctime', 0) or dest_stat.st_mtime
                            dest_key = make_key(dest_name, dest_stat.st_size, int(dest_ctime * 1000))
                            delete_note(dest_key)
                        except Exception as e:
                            print(f"Error deleting copied note during copy_paste undo: {e}")

                        if os.path.isdir(dest):
                            shutil.rmtree(dest)
                        else:
                            os.remove(dest)
                            
            elif act_type == "delete":
                for item in items:
                    orig = item["original_path"]
                    trash = item["trash_path"]
                    meta_entry = item.get("meta")
                    
                    if os.path.exists(trash):
                        os.makedirs(os.path.dirname(orig), exist_ok=True)
                        shutil.move(trash, orig)
                        
                        # Restore note entry in database
                        if meta_entry:
                            try:
                                orig_name = os.path.basename(orig)
                                orig_stat = os.stat(orig)
                                orig_ctime = getattr(orig_stat, 'st_ctime', 0) or orig_stat.st_mtime
                                orig_ctime_ms = int(orig_ctime * 1000)
                                orig_key = make_key(orig_name, orig_stat.st_size, orig_ctime_ms)
                                save_note(orig_key, orig_name, orig_stat.st_size, orig_ctime_ms, meta_entry["description"], meta_entry["shared"])
                            except Exception as e:
                                print(f"Error restoring note during delete undo: {e}")
            
            return True, "İşlem başarıyla geri alındı."
        except Exception as e:
            return False, f"Geri alma hatası: {str(e)}"
