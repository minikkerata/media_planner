import os
import sys
import time
import subprocess
import threading
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from backend.features.media.media import extract_thumbnail

router = APIRouter(prefix="/api")

@router.get('/video')
def serve_video(path: str):
    """Videoyu yerel diskten tarayıcıya canlı akış olarak aktarır."""
    if not path or not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Video bulunamadı.")
    return FileResponse(path)

@router.get('/thumbnail')
def serve_thumbnail(path: str):
    """Videodan üretilen önizleme resmini tarayıcıya servis eder."""
    if not path or not os.path.exists(path):
        raise HTTPException(status_code=400, detail="Video yolu gerekli.")
    folder = os.path.dirname(path)
    thumb_path = extract_thumbnail(path, folder)
    if thumb_path and os.path.exists(thumb_path):
        return FileResponse(thumb_path)
    raise HTTPException(status_code=404, detail="Önizleme resmi üretilemedi.")

@router.post('/shutdown')
def shutdown():
    """Vite dev server'ı port üzerinden avlar ve backend sunucusunu kapatır."""
    def perform_shutdown():
        time.sleep(0.5)
        try:
            # Orijinal koddaki gibi tüm bağlantıları tarayıp hızlıca filtrele
            output = subprocess.check_output('netstat -aon | findstr ":5173" | findstr "LISTENING"', shell=True).decode('utf-8', errors='ignore')
            for line in output.splitlines():
                parts = line.strip().split()
                if len(parts) >= 5:
                    pid = parts[-1]
                    subprocess.run(f"taskkill /f /pid {pid}", shell=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        except Exception:
            pass
        
        try:
            my_pid = os.getpid()
            subprocess.run(f"taskkill /f /pid {my_pid}", shell=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        except Exception:
            os._exit(0)
        
    threading.Thread(target=perform_shutdown, daemon=True).start()
    return {"success": True, "message": "Sistem kapatılıyor..."}

import re
from backend.core.database import get_connection

@router.get('/usernames')
def get_historical_usernames():
    """Tüm açıklamalardaki @ etiketli kullanıcı adlarını benzersiz olarak çeker."""
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT description FROM notes WHERE description IS NOT NULL AND description != ''")
        rows = cursor.fetchall()
        conn.close()
        
        usernames = set()
        for row in rows:
            desc = row["description"]
            # Find all words starting with @ followed by alphanumeric, underscores, dots, hyphens
            matches = re.findall(r'@([a-zA-Z0-9_\.\-]+)', desc)
            for m in matches:
                cleaned = m.strip().rstrip('.-_')
                if cleaned and cleaned.lower() not in ['username', 'filename', 'folder']:
                    usernames.add(cleaned)
                    
        return {"success": True, "usernames": sorted(list(usernames))}
    except Exception as e:
        return {"success": False, "error": str(e), "usernames": []}

@router.get('/scheduled-videos')
def get_scheduled_videos():
    """Yayın tarihi (publish_time) girilmiş olan veya paylaşıldı olarak işaretlenmiş tüm videoları veritabanından çeker."""
    try:
        import datetime
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT name, path, size, ctime, description, shared, updated_at, fixed_text, publish_time 
            FROM notes 
            WHERE (publish_time IS NOT NULL AND publish_time != '') OR shared = 1
        """)
        rows = cursor.fetchall()
        conn.close()
        
        videos_list = []
        for row in rows:
            publish_time = row["publish_time"] or ""
            # Fallback to updated_at if empty but shared is True
            if not publish_time and row["shared"] and row["updated_at"]:
                try:
                    dt = datetime.datetime.fromtimestamp(row["updated_at"] / 1000.0, datetime.timezone.utc)
                    publish_time = dt.isoformat().replace('+00:00', 'Z')
                except Exception:
                    pass

            videos_list.append({
                "name": row["name"],
                "path": row["path"],
                "size": row["size"],
                "ctime": row["ctime"],
                "description": row["description"],
                "shared": bool(row["shared"]),
                "updated_at": row["updated_at"] or 0,
                "fixed_text": row["fixed_text"] or "",
                "publish_time": publish_time
            })
        return {"success": True, "videos": videos_list}
    except Exception as e:
        return {"success": False, "error": str(e), "videos": []}