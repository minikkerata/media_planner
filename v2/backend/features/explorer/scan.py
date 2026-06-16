import os
import json
from pathlib import Path
from backend.core.config import VIDEO_EXTENSIONS
from backend.core.database import get_notes_bulk, make_key, get_note, save_note

def migrate_legacy_metadata(folder: str, video_entries: list):
    """Eski content_metadata.json dosyasındaki notları otomatik olarak SQLite veritabanına taşır."""
    legacy_path = os.path.join(folder, "content_metadata.json")
    if not os.path.exists(legacy_path):
        return
        
    try:
        with open(legacy_path, "r", encoding="utf-8") as f:
            legacy_data = json.load(f)
            
        if not legacy_data:
            return
            
        for entry, stat, key, _ in video_entries:
            name = entry.name
            if name in legacy_data:
                # SQLite'ta bu dosyanın notu yoksa eski veriyi yaz
                if not get_note(key):
                    entry_data = legacy_data[name]
                    desc = entry_data.get("description", "")
                    shared = entry_data.get("shared", False)
                    ctime = getattr(stat, 'st_ctime', 0) or stat.st_mtime
                    ctime_ms = int(ctime * 1000)
                    save_note(key, name, stat.st_size, ctime_ms, desc, shared, os.path.abspath(entry.path))
                    
    except Exception as e:
        print("Metadata migration error:", e)

def scan_folder_contents(folder: str) -> tuple[list[dict], list[dict]]:
    """Klasörü tarar; alt klasörleri ve videoları listeler, notları SQLite'tan çeker ve eski JSON'ları göç ettirir."""
    folders = []
    videos = []
    
    try:
        entries = list(os.scandir(folder))
        video_entries = []
        video_keys = []
        
        for entry in entries:
            if entry.name.startswith("."):
                continue
            if entry.is_dir():
                folders.append({
                    "name": entry.name,
                    "path": os.path.abspath(entry.path),
                    "is_folder": True
                })
            elif entry.is_file() and Path(entry.name).suffix.lower() in VIDEO_EXTENSIONS:
                stat = entry.stat()
                ctime = getattr(stat, 'st_ctime', 0) or stat.st_mtime
                ctime_ms = int(ctime * 1000)
                key = make_key(entry.name, stat.st_size, ctime_ms)
                video_entries.append((entry, stat, key, ctime))
                video_keys.append(key)
                
        # Auto-migrate legacy notes if present in this folder
        migrate_legacy_metadata(folder, video_entries)
        
        # Fetch metadata in bulk from SQLite database
        notes_map = get_notes_bulk(video_keys)
        
        for entry, stat, key, file_time in video_entries:
            meta = notes_map.get(key, {})
            video_path = os.path.abspath(entry.path)
            
            # If note exists in DB but lacks path column value, populate it
            if meta and not meta.get("path"):
                try:
                    ctime_ms = int(file_time * 1000)
                    save_note(key, entry.name, stat.st_size, ctime_ms, meta.get("description", ""), meta.get("shared", False), video_path)
                except Exception:
                    pass
                    
            videos.append({
                "name": entry.name,
                "path": video_path,
                "is_folder": False,
                "description": meta.get("description", ""),
                "shared": meta.get("shared", False),
                "size": stat.st_size,
                "extension": Path(entry.name).suffix.lower(),
                "time": file_time
            })
            
        # Klasörleri alfabetik sırala
        folders.sort(key=lambda f: f["name"].lower())
        
        # Videoları sırala: 
        # 1. Paylaşılanlar en sona (shared=False önce gelsin diye boolean sıralama)
        # 2. Kendi içlerinde en yeni tarihten en eskiye doğru (Zamanı tersine çeviriyoruz: -v["time"])
        videos.sort(key=lambda v: (v["shared"], -v["time"]))
        
    except Exception:
        pass
    return folders, videos