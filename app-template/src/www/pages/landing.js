import { createApiClient } from '../api-client.js';
import { mountLanding } from '../setup-screen.js';

mountLanding(document.querySelector('main'), { api: createApiClient() });
