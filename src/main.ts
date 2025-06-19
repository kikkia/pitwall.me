import './assets/main.css'
import 'primeicons/primeicons.css';

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import PrimeVue from 'primevue/config'
import Aura from '@primeuix/themes/aura';
import Dialog from 'primevue/dialog';
import Checkbox from 'primevue/checkbox'; 
import Slider from 'primevue/slider';
import Button from 'primevue/button';
import MultiSelect from 'primevue/multiselect';
import ToastService from 'primevue/toastservice';
import Toast from 'primevue/toast';
import App from './App.vue'


const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(PrimeVue, {
    theme: {
        preset: Aura
    }
});
app.use(ToastService);
app.component('Dialog', Dialog);
app.component('Checkbox', Checkbox);
app.component('Slider', Slider);
app.component('Button', Button); 
app.component('MultiSelect', MultiSelect);
app.component('Toast', Toast);

app.mount('#app')