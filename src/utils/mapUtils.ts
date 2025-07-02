import type { MapData, TrackPosition, MapSector } from '@/types/mapTypes';
import type { RaceControlMessage } from '@/types/dataTypes';

export const rad = (deg: number) => deg * (Math.PI / 180);

export const rotate = (x: number, y: number, a: number, px: number, py: number) => {
	const c = Math.cos(rad(a));
	const s = Math.sin(rad(a));

	x -= px;
	y -= py;

	const newX = x * c - y * s;
	const newY = y * c + x * s;

	return { y: newX + px, x: newY + py };
};

export const calculateDistance = (x1: number, y1: number, x2: number, y2: number) => {
	return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
};

export const findMinDistance = (point: TrackPosition, points: TrackPosition[]) => {
	let min = Infinity;
	let minIndex = -1;
	for (let i = 0; i < points.length; i++) {
		const distance = calculateDistance(point.x, point.y, points[i].x, points[i].y);
		if (distance < min) {
			min = distance;
			minIndex = i;
		}
	}
	return minIndex;
};

export const createSectors = (map: MapData): MapSector[] => {
	const sectors: MapSector[] = [];
	const points: TrackPosition[] = map.x.map((x, index) => ({ x, y: map.y[index] }));

	for (let i = 0; i < map.marshalSectors.length; i++) {
		sectors.push({
			number: i + 1,
			start: map.marshalSectors[i].trackPosition,
			end: map.marshalSectors[i + 1] ? map.marshalSectors[i + 1].trackPosition : map.marshalSectors[0].trackPosition,
			points: [],
		});
	}

	const dividers: number[] = sectors.map((s) => findMinDistance(s.start, points));
	for (let i = 0; i < dividers.length; i++) {
		const start = dividers[i];
		const end = dividers[i + 1] ? dividers[i + 1] : dividers[0];
		if (start < end) {
			sectors[i].points = points.slice(start, end + 1);
		} else {
			sectors[i].points = points.slice(start).concat(points.slice(0, end + 1));
		}
	}

	return sectors;
};

export const findYellowSectors = (messages: RaceControlMessage[] | undefined): Set<number> => {
	if (!messages) {
		return new Set();
	}

	const msgs = [...messages].sort((a, b) => a.Utc.localeCompare(b.Utc)).filter((msg) => {
		return msg.Flag === "YELLOW" || msg.Flag === "DOUBLE YELLOW" || msg.Flag === "CLEAR";
	});

	const done: Set<number> = new Set();
	const sectors: Set<number> = new Set();
	for (let i = 0; i < msgs.length; i++) {
		const msg = msgs[i];
		if (msg.Scope === "Track" && msg.Flag !== "CLEAR") {
			for (let j = 0; j < 30; j++) {
				sectors.add(j);
			}
			return sectors;
		}
		if (msg.Scope === "Sector") {
			if (!msg.Sector || done.has(msg.Sector)) {
				continue;
			}
			if (msg.Flag === "CLEAR") {
				done.add(msg.Sector);
			} else {
				sectors.add(msg.Sector);
			}
		}
	}
	return sectors;
};

type RenderedSector = {
	number: number;
	d: string;
	color: string;
	strokeWidth: number;
	pulse?: number;
};

export const prioritizeColoredSectors = (a: RenderedSector, b: RenderedSector) => {
	if (a.color === "stroke-white" && b.color !== "stroke-white") {
		return -1;
	}
	if (a.color !== "stroke-white" && b.color === "stroke-white") {
		return 1;
	}
	return a.number - b.number;
};

export const getSectorColor = (
	sector: MapSector,
	bySector: boolean | undefined,
	trackColor: string | undefined = "stroke-white",
	yellowSectors: Set<number>,
) => (bySector ? (yellowSectors.has(sector.number) ? trackColor : "stroke-white") : trackColor);