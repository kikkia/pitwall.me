<template>
    <g :style="groupStyle" :class="groupClass" @click.stop="handleClick">
        <circle
            v-if="isSelected"
            :r="3.2 * carDotSize"
            fill="none"
            stroke="#ffffff"
            stroke-width="16"
            opacity="0.65"
        >
            <animate
                attributeName="r"
                :values="`${3.2 * carDotSize};${9 * carDotSize}`"
                dur="1.4s"
                repeatCount="indefinite"
            />
            <animate
                attributeName="opacity"
                values="0.65;0"
                dur="1.4s"
                repeatCount="indefinite"
            />
        </circle>
        <circle
            v-if="isSelected"
            :r="3.2 * carDotSize"
            fill="none"
            stroke="#ffffff"
            stroke-width="10"
            opacity="0.5"
        >
            <animate
                attributeName="r"
                :values="`${3.2 * carDotSize};${9 * carDotSize}`"
                dur="1.4s"
                begin="-0.7s"
                repeatCount="indefinite"
            />
            <animate
                attributeName="opacity"
                values="0.5;0"
                dur="1.4s"
                begin="-0.7s"
                repeatCount="indefinite"
            />
        </circle>
        <circle
            v-if="isRelated"
            :r="2.6 * carDotSize"
            fill="transparent"
            stroke="#facc15"
            stroke-width="14"
        />
        <circle
            v-if="isSelected"
            :r="3.1 * carDotSize"
            fill="transparent"
            stroke="#fde047"
            stroke-width="24"
        />
        <circle
            :r="1.8 * carDotSize"
            :style="{ fill: color ? `#${color}` : '#a1a1aa' }"
            :stroke="isSelected ? '#ffffff' : 'white'"
            :stroke-width="isSelected ? 40 : 20"
        />
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

const emit = defineEmits<{
    (e: 'select-driver', racingNumber: string): void;
}>();

const props = withDefaults(defineProps<{
    racingNumber: string;
    name: string;
    color?: string;
    pit: boolean;
    pos: { X: number; Y: number; Z: number };
    rotation: number;
    centerX: number;
    centerY: number;
    isFocused: boolean;
    hasFocusedDrivers: boolean;
    visualState?: 'default' | 'selected' | 'related' | 'muted';
    selectable?: boolean;
    nameTagFontSize: number;
    carDotSize: number;
    dataInterpolationWindow?: number;
}>(), {
    dataInterpolationWindow: 1.7,
    visualState: 'default',
    selectable: false,
});

const isSelected = computed(() => props.visualState === 'selected');
const isRelated = computed(() => props.visualState === 'related');
const isMuted = computed(() => props.visualState === 'muted');

const rotatedPos = computed(() => {
    return rotate(props.pos.X, props.pos.Y, props.rotation, props.centerX, props.centerY);
});

const groupStyle = computed(() => ({
    transform: `translate(${rotatedPos.value.x}px, ${rotatedPos.value.y}px)`,
    transition: `transform ${props.dataInterpolationWindow}s linear`,
}));

const groupClass = computed(() => ({
    'opacity-50': props.pit || (props.hasFocusedDrivers && !props.isFocused),
    'car-dot--selectable': props.selectable,
    'car-dot--muted': isMuted.value,
}));

const handleClick = () => {
    if (!props.selectable) {
        return;
    }
    emit('select-driver', props.racingNumber);
};
</script>

<style scoped>
.opacity-50 {
    opacity: 0.5;
}

.car-dot--selectable {
    cursor: pointer;
}

.car-dot--muted {
    opacity: 0.2;
}
</style>
