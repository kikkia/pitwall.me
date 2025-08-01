<script setup lang="ts">
import { ref } from 'vue';

const props = defineProps({
  widgetId: {
    type: [String, Number],
    required: true
  }
});

const emit = defineEmits(['remove', 'open-settings']);

const isHovering = ref(false);


function handleRemoveClick() {
  console.log(`WidgetContainer: Emitting remove for ID: ${props.widgetId}`);
  emit('remove', props.widgetId);
}

function handleSettingsClick() {
  console.log(`WidgetContainer: Emitting open-settings for ID: ${props.widgetId}`);
  emit('open-settings', props.widgetId);
}

</script>

<template>
 
  <div
    class="grid-stack-item-content widget-container"
    @mouseover="isHovering = true"
    @mouseleave="isHovering = false"
  >
    
    <div
      class="widget-actions"
      :class="{ 'visible': isHovering }"
    >
      <button class="widget-action-button settings-button" @click="handleSettingsClick" title="Widget Settings">
        ⚙️ 
      </button>
      <button class="widget-action-button remove-button" @click="handleRemoveClick" title="Remove Widget">
        ❌
      </button>
    </div>

    <!--
      The <slot /> element acts as a placeholder for child content.
    -->
    <slot />
  </div>
</template>

<style scoped>

.widget-container {
  position: relative;
  background-color: var(--vt-c-black-soft);
  border: 1px solid var(--vt-c-divider-dark-1);
  border-radius: 4px;
  color: var(--vt-c-text-dark-1);
  display: flex;
  flex-direction: column;
}

.widget-actions {
  position: absolute;
  top: 5px;
  right: 5px; 
  z-index: 20;
  display: flex;
  gap: 4px; 
  opacity: 0; 
  pointer-events: none; 
  transition: opacity 0.2s ease-in-out;
}

.widget-actions.visible {
  opacity: 1;
  pointer-events: auto;
}

.widget-action-button {
  width: 24px; 
  height: 24px; 
  border-radius: 50%; 
  border: 1px solid var(--vt-c-divider-dark-2);
  background-color: rgba(40, 40, 40, 0.8);
  color: var(--vt-c-text-dark-2);
  font-size: 14px;
  line-height: 22px; 
  text-align: center;
  cursor: pointer;
  padding: 0; 
  display: flex; 
  justify-content: center;
  align-items: center;
  transition: background-color 0.15s ease-in-out, border-color 0.15s ease-in-out;
}


.widget-action-button:hover {
  background-color: rgba(60, 60, 60, 0.9);
  border-color: var(--vt-c-divider-dark-1);
}


.settings-button:hover {
  color: #007bff;
}

.remove-button:hover {
  color: #dc3545; 
}

:slotted(*) {
    flex-grow: 1;
    min-height: 0; 
    overflow: auto; 
}

.widget-container > :deep(div:not(.widget-actions)) {
  padding: 0px;
}

:deep(.widget-wrapper) {
  padding: 0 !important; 
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  overflow: auto; 
  height: 100%; 
}


</style>