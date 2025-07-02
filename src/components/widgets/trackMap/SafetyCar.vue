<template>
    <CarDot
        :name="name"
        :pos="pos"
        :rotation="rotation"
        :centerX="centerX"
        :centerY="centerY"
        :pit="false"
        :color="useSafetyCarColors ? color : 'DDD'"
        :is-focused="false"
        :has-focused-drivers="false"
    />
</template>

<script setup lang="ts">
import CarDot from './CarDot.vue';

defineProps<{
    name: string;
    pos: { X: number; Y: number; Z: number };
    rotation: number;
    centerX: number;
    centerY: number;
    color: string;
    useSafetyCarColors: boolean;
}>();
</script>