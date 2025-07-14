<template>
    <g :style="groupStyle" :class="{ 'opacity-50': pit || (hasFocusedDrivers && !isFocused) }">
        <circle :r="1.8 * carDotSize" :style="{ fill: color ? `#${color}` : '#a1a1aa' }" stroke="white" stroke-width="20" />
        <text
            font-weight="bold"
            :font-size="`${4 * nameTagFontSize}px`"
            style="transform: translateX(250px) translateY(-100px)"
            fill="white"
            v-if="!hasFocusedDrivers || isFocused"
        >
            {{ name }}
        </text>
    </g>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { rotate } from '@/utils/mapUtils';

const props = withDefaults(defineProps<{
    name: string;
    color?: string;
    pit: boolean;
    pos: { X: number; Y: number; Z: number };
    rotation: number;
    centerX: number;
    centerY: number;
    isFocused: boolean;
    hasFocusedDrivers: boolean;
    nameTagFontSize: number;
    carDotSize: number;
    dataInterpolationWindow?: number;
}>(), {
    dataInterpolationWindow: 1.7,
});

const rotatedPos = computed(() => {
    return rotate(props.pos.X, props.pos.Y, props.rotation, props.centerX, props.centerY);
});

const groupStyle = computed(() => ({
    transform: `translate(${rotatedPos.value.x}px, ${rotatedPos.value.y}px)`,
    transition: `transform ${props.dataInterpolationWindow}s linear`,
}));
</script>

<style scoped>
.opacity-50 {
    opacity: 0.50;
}
</style>