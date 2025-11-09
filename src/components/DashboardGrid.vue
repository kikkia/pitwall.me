<script setup>
import { ref, watch, nextTick, onMounted } from 'vue';
import { GridStack } from 'gridstack';
import 'gridstack/dist/gridstack.min.css';
import { useSettingsStore } from '@/stores/settingsStore';
import { storeToRefs } from 'pinia';

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
    },
    editMode: {
        type: Boolean,
        default: false
    }
});

const gridContainer = ref(null);
let grid = null;
let isGridInitialized = false;

const settingsStore = useSettingsStore();
const { gridFloat } = storeToRefs(settingsStore);

const emit = defineEmits(['grid-updated', 'drag-start']);

const setupGridstack = () => {
    if (gridContainer.value && !isGridInitialized) {
        console.log("INIT GRIDSTACK");
        grid = GridStack.init({
            cellHeight: 20,
            float: gridFloat.value,
            animate: true,
            margin: 2,
            column: innerWidth/20,
            staticGrid: !props.editMode,
            acceptWidgets: true,
        }, gridContainer.value);

        grid.on('dragstart', (event, el) => {
            emit('drag-start', el);
        });

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

onMounted(() => {
    // Use nextTick to ensure DOM is updated with slotted content
    nextTick(() => {
        setupGridstack();
    });
});

watch(() => props.editMode, (isEditing) => {
    if (grid) {
        grid.setStatic(!isEditing);
    }
});

watch(gridFloat, (newFloatValue) => {
  if (grid) {
    grid.float(newFloatValue);
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