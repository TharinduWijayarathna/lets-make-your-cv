// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

const site = process.env.SITE_URL || 'http://localhost:3000';

/** @type {import('astro').AstroUserConfig} */
export default defineConfig({
  site,
  output: 'static',
  outDir: '../dist/web',
  build: {
    format: 'directory',
  },
  trailingSlash: 'never',
  integrations: [sitemap()],
  vite: {
    server: {
      proxy: {
        '/api': { target: 'http://localhost:3000', changeOrigin: true },
        '/js': 'http://localhost:3000',
        '/css': 'http://localhost:3000',
        '/templates': 'http://localhost:3000',
        '/app': 'http://localhost:3000',
        '/admin': 'http://localhost:3000',
        '/health': 'http://localhost:3000',
      },
    },
  },
});
