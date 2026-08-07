import express from 'express';

const router = express.Router();

const OLLAMA_URL = 'http://127.0.0.1:11434/api/generate';
const DEFAULT_MODEL = 'llama3.2';

router.post('/ai/rewrite', async (req, res) => {
  const { text = '', default_prompt = '', custom_prompt = '' } = req.body || {};

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const sendEvent = (data) => {
    try {
      res.write(JSON.stringify(data) + '\n');
    } catch {}
  };

  if (!text.trim()) {
    sendEvent({ type: 'status', message: 'Boş metin.' });
    sendEvent({ type: 'token', text: '' });
    sendEvent({ type: 'done' });
    return res.end();
  }

  const systemInstruction = default_prompt.trim();
  let prompt = 'Lütfen aşağıdaki metni düzeltin veya istenen talimata göre revize edin.\n';
  if (custom_prompt.trim()) {
    prompt += `Ek Kullanıcı Talimatı: ${custom_prompt.trim()}\n`;
  }
  prompt += `Düzeltilecek orijinal metin:\n"""\n${text}\n"""\n\nSadece revize edilmiş metni döndürün. Açıklama, tırnak işareti, giriş veya çıkış cümleleri eklemeyin.`;

  sendEvent({ type: 'status', message: 'Ollama sunucusuna bağlanılıyor...' });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s fast timeout

  try {
    const response = await fetch(OLLAMA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        prompt,
        system: systemInstruction,
        stream: true,
        options: { temperature: 0.3 }
      })
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      sendEvent({ type: 'error', message: `Ollama hatası (Kod: ${response.status})` });
      return res.end();
    }

    sendEvent({ type: 'status', message: 'Yanıt üretiliyor...' });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.trim()) {
          try {
            const chunk = JSON.parse(line);
            if (chunk.response) {
              sendEvent({ type: 'token', text: chunk.response });
            }
          } catch {}
        }
      }
    }

    sendEvent({ type: 'done' });
    res.end();
  } catch (err) {
    clearTimeout(timeoutId);
    // Fallback to local mock rewrite if Ollama is offline or timed out
    sendEvent({ type: 'status', message: 'Ollama sunucusuna bağlanılamadı. Demo moduna geçiliyor...' });
    await new Promise(r => setTimeout(r, 300));
    sendEvent({ type: 'status', message: 'Demo modunda revizyon hazırlanıyor...' });
    await new Promise(r => setTimeout(r, 300));

    let replacement = text;
    const lowerPrompt = custom_prompt.toLowerCase().trim();

    if (['büyük', 'upper', 'büyük harf'].includes(lowerPrompt)) {
      replacement = text.toUpperCase();
    } else if (['küçük', 'lower', 'küçük harf'].includes(lowerPrompt)) {
      replacement = text.toLowerCase();
    } else if (lowerPrompt.includes('ingilizce') || lowerPrompt.includes('translate') || lowerPrompt.includes('english')) {
      replacement = `[English Translation of: ${text}]`;
    } else {
      replacement = text.trim().replace(/veya/g, 've').replace(/ama/g, 've');
      if (replacement === text) {
        replacement = replacement + ' ✓';
      }
    }

    const words = replacement.split(' ');
    for (let i = 0; i < words.length; i++) {
      await new Promise(r => setTimeout(r, 40));
      sendEvent({ type: 'token', text: words[i] + (i < words.length - 1 ? ' ' : '') });
    }

    sendEvent({ type: 'done' });
    res.end();
  }
});

export default router;
