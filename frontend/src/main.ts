import { VueQueryPlugin } from '@tanstack/vue-query';
import { createApp } from 'vue';
import { createPinia } from 'pinia';

import App from './App.vue';
import { queryClient } from './queries/queryClient';
import { router } from './router';
import './styles.scss';

const app = createApp(App);
app.use(createPinia());
app.use(VueQueryPlugin, { queryClient });
app.use(router);
app.mount('#root');
