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
  'Weather';

// Map component names (strings) to their actual component definitions
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
};

export const defaultWidgetConfigs: Record<WidgetComponentName, any> = {
    'TimingTable': { showNumber: true, showBest: true, showLast: true, showGap: true, showInterval: true, showTire: true, showPitstopCount: true, messageFontSize: 90 },
    'RaceControlMessages': { showTimestamp: true, showCategory: true, messageFontSize: 90, selectedCategories: ["Flag", "Other", "Sector", "Drs", "SafetyCar"] },
    'TrackStatusLED': {},
    'SectorTiming': { showBestLap: true, showLastLap: true, showBestSectors: true, showLastSectors: true, showMinisectors: true, messageFontSize: 90 },
    'LapHistory': { selectedDriverNumber: null, messageFontSize: 90 },
    'DriverCarStats': { selectedDriverNumber: null, interpolationRate: 15 },
    'TyreStrategy': { selectedDriverNumber: null, messageFontSize: 90, ignorePittedLaps: false },
    'TrackMap': { showCornerNumbers: true, useSafetyCarColors: true, focusedDrivers: [], cornerNumberFontSize: 100, nameTagFontSize: 100, carDotSize: 100 },
    'LapCompare': { selectedDrivers: [] },
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
    }
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
    'SpeedTrap': { w: 20, h: 28 },
    'Battle': { w: 24, h: 12 },
    'Weather': { w: 43, h:6 },
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
    'SpeedTrap': 'Speed Trap',
    'Battle': 'Battle for Position',
    'Weather': 'Weather Conditions',
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
    'SpeedTrap': 'Displays speed trap data for all drivers.',
    'Battle': 'Automatically detects and focuses on close on-track battles for position.',
    'Weather': 'Displays current weather conditions at the track.'
};