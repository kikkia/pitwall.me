<template>
  <Dialog
    :visible="visible"
    modal
    header="Welcome to Pitwall.me!"
    :style="{ width: '50vw' }"
    :breakpoints="{ '1199px': '75vw', '575px': '90vw' }"
    @update:visible="emit('update:visible', $event)"
  >
    <p>
      Fully customizable live timing, make your own pit wall. 
    </p>
    <h3>How to get started:</h3>
    <ol>
      <li>Click the "Add Widget" button in the top right to add new widgets.</li>
      <li>Drag widgets around to arrange them on the grid. All changes are saved automatically.</li>
      <li>Use the settings icon on each widget to customize its appearance and data.</li>
    </ol>
    <template #footer>
      <div class="flex justify-content-between align-items-center w-full">
        <Button icon="pi pi-github" @click="openLink('https://github.com/kikkia/pitwall.me')" class="p-button-secondary p-button-text" />
        <Button label="Got It!" icon="pi pi-check" @click="emit('update:visible', false)" autofocus />
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
/* Add any specific styles for your modal here */
</style>