/// <reference types="vitest" />

import { resolve } from 'path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import { nodePolyfills } from 'vite-plugin-node-polyfills'

export default defineConfig({
    build: {
        lib: {
            entry: resolve(__dirname, 'src/index.ts'),
            name: 'zcsv',
            fileName: (format) => {
                if (format === 'es') return 'zcsv.mjs';
                if (format === 'cjs') return 'zcsv.cjs';
                return `zcsv.${format}.js`;
            },
            formats: ['es', 'cjs', 'umd']
        },
        rollupOptions: {
            external: ['zod'],
        }
    },
    plugins: [
        dts(),
        nodePolyfills(),
    ],
    test: {
        exclude: ['**/node_modules/**', '**/dist/**', '**/test-imports/**']
    }
});