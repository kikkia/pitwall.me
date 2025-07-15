import { defineAsyncComponent, shallowRef, type Component } from 'vue';

export type WidgetComponentName =
  'TimingTable' |
  'RaceControlMessages' |
  'TrackStatusLED' |
  'SectorTiming' |
  'LapHistory' |
  'DriverCarStats' |
  'TyreStrategy' |
  'TrackMap' |
  'LapCompare' |
  'SpeedTrap' |
  'Battle' |
  'Weather' |
  'ChampionshipPrediction' |
  'LapTimeChart' |
  'CustomChart' |
  'TeamRadio' |
  'PitstopStrategy' |
  'FlyingLap';

// Map component names to their actual component definitions
export const widgetComponentMap: Record<WidgetComponentName, Component> = {
  'TimingTable': shallowRef(defineAsyncComponent(() => import('./components/widgets/TimingTableWidget.vue'))),
  'RaceControlMessages': shallowRef(defineAsyncComponent(() => import('./components/widgets/RaceControlMessagesWidget.vue'))),
  'TrackStatusLED': shallowRef(defineAsyncComponent(() => import('./components/widgets/TrackStatusLEDWidget.vue'))),
  'SectorTiming': shallowRef(defineAsyncComponent(() => import('./components/widgets/SectorTimingWidget.vue'))),
  'LapHistory': shallowRef(defineAsyncComponent(() => import('./components/widgets/LapHistoryWidget.vue'))),
  'DriverCarStats': shallowRef(defineAsyncComponent(() => import('./components/widgets/DriverCarStats.vue'))),
  'TyreStrategy': shallowRef(defineAsyncComponent(() => import('./components/widgets/TyreStrategyWidget.vue'))),
  'TrackMap': shallowRef(defineAsyncComponent(() => import('./components/widgets/TrackMapWidget.vue'))),
  'LapCompare': shallowRef(defineAsyncComponent(() => import('./components/widgets/LapCompareWidget.vue'))),
  'SpeedTrap': shallowRef(defineAsyncComponent(() => import('./components/widgets/SpeedTrapWidget.vue'))),
  'Battle': shallowRef(defineAsyncComponent(() => import('./components/widgets/BattleWidget.vue'))),
  'Weather': shallowRef(defineAsyncComponent(() => import('./components/widgets/WeatherWidget.vue'))),
  'ChampionshipPrediction': shallowRef(defineAsyncComponent(() => import('./components/widgets/ChampionshipPredictionWidget.vue'))),
  'LapTimeChart': shallowRef(defineAsyncComponent(() => import('./components/widgets/LapTimeChartWidget.vue'))),
  'CustomChart': shallowRef(defineAsyncComponent(() => import('./components/widgets/CustomChartWidget.vue'))),
  'TeamRadio': shallowRef(defineAsyncComponent(() => import('./components/widgets/TeamRadioWidget.vue'))),
  'PitstopStrategy': shallowRef(defineAsyncComponent(() => import('./components/widgets/PitstopStrategyWidget.vue'))),
  'FlyingLap': shallowRef(defineAsyncComponent(() => import('./components/widgets/FlyingLapWidget.vue'))),
};

export const defaultWidgetConfigs: Record<WidgetComponentName, any> = {
    'TimingTable': { showNumber: true, showBest: true, showLast: true, showGap: true, showInterval: true, showTire: true, showPitstopCount: true, messageFontSize: 90 },
    'RaceControlMessages': { showTimestamp: true, showCategory: true, messageFontSize: 90, selectedCategories: ["Flag", "Other", "Sector", "Drs", "SafetyCar"] },
    'TrackStatusLED': {},
    'SectorTiming': { showBestLap: true, showLastLap: true, showBestSectors: true, showLastSectors: true, showMinisectors: true, messageFontSize: 90 },
    'LapHistory': { selectedDriverNumber: null, messageFontSize: 90 },
    'DriverCarStats': { selectedDriverNumber: null, interpolationRate: 15 },
    'TyreStrategy': { selectedDriverNumber: null, messageFontSize: 90, ignorePittedLaps: false },
    'TrackMap': { showCornerNumbers: true, focusedDrivers: [], cornerNumberFontSize: 100, nameTagFontSize: 100, carDotSize: 100, windIndicatorPosition: 'off', trackTempIndicatorPosition: 'off', rainfallIndicatorPosition: 'off', dataInterpolationWindow: 1.7 },
    'LapCompare': { selectedDrivers: [] },
    'LapTimeChart': { selectedDrivers: [], ignorePittedLaps: false, slowLapThreshold: 40, messageFontSize: 90 },
    'CustomChart': { selectedDrivers: [], selectedMetricId: 'lapTime', ignorePittedLaps: true, slowLapThreshold: 40, selectedTyreCompounds: ['SOFT', 'MEDIUM', 'HARD', 'INTERMEDIATE', 'WET'], messageFontSize: 90 },
    'SpeedTrap': { messageFontSize: 90, showI1: true, showI2: true, showFL: true, showST: true, sortBy: 'ST' },
    'Battle': { threshold: 1.5, messageFontSize: 90, battleForPosition: 1, auto: false },
    'Weather': {
      messageFontSize: 80,
      showAirTemp: true,
      showTrackTemp: true,
      showHumidity: true,
      showPressure: true,
      showWindSpeed: true,
      showWindDirection: true,
      showRainfall: true
    },
    'ChampionshipPrediction': { messageFontSize: 90 },
    'TeamRadio': { showTimestamp: true, focusedDrivers: [], focusedTeams: [], messageFontSize: 90 },
    'PitstopStrategy': { messageFontSize: 90 },
    'FlyingLap': { selectedDriverNumber: null, auto: true, messageFontSize: 90 },
};

