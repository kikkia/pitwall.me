import type { MapData } from '@/types/mapTypes';

export const fetchMap = async (circuitKey: number): Promise<MapData | null> => {
	try {
		const year = new Date().getFullYear();

		const mapRequest = await fetch(`https://api.multiviewer.app/api/v1/circuits/${circuitKey}/${year}`);

		if (!mapRequest.ok) {
			console.error("Failed to fetch map", mapRequest);
			return null;
		}

		return mapRequest.json();
	} catch (error) {
		console.error("Failed to fetch map", error);
		return null;
	}
};