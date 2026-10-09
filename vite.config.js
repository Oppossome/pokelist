import { sveltekit } from '@sveltejs/kit/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		sveltekit(),
		SvelteKitPWA({
			registerType: 'autoUpdate',
			manifest: {
				name: 'Pokelist — catch tracker',
				short_name: 'Pokelist',
				description: 'Track which Pokémon you have caught, generation by generation.',
				start_url: '.',
				theme_color: '#0e1420',
				background_color: '#0e1420',
				display: 'standalone'
			},
			workbox: {
				globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
				navigateFallback: '/',
				runtimeCaching: [
					{
						// Sprites are immutable per dex number — cache forever.
						urlPattern: ({ url }) =>
							url.hostname === 'raw.githubusercontent.com' &&
							url.pathname.includes('/PokeAPI/sprites/'),
						handler: 'CacheFirst',
						options: {
							cacheName: 'pokevibe-sprites',
							expiration: { maxEntries: 2400, maxAgeSeconds: 60 * 60 * 24 * 180 }
						}
					}
				]
			}
		})
	]
});
