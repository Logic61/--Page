import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://logic61.github.io',
  // 本地默认根路径；GitHub Pages 部署时由 workflow 注入 BASE_PATH=/--Page
  base: process.env.BASE_PATH || '/',
});