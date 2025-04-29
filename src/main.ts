import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import PrimeVue from 'primevue/config'
import Aura from '@primeuix/themes/aura';
import Dialog from 'primevue/dialog';
import Checkbox from 'primevue/checkbox'; 
import Slider from 'primevue/slider';
import Button from 'primevue/button'; 
import MultiSelect from 'primevue/multiselect';
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
app.component('MultiSelect', MultiSelect);

app.mount('#app')