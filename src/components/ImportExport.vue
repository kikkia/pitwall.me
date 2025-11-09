<template>
  <div style="display: inline-block;">
    <Button label="Export" icon="pi pi-upload" class="p-button-secondary" @click="exportSettingsToFile" />
    <Button label="Import" icon="pi pi-download" class="p-button-secondary" @click="triggerImport" style="margin-left: .5em" />
    <input type="file" ref="fileInput" @change="importSettingsFromFile" style="display: none" accept=".json" />
  </div>

  <Dialog v-model:visible="isImportDialogVisible" modal header="Import Settings" :style="{ width: '25vw' }">
    <p>Would you like to merge the imported pages with your existing pages, or replace them?</p>
    <template #footer>
      <Button label="Merge" icon="pi pi-plus" @click="handleImport(true)" class="p-button-success" />
      <Button label="Replace" icon="pi pi-exclamation-triangle" @click="handleImport(false)" class="p-button-danger" />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import { useSettingsStore } from '@/stores/settingsStore';

const settingsStore = useSettingsStore();
const fileInput = ref<HTMLInputElement | null>(null);
const isImportDialogVisible = ref(false);
let importedSettings: any = null;

const emit = defineEmits(['close-settings']);

const exportSettingsToFile = () => {
  const settings = settingsStore.exportSettings();
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(settings, null, 2));
  const downloadAnchorNode = document.createElement('a');
  downloadAnchorNode.setAttribute("href", dataStr);
  downloadAnchorNode.setAttribute("download", "pitwall-settings.json");
  document.body.appendChild(downloadAnchorNode);
  downloadAnchorNode.click();
  downloadAnchorNode.remove();
};

const triggerImport = () => {
    fileInput.value?.click();
};

const importSettingsFromFile = (event: Event) => {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files[0]) {
        const file = target.files[0];
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target?.result;
                if (typeof text === 'string') {
                    importedSettings = JSON.parse(text);
                    isImportDialogVisible.value = true;
                }
            } catch (error) {
                alert('Failed to parse settings file.');
                console.error(error);
            }
        };
        reader.readAsText(file);
    }
    target.value = '';
};

const handleImport = (merge: boolean) => {
    try {
        if (importedSettings) {
            settingsStore.importSettings(importedSettings, merge);
        }
    } catch (error) {
        alert('Failed to import settings. The file may be corrupted or in the wrong format.');
        console.error(error);
    } finally {
        isImportDialogVisible.value = false;
        importedSettings = null;
    }
};
</script>