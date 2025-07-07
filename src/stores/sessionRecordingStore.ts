import { defineStore } from 'pinia';

export interface SessionRecording {
  path: string;
  eventName: string;
}

export interface SessionRecordingGroup {
  eventName: string;
  recordings: SessionRecording[];
}

export type RecordingsIndex = Record<string, string[]>;

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