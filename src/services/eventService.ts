import type { F1Event } from '@/types/dataTypes';
import { useEventStore } from '@/stores/eventStore';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/season';

export async function fetchEvents(): Promise<void> {
  const eventStore = useEventStore();
  eventStore.setLoading(true);
  eventStore.setError(null);
  eventStore.setEvents([]); 

  try {
    console.log(`Attempting to fetch events from: ${API_URL}`);
    const response = await fetch(API_URL);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: { events: F1Event[] } = await response.json();

    const localEvents = data.events.map(event => ({
      ...event,
      startTimeLocal: new Date(event.startTime),
      endTimeLocal: new Date(event.endTime),
    }));

    console.log('Successfully fetched and processed events.');
    eventStore.setEvents(localEvents);

  } catch (error: any) {
    console.error('Error fetching F1 events:', error);
    eventStore.setError(error.message || 'Failed to fetch events');
  } finally {
    eventStore.setLoading(false);
  }
}