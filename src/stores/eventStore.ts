import { defineStore } from 'pinia';
import type { F1Event } from '@/types/dataTypes';

export interface LocalF1Event extends F1Event {
  startTimeLocal: Date;
  endTimeLocal: Date;
}

export const useEventStore = defineStore('eventStore', {
  state: () => ({
    events: [] as LocalF1Event[],
    isLoading: false,
    error: null as string | null,
  }),
  actions: {
    setEvents(events: LocalF1Event[]) {
      this.events = events;
    },
    setLoading(isLoading: boolean) {
      this.isLoading = isLoading;
    },
    setError(error: string | null) {
      this.error = error;
    },
  },
  getters: {
    upcomingEvents: (state) => {
      const now = new Date();
      return state.events
        .filter(event => event.endTimeLocal >= now)
        .sort((a, b) => a.startTimeLocal.getTime() - b.startTimeLocal.getTime());
    }
  }
});