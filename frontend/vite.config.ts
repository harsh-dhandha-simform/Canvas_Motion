import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(async () => {
  // @ts-ignore
  const tailwindcss = (await import('@tailwindcss/vite')).default;

  return {
    plugins: [
      react(),
      tailwindcss(),
    ],
    server: {
      port: 3000,
    },
  };
});
