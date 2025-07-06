<template>
    <g>
        <text :x="x" :y="y + 100" text-anchor="middle" class="corner-number" :font-size="`${3 * fontSize}px`">
            {{ number }}
        </text>
    </g>
</template>

<script setup lang="ts">
defineProps<{
    number: number;
    x: number;
    y: number;
    fontSize: number;
}>();
</script>

<style scoped>
.corner-number {
    fill: #a1a1aa;
}
</style>