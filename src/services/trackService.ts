import type { TrackInfo } from '@/types/dataTypes';
import { useTrackStore } from '@/stores/trackStore';

const API_URL = import.meta.env.VITE_API_URL + "/track";

export async function fetchTrackInfo(trackId: string): Promise<void> {
  const trackStore = useTrackStore();
  trackStore.setLoading(true);
  trackStore.setError(null);
  trackStore.setTrackInfo(null); 

  try {
    console.log(`Attempting to fetch track info from: ${API_URL}/${trackId}`);
    const response = await fetch(`${API_URL}/${trackId}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: TrackInfo = await response.json();

    console.log('Successfully fetched and processed track info.');
    trackStore.setTrackInfo(data);

  } catch (error: any) {
    console.error('Error fetching track info:', error);
    trackStore.setError(error.message || 'Failed to fetch track info');
  } finally {
    trackStore.setLoading(false);
  }
}