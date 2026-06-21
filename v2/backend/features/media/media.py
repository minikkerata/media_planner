import os
import hashlib
from backend.core.config import THUMB_DIR

# Thumbnail çözünürlüğü: 9:16 dikey format için optimize (540x960)
THUMB_W = 540
THUMB_H = 960
THUMB_QUALITY = 95

def extract_thumbnail(video_path: str, folder: str) -> str:
    """OpenCV ile videodan yüksek kaliteli dikey (9:16) önizleme resmi üretir."""
    try:
        import cv2
        thumb_dir = os.path.join(folder, THUMB_DIR)
        os.makedirs(thumb_dir, exist_ok=True)

        # Cache key: boyut + kalite değiştiğinde eski düşük kaliteli cache'i yoksay
        cache_key = f"{video_path}_{THUMB_W}x{THUMB_H}_q{THUMB_QUALITY}"
        h_name = hashlib.md5(cache_key.encode("utf-8")).hexdigest()
        thumb_path = os.path.join(thumb_dir, f"{h_name}.jpg")

        if os.path.exists(thumb_path):
            return thumb_path

        cap = cv2.VideoCapture(video_path)
        total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        fps = cap.get(cv2.CAP_PROP_FPS) or 30

        # Videonun %10'undan kare al (siyah açılış karelerini atlamak için)
        # En az 1 saniye ilerle, en fazla 10 saniye
        target_sec = max(1.0, min(total / fps * 0.10, 10.0))
        target_frame = min(int(target_sec * fps), total - 1) if total > 0 else 0
        cap.set(cv2.CAP_PROP_POS_FRAMES, target_frame)
        ret, frame = cap.read()
        cap.release()

        if ret:
            h, w = frame.shape[:2]

            # Orijinal en-boy oranını koruyarak hedef alana sığdır (letterbox/pillarbox)
            scale = min(THUMB_W / w, THUMB_H / h)
            nw, nh = int(w * scale), int(h * scale)

            # LANCZOS4: en yüksek kaliteli downscale algoritması
            frame = cv2.resize(frame, (nw, nh), interpolation=cv2.INTER_LANCZOS4)

            top = (THUMB_H - nh) // 2
            bottom = THUMB_H - nh - top
            left = (THUMB_W - nw) // 2
            right = THUMB_W - nw - left

            # Arka plan: koyu gri (#161B22 benzeri)
            canvas = cv2.copyMakeBorder(frame, top, bottom, left, right,
                                        cv2.BORDER_CONSTANT, value=[22, 27, 34])

            ok, buf = cv2.imencode(".jpg", canvas, [cv2.IMWRITE_JPEG_QUALITY, THUMB_QUALITY])
            if ok:
                with open(thumb_path, "wb") as f:
                    f.write(buf.tobytes())
                return thumb_path
    except Exception:
        pass
    return None