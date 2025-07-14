<template>
  <VOnboardingWrapper ref="wrapper" :steps="steps" :options="{ overlay: { preventOverlayInteraction: false } }" />
</template>

<script setup>
import { ref, watch, computed } from 'vue';
import { useF1Store } from '@/stores/f1Store';
import { useSettingsStore } from '@/stores/settingsStore';
import { VOnboardingWrapper, useVOnboarding } from 'v-onboarding';
import { storeToRefs } from 'pinia';

const f1Store = useF1Store();
const settingsStore = useSettingsStore();
const { raceData } = storeToRefs(f1Store);
const { websocketDelay } = storeToRefs(settingsStore);

const wrapper = ref(null);
const { start, finish } = useVOnboarding(wrapper);

const steps = [
  {
    attachTo: { element: '#settings-button' },
    content: {
      title: 'Data Sync Reminder',
      description: 'You do not have a delay on live data currently setup. It is possible that your dashboard will be ahead of the live video stream data. If that is the case, try adding some delay to the dashboard data to better sync it up.<br><br><button id="hide-delay-reminder-btn">Don\'t show again</button>',
      html: true,
    },
    on: {
      beforeStep: () => {
        const hideReminder = localStorage.getItem('hideDataDelayReminder');
        if (hideReminder === 'true') {
          finish();
        }
      },
    },
  },
];

const latestSessionStatusInfo = computed(() => { 
  const statuses = raceData.value.SessionData?.StatusSeries?.filter((st) => st.SessionStatus) || [];
  return statuses.length > 0 ? statuses[statuses.length - 1] : { SessionStatus: "Unknown" };
});

const isSessionActive = computed(() => {
  const status = latestSessionStatusInfo.value?.SessionStatus;
  return status === 'Started';
});

const hideReminderForever = () => {
  localStorage.setItem('hideDataDelayReminder', 'true');
  finish();
};

watch(
  [isSessionActive, websocketDelay],
  ([sessionActive, delay]) => {
    if (sessionActive && delay === 0) {
      const hideReminder = localStorage.getItem('hideDataDelayReminder');
      if (hideReminder !== 'true') {
        setTimeout(() => {
          start();
          setTimeout(() => {
            const btn = document.getElementById('hide-delay-reminder-btn');
            if (btn) {
              btn.addEventListener('click', hideReminderForever);
            }
          }, 100);
        }, 500);
      }
    }
  },
  { deep: true, immediate: true }
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

#hide-delay-reminder-btn {
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