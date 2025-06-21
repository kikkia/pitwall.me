import { defineAsyncComponent, shallowRef, type Component } from 'vue';

export type WidgetComponentName =
  'TimingTable' |
  'RaceControlMessages' |
  'TrackStatusLED' |
  'SectorTiming' |
  'LapHistory' |
  'DriverCarStats';

// Map component names (strings) to their actual component definitions
export const widgetComponentMap: Record<WidgetComponentName, Component> = {
  'TimingTable': shallowRef(defineAsyncComponent(() => import('./components/widgets/TimingTableWidget.vue'))),
  'RaceControlMessages': shallowRef(defineAsyncComponent(() => import('./components/widgets/RaceControlMessagesWidget.vue'))),
  'TrackStatusLED': shallowRef(defineAsyncComponent(() => import('./components/widgets/TrackStatusLEDWidget.vue'))),
  'SectorTiming': shallowRef(defineAsyncComponent(() => import('./components/widgets/SectorTimingWidget.vue'))),
  'LapHistory': shallowRef(defineAsyncComponent(() => import('./components/widgets/LapHistoryWidget.vue'))),
  'DriverCarStats': shallowRef(defineAsyncComponent(() => import('./components/widgets/DriverCarStats.vue'))),
};

export const defaultWidgetConfigs: Record<WidgetComponentName, any> = {
    'TimingTable': { showNumber: true, showBest: true, showLast: true, showGap: true, showInterval: true, showTire: true, showPitstopCount: true, messageFontSize: 90 },
    'RaceControlMessages': { showTimestamp: true, showCategory: true, messageFontSize: 90, selectedCategories: ["Flag", "Other", "Sector", "Drs", "SafetyCar"] },
    'TrackStatusLED': {},
    'SectorTiming': { showBestLap: true, showLastLap: true, showBestSectors: true, showLastSectors: true, showMinisectors: true, messageFontSize: 90 },
    'LapHistory': { selectedDriverNumber: null, messageFontSize: 90 },
    'DriverCarStats': { selectedDriverNumber: null, interpolationRate: 15 }
};

export const widgetDisplayNames: Record<WidgetComponentName, string> = {
    'TimingTable': 'Live Timing Table',
    'RaceControlMessages': 'Race Control Messages',
    'TrackStatusLED': 'Track Status LED',
    'SectorTiming': 'Sector Timing',
    'LapHistory': 'Lap History',
    'DriverCarStats': 'Driver Car Stats',
};

export const widgetDescriptions: Record<WidgetComponentName, string> = {
    'TimingTable': 'Displays live timing data for all drivers, including positions, gaps, and sector times.',
    'RaceControlMessages': 'Shows real-time messages from race control, such as flag changes and safety car deployments.',
    'TrackStatusLED': 'Provides a visual indicator of the current track status (green, yellow, red, etc.).',
    'SectorTiming': 'Detailed breakdown of sector and mini-sector times for selected drivers.',
    'LapHistory': 'Visualizes lap times and historical data for individual drivers.',
    'DriverCarStats': 'Provides live statistics from a given drivers car'
};