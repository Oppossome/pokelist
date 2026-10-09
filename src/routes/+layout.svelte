<script lang="ts">
	import '../app.css';
	import { browser } from '$app/environment';
	import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
	import { PersistQueryClientProvider } from '@tanstack/svelte-query-persist-client';
	import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';

	let { children } = $props();

	const queryClient = new QueryClient({
		defaultOptions: {
			queries: {
				// Fresh enough for a day; persisted data is kept for a week offline.
				staleTime: 1000 * 60 * 60 * 24,
				refetchOnWindowFocus: false
			}
		}
	});

	// SSR has no localStorage; restore/mount only happens in the browser.
	const persister = createAsyncStoragePersister({
		storage: {
			getItem: async (key) => (browser ? window.localStorage.getItem(key) : null),
			setItem: async (key, value) => {
				if (browser) window.localStorage.setItem(key, value);
			},
			removeItem: async (key) => {
				if (browser) window.localStorage.removeItem(key);
			}
		},
		key: 'pokelist:query-cache'
	});
</script>

<QueryClientProvider client={queryClient}>
	<PersistQueryClientProvider
		client={queryClient}
		persistOptions={{ persister, maxAge: 1000 * 60 * 60 * 24 * 7 }}
	>
		{@render children()}
	</PersistQueryClientProvider>
</QueryClientProvider>
