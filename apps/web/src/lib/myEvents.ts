import type { Event } from '../types/api';

const KEY = 'my_events';

interface SavedEvent {
  id: string;
  title: string;
  brideName: string;
  groomName: string;
  weddingDate: string;
  publicToken: string;
  savedAt: string;
}

export function saveMyEvent(event: Event) {
  const list = getMyEvents();
  const already = list.find((e) => e.id === event.id);
  if (already) return;
  const updated: SavedEvent[] = [
    {
      id: event.id,
      title: event.title,
      brideName: event.brideName,
      groomName: event.groomName,
      weddingDate: event.weddingDate,
      publicToken: event.publicToken,
      savedAt: new Date().toISOString(),
    },
    ...list,
  ];
  localStorage.setItem(KEY, JSON.stringify(updated));
}

export function getMyEvents(): SavedEvent[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]');
  } catch {
    return [];
  }
}

export function removeMyEvent(id: string) {
  const updated = getMyEvents().filter((e) => e.id !== id);
  localStorage.setItem(KEY, JSON.stringify(updated));
}
