import { build } from 'vite';
import { fileURLToPath } from 'node:url';

// Use a native filesystem path: URL.pathname incorrectly prefixes Windows drive paths.
const configFile = fileURLToPath(new URL('../vite.client.config.mts', import.meta.url));
await build({ configFile });
