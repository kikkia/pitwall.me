<template>
  <Dialog
    :visible="visible"
    modal
    header="Welcome to the pitwall"
    :style="{ width: '50vw' }"
    :breakpoints="{ '1199px': '75vw', '575px': '90vw' }"
    @update:visible="emit('update:visible', $event)"
  >
    <p>
      Thank you so much for checking it out. Pitwall.me is a customizable, real-time Formula 1 timing and telemetry dashboard designed to provide the kind of compact, data-rich dashboard you'd find on a race engineer's console. I took it on as a fun pet project to play around with Vue and also because I really wanted a site like this but was unable to find one. 
    </p>
    <h3>How to get started:</h3>
    <ol>
      <li>Click the "Add Widget" button in the top right to add new widgets.</li>
      <li>Drag widgets around to arrange them on the grid. All changes are saved automatically.</li>
      <li>Use the settings icon on each widget to customize its appearance and data.</li>
      <li>Utilize replays to test out your dashboards when there isn't a live session.</li>
      <li>If you find bugs, or have widget ideas, please reach out!</li>
    </ol>
    <template #footer>
      <div class="flex justify-content-between align-items-center w-full">
        <Button icon="pi pi-github" @click="openLink('https://github.com/kikkia/pitwall.me')" class="p-button-secondary p-button-text" />
        <Button label="Let's go" icon="pi pi-check" @click="emit('update:visible', false)" autofocus />
      </div>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';

interface Props {
  visible: boolean;
}

const props = defineProps<Props>();
const emit = defineEmits(['update:visible']);

const openLink = (url: string) => {
  window.open(url, '_blank');
};
</script>

<style scoped>
h3 {
  padding-top: 10px;
}
</style>