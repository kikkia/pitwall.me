import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { TrackInfo } from '@/types/dataTypes';

export const useTrackStore = defineStore('track', () => {
  const trackInfo = ref<TrackInfo | null>(null);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  function setTrackInfo(data: TrackInfo | null) {
    trackInfo.value = data;
  }

  function setLoading(loading: boolean) {
    isLoading.value = loading;
  }

  function setError(errorMessage: string | null) {
    error.value = errorMessage;
  }

  return {
    trackInfo,
    isLoading,
    error,
    setTrackInfo,
    setLoading,
    setError,
  };
});