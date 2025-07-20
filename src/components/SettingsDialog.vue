<template>
  <Dialog
    :visible="visible"
    modal
    header="Global Settings"
    :style="{ width: '30vw' }"
    :breakpoints="{ '960px': '75vw', '641px': '100vw' }"
    @update:visible="emit('update:visible', $event)"
  >
    <div class="p-fluid">
      <div class="p-field">
        <label for="websocketDelay">Add a delay to timing data (seconds)</label>
        <InputNumber
          id="websocketDelay"
          v-model="localWebsocketDelay"
          mode="decimal"
          showButtons
          :min="0"
          :step="1"
        />
      </div>
       <div class="p-field" style="margin-top: 20px;">
        <label for="gridGravity">Floating Widgets</label>
        <br>
        <Dropdown
          id="gridGravity"
          v-model="localGridFloat"
          :options="gravityOptions"
          optionLabel="name"
          optionValue="value"
        />
      </div>
      <div class="p-field" style="margin-top: 20px;">
        <label for="pages">Manage Pages</label>
        <div class="page-management">
          <DataTable :value="localPages" editMode="cell" @cell-edit-complete="onCellEditComplete" class="p-datatable-sm">
            <template #header>
                <div class="flex justify-content-between align-items-center">
                    <h5 class="m-0">Pages</h5>
                    <Button label="Add Page" icon="pi pi-plus" class="p-button-sm" @click="openAddPageDialog" />
                </div>
            </template>
            <Column field="name" header="Name" style="width: 70%">
                <template #editor="{ data, field }">
                    <InputText v-model="data[field]" autofocus />
                </template>
            </Column>
            <Column header="Actions" style="width: 30%">
                <template #body="slotProps">
                    <Button icon="pi pi-trash" class="p-button-text p-button-danger" @click="deletePage(slotProps.data)" />
                </template>
            </Column>
          </DataTable>
        </div>
      </div>
    </div>
  <template #footer>
    <div>
        <ImportExport @close-settings="closeDialog" />
        <Button label="Reset to Default" severity="danger" @click="confirmReset" style="margin-left: .5em" />
        <Button label="Save" @click="saveSettings" style="margin-left: .5em" />
    </div>
  </template>
</Dialog>
<Dialog v-model:visible="isAddPageDialogVisible" modal header="Add New Page" :style="{ width: '25vw' }">
    <div class="p-field">
        <label for="new-page-name">Page Name</label>
        <InputText id="new-page-name" v-model="newPageName" @keyup.enter="addPage" />
    </div>
    <template #footer>
        <Button label="Cancel" icon="pi pi-times" @click="isAddPageDialogVisible = false" class="p-button-text" />
        <Button label="Add" icon="pi pi-check" @click="addPage" autofocus />
    </template>
</Dialog>

</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import InputNumber from 'primevue/inputnumber';
import Dropdown from 'primevue/dropdown';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import InputText from 'primevue/inputtext';
import { useSettingsStore } from '@/stores/settingsStore';
import { storeToRefs } from 'pinia';
import ImportExport from './ImportExport.vue';
import { useConfirm } from "primevue/useconfirm";
import ConfirmDialog from 'primevue/confirmdialog';

defineOptions({
  components: {
    Button,
    Dialog,
    InputNumber,
    Dropdown,
    DataTable,
    Column,
    InputText,
    ImportExport
  }
});

interface Page {
  id: string;
  name: string;
}

interface Props {
  visible: boolean;
}

const props = defineProps<Props>();
const emit = defineEmits(['update:visible']);

const confirm = useConfirm();
const settingsStore = useSettingsStore();
const { websocketDelay, gridFloat, pages } = storeToRefs(settingsStore);
const localWebsocketDelay = ref(websocketDelay.value);
const localGridFloat = ref(gridFloat.value);
const localPages = ref([...pages.value]);

const isAddPageDialogVisible = ref(false);
const newPageName = ref('');


watch(pages, (newPages) => {
  localPages.value = [...newPages];
}, { deep: true });

const openAddPageDialog = () => {
  isAddPageDialogVisible.value = true;
  newPageName.value = '';
};

const addPage = () => {
  if (newPageName.value.trim()) {
    settingsStore.addPage(newPageName.value.trim());
    isAddPageDialogVisible.value = false;
  }
};

const onCellEditComplete = (event: any) => {
    let { data, newValue, field } = event;
    if (newValue.trim().length > 0) {
        settingsStore.renamePage(data.id, newValue);
    }
};

const deletePage = (page: Page) => {
  if (localPages.value.length > 1) {
    settingsStore.removePage(page.id);
  } else {
    alert('You cannot delete the last page.');
  }
};

const confirmReset = () => {
    confirm.require({
        message: 'Are you sure you want to reset all settings to their default values? This action cannot be undone.',
        header: 'Confirmation',
        icon: 'pi pi-exclamation-triangle',
        accept: () => {
            settingsStore.resetSettings();
            emit('update:visible', false);
        },
        reject: () => {}
    });
};

const gravityOptions = ref([
  { name: 'On (no gravity)', value: true },
  { name: 'Off (widgets gravitate to top)', value: false }
]);

const saveSettings = () => {
  settingsStore.setWebsocketDelay(localWebsocketDelay.value !== null ? localWebsocketDelay.value : 0);
  settingsStore.setGridFloat(localGridFloat.value);
  emit('update:visible', false);
};

const closeDialog = () => {
    emit('update:visible', false);
}
</script>
<style scoped>
.save-button {
}

.page-management {
  display: flex;
  flex-direction: column;
}

:deep(.p-dialog-footer) {
}
</style>