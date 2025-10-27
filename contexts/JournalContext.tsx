import createContextHook from '@nkzw/create-context-hook';
import { useState, useCallback, useMemo } from 'react';

export interface JournalEntry {
  id: string;
  title: string;
  audioUri: string;
  transcript: string;
  summary: string;
  date: string;
  timestamp: number;
  duration: number;
}

export const [JournalProvider, useJournal] = createContextHook(() => {
  const [entries, setEntries] = useState<JournalEntry[]>([]);

  const addEntry = useCallback((entry: Omit<JournalEntry, 'id' | 'timestamp'>) => {
    const newEntry: JournalEntry = {
      ...entry,
      id: Date.now().toString(),
      timestamp: Date.now(),
    };
    setEntries((prev) => [newEntry, ...prev]);
  }, []);

  const deleteEntry = useCallback((id: string) => {
    setEntries((prev) => prev.filter((entry) => entry.id !== id));
  }, []);

  const getEntry = useCallback((id: string) => {
    return entries.find((entry) => entry.id === id);
  }, [entries]);

  return useMemo(() => ({
    entries,
    addEntry,
    deleteEntry,
    getEntry,
  }), [entries, addEntry, deleteEntry, getEntry]);
});
