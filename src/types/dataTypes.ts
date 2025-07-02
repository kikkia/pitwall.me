export type CarData = {
	"0": number; // rpm
	"2": number; // kph
	"3": number; // gear
	"4": number; // throttle
	"5": number; // 0/1 braking bool
	"45": number; // 0/1 drs
};

export interface ValueWithLap {
	Value: string;
	Lap?: number; 
	Position: number;
  }
  
  export interface Sector {
	Stopped?: boolean; 
	Value: string;
	Status?: number;   
	OverallFastest?: boolean; 
	PersonalFastest?: boolean; 
	Segments?: { Status: number }[]; // Minisectors
	PreviousValue?: string; 
	Position?: number; 
  }
  
  export interface SpeedEntry {
	Value: string;
	Status?: number; 
	OverallFastest?: boolean; 
	PersonalFastest?: boolean;
	Position?: number; 
  }
  
  export interface BestSpeedsMap {
	I1: SpeedEntry;
	I2: SpeedEntry;
	FL: SpeedEntry;
	ST: SpeedEntry;
  }
  
  export interface StintData {
	LapFlags?: number; 
	Compound: string;
	New: "true" | "false";
	TyresNotChanged?: "0" | "1"; 
	TotalLaps: number;
	StartLaps: number;
	LapTime?: string; 
	LapNumber?: number; 
  }
  
  export interface CarSnapshotEntry {
	Cars: Record<string, { Channels: CarData }>; // Keyed by RacingNumber
	Utc?: string; 
  }
  
  export interface InflatedCarData {
	Entries: CarSnapshotEntry[];
  }
  
  export interface PositionSnapshotEntryData {
	Status: string;
	X: number;
	Y: number;
	Z: number;
  }

  export interface PositionSnapshotEntry {
	Entries: Record<string, PositionSnapshotEntryData>; 
	Utc?: string;
  }
  export interface InflatedPositionData {
	Position: PositionSnapshotEntry[];
  }
  
    export interface Heartbeat {
	Utc: string;
  }
  
  export interface ExtrapolatedClock {
	Utc: string;
	Remaining: string;
	Extrapolating: boolean;
  }
  
  export interface WeatherData {
	AirTemp: string;
	Humidity: string;
	Pressure: string;
	Rainfall: string;
	TrackTemp: string;
	WindDirection: string;
	WindSpeed: string;
  }
  
  export interface TrackStatus {
	Status: string;
	Message: string;
  }
  
  export interface TopThreeLine {
	Position: string;
	ShowPosition: boolean;
	RacingNumber: string;
	Tla: string;
	BroadcastName: string;
	FullName: string;
	FirstName: string;
	LastName: string;
	Reference: string;
	Team: string;
	TeamColour: string;
	LapTime: string;
	LapState: number;
	DiffToAhead: string;
	DiffToLeader: string;
	OverallFastest: boolean;
	PersonalFastest: boolean;
  }
  
  export interface TopThree {
	SessionPart: number;
	Withheld: boolean;
	Lines: TopThreeLine[];
  }
  
  export interface TimingStatsLine {
	Line: number;
	RacingNumber: string;
	PersonalBestLapTime: ValueWithLap;
	BestSectors: Sector[];
	BestSpeeds: BestSpeedsMap;
  }
  
  export interface TimingStats {
	Withheld: boolean;
	Lines: Record<string, TimingStatsLine>; // Keyed by RacingNumber
	SessionType: string;
  }
  
  export interface TimingAppDataLine {
	RacingNumber: string;
	Line: number;
	Stints: StintData[];
  }
  
  export interface TimingAppData {
	Lines: Record<string, TimingAppDataLine>; // Keyed by RacingNumber
  }
  
  export interface RaceControlMessage {
	Utc: string;
	Category: string;
	Message: string;
	Flag?: string;
	Scope?: string;
	Sector?: number;
	RacingNumber?: string;
  }
  
  export interface RaceControlMessages {
	Messages: RaceControlMessage[];
  }
  
  export interface SessionInfoMeeting {
	Key: number;
	Name: string;
	OfficialName: string;
	Location: string;
	Country: { Key: number; Code: string; Name: string };
	Circuit: { Key: number; ShortName: string };
  }
  
  export interface SessionInfo {
	Meeting: SessionInfoMeeting;
	ArchiveStatus: { Status: string };
	Key: number;
	Type: "Race" | "Qualifying" | "Practice";
	Name: string;
	StartDate: string;
	EndDate: string;
	GmtOffset: string;
	Path: string;
  }
  
  export interface SessionDataSeriesEntry {
	Utc: string;
	QualifyingPart: number;
  }
  export interface SessionStatusSeriesEntry {
	Utc: string;
	TrackStatus?: string;
	SessionStatus?: string;
  }
  export interface SessionData {
	Series: SessionDataSeriesEntry[];
	StatusSeries: SessionStatusSeriesEntry[];
  }
  
  export interface TimingDataLine {
	KnockedOut?: boolean;
	Cutoff?: boolean;
	// BestLapTimes: any; // Define if structure is known
	// Stats: any; // Define if structure is known
	Line: number;
	Position: string;
	ShowPosition: boolean;
	RacingNumber: string;
	Retired: boolean;
	InPit: boolean;
	PitOut: boolean;
	Stopped: boolean;
	Status: number;
	Sectors: Sector[];
	Speeds: BestSpeedsMap;
	BestLapTime: ValueWithLap | null;
	LastLapTime: ValueWithLap | null;
	GapToLeader?: string;
	IntervalToPositionAhead?: { Value: string, Catching?: boolean };
	NumberOfLaps: number;
	NumberOfPitStops: number;
  }
  
  export interface TimingData {
	NoEntries: any[]; // Define if structure is known
	SessionPart: number;
	Lines: Record<string, TimingDataLine>; // Keyed by RacingNumber
	Withheld: boolean;
	CutOffTime?: string;
	CutOffPercentage?: string;
  }
  
  export interface DriverListEntry {
	RacingNumber: string;
	BroadcastName: string;
	FullName: string;
	Tla: string;
	Line: number;
	TeamName: string;
	TeamColour: string;
	FirstName: string;
	LastName: string;
	Reference: string;
	HeadshotUrl: string;
	CountryCode?: string;
  }
  
  export interface DriverList {
	[racingNumber: string]: DriverListEntry;
  }
  
  export interface TeamRadioCapture {
	Utc: string;
	RacingNumber: string;
	Path: string;
  }
  
  export interface TeamRadio {
	Captures: TeamRadioCapture[];
  }
  
  export interface TyreStintSeries {
	Stints: Record<string, StintData[]>; // Keyed by RacingNumber
  }
  
  export interface LapCount {
	CurrentLap?: number;
	TotalLaps?: number;
  }

  export interface CompletedLap {
	Lap: number;
	LapTime: string;
	
	Sectors: Sector[];
	Pitted: boolean;
	TyreCompound: string;
  }


  export interface LapHistory {
	RacingNumber: string;
	CompletedLaps: CompletedLap[];
  }
  
  export interface F1Event {
    uid: string;
    location: string;
    summary: string;
    description: string;
    startTime: string; // ISO 8601 string
    endTime: string; // ISO 8601 string
  }

  export interface RaceData {
	Heartbeat: Heartbeat | null;
	ExtrapolatedClock: ExtrapolatedClock | null;
	WeatherData: WeatherData | null;
	TrackStatus: TrackStatus | null;
	TopThree: TopThree;
	TimingStats: TimingStats;
	TimingAppData: TimingAppData;
	RaceControlMessages: RaceControlMessages;
	SessionInfo: SessionInfo | null;
	SessionData: SessionData;
	TimingData: TimingData;
	DriverList: DriverList;
	CarDataZ: string; // Base64 deflated string
	PositionZ: string; // Base64 deflated string
	TeamRadio: TeamRadio;
	TyreStintSeries: TyreStintSeries;
	LapCount: LapCount;
	LapHistoryMap: Record<string, LapHistory>
  }
  
  export interface StintViewModel {
	compound: string;
	totalLaps: number;
	startLaps: number;
	newTyre: boolean;
  }
  
  export interface DriverViewModel {
	racingNumber: string;
	tla: string;
	fullName: string;
	teamName: string;
	teamColour: string;
	headshotUrl: string;
	
	position: string;
	gapToLeader: string;
	gapToAhead: string;
	lastLapTime: ValueWithLap | null;
	bestLapTime: ValueWithLap | null;
	lapNumber: number;
	inPit: boolean;
	pitOut: boolean;
	retired: boolean;
	stopped: boolean;
	sectors: Sector[];
	bestSectors: Sector[];
	numberOfPitStops: number;
	
	personalBestLap: ValueWithLap | null;
	
	currentStint: StintViewModel | null;
	stintHistory: StintViewModel[];
	
	rpm: number;
	speed: number;
	gear: number;
	throttle: number;
	brake: number;
	drs: number; // 0 = inactive, 10 = available, 12 = active, 14 = active + used
	positionStatus: string;
	posX: number;
	posY: number;
	posZ: number;

	// Qualifying specific
	isQualifying: boolean;
	isKnockedOut: boolean;
	isCutoff: boolean;
	qualifyingTime: ValueWithLap | null;
	qualiInterval: string;
	qualiGap: string;
}