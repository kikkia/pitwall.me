<template>
     <!-- ref="gridContainer" to link the template element to the script ref -->
     <div ref="gridContainer" class="grid-stack">
        <slot />
     </div>
</template>

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

// Added ref directly linked to the template element
const gridContainer = ref(null);
let grid = null; 

onMounted(() => {
    console.log("INIT GRIDSTACK");
    if (gridContainer.value) { 
        grid = GridStack.init({
            cellHeight: 80, 
            float: true,   
            animate: true, 
            disableResize: false,
            margin: 10,
            // column: 12,
        }, gridContainer.value);
    } else {
        console.error("Gridstack container not found!");
    }
});

// Added cleanup logic when the component is unmounted
onBeforeUnmount(() => {
  if (grid) {
    console.log("Destroying Gridstack instance");
    grid.destroy(); 
    grid = null;
  }
});

</script>

<style scoped>
.grid-stack {
  background-color: #e9ecef;
  min-height: 400px; /* Example minimum height */
  /* Added: Force the grid container to take full width of its parent */
  width: 100%;
  /* Added: Ensure padding/border are included in the width calculation */
  box-sizing: border-box;
}

/* Added styling for the placeholder element that shows during drag */
:deep(.ui-draggable-dragging .grid-stack-item-content) {
    opacity: 0.7;
    box-shadow: 0 4px 8px rgba(0,0,0,0.2);
}

:deep(.grid-stack-placeholder > .placeholder-content) {
  border: 2px dashed #adb5bd;
  background-color: rgba(206, 212, 218, 0.3);
}

</style>