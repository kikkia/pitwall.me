import { defineStore } from 'pinia';

export interface TopThreeDriver {
  tla: string;
  racingNumber: string;
  teamColour: string;
}

export interface SessionRecording {
  path: string;
  name: string;
  sessionType: string;
  finishedAt: string;
  topThree: TopThreeDriver[] | null;
  countryFlagCode: string;
}

export interface SessionRecordingGroup {
  eventName: string;
  recordings: SessionRecording[];
  countryFlagCode: string;
}

export type RecordingsIndex = Record<string, SessionRecording[]>;

export const useSessionRecordingStore = defineStore('sessionRecording', {
  state: () => ({
    recordingGroups: [] as SessionRecordingGroup[],
    isLoading: false,
    error: null as string | null,
  }),
  actions: {
    setRecordingGroups(groups: SessionRecordingGroup[]) {
      this.recordingGroups = groups;
    },
    setLoading(isLoading: boolean) {
      this.isLoading = isLoading;
    },
    setError(error: string | null) {
      this.error = error;
    },
  },
});