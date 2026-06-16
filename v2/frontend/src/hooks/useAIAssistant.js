import { useState, useCallback } from 'react';
import { api } from '../services/api';

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
    }
  }, [selectedText]);

  const closeAIPrompt = useCallback(() => {
    setIsPromptOpen(false);
    setSelectedText('');
    setSelectionRange({ start: 0, end: 0, target: null });
  }, []);

  const submitAIPrompt = useCallback(async (customPrompt, defaultPrompt, currentFullText) => {
    if (!selectedText) return;

    let replacement = '';
    let isSuccessful = false;

    try {
      // Call local Llama model via our API
      const result = await api.rewriteText(selectedText, defaultPrompt, customPrompt);
      if (result && result.success) {
        replacement = result.rewritten_text;
        isSuccessful = true;
      } else {
        // Fallback or error returned from API
        if (result && result.error) {
          window.dispatchEvent(new CustomEvent('show-toast', { 
            detail: { message: result.error + " (Demo moduna geçildi)", type: 'error' } 
          }));
        }
      }
    } catch (err) {
      console.error("AI rewrite API error, falling back to mock:", err);
      window.dispatchEvent(new CustomEvent('show-toast', { 
        detail: { message: "AI sunucusuna bağlanırken hata oluştu. Demo moduna geçildi.", type: 'error' } 
      }));
    }

    // Fallback Mock Logic if API failed
    if (!isSuccessful) {
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
    }

    // Build the new full text
    const beforeText = currentFullText.substring(0, selectionRange.start);
    const afterText = currentFullText.substring(selectionRange.end);
    const newFullText = beforeText + replacement + afterText;

    // Generate diff segments
    const diffData = [
      { type: 'unchanged', text: beforeText },
      { type: 'removed', text: selectedText },
      { type: 'added', text: replacement },
      { type: 'unchanged', text: afterText }
    ];

    setDiffResult({
      originalText: currentFullText,
      modifiedText: newFullText,
      diffData: diffData
    });

    setIsPromptOpen(false);
    setIsDiffMode(true);
  }, [selectedText, selectionRange]);

  const applyAIChanges = useCallback((onApply) => {
    if (onApply) {
      onApply(diffResult.modifiedText);
    }
    // Reset assistant state
    setIsDiffMode(false);
    setSelectedText('');
    setSelectionRange({ start: 0, end: 0, target: null });
  }, [diffResult]);

  const discardAIChanges = useCallback(() => {
    setIsDiffMode(false);
    setSelectedText('');
    setSelectionRange({ start: 0, end: 0, target: null });
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
    setIsPromptOpen
  };
}
