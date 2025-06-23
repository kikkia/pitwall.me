import { defineStore } from 'pinia';
import type { F1Event } from '@/types/dataTypes';
import type { MenuItem } from 'primevue/menuitem'; 

export interface LocalF1Event extends F1Event {
  startTimeLocal: Date;
  endTimeLocal: Date;
}

function extractRaceName(summary: string): string {
  const parts = summary.split(' - ');
  // Take all parts except the last one, join them back
  const raceName = parts.slice(0, -1).join(' - ');
  // remove emojis
  return raceName.replace(/[\u{1F3C1}\u{1F3CE}\u{23F1}\u{FE0F}]/gu, '').trim();
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
    // Transform events into MenuItem , grouped by race weekend
    upcomingEvents: (state): MenuItem[] => {
      const now = new Date();
      const futureEvents = state.events
        .filter(event => event.endTimeLocal >= now)
        .sort((a, b) => a.startTimeLocal.getTime() - b.startTimeLocal.getTime());

      // Group events by name
      const groupedEvents = futureEvents.reduce((acc, event) => {
        const raceName = extractRaceName(event.summary);
        if (!acc[raceName]) {
          acc[raceName] = [];
        }
        acc[raceName].push(event);
        return acc;
      }, {} as Record<string, LocalF1Event[]>);

      const sortedRaceWeekends = Object.entries(groupedEvents).sort(([, eventsA], [, eventsB]) => {
          const firstEventA = eventsA[0];
          const firstEventB = eventsB[0];
          
          return firstEventA.startTimeLocal.getTime() - firstEventB.startTimeLocal.getTime();
      });


      const menuItems: MenuItem[] = sortedRaceWeekends.map(([raceName, events]) => {
        // Sort sessions within each weekend chronologically
        events.sort((a, b) => a.startTimeLocal.getTime() - b.startTimeLocal.getTime());

        const sessionItems: MenuItem[] = events.map(session => ({
          label: `${session.description} - ${session.startTimeLocal.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} ${session.startTimeLocal.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
          // command: () => { /* handle session selection */ }
        }));

        return {
          label: raceName,
          items: sessionItems,
        };
      });

      if (menuItems.length === 0) {
          return [{ label: 'No upcoming sessions', disabled: true }];
      }

      return menuItems;
    },
    allEventsGroupedByLocation: (state): Record<string, LocalF1Event[]> => {
      // Group all events by race name (weekend)
      const groupedEvents = state.events.reduce((acc, event) => {
        const raceName = extractRaceName(event.summary);
        if (!acc[raceName]) {
          acc[raceName] = [];
        }
        acc[raceName].push(event);
        return acc;
      }, {} as Record<string, LocalF1Event[]>);

      // Sort race weekends chronologically based on the first event in each group
      const sortedRaceWeekends = Object.entries(groupedEvents).sort(([, eventsA], [, eventsB]) => {
          const firstEventA = eventsA[0];
          const firstEventB = eventsB[0];
          
          return firstEventA.startTimeLocal.getTime() - firstEventB.startTimeLocal.getTime();
      });

      const sortedGroupedEvents: Record<string, LocalF1Event[]> = {};
      sortedRaceWeekends.forEach(([raceName, events]) => {
        // Sort sessions within each weekend chronologically
        sortedGroupedEvents[raceName] = events.sort((a, b) => a.startTimeLocal.getTime() - b.startTimeLocal.getTime());
      });

      return sortedGroupedEvents;
    }
  }
});