import { useState } from 'react';

export function useNoteSearch() {
  const [showNoteSearch, setShowNoteSearch] = useState(false);
  const [noteSearchQuery, setNoteSearchQuery] = useState('');
  const [activeMatchIndex, setActiveMatchIndex] = useState(0);

  return {
    showNoteSearch,
    setShowNoteSearch,
    noteSearchQuery,
    setNoteSearchQuery,
    activeMatchIndex,
    setActiveMatchIndex
  };
}
