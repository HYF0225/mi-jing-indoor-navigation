import {fileURLToPath} from 'node:url';
import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/postcss';

const directory=fileURLToPath(new URL('.',import.meta.url));
const basePath=(process.env.PAGES_BASE_PATH??'').replace(/\/$/,'');

export default defineConfig({
 root:directory+'pages-app',
 publicDir:directory+'public',
 base:basePath+'/',
 plugins:[react()],
 resolve:{alias:{'@':directory}},
 css:{postcss:{plugins:[tailwindcss()]}},
 define:{'process.env.NEXT_PUBLIC_BASE_PATH':JSON.stringify(basePath)},
 build:{outDir:directory+'pages-dist',emptyOutDir:true},
});
