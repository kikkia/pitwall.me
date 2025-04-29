<script setup lang="ts">
import { computed, ref, watch, nextTick } from 'vue';
import { useF1Store } from '@/stores/f1Store';

const f1Store = useF1Store();

const messages = computed(() => f1Store.state.raceData.RaceControlMessages.Messages);

const messagesContainerRef = ref<HTMLElement | null>(null);

const highlightedMessageId = ref<string | null>(null);

watch(() => messages.value.length, () => {
  nextTick(() => {
    const newMessage = messages.value[messages.value.length - 1]; // Get the newest message
    const messageId = `${newMessage.Utc}-${newMessage.Message}`; // Use a separator like '-' for clarity

    highlightedMessageId.value = messageId;

    setTimeout(() => {
      if (highlightedMessageId.value === messageId) {
        highlightedMessageId.value = null;
      }
    }, 4000);
    if (messagesContainerRef.value) {
      messagesContainerRef.value.scrollTop = messagesContainerRef.value.scrollHeight;
    }
  });
});

</script>

<template>
  <div ref="messagesContainerRef" class="widget race-control-messages">
    <table>
      <thead>
        <tr>
          <th>Timestamp</th>
          <th>Category</th>
          <th>Message</th>
        </tr>
      </thead>
      <tbody class="message-list">
        <tr v-if="messages?.length == 0">
            <td colspan="8" style="text-align: center;">Waiting for messages from race control...</td>
        </tr>
        <tr
          v-for="rcMessage in messages"
          :key="`${rcMessage.Utc}-${rcMessage.Message}`" :class="{ 'highlight-fade': `${rcMessage.Utc}-${rcMessage.Message}` === highlightedMessageId }"
        >
          <td>{{ new Date(rcMessage.Utc).toLocaleTimeString() }}</td>
          <td>{{ rcMessage.Category }}</td>
          <td>{{ rcMessage.Message }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
    .widget.race-control-messages {
    height: 100%;
    overflow-y: auto; 
    overflow-x: hidden; 
    display: block;
    position: relative; 
    border: 1px solid #333; 
    background-color: #222;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.9em;
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
  }

  th {
    background-color: #333;
    color: #eee;
    font-weight: bold;
  }

  tr:nth-child(even) td {
    background-color: #282828;
  }

  tr[style*="opacity: 0.5"] td {
    color: #888;
  }

  tr.highlight-fade {
    background-color: rgba(247, 0, 255, 0.733); 
    transition: background-color 4s ease-in-out; 
  }

  tr.highlight-fade td {
      background-color: transparent; 
  }


  tr:not(.highlight-fade) td {
      transition: background-color 0s;
  }

</style>