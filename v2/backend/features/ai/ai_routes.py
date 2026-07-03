import httpx
import asyncio
import json
from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import StreamingResponse

router = APIRouter(prefix="/api")

OLLAMA_URL = "http://127.0.0.1:11434/api/generate"
DEFAULT_MODEL = "llama3.2"  # Upgrade to 3B model for significantly better Turkish and reasoning

@router.post('/ai/rewrite')
async def ai_rewrite(request: Request):
    try:
        data = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Geçersiz JSON verisi.")
        
    text = data.get('text', '')
    default_prompt = data.get('default_prompt', '')
    custom_prompt = data.get('custom_prompt', '')
    
    if not text.strip():
        async def empty_generator():
            yield json.dumps({"type": "status", "message": "Boş metin."}) + "\n"
            yield json.dumps({"type": "token", "text": ""}) + "\n"
            yield json.dumps({"type": "done"}) + "\n"
        return StreamingResponse(empty_generator(), media_type="text/event-stream")
        
    # Construct Ollama prompt
    system_instruction = default_prompt.strip()
    
    prompt = "Lütfen aşağıdaki metni düzeltin veya istenen talimata göre revize edin.\n"
    if custom_prompt.strip():
        prompt += f"Ek Kullanıcı Talimatı: {custom_prompt.strip()}\n"
    prompt += f"Düzeltilecek orijinal metin:\n\"\"\"\n{text}\n\"\"\"\n\nSadece revize edilmiş metni döndürün. Açıklama, tırnak işareti, giriş veya çıkış cümleleri eklemeyin."

    async def event_generator():
        # Adım 1: Ollama sunucusuna bağlanılıyor
        yield json.dumps({"type": "status", "message": "Ollama sunucusuna bağlanılıyor..."}) + "\n"
        await asyncio.sleep(0.1)
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                # Adım 2: Model yükleniyor ve düşünülüyor
                yield json.dumps({"type": "status", "message": "Llama modeli yükleniyor ve yapay zeka düşünüyor..."}) + "\n"
                
                async with client.stream(
                    "POST",
                    OLLAMA_URL,
                    json={
                        "model": DEFAULT_MODEL,
                        "prompt": prompt,
                        "system": system_instruction,
                        "stream": True,
                        "options": {
                            "temperature": 0.3
                        }
                    }
                ) as response:
                    if response.status_code == 200:
                        yield json.dumps({"type": "status", "message": "Yanıt üretiliyor..."}) + "\n"
                        await asyncio.sleep(0.1)
                        
                        async for line in response.aiter_lines():
                            if line.strip():
                                try:
                                    chunk = json.loads(line)
                                    token = chunk.get("response", "")
                                    if token:
                                        # Yield the token to frontend
                                        yield json.dumps({"type": "token", "text": token}) + "\n"
                                except Exception:
                                    pass
                        yield json.dumps({"type": "done"}) + "\n"
                    else:
                        yield json.dumps({"type": "error", "message": f"Ollama hatası (Kod: {response.status_code})"}) + "\n"
        except httpx.RequestError as e:
            # Fallback to local mock rewrite if Ollama is not running
            yield json.dumps({"type": "status", "message": "Ollama sunucusuna bağlanılamadı. Demo moduna geçiliyor..."}) + "\n"
            await asyncio.sleep(0.6)
            yield json.dumps({"type": "status", "message": "Demo modunda revizyon hazırlanıyor..."}) + "\n"
            await asyncio.sleep(0.4)
            
            # Simple demo rewrite rules
            replacement = text
            if custom_prompt.lower().strip() in ["büyük", "upper", "büyük harf"]:
                replacement = text.upper()
            elif custom_prompt.lower().strip() in ["küçük", "lower", "küçük harf"]:
                replacement = text.lower()
            elif "ingilizce" in custom_prompt.lower() or "translate" in custom_prompt.lower() or "english" in custom_prompt.lower():
                replacement = f"[English Translation of: {text}]"
            else:
                replacement = text.strip().replace("veya", "ve").replace("ama", "ve")
                if replacement == text:
                    replacement = replacement + " ✓"
            
            # Stream the fallback text word-by-word
            words = replacement.split(" ")
            for i, word in enumerate(words):
                await asyncio.sleep(0.06)
                yield json.dumps({"type": "token", "text": (word + " " if i < len(words) - 1 else word)}) + "\n"
            
            yield json.dumps({"type": "done"}) + "\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")
