<script setup lang="ts">
import { ref } from 'vue';

// Define props - we'll need an identifier for removal later
const props = defineProps({
  widgetId: { // Unique ID for this widget instance
    type: [String, Number],
    required: true
  }
});

// Define emits for parent communication
const emit = defineEmits(['remove', 'open-settings']);

// Ref to track hover state for showing buttons
const isHovering = ref(false);

// --- Event Handlers ---

// Function called when the 'X' button is clicked
function handleRemoveClick() {
  console.log(`WidgetContainer: Emitting remove for ID: ${props.widgetId}`);
  // Emit the 'remove' event with the widget's ID
  emit('remove', props.widgetId);
}

// Function called when the 'Cog' button is clicked
function handleSettingsClick() {
  console.log(`WidgetContainer: Emitting open-settings for ID: ${props.widgetId}`);
  // Emit the 'open-settings' event with the widget's ID
  // The parent component will decide how to show the settings
  emit('open-settings', props.widgetId);
}

</script>

<template>
  <!--
    This is the main container for a widget within the grid.
    It listens for mouse hover events to show/hide control buttons.
    It uses the 'grid-stack-item-content' class as required by GridStack.
  -->
  <div
    class="grid-stack-item-content widget-container"
    @mouseover="isHovering = true"
    @mouseleave="isHovering = false"
  >
    <!--
      Container for the action buttons (Settings, Remove).
      Positioned absolutely in the top-right corner.
      Uses v-show for smooth fade-in/out based on hover state.
    -->
    <div
      class="widget-actions"
      :class="{ 'visible': isHovering }"
    >
      <!-- Settings Button -->
      <button class="widget-action-button settings-button" @click="handleSettingsClick" title="Widget Settings">
        ⚙️ <!-- Using emoji for simplicity, replace with SVG/icon font -->
      </button>
      <!-- Remove Button -->
      <button class="widget-action-button remove-button" @click="handleRemoveClick" title="Remove Widget">
        ❌ <!-- Using emoji for simplicity, replace with SVG/icon font -->
      </button>
    </div>

    <!--
      This is where the actual widget component (passed from the parent) will be rendered.
      The <slot /> element acts as a placeholder for child content.
    -->
    <slot />
  </div>
</template>

<style scoped>
/*
  Styles for the main widget container.
  Needs position: relative so the absolute positioned buttons are relative to it.
  Flex display ensures content fills the container.
*/
.widget-container {
  position: relative; /* Crucial for positioning the absolute buttons */
  background-color: #f8f9fa; /* Default background */
  border: 1px solid #dee2e6; /* Default border */
  border-radius: 4px;
  /* overflow: hidden; */ /* Let the inner widget handle its scroll, remove potential global overflow */
  color: #212529;
  display: flex;
  flex-direction: column;
   /* Ensure content inside can scroll if needed, but container itself shouldn't unless necessary */
   overflow: hidden; /* IMPORTANT: Prevent buttons spilling out */
}

/*
  Styles for the container holding the action buttons.
  Uses absolute positioning to place it in the top-right.
  Initially hidden (opacity: 0) and non-interactive (pointer-events: none).
*/
.widget-actions {
  position: absolute;
  top: 5px; /* Small gap from the top edge */
  right: 5px; /* Small gap from the right edge */
  z-index: 10; /* Ensure buttons are above widget content */
  display: flex;
  gap: 4px; /* Space between buttons */
  opacity: 0; /* Hidden by default */
  pointer-events: none; /* Not interactive when hidden */
  transition: opacity 0.2s ease-in-out; /* Smooth fade transition */
}

/*
  When the parent container is hovered (isHovering becomes true),
  make the buttons visible and interactive.
*/
.widget-actions.visible {
  opacity: 1;
  pointer-events: auto;
}

/*
  Basic styling for the action buttons.
  Circular shape, simple background/border, cursor pointer.
*/
.widget-action-button {
  width: 24px; /* Fixed size */
  height: 24px; /* Fixed size */
  border-radius: 50%; /* Make it circular */
  border: 1px solid #adb5bd; /* Subtle border */
  background-color: rgba(255, 255, 255, 0.8); /* Slightly transparent background */
  color: #495057; /* Icon color */
  font-size: 14px; /* Adjust icon size */
  line-height: 22px; /* Vertically center icon (adjust based on font/icon) */
  text-align: center;
  cursor: pointer;
  padding: 0; /* Remove default padding */
  display: flex; /* Use flex to center content */
  justify-content: center;
  align-items: center;
  transition: background-color 0.15s ease-in-out, border-color 0.15s ease-in-out;
}

/* Hover effect for buttons */
.widget-action-button:hover {
  background-color: rgba(233, 236, 239, 0.9); /* Slightly darker on hover */
  border-color: #6c757d;
}

/* Specific hover colors for distinction (optional) */
.settings-button:hover {
  color: #007bff; /* Blue for settings */
}

.remove-button:hover {
  color: #dc3545; /* Red for remove */
}

/* Ensure the slot content stretches */
:slotted(*) {
    flex-grow: 1;
    min-height: 0; /* Allow slotted content to shrink properly if needed */
    overflow: auto; /* Allow slotted content to scroll independently */
}

/* Add some padding to the main content area so buttons don't overlap content border */
.widget-container > :deep(div:not(.widget-actions)) {
  /* This targets the direct child div placed via slot, assuming it's the widget's root */
  padding: 10px; /* Your original padding */
}

/* Adjust the base widget wrapper style used within your specific widgets */
/* You might need to move this or adjust if your widgets have different root elements */
:deep(.widget-wrapper) {
  padding: 0 !important; /* Remove padding from inner wrapper if WidgetContainer adds it */
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  overflow: auto; /* Keep internal scrolling */
  height: 100%; /* Make sure it tries to fill the container */
}


</style>