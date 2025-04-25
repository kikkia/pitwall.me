<template>
    <div class="widget-content">
        <div class="widget-header">Driver List</div>
        <div v-if="loading" class="loading-message">Loading drivers...</div>
        <div v-else-if="error" class="error-message">{{ error }}</div>
        <ul v-else>
            <li v-for="(driver, key) in drivers" :key="key">
                {{ driver.RacingNumber }} - {{ driver.Tla }} ({{ driver.TeamName }})
            </li>
        </ul>
    </div>
</template>

<script>
export default {
    name: 'DriverListWidget',
    props: {
        // Define a prop to receive the drivers data
        drivers: {
            type: [Object, null], // Accepts an object or null
            default: null
        },
        loading: {
            type: Boolean,
            default: false
        },
        error: {
            type: [String, null],
            default: null
        }
    },
    // No need for mounted/data/methods here unless the widget itself has internal logic
};
</script>

<style scoped>
/* Add box-sizing */
* {
    box-sizing: border-box;
}

/* This is the main scrollable container */
.widget-content {
    flex-grow: 1; /* Ensures it takes available height */
    overflow-y: auto; /* Use overflow-y for vertical scrolling */
    overflow-x: hidden; /* Hide horizontal overflow */
    padding: 10px; /* Padding is now inside the scrollable area */
    display: flex; /* Make widget-content a flex container too */
    flex-direction: column; /* Stack header and list vertically */
}

.widget-header {
    font-weight: bold;
    margin-bottom: 10px;
    border-bottom: 1px solid #eee;
    padding: 0 0 5px 0; /* Adjust padding - top, right, bottom, left */
    flex-shrink: 0; /* Prevent header from shrinking */
}

/* Style for the list itself */
.widget-content ul {
    list-style: none;
    padding: 0;
    margin: 0;
    flex-grow: 1; /* Allow the list to take available space within widget-content */
    /* Removed overflow: auto here - widget-content handles scroll */
}

.widget-content li {
    background-color: #3a3838;
    margin-bottom: 3px;
    padding: 5px;
    border-radius: 3px;
    font-size: 0.9em;
}

.loading-message, .error-message {
    text-align: center;
    padding: 20px;
    flex-grow: 1; /* Center loading/error if they are the only content */
}

.error-message {
    color: red;
}
</style>