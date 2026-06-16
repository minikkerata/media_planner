import os
import sys
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Proje kök dizinini Python yoluna ekliyoruz ki import hataları yaşanmasın
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

# Yeni parçalanmış router'ları içeri alıyoruz
from backend.features.explorer.explorer_routes import router as explorer_router
from backend.features.media.media_routes import router as media_router
from backend.features.file_ops.file_routes import router as file_router
from backend.features.ai.ai_routes import router as ai_router

app = FastAPI(title="Media Planner API", version="3.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Tüm bağımsız alan kapılarını sisteme kaydediyoruz
app.include_router(explorer_router)
app.include_router(media_router)
app.include_router(file_router)
app.include_router(ai_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="127.0.0.1", port=8085, reload=False)