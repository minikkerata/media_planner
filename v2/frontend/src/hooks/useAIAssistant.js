import { useState, useCallback } from 'react';
import { api } from '../services/api';

const API_URL = 'http://127.0.0.1:' + (import.meta.env.VITE_BACKEND_PORT || '8085');

export function useAIAssistant() {
  const [selectedText, setSelectedText] = useState('');
  const [selectionRange, setSelectionRange] = useState({ start: 0, end: 0, target: null });
  const [promptCoords, setPromptCoords] = useState({ x: 0, y: 0 });
  const [isPromptOpen, setIsPromptOpen] = useState(false);
  const [isDiffMode, setIsDiffMode] = useState(false);
  const [diffResult, setDiffResult] = useState({
    originalText: '',
    modifiedText: '',
    // Array of { type: 'unchanged' | 'removed' | 'added', text: string }
    diffData: []
  });

  // Streaming status states
  const [aiStatus, setAiStatus] = useState('');
  const [aiStatusLog, setAiStatusLog] = useState([]);
  const [streamingText, setStreamingText] = useState('');

  const handleSelection = useCallback((e, target) => {
    const textarea = e.target;
    const { selectionStart, selectionEnd, value } = textarea;

    if (selectionStart !== selectionEnd) {
      const selected = value.substring(selectionStart, selectionEnd);
      setSelectedText(selected);
      setSelectionRange({ start: selectionStart, end: selectionEnd, target });

      // Position tooltip near the end selection cursor position
      const rect = textarea.getBoundingClientRect();
      const x = e.clientX || (rect.left + rect.width / 2);
      const y = e.clientY - 40 || rect.top; // Offset above cursor

      setPromptCoords({ x: Math.max(rect.left, x - 30), y: Math.max(rect.top - 50, y) });
    } else {
      // Clear selection if nothing selected
      if (!isPromptOpen && !isDiffMode) {
        setSelectedText('');
        setSelectionRange({ start: 0, end: 0, target: null });
      }
    }
  }, [isPromptOpen, isDiffMode]);

  const openAIPrompt = useCallback(() => {
    if (selectedText.trim()) {
      setIsPromptOpen(true);
      setAiStatus('');
      setAiStatusLog([]);
      setStreamingText('');
    }
  }, [selectedText]);

  const closeAIPrompt = useCallback(() => {
    setIsPromptOpen(false);
    setSelectedText('');
    setSelectionRange({ start: 0, end: 0, target: null });
    setAiStatus('');
    setAiStatusLog([]);
    setStreamingText('');
  }, []);

  const submitAIPrompt = useCallback(async (customPrompt, defaultPrompt, currentFullText) => {
    if (!selectedText) return;

    setAiStatus('Bağlantı kuruluyor...');
    setAiStatusLog(['🔄 AI Asistanı başlatılıyor...']);
    setStreamingText('');

    let replacement = '';
    let isSuccessful = false;

    try {
      // Call streaming Llama model via our API
      const response = await fetch(`${API_URL}/api/ai/rewrite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: selectedText, default_prompt: defaultPrompt, custom_prompt: customPrompt })
      });

      if (!response.ok) {
        throw new Error(`HTTP hatası! Durum: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let buffer = '';
      let accumulatedText = '';

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          buffer += decoder.decode(value, { stream: !done });
          const lines = buffer.split('\n');
          // Keep the last partial line in the buffer
          buffer = lines.pop();

          for (const line of lines) {
            if (line.trim()) {
              try {
                const data = JSON.parse(line);
                if (data.type === 'status') {
                  setAiStatus(data.message);
                  setAiStatusLog(prev => [...prev, data.message]);
                } else if (data.type === 'token') {
                  accumulatedText += data.text;
                  setStreamingText(accumulatedText);
                } else if (data.type === 'error') {
                  setAiStatus(`Hata: ${data.message}`);
                  setAiStatusLog(prev => [...prev, `❌ Hata: ${data.message}`]);
                  throw new Error(data.message);
                } else if (data.type === 'done') {
                  isSuccessful = true;
                }
              } catch (parseErr) {
                // Ignore parsing errors for partial JSON lines
              }
            }
          }
        }
      }

      replacement = accumulatedText;
    } catch (err) {
      console.error("AI rewrite API error, falling back to local mock:", err);
      setAiStatusLog(prev => [...prev, `❌ AI sunucusu bağlantı hatası. Demo moduna geçiliyor...`]);
      setAiStatus('Bağlantı hatası, demo modunda çalışılıyor...');
      
      // Fallback Mock Logic if API failed
      replacement = selectedText;
      if (customPrompt.toLowerCase().includes('büyük') || customPrompt.toLowerCase().includes('upper')) {
        replacement = selectedText.toUpperCase();
      } else if (customPrompt.toLowerCase().includes('küçük') || customPrompt.toLowerCase().includes('lower')) {
        replacement = selectedText.toLowerCase();
      } else if (customPrompt.toLowerCase().includes('ingilizce') || customPrompt.toLowerCase().includes('english') || customPrompt.toLowerCase().includes('translate')) {
        replacement = `[English Translation of "${selectedText}"]`;
      } else {
        replacement = selectedText
          .trim()
          .replace(/([.!?]\s+)([a-zğüşöçı])/g, (m, p1, p2) => p1 + p2.toUpperCase())
          .replace(/\b(veya|ama|fakat)\b/gi, (m) => m.toLowerCase());
        if (replacement === selectedText) {
          replacement = replacement + " ✓";
        }
      }

      // Simulate local streaming for fallback preview
      let currentMockedText = '';
      const words = replacement.split(' ');
      for (let i = 0; i < words.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 80));
        currentMockedText += words[i] + (i < words.length - 1 ? ' ' : '');
        setStreamingText(currentMockedText);
      }
      isSuccessful = true;
    }

    if (isSuccessful && replacement) {
      let cleanText = replacement.trim();
      if (cleanText.startsWith('"') && cleanText.endsWith('"')) {
        cleanText = cleanText.substring(1, cleanText.length - 1).strip?.() || cleanText.substring(1, cleanText.length - 1).trim();
      } else if (cleanText.startsWith("'''") && cleanText.endsWith("'''")) {
        cleanText = cleanText.substring(3, cleanText.length - 3).strip?.() || cleanText.substring(3, cleanText.length - 3).trim();
      }

      // Build the new full text
      const beforeText = currentFullText.substring(0, selectionRange.start);
      const afterText = currentFullText.substring(selectionRange.end);
      const newFullText = beforeText + cleanText + afterText;

      // Generate diff segments
      const diffData = [
        { type: 'unchanged', text: beforeText },
        { type: 'removed', text: selectedText },
        { type: 'added', text: cleanText },
        { type: 'unchanged', text: afterText }
      ];

      setDiffResult({
        originalText: currentFullText,
        modifiedText: newFullText,
        diffData: diffData
      });

      setIsPromptOpen(false);
      setIsDiffMode(true);
    }
  }, [selectedText, selectionRange]);

  const applyAIChanges = useCallback((onApply) => {
    if (onApply) {
      onApply(diffResult.modifiedText);
    }
    // Reset assistant state
    setIsDiffMode(false);
    setSelectedText('');
    setSelectionRange({ start: 0, end: 0, target: null });
    setAiStatus('');
    setAiStatusLog([]);
    setStreamingText('');
  }, [diffResult]);

  const discardAIChanges = useCallback(() => {
    setIsDiffMode(false);
    setSelectedText('');
    setSelectionRange({ start: 0, end: 0, target: null });
    setAiStatus('');
    setAiStatusLog([]);
    setStreamingText('');
  }, []);

  // Inject an external diff (e.g. duplicate detection) without going through the AI prompt flow
  const injectDiff = useCallback(({ originalText, modifiedText, diffData, target = 'note' }) => {
    setDiffResult({ originalText, modifiedText, diffData });
    setSelectionRange({ start: 0, end: originalText.length, target });
    setIsDiffMode(true);
    setIsPromptOpen(false);
  }, []);

  return {
    selectedText,
    selectionRange,
    promptCoords,
    setPromptCoords,
    isPromptOpen,
    isDiffMode,
    diffResult,
    handleSelection,
    openAIPrompt,
    closeAIPrompt,
    submitAIPrompt,
    applyAIChanges,
    discardAIChanges,
    injectDiff,
    setIsPromptOpen,
    aiStatus,
    aiStatusLog,
    streamingText
  };
}
