import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [
        laravel({
            input: 'resources/js/app.jsx',
            refresh: true,
        }),
        react(),
    ],
	server: {
		host: true,          // 0.0.0.0 で待ち受け
		port: 5173,
		hmr: {
		host: "localhost", // ブラウザが見に行く先を localhost に
		},
  	},
});
