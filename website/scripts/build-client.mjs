import {build} from 'vite';
await build({configFile:new URL('../vite.client.config.mts',import.meta.url).pathname});
