<template>
    <g>
        <circle :cx="x" :cy="y" r="200" fill="#333" />
        <text :x="x" :y="y + 100" text-anchor="middle" class="corner-number" :font-size="`${3 * fontSize}px`" font-weight="semibold">
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