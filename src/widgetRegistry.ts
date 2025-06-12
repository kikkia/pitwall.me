import { defineAsyncComponent, shallowRef, type Component } from 'vue';

export type WidgetComponentName =
  'TimingTable' |
  'RaceControlMessages' |
  'TrackStatusLED' |
  'SectorTiming' |
  'LapHistory';

// Map component names (strings) to their actual component definitions
export const widgetComponentMap: Record<WidgetComponentName, Component> = {
  'TimingTable': shallowRef(defineAsyncComponent(() => import('./components/widgets/TimingTableWidget.vue'))),
  'RaceControlMessages': shallowRef(defineAsyncComponent(() => import('./components/widgets/RaceControlMessagesWidget.vue'))),
  'TrackStatusLED': shallowRef(defineAsyncComponent(() => import('./components/widgets/TrackStatusLEDWidget.vue'))),
  'SectorTiming': shallowRef(defineAsyncComponent(() => import('./components/widgets/SectorTimingWidget.vue'))),
  'LapHistory': shallowRef(defineAsyncComponent(() => import('./components/widgets/LapHistoryWidget.vue'))),
};

export const defaultWidgetConfigs: Record<WidgetComponentName, any> = {
    'TimingTable': { showNumber: true, showBest: true, showLast: true, showGap: true, showInterval: true, showTire: true, showPitstopCount: true, messageFontSize: 90 },
    'RaceControlMessages': { showTimestamp: true, showCategory: true, messageFontSize: 90, selectedCategories: ["Flag", "Other", "Sector", "Drs", "SafetyCar"] },
    'TrackStatusLED': {},
    'SectorTiming': { showBestLap: true, showLastLap: true, showBestSectors: true, showLastSectors: true, showMinisectors: true, messageFontSize: 90 },
    'LapHistory': { selectedDriverNumber: null, messageFontSize: 90 }
};

export const widgetDisplayNames: Record<WidgetComponentName, string> = {
    'TimingTable': 'Live Timing Table',
    'RaceControlMessages': 'Race Control Messages',
    'TrackStatusLED': 'Track Status LED',
    'SectorTiming': 'Sector Timing',
    'LapHistory': 'Lap History',
};