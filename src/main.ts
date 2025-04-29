import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import PrimeVue from 'primevue/config'
import Aura from '@primeuix/themes/aura';
import Dialog from 'primevue/dialog'; // Import Dialog
import Checkbox from 'primevue/checkbox'; // Import Checkbox
import Slider from 'primevue/slider'; // Import Slider
import Button from 'primevue/button'; // Often useful
import App from './App.vue'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(PrimeVue, {
    theme: {
        preset: Aura
    }
});
app.component('Dialog', Dialog);
app.component('Checkbox', Checkbox);
app.component('Slider', Slider);
app.component('Button', Button); 

app.mount('#app')