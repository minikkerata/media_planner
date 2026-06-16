import httpx
from fastapi import APIRouter, Request, HTTPException

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
        return {"success": True, "rewritten_text": ""}
        
    # Construct Ollama prompt
    system_instruction = default_prompt.strip()
    
    prompt = "Lütfen aşağıdaki metni düzeltin veya istenen talimata göre revize edin.\n"
    if custom_prompt.strip():
        prompt += f"Ek Kullanıcı Talimatı: {custom_prompt.strip()}\n"
    prompt += f"Düzeltilecek orijinal metin:\n\"\"\"\n{text}\n\"\"\"\n\nSadece revize edilmiş metni döndürün. Açıklama, tırnak işareti, giriş veya çıkış cümleleri eklemeyin."

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                OLLAMA_URL,
                json={
                    "model": DEFAULT_MODEL,
                    "prompt": prompt,
                    "system": system_instruction,
                    "stream": False,
                    "options": {
                        "temperature": 0.3
                    }
                }
            )
            
            if response.status_code == 200:
                result = response.json()
                rewritten_text = result.get('response', '').strip()
                # Clean up any surrounding quotes if Llama decides to add them
                if rewritten_text.startswith('"') and rewritten_text.endswith('"'):
                    rewritten_text = rewritten_text[1:-1].strip()
                elif rewritten_text.startswith("'''") and rewritten_text.endswith("'''"):
                    rewritten_text = rewritten_text[3:-3].strip()
                return {"success": True, "rewritten_text": rewritten_text}
            else:
                return {
                    "success": False,
                    "error": f"Ollama sunucusu hata döndürdü: Code {response.status_code}",
                    "fallback": True
                }
    except httpx.RequestError as e:
        # Fallback to local mock rewrite if Ollama is not installed/running
        return {
            "success": False,
            "error": "Ollama sunucusuna bağlanılamadı. Lütfen Ollama uygulamasının açık olduğundan ve modelin yüklendiğinden emin olun.",
            "fallback": True
        }
