<script setup>
import { ref, watch, nextTick } from 'vue';
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
    },
    initialWidgets: { 
        type: Array,
        default: () => []
    }
});

const gridContainer = ref(null);
let grid = null;
let isGridInitialized = false; 

const emit = defineEmits(['grid-updated']);

const setupGridstack = () => {
    if (gridContainer.value && !isGridInitialized) {
        console.log("INIT GRIDSTACK");
        grid = GridStack.init({
            cellHeight: 20,
            float: true,
            animate: true,
            disableResize: false,
            margin: 2,
            column: innerWidth/20,
            staticGrid: false,
            acceptWidgets: true,
        }, gridContainer.value);

        grid.on('change', (event, items) => {
            const updatedWidgets = items.map(item => ({
                id: item.id,
                x: item.x,
                y: item.y,
                w: item.w,
                h: item.h
            }));
            emit('grid-updated', updatedWidgets);
        });
        grid.on('removed', (event, items) => {
            console.log('GridStack removed items:', items.map(i => i.el.getAttribute('gs-id')));
        });
        isGridInitialized = true;
    } else if (!gridContainer.value) {
        console.error("Gridstack container not found!");
    }
};

// Watch for initialWidgets to be populated and then set up Gridstack
watch(() => props.initialWidgets, (newWidgets) => {
    if (newWidgets && newWidgets.length > 0 && !isGridInitialized) {
        // Use nextTick to ensure DOM is updated with slotted content
        nextTick(() => {
            setupGridstack();
        });
    }
}, { immediate: true }); // immediate: true to run on initial component mount


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