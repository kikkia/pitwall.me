<template>
  <router-view />
</template>

<script setup>
</script>

<style>
*, *::before, *::after {
  box-sizing: border-box;
}

html, body {
  margin: 0;
  padding: 0;
  height: 100%;
  width: 100%;
  font-family: sans-serif;
}

#app-container {
  display:flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}

#app-container > h1 {
  flex-shrink: 0;
  margin: 10px 20px;
}

.dashboard-container {
  flex-grow: 1;
  margin: 0 20px 0 0;
  overflow: auto;
  min-width: 0;
  background-color: var(--vt-c-black);
}

.grid-stack-item {
   overflow: visible !important;
}

.grid-stack-item-content {
  background-color: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  overflow: auto !important;
  color: #212529;
  display: flex;
  flex-direction: column;
}

.widget-wrapper {
  padding: 10px;
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  overflow: auto;
}

.widget-wrapper h2 {
    margin-top: 0;
    margin-bottom: 10px;
    font-size: 1.1rem;
    border-bottom: 1px solid #ccc;
    padding-bottom: 5px;
}

.p-button {
    margin-right: 5px;
}

.settings-panel {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
}

.setting-item {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.p-field-checkbox {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}
.p-field-checkbox label {
    margin-bottom: 0;
}

.slider-field label {
    display: block;
    margin-bottom: 0.75rem;
    font-weight: bold;
    font-size: 0.9em;
}

.multi-field label {
    display: block;
    margin-bottom: 0.75rem;
    font-weight: bold;
    font-size: 0.9em;
}
.grid-stack {
  background-color: var(--vt-c-black) !important;
}
.p-toast .p-toast-message {
  width: auto;
}
</style>