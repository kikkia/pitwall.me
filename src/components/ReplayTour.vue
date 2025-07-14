<template>
  <VOnboardingWrapper ref="wrapper" :steps="steps" :options="{ overlay: { preventOverlayInteraction: false } }" />
</template>

<script setup>
import { ref, watch, computed } from 'vue';
import { useEventStore } from '@/stores/eventStore';
import { useUiStore } from '@/stores/uiStore';
import { VOnboardingWrapper, useVOnboarding } from 'v-onboarding';

const eventStore = useEventStore();
const uiStore = useUiStore();
const wrapper = ref(null);
const { start, finish } = useVOnboarding(wrapper);

const steps = [
  {
    attachTo: { element: '#replay-button' },
    content: {
      title: 'No Active Session',
      description: 'There is no active session right now. Would you like to replay a past session?<br><br><button id="hide-tour-btn">Don\'t show again</button>',
      html: true,
    },
    on: {
      beforeStep: () => {
        const hideTour = localStorage.getItem('hideReplayTour');
        if (hideTour === 'true') {
          finish();
        }
      },
    },
  },
];

const isSessionActive = computed(() => {
  const now = new Date().getTime();
  return eventStore.events.some(event => {
    const startTime = new Date(event.startTimeLocal).getTime();
    const endTime = new Date(event.endTimeLocal).getTime();
    return now >= startTime && now <= endTime;
  });
});

const hideTourForever = () => {
  localStorage.setItem('hideReplayTour', 'true');
  finish();
};

watch(
  () => eventStore.isLoading,
  (isLoading, wasLoading) => {
    if (wasLoading && !isLoading) {
      if (!isSessionActive.value && !uiStore.startWelcomeTour) {
        const hideTour = localStorage.getItem('hideReplayTour');
        if (hideTour !== 'true') {
          setTimeout(() => {
            start();
            setTimeout(() => {
              const btn = document.getElementById('hide-tour-btn');
              if (btn) {
                btn.addEventListener('click', hideTourForever);
              }
            }, 100);
          }, 500);
        }
      }
    }
  }
);
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

#hide-tour-btn {
  background: none;
  border: none;
  color: var(--color-text);
  text-decoration: underline;
  cursor: pointer;
  padding: 0;
  font-size: 12px;
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