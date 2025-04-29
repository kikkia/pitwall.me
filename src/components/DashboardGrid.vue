<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { GridStack } from 'gridstack';
import 'gridstack/dist/gridstack.min.css';

const props = defineProps({
    loading: {
        type: Boolean,
        default: false
    },
    error: {
        type: [String, null],
        default: null
    }
});

const gridContainer = ref(null);
let grid = null; 

onMounted(() => {
    if (gridContainer.value) {
        console.log("INIT GRIDSTACK");
        grid = GridStack.init({
            cellHeight: 40,
            float: true,
            animate: true,
            disableResize: false,
            margin: 2,
            column: innerWidth/40, // Usually default is 12, uncomment if needed
            // Let items be added/removed dynamically
            staticGrid: false, 
            acceptWidgets: true,
        }, gridContainer.value);

        grid.on('change', (event, items) => {

        });
         grid.on('removed', (event, items) => {
             console.log('GridStack removed items:', items.map(i => i.el.getAttribute('gs-id')));
         });


    } else {
        console.error("Gridstack container not found!");
    }
});

onBeforeUnmount(() => {
  if (grid) {
    console.log("Destroying Gridstack instance");
    grid.destroy(); // Pass false to prevent DOM node removal if Vue manages it
    grid = null;
  }
});

// --- Expose Grid Instance ---
// Method for the parent component (App.vue) to get the grid instance
const getGridInstance = () => {
  return grid;
};

// Use defineExpose to make getGridInstance callable from the parent via template refs
defineExpose({
  getGridInstance
});

</script>

<template>
     <!-- ref="gridContainer" links to the script ref -->
     <div ref="gridContainer" class="grid-stack">
        <!-- Slot remains the same -->
        <slot />
     </div>
</template>

<style scoped>
/* Keep existing styles */
.grid-stack {
  background-color: #e9ecef;
  min-height: 400px;
  width: 100%;
  box-sizing: border-box;
}

/* ... other styles ... */
:deep(.grid-stack-item-content) {
    /* Remove default gridstack content background/border if WidgetContainer handles it */
    background: none;
    border: none;
    /* IMPORTANT: Ensure it fills the grid-stack-item */
    inset: 0px;
    overflow: hidden !important; /* Handled by WidgetContainer now */
}

/* Add padding back to the grid item itself if needed, or adjust WidgetContainer */
/* :deep(.grid-stack-item) {
     padding: 5px;
} */

:deep(.ui-draggable-dragging .widget-container) { /* Target widget container during drag */
    opacity: 0.7;
    box-shadow: 0 4px 8px rgba(0,0,0,0.2);
}

:deep(.grid-stack-placeholder > .placeholder-content) {
  border: 2px dashed #adb5bd;
  background-color: rgba(206, 212, 218, 0.3);
}
</style>