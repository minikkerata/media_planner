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