export const defaultWidgetSizes: Record<WidgetComponentName, { w: number, h: number }> = {
    'TimingTable': { w: 24, h: 28 },
    'RaceControlMessages': { w: 24, h: 12 },
    'TrackStatusLED': { w: 12, h: 10 },
    'SectorTiming': { w: 42, h: 26 },
    'LapHistory': { w: 20, h: 28 },
    'DriverCarStats': { w: 24, h: 7 },
    'TyreStrategy': { w: 20, h: 22 },
    'TrackMap': { w: 20, h: 13 },
    'LapCompare': { w: 24, h: 6 },
    'LapTimeChart': { w: 24, h: 14 },
    'CustomChart': { w: 24, h: 14 },
    'SpeedTrap': { w: 20, h: 28 },
    'Battle': { w: 24, h: 12 },
    'Weather': { w: 43, h:6 },
    'ChampionshipPrediction': { w: 18, h: 18 },
    'TeamRadio': { w: 24, h: 12 },
    'PitstopStrategy': { w: 18, h: 10 },
    'FlyingLap': { w: 24, h: 10 },
};

export const widgetDisplayNames: Record<WidgetComponentName, string> = {
    'TimingTable': 'Live Timing Table',
    'RaceControlMessages': 'Race Control Messages',
    'TrackStatusLED': 'Track Status LED',
    'SectorTiming': 'Sector Timing',
    'LapHistory': 'Lap History',
    'DriverCarStats': 'Driver Car Stats',
    'TyreStrategy': 'Tyre Strategy',
    'TrackMap': 'Track Map',
    'LapCompare': 'Lap Compare',
    'LapTimeChart': 'Lap Time Chart',
    'CustomChart': 'Custom Chart',
    'SpeedTrap': 'Speed Trap',
    'Battle': 'Battle for Position',
    'Weather': 'Weather Conditions',
    'ChampionshipPrediction': 'Championship Prediction',
    'TeamRadio': 'Team Radio',
    'PitstopStrategy': 'Pitstop Strategy',
    'FlyingLap': 'Flying Lap',
  };

export const widgetDescriptions: Record<WidgetComponentName, string> = {
    'TimingTable': 'Displays live timing data for all drivers, including positions, gaps, and sector times.',
    'RaceControlMessages': 'Shows real-time messages from race control, such as flag changes and safety car deployments.',
    'TrackStatusLED': 'Provides a visual indicator of the current track status (green, yellow, red, etc.).',
    'SectorTiming': 'Detailed breakdown of sector and mini-sector times for selected drivers.',
    'LapHistory': 'Visualizes lap times and historical data for individual drivers.',
    'DriverCarStats': 'Provides live statistics from a given drivers car',
    'TyreStrategy': 'Displays a graphical overview of each driver\'s tyre strategy throughout the race.',
    'TrackMap': 'Shows a map of the track and the positions of the drivers.',
    'LapCompare': 'Compares laps, sectors, and tyre ages for selected drivers, showing diffs.',
    'LapTimeChart': 'Compares lap times for multiple drivers on a line chart.',
    'CustomChart': 'A flexible chart where you can plot various metrics against lap number.',
    'SpeedTrap': 'Displays speed trap data for all drivers.',
    'Battle': 'Automatically detects and focuses on close on-track battles for position.',
    'Weather': 'Displays current weather conditions at the track.',
    'ChampionshipPrediction': 'Displays live championship standings based on race predictions.',
    'TeamRadio': 'Listen to team radio messages from drivers and teams.',
    'PitstopStrategy': 'Visualize pitstop strategy, identifying traffic and risks of under/overcuts.',
    'FlyingLap': 'Highlights a driver on a flying lap, showing sector progress and deltas.'
  };