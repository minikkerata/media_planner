import os
import hashlib
from backend.core.config import THUMB_DIR

def extract_thumbnail(video_path: str, folder: str) -> str:
    """OpenCV ile videodan 16:9 oranında önizleme resmi (thumbnail) üretir."""
    try:
        import cv2
        thumb_dir = os.path.join(folder, THUMB_DIR)
        os.makedirs(thumb_dir, exist_ok=True)
        h_name = hashlib.md5(video_path.encode("utf-8")).hexdigest()
        thumb_path = os.path.join(thumb_dir, f"{h_name}.jpg")
        
        if os.path.exists(thumb_path):
            return thumb_path
        
        cap = cv2.VideoCapture(video_path)
        total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        if total > 0:
            cap.set(cv2.CAP_PROP_POS_FRAMES, min(30, total - 1))
        ret, frame = cap.read()
        cap.release()
        
        if ret:
            target_w, target_h = 320, 180
            h, w = frame.shape[:2]
            scale = min(target_w / w, target_h / h)
            nw, nh = int(w * scale), int(h * scale)
            frame = cv2.resize(frame, (nw, nh))
            top = (target_h - nh) // 2
            bottom = target_h - nh - top
            left = (target_w - nw) // 2
            right = target_w - nw - left
            canvas = cv2.copyMakeBorder(frame, top, bottom, left, right,
                                        cv2.BORDER_CONSTANT, value=[22, 27, 34])
            ok, buf = cv2.imencode(".jpg", canvas, [cv2.IMWRITE_JPEG_QUALITY, 80])
            if ok:
                with open(thumb_path, "wb") as f:
                    f.write(buf.tobytes())
                return thumb_path
    except Exception:
        pass
    return None