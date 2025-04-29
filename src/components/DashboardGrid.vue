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
            column: innerWidth/40,
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
    grid.destroy();
    grid = null;
  }
});

const getGridInstance = () => {
  return grid;
};

defineExpose({
  getGridInstance
});

</script>

<template>
     <div ref="gridContainer" class="grid-stack">
        <slot />
     </div>
</template>

<style scoped>
.grid-stack {
  background-color: #e9ecef;
  min-height: 400px;
  width: 100%;
  box-sizing: border-box;
}

:deep(.grid-stack-item-content) {
    background: none;
    border: none;
    inset: 0px;
    overflow: hidden !important; 
}

:deep(.ui-draggable-dragging .widget-container) { 
    opacity: 0.7;
    box-shadow: 0 4px 8px rgba(0,0,0,0.2);
}

:deep(.grid-stack-placeholder > .placeholder-content) {
  border: 2px dashed #adb5bd;
  background-color: rgba(206, 212, 218, 0.3);
}
</style>