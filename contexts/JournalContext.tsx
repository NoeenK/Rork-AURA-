import createContextHook from '@nkzw/create-context-hook';
import { useState, useCallback, useMemo } from 'react';
import type { CalendarEvent, AuraSummary } from '@/lib/soniox-transcription';

export interface JournalEntry {
  id: string;
  title: string;
  audioUri: string;
  transcript: string;
  summary: string;
  auraSummary?: AuraSummary;
  calendarEvents?: CalendarEvent[];
  date: string;
  timestamp: number;
  duration: number;
  isProcessing?: boolean;
  location?: string;
  locationCoords?: { latitude: number; longitude: number; };
}

export const [JournalProvider, useJournal] = createContextHook(() => {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);

  const addEntry = useCallback((entry: Omit<JournalEntry, 'id' | 'timestamp'>) => {
    const newEntry: JournalEntry = {
      ...entry,
      id: Date.now().toString(),
      timestamp: Date.now(),
    };
    setEntries((prev) => [newEntry, ...prev]);
    
    if (entry.calendarEvents && entry.calendarEvents.length > 0) {
      setCalendarEvents((prev) => [...prev, ...entry.calendarEvents!]);
    }
  }, []);

  const updateEntry = useCallback((id: string, updates: Partial<JournalEntry>) => {
    setEntries((prev) => 
      prev.map((entry) => 
        entry.id === id ? { ...entry, ...updates } : entry
      )
    );
  }, []);

  const deleteEntry = useCallback((id: string) => {
    setEntries((prev) => prev.filter((entry) => entry.id !== id));
  }, []);

  const getEntry = useCallback((id: string) => {
    return entries.find((entry) => entry.id === id);
  }, [entries]);

  return useMemo(() => ({
    entries,
    calendarEvents,
    addEntry,
    updateEntry,
    deleteEntry,
    getEntry,
  }), [entries, calendarEvents, addEntry, updateEntry, deleteEntry, getEntry]);
});
