<template>
  <VOnboardingWrapper ref="wrapper" :steps="steps" :options="{ overlay: { preventOverlayInteraction: false } }" @finish="onTourFinish" />
</template>

<script setup>
import { ref } from 'vue';
import { VOnboardingWrapper, useVOnboarding } from 'v-onboarding';

const emit = defineEmits(['tour-finished']);

const wrapper = ref(null);
const { start, finish } = useVOnboarding(wrapper);

const onTourFinish = () => {
  emit('tour-finished');
};

const steps = [
  {
    attachTo: { element: '#upcoming-sessions-button' },
    content: {
      title: 'Upcoming Sessions',
      description: 'View the schedule of upcoming F1 sessions.'
    }
  },
  {
    attachTo: { element: '#replay-button' },
    content: {
      title: 'Replay a Session',
      description: 'Watch a replay of a past session. Useful for testing a layout when there isn\'t a live session.'
    }
  },
  {
    attachTo: { element: '#page-selector-button' },
    content: {
      title: 'Switch Pages',
      description: 'Switch between your custom dashboard pages.'
    }
  },
  {
    attachTo: { element: '#edit-mode-button' },
    content: {
      title: 'Edit Mode',
      description: 'Lock or unlock dragging widgets around.'
    }
  },
  {
    attachTo: { element: '#add-widget-button' },
    content: {
      title: 'Add Widget',
      description: 'Add new widgets to your dashboard.'
    }
  },
  {
    attachTo: { element: '#settings-button' },
    content: {
      title: 'Settings',
      description: 'Configure global settings. (Delay, Pages, etc). Depending on where you are watching, be sure to add a delay to help sync up the dashboard data to your stream. The dashboard is often a little ahead of video streams.'
    }
  },
  {
    attachTo: { element: '#connection-status-icon' },
    content: {
      title: 'Connection Status',
      description: 'Indicates your connection status to the data feed.'
    }
  }
];

defineExpose({
  start,
});
</script>

<style>
.v-onboarding-item__header-title {
  color: #FFFFFF;
}
.v-onboarding-item__content {
    background-color: #2d2d2d;
    color: #FFFFFF;
}
.v-onboarding-item__description {
    color: #e0e0e0;
}
body.v-onboarding-active {
  padding-right: 0 !important;
}
.v-onboarding-item__arrow {
  display: none;
}
.v-onboarding-item {
  background-color: #222222 !important;
}

.v-onboarding-item__header {
  padding-bottom: 0;
}
</style>