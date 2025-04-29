<script setup lang="ts">
import { computed, ref, watch, nextTick } from 'vue';
import { useF1Store } from '@/stores/f1Store';

const f1Store = useF1Store();

const props = defineProps({
  showTimestamp: { type: Boolean, default: true },
  showCategory: { type: Boolean, default: true },
  selectedCategories: { type: Array, default: () => ["Flag", "Other", "Drs", "SafetyCar"] },
  messageFontSize: { type: Number, default: 90 }
});

const settingsDefinition = ref([
  {
    id: 'showTimestamp',        // Matches prop name
    label: 'Show Timestamp',    // User-friendly label
    type: 'boolean',            // Data type
    component: 'Checkbox'       // PrimeVue component to use
  },
  {
    id: 'showCategory',
    label: 'Show Category Column',
    type: 'boolean',
    component: 'Checkbox'
  },
  {
    id: 'messageFontSize',
    label: 'Message Font Size (%)',
    type: 'number',
    component: 'Slider',        // Use a slider
    props: {                    // Specific props for the Slider
      min: 50,                  // Minimum font size %
      max: 150,                 // Maximum font size %
      step: 10                  // Increment step
    }
  }
  // Add 'selectedCategories' here later if needed, maybe with MultiSelect component
]);

defineExpose({
  settingsDefinition
});

const categories = ["Flag", "Other", "Drs", "SafetyCar"];

const messages = computed(() => f1Store.state.raceData.RaceControlMessages.Messages);

const messagesContainerRef = ref<HTMLElement | null>(null);

const highlightedMessageId = ref<string | null>(null);


const filteredMessages = computed(() => {
  const allMessages = f1Store.state.raceData.RaceControlMessages.Messages || [];
    return allMessages.filter(message => props.selectedCategories.includes(message.Category));
});

watch(() => filteredMessages.value.length, (newLength, oldLength) => {
  if (filteredMessages.value.length == 0) {
    return
  }
  const newMessage = filteredMessages.value[filteredMessages.value.length - 1];
  const messageId = `${newMessage.Utc}-${newMessage.Message}`;

  highlightedMessageId.value = messageId;

  setTimeout(() => {
    if (highlightedMessageId.value === messageId) {
      highlightedMessageId.value = null;
    }
  }, 4000);

  nextTick(() => {
    if (messagesContainerRef.value) {
      messagesContainerRef.value.scrollTop = messagesContainerRef.value.scrollHeight;
    }
  });
}, { immediate: true });

const tableStyle = computed(() => ({
    fontSize: `${props.messageFontSize}%` 
}));

</script>

<template>
    <div ref="messagesContainerRef" class="widget race-control-messages" :style="tableStyle">
      <table>
        <thead>
          <tr>
            <th v-if="props.showTimestamp">Timestamp</th>
            <th v-if="props.showCategory">Category</th>
            <th>Message</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="filteredMessages?.length === 0">
            <td :colspan=" (props.showTimestamp ? 1:0) + (props.showCategory ? 1:0) + 1" style="text-align: center;">
                {{ props.selectedCategories.length === categories.length ? 'Waiting for messages...' : `No messages for selected categories...` }}
            </td>
          </tr>
          <tr
            v-for="rcMessage in filteredMessages"
            :key="`${rcMessage.Utc}-${rcMessage.Message}`"
            :class="{ 'highlight-fade': `${rcMessage.Utc}-${rcMessage.Message}` === highlightedMessageId }"
          >
            <td v-if="props.showTimestamp">{{ new Date(rcMessage.Utc).toLocaleTimeString() }}</td>
            <td v-if="props.showCategory">{{ rcMessage.Category }}</td>
            <td>{{ rcMessage.Message }}</td>
          </tr>
        </tbody>
      </table>
    </div>
</template>

<style scoped>
   .widget-wrapper {
    display: flex;
    flex-direction: column;
    height: 100%; /* Or a defined height */
  }

   .widget.race-control-messages {
    flex-grow: 1; 
    overflow-y: auto; 
    overflow-x: hidden;
    display: block; 
    position: relative; 
    border: 1px solid #333;
    background-color: #222; 
    height: 100%; 
  }

  table {
    width: 100%;
    border-collapse: collapse;
  }

  thead {
    position: sticky;
    top: 0;
    z-index: 1;
    background-color: #333;
  }

  th, td {
    padding: 2px 4px;
    text-align: left;
    border-bottom: 1px solid #444;
  }

  td {
    background-color: #222;
    color: #ddd;
    word-break: break-word;
    white-space: normal;
    transition: background-color 4s ease-out;
  }

  th {
    background-color: #333;
    color: #eee;
    font-weight: bold;
  }

  tr:nth-child(even) td {
    background-color: #282828;
  }

  tr.highlight-fade td {
    background-color: rgba(247, 0, 255, 0.733);
  }

  tr:nth-child(odd):not(.highlight-fade) td {
      background-color: #222;
  }

  tr:nth-child(even):not(.highlight-fade) td {
      background-color: #282828;
  }


  tr[style*="opacity: 0.5"] td {
    color: #888;
  }

</style>