import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),

	kit: {
		adapter: adapter({
			out: 'build',
			// Включаем Brotli и Gzip compression для production
			precompress: true,
			envPrefix: ''
		}),
		alias: {
			$lib: './src/lib'
		},
		// Prerendering для статических страниц (улучшает SEO)
		prerender: {
			entries: ['/', '/catalog', '/cart', '/faq', '/about'],
			handleHttpError: ({ path, referrer, message }) => {
				// Игнорируем ошибки 404 при prerender
				if (message.includes('404')) {
					return;
				}
				throw new Error(message);
			}
		},
		// Optimization
		version: {
			name: Date.now().toString()
		}
	},
	
	// Compiler options для production
	compilerOptions: {
		cssHash: ({ hash, css }) => `svelte-${hash(css)}`
	}
};

export default config;

