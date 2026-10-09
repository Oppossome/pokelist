<script lang="ts">
	import { browser } from '$app/environment';
	import { createQuery } from '@tanstack/svelte-query';
	import { Settings } from '@lucide/svelte';
	import { store } from '$lib/caught.svelte';
	import { filters } from '$lib/filters.svelte';
	import { fetchPokedex } from '$lib/api';
	import { GENERATIONS, gamesIn, type Pokemon } from '$lib/pokemon';
	import { settings } from '$lib/settings.svelte';
	import PokemonCard from '$lib/components/PokemonCard.svelte';
	import Pokeball from '$lib/components/Pokeball.svelte';
	import SearchBar from '$lib/components/SearchBar.svelte';
	import SettingsModal from '$lib/components/SettingsModal.svelte';
	import fallbackData from '$lib/data/pokemon.json';

	let showSettings = $state(false);

	// Live data from the PokéAPI; the bundled snapshot covers SSR and first
	// offline launches (e.g. before the query cache has ever been populated).
	const pokedexQuery = createQuery(() => ({
		queryKey: ['pokedex'],
		queryFn: fetchPokedex,
		enabled: browser
	}));

	const POKEDEX = $derived(pokedexQuery.data ?? (fallbackData as Pokemon[]));
	const gamesList = $derived(gamesIn(POKEDEX));

	const hasActiveFilters = $derived(filters.hasActive);

	const filtered = $derived.by(() => {
		const q = filters.query.trim().toLowerCase();
		return POKEDEX.filter((p) => {
			if (q && !(p.name.toLowerCase().includes(q) || String(p.id).includes(q))) {
				return false;
			}
			const caught = store.caught.has(p.id);
			if (filters.caught === 'caught' && !caught) return false;
			if (filters.caught === 'uncaught' && caught) return false;
			if (filters.game && !p.games.includes(filters.game)) return false;
			if (filters.types.size > 0 && !p.types.some((t) => filters.types.has(t))) {
				return false;
			}
			return true;
		});
	});

	const grouped = $derived.by(() => {
		// Generations come from the data so a future gen 10 shows up as "Gen 10"
		// even before GENERATIONS gains a region name.
		const genIds = [...new Set(POKEDEX.map((p) => p.generation))].sort((a, b) => a - b);
		return genIds
			.map((id) => ({
				gen: { id, name: GENERATIONS[id - 1]?.name ?? `Gen ${id}` },
				pokemon: filtered.filter((p) => p.generation === id)
			}))
			.filter((group) => group.pokemon.length > 0);
	});
</script>

<svelte:head>
	<title>Pokelist — catch tracker</title>
	<meta name="description" content="Track which Pokémon you've caught, generation by generation." />
</svelte:head>

<div class="page">
	<header>
		<div class="title-row">
			<h1>
				<span class="logo" aria-hidden="true"><Pokeball /></span>
				Pokelist
			</h1>
			<span class="progress">
				{store.count} / {POKEDEX.length} caught
			</span>
		</div>

		<div class="toolbar">
			<SearchBar games={gamesList} />
			<div class="actions">
				<button
					type="button"
					class="icon-btn"
					aria-label="Open settings"
					onclick={() => (showSettings = true)}
				>
					<Settings size={18} strokeWidth={2} aria-hidden="true" />
				</button>
			</div>
		</div>

		{#if hasActiveFilters}
			<p class="filter-status">{filtered.length} of {POKEDEX.length} shown</p>
		{:else if pokedexQuery.isFetching}
			<p class="filter-status">Syncing with PokéAPI…</p>
		{:else if pokedexQuery.isError && !pokedexQuery.data}
			<p class="filter-status">Can't reach PokéAPI — showing the offline snapshot.</p>
		{/if}
	</header>

	<main style="--card-size: {settings.cardSize}px">
		{#each grouped as { gen, pokemon } (gen.id)}
			<section>
				<h2>
					<span class="gen-name">Gen {gen.id} — {gen.name}</span>
					<span class="gen-count">
						{pokemon.filter((p) => store.caught.has(p.id)).length}/{pokemon.length}
					</span>
				</h2>
				<div class="grid">
					{#each pokemon as mon (mon.id)}
						<PokemonCard
							pokemon={mon}
							caught={store.caught.has(mon.id)}
							onToggle={(id) => store.toggle(id)}
						/>
					{/each}
				</div>
			</section>
		{:else}
			<p class="empty">
				No Pokémon match the current {hasActiveFilters ? 'search and filters' : 'search'}.
				{#if hasActiveFilters}
					<button type="button" class="clear" onclick={() => filters.clearAll()}>Clear filters</button>
				{/if}
			</p>
		{/each}
	</main>

	<SettingsModal bind:open={showSettings} />
</div>

<style>
	.page {
		max-width: 1400px;
		margin: 0 auto;
		padding: 24px 20px 60px;
	}

	header {
		position: sticky;
		top: 0;
		z-index: 10;
		background: linear-gradient(to bottom, var(--bg) 75%, transparent);
		padding-bottom: 16px;
	}

	.title-row {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 16px;
		flex-wrap: wrap;
	}

	h1 {
		display: flex;
		align-items: center;
		gap: 10px;
		margin: 0;
		font-size: 26px;
		letter-spacing: 0.01em;
	}

	.logo {
		display: block;
		width: 22px;
		height: 22px;
		flex-shrink: 0;
	}

	.progress {
		font-variant-numeric: tabular-nums;
		color: var(--caught);
		font-weight: 600;
		background: var(--card-caught);
		border: 1px solid var(--border);
		padding: 4px 12px;
		border-radius: 99px;
	}

	.toolbar {
		display: flex;
		gap: 10px;
		margin-top: 14px;
		flex-wrap: wrap;
	}

	.actions {
		display: flex;
		gap: 8px;
	}

	.actions button {
		padding: 10px 16px;
		background: var(--bg-soft);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		cursor: pointer;
		font-weight: 600;
		transition: border-color 120ms ease;
	}

	.actions button:hover:not(:disabled) {
		border-color: var(--accent);
	}

	.actions button:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	/* Higher specificity than `.actions button` so padding: 0 actually wins. */
	.actions button.icon-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		align-self: stretch;
		width: 41px;
		padding: 0;
	}

	.filter-status {
		margin: 10px 0 0;
		font-size: 13px;
		color: var(--text-dim);
	}

	.clear {
		padding: 4px 10px;
		background: transparent;
		border: 1px solid var(--border);
		border-radius: 8px;
		color: var(--accent);
		font-size: 12px;
		font-weight: 600;
		cursor: pointer;
	}

	.clear:hover {
		border-color: var(--accent);
	}

	main section {
		margin-top: 28px;
	}

	h2 {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 12px;
		margin: 0 0 12px;
		font-size: 18px;
		border-bottom: 1px solid var(--border);
		padding-bottom: 8px;
	}

	.gen-count {
		font-size: 13px;
		font-weight: 600;
		color: var(--text-dim);
		font-variant-numeric: tabular-nums;
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(min(var(--card-size, 150px), 100%), 1fr));
		gap: 10px;
	}

	.empty {
		margin-top: 40px;
		text-align: center;
		color: var(--text-dim);
	}

	@media (max-width: 640px) {
		.page {
			padding: 16px 12px 40px;
		}
	}
</style>
