export type PositionWrapper = {
	Position: PositionSnapshot[];
};

export type PositionSnapshot = {
	Timestamp: string;
	Entries: PositionMap;
};

export type PositionMap = {
	[key: string]: CarPosition;
};

export type CarPosition = {
	Status: string;
	X: number;
	Y: number;
	Z: number;
};

export type CarDataWrapper = {
	Entries: CarDataSnapshot[];
};

export type CarDataSnapshot = {
	Utc: string;
	Cars: CarDataMap;
};

export type CarDataMap = {
	[key: string]: {
		Channels: CarData;
	};
};

export type CarData = {
	"0": number; // rpm
	"2": number; // kph
	"3": number; // gear
	"4": number; // throttle
	"5": number; // 0/1 braking bool
	"45": number; // 0/1 drs
};