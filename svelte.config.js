import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter(),
		// GitHub project pages serve under /<repo-name>/; CI sets BASE_PATH
		// to '/<repo-name>' while local dev/build stays at the root.
		paths: { base: process.env.BASE_PATH ?? '' }
	}
};

export default config;