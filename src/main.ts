import '@iconscout/unicons/css/line.css';
import './assets/main.css'
import 'primeicons/primeicons.css';
import 'v-onboarding/dist/style.css';

import { createApp } from 'vue'
import { createHead } from '@unhead/vue/client'
import { createPinia } from 'pinia'
import PrimeVue from 'primevue/config'
import Aura from '@primeuix/themes/aura';
import Dialog from 'primevue/dialog';
import Checkbox from 'primevue/checkbox';
import Slider from 'primevue/slider';
import Button from 'primevue/button';
import MultiSelect from 'primevue/multiselect';
import ToastService from 'primevue/toastservice';
import ConfirmationService from 'primevue/confirmationservice';
import Toast from 'primevue/toast';
import Chart from 'primevue/chart';
import Tooltip from 'primevue/tooltip';
import App from './App.vue'
import router from './router';
import { VOnboardingWrapper } from 'v-onboarding';

const app = createApp(App)
const pinia = createPinia()
const head = createHead()

app.use(pinia)
app.use(head)
app.use(router)
app.use(PrimeVue, {
    theme: {
        preset: Aura
    }
});
app.use(ToastService);
app.use(ConfirmationService);
app.directive('tooltip', Tooltip);
app.component('Dialog', Dialog);
app.component('Checkbox', Checkbox);
app.component('Slider', Slider);
app.component('Button', Button); 
app.component('MultiSelect', MultiSelect);
app.component('Toast', Toast);
app.component('Chart', Chart);
app.component('VOnboardingWrapper', VOnboardingWrapper);

app.mount('#app')