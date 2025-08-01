import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useUiStore = defineStore('ui', () => {
  const toast = ref({
    visible: false,
    message: '',
    type: 'info' as 'info' | 'success' | 'warning' | 'error',
    duration: 3000,
  });

  function showToast(
    message: string,
    type: 'info' | 'success' | 'warning' | 'error' = 'info',
    duration: number = 3000
  ) {
    toast.value = {
      visible: true,
      message,
      type,
      duration,
    };
  }

  function hideToast() {
    toast.value.visible = false;
  }

  const startWelcomeTour = ref(false);
  const tookTour = ref(false);

  function triggerWelcomeTour() {
    startWelcomeTour.value = true;
  }

  function completeWelcomeTour() {
    tookTour.value = true;
  }

  function resetWelcomeTour() {
    startWelcomeTour.value = false;
  }

  return {
    toast,
    showToast,
    hideToast,
    startWelcomeTour,
    triggerWelcomeTour,
    resetWelcomeTour,
    tookTour,
    completeWelcomeTour
  };
